import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

export type PhoneFinish = 'silver' | 'cosmic-orange' | 'deep-blue';
// Approximate the three Apple finishes under this scene's studio lighting.
const finishes: Record<PhoneFinish, { body: string; back: string; frame: string; detail: string }> = {
  silver: { body: '#cdd1d5', back: '#dce0e3', frame: '#abb3bb', detail: '#a4adb7' },
  'cosmic-orange': { body: '#dc7b42', back: '#e38b57', frame: '#c46d38', detail: '#c17545' },
  'deep-blue': { body: '#283b56', back: '#344862', frame: '#1f3049', detail: '#52647e' },
};

/** Load the supplied geometry once; instances share geometry and camera textures. */
export async function loadIPhoneModels(url: string, mobile = false, count = 2) {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
  gltf.scene.updateMatrixWorld(true);
  const model = new THREE.Group();
  model.name = "iPhone 17 Pro Max — MajdyModels";
  // In this asset, the display faces -X. Bake the authored transforms, then face +Z.
  const orientation = new THREE.Matrix4().makeRotationY(Math.PI / 2);
  const discardedTextures = new Set<THREE.Texture>();
  let screenAspect = 512 / 1110;
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry.clone();
    // Quantized attributes must be expanded before baking the authored transforms.
    for (const name of ["position", "normal"]) {
      const attribute = geometry.getAttribute(name);
      if (!attribute) continue;
      const values = new Float32Array(attribute.count * 3);
      for (let i = 0; i < attribute.count; i++) {
        values[i * 3] = attribute.getX(i);
        values[i * 3 + 1] = attribute.getY(i);
        values[i * 3 + 2] = attribute.getZ(i);
      }
      geometry.setAttribute(name, new THREE.BufferAttribute(values, 3));
    }
    geometry.applyMatrix4(object.matrixWorld).applyMatrix4(orientation);
    const original = Array.isArray(object.material)
      ? object.material
      : [object.material];
    const screen = original.some((material) => material.name === "screen.001");
    // The screen itself supplies the glass appearance at phone size; omit the
    // extra reflective overlay on mobile so project text stays clear.
    if (mobile && original.some(material => material.name === 'glass.002')) return;
    let materials: THREE.Material[];
    if (screen) {
      // Project a new screen UV into the existing display surface; retain its cutouts.
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox!;
      screenAspect = (bounds.max.x - bounds.min.x) / (bounds.max.y - bounds.min.y);
      const positions = geometry.getAttribute("position");
      const uv = new Float32Array(positions.count * 2);
      for (let i = 0; i < positions.count; i++) {
        uv[i * 2] =
          (positions.getX(i) - bounds.min.x) / (bounds.max.x - bounds.min.x);
        uv[i * 2 + 1] =
          (positions.getY(i) - bounds.min.y) / (bounds.max.y - bounds.min.y);
      }
      geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      materials = [
        new THREE.MeshBasicMaterial({
          color: "#ffffff",
          toneMapped: false,
          side: THREE.DoubleSide,
        }),
      ];
      original.forEach((material) => {
        const map = (material as THREE.MeshStandardMaterial).map;
        if (map) discardedTextures.add(map);
      });
    } else {
      materials = original.map((material) => {
        if (!mobile || !(material instanceof THREE.MeshStandardMaterial)) return material.clone();
        // Preserve the orange finish without mobile clearcoat / double-pass glass.
        const lightweight = new THREE.MeshStandardMaterial({
          color: material.color, map: material.map,
          roughness: material.roughness, metalness: material.metalness,
          roughnessMap: material.roughnessMap, metalnessMap: material.metalnessMap,
          normalMap: material.normalMap, normalScale: material.normalScale,
          transparent: material.transparent, opacity: material.opacity,
          depthWrite: !material.transparent, side: material.side,
        });
        lightweight.name = material.name;
        lightweight.forceSinglePass = true;
        return lightweight;
      });
    }
    const mesh = new THREE.Mesh(
      geometry,
      materials.length === 1 ? materials[0] : materials,
    );
    mesh.name = object.name;
    mesh.userData.projectScreen = screen;
    model.add(mesh);
  });
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.sub(center);
  const normalized = new THREE.Group();
  normalized.add(model);
  normalized.scale.setScalar(5.7 / size.y);
  discardedTextures.forEach((texture) => {
    texture.dispose();
    if (
      typeof ImageBitmap !== "undefined" &&
      texture.image instanceof ImageBitmap
    )
      texture.image.close();
  });

  return Array.from({ length: count }, () => {
    const group = normalized.clone(true);
    let material: THREE.MeshBasicMaterial | undefined;
    const bodyMaterials: THREE.MeshStandardMaterial[] = [];
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object.userData.projectScreen) {
        material = (object.material as THREE.MeshBasicMaterial).clone();
        object.material = material;
      } else {
        const originals = Array.isArray(object.material) ? object.material : [object.material];
        const copies = originals.map(m => m.clone());
        copies.forEach(m => { if (m instanceof THREE.MeshStandardMaterial) bodyMaterials.push(m); });
        object.material = copies.length === 1 ? copies[0] : copies;
      }
    });
    if (!material)
      throw new Error("The supplied iPhone model has no display surface.");
    const setFinish = (finish: PhoneFinish) => {
      const palette = finishes[finish];
      for (const material of bodyMaterials) {
        const color = material.name === 'backpanel.001' ? palette.back
          : material.name === 'metalframe.002' ? palette.frame
          : material.name === 'Material.005' || material.name === 'Material.006' ? palette.detail
          : material.name === 'basecolor.001' ? palette.body : undefined;
        if (color) material.color.set(color);
      }
    };
    return { group, material, setFinish, screenAspect };
  });
}
