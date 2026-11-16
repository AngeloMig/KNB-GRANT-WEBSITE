import Lenis from 'lenis';

// Smooth scrolling for a mouse wheel or trackpad (desktop only): Lenis eases the page towards where the
// wheel says it should be, instead of the browser's step-by-step jumps. The page still scrolls the
// window itself, so sticky sections, scroll listeners and IntersectionObservers work as before.
// Phones and tablets keep their own native scrolling (it already has momentum, and faking it there
// feels laggy under the finger); BaseLayout only loads this file for a fine pointer with motion on.
export function startSmoothScroll() {
  const root = document.documentElement;
  const lenis = new Lenis({
    autoRaf: true,
    stopInertiaOnNavigate: true,
    lerp: 0.11,
    wheelMultiplier: 1,
    smoothWheel: true,
    syncTouch: false,
    // Anything that scrolls on its own (menus, panels, chip rows) keeps its normal wheel scrolling.
    allowNestedScroll: true,
    // Open dialogs (and anything marked data-lenis-prevent) are left to the browser, so the wheel never
    // scrolls the page behind a dialog.
    prevent: (node) => !!node.closest('dialog, [data-lenis-prevent]'),
    // BaseLayout's own link handler does same-page links (through lenis.scrollTo, below).
    anchors: false,
  });
  (window as unknown as { lenis?: Lenis }).lenis = lenis;

  // The menu freezes the page (it becomes position: fixed and moves aside), so smooth scrolling
  // pauses while the page is frozen and picks up from the restored position once it is put back.
  // (Following a menu link puts the page back at once, while the menu is still animating closed.)
  const shell = document.querySelector('.page-shell');
  const frozen = () => !!shell?.classList.contains('is-frozen');
  const sync = () => {
    if (frozen()) lenis.stop();
    // Re-measured first: while frozen the page was only one screen tall.
    else if (lenis.isStopped) { lenis.resize(); lenis.start(); }
  };
  if (shell) new MutationObserver(sync).observe(shell, { attributes: true, attributeFilter: ['class'] });

  // Motion switched off on the device after load: back to native scrolling.
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => { if (e.matches) { lenis.destroy(); delete (window as unknown as { lenis?: Lenis }).lenis; } });
  return lenis;
}
