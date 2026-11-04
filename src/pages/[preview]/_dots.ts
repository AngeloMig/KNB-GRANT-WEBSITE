// Text drawn in dots, for the local design previews (the hero's dot type). The cursor pushes the dots
// away and each springs home; `glide()` flies them in from scattered points; `sweep()` runs a ripple.
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
type Dot = { x: number; y: number; vx: number; vy: number; hx: number; hy: number; ox: number; oy: number; delay: number; dur: number };
const all: Dots[] = [];

export class Dots {
  ctx: CanvasRenderingContext2D; dots: Dot[] = []; W = 0; H = 0; gap = 5; px = -1e4; py = -1e4; awake = true; on = false; glideAt = 0;
  constructor(public canvas: HTMLCanvasElement, public text: string, public opts: { color?: string; accent?: string; align?: 'left' | 'center'; lines?: string[]; hidden?: boolean } = {}) {
    this.ctx = canvas.getContext('2d')!;
    new IntersectionObserver(([e]) => { this.on = e.isIntersecting; }).observe(canvas);
    if (fine) {
      canvas.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); this.px = e.clientX - r.left; this.py = e.clientY - r.top; this.awake = true; });
      canvas.addEventListener('pointerleave', () => { this.px = this.py = -1e4; });
    }
    all.push(this);
    this.build();
  }
  async build() {
    await document.fonts.load('800 200px "Big Shoulders Display"');
    const r = this.canvas.getBoundingClientRect();
    this.W = Math.floor(r.width); this.H = Math.floor(r.height);
    if (!this.W || !this.H) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = this.W * dpr; this.canvas.height = this.H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { W, H } = this;
    this.gap = H < 90 ? 3 : W < 640 ? 4 : 5;
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const o = off.getContext('2d')!;
    const lines = this.opts.lines ?? [this.text];
    let size = (H / lines.length) * 1.12;
    o.font = `800 ${size}px "Big Shoulders Display"`;
    size = Math.min(size, (size * W * 0.98) / Math.max(...lines.map((l) => o.measureText(l).width)));
    o.font = `800 ${size}px "Big Shoulders Display"`;
    const left = this.opts.align === 'left';
    o.textAlign = left ? 'left' : 'center'; o.textBaseline = 'middle';
    lines.forEach((l, i) => o.fillText(l, left ? 0 : W / 2, (H * (i + 0.5)) / lines.length + size * 0.04));
    const data = o.getImageData(0, 0, W, H).data;
    const g = this.gap;
    this.dots = [];
    for (let y = g / 2; y < H; y += g) for (let x = g / 2; x < W; x += g) {
      if (data[((y | 0) * W + (x | 0)) * 4 + 3] > 128) this.dots.push({ hx: x, hy: y, x, y, vx: 0, vy: 0, ox: 0, oy: 0, delay: 0, dur: 1 });
    }
    if (this.opts.hidden) for (const d of this.dots) d.x = -1e4;
    this.awake = true;
    this.draw();
  }
  setText(text: string) { this.text = text; this.opts.lines = undefined; this.opts.hidden = false; return this.build().then(() => this.glide(400)); }
  glide(spread = 700) {
    for (const d of this.dots) { d.ox = Math.random() * this.W - d.hx; d.oy = (Math.random() * 2 - 0.5) * this.H - d.hy; d.delay = Math.random() ** 1.7 * spread; d.dur = 450 + Math.random() * 600; }
    this.glideAt = performance.now(); this.awake = true;
  }
  async sweep() {
    for (let k = 0; k <= 20; k++) { this.px = (k / 20) * this.W; this.py = this.H / 2; this.awake = true; await new Promise((r) => setTimeout(r, 16)); }
    this.px = this.py = -1e4;
  }
  step() {
    if (this.glideAt > 0) {
      const T = performance.now() - this.glideAt;
      let done = true;
      for (const d of this.dots) {
        const t = clamp((T - d.delay) / d.dur), left = t >= 1 ? 0 : 2 ** (-10 * t);
        d.x = d.hx + d.ox * left; d.y = d.hy + d.oy * left;
        if (t < 1) done = false;
      }
      if (done) this.glideAt = 0;
      this.draw();
      return;
    }
    let moving = 0;
    const R = Math.max(40, Math.min(110, this.H * 0.6));
    for (const d of this.dots) {
      const dx = d.x - this.px, dy = d.y - this.py, dist = Math.hypot(dx, dy);
      if (dist < R && dist > 0.1) { const f = (1 - dist / R) * 3.6; d.vx += (dx / dist) * f; d.vy += (dy / dist) * f; }
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
    ctx.fillStyle = this.opts.color ?? '#161616'; ctx.fill(home);
    ctx.fillStyle = this.opts.accent ?? 'oklch(0.6 0.14 245)'; ctx.fill(moved);
  }
}

const loop = () => { for (const d of all) if (d.on && (d.awake || d.glideAt > 0)) d.step(); requestAnimationFrame(loop); };
requestAnimationFrame(loop);
let width = innerWidth;
addEventListener('resize', () => { if (Math.abs(innerWidth - width) > 40) { width = innerWidth; all.forEach((d) => d.build()); } });
