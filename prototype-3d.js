import * as THREE from 'three';
import { GLTFLoader } from './assets/vendor/three/loaders/GLTFLoader.js';
import { MeshoptDecoder } from './assets/vendor/three/meshopt_decoder.module.js';
import { createStudioEnvironment, tuneSurface } from './prototype-studio.js';

const stage = document.querySelector('#drone-stage');
const canvas = document.querySelector('#drone-canvas');
const fallback = document.querySelector('.model-fallback');
const hero = document.querySelector('#flight');
const uses = document.querySelector('#uses');
const machine = document.querySelector('#machine');
const serviceArea = document.querySelector('.scenario-airspace');
const machineArea = document.querySelector('.machine-airspace');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width: 700px)');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
let renderer, scene, camera, model, corners, rotors = [], meshes = [];
let paused = false, activePart = 'tank', isolate = true, activeScenario = 'spray';
let frame = 0, previousTime = 0, elapsed = 0, dirty = true;
let width = innerWidth, height = innerHeight, headerHeight = 76;
let currentPose = null, currentFocus = 0, targetFocus = 0;
let contextLost = false;
let studioEnvironment;
const viewHeight = 5;
const right = new THREE.Vector3(), up = new THREE.Vector3();
const spinAxis = new THREE.Vector3(0, 1, 0), spinQuaternion = new THREE.Quaternion();
const projectedPoint = new THREE.Vector3();

function requestFrame() {
  dirty = true;
  if (!frame && !document.hidden && !contextLost) frame = requestAnimationFrame(render);
}
function resize() {
  headerHeight = document.querySelector('.header').offsetHeight;
  width = innerWidth; height = Math.max(1, innerHeight - headerHeight);
  if (renderer) {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile.matches ? 1.3 : 1.6));
    renderer.setSize(width, height, false);
    camera.left = -viewHeight * width / height / 2; camera.right = -camera.left;
    camera.top = viewHeight / 2; camera.bottom = -camera.top;
    camera.updateProjectionMatrix();
  }
  currentPose = null;
  requestFrame();
}
function anchor(element, fraction = .9) {
  const r = element.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 - headerHeight, w: r.width * fraction, h: r.height * .9 };
}
function desiredPose() {
  const y = scrollY, viewport = height + headerHeight;
  const heroPose = { x: width * .5, y: height * (mobile.matches ? .27 : .4), w: width * (mobile.matches ? .94 : .83), h: mobile.matches ? 290 : height * .65, rx: .02, ry: -.25, rz: 0 };
  const usePose = { ...anchor(serviceArea, .96), rx: .04, ry: activeScenario === 'cargo' ? .52 : activeScenario === 'map' ? -.8 : .18, rz: 0 };
  const partPose = { ...anchor(machineArea, .96), rx: activePart === 'battery' ? .65 : activePart === 'rotors' ? .82 : activePart === 'tank' ? -.1 : .05, ry: activePart === 'tank' ? -.55 : -.1, rz: 0 };
  const startUses = uses.offsetTop - viewport * .72;
  const startMachine = machine.offsetTop - viewport * .7;
  const useT = smooth(clamp((y - startUses) / (viewport * .58)));
  const machineT = smooth(clamp((y - startMachine) / (viewport * .52)));
  let a = heroPose, b = usePose, t = useT;
  if (machineT > 0) { a = usePose; b = partPose; t = machineT; }
  // Reduced motion / user pause keeps section placement but removes the interpolated flight.
  if (reduced.matches || paused) t = t > .5 ? 1 : 0;
  const pose = {};
  for (const key of ['x', 'y', 'w', 'h', 'rx', 'ry', 'rz']) pose[key] = mix(a[key], b[key], t);
  targetFocus = (isolate && activePart !== 'all') ? machineT : 0;
  const finish = machine.offsetTop + machine.offsetHeight;
  const visible = y < finish - headerHeight && pose.y + pose.h / 2 > 0 && pose.y - pose.h / 2 < height;
  stage.classList.toggle('is-offscreen', !visible);
  stage.dataset.section = machineT > .5 ? 'machine' : useT > .5 ? 'uses' : 'hero';
  return { pose, visible };
}
function isSelected(mesh) {
  if (activePart === 'tank' || activePart === 'battery') return mesh.userData.component === activePart;
  if (activePart === 'rotors') {
    let node = mesh;
    while (node) { if (node.userData.rotorRoot) return true; node = node.parent; }
    return false;
  }
  return true;
}
function applyFocus() {
  let selectedCount = 0;
  for (const mesh of meshes) {
    const selected = isSelected(mesh);
    if (selected) selectedCount++;
    const material = mesh.material;
    const ghost = !selected && currentFocus > .002;
    const wantedOpacity = selected ? mesh.userData.baseOpacity : mix(mesh.userData.baseOpacity, .13, currentFocus);
    if (material.transparent !== (ghost || mesh.userData.baseTransparent)) {
      material.transparent = ghost || mesh.userData.baseTransparent;
      material.needsUpdate = true;
    }
    material.opacity = wantedOpacity;
    material.depthWrite = ghost ? false : mesh.userData.baseDepthWrite;
    mesh.renderOrder = ghost ? 0 : 1;
  }
  stage.dataset.part = activePart;
  stage.dataset.isolated = String(currentFocus > .95 && isolate && activePart !== 'all');
  stage.dataset.selectedMeshes = String(selectedCount);
}
function applyPose(pose, floating) {
  model.rotation.set(pose.rx, pose.ry, pose.rz);
  model.scale.setScalar(1);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const corner of corners) {
    const v = projectedPoint.copy(corner).applyEuler(model.rotation);
    const x = v.dot(right), y = v.dot(up);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const pxPerUnit = height / viewHeight;
  const scale = Math.min(pose.w / ((maxX - minX) * pxPerUnit), pose.h / ((maxY - minY) * pxPerUnit));
  model.scale.setScalar(scale);
  const offsetX = (pose.x - width / 2) / pxPerUnit - (minX + maxX) * .5 * scale;
  const offsetY = (height / 2 - pose.y - floating) / pxPerUnit - (minY + maxY) * .5 * scale;
  model.position.copy(right).multiplyScalar(offsetX).addScaledVector(up, offsetY);
}
function render(time) {
  frame = 0;
  if (document.hidden || contextLost) { previousTime = 0; return; }
  const dt = previousTime ? Math.min((time - previousTime) / 1000, .3) : 1 / 60;
  previousTime = time;
  const { pose, visible } = desiredPose();
  const moving = visible && !reduced.matches && !paused;
  if (moving) elapsed += Math.min(dt, .05);
  if (!currentPose || reduced.matches || paused) currentPose = { ...pose };
  let unsettled = false;
  const easing = 1 - Math.exp(-dt * 11);
  for (const key of Object.keys(pose)) {
    currentPose[key] = mix(currentPose[key], pose[key], easing);
    if (Math.abs(currentPose[key] - pose[key]) > (['rx', 'ry', 'rz'].includes(key) ? .001 : .15)) unsettled = true;
  }
  const nextFocus = reduced.matches || paused ? targetFocus : mix(currentFocus, targetFocus, easing);
  if (Math.abs(nextFocus - currentFocus) > .0005 || dirty) { currentFocus = nextFocus; applyFocus(); }
  if (Math.abs(currentFocus - targetFocus) > .001) unsettled = true;
  if (model) {
    applyPose(currentPose, moving ? Math.sin(elapsed * 1.25) * (mobile.matches ? 3 : 5) : 0);
    for (const rotor of rotors) {
      if (moving) rotor.angle += Math.min(dt, .05) * 6 * rotor.direction;
      spinQuaternion.setFromAxisAngle(spinAxis, rotor.angle);
      rotor.node.quaternion.copy(rotor.initial).multiply(spinQuaternion);
    }
    if (visible) renderer.render(scene, camera);
  } else {
    // Saved render follows the same allocated space when WebGL or the GLB is unavailable.
    fallback.style.left = `${pose.x - pose.w / 2}px`; fallback.style.top = `${pose.y - pose.h / 2}px`;
    fallback.style.width = `${pose.w}px`; fallback.style.height = `${pose.h}px`;
  }
  dirty = false;
  if (moving && model || visible && unsettled) frame = requestAnimationFrame(render);
  else previousTime = 0;
}
function fail() {
  stage.dataset.state = 'fallback';
  stage.classList.remove('is-ready');
  window.dispatchEvent(new Event('drone:error'));
  model = null;
  requestFrame();
}
async function init() {
  if (location.protocol === 'file:') return;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    scene = new THREE.Scene();
    studioEnvironment = createStudioEnvironment(renderer);
    scene.environment = studioEnvironment.texture;
    camera = new THREE.OrthographicCamera(-4, 4, 2.5, -2.5, .1, 50);
    camera.position.set(4, 2.8, 6.8); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xa0a7b0, .35));
    const key = new THREE.DirectionalLight(0xfffaf2, 2.4); key.position.set(-3, 6, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xe7f0ff, .65); fill.position.set(4, 2, -3); scene.add(fill);
    resize();
    const [gltf, manifest] = await Promise.all([
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('./models/xag-p150-max/xag-p150-max-v04-web.glb'),
      fetch('./models/xag-p150-max/web-model-manifest-v04.json').then(r => { if (!r.ok) throw new Error('Manifest unavailable'); return r.json(); })
    ]);
    const content = gltf.scene;
    content.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(content), center = box.getCenter(new THREE.Vector3());
    corners = [];
    // Per-mesh bounds avoid the empty corners of a single huge box around the X-shaped machine.
    content.traverse(node => {
      if (!node.isMesh) return;
      node.geometry.computeBoundingBox();
      const b = node.geometry.boundingBox;
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) corners.push(new THREE.Vector3(x, y, z).applyMatrix4(node.matrixWorld).sub(center));
    });
    // GLTFLoader sanitizes names; search both the preserved name and its sanitized form.
    for (const item of manifest.animation.rotors) {
      let found;
      content.traverse(node => { if ((node.userData.name || node.name) === item.node || node.name === THREE.PropertyBinding.sanitizeNodeName(item.node)) found = node; });
      if (!found) throw new Error('Rotor hierarchy mismatch');
      found.userData.rotorRoot = true;
      rotors.push({ node: found, initial: found.quaternion.clone(), direction: item.direction, angle: .55 });
      const hub = found.getWorldPosition(new THREE.Vector3()).sub(center);
      for (let n = 0; n < 16; n++) {
        const angle = n / 16 * Math.PI * 2;
        corners.push(hub.clone().add(new THREE.Vector3(Math.cos(angle) * .82, 0, Math.sin(angle) * .82)));
      }
    }
    content.traverse(node => {
      if (!node.isMesh) return;
      // Multi-material glTF primitives inherit assembly extras from their group.
      let assembly = node;
      while (assembly && !assembly.userData.component) assembly = assembly.parent;
      if (assembly) node.userData.component = assembly.userData.component;
      node.material = node.material.clone();
      tuneSurface(node.material);
      node.userData.baseOpacity = node.material.opacity;
      node.userData.baseTransparent = node.material.transparent;
      node.userData.baseDepthWrite = node.material.depthWrite;
      meshes.push(node);
    });
    if (!meshes.some(mesh => /Molded HDPE tank/.test(mesh.material.name))) throw new Error('Tank material missing');
    content.position.sub(center);
    model = new THREE.Group(); model.add(content); scene.add(model);
    stage.dataset.state = 'ready'; stage.dataset.rotors = String(rotors.length);
    stage.classList.add('is-ready');
    window.dispatchEvent(new Event('drone:ready'));
    requestFrame();
  } catch (error) { console.warn('3D preview unavailable:', error.message); fail(); }
}
window.addEventListener('scroll', requestFrame, { passive: true });
window.addEventListener('resize', resize);
window.addEventListener('drone:scenario', e => { activeScenario = e.detail; requestFrame(); });
window.addEventListener('drone:part', e => { activePart = e.detail.part; isolate = e.detail.isolation; requestFrame(); });
window.addEventListener('drone:motion', e => { paused = e.detail; currentPose = null; requestFrame(); });
reduced.addEventListener('change', () => { currentPose = null; requestFrame(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
  else requestFrame();
});
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); contextLost = true; cancelAnimationFrame(frame); frame = 0; stage.classList.remove('is-ready'); stage.dataset.state = 'fallback'; window.dispatchEvent(new Event('drone:error')); });
canvas.addEventListener('webglcontextrestored', () => { contextLost = false; if (model) { stage.classList.add('is-ready'); stage.dataset.state = 'ready'; window.dispatchEvent(new Event('drone:ready')); requestFrame(); } });
resize();
init();
