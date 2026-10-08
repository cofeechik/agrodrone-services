const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const load=createRequire(path.resolve(process.argv[2],'package.json'));
const {NodeIO,getBounds}=load('@gltf-transform/core');
const {ALL_EXTENSIONS}=load('@gltf-transform/extensions');
const {MeshoptDecoder}=load('meshoptimizer');
const validator=load('gltf-validator');
(async()=>{
 await MeshoptDecoder.ready;
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
 const asset=path.join(__dirname,'xag-p150-max-v08-configurable-web.glb');
 const doc=await io.read(asset);
 const old=await io.read(path.join(__dirname,'../xag-p150-max/xag-p150-max-v07-web.glb'));
 const nodes=doc.getRoot().listNodes(), oldnodes=old.getRoot().listNodes();
 const components={};for(const n of nodes)if(n.getMesh()){const c=n.getExtras().component;components[c]=(components[c]||0)+1;}
 if(components.landing!==3||components.spray!==12||components.tank!==5||components.battery!==5||components.navigation!==2)throw Error('Wrong semantic counts '+JSON.stringify(components));
 const rotors=nodes.filter(n=>n.getExtras().animation_role==='propeller_spin');if(rotors.length!==4)throw Error('Lost rotors');
 const rotorChecks=rotors.map(n=>{
  const source=oldnodes.find(o=>o.getName()===n.getName().replace('v08 web |','v07 web |'));
  if(!source)throw Error('No source pivot');
  const delta=Math.max(...n.getWorldMatrix().map((v,i)=>Math.abs(v-source.getWorldMatrix()[i])));
  if(delta>1e-6||n.getExtras().spin_direction!==source.getExtras().spin_direction)throw Error('Rotor transform changed');
  return {node:n.getName(),worldMatrixMaxDelta:delta,direction:n.getExtras().spin_direction};
 });
 const bounds=getBounds(doc.getRoot().listScenes()[0]),oldBounds=getBounds(old.getRoot().listScenes()[0]);
 const boundsDelta=Math.max(...bounds.min.map((v,i)=>Math.abs(v-oldBounds.min[i])),...bounds.max.map((v,i)=>Math.abs(v-oldBounds.max[i])));if(boundsDelta>.001)throw Error('Envelope changed');
 let triangles=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())triangles+=(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3;
 const issues=(await validator.validateBytes(new Uint8Array(fs.readFileSync(asset)),{maxIssues:30})).issues;
 if(issues.numErrors||issues.numWarnings)throw Error(JSON.stringify(issues));
 const mounting=JSON.parse(fs.readFileSync(path.join(__dirname,'mounting.json'),'utf8'));
 for(const [relative,expected] of Object.entries(mounting.sources)){
  const actual=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',relative))).digest('hex');if(actual!==expected)throw Error('Original model changed');
 }
 const report={bytes:fs.statSync(asset).size,nodes:nodes.length,meshes:doc.getRoot().listMeshes().length,triangles,components,rotorChecks,originalEnvelopeMaxDeltaMeters:boundsDelta,validatorErrors:issues.numErrors,validatorWarnings:issues.numWarnings,validatorInfos:issues.messages,originalNativeHashesMatch:true,scope:'Decoded compressed glTF semantics, rotor pivots and original-aircraft envelope; not browser or physical mounting verification'};
 fs.writeFileSync(path.join(__dirname,'mounting-web-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
