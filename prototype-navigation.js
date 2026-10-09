import * as THREE from 'three';
import {createStudioEnvironment} from './prototype-studio.js';

// Our own voxel coverage effect. No React Bits Pro source is copied.
// Real elevation/OSM features, explicitly invented demo mission boundaries.
export function createNavigationViewer(template){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const wrap=document.createElement('div');wrap.className='navigation-viewer';wrap.hidden=true;
  wrap.innerHTML=`<canvas aria-label="Карта окрестностей Кокшетау; выберите участок для планирования маршрута"></canvas>
    <div class="navigation-heading"><span>Кокшетау · озеро Копа</span></div>
    <div class="navigation-controls"><div class="navigation-fields" role="group" aria-label="Выберите участок"><button type="button" data-field="0" aria-pressed="false">Участок А</button><button type="button" data-field="1" aria-pressed="false">Участок Б</button><button type="button" data-field="2" aria-pressed="false">Участок В</button></div>
    <p class="navigation-status" role="status">Загружаем карту…</p><button class="navigation-back" type="button" hidden>Обзор участков</button>
    <details class="navigation-attribution"><summary>© OpenStreetMap</summary><p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors · ODbL</a><br><a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Mapzen / SRTM</a> · <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener">USGS</a></p></details></div>`;
  const canvas=wrap.querySelector('canvas'),status=wrap.querySelector('.navigation-status'),back=wrap.querySelector('.navigation-back');
  let host=null,renderer=null,scene,camera,aircraft,terrain,voxels,scan,routeLine,terrainData;
  let ready=false,failed=false,frame=0,previous=0,clock=0,missionTime=0,state='overview',selected=-1,path;
  let observed=false,viewportW=0,viewportH=0,lastViewOffset=null;
  let fields=[];
  const covered=new Float32Array(576);let lastScanProgress=0;
  const outlines=[],labels=[],rotors=[],axis=new THREE.Vector3(0,1,0),q=new THREE.Quaternion();
  const dummy=new THREE.Object3D(),blue=new THREE.Color(0x468392),teal=new THREE.Color(0x739a91),white=new THREE.Color(0xc5ded9);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const cameraTarget=new THREE.Vector3(),lookTarget=new THREE.Vector3(),displayLook=new THREE.Vector3(),dronePoint=new THREE.Vector3();
  const projected=new THREE.Vector3();let aircraftRadius=.13;
  function containScan(){
    const controls=wrap.querySelector('.navigation-controls'),top=controls.offsetTop+controls.offsetHeight+14,bottom=viewportH-20;
    const points=[];
    for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])points.push(dronePoint.clone().add(new THREE.Vector3(x,y,z).multiplyScalar(aircraftRadius)));
    const vertices=scan.geometry.attributes.position;
    for(let i=0;i<vertices.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(vertices,i).add(scan.position));
    const bounds=()=>{
      const b={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
      for(const point of points){projected.copy(point).project(camera);const x=(projected.x+1)*viewportW/2,y=(1-projected.y)*viewportH/2;b.left=Math.min(b.left,x);b.right=Math.max(b.right,x);b.top=Math.min(b.top,y);b.bottom=Math.max(b.bottom,y);}return b;
    };
    let ox=0,oy=0;camera.setViewOffset(viewportW,viewportH,0,0,viewportW,viewportH);camera.updateProjectionMatrix();
    for(let pass=0;pass<3;pass++){
      camera.updateMatrixWorld();const b=bounds(),factor=Math.max(1,(b.right-b.left)/(viewportW-32),(b.bottom-b.top)/Math.max(80,bottom-top));
      if(factor>1){camera.position.sub(displayLook).multiplyScalar(factor*1.03).add(displayLook);camera.lookAt(displayLook);camera.updateMatrixWorld();}
      const fitted=bounds();ox+=(fitted.left+fitted.right)/2-viewportW/2;oy+=(fitted.top+fitted.bottom)/2-(top+bottom)/2;
      camera.setViewOffset(viewportW,viewportH,ox,oy,viewportW,viewportH);camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();const b=bounds();wrap.dataset.scanBounds=JSON.stringify({...b,safeTop:top,safeBottom:bottom});lastViewOffset=null;
  }
  for(const b of wrap.querySelectorAll('[data-field]'))b.disabled=true;
  const observer=new IntersectionObserver(entries=>{observed=entries[0]?.isIntersecting||false;if(observed)request();else stop();},{threshold:.01});
  observer.observe(wrap);
  function stop(){cancelAnimationFrame(frame);frame=0;previous=0;}
  function request(){if(!frame&&host&&!document.hidden&&observed)frame=requestAnimationFrame(render);}
  function h(x,z){
    if(!terrainData)return 0;
    const n=terrainData.size,u=THREE.MathUtils.clamp((x+2)/4*(n-1),0,n-1),v=THREE.MathUtils.clamp((z+2)/4*(n-1),0,n-1);
    const x0=Math.floor(u),z0=Math.floor(v),x1=Math.min(n-1,x0+1),z1=Math.min(n-1,z0+1),a=terrainData.elevations;
    const value=THREE.MathUtils.lerp(THREE.MathUtils.lerp(a[z0*n+x0],a[z0*n+x1],u-x0),THREE.MathUtils.lerp(a[z1*n+x0],a[z1*n+x1],u-x0),v-z0);
    return (value-terrainData.minimum)*4/terrainData.spanM*12-.28;
  }
  function overviewPosition(){
    const controls=wrap.querySelector('.navigation-controls').offsetHeight;
    const mobile=viewportW<500,pitch=mobile?.96:.57,depth=mobile?.28:.82;
    const distance=Math.max(4/Math.max(.2,camera.aspect),4*pitch*viewportH/Math.max(160,viewportH-controls-70))*(mobile?1.03:1.28)/(2*Math.tan(THREE.MathUtils.degToRad(21)));
    return new THREE.Vector3(0,distance*pitch,distance*depth);
  }
  function resize(){
    if(!host||!renderer)return;
    const w=host.clientWidth,h=host.clientHeight;
    if(viewportW===w&&viewportH===h)return;
    viewportW=w;viewportH=h;renderer.setSize(w,h,false);camera.aspect=w/Math.max(1,h);
    lastViewOffset=null;camera.updateProjectionMatrix();request();
    const labelScale=28*2*Math.tan(THREE.MathUtils.degToRad(21))/Math.max(1,h);
    for(const label of labels)label.scale.set(labelScale,labelScale,1);
  }
  const resizeObserver=new ResizeObserver(resize);
  function overview(){state='overview';selected=-1;missionTime=0;back.hidden=true;status.textContent=ready?'Выберите поле для планирования маршрута.':'Загружаем карту…';for(const b of wrap.querySelectorAll('[data-field]'))b.setAttribute('aria-pressed','false');if(aircraft)aircraft.visible=false;wrap.dataset.state=state;request();}
  function select(index){
    if(!ready)return;selected=index;missionTime=0;state=reduced.matches?'result':'approach';back.hidden=false;
    wrap.querySelectorAll('[data-field]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.field===index)));
    const f=fields[index];covered.fill(0);lastScanProgress=0;path=new THREE.CurvePath();
    for(let row=0;row<4;row++){
      const z=f.z-f.d*.375+row*f.d*.25,a=row%2?f.w*.48:-f.w*.48;
      const start=new THREE.Vector3(f.x+a,h(f.x+a,z)+.027,z),end=new THREE.Vector3(f.x-a,h(f.x-a,z)+.027,z);
      path.add(new THREE.LineCurve3(start,end));
      if(row<3){const next=end.clone();next.z+=f.d*.25;next.y=h(next.x,next.z)+.027;
        const c1=end.clone(),c2=next.clone();c1.x+=Math.sign(-a)*f.w*.025;c2.x=c1.x;c1.z+=f.d*.08;c2.z-=f.d*.08;
        path.add(new THREE.CubicBezierCurve3(end,c1,c2,next));}
    }
    routeLine.geometry.dispose();routeLine.geometry=new THREE.BufferGeometry().setFromPoints(path.getPoints(100).map(p=>new THREE.Vector3(p.x,h(p.x,p.z)+.006,p.z)));routeLine.computeLineDistances();
    status.textContent=reduced.matches?`Участок ${f.name}: покрытие маршрута.`:`Участок ${f.name}: подлёт к маршруту.`;
    if(reduced.matches)markCoverage(1);updateVoxels();wrap.dataset.state=state;request();
  }
  function footprint(p){
    const f=fields[selected];return {left:Math.max(f.x-f.w/2,p.x-f.w*.08),right:Math.min(f.x+f.w/2,p.x+f.w*.08),top:Math.max(f.z-f.d/2,p.z-f.d/8),bottom:Math.min(f.z+f.d/2,p.z+f.d/8)};
  }
  function markCoverage(progress){
    const f=fields[selected],n=24;
    // Sample the travelled arc, not an unrelated row-order timer. Large frame
    // gaps cannot leave holes; the exact same footprint constructs the beam.
    const steps=Math.max(1,Math.ceil((progress-lastScanProgress)*600));
    for(let s=0;s<=steps;s++){
      const p=path.getPointAt(THREE.MathUtils.lerp(lastScanProgress,progress,s/steps)),b=footprint(p);
      for(let j=0;j<n;j++)for(let i=0;i<n;i++){
        const x=f.x+((i+.5)/n-.5)*f.w,z=f.z+((j+.5)/n-.5)*f.d;
        if(x>=b.left&&x<=b.right&&z>=b.top&&z<=b.bottom)covered[j*n+i]=1;
      }
    }
    lastScanProgress=progress;
  }
  function updateBeam(){
    const b=footprint(dronePoint),corners=[[b.left,b.top],[b.right,b.top],[b.right,b.bottom],[b.left,b.bottom]],positions=[];
    const ground=corners.map(([x,z])=>new THREE.Vector3(x,h(x,z)+.002,z));
    const origin=dronePoint.clone();origin.y-=.004;
    for(let i=0;i<4;i++)for(const p of [origin,ground[i],ground[(i+1)%4]])positions.push(p.x,p.y,p.z);
    for(const i of [0,1,2,0,2,3])positions.push(...ground[i].toArray());
    scan.geometry.attributes.position.array.set(positions);scan.geometry.attributes.position.needsUpdate=true;scan.geometry.computeBoundingSphere();
    wrap.dataset.footprint=JSON.stringify(b);
  }
  function updateVoxels(){
    if(!voxels||selected<0)return;const f=fields[selected],n=24;
    let revealed=0;
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const x=f.x+((i+.5)/n-.5)*f.w,z=f.z+((j+.5)/n-.5)*f.d;
      const amount=covered[j*n+i];
      dummy.position.set(x,h(x,z)+.001,z);
      if(amount>0)revealed++;
      dummy.scale.set(f.w/n*.96*amount,.0008*amount,f.d/n*.96*amount);dummy.updateMatrix();voxels.setMatrixAt(j*n+i,dummy.matrix);
      voxels.setColorAt(j*n+i,blue.clone().lerp(state==='result'?teal:white,amount*.55));
    }
    wrap.dataset.revealed=String(revealed);
    voxels.instanceMatrix.needsUpdate=true;if(voxels.instanceColor)voxels.instanceColor.needsUpdate=true;
  }
  async function init(){
    if(renderer||failed)return;
    try{
    const response=await Promise.all(['region-terrain','region-features','demo-fields'].map(name=>fetch(`./assets/kokschetau/${name}.json`).then(r=>{if(!r.ok)throw Error('Geodata missing');return r.json();})));
      fields=response[2].fields;
      terrainData=response[0];terrainData.minimum=Math.min(...terrainData.elevations);
      const [west,south,east,north]=terrainData.bounds;
      for(const f of fields){f.x=(f.lon-west)/(east-west)*4-2;f.z=(north-f.lat)/(north-south)*4-2;}
      terrainData.spanM=(east-west)*111320*Math.cos((south+north)*Math.PI/360);
      renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));
      renderer.setClearColor(0xedf2f4);renderer.toneMapping=THREE.ACESFilmicToneMapping;
      scene=new THREE.Scene();scene.environment=createStudioEnvironment(renderer).texture;
      scene.add(new THREE.HemisphereLight(0xffffff,0x94a38e,.85));const key=new THREE.DirectionalLight(0xfffcf2,.9);key.position.set(-2,6,3);scene.add(key);
      camera=new THREE.PerspectiveCamera(42,1,.005,30);camera.position.set(0,3.8,4.5);camera.lookAt(0,0,0);
      const geo=new THREE.PlaneGeometry(4,4,128,128);geo.rotateX(-Math.PI/2);
      const pos=geo.attributes.position,colors=[];
      for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,h(x,z));const c=new THREE.Color(0xb9c3a6).lerp(new THREE.Color(0x879c86),(h(x,z)+.28)/.32);colors.push(c.r,c.g,c.b);}
      geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
      const terrainMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,transparent:true});
      terrainMaterial.onBeforeCompile=shader=>{
        shader.vertexShader='varying vec2 regionPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nregionPosition=position.xz;');
        shader.fragmentShader='varying vec2 regionPosition;\n'+shader.fragmentShader.replace('#include <opaque_fragment>','float regionEdge=min(2.0-abs(regionPosition.x),2.0-abs(regionPosition.y));\ndiffuseColor.a*=smoothstep(0.0,0.18,regionEdge);\n#include <opaque_fragment>');
      };
      terrain=new THREE.Mesh(geo,terrainMaterial);scene.add(terrain);
      // Rasterise our own bounded vector map. No OSM raster server is used;
      // canvas clipping also prevents long OSM ways floating beyond the tile.
      const mapCanvas=document.createElement('canvas');mapCanvas.width=mapCanvas.height=1024;
      const mapContext=mapCanvas.getContext('2d');mapContext.fillStyle='#c6cfb9';mapContext.fillRect(0,0,1024,1024);
      const ordered=response[1].elements.slice().sort((a,b)=>Number(!!a.tags.highway)-Number(!!b.tags.highway));
      for(const way of ordered){
        if(way.geometry.length<2)continue;mapContext.beginPath();
        way.geometry.forEach((p,i)=>{const x=(p.lon-west)/(east-west)*1024,y=(north-p.lat)/(north-south)*1024;i?mapContext.lineTo(x,y):mapContext.moveTo(x,y);});
        if(!way.tags.highway){mapContext.fillStyle=way.tags.natural==='water'?'#6b9fad':way.tags.landuse==='residential'?'#d8d5c9':way.tags.landuse==='farmland'?'#b8c59c':'#91ac8d';mapContext.fill();}
        else{mapContext.strokeStyle='#8b958b';mapContext.lineWidth=way.tags.highway==='trunk'?5:3;mapContext.stroke();mapContext.strokeStyle='#f1e8d1';mapContext.lineWidth=way.tags.highway==='trunk'?3:1.5;mapContext.stroke();}
      }
      mapContext.font='500 30px sans-serif';mapContext.textAlign='center';mapContext.fillStyle='#294d5a';
      mapContext.fillText('оз. Копа',(69.344-west)/(east-west)*1024,(north-53.309)/(north-south)*1024);
      mapContext.font='500 32px sans-serif';mapContext.fillStyle='#34434a';
      mapContext.fillText('Кокшетау',(69.397-west)/(east-west)*1024,(north-53.283)/(north-south)*1024);
      const mapTexture=new THREE.CanvasTexture(mapCanvas);mapTexture.colorSpace=THREE.SRGBColorSpace;terrain.material.map=mapTexture;terrain.material.needsUpdate=true;
      for(let i=0;i<fields.length;i++){
        const f=fields[i],pts=[],corners=[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]];
        for(let side=0;side<4;side++)for(let step=0;step<32;step++){
          const t=step/32,x=f.x+THREE.MathUtils.lerp(corners[side][0],corners[side+1][0],t)*f.w/2,z=f.z+THREE.MathUtils.lerp(corners[side][1],corners[side+1][1],t)*f.d/2;
          pts.push(new THREE.Vector3(x,h(x,z)+.0015,z));
        }pts.push(pts[0].clone());
        const outline=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x345762}));scene.add(outline);outlines.push(outline);
        const label=document.createElement('canvas');label.width=label.height=128;const ctx=label.getContext('2d');ctx.fillStyle='#f7fafb';ctx.fillRect(12,12,104,104);ctx.fillStyle='#243640';ctx.font='64px sans-serif';ctx.textAlign='center';ctx.fillText(f.name,64,86);
        const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(label),depthTest:false,depthWrite:false,transparent:true,toneMapped:false,sizeAttenuation:false}));sprite.renderOrder=100; sprite.position.set(f.x,h(f.x,f.z)+.02,f.z);scene.add(sprite);labels.push(sprite);
      }
      voxels=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({transparent:true,opacity:.62}),576);voxels.frustumCulled=false;voxels.visible=false;scene.add(voxels);
      const beamGeometry=new THREE.BufferGeometry();beamGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(54),3));
      scan=new THREE.Mesh(beamGeometry,new THREE.MeshBasicMaterial({color:0x77c3ce,transparent:true,opacity:.19,side:THREE.DoubleSide,depthWrite:false}));scan.frustumCulled=false;scene.add(scan);
      routeLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0xe6f0e5,dashSize:.035,gapSize:.015}));scene.add(routeLine);
      const content=template.clone(true);content.updateMatrixWorld(true);const center=new THREE.Box3().setFromObject(content).getCenter(new THREE.Vector3());content.position.sub(center);
      content.traverse(node=>{
        let ancestor=node;while(ancestor&&!ancestor.userData.component)ancestor=ancestor.parent;
        if(ancestor&&['tank','spray'].includes(ancestor.userData.component))node.visible=false;
        if(node.userData.animation_role==='propeller_spin')rotors.push({node,initial:node.quaternion.clone()});
      });
      aircraft=new THREE.Group();aircraft.add(content);aircraft.scale.setScalar(.006);aircraft.visible=false;scene.add(aircraft);
      aircraftRadius=new THREE.Box3().setFromObject(aircraft).getSize(new THREE.Vector3()).length()/2;
      canvas.addEventListener('pointerup',event=>{
        if(state!=='overview')return;const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2);raycaster.setFromCamera(pointer,camera);
        const hit=raycaster.intersectObject(terrain)[0];if(!hit)return;
        const index=fields.findIndex(f=>Math.abs(hit.point.x-f.x)<f.w/2&&Math.abs(hit.point.z-f.z)<f.d/2);if(index>=0)select(index);
      });
      ready=true;for(const b of wrap.querySelectorAll('[data-field]'))b.disabled=false;wrap.dataset.ready='true';resize();overview();
    }catch(error){failed=true;status.textContent='3D-карта недоступна. Услуги и форма работают; попробуйте обновить страницу.';wrap.dataset.state='error';}
  }
  function render(time){
    frame=0;if(!host||document.hidden||!observed||!ready){previous=0;return;}
    const dt=previous?Math.min((time-previous)/1000,.1):0;previous=time;clock+=dt;
    const f=fields[selected];let progress=0;
    if(selected>=0){
      missionTime+=dt;
      progress=state==='result'?1:Math.min(1,Math.max(0,(missionTime-3.2)/16));
      if(state==='approach'&&missionTime>=3.2){state='flight';status.textContent=`Участок ${f.name}: маршрут облёта`;}
      if(state==='flight'&&missionTime>=19.2){state='result';status.textContent=`Участок ${f.name}: покрытие маршрута.`;}
      dronePoint.copy(path.getPointAt(progress));const tangent=path.getTangentAt(Math.min(.999,progress));
      if(state==='approach'){
        const t=THREE.MathUtils.smoothstep(missionTime/3.2,0,1);
        dronePoint.lerp(new THREE.Vector3(-2.05,h(-2,f.z)+.06,f.z+.08),1-t);
      }
      aircraft.position.copy(dronePoint);
      const targetYaw=Math.atan2(tangent.x,tangent.z),deltaYaw=Math.atan2(Math.sin(targetYaw-aircraft.rotation.y),Math.cos(targetYaw-aircraft.rotation.y));
      aircraft.rotation.y+=deltaYaw*(reduced.matches?1:1-Math.exp(-dt*7));aircraft.rotation.x=state==='flight'?.06:0;aircraft.rotation.z=state==='flight'?THREE.MathUtils.clamp(-deltaYaw*.14,-.12,.12):0;aircraft.visible=state!=='result';
      if(!reduced.matches)for(const rotor of rotors){q.setFromAxisAngle(axis,clock*58);rotor.node.quaternion.copy(rotor.initial).multiply(q);}
      scan.visible=state==='flight';if(scan.visible){updateBeam();markCoverage(progress);}
      else if(state==='result')markCoverage(1);
      voxels.visible=state!=='approach';routeLine.visible=true;updateVoxels();
      if(state==='result'){
        const controls=wrap.querySelector('.navigation-controls').offsetHeight;
        const distance=Math.max(f.w/camera.aspect,f.d*.87*viewportH/Math.max(160,viewportH-controls-50))*1.18/(2*Math.tan(THREE.MathUtils.degToRad(21)));
        cameraTarget.set(f.x,h(f.x,f.z)+distance*.87,f.z+distance*.5);lookTarget.set(f.x,h(f.x,f.z),f.z);
      }
      else{cameraTarget.copy(dronePoint).addScaledVector(tangent,-.14);cameraTarget.y+=.062;lookTarget.copy(dronePoint);lookTarget.y-=.014;
        if(state==='approach'){const t=THREE.MathUtils.smoothstep(missionTime/3.2,0,1);cameraTarget.lerp(overviewPosition(),1-t);lookTarget.lerp(new THREE.Vector3(0,-.13,0),1-t);}
      }
    }else{cameraTarget.copy(overviewPosition());lookTarget.set(0,-.13,0);voxels.visible=false;scan.visible=false;routeLine.visible=false;}
    labels.forEach(label=>label.visible=state==='overview');
    const controlHeight=wrap.querySelector('.navigation-controls').offsetHeight;
    const offset=state==='flight'||state==='approach'?-(controlHeight+60)/2:controlHeight/2;
    if(offset!==lastViewOffset){camera.setViewOffset(viewportW,viewportH,0,offset,viewportW,viewportH);camera.updateProjectionMatrix();lastViewOffset=offset;}
    const alpha=reduced.matches?1:1-Math.exp(-dt*4);camera.position.lerp(cameraTarget,alpha);displayLook.lerp(lookTarget,alpha);camera.lookAt(displayLook);
    if(state==='flight')containScan();
    renderer.render(scene,camera);wrap.dataset.state=state;wrap.dataset.progress=progress.toFixed(3);
    const unsettled=camera.position.distanceTo(cameraTarget)>.002;
    if(!reduced.matches&&(state==='flight'||state==='approach'||unsettled))request();else previous=0;
  }
  wrap.querySelectorAll('[data-field]').forEach(button=>button.addEventListener('click',()=>select(+button.dataset.field)));
  back.addEventListener('click',overview);
  reduced.addEventListener('change',()=>{if(selected>=0&&reduced.matches)select(selected);request();});
  document.addEventListener('visibilitychange',()=>document.hidden?stop():request());
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();stop();ready=false;status.textContent='3D-карта потеряла соединение с видеокартой. Обновите страницу.';});
  return {show(element){
    if(host===element)return;stop();if(host){resizeObserver.unobserve(host);host.removeAttribute('data-navigation');host.setAttribute('role',host.classList.contains('machine-airspace')?'group':'img');}
    host=element;wrap.hidden=!host;
    if(host){host.append(wrap);host.dataset.navigation='true';host.setAttribute('role','group');resizeObserver.observe(host);init();resize();request();}
  }};
}
