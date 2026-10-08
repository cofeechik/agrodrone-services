import * as THREE from 'three';

// A deliberately schematic field, not a survey, satellite image or LiDAR claim.
// Geometry explains coverage and a route; no generated photography is used.
export function createFieldStudy() {
  const group = new THREE.Group(); group.name = 'Illustrative field and route';
  group.position.y = -1.02;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 2.8), new THREE.MeshBasicMaterial({color:0xc6d0bf, side:THREE.DoubleSide}));
  ground.rotation.x = -Math.PI / 2; group.add(ground);
  const rows = new THREE.InstancedMesh(new THREE.BoxGeometry(4.12,.008,.023), new THREE.MeshBasicMaterial({color:0x99ad8f}), 48);
  const matrix = new THREE.Matrix4();
  for(let i=0;i<48;i++){ matrix.makeTranslation(0,.006,-1.33+i*.056); rows.setMatrixAt(i,matrix); }
  group.add(rows);
  const boundary = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-2.15,.013,-1.4),new THREE.Vector3(2.15,.013,-1.4),new THREE.Vector3(2.15,.013,1.4),new THREE.Vector3(-2.15,.013,1.4),new THREE.Vector3(-2.15,.013,-1.4)
  ]), new THREE.LineBasicMaterial({color:0x6e8267})); group.add(boundary);
  const routePoints=[];
  for(let i=0;i<4;i++){
    const z=-.95+i*.62;const a=i%2?1.65:-1.65,b=-a;
    routePoints.push(new THREE.Vector3(a,.019,z),new THREE.Vector3(b,.019,z));
  }
  const route=new THREE.Line(new THREE.BufferGeometry().setFromPoints(routePoints),new THREE.LineDashedMaterial({color:0x526b78,dashSize:.10,gapSize:.055}));
  route.computeLineDistances();group.add(route);
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(.5,2.7), new THREE.MeshBasicMaterial({color:0x507f91,transparent:true,opacity:.25,depthWrite:false,side:THREE.DoubleSide}));
  scan.rotation.x=-Math.PI/2;scan.position.y=.024;group.add(scan);
  const coverage=new THREE.Mesh(new THREE.PlaneGeometry(4.1,2.7),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{progress:{value:.5}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec2 v;uniform float progress;void main(){float covered=1.0-smoothstep(progress-.01,progress+.01,v.x);gl_FragColor=vec4(.30,.49,.55,covered*.16);}' }));
  coverage.rotation.x=-Math.PI/2;coverage.position.y=.021;group.add(coverage);
  group.visible=false;
  return {group, update(time,reduced){
    const progress=reduced?.55:(Math.sin(time*.42)+1)*.5;
    const drift=(-.5+progress)*.84;
    scan.position.x=drift;
    coverage.material.uniforms.progress.value=(drift+2.05)/4.1;
    return drift;
  }};
}

export function createApplicationParticles(kind, emitters) {
  const count=kind==='spray'?220:110;
  const positions=new Float32Array(count*3), seeds=[];
  for(let i=0;i<count;i++)seeds.push({age:(i*.61803398875)%1,a:i*2.39996,r:.12+(i%13)/13});
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const points=new THREE.Points(geometry,new THREE.PointsMaterial({color:kind==='spray'?0x7397a4:0xa18c53,size:kind==='spray'?.015:.021,transparent:true,opacity:kind==='spray'?.35:.68,depthWrite:false,sizeAttenuation:true}));
  points.frustumCulled=false;points.visible=false;
  return {points,update(time,reduced){
    for(let i=0;i<count;i++){
      const seed=seeds[i],age=reduced?seed.age:(seed.age+time*(kind==='spray'?.8:1.15))%1;
      const origin=emitters[i%emitters.length];const radius=age*(kind==='spray'?.34:.55)*seed.r;
      positions[i*3]=origin.x+Math.cos(seed.a)*radius;
      positions[i*3+1]=origin.y-age*.62;
      positions[i*3+2]=origin.z+Math.sin(seed.a)*radius;
    }
    geometry.attributes.position.needsUpdate=true;
  }};
}
