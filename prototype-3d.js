import * as THREE from 'three';
import { GLTFLoader } from './assets/vendor/three/loaders/GLTFLoader.js';
import { MeshoptDecoder } from './assets/vendor/three/meshopt_decoder.module.js';
import { createStudioEnvironment, tuneSurface } from './prototype-studio.js';
import { createFieldStudy, createApplicationParticles } from './prototype-field.js';

const stage = document.querySelector('#drone-stage');
const canvas = document.querySelector('#drone-canvas');
const fallback = document.querySelector('.model-fallback');
const hero = document.querySelector('#flight');
const uses = document.querySelector('#uses');
const machine = document.querySelector('#machine');
const machineArea = document.querySelector('.machine-airspace');
const applicationArea = () => document.querySelector('.scenario-airspace');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width: 700px)');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
let renderer, scene, camera, model, corners, meshBounds = [], rotors = [], meshes = [];
let activePart = 'all', isolate = true;
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
let renderedSection = null, shadowPoseKey = '';
let flightBank = 0, inputBank = 0, bankInputTime = 0, lastInputX = null, lastInputSection = null;
let pendingBank = false, bankRenderTime = 0;
let activeScenario='spray', payload, sprayAssembly, landingAssembly, payloadReady=false;
let payloadMount, aircraftContent, aircraftCenter, fieldStudy, sprayParticles, spreadParticles;
let configuration='spray', configurationMoving=false;
const assemblyWeights={spray:1,landing:1,spread:0};
const payloadAxis=new THREE.Vector3(0,0,-1);
let payloadAngle=0,payloadRotor;
const motionEnabled = () => !reduced.matches;
function clipFallback() {
  if (stage.dataset.state === 'ready') {stage.style.clipPath='';return;}
  let left=0,rightEdge=width,top=0,bottom=height;
  if(stage.dataset.section==='hero'){
    top=clamp(document.querySelector('.flight-heading').getBoundingClientRect().bottom-headerHeight+12,0,height);
    bottom=clamp(document.querySelector('.flight-bottom').getBoundingClientRect().top-headerHeight-12,top,height);
  }else{
    const r=(stage.dataset.section==='uses'?applicationArea():machineArea)?.getBoundingClientRect();
    if(!r)return;
    left=clamp(r.left,0,width);rightEdge=clamp(r.right,0,width);
    top=clamp(r.top-headerHeight,0,height);bottom=clamp(r.bottom-headerHeight,top,height);
  }
  stage.style.clipPath=`inset(${top}px ${width-rightEdge}px ${height-bottom}px ${left}px)`;
}

function requestFrame() {
  dirty = true;
  if (!frame && !document.hidden) frame = requestAnimationFrame(render);
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
  const application=applicationArea();
  const applicationAnchor=application?anchor(application,.89):null;
  const applicationsVisible=applicationAnchor && applicationAnchor.y+applicationAnchor.h/2>0 && applicationAnchor.y-applicationAnchor.h/2<height && !machineVisible;
  const inApplications=!heroVisible&&applicationsVisible;
  let pose;
  if (heroVisible) {
    const t = reduced.matches ? 0 : exit;
    pose = {x:width*(.5+t*1.8), y:height*.43,
      w:width*(mobile.matches ? 1.35 : .9), h:height*(mobile.matches ? .48 : .53),
      rx:.06,ry:mix(-.28,-.55,t),rz:mix(0,-.08,t),zoom:mobile.matches?1.3:1.12};
  } else if(inApplications){
    pose={...applicationAnchor,rx:activeScenario==='map'?.12:.04,ry:activeScenario==='spread'?2.25:-.22,rz:0,zoom:.94};
  } else {
    const entry = reduced.matches ? 1 : smooth(clamp((innerHeight*.45-machine.getBoundingClientRect().top)/Math.max(1,innerHeight*.45-headerHeight)));
    pose = {...detail,rx:activePart==='battery'?.22:activePart==='rotors'?.4:.03,
      x:detail.x-(1-entry)*(width+detail.w)*1.2,
      ry:activePart==='spray'?2.65:activePart==='tank'?-.4:activePart==='spread'?-2.35:-.2,rz:0,zoom:['all','spread'].includes(activePart)?.95:.9};
  }
  targetFocus = !heroVisible && machineVisible && isolate && ['tank','spray','battery','navigation','rotors','spread'].includes(activePart) ? 1 : 0;
  const applicationReady=stage.dataset.state==='ready'&&!contextLost;
  const visible = heroVisible && exit < .98 || inApplications&&applicationReady&&activeScenario!=='cargo'&&(activeScenario!=='spread'||payloadReady) || !heroVisible&&machineVisible&&(activePart!=='spread'||applicationReady&&payloadReady);
  stage.classList.toggle('is-offscreen', !visible);
  stage.dataset.section = heroVisible ? 'hero' : machineVisible ? 'machine' : inApplications?'uses':'between';
  clipFallback();
  if (lastVisible !== visible) {
    lastVisible = visible;
    window.dispatchEvent(new CustomEvent('drone:visibility', { detail: visible }));
  }
  return { pose, visible };
}
function isSelected(mesh) {
  if(activePart==='spread')return mesh.userData.payload==='spread';
  if (['tank','battery','navigation','spray'].includes(activePart)) return mesh.userData.component === activePart;
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
    const rotatingBlade=stage.dataset.spinning==='true'&&/Carbon composite blades/.test(material.name);
    const weight=mesh.userData.payload?assemblyWeights[mesh.userData.payload]:1;
    mesh.visible=weight>.002;
    const wantedOpacity = (selected ? mesh.userData.baseOpacity : mix(mesh.userData.baseOpacity, .025, currentFocus))*weight;
    const fading=weight<.998;
    if (material.transparent !== (ghost || fading || rotatingBlade || mesh.userData.baseTransparent)) {
      material.transparent = ghost || fading || rotatingBlade || mesh.userData.baseTransparent;
      material.needsUpdate = true;
    }
    material.opacity = wantedOpacity;
    material.depthWrite = ghost || fading || rotatingBlade ? false : mesh.userData.baseDepthWrite;
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
  const withField=fieldStudy?.group.visible;
  const framingCorners=withField?corners.concat(fieldStudy.group.userData.bounds):corners;
  const detailParts=['tank','battery','spray'];
  if(payloadReady)detailParts.push('spread');
  if(!withField)detailParts.push('navigation');
  const key = [pose.rx.toFixed(4), pose.ry.toFixed(4), pose.rz.toFixed(4), activePart,withField].join(':');
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
    const full = project(framingCorners);
    const selected = detailParts.includes(activePart)
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
  if (['machine','uses'].includes(stage.dataset.section)) {
    // Inspection must contain the entire aircraft, including the nearer foot.
    // Fit perspective-projected corners and full rotor sweeps, not an
    // orthographic estimate or a viewport-specific magic magnification.
    const fittedCorners = stage.dataset.section==='machine'&&detailParts.includes(activePart)
      ? meshBounds.filter(item=>isSelected(item.mesh)).flatMap(item=>item.points) : framingCorners;
    for (let pass=0;pass<4;pass++) {
      const screenBounds=points=>{
        const b={left:Infinity,rightEdge:-Infinity,top:Infinity,bottom:-Infinity};
        for(const c of points){
          const p=projectedPoint.copy(c).applyEuler(model.rotation).multiplyScalar(model.scale.x).add(model.position).project(camera);
          const x=(p.x+1)*width/2,y=(1-p.y)*height/2;
          b.left=Math.min(b.left,x);b.rightEdge=Math.max(b.rightEdge,x);b.top=Math.min(b.top,y);b.bottom=Math.max(b.bottom,y);
        }return b;
      };
      const whole=screenBounds(framingCorners),detail=screenBounds(fittedCorners);
      const left=mix(whole.left,detail.left,currentFocus),rightEdge=mix(whole.rightEdge,detail.rightEdge,currentFocus);
      const top=mix(whole.top,detail.top,currentFocus),bottom=mix(whole.bottom,detail.bottom,currentFocus);
      model.position.addScaledVector(right,(pose.x-(left+rightEdge)/2)/pxPerUnit)
        .addScaledVector(up,((top+bottom)/2-pose.y-floating)/pxPerUnit);
      const fit=Math.min(1,pose.w*.94/(rightEdge-left),pose.h*.94/(bottom-top));
      if(fit<1)model.scale.multiplyScalar(fit);
    }
  }
  keyLight.position.copy(model.position).add(new THREE.Vector3(-3,6,5));
  keyLight.target.position.copy(model.position);
}
function registerPayloadMeshes(content){
  model.updateMatrixWorld(true);
  const inverse=model.matrixWorld.clone().invert();
  content.traverse(node=>{
    if(!node.isMesh)return;
    node.userData.component='spread';node.userData.payload='spread';
    node.material=node.material.clone();tuneSurface(node.material);
    node.userData.baseOpacity=node.material.opacity;
    node.userData.baseTransparent=node.material.transparent;
    node.userData.baseDepthWrite=node.material.depthWrite;
    meshes.push(node);
    node.geometry.computeBoundingBox();const b=node.geometry.boundingBox;
    const transform=inverse.clone().multiply(node.matrixWorld),points=[];
    for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])points.push(new THREE.Vector3(x,y,z).applyMatrix4(transform));
    meshBounds.push({mesh:node,points});corners.push(...points);
  });
  boundsCache=null;
}
function prepareConfigurations(content,center){
  aircraftContent=content;aircraftCenter=center;
  sprayAssembly=new THREE.Group();sprayAssembly.name='Detachable RevoSpray assembly';content.add(sprayAssembly);
  landingAssembly=new THREE.Group();landingAssembly.name='RevoSpray landing gear';content.add(landingAssembly);
  content.updateMatrixWorld(true);
  for(const mesh of meshes){
    if(['tank','spray'].includes(mesh.userData.component)){mesh.userData.payload='spray';sprayAssembly.attach(mesh);}
    else if(mesh.userData.component==='landing'){mesh.userData.payload='landing';landingAssembly.attach(mesh);}
  }
  fieldStudy=createFieldStudy();model.add(fieldStudy.group);
  fieldStudy.group.userData.bounds=[];
  for(const x of [-2.15,2.15])for(const z of [-1.4,1.4])fieldStudy.group.userData.bounds.push(new THREE.Vector3(x,-1.02,z));
  const emitterMeshes=meshBounds.filter(item=>item.mesh.userData.component==='spray'&&/spray[\s_|]*(41|73)$/.test(item.mesh.userData.name||item.mesh.name));
  const emitters=emitterMeshes.slice(0,2).map(item=>{const b=new THREE.Box3().setFromPoints(item.points),p=b.getCenter(new THREE.Vector3());p.y=b.min.y-.015;return p;});
  if(emitters.length){sprayParticles=createApplicationParticles('spray',emitters);model.add(sprayParticles.points);}
}
async function loadPayload(){
  stage.dataset.payloadState='loading';window.dispatchEvent(new CustomEvent('drone:payload',{detail:{state:'loading'}}));
  try{
    const [gltf,mount]=await Promise.all([
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('./models/revocast-5/revocast-5-v01-web.glb'),
      fetch('./models/revocast-5/mounting.json').then(r=>{if(!r.ok)throw Error('Mount configuration unavailable');return r.json();})
    ]);
    payload=new THREE.Group();payload.name='Mounted RevoCast 5';
    payloadMount=new THREE.Vector3().fromArray(mount.transform.position);
    payload.position.copy(payloadMount);
    payload.quaternion.fromArray(mount.transform.quaternion);
    payload.scale.fromArray(mount.transform.scale);payload.add(gltf.scene);aircraftContent.add(payload);
    aircraftContent.position.copy(aircraftCenter).multiplyScalar(-1);
    registerPayloadMeshes(payload);
    payload.traverse(node=>{if(node.userData.animation_role==='spreader_spin')payloadRotor={node,initial:node.quaternion.clone()};});
    if(!payloadRotor)throw Error('Spreading disc pivot unavailable');
    const source=payloadRotor.node.getWorldPosition(new THREE.Vector3());model.worldToLocal(source);
    spreadParticles=createApplicationParticles('spread',[source]);model.add(spreadParticles.points);
    payloadReady=true;stage.dataset.payloadState='ready';
    window.dispatchEvent(new CustomEvent('drone:payload',{detail:{state:'ready'}}));requestFrame();
  }catch(error){
    if(payload)payload.visible=false;
    payloadReady=false;stage.dataset.payloadState='error';
    window.dispatchEvent(new CustomEvent('drone:payload',{detail:{state:'error'}}));
    console.warn('RevoCast preview unavailable:',error.message);requestFrame();
  }
}
function updateApplications(dt,moving){
  const applications=stage.dataset.section==='uses',equipment=stage.dataset.section==='machine';
  configuration=applications?activeScenario==='spread'?'spread':activeScenario==='map'?'map':'spray':equipment&&activePart==='spread'?'spread':'spray';
  if(configuration==='spread'&&!payloadReady)configuration='spray';
  const targets={spray:configuration==='spray'?1:0,landing:configuration==='spread'?0:1,spread:configuration==='spread'?1:0};
  configurationMoving=false;
  for(const key of Object.keys(assemblyWeights)){
    assemblyWeights[key]=!moving?targets[key]:mix(assemblyWeights[key],targets[key],1-Math.exp(-dt*7));
    if(Math.abs(assemblyWeights[key]-targets[key])>.002)configurationMoving=true;
  }
  if(sprayAssembly)sprayAssembly.position.y=-.65*(1-assemblyWeights.spray);
  if(landingAssembly)landingAssembly.position.y=-.65*(1-assemblyWeights.landing);
  if(payload){payload.visible=assemblyWeights.spread>.002;payload.position.copy(payloadMount);payload.position.y-=.75*(1-assemblyWeights.spread);}
  const scanning=applications&&activeScenario==='map'||equipment&&activePart==='navigation';
  if(fieldStudy){
    fieldStudy.group.visible=scanning;
    const drift=fieldStudy.update(elapsed,!moving);
    aircraftContent.position.copy(aircraftCenter).multiplyScalar(-1);
    if(scanning&&moving)aircraftContent.position.x+=drift;
  }
  if(keyLight)keyLight.castShadow=!scanning;
  if(sprayParticles){sprayParticles.points.visible=applications&&configuration==='spray'&&assemblyWeights.spray>.95;sprayParticles.update(elapsed,!moving);}
  if(spreadParticles){spreadParticles.points.visible=applications&&configuration==='spread'&&assemblyWeights.spread>.95;spreadParticles.update(elapsed,!moving);}
  if(payloadRotor){
    if(moving&&configuration==='spread')payloadAngle+=dt*45;
    spinQuaternion.setFromAxisAngle(payloadAxis,payloadAngle);payloadRotor.node.quaternion.copy(payloadRotor.initial).multiply(spinQuaternion);
  }
  stage.dataset.configuration=configuration;stage.dataset.transitioning=String(configurationMoving);
  stage.dataset.scan=String(scanning);stage.dataset.discAngle=payloadAngle.toFixed(3);
  const fieldNote=document.querySelector('#machine-field-note');if(fieldNote)fieldNote.hidden=!(scanning&&equipment);
  stage.dataset.sprayMeshes=String(meshes.filter(m=>m.userData.payload==='spray'&&m.visible).length);
  stage.dataset.spreadMeshes=String(meshes.filter(m=>m.userData.payload==='spread'&&m.visible).length);
  applyFocus();
}
function render(time) {
  frame = 0;
  if (document.hidden) { previousTime = 0; return; }
  if(contextLost){
    previousTime=0;
    const {pose}=desiredPose();
    positionFallback(pose);
    dirty=false;
    return;
  }
  const wallDelta = previousTime ? (time - previousTime) / 1000 : 0;
  const dt = Math.min(wallDelta || 1 / 60, .3);
  previousTime = time;
  const { pose, visible } = desiredPose();
  const sectionChanged = renderedSection !== stage.dataset.section;
  renderedSection = stage.dataset.section;
  const moving = visible && motionEnabled();
  // Bank toward horizontal acceleration, recover to level on release. Vertical
  // page movement does not tilt an aircraft hovering in its equipment viewer.
  // Hold new input until its first rendered frame, then recover. A busy GPU
  // must not consume the entire banking impulse before showing any attitude.
  if(pendingBank){bankRenderTime=time;pendingBank=false;}
  const targetBank = moving ? inputBank*Math.exp(-Math.max(0,time-bankRenderTime-80)/140) : 0;
  flightBank = reduced.matches || sectionChanged ? 0 : mix(flightBank,targetBank,1-Math.exp(-dt*8));
  stage.dataset.bank = flightBank.toFixed(4);
  if (moving) elapsed += wallDelta;
  stage.dataset.spinning = String(moving && !!model);
  // Scroll owns screen position: a second easing layer trails the wheel and
  // keeps flying after direction reversals. Separate stages never share a pose.
  if (!currentPose || sectionChanged || reduced.matches || renderedSection === 'hero') currentPose = { ...pose };
  currentPose.x = pose.x;
  currentPose.y = pose.y;
  let unsettled = false;
  const easing = 1 - Math.exp(-dt * 11);
  for (const key of Object.keys(pose)) {
    currentPose[key] = mix(currentPose[key], pose[key], easing);
    if (Math.abs(currentPose[key] - pose[key]) > (['rx', 'ry', 'rz'].includes(key) ? .001 : .15)) unsettled = true;
  }
  const nextFocus = sectionChanged || reduced.matches ? targetFocus : mix(currentFocus, targetFocus, easing);
  if (Math.abs(nextFocus - currentFocus) > .0005 || dirty) { currentFocus = nextFocus; applyFocus(); }
  if (Math.abs(currentFocus - targetFocus) > .001) unsettled = true;
  if (model) {
    updateApplications(dt,moving);
    applyPose({...currentPose,rz:currentPose.rz+flightBank,rx:currentPose.rx+Math.abs(flightBank)*.25}, moving ? Math.sin(elapsed * 1.25) * (mobile.matches ? 3 : 5) : 0);
    for (const rotor of rotors) {
      // Real elapsed time: slow frames must not turn rotation into slow motion.
      if (moving) rotor.angle += wallDelta * 58 * rotor.direction;
      spinQuaternion.setFromAxisAngle(spinAxis, rotor.angle);
      rotor.node.quaternion.copy(rotor.initial).multiply(spinQuaternion);
      rotor.blur.visible = moving && (!isolate || activePart === 'all' || activePart === 'rotors' || ['hero','uses'].includes(stage.dataset.section));
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
      // Propellers do not cast shadows. Hover translates aircraft and key light
      // together, so only framing/assembly changes require a new shadow map.
      // The cached depth texture is reusable, but its world-to-shadow matrix
      // must follow that translation even when the shadow pass is skipped.
      keyLight.updateMatrixWorld();
      keyLight.target.updateMatrixWorld();
      keyLight.shadow.updateMatrices(keyLight);
      const shadowKey = [model.rotation.x,model.rotation.y,model.rotation.z,model.scale.x,currentFocus,assemblyWeights.spray,assemblyWeights.spread].map(v=>v.toFixed(4)).join(':')+activePart;
      if (shadowKey !== shadowPoseKey) {renderer.shadowMap.needsUpdate=true;shadowPoseKey=shadowKey;}
      renderer.setScissorTest(false);
      renderer.clear();
      if (stage.dataset.section === 'hero') {
        // Fly sideways through allocated airspace, never through either copy block.
        const top=clamp(document.querySelector('.flight-heading').getBoundingClientRect().bottom-headerHeight+12,0,height);
        const bottom=clamp(document.querySelector('.flight-bottom').getBoundingClientRect().top-headerHeight-12,top,height);
        renderer.setScissor(0,height-bottom,width,bottom-top);
        renderer.setScissorTest(true);
      }
      if (['machine','uses'].includes(stage.dataset.section)) {
        // Detail views are an authored crop, not ghost geometry behind the copy.
        const r = (stage.dataset.section==='uses'?applicationArea():machineArea).getBoundingClientRect();
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
    positionFallback(pose);
  }
  dirty = false;
  if (moving && model || visible && (unsettled||configurationMoving)) frame = requestAnimationFrame(render);
  else previousTime = 0;
}
function positionFallback(pose){
  fallback.style.left=`${pose.x-pose.w/2}px`;fallback.style.top=`${pose.y-pose.h/2}px`;
  fallback.style.width=`${pose.w}px`;fallback.style.height=`${pose.h}px`;
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
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;
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
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('./models/revocast-5/xag-p150-max-v08-configurable-web.glb'),
      fetch('./models/xag-p150-max/web-model-manifest-v07.json').then(r => { if (!r.ok) throw new Error('Manifest unavailable'); return r.json(); })
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
      const rotorName=item.node.replace('v07 web |','v08 web |');
      content.traverse(node => { if ((node.userData.name || node.name) === rotorName || node.name === THREE.PropertyBinding.sanitizeNodeName(rotorName)) found = node; });
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
    prepareConfigurations(content,center);
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
    loadPayload();
  } catch (error) { console.warn('3D preview unavailable:', error.message); fail(); }
}
window.addEventListener('scroll', () => {
  // Sample input before drawing: missed GPU frames must not lose a reversal.
  const now=performance.now(), {pose,visible}=desiredPose(), section=stage.dataset.section;
  const previousX=lastInputSection===section ? lastInputX : renderedSection===section ? currentPose?.x : null;
  const velocity=previousX!==null&&visible ? (pose.x-previousX)/clamp((now-bankInputTime)/1000,1/60,.12)/width : 0;
  inputBank=motionEnabled()?clamp(-velocity*.18,-.28,.28):0;
  bankInputTime=now;lastInputX=pose.x;lastInputSection=section;
  pendingBank=true;
  requestFrame();
}, { passive: true });
window.addEventListener('resize', resize);
window.addEventListener('drone:part', e => { activePart = e.detail.part; isolate = e.detail.isolation; requestFrame(); });
window.addEventListener('drone:scenario',e=>{activeScenario=e.detail;boundsCache=null;requestFrame();});
window.addEventListener('drone:error',()=>{if(stage.dataset.section==='uses')stage.classList.add('is-offscreen');});
reduced.addEventListener('change', () => { previousTime = 0; currentPose = null; requestFrame(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
  else requestFrame();
});
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); contextLost = true; cancelAnimationFrame(frame); frame = 0; stage.classList.remove('is-ready'); stage.dataset.state = 'fallback'; clipFallback(); requestFrame(); window.dispatchEvent(new Event('drone:error')); });
canvas.addEventListener('webglcontextrestored', () => { contextLost = false; shadowPoseKey=''; if (model) { stage.classList.add('is-ready'); stage.dataset.state = 'ready'; window.dispatchEvent(new Event('drone:ready')); requestFrame(); } });
resize();
init();
