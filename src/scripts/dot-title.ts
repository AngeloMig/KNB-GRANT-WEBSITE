// Titles drawn in dots (the hero's dot type): ABOUT GRANT, LET'S TALK, ESTIMATE, each project's name,
// and SERVICES on the homepage. The dots fly in and slowly build the title: page titles as the page
// opens, section titles as they scroll into view. Coming from a link that left its position behind (a
// menu link, "Next project"), the dots start from where that link was, so the link breaks apart and
// rebuilds as the title. Afterwards the cursor scatters the dots and they spring back.
// The real heading text stays in the page for search engines and screen readers; it is only drawn as dots.

const FROM_KEY = 'gp-dots-from';
const REPLAY = 'dot-title:replay';
type From = { x: number; y: number; w: number; h: number };
type Dot = { x: number; y: number; vx: number; vy: number; hx: number; hy: number; sx: number; sy: number; delay: number; dur: number };

/** Remember where a clicked link sits on screen, so the title it leads to can be built from there. */
export function rememberFrom(el: Element) {
  const r = el.getBoundingClientRect();
  try { sessionStorage.setItem(FROM_KEY, JSON.stringify({ x: r.left, y: r.top, w: r.width, h: r.height, t: Date.now() })); } catch {}
}
/** For a link to a title on this same page (e.g. Services from the homepage menu): rebuild it now. */
export function replayTitle(sectionId: string) {
  dispatchEvent(new CustomEvent(REPLAY, { detail: sectionId }));
}

function takeFrom(): From | null {
  try {
    const raw = sessionStorage.getItem(FROM_KEY);
    sessionStorage.removeItem(FROM_KEY);
    const from = raw && JSON.parse(raw);
    return from && Date.now() - from.t < 8000 ? from : null;
  } catch { return null; }
}

const ease = (t: number) => 1 - (1 - t) ** 3;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

export function dotTitles() {
  const titles = [...document.querySelectorAll<HTMLElement>('[data-dots]')];
  if (!titles.length) return;
  // Without motion the titles stay as plain text.
  if (!document.documentElement.classList.contains('motion')) { titles.forEach((h) => h.classList.add('dots-off')); return; }
  // The link's position goes to the title it led to: the one in the address's #section, else the page title.
  const from = takeFrom();
  const target = (location.hash && titles.find((t) => t.closest(location.hash))) || titles.find((t) => t.tagName === 'H1') || null;
  titles.forEach((h) => new DotTitle(h, h === target ? from : null));
}

class DotTitle {
  canvas = document.createElement('canvas');
  ctx = this.canvas.getContext('2d')!;
  dots: Dot[] = [];
  W = 0; H = 0; gap = 5; px = -1e4; py = -1e4; awake = false; on = false;
  // Built: the title has flown in at least once (until then, it waits to come into view).
  built = false; ready = false; pending = false;
  // While the dots fly in they're drawn on a full-screen layer, since they start outside the heading.
  fly: HTMLCanvasElement | null = null; flyCtx: CanvasRenderingContext2D | null = null; flyAt = 0; ox = 0; oy = 0;
  accent: string;
  ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#161616';
  constructor(public el: HTMLElement, public from: From | null) {
    this.accent = getComputedStyle(el).getPropertyValue('--dot-accent').trim() || 'oklch(0.6 0.14 245)';
    this.canvas.className = 'dot-title-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    el.append(this.canvas);
    // Page titles build at once; section titles when they're well into view (or when a link brought us there).
    const now = el.tagName === 'H1' || !!from;
    new IntersectionObserver(([e]) => {
      this.on = e.isIntersecting;
      if (e.isIntersecting && !this.built) { if (this.ready) this.startFly(); else this.pending = true; }
    }, { threshold: now ? 0 : 0.45 }).observe(el);
    if (now) this.pending = true;
    if (fine) {
      el.addEventListener('pointermove', (e) => { if (!this.built || this.flyAt) return; const r = this.canvas.getBoundingClientRect(); this.px = e.clientX - r.left; this.py = e.clientY - r.top; this.awake = true; });
      el.addEventListener('pointerleave', () => { this.px = this.py = -1e4; });
    }
    addEventListener(REPLAY, (e) => {
      const id = (e as CustomEvent<string>).detail;
      if (!this.el.closest(`#${id}`)) return;
      this.from = takeFrom();
      this.built = false;
      this.startFly();
    });
    this.build();
    let width = innerWidth, timer = 0;
    addEventListener('resize', () => { clearTimeout(timer); timer = window.setTimeout(() => { if (Math.abs(innerWidth - width) > 40) { width = innerWidth; this.build(); } }, 250); });
    const loop = () => { if (this.flyAt) this.stepFly(); else if (this.on && this.awake) this.step(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  async build() {
    const font = getComputedStyle(this.el);
    await document.fonts.load(`800 ${font.fontSize} "Big Shoulders Display"`);
    const size = parseFloat(font.fontSize);
    const r = this.el.getBoundingClientRect();
    if (!r.width) return;
    const W = (this.W = Math.ceil(r.width)), H = (this.H = Math.ceil(r.height));
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const o = off.getContext('2d', { willReadFrequently: true })!;
    o.font = `800 ${size}px "Big Shoulders Display"`;
    (o as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = font.letterSpacing === 'normal' ? '0px' : font.letterSpacing;
    // Read the lines from the page itself (where the browser wrapped the title), word by word.
    const node = [...this.el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
    if (!node) { this.el.classList.add('dots-off'); return; }
    const range = document.createRange();
    const lines: { text: string; left: number; width: number }[] = [];
    let lastTop = NaN;
    for (const m of node.textContent!.matchAll(/\S+/g)) {
      range.setStart(node, m.index!); range.setEnd(node, m.index! + m[0].length);
      const b = range.getBoundingClientRect();
      if (Math.abs(b.top - lastTop) > 2 || !lines.length) { lines.push({ text: m[0], left: b.left - r.left, width: b.width }); lastTop = b.top; }
      else { const l = lines[lines.length - 1]; l.text += ` ${m[0]}`; l.width = b.right - r.left - l.left; }
    }
    if (!lines.length) { this.el.classList.add('dots-off'); return; }
    this.el.classList.remove('dots-off');
    const lineH = H / lines.length;
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = W * dpr; this.canvas.height = H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    o.textBaseline = 'alphabetic';
    const fm = o.measureText(lines[0].text);
    const base = (lineH - (fm.fontBoundingBoxAscent + fm.fontBoundingBoxDescent)) / 2 + fm.fontBoundingBoxAscent;
    // Each line is drawn exactly as wide as it is on the page (canvas letter spacing can differ slightly).
    lines.forEach((l, i) => {
      const w = o.measureText(l.text).width;
      o.save(); o.translate(l.left, base + i * lineH); o.scale(w ? l.width / w : 1, 1); o.fillText(l.text, 0, 0); o.restore();
    });
    const data = o.getImageData(0, 0, W, H).data;
    const gap = (this.gap = size < 90 ? 3 : size < 130 ? 4 : 5);
    this.dots = [];
    for (let y = gap / 2; y < H; y += gap) for (let x = gap / 2; x < W; x += gap) {
      if (data[((y | 0) * W + (x | 0)) * 4 + 3] >= 128) this.dots.push({ hx: x, hy: y, x, y, vx: 0, vy: 0, sx: 0, sy: 0, delay: 0, dur: 1 });
    }
    this.el.classList.add('dots-ready');
    this.ready = true;
    if (this.pending && !this.built) this.startFly(); else if (this.built) this.draw(); else this.ctx.clearRect(0, 0, W, H);
  }

  startFly() {
    if (!this.ready || this.flyAt) return;
    this.pending = false;
    const r = this.el.getBoundingClientRect(), vw = innerWidth, vh = innerHeight, f = this.from;
    for (const d of this.dots) {
      // From the clicked link (spread a little around it), or from anywhere on the screen.
      d.sx = f ? f.x - 30 + Math.random() * (f.w + 60) : Math.random() * vw;
      d.sy = f ? f.y - 20 + Math.random() * (f.h + 40) : Math.random() * vh;
      // A slow, staggered build: most dots leave early, some wait; each takes its time to arrive.
      d.delay = Math.random() ** 1.6 * (f ? 700 : 900);
      d.dur = 900 + Math.random() * 1000;
      d.x = d.hx; d.y = d.hy; d.vx = d.vy = 0;
    }
    this.from = null;
    this.ctx.clearRect(0, 0, this.W, this.H);
    const fly = document.createElement('canvas');
    fly.className = 'dot-title-fly';
    fly.setAttribute('aria-hidden', 'true');
    fly.width = vw; fly.height = vh;
    document.body.append(fly);
    this.fly = fly; this.flyCtx = fly.getContext('2d')!;
    this.ox = r.left; this.oy = r.top + scrollY;
    this.flyAt = performance.now();
  }

  stepFly() {
    const T = performance.now() - this.flyAt, f = this.flyCtx!;
    const left = this.ox, top = this.oy - scrollY, full = this.gap * 0.66;
    f.clearRect(0, 0, this.fly!.width, this.fly!.height);
    const flying = new Path2D(), landed = new Path2D();
    let done = true;
    for (const d of this.dots) {
      const t = (T - d.delay) / d.dur;
      if (t < 1) done = false;
      // A dot that hasn't set off yet isn't drawn, so nothing piles up where the dots start.
      if (t <= 0) continue;
      const k = Math.min(1, t), e = ease(k);
      const x = d.sx + (left + d.hx - d.sx) * e, y = d.sy + (top + d.hy - d.sy) * e;
      // Each dot appears small and reaches full size a little way into its flight.
      const side = full * Math.min(1, 0.3 + k * 2.2);
      (k >= 1 ? landed : flying).rect(x - side / 2, y - side / 2, side, side);
    }
    f.fillStyle = this.accent; f.fill(flying);
    f.fillStyle = this.ink; f.fill(landed);
    if (done) { this.flyAt = 0; this.built = true; this.fly!.remove(); this.fly = this.flyCtx = null; this.draw(); }
  }

  step() {
    let moving = 0;
    const R = Math.min(120, this.H * 0.7);
    for (const d of this.dots) {
      const dx = d.x - this.px, dy = d.y - this.py, dist = Math.hypot(dx, dy);
      if (dist < R && dist > 0.1) { const k = (1 - dist / R) * 3.4; d.vx += (dx / dist) * k; d.vy += (dy / dist) * k; }
      d.vx += (d.hx - d.x) * 0.05; d.vy += (d.hy - d.y) * 0.05;
      d.vx *= 0.82; d.vy *= 0.82; d.x += d.vx; d.y += d.vy;
      moving = Math.max(moving, Math.abs(d.vx) + Math.abs(d.vy), (Math.abs(d.hx - d.x) + Math.abs(d.hy - d.y)) * 0.1);
    }
    this.draw();
    if (moving < 0.02 && this.px < -1e3) this.awake = false;
  }

  draw() {
    const { ctx } = this, rad = this.gap * 0.36;
    ctx.clearRect(0, 0, this.W, this.H);
    const home = new Path2D(), moved = new Path2D();
    for (const d of this.dots) { const p = Math.abs(d.x - d.hx) + Math.abs(d.y - d.hy) > 2 ? moved : home; p.moveTo(d.x + rad, d.y); p.arc(d.x, d.y, rad, 0, 6.2832); }
    ctx.fillStyle = this.ink; ctx.fill(home);
    ctx.fillStyle = this.accent; ctx.fill(moved);
  }
}
