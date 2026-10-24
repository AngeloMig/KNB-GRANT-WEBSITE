// Password-protects the private quote builder (docs/quote/) after the GitHub Pages build.
//
// GitHub Pages can't check passwords, so the page is encrypted instead: the published file holds the
// page as AES-GCM ciphertext plus a small unlock form. The right password decrypts it in the browser.
// Without it, nobody can see or use the page (or find which script files it loads).
//
// The password comes from QUOTE_PASSWORD in the environment or in the git-ignored .env file.
// If it isn't set, the page is replaced with a locked placeholder so nothing is ever published unprotected.
import { readFile, writeFile } from 'node:fs/promises';
import { webcrypto as crypto } from 'node:crypto';

const ITERATIONS = 310000;
// A fixed, site-specific salt keeps a remembered unlock valid across rebuilds with the same password.
const SALT_TEXT = 'knb-grant-website/quote/v1';

async function readPassword(root) {
  if (process.env.QUOTE_PASSWORD) return process.env.QUOTE_PASSWORD;
  try {
    const env = await readFile(new URL('.env', root), 'utf8');
    const line = env.split(/\r?\n/).find((l) => /^\s*QUOTE_PASSWORD\s*=/.test(l));
    return line ? line.replace(/^\s*QUOTE_PASSWORD\s*=\s*/, '').replace(/^["']|["']$/g, '').trim() : '';
  } catch {
    return '';
  }
}

const b64 = (bytes) => Buffer.from(bytes).toString('base64');

async function encrypt(html, password) {
  const salt = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SALT_TEXT))).slice(0, 16);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(html)));
  return { salt: b64(salt), iv: b64(iv), data: b64(data), iterations: ITERATIONS };
}

const STYLE = `
@font-face{font-family:Archivo;src:url("../fonts/archivo-latin-variable.woff2") format("woff2");font-weight:100 900;font-display:swap}
@font-face{font-family:"Big Shoulders Display";src:url("../fonts/big-shoulders-display-latin-800.woff2") format("woff2");font-weight:800;font-display:swap}
:root{--ink:#161616;--muted:#707070;--line:#d6d6d6;--bg:#fff;--warn:#c42026}
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--ink);font:15px/1.5 Archivo,system-ui,-apple-system,"Segoe UI",sans-serif}
main{width:min(420px,100%)}
p.k{margin:0;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
h1{margin:8px 0 6px;font:800 44px/0.95 "Big Shoulders Display",Impact,sans-serif;letter-spacing:-.01em;text-transform:uppercase}
p.s{margin:0 0 24px;color:var(--muted)}
label.f{display:grid;gap:6px;font-size:12px;font-weight:600;color:var(--muted)}
.w{position:relative;margin-top:6px}
.w input{width:100%;padding:12px 64px 12px 14px;border:1px solid var(--line);border-radius:12px;font:inherit;color:var(--ink);background:var(--bg)}
.w input:focus{outline:2px solid var(--ink);outline-offset:-1px}
.w button{position:absolute;top:6px;right:6px;bottom:6px;width:auto;padding:0 12px;border-radius:8px;background:transparent;color:var(--muted);font-size:13px;font-weight:600}
.w button:hover{color:var(--ink)}
#c{margin:6px 0 0;font-size:13px;color:var(--warn)}
label.r{display:flex;align-items:center;gap:8px;margin:14px 0 18px;font-size:14px;cursor:pointer}
label.r input{width:16px;height:16px;accent-color:var(--ink)}
button{width:100%;padding:14px 20px;border:0;border-radius:999px;background:var(--ink);color:var(--bg);font:500 15px Archivo,system-ui,sans-serif;cursor:pointer}
button:disabled{opacity:.5;cursor:wait}
#e{min-height:1.5em;margin:12px 0 0;font-size:14px;color:var(--warn)}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--ink:#f2f2f2;--muted:#a0a0a0;--line:#3a3a3a;--bg:#111}}
`;

function gatePage(payload) {
  const unlock = payload
    ? `<form id="g"><label class="f" for="p">Password</label>
<div class="w"><input type="password" id="p" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" required autofocus><button type="button" id="t" aria-controls="p" aria-pressed="false">Show</button></div>
<p id="c" hidden>Caps Lock is on.</p>
<label class="r"><input type="checkbox" id="m">Remember on this device</label>
<button type="submit" id="b">Unlock</button><p id="e" role="alert"></p></form>`
    : '<p class="s">This page is locked.</p>';
  const script = payload ? `<script>
(() => {
  const D = ${JSON.stringify(payload)};
  const KEY = 'quote-unlock-v1';
  const bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const show = async (key) => {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(D.iv) }, key, bytes(D.data));
    const html = new TextDecoder().decode(plain);
    document.open(); document.write(html); document.close();
  };
  const derive = async (password) => {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytes(D.salt), iterations: D.iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
  };
  // Remembered unlock on this device
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  if (saved) {
    crypto.subtle.importKey('raw', bytes(saved), 'AES-GCM', false, ['decrypt']).then(show).catch(() => { try { localStorage.removeItem(KEY); } catch {} });
  }
  const form = document.getElementById('g');
  const input = document.getElementById('p');
  const toggle = document.getElementById('t');
  // Show what was typed (or autofilled), so a wrong saved password is easy to spot
  toggle.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.textContent = show ? 'Hide' : 'Show';
    toggle.setAttribute('aria-pressed', String(show));
    input.focus();
  });
  const caps = (event) => { if (event.getModifierState) document.getElementById('c').hidden = !event.getModifierState('CapsLock'); };
  input.addEventListener('keydown', caps);
  input.addEventListener('keyup', caps);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = document.getElementById('b');
    const error = document.getElementById('e');
    button.disabled = true; button.textContent = 'Unlocking…'; error.textContent = '';
    try {
      // The build trims the saved password, so spaces around the typed one are never part of it
      const key = await derive(input.value.trim());
      if (document.getElementById('m').checked) {
        const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
        try { localStorage.setItem(KEY, btoa(String.fromCharCode(...raw))); } catch {}
      }
      await show(key);
    } catch {
      error.textContent = 'That password isn’t right.';
      button.disabled = false; button.textContent = 'Unlock';
      input.select();
    }
  });
})();
</script>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Private | Grant Dev14</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<p class="k">Private tool</p>
<h1>Quotation builder</h1>
${payload ? '<p class="s">Enter the password to open it.</p>' : ''}
${unlock}
</main>
${script}
</body>
</html>
`;
}

/** Encrypts docs/quote/index.html in place. Returns 'protected', 'locked' (no password) or 'missing'. */
export async function protectQuote(root) {
  const file = new URL('docs/quote/index.html', root);
  let html;
  try { html = await readFile(file, 'utf8'); } catch { return 'missing'; }
  const password = await readPassword(root);
  if (!password) {
    await writeFile(file, gatePage(null));
    return 'locked';
  }
  await writeFile(file, gatePage(await encrypt(html, password)));
  return 'protected';
}
