/** Local, opt-in frame-pacing measurements; never imported by production. */
export function mountScrollAudit() {
  const output = document.createElement('output');
  output.hidden = true;
  output.dataset.scrollAudit = '';
  document.body.append(output);
  type Sample = { gaps: number[]; longTasks: number[]; distance: number };
  const samples: Record<string, Sample> = {};
  const sections = ['.home-hero', '#work', '#reviews', '#services', '.experience-section', '.closing-cta', '.site-footer'];
  let boundaries: { name: string; top: number }[] = [];
  const measure = () => {
    boundaries = sections.flatMap(selector => {
      const element = document.querySelector(selector);
      return element ? [{ name: selector, top: selector === '.site-footer' && ['fixed', 'sticky'].includes(getComputedStyle(element).position) ? document.querySelector('main')!.getBoundingClientRect().bottom + scrollY : element.getBoundingClientRect().top + scrollY }] : [];
    }).sort((a, b) => a.top - b.top);
  };
  const section = () => boundaries.filter(item => item.top <= scrollY + innerHeight * .4).at(-1)?.name ?? 'top';
  const bucket = () => samples[section()] ??= { gaps: [], longTasks: [], distance: 0 };
  let frame = 0, until = 0, last = 0, lastY = scrollY, started = Infinity;
  const publish = () => {
    const result = Object.fromEntries(Object.entries(samples).map(([name, sample]) => {
      const sorted = [...sample.gaps].sort((a, b) => a - b);
      const mean = sorted.reduce((a, b) => a + b, 0) / (sorted.length || 1);
      return [name, { movingFrames: sorted.length, meanFrameMs: +mean.toFixed(2), p95FrameMs: +(sorted[Math.floor(sorted.length * .95)] ?? 0).toFixed(2), gapsOver33ms: sorted.filter(ms => ms > 33.4).length, longTasks: sample.longTasks.length, worstLongTaskMs: +Math.max(0, ...sample.longTasks).toFixed(1), distance: Math.round(sample.distance) }];
    }));
    output.textContent = JSON.stringify({ viewport: [innerWidth, innerHeight], sections: result });
  };
  const tick = (time: number) => {
    frame = 0;
    if (document.hidden) { publish(); return; }
    const y = scrollY;
    if (last && y !== lastY) {
      const sample = bucket();
      sample.gaps.push(time - last);
      sample.distance += Math.abs(y - lastY);
    }
    last = time; lastY = y;
    if (time < until) frame = requestAnimationFrame(tick);
    else { last = 0; publish(); }
  };
  addEventListener('scroll', () => {
    const now = performance.now();
    // A new scroll burst must not include the idle interval since the last burst.
    if (now > until) { last = 0; measure(); }
    started = Math.min(started, now);
    until = now + 180;
    if (!frame) frame = requestAnimationFrame(tick);
  }, { passive: true });
  if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (entry.startTime >= started && entry.startTime <= until) bucket().longTasks.push(entry.duration);
    }).observe({ type: 'longtask', buffered: false });
  }
  measure();
  document.fonts.ready.then(measure);
  addEventListener('resize', measure);
  publish();
}
