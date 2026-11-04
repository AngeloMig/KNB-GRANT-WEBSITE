// A copy of the hero orbit's behaviour (turns, drag with momentum, snap, auto-step, arrows, reflections)
// for the local design previews, with hooks so each variant can add to it. The homepage uses its own
// copy in HomeHero.astro; nothing here changes the live site.
const motion = document.documentElement.classList.contains('motion');
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const inOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const out = (t: number) => 1 - (1 - t) ** 3;
export const WAIT = 4600;

export type Hooks = {
  onFront?: (card: HTMLElement, i: number) => void;
  // Each card when the orbit is redrawn, with its angle from the front, and its reflection.
  onCard?: (card: HTMLElement, d: number, mirror: HTMLElement | undefined) => void;
  // A card's opacity from its angle (default: the back half fades out).
  opacity?: (d: number) => number;
  spread?: number;
};

export class Orbit {
  rot = 0; front = -1; paused = false; hover = false; dragging = false; next = 0; waitFrom = 0;
  cards: HTMLElement[]; angles: number[]; step: number;
  tween: { from: number; to: number; start: number; dur: number; ease: (t: number) => number } | null = null;
  constructor(public el: HTMLElement, public hooks: Hooks = {}) {
    const ring = el.querySelector<HTMLElement>('.ob-ring')!, spin = el.querySelector<HTMLElement>('.ob-spin')!;
    const cards = (this.cards = [...el.querySelectorAll<HTMLElement>('.ob-card')]);
    const mirrors = [...el.querySelectorAll<HTMLElement>('.ob-mirror')];
    const angles = (this.angles = cards.map((c) => Number(c.dataset.angle) * (hooks.spread ?? 1)));
    if (hooks.spread) spin.style.setProperty('--spread', String(hooks.spread));
    const shades = cards.map((c) => c.querySelector<HTMLElement>('.ob-shade')!);
    const captions = [...el.querySelectorAll<HTMLElement>('.ob-caption')];
    const step = (this.step = 360 / cards.length);
    if (!fine) el.classList.add('ob-touch');
    let on = false, vel = 0, lastX = 0, moved = 0, pressed = false, last = performance.now(), lastKey = '';
    new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(el);
    this.waitFrom = last; this.next = last + WAIT;
    const nearest = () => Math.round(this.rot / step) * step;
    const frame = () => {
      const time = performance.now(), ms = Math.min(50, time - last), dt = ms / 16.67;
      last = time;
      if (!on) { requestAnimationFrame(frame); return; }
      if (this.hover || this.dragging || this.paused || this.tween || document.hidden) { this.next += ms; this.waitFrom += ms; }
      if (!this.dragging) {
        if (this.tween) {
          const t = Math.min(1, (time - this.tween.start) / this.tween.dur);
          this.rot = this.tween.from + (this.tween.to - this.tween.from) * this.tween.ease(t);
          if (t >= 1) { this.tween = null; this.wait(); }
        } else if (Math.abs(vel) > 0.08) { this.rot += vel * dt; vel *= 0.94 ** dt; }
        else if (Math.abs(this.rot - nearest()) > 0.05) { vel = 0; this.turnTo(nearest(), 700, out); }
        else if (motion && time > this.next) this.turnTo(nearest() - step, 1400);
      }
      const key = this.rot.toFixed(3);
      if (key !== lastKey) {
        lastKey = key;
        spin.style.transform = `translateZ(calc(var(--r) * -1)) rotateY(${this.rot.toFixed(3)}deg)`;
        cards.forEach((card, i) => {
          const d = ((((angles[i] + this.rot) % 360) + 540) % 360) - 180;
          const f = 1 - Math.abs(d) / 180;
          const o = (hooks.opacity ?? ((a: number) => clamp((170 - Math.abs(a)) / 70)))(d).toFixed(3);
          card.style.opacity = o;
          if (mirrors[i]) mirrors[i].style.opacity = o;
          shades[i].style.opacity = (0.38 * (1 - f ** 2)).toFixed(3);
          card.style.pointerEvents = Math.abs(d) < step / 2 ? 'auto' : 'none';
          hooks.onCard?.(card, d, mirrors[i]);
        });
      }
      const now = ((Math.round(-this.rot / step) % cards.length) + cards.length) % cards.length;
      if (now !== this.front) {
        cards[this.front]?.classList.remove('is-front');
        this.front = now;
        cards[now].classList.add('is-front');
        captions.forEach((c, i) => c.classList.toggle('is-active', i === now));
        loadFull(cards[now]);
        hooks.onFront?.(cards[now], now);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    // A press only becomes a drag after a few pixels, so a plain click still opens the card's link.
    ring.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; if (e.pointerType === 'mouse') e.preventDefault(); pressed = true; lastX = e.clientX; moved = 0; vel = 0; this.tween = null; (ring as HTMLElement & { _pid?: number })._pid = e.pointerId; });
    ring.addEventListener('pointermove', (e) => {
      if (!pressed) return;
      if (e.pointerType === 'mouse' && !e.buttons) { release(); return; }
      const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
      if (!this.dragging) { if (moved < 5) return; this.dragging = true; try { ring.setPointerCapture(e.pointerId); } catch {} document.documentElement.classList.add('is-orbit-dragging'); }
      this.rot += dx * 0.22; vel = dx * 0.22;
    });
    const release = () => { if (!pressed) return; pressed = false; this.dragging = false; this.wait(2500); document.documentElement.classList.remove('is-orbit-dragging'); };
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);
    ring.addEventListener('click', (e) => { if (moved > 6) e.preventDefault(); }, true);
    ring.addEventListener('pointerenter', () => { this.hover = true; });
    ring.addEventListener('pointerleave', () => { this.hover = false; });
    el.querySelectorAll<HTMLButtonElement>('.ob-arrow').forEach((b) => b.addEventListener('click', () => this.by(-Number(b.dataset.dir))));
  }
  wait(extra = 0) { this.waitFrom = performance.now(); this.next = this.waitFrom + WAIT + extra; }
  turnTo(to: number, dur: number, ease = inOut) { if (!motion) { this.rot = to; this.tween = null; return; } this.tween = { from: this.rot, to, start: performance.now(), dur, ease }; }
  by(n: number) { const from = this.tween ? this.tween.to : Math.round(this.rot / this.step) * this.step; this.turnTo(from + n * this.step, 900); this.wait(4000); }
  goTo(i: number) { const from = this.tween ? this.tween.to : this.rot; const delta = ((((-this.angles[i] - from) % 360) + 540) % 360) - 180; this.turnTo(from + Math.round(delta / this.step) * this.step, 900); }
  progress() { return this.tween ? 0 : clamp((performance.now() - this.waitFrom) / (this.next - this.waitFrom)); }
}

// The front card swaps in its full-page screenshot (for the hover scroll), decoded first.
export function loadFull(card: HTMLElement) {
  const img = card.querySelector<HTMLImageElement>('img[data-full]');
  if (!img || img.dataset.loaded) return;
  img.dataset.loaded = 'true';
  const full = new Image();
  full.src = img.dataset.full!;
  full.decode().then(() => { img.src = full.src; img.height = 1807; }).catch(() => {});
}
