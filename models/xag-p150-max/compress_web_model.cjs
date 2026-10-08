// Node dependency root is explicit; no global install or network call.
// node compress_web_model.cjs <dependency-root> <input.glb> <output.glb>
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const load = createRequire(path.resolve(process.argv[2], 'package.json'));
const { NodeIO } = load('@gltf-transform/core');
const { ALL_EXTENSIONS } = load('@gltf-transform/extensions');
const { weld, meshopt } = load('@gltf-transform/functions');
const { MeshoptEncoder } = load('meshoptimizer');
const validator = load('gltf-validator');
(async () => {
  await MeshoptEncoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const doc = await io.read(process.argv[3]);
  await doc.transform(weld(), meshopt({ encoder: MeshoptEncoder, level: 'high', quantizeNormal: 14 }));
  await io.write(process.argv[4], doc);
  const bytes = fs.readFileSync(process.argv[4]);
  const report = await validator.validateBytes(new Uint8Array(bytes), { maxIssues: 30 });
  const summary = { bytes: bytes.length, nodes: doc.getRoot().listNodes().length,
    meshes: doc.getRoot().listMeshes().length, issues: report.issues };
  console.log(JSON.stringify(summary, null, 2));
  if (report.issues.numErrors) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
