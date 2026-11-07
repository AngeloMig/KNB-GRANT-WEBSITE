// Full-page homepage screenshots for each project page's "More of the site" gallery, and each site's
// colour palette (read from the same screenshot). Sources: tmp/fullpage-captures/<slug>-desktop.png
// (1440 wide) and <slug>-mobile.png (390 wide at 2x). Writes public/images/projects/full/ and
// src/data/project-fullpages.json. Pass slugs to redo only those projects.
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../tmp/fullpage-captures/', import.meta.url));
const output = fileURLToPath(new URL('../public/images/projects/full/', import.meta.url));
const dataFile = fileURLToPath(new URL('../src/data/project-fullpages.json', import.meta.url));
const allSlugs = ['tero', 'road-armor', 'omenz', 'coptrz', 'skinistry', 'light-my-bricks', 'monsera', 'narrative-hub', 'teamtown', 'financial-advisor-uk', 'all-terrain-industries'];
const slugs = process.argv.length > 2 ? process.argv.slice(2) : allSlugs;
const desktopWidths = [720, 1100];
const mobileWidths = [600];

const hex = (r, g, b) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

// The colours that cover most of the page, merged so near-identical shades count as one, and spread
// apart so the palette shows distinct colours (with each one's share of the page).
async function palette(file) {
  const { data, info } = await sharp(file).resize({ width: 240 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bins = new Map();
  for (let i = 0; i < data.length; i += 3) {
    const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    const bin = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    bin.n++; bin.r += data[i]; bin.g += data[i + 1]; bin.b += data[i + 2];
    bins.set(key, bin);
  }
  const total = info.width * info.height;
  const colours = [...bins.values()].map((b) => ({ n: b.n, r: Math.round(b.r / b.n), g: Math.round(b.g / b.n), b: Math.round(b.b / b.n) })).sort((a, b) => b.n - a.n);
  const picked = [];
  const near = (a, b, d) => (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2 < d * d;
  for (const c of colours) {
    const twin = picked.find((p) => near(p, c, 56));
    if (twin) { twin.n += c.n; continue; }
    if (picked.length < 6) picked.push({ ...c });
  }
  return picked.filter((c) => c.n / total >= 0.004).sort((a, b) => b.n - a.n).slice(0, 6)
    .map((c) => ({ hex: hex(c.r, c.g, c.b), share: +(c.n / total).toFixed(3) }));
}

await mkdir(output, { recursive: true });
const data = await readFile(dataFile, 'utf8').then(JSON.parse).catch(() => ({}));
for (const slug of slugs) {
  const entry = { desktop: {}, mobile: {}, palette: [] };
  for (const [kind, widths, quality] of [['desktop', desktopWidths, 76], ['mobile', mobileWidths, 74]]) {
    const file = `${source}${slug}-${kind}.png`;
    for (const width of widths) {
      const out = `${output}${slug}-${kind}-${width}.webp`;
      await sharp(file).resize({ width, withoutEnlargement: true }).webp({ quality, effort: 6 }).toFile(out);
      const meta = await sharp(out).metadata();
      entry[kind][width] = meta.height;
    }
  }
  entry.palette = await palette(`${source}${slug}-desktop.png`);
  data[slug] = entry;
  console.log(`Prepared ${slug}: ${entry.palette.map((c) => c.hex).join(' ')}`);
}
await writeFile(dataFile, `${JSON.stringify(data, null, 2)}\n`);
