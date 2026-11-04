import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, simplify, prune, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { stat } from 'node:fs/promises';

await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const input = new URL('../public/models/iphone-17-pro-max.glb', import.meta.url);
for (const profile of [
  { name: 'web', ratio: 0.4, error: 0.001 },
  { name: 'orbit', ratio: 1, error: 0 },
]) {
const output = new URL(`../public/models/iphone-17-pro-max-${profile.name}.glb`, import.meta.url);
const document = await io.read(input.pathname);
const triangles = () => document.getRoot().listMeshes().reduce((count, mesh) =>
  count + mesh.listPrimitives().reduce((sum, p) => sum + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0);
const before = triangles();
// Portfolio screenshots replace this wallpaper; do not download or decode it.
document.getRoot().listMaterials().find(m => m.getName() === 'screen.001')?.setBaseColorTexture(null);
await document.transform(dedup(), weld());
if (profile.ratio < 1) await document.transform(simplify({ simplifier: MeshoptSimplifier, ratio: profile.ratio, error: profile.error }));
await document.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium', ...(profile.name === 'orbit' ? { quantizePosition: 16, quantizeNormal: 14, quantizeTexcoord: 14 } : {}) }));
await io.write(output.pathname, document);
console.log(JSON.stringify({ profile: profile.name, originalBytes: (await stat(input)).size, webBytes: (await stat(output)).size, originalTriangles: before, webTriangles: triangles() }));
}
