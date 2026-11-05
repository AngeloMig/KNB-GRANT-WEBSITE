import sharp from 'sharp';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../tmp/hd-captures/', import.meta.url));
const output = fileURLToPath(new URL('../public/images/projects/', import.meta.url));
const projects = ['tero', 'road-armor', 'omenz', 'coptrz', 'skinistry', 'light-my-bricks'];
const widths = [320, 480, 640, 960, 1275, 1440, 1920];
const mobileWidths = [220, 330, 440, 720];

// Reject undersized inputs rather than silently enlarging an old screenshot.
for (const slug of projects) {
  for (const [kind, minWidth, minHeight] of [['desktop', 1920, 1072], ['mobile', 720, 1564]]) {
    const info = await sharp(`${source}${slug}-${kind}.jpg`).metadata();
    if (info.width < minWidth || info.height < minHeight) throw new Error(`${slug} ${kind} source is below the required capture size.`);
  }
}
await mkdir(output, { recursive: true });
const manifest = { captured: '2026-11-05', method: 'Native browser captures, no enlargement', desktop: '1920 pixels wide; 1072–1080 pixels high', mobile: '720 × 1564', files: [] };
for (const slug of projects) {
  for (const [kind, variants] of [['desktop', widths], ['mobile', mobileWidths]]) {
    for (const width of variants) {
      const suffix = kind === 'mobile' ? `-mobile-${width}` : width === 1275 ? '' : `-${width}`;
      const filename = `${slug}${suffix}.webp`;
      await sharp(`${source}${slug}-${kind}.jpg`).resize({ width, withoutEnlargement: true })
        .webp({ quality: width >= 720 ? 90 : 86, effort: 6, smartSubsample: true }).toFile(`${output}${filename}`);
      const info = await sharp(`${output}${filename}`).metadata();
      manifest.files.push({ file: filename, width: info.width, height: info.height, bytes: (await stat(`${output}${filename}`)).size });
    }
  }
  console.log(`Prepared ${slug}`);
}
await writeFile(`${output}capture-manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared ${manifest.files.length} image variants.`);
