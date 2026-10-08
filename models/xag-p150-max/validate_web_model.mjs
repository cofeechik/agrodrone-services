// Read-only QA of the compressed handoff: decode, bounds, hierarchy, rotor axes.
// Usage: node validate_web_model.mjs path/to/local/gltf-transform-installation
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const out=dirname(fileURLToPath(import.meta.url));
const revision=process.argv[3] || 'v03';
assert(['v03','v04','v05','v06','v07'].includes(revision),'Supported revisions: v03–v07');
const require=createRequire(resolve(process.argv[2], 'package.json'));
const load=async name=>import(pathToFileURL(require.resolve(name)).href);
const { NodeIO }=await load('@gltf-transform/core');
const { ALL_EXTENSIONS }=await load('@gltf-transform/extensions');
const { MeshoptDecoder }=await load('meshoptimizer');
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const doc=await io.read(resolve(out,`xag-p150-max-${revision}-web.glb`));
const manifest=JSON.parse(readFileSync(resolve(out,revision==='v03'?'web-model-manifest.json':`web-model-manifest-${revision}.json`),'utf8').replace(/^\uFEFF/,''));
const validation=JSON.parse(readFileSync(resolve(out,`validation-${revision}.json`),'utf8').replace(/^\uFEFF/,''));
const nodes=doc.getRoot().listNodes();
assert.equal(doc.getRoot().listScenes().length,1,'Export must contain only the web scene.');
assert(nodes.length<=(revision==='v07'?125:100),'Master or studio geometry leaked into web export.');
const triangleCount=doc.getRoot().listMeshes().reduce((sum,mesh)=>sum+mesh.listPrimitives().reduce((subtotal,primitive)=>{
    assert.equal(primitive.getMode(),4,'Expected triangle geometry.');
    return subtotal+(primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION').getCount())/3;
},0),0);
assert.equal(triangleCount,validation.master_triangles ?? validation.web_triangles,'Compression must not remove or duplicate triangles.');
if(revision!=='v03') {
    assert(nodes.some(n=>n.getExtras().component==='tank'));
    assert(nodes.some(n=>n.getExtras().component==='battery'));
    if(revision==='v07') for(const part of ['spray','navigation']) assert(nodes.some(n=>n.getExtras().component===part),'Missing assembly: '+part);
    for(const mesh of doc.getRoot().listMeshes()) for(const p of mesh.listPrimitives()) {
        assert(p.getAttribute('COLOR_0'),'Geometry-derived contact shading must survive compression.');
        assert(p.getAttribute('NORMAL'),'Split normals must survive compression.');
    }
}
assert(!nodes.some(n=>n.getCamera() || /Studio|Camera/.test(n.getName())));
const point=(m,v)=>[m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]];
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const multiply=(a,b)=>[
    a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
    a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
    a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
    a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const descendants=n=>n.listChildren().flatMap(child=>[child,...descendants(child)]);
const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
for (const node of nodes) {
    if (!node.getMesh()) continue;
    for (const primitive of node.getMesh().listPrimitives()) {
        const positions=primitive.getAttribute('POSITION');
        for(let i=0;i<positions.getCount();i++) {
            const v=point(node.getWorldMatrix(),positions.getElement(i,[]));
            v.forEach((x,j)=>{bounds.min[j]=Math.min(bounds.min[j],x);bounds.max[j]=Math.max(bounds.max[j],x);});
        }
    }
}
if(validation.height_mm) assert(Math.abs(bounds.max[1]-bounds.min[1]-validation.height_mm/1000)<.0005);
assert(bounds.max[1]-bounds.min[1]>.75 && bounds.max[1]-bounds.min[1]<.83,'Photographic scale must remain unchanged.');
const spinTests=[];
for(const spec of manifest.animation.rotors) {
    const rotor=nodes.find(n=>n.getName()===spec.node);
    assert(rotor, 'Missing pivot: '+spec.node);
    assert.equal(rotor.getExtras().animation_role,'propeller_spin');
    assert.equal(rotor.getExtras().spin_direction,spec.direction);
    const matrix=rotor.getWorldMatrix();
    const axis=[matrix[4],matrix[5],matrix[6]];
    const length=Math.hypot(...axis);
    assert(Math.abs(axis[1]/length)> .9999, 'Rotor Y axis is not vertical.');
    const centre=point(matrix,[0,0,0]);
    let tip=null;
    for(const node of descendants(rotor)) {
        if (!node.getMesh()) continue;
        for(const primitive of node.getMesh().listPrimitives()) {
            const positions=primitive.getAttribute('POSITION');
            for(let i=0;i<positions.getCount();i++) {
                const local=positions.getElement(i,[]);
                const world=point(node.getWorldMatrix(),local);
                const radius=distance(world,centre);
                if(!tip || radius>tip.radius) tip={node,local,world,radius};
            }
        }
    }
    assert(Math.abs(tip.radius-.8)<.002);
    const original=[...rotor.getRotation()];
    try {
        rotor.setRotation(multiply(original,[0,Math.SQRT1_2,0,Math.SQRT1_2]));
        const travel=distance(point(tip.node.getWorldMatrix(),tip.local),tip.world);
        assert(travel>1.12 && travel<1.15);
        spinTests.push({node:spec.node,axis:'local Y',tipTravelMm:Math.round(travel*1000)});
    } finally {rotor.setRotation(original);}
}
assert.equal(spinTests.length,4);
const rotorCentres=manifest.animation.rotors.map(spec=>point(nodes.find(n=>n.getName()===spec.node).getWorldMatrix(),[0,0,0]));
assert(Math.abs(Math.max(...rotorCentres.flatMap(a=>rotorCentres.map(b=>distance(a,b))))-2.335)<.0001);
console.log(JSON.stringify({status:'passed',nodes:nodes.length,meshes:doc.getRoot().listMeshes().length,
    triangles:triangleCount,
    heightMm:Math.round((bounds.max[1]-bounds.min[1])*1000000)/1000,
    rotorSpinTests:spinTests},null,2));
