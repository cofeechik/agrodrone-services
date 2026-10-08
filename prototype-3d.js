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
const machineArea = document.querySelector('.machine-airspace');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width: 700px)');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
let renderer, scene, camera, model, corners, meshBounds = [], rotors = [], meshes = [];
let paused = false, activePart = 'all', isolate = true;
let motionOverride = null;
let frame = 0, previousTime = 0, elapsed = 0, dirty = true;
let width = innerWidth, height = innerHeight, headerHeight = 76;
let currentPose = null, currentFocus = 0, targetFocus = 0;
let contextLost = false;
let studioEnvironment;
let keyLight;
const viewHeight = 5;
const right = new THREE.Vector3(), up = new THREE.Vector3();
const spinAxis = new THREE.Vector3(0, 1, 0), spinQuaternion = new THREE.Quaternion();
const projectedPoint = new THREE.Vector3();
let boundsCache = null;
let lastVisible = null;
const motionEnabled = () => motionOverride === null ? !reduced.matches : motionOverride;

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
    camera.aspect = width / height;
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
  const availableTravel = Math.max(1, hero.offsetHeight - innerHeight);
  const progress = clamp(scrollY / availableTravel);
  const exit = smooth(clamp((progress - .2) / .65));
  const heroVisible = uses.getBoundingClientRect().top > innerHeight * .9;
  const detail = anchor(machineArea, .93);
  const machineVisible = machine.getBoundingClientRect().top < innerHeight * .45 && detail.y + detail.h / 2 > 0 && detail.y - detail.h / 2 < height;
  let pose;
  if (heroVisible) {
    const t = reduced.matches ? 0 : exit;
    pose = {x:width*.5, y:height*(mobile.matches ? .43 : .43)+t*height*1.12,
      w:width*(mobile.matches ? 1.35 : .9), h:height*(mobile.matches ? .48 : .53),
      rx:mix(.06,-.05,t),ry:mix(-.28,.05,t),rz:mix(0,.06,t),zoom:mobile.matches?1.3:1.12};
  } else {
    pose = {...detail,rx:activePart==='battery'?.22:activePart==='rotors'?.4:.03,
      ry:activePart==='tank'?-.4:-.2,rz:0,zoom:activePart==='all'?.95:.9};
  }
  targetFocus = !heroVisible && machineVisible && isolate && activePart !== 'all' ? 1 : 0;
  const visible = heroVisible && exit < .92 || !heroVisible && machineVisible;
  stage.classList.toggle('is-offscreen', !visible);
  stage.dataset.section = heroVisible ? 'hero' : machineVisible ? 'machine' : 'uses';
  const toolbar = document.querySelector('.model-toolbar');
  if (machineVisible && !heroVisible) {
    const r=machineArea.getBoundingClientRect();
    toolbar.style.top=`${clamp(r.bottom-56,headerHeight+8,innerHeight-56)}px`;
    toolbar.style.right=`${Math.max(10,width-r.right+12)}px`;
  } else {toolbar.style.top='';toolbar.style.right='';}
  if (lastVisible !== visible) {
    lastVisible = visible;
    window.dispatchEvent(new CustomEvent('drone:visibility', { detail: visible }));
  }
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
    const wantedOpacity = selected ? mesh.userData.baseOpacity : mix(mesh.userData.baseOpacity, .025, currentFocus);
    if (material.transparent !== (ghost || mesh.userData.baseTransparent)) {
      material.transparent = ghost || mesh.userData.baseTransparent;
      material.needsUpdate = true;
    }
    material.opacity = wantedOpacity;
    material.depthWrite = ghost ? false : mesh.userData.baseDepthWrite;
    mesh.renderOrder = ghost ? 0 : 1;
    mesh.castShadow = !ghost && !/Carbon composite blades/.test(material.name);
    mesh.receiveShadow = !ghost;
  }
  stage.dataset.part = activePart;
  stage.dataset.isolated = String(currentFocus > .95 && isolate && activePart !== 'all');
  stage.dataset.selectedMeshes = String(selectedCount);
}
function applyPose(pose, floating) {
  model.rotation.set(pose.rx, pose.ry, pose.rz);
  model.scale.setScalar(1);
  const key = [pose.rx.toFixed(4), pose.ry.toFixed(4), pose.rz.toFixed(4), activePart].join(':');
  if (!boundsCache || boundsCache.key !== key) {
    const project = points => {
      const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
      for (const corner of points) {
        const v = projectedPoint.copy(corner).applyEuler(model.rotation);
        const x = v.dot(right), y = v.dot(up);
        bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x);
        bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
      }
      return bounds;
    };
    const full = project(corners);
    const selected = ['tank', 'battery'].includes(activePart)
      ? project(meshBounds.filter(item => isSelected(item.mesh)).flatMap(item => item.points)) : full;
    boundsCache = { key, full, selected };
  }
  // Frame the selected assembly, not the distant rotor tips. Ghost arms may crop.
  const { full, selected } = boundsCache;
  const minX = mix(full.minX, selected.minX, currentFocus), maxX = mix(full.maxX, selected.maxX, currentFocus);
  const minY = mix(full.minY, selected.minY, currentFocus), maxY = mix(full.maxY, selected.maxY, currentFocus);
  const pxPerUnit = height / viewHeight;
  const scale = Math.min(pose.w / ((maxX - minX) * pxPerUnit), pose.h / ((maxY - minY) * pxPerUnit)) * pose.zoom;
  model.scale.setScalar(scale);
  const offsetX = (pose.x - width / 2) / pxPerUnit - (minX + maxX) * .5 * scale;
  const offsetY = (height / 2 - pose.y - floating) / pxPerUnit - (minY + maxY) * .5 * scale;
  // Translate along the camera plane, preserving perspective within the aircraft.
  model.position.copy(right).multiplyScalar(offsetX).addScaledVector(up, offsetY);
  if (stage.dataset.section === 'machine' && activePart === 'all' && currentFocus < .001) {
    // Inspection must contain the entire aircraft, including the nearer foot.
    // Fit perspective-projected corners and full rotor sweeps, not an
    // orthographic estimate or a viewport-specific magic magnification.
    for (let pass=0;pass<4;pass++) {
      let left=Infinity,rightEdge=-Infinity,top=Infinity,bottom=-Infinity;
      for (const c of corners) {
        const p=projectedPoint.copy(c).applyEuler(model.rotation).multiplyScalar(model.scale.x).add(model.position).project(camera);
        const x=(p.x+1)*width/2,y=(1-p.y)*height/2;
        left=Math.min(left,x);rightEdge=Math.max(rightEdge,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      }
      model.position.addScaledVector(right,(pose.x-(left+rightEdge)/2)/pxPerUnit)
        .addScaledVector(up,((top+bottom)/2-pose.y-floating)/pxPerUnit);
      const fit=Math.min(1,pose.w*.94/(rightEdge-left),pose.h*.94/(bottom-top));
      if(fit<1)model.scale.multiplyScalar(fit);
    }
  }
  keyLight.position.copy(model.position).add(new THREE.Vector3(-3,6,5));
  keyLight.target.position.copy(model.position);
}
function render(time) {
  frame = 0;
  if (document.hidden || contextLost) { previousTime = 0; return; }
  const wallDelta = previousTime ? (time - previousTime) / 1000 : 0;
  const dt = Math.min(wallDelta || 1 / 60, .3);
  previousTime = time;
  const { pose, visible } = desiredPose();
  const moving = visible && motionEnabled() && !paused;
  if (moving) elapsed += wallDelta;
  stage.dataset.spinning = String(moving && !!model);
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
      // Real elapsed time: slow frames must not turn rotation into slow motion.
      if (moving) rotor.angle += wallDelta * 58 * rotor.direction;
      spinQuaternion.setFromAxisAngle(spinAxis, rotor.angle);
      rotor.node.quaternion.copy(rotor.initial).multiply(spinQuaternion);
      rotor.blur.visible = moving && (!isolate || activePart === 'all' || activePart === 'rotors' || stage.dataset.section === 'hero');
    }
    for (const mesh of meshes) {
      if (!/Carbon composite blades/.test(mesh.material.name)) continue;
      const ghost = !isSelected(mesh) && currentFocus > .002;
      const transparent = moving || ghost || mesh.userData.baseTransparent;
      if (mesh.material.transparent !== transparent) {mesh.material.transparent=transparent;mesh.material.needsUpdate=true;}
      mesh.material.opacity = ghost ? mix(mesh.userData.baseOpacity,.025,currentFocus) : moving ? .07 : mesh.userData.baseOpacity;
      mesh.material.depthWrite = moving || ghost ? false : mesh.userData.baseDepthWrite;
    }
    if (visible) {
      renderer.setScissorTest(false);
      renderer.clear();
      if (stage.dataset.section === 'machine') {
        // Detail views are an authored crop, not ghost geometry behind the copy.
        const r = machineArea.getBoundingClientRect();
        const left = clamp(r.left, 0, width);
        const top = clamp(r.top - headerHeight, 0, height);
        const rightEdge = clamp(r.right, 0, width);
        const bottom = clamp(r.bottom - headerHeight, 0, height);
        renderer.setScissor(left, height - bottom, Math.max(0, rightEdge - left), Math.max(0, bottom - top));
        renderer.setScissorTest(true);
      }
      renderer.render(scene, camera);
      renderer.setScissorTest(false);
    }
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
    renderer.autoClear = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .92;
    scene = new THREE.Scene();
    studioEnvironment = createStudioEnvironment(renderer);
    scene.environment = studioEnvironment.texture;
    camera = new THREE.PerspectiveCamera(32, width / height, .1, 50);
    camera.position.set(3.4, 2.15, 7.7).normalize().multiplyScalar(viewHeight / (2 * Math.tan(THREE.MathUtils.degToRad(16))));
    camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xa0a7b0, .18));
    keyLight = new THREE.DirectionalLight(0xfffaf2, 2.0);
    keyLight.castShadow=true;keyLight.shadow.mapSize.set(mobile.matches?1024:2048,mobile.matches?1024:2048);
    Object.assign(keyLight.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:24});
    keyLight.shadow.bias=-.00015;keyLight.shadow.normalBias=.004;
    keyLight.position.set(-3,6,5);scene.add(keyLight,keyLight.target);
    const fill = new THREE.DirectionalLight(0xe7f0ff, .65); fill.position.set(4, 2, -3); scene.add(fill);
    resize();
    const [gltf, manifest] = await Promise.all([
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('./models/xag-p150-max/xag-p150-max-v06-web.glb'),
      fetch('./models/xag-p150-max/web-model-manifest-v06.json').then(r => { if (!r.ok) throw new Error('Manifest unavailable'); return r.json(); })
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
      const points = [];
      for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) points.push(new THREE.Vector3(x, y, z).applyMatrix4(node.matrixWorld).sub(center));
      corners.push(...points);
      meshBounds.push({ mesh: node, points });
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
    for (const rotor of rotors) {
      // Time-averaged swept propeller footprint: transparent, not an opaque disc.
      // This is a presentation effect, not a claim about operational rotor RPM.
      const material = new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
        uniforms:{strength:{value:.10}},vertexShader:'varying vec2 p;void main(){p=uv*2.0-1.0;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:'varying vec2 p;uniform float strength;void main(){float r=length(p);float a=smoothstep(.09,.18,r)*(1.0-smoothstep(.78,1.0,r));float angle=atan(p.y,p.x);a*=.55+.45*pow(abs(cos(angle*2.0)),8.0);gl_FragColor=vec4(.12,.15,.16,a*strength);}' });
      const blur = new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),material);
      blur.rotation.x=-Math.PI/2;blur.position.y=.002;blur.visible=false;
      rotor.node.add(blur);rotor.blur=blur;
    }
    stage.dataset.state = 'ready'; stage.dataset.rotors = String(rotors.length);
    stage.classList.add('is-ready');
    window.dispatchEvent(new Event('drone:ready'));
    requestFrame();
  } catch (error) { console.warn('3D preview unavailable:', error.message); fail(); }
}
window.addEventListener('scroll', requestFrame, { passive: true });
window.addEventListener('resize', resize);
window.addEventListener('drone:part', e => { activePart = e.detail.part; isolate = e.detail.isolation; requestFrame(); });
window.addEventListener('drone:motion', e => { paused = !e.detail.enabled; motionOverride = e.detail.enabled; previousTime = 0; currentPose = null; requestFrame(); });
reduced.addEventListener('change', () => { motionOverride = null; paused = false; previousTime = 0; currentPose = null; requestFrame(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
  else requestFrame();
});
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); contextLost = true; cancelAnimationFrame(frame); frame = 0; stage.classList.remove('is-ready'); stage.dataset.state = 'fallback'; window.dispatchEvent(new Event('drone:error')); });
canvas.addEventListener('webglcontextrestored', () => { contextLost = false; if (model) { stage.classList.add('is-ready'); stage.dataset.state = 'ready'; window.dispatchEvent(new Event('drone:ready')); requestFrame(); } });
resize();
init();
