import { revealSupportTarget } from './support-finder';

/** Keep the comparison on the page; enhance only the optional finder into a dialog. */
export function mountSupportModal() {
  const dialog = document.querySelector<HTMLDialogElement>('#support-modal');
  const finder = document.querySelector<HTMLElement>('#fit');
  const slot = document.querySelector<HTMLElement>('#support-finder-slot');
  if (!dialog || !finder || !slot || typeof dialog.showModal !== 'function' || dialog.dataset.ready) return;
  dialog.dataset.ready = 'true';
  slot.append(finder);
  const title = dialog.querySelector<HTMLElement>('#support-modal-title')!;
  const open = () => {
    if (dialog.open) return;
    dialog.showModal();
    dialog.scrollTop = 0;
    slot.scrollTop = 0;
    title.focus({preventScroll:true});
  };
  document.querySelectorAll<HTMLAnchorElement>('[data-support-open="finder"]').forEach(link => {
    link.addEventListener('click',event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); open();
    });
  });
  dialog.querySelector('.support-modal-close')!.addEventListener('click',() => dialog.close());
  // Dismiss only when both press and release happen outside the dialog bounds.
  const outside = (event: PointerEvent | MouseEvent) => {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  let backdropDown = false;
  dialog.addEventListener('pointerdown',event => { backdropDown = event.target === dialog && outside(event); });
  dialog.addEventListener('click',event => { if (backdropDown && event.target === dialog && outside(event)) dialog.close(); backdropDown = false; });
  dialog.querySelector('[data-dismiss-finder]')!.addEventListener('click',() => dialog.close());
  document.querySelector('#fit-bar')?.addEventListener('click',event => {
    event.preventDefault(); open();
    const result = document.querySelector<HTMLElement>('#fit-result'); if (result) revealSupportTarget(result);
    document.querySelector<HTMLElement>('#fit-result-title')?.focus({preventScroll:true});
  });
  const followHash = () => {
    if (location.hash === '#fit' || location.hash === '#fit-result') {
      open();
      const result = document.querySelector<HTMLElement>('#fit-result');
      if (location.hash === '#fit-result' && result) revealSupportTarget(result);
    }
  };
  addEventListener('hashchange',followHash);
  followHash();
}
