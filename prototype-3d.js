import * as THREE from 'three';
import { GLTFLoader } from './assets/vendor/three/loaders/GLTFLoader.js';
import { MeshoptDecoder } from './assets/vendor/three/meshopt_decoder.module.js';
import { createStudioEnvironment, tuneSurface } from './prototype-studio.js';
import { createFieldStudy, createApplicationParticles } from './prototype-field.js';
import { createNavigationViewer } from './prototype-navigation.js?v=20261009-customer';
import { refineNavigationHardware } from './prototype-navigation-hardware.js';

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
let cargo, cargoReady=false, navigationViewer, navigationSource, navigationMode='hardware';
let introStarted=-1, introElapsed=0, applicationFlightStart=0, applicationFlight='', nextScenario=null;
let supportScenesQueued=false;
let cargoPickupStart=-1, cargoPickupDone=false, cargoBox, cargoHook=[],cargoRope=[];
let payloadMount, aircraftContent, aircraftCenter, fieldStudy, sprayParticles, spreadParticles;
let configuration='spray', configurationMoving=false;
const assemblyWeights={spray:1,landing:1,spread:0,cargo:0};
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
  const availableTravel = Math.max(1, hero.offsetHeight - height);
  const progress = clamp(scrollY / availableTravel);
  const exit = smooth(progress);
  const heroVisible = scrollY < availableTravel;
  const detail = anchor(machineArea, .93);
  const machineVisible = machine.getBoundingClientRect().top < innerHeight * .45 && detail.y + detail.h / 2 > 0 && detail.y - detail.h / 2 < height;
  const application=applicationArea();
  const applicationAnchor=application?anchor(application,1.04):null;
  const applicationsVisible=applicationAnchor && applicationAnchor.y+applicationAnchor.h/2>0 && applicationAnchor.y-applicationAnchor.h/2<height && !machineVisible;
  const inApplications=!heroVisible&&applicationsVisible;
  let pose;
  if (heroVisible) {
    const t = reduced.matches ? 0 : exit;
    const top=document.querySelector('.flight-heading').getBoundingClientRect().bottom-headerHeight+16;
    const bottom=document.querySelector('.flight-bottom').getBoundingClientRect().top-headerHeight-20;
    pose = {x:width*.55, heroExit:t, y:(top+bottom)/2,
      w:width*(mobile.matches?.96:.87), h:Math.max(90,bottom-top),
      rx:.06+.05*Math.sin(t*Math.PI),ry:mix(-.28,-.55,t),rz:-.18*Math.sin(t*Math.PI),zoom:1};
    if(introStarted>=0&&!reduced.matches){
      const arrival=clamp(introElapsed/2.3),settle=smooth(arrival);
      pose.zoom=.035+.965*settle;pose.x+=Math.sin(arrival*Math.PI*2)*width*.13*(1-arrival);
      pose.y+=height*.06*(1-settle);pose.rz+=Math.sin(arrival*Math.PI*2)*.28*(1-arrival);pose.ry+=.4*(1-settle);
      if(arrival>=1){introStarted=-1;hero.classList.remove('is-arriving');queueSupportScenes();}
    }
  } else if(inApplications){
    pose={...applicationAnchor,y:applicationAnchor.y-18,h:applicationAnchor.h*.96,rx:.11,ry:activeScenario==='spread'?2.65:activeScenario==='spray'?2.9:-.22,rz:0,zoom:1.08};
    if(applicationFlight&&!reduced.matches){
      const duration=applicationFlight==='out'?220:520,t=clamp((performance.now()-applicationFlightStart)/duration);
      const distance=applicationFlight==='out'?smooth(t):-(1-Math.pow(t,0.45));
      pose.x+=distance*(applicationAnchor.w+width*.3);pose.rz=-.18*Math.sin(t*Math.PI);pose.rx+=.06*Math.sin(t*Math.PI);
    }
  } else {
    const entry = reduced.matches ? 1 : smooth(clamp((innerHeight*.45-machine.getBoundingClientRect().top)/Math.max(1,innerHeight*.45-headerHeight)));
    pose = {...detail,rx:activePart==='battery'?.22:activePart==='rotors'?.4:.03,
      x:detail.x-(1-entry)*(width+detail.w)*1.2,
      ry:activePart==='spray'?2.65:activePart==='tank'?-.4:activePart==='spread'?-2.35:activePart==='navigation'?.25:-.2,rz:0,zoom:['all','spread'].includes(activePart)?.95:.9};
  }
  targetFocus = !heroVisible && machineVisible && isolate && ['tank','spray','battery','navigation','rotors','spread'].includes(activePart) ? 1 : 0;
  const applicationReady=stage.dataset.state==='ready'&&!contextLost;
  const navigating=inApplications&&activeScenario==='map'||!heroVisible&&machineVisible&&activePart==='navigation'&&navigationMode==='map';
  if(navigating)prepareNavigationViewer();
  navigationViewer?.show(navigating?(inApplications?application:machineArea):null);
  const visible = heroVisible || !navigating&&(inApplications&&applicationReady&&(activeScenario!=='cargo'||cargoReady)&&(activeScenario!=='spread'||payloadReady) || !heroVisible&&machineVisible&&(activePart!=='spread'||applicationReady&&payloadReady));
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
    mesh.visible=weight>.002&&!mesh.userData.hiddenRope;
    const selectedOpacity=mesh.userData.inspectionCover&&activePart==='navigation'?mix(mesh.userData.baseOpacity,.09,currentFocus):mesh.userData.baseOpacity;
    const wantedOpacity = (selected ? selectedOpacity : mix(mesh.userData.baseOpacity, .025, currentFocus))*weight;
    const fading=weight<.998;
    if (material.transparent !== (ghost || fading || rotatingBlade || mesh.userData.baseTransparent)) {
      material.transparent = ghost || fading || rotatingBlade || mesh.userData.baseTransparent;
      material.needsUpdate = true;
    }
    material.opacity = wantedOpacity;
    material.depthWrite = ghost || fading || rotatingBlade ? false : mesh.userData.baseDepthWrite;
    mesh.renderOrder = ghost ? 0 : 1;
    mesh.castShadow = !ghost && !mesh.userData.inspectionCover && !/Carbon composite blades/.test(material.name);
    mesh.receiveShadow = !ghost && !mesh.name.includes('175 visible');
  }
  stage.dataset.part = activePart;
  stage.dataset.isolated = String(currentFocus > .95 && isolate && activePart !== 'all');
  stage.dataset.selectedMeshes = String(selectedCount);
}
function applyPose(pose, floating) {
  model.rotation.set(pose.rx, pose.ry, pose.rz);
  model.scale.setScalar(1);
  const withField=fieldStudy?.group.visible;
  const extras=meshBounds.filter(item=>['spread','cargo'].includes(item.mesh.userData.payload)&&assemblyWeights[item.mesh.userData.payload]>.1).flatMap(item=>item.points);
  const framingCorners=corners.concat(extras,withField?fieldStudy.group.userData.bounds:[]);
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
  if (['hero','machine','uses'].includes(stage.dataset.section)) {
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
  if(stage.dataset.section==='hero'&&pose.heroExit>0){
    const screenLeft=()=>Math.min(...framingCorners.map(c=>{
      const p=projectedPoint.copy(c).applyEuler(model.rotation).multiplyScalar(model.scale.x).add(model.position).project(camera);
      return (p.x+1)*width/2;
    }));
    // Last visible rotor tip clears the edge exactly as the pinned chapter releases.
    // Use actual fitted geometry rather than a fixed viewport-wide translation.
    const targetLeft=mix(screenLeft(),width,pose.heroExit);
    for(let pass=0;pass<4;pass++)model.position.addScaledVector(right,(targetLeft-screenLeft())/pxPerUnit);
  }
  keyLight.position.copy(model.position).add(new THREE.Vector3(-3,6,5));
  keyLight.target.position.copy(model.position);
}
function registerPayloadMeshes(content,kind='spread'){
  model.updateMatrixWorld(true);
  const inverse=model.matrixWorld.clone().invert();
  content.traverse(node=>{
    if(!node.isMesh)return;
    node.userData.component=kind;node.userData.payload=kind;
    node.material=node.material.clone();tuneSurface(node.material);
    node.userData.baseOpacity=node.material.opacity;
    node.userData.baseTransparent=node.material.transparent;
    node.userData.baseDepthWrite=node.material.depthWrite;
    meshes.push(node);
    node.geometry.computeBoundingBox();const b=node.geometry.boundingBox;
    const transform=inverse.clone().multiply(node.matrixWorld),points=[];
    for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])points.push(new THREE.Vector3(x,y,z).applyMatrix4(transform));
    meshBounds.push({mesh:node,points});
  });
  boundsCache=null;
}
async function warmInspectionPrograms(){
  // Profiling showed five new GPU programs on the first battery isolation.
  // Compile the transparent/non-shadow receiving variants without changing
  // live materials, visibility or focus. Keep cache references for reuse.
  const warm=model.clone(true);
  warm.traverse(node=>{
    if(!node.isMesh)return;node.visible=true;node.receiveShadow=false;node.castShadow=false;
    node.material=node.material.clone();tuneSurface(node.material);node.material.transparent=true;node.material.opacity=.025;node.material.depthWrite=false;
  });
  try{await renderer.compileAsync(warm,camera,scene);stage.dataset.inspectionWarm='true';}
  catch(error){console.warn('Inspection warmup unavailable',error.message);}
}
async function loadCargo(){
  try{
    const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('./models/revosling/revosling-v01-compressed.glb');
    cargo=gltf.scene;cargo.position.set(0,.48375,-.075);aircraftContent.add(cargo);
    cargo.traverse(node=>{
      const name=node.name.replaceAll('_',' ');
      if(node.isMesh&&/smart hook|cover seam|release button|status indicator|charging port|upper rope eye|cargo safety hook|safety latch|hook casing screw/i.test(name))cargoHook.push({node,y:node.position.y});
      if(node.isMesh&&/display rope/i.test(name)){node.userData.hiddenRope=true;node.visible=false;}
    });
    cargoBox=new THREE.Group();cargoBox.name='Illustrative wooden cargo crate';cargoBox.position.set(0,-1.346,0);cargo.add(cargoBox);
    const timber=new THREE.MeshStandardMaterial({color:0xa18055,roughness:.83}),strap=new THREE.MeshStandardMaterial({color:0x4a5149,roughness:.82});
    const box=(size,position,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...position);cargoBox.add(m);};
    box([.27,.15,.22],[0,0,0],timber);
    for(const x of [-.11,.11])for(const z of [-.112,.112])box([.024,.17,.014],[x,0,z],strap);
    for(const x of [-.085,.085])box([.015,.01,.23],[x,.08,0],strap);
    const ropeLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x82867a}));cargo.add(ropeLine);cargoRope=[ropeLine];
    registerPayloadMeshes(cargo,'cargo');cargoReady=true;stage.dataset.cargoState='ready';
    window.dispatchEvent(new CustomEvent('drone:application-status',{detail:{scenario:'cargo',state:'ready'}}));requestFrame();
  }catch(error){stage.dataset.cargoState='error';window.dispatchEvent(new CustomEvent('drone:application-status',{detail:{scenario:'cargo',state:'fallback'}}));}
}
function updateCargoPickup(time){
  if(!cargoReady)return;
  const t=cargoPickupDone?1:cargoPickupStart<0?0:clamp((time-cargoPickupStart)/3200);
  const lower=t<.4?smooth(t/.4):t<.55?1:1-smooth((t-.55)/.45);
  const drop=cargoPickupStart<0&&!cargoPickupDone?0:lower*.30;
  for(const part of cargoHook)part.node.position.y=part.y-drop;
  const lifted=t>.55?.30*smooth((t-.55)/.45):0;
  cargoBox.position.y=-1.346+lifted;
  const line=cargoRope[0];if(line.userData.drop!==drop){line.geometry.dispose();line.geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-.30,0),new THREE.Vector3(0,-.67-drop,0)]);line.userData.drop=drop;}
  line.visible=assemblyWeights.cargo>.01;line.material.transparent=true;line.material.opacity=assemblyWeights.cargo;
  if(t>=1&&cargoPickupStart>=0){cargoPickupDone=true;cargoPickupStart=-1;window.dispatchEvent(new CustomEvent('drone:cargo-status',{detail:'complete'}));}
  stage.dataset.pickup=cargoPickupDone?'complete':cargoPickupStart>=0?'lifting':'ready';
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
  configuration=applications?activeScenario:equipment&&activePart==='spread'?'spread':'spray';
  if(configuration==='spread'&&!payloadReady)configuration='spray';
  const targets={spray:configuration==='spray'?1:0,landing:['spray','map'].includes(configuration)?1:0,spread:configuration==='spread'?1:0,cargo:configuration==='cargo'&&cargoReady?1:0};
  configurationMoving=false;
  for(const key of Object.keys(assemblyWeights)){
    assemblyWeights[key]=!moving?targets[key]:mix(assemblyWeights[key],targets[key],1-Math.exp(-dt*7));
    if(Math.abs(assemblyWeights[key]-targets[key])>.002)configurationMoving=true;
  }
  if(sprayAssembly)sprayAssembly.position.y=-.65*(1-assemblyWeights.spray);
  if(landingAssembly)landingAssembly.position.y=-.65*(1-assemblyWeights.landing);
  if(payload){payload.visible=assemblyWeights.spread>.002;payload.position.copy(payloadMount);payload.position.y-=.75*(1-assemblyWeights.spread);}
  if(cargo){cargo.position.y=.48375-.6*(1-assemblyWeights.cargo);cargo.visible=assemblyWeights.cargo>.002;}
  const scanning=applications&&activeScenario==='map'||equipment&&activePart==='navigation';
  if(fieldStudy){
    fieldStudy.group.visible=false;
    const drift=fieldStudy.update(elapsed,!moving);
    aircraftContent.position.copy(aircraftCenter).multiplyScalar(-1);
    if(scanning&&moving&&!navigationViewer)aircraftContent.position.x+=drift;
  }
  if(keyLight)keyLight.castShadow=!scanning;
  if(sprayParticles){sprayParticles.points.visible=(applications||equipment&&activePart==='spray')&&configuration==='spray'&&assemblyWeights.spray>.95;if(sprayParticles.points.visible)sprayParticles.update(elapsed,!moving);}
  if(spreadParticles){spreadParticles.points.visible=(applications||equipment&&activePart==='spread')&&configuration==='spread'&&assemblyWeights.spread>.95;if(spreadParticles.points.visible)spreadParticles.update(elapsed,!moving);}
  if(payloadRotor){
    if(moving&&configuration==='spread')payloadAngle+=dt*45;
    spinQuaternion.setFromAxisAngle(payloadAxis,payloadAngle);payloadRotor.node.quaternion.copy(payloadRotor.initial).multiply(spinQuaternion);
  }
  stage.dataset.configuration=configuration;stage.dataset.transitioning=String(configurationMoving);
  stage.dataset.scan=String(scanning);stage.dataset.discAngle=payloadAngle.toFixed(3);
  const fieldNote=document.querySelector('#machine-field-note');if(fieldNote)fieldNote.hidden=true;
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
  if(introStarted>=0)introElapsed+=Math.min(wallDelta||1/60,1/30);
  if(applicationFlight==='out'&&time-applicationFlightStart>=220){activeScenario=nextScenario;nextScenario=null;applicationFlight='in';applicationFlightStart=time;boundsCache=null;}
  if(applicationFlight==='in'&&time-applicationFlightStart>=520)applicationFlight='';
  const { pose, visible } = desiredPose();
  const sectionChanged = renderedSection !== stage.dataset.section;
  if(sectionChanged&&stage.dataset.section==='uses'&&!reduced.matches&&!applicationFlight&&activeScenario!=='map'){
    applicationFlight='in';applicationFlightStart=time;pose.x-=pose.w+width*.3;
  }
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
  if (model && stage.dataset.state==='ready') {
    updateApplications(dt,moving);
    updateCargoPickup(time);
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
      // Inspection ghosts do not need a full 2K shadow pass on every focus frame.
      const inspectionMoving=stage.dataset.section==='machine'&&Math.abs(currentFocus-targetFocus)>.015;
      if (!inspectionMoving&&shadowKey !== shadowPoseKey) {renderer.shadowMap.needsUpdate=true;shadowPoseKey=shadowKey;}
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
      stage.classList.add('is-ready');
      renderer.setScissorTest(false);
    }
  } else {
    // Saved render follows the same allocated space when WebGL or the GLB is unavailable.
    positionFallback(pose);
  }
  dirty = false;
  if (moving && model && stage.dataset.state==='ready' || visible && (unsettled||configurationMoving||introStarted>=0)) frame = requestAnimationFrame(render);
  else previousTime = 0;
}
function positionFallback(pose){
  const zoom=pose.zoom??1,w=pose.w*zoom,h=pose.h*zoom;
  fallback.style.left=`${pose.x-w/2}px`;fallback.style.top=`${pose.y-h/2}px`;
  fallback.style.width=`${w}px`;fallback.style.height=`${h}px`;
  fallback.style.transform=`rotate(${pose.rz||0}rad)`;
}
function fail() {
  clearTimeout(window.__agroIntroTimeout);
  document.documentElement.classList.remove('intro-pending');
  hero.classList.remove('is-arriving');
  introStarted=-1;
  stage.dataset.state = 'fallback';
  stage.classList.remove('is-ready');
  window.dispatchEvent(new Event('drone:error'));
  model = null;
  requestFrame();
}
function prepareNavigationViewer(){
  if(navigationViewer||!navigationSource)return;
  const template=navigationSource;
  navigationSource=null;
  template.traverse(node=>{if(node.isMesh){node.material=node.material.clone();node.castShadow=false;}});
  navigationViewer=createNavigationViewer(template);
}
function queueSupportScenes(){
  if(supportScenesQueued||stage.dataset.state!=='ready')return;
  supportScenesQueued=true;
  const idle=window.requestIdleCallback||((callback)=>setTimeout(callback,250));
  idle(()=>{loadPayload();loadCargo();prepareNavigationViewer();warmInspectionPrograms();},{timeout:1500});
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
    refineNavigationHardware(content);
    navigationSource=content.clone(true);
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
    // Prepare the actual spinning/blended scene variants before the arrival clock.
    for(const rotor of rotors)rotor.blur.visible=true;
    for(const mesh of meshes)if(/Carbon composite blades/.test(mesh.material.name)){mesh.material.transparent=true;mesh.material.opacity=.07;mesh.material.depthWrite=false;}
    await renderer.compileAsync(scene,camera);
    // Upload geometry/textures and prepare the first shadow pass while the
    // canvas is hidden. Only then start the original 3D arrival clock.
    updateApplications(0,false);
    applyPose(desiredPose().pose,0);
    scene.updateMatrixWorld(true);
    keyLight.shadow.updateMatrices(keyLight);
    renderer.shadowMap.needsUpdate=true;
    renderer.render(scene,camera);
    await new Promise(resolve=>requestAnimationFrame(resolve));
    clearTimeout(window.__agroIntroTimeout);
    if(!reduced.matches&&scrollY<100&&document.documentElement.classList.contains('intro-pending')){
      introElapsed=0;previousTime=0;introStarted=performance.now();hero.classList.add('is-arriving');
    }
    document.documentElement.classList.remove('intro-pending');
    stage.dataset.state = 'ready'; stage.dataset.rotors = String(rotors.length);
    window.dispatchEvent(new Event('drone:ready'));
    requestFrame();
    if(introStarted<0)queueSupportScenes();
  } catch (error) { console.warn('3D preview unavailable:', error.message); fail(); }
}
window.addEventListener('scroll', () => {
  if(introStarted>=0&&scrollY>10){introStarted=-1;hero.classList.remove('is-arriving');queueSupportScenes();}
  // Sample input before drawing: missed GPU frames must not lose a reversal.
  const now=performance.now(), {pose,visible}=desiredPose(), section=stage.dataset.section;
  const previousX=lastInputSection===section ? lastInputX : renderedSection===section ? currentPose?.x : null;
  const logicalX=pose.x+(pose.heroExit||0)*width;
  const velocity=previousX!==null&&visible ? (logicalX-previousX)/clamp((now-bankInputTime)/1000,1/60,.12)/width : 0;
  inputBank=motionEnabled()?clamp(-velocity*.18,-.28,.28):0;
  bankInputTime=now;lastInputX=logicalX;lastInputSection=section;
  pendingBank=true;
  requestFrame();
}, { passive: true });
window.addEventListener('resize', resize);
const airspaceResize=new ResizeObserver(()=>{boundsCache=null;requestFrame();});
airspaceResize.observe(machineArea);if(applicationArea())airspaceResize.observe(applicationArea());
window.addEventListener('drone:part', e => { activePart = e.detail.part; isolate = e.detail.isolation; requestFrame(); });
window.addEventListener('drone:scenario',e=>{
  if(e.detail===activeScenario&&!applicationFlight)return;
  if(!reduced.matches&&stage.dataset.section==='uses'&&activeScenario!=='map'){
    nextScenario=e.detail;applicationFlight='out';applicationFlightStart=performance.now();
  }else{activeScenario=e.detail;applicationFlight='in';applicationFlightStart=performance.now();}
  cargoPickupStart=-1;cargoPickupDone=false;boundsCache=null;requestFrame();
});
window.addEventListener('drone:navigation-mode',e=>{navigationMode=e.detail;boundsCache=null;requestFrame();});
window.addEventListener('drone:cargo-pickup',()=>{
  if(!cargoReady||activeScenario!=='cargo')return;
  cargoPickupDone=false;cargoPickupStart=reduced.matches?performance.now()-3200:performance.now();requestFrame();
});
window.addEventListener('drone:error',()=>{if(stage.dataset.section==='uses')stage.classList.add('is-offscreen');});
reduced.addEventListener('change', () => {
  previousTime=0;currentPose=null;
  if(reduced.matches){introStarted=-1;hero.classList.remove('is-arriving');document.documentElement.classList.remove('intro-pending');queueSupportScenes();if(nextScenario){activeScenario=nextScenario;nextScenario=null;}applicationFlight='';if(cargoPickupStart>=0)cargoPickupStart=performance.now()-3200;}
  requestFrame();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
  else requestFrame();
});
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); contextLost = true; cancelAnimationFrame(frame); frame = 0; stage.classList.remove('is-ready'); stage.dataset.state = 'fallback'; clipFallback(); requestFrame(); window.dispatchEvent(new Event('drone:error')); });
canvas.addEventListener('webglcontextrestored', () => { contextLost = false; shadowPoseKey=''; if (model) { stage.classList.add('is-ready'); stage.dataset.state = 'ready'; window.dispatchEvent(new Event('drone:ready')); requestFrame(); } });
resize();
init();
