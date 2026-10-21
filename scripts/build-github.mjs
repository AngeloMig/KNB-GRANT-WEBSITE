import { spawnSync } from 'node:child_process';
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { protectQuote } from './protect-quote.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const repository = process.env.GITHUB_REPOSITORY || 'AngeloMig/KNB-GRANT-WEBSITE';
const result = spawnSync(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build'], {
  cwd: root,
  env: { ...process.env, GITHUB_PAGES: 'true', GITHUB_REPOSITORY: repository },
  stdio: 'inherit',
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);

await mkdir(new URL('../docs/', import.meta.url), { recursive: true });
// Replace generated website entries; preserve unrelated documentation.
const generated = new Set([
  ...await readdir(new URL('../dist-github/', import.meta.url)),
  '_astro', 'assets', '.nojekyll',
]);
for (const name of generated) {
  await rm(new URL(`../docs/${name}`, import.meta.url), { recursive: true, force: true });
}
await cp(new URL('../dist-github/', import.meta.url), new URL('../docs/', import.meta.url), { recursive: true });
await writeFile(new URL('../docs/.nojekyll', import.meta.url), '');

// The private quote builder is published encrypted (or locked if no password is set).
const quote = await protectQuote(new URL('../', import.meta.url));
if (quote === 'protected') console.log('Quote builder: password-protected (docs/quote/).');
if (quote === 'locked') console.warn('Quote builder: LOCKED. Add QUOTE_PASSWORD=... to .env and rebuild to enable it.');
console.log(`GitHub Pages files ready: docs/index.html (${repository})`);
