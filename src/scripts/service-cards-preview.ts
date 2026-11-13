import { arrowMarkup } from '../utils/arrow';
import { htmlText, serviceMediaMarkup, serviceAction, serviceCopyMarkup, mountServiceCardMedia, type PreviewService } from './service-card-media';
export function cardPreviewMarkup(service: PreviewService) {
  const scope = service.short === 'Support' ? 'We agree on priorities first. Planning, development, testing and reporting all use the chosen hours.' : service.short === 'Migrations & SEO' ? 'We review the existing site, plan redirects, prepare the move and check the important customer journeys before launch.' : 'The scope is agreed before work starts. Grant confirms the pages, features, integrations and launch checks with you.';
  return `<div class="cc-word" aria-hidden="true">${htmlText(service.short)}</div><span class="cc-rail-label" aria-hidden="true">${htmlText(service.short)}</span><div class="cc-copy"><span class="cc-tag">${htmlText(service.tags)}</span><h3>${htmlText(service.name)}</h3>${serviceCopyMarkup(service)}<a class="cc-cta" href="${htmlText(service.href)}">${serviceAction(service)} ${arrowMarkup(true)}</a><details class="cc-scope"><summary>What happens next <span aria-hidden="true">+</span></summary><p>${scope}</p></details></div><div class="cc-media">${serviceMediaMarkup(service)}</div><div class="cc-footer" aria-hidden="true"><span>Built around your business.</span><span>Let’s make progress ${arrowMarkup(true)}</span></div>`;
}
export function mountCardPreviews(root: HTMLElement) {
  if (root.dataset.ready) return; root.dataset.ready = 'true';
  const services: PreviewService[] = JSON.parse(root.dataset.services!);
  const select = root.querySelector<HTMLSelectElement>('#cc-service')!;
  const cards = [...root.querySelectorAll<HTMLElement>('.cc-card')];
  select.addEventListener('change',() => {
    const service = services[Number(select.value)]; if (!service) return;
    const line = root.querySelector<HTMLElement>('.cc-controls')!.getBoundingClientRect().bottom+80;
    const current = [...root.querySelectorAll<HTMLElement>('.cc-example')].find(section => { const rect = section.getBoundingClientRect(); return rect.top<=line && rect.bottom>line; });
    cards.forEach(card => { card.innerHTML = cardPreviewMarkup(service); card.dataset.service = service.short; card.style.setProperty('--project-image',`url("${service.shots[0].src}")`); });
    root.dispatchEvent(new Event('service-card-content'));
    if (current) requestAnimationFrame(() => current.scrollIntoView({block:'start',behavior:'instant'}));
    root.querySelector('#cc-live')!.textContent = `Showing ${service.name} in all 20 designs.`;
  });
  root.querySelector<HTMLSelectElement>('#cc-jump')!.addEventListener('change',event => {
    const id = (event.target as HTMLSelectElement).value;
    document.getElementById(id)?.scrollIntoView({block:'start',behavior:'instant'});
  });
  root.querySelector<HTMLInputElement>('#cc-pause')!.addEventListener('change',event => { root.classList.toggle('cc-still',(event.target as HTMLInputElement).checked); });
  mountServiceCardMedia(root);
}
