import * as THREE from 'three';

// A photographic light rig, used for reflections only. No downloaded HDRI,
// borrowed model, decorative floor or runtime dependency beyond Three.js.
export function createStudioEnvironment(renderer) {
  const studio = new THREE.Scene();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const room = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x535962, side: THREE.BackSide }));
  room.scale.set(24, 20, 24);
  studio.add(room);
  const panels = [
    { position: [-5, 6, 4], size: [4, 5, .08], intensity: 7.5, color: 0xfff9ef },
    { position: [6, 3, 2], size: [.08, 5, 7], intensity: 4, color: 0xecf2ff },
    { position: [0, 8, -1], size: [7, .08, 5], intensity: 5, color: 0xffffff },
    { position: [-3, 2, -7], size: [5, 4, .08], intensity: 5, color: 0xf0f5ff },
  ];
  for (const panel of panels) {
    const material = new THREE.MeshBasicMaterial({ color: panel.color });
    material.color.multiplyScalar(panel.intensity);
    const light = new THREE.Mesh(geometry, material);
    light.position.fromArray(panel.position);
    light.scale.fromArray(panel.size);
    light.lookAt(0, 0, 0);
    // Vertical side softbox uses local X as its thin dimension.
    if (panel.size[0] < .1) light.rotateY(Math.PI / 2);
    if (panel.size[1] < .1) light.rotateX(Math.PI / 2);
    studio.add(light);
  }
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromScene(studio, .04, .1, 40);
  generator.dispose();
  geometry.dispose();
  studio.traverse(node => { if (node.material) node.material.dispose(); });
  return target;
}

export function tuneSurface(material) {
  // The export already contains measured geometry and local occlusion colors.
  // Keep factory markings and glass; change only the presentation response.
  material.envMapIntensity = .85;
  material.side = THREE.FrontSide;
  material.forceSinglePass = true;
  if (/Carbon composite blades/.test(material.name)) {
    // Blender's procedural anisotropy has no tangent/UV basis in this export.
    // Disable that extension instead of accepting a white specular artefact.
    material.anisotropy = 0;
    material.roughness = .58;
    material.metalness = .02;
    material.specularIntensity = .35;
    material.envMapIntensity = .5;
  }
  if (/Molded HDPE tank|Tank relief lettering/.test(material.name)) {
    material.roughness = .46;
    material.metalness = 0;
  }
  if (/Rubber feet and grips/.test(material.name)) {
    material.roughness = .78;
    material.metalness = 0;
  }
}
