import * as THREE from 'three';

// Visible exterior and antenna-array reconstruction: user PDF slide 10,
// PDF page 11. Patch layout/proportions are inferred, not factory circuitry.
export function refineNavigationHardware(content){
  const old=[];content.traverse(n=>{if(n.userData.component==='navigation')old.push(n);});
  for(const node of old)node.removeFromParent();
  const group=new THREE.Group();group.name='Navigation | photo-led radar and antennae';group.userData.component='navigation';content.add(group);
  const black=new THREE.MeshStandardMaterial({color:0x22272b,roughness:.38,metalness:.18});
  const metal=new THREE.MeshStandardMaterial({color:0x8c979e,roughness:.32,metalness:.85});
  const board=new THREE.MeshStandardMaterial({color:0x243139,roughness:.58,metalness:.18});
  const gold=new THREE.MeshStandardMaterial({color:0xb99a54,roughness:.37,metalness:.72});
  function add(name,geometry,material,x,y,z){const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(x,y,z);m.userData.component='navigation';group.add(m);return m;}
  function box(name,w,h,d,mat,x,y,z){return add(name,new THREE.BoxGeometry(w,h,d),mat,x,y,z);}
  for(const s of [-1,1]){
    add('Positioning antenna',new THREE.CylinderGeometry(.018,.021,.161,32),black,s*.201,.66275,.10);
    add('Antenna mounting collar',new THREE.CylinderGeometry(.027,.027,.024,32),metal,s*.201,.58975,.10);
    add('Antenna cap',new THREE.SphereGeometry(.018,24,12,0,Math.PI*2,0,Math.PI/2),black,s*.201,.74325,.10);
  }
  const y=.52975,z=.31;
  box('Radar rear housing',.246,.082,.023,black,0,y,z-.025);
  box('Radar antenna substrate',.226,.069,.003,board,0,y,z+.008);
  box('Radar upper seal',.247,.005,.047,black,0,y+.043,z);
  box('Radar lower seal',.247,.005,.047,black,0,y-.043,z);
  for(const s of [-1,1]){
    const end=add('Radar rounded end cap',new THREE.CylinderGeometry(.043,.043,.047,32),black,s*.124,y,z);end.rotation.x=Math.PI/2;
    box('Radar mounting bracket',.025,.018,.071,metal,s*.079,y-.012,z-.038);
    for(const dy of [-.035,.035]){const screw=add('Radar face screw',new THREE.CylinderGeometry(.0026,.0026,.003,12),metal,s*.113,y+dy,z+.027);screw.rotation.x=Math.PI/2;}
  }
  // The reference shows gold antenna patches, not exposed processor chips.
  const patches=[],normals=[];
  for(let row=0;row<7;row++)for(let col=0;col<25;col++){
    const x=(col-12)*.00835,py=(row-3)*.0081,w=(col%3===0?.0035:.0026)/2,h=.00225;
    for(const [dx,dy]of[[-w,-h],[w,-h],[w,h],[-w,-h],[w,h],[-w,h]]){patches.push(x+dx,py+dy,0);normals.push(0,0,1);}
  }
  const patchGeometry=new THREE.BufferGeometry();patchGeometry.setAttribute('position',new THREE.Float32BufferAttribute(patches,3));patchGeometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  add('Radar antenna array — 175 visible patches',patchGeometry,gold,0,y,z+.010);
  for(const s of [-1,1]){
    const shell=black.clone();shell.transparent=true;
    const cover=box(s<0?'Radar opaque half':'Radar inspection half',.119,.079,.003,shell,s*.06,y,z+.028);
    if(s>0)cover.userData.inspectionCover=true;
  }
  return group;
}
