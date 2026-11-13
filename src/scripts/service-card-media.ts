import { mountAuditMotion } from './service-card-motion';
import { supportPlans, vipSupport } from '../data/support-plans';
import { withBase } from '../utils/paths';

export const htmlText = (value: string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const brief = ['Updates, fixes and routine care.','New pages and regular improvements.','Larger features and priority support.'];
const mobileBrief = ['Updates & fixes.','Pages & improvements.','Features & priority help.'];
export function supportCardMarkup() {
  return `<div class="sc-support sc-widget"><header><span>Monthly website support</span><strong>A little help. Or a lot.</strong></header><div class="sc-plan-grid">${supportPlans.map((plan,i) => `<a class="sc-plan" href="${withBase(`/estimate/?plan=${plan.value}`)}"><div class="sc-plan-top"><span>${plan.name}</span><span aria-hidden="true">↗</span></div><p class="sc-plan-hours"><strong class="display">${plan.hours}</strong><span>hours<br>per month</span></p><p><span class="sc-plan-brief-full">${brief[i]}</span><span class="sc-plan-brief-compact">${mobileBrief[i]}</span></p><small>${htmlText(plan.reply)}</small></a>`).join('')}<a class="sc-plan sc-plan-vip" href="${withBase('/estimate/?plan=vip')}"><div class="sc-plan-top"><span>VIP</span><span aria-hidden="true">↗</span></div><p class="sc-plan-hours"><strong class="display">8</strong><span>hours a day<br>Mon–Fri</span></p><p><span class="sc-plan-brief-full">Dedicated development, every working day.</span><span class="sc-plan-brief-compact">Dedicated developer.</span></p><small>${htmlText(vipSupport.reply)}</small></a></div><footer>Planning, development, checks and reporting fit within your hours.</footer></div>`;
}
const categories = ['Performance','Accessibility','Best practices','SEO'];
const exampleScores = { before:[48,81,92,78], after:[96,100,100,100] };
function gauge(label: string, score: number) {
  const tone = score >= 90 ? 'good' : score >= 50 ? 'average' : 'poor';
  return `<li class="sc-gauge ${tone}" aria-label="${label}: ${score} out of 100. Illustrative score."><div class="sc-gauge-ring"><svg viewBox="0 0 80 80" aria-hidden="true"><circle class="sc-gauge-track" cx="40" cy="40" r="34"/><circle class="sc-gauge-fill" cx="40" cy="40" r="34" pathLength="100" stroke-dasharray="${score} 100"/></svg><strong>${score}</strong></div><span>${label}</span></li>`;
}
const routes = [
  {from:'WooCommerce',to:'Shopify',name:'WooCommerce → Shopify',detail:'Move products and content. Map old URLs. Check checkout and tracking.'},
  {from:'WordPress',to:'Webflow',name:'WordPress → Webflow',detail:'Rebuild key pages and CMS content. Keep useful URLs. Check forms and search settings.'},
  {from:'Magento',to:'Shopify',name:'Magento → Shopify',detail:'Plan the catalogue move. Reconnect business tools. Test orders before launch.'},
];
export function auditCardMarkup() {
  return `<div class="sc-audit sc-widget sc-audit-complete"><header><div><span>Illustrative report</span><strong>A healthier website.</strong></div><div class="sc-audit-switch" role="group" aria-label="Illustrative audit comparison"><button type="button" data-audit-phase="before" aria-pressed="false">Before</button><button type="button" data-audit-phase="after" aria-pressed="true">After</button></div></header><div class="sc-scroll-guide"><div class="sc-audit-progress" role="progressbar" aria-label="Illustrative before and after transition" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" style="--audit-progress:1"><span style="transform:scaleX(1)"></span><i aria-hidden="true"><b></b></i></div><div><span>Before</span><span class="sc-phase-readout">100%</span><span>After</span></div></div><ul class="sc-gauges">${categories.map((label,i) => gauge(label,exampleScores.after[i])).join('')}</ul><p class="sc-audit-note">Example scores, not measured client results.</p><div class="sc-migration"><header><h4>Example migration</h4><span class="sc-migration-status">Check before launch</span></header><div class="sc-platform-flow"><div><small>Existing platform</small><strong data-migration-from>${routes[0].from}</strong></div><span aria-hidden="true">→</span><div><small>New platform</small><strong data-migration-to>${routes[0].to}</strong></div></div><details class="sc-migration-details" open><summary>Migration details <span aria-hidden="true">+</span></summary><div class="sc-routes" role="group" aria-label="Example migration routes">${routes.map((route,i) => `<button type="button" data-migration="${i}" aria-pressed="${i===0}">${route.name}</button>`).join('')}</div><p class="sc-migration-detail" role="status">${routes[0].detail}</p></details><ol class="sc-migration-steps" aria-label="Typical migration approach" style="--migration-progress:1"><li data-step-state="done"><span class="sc-step-node" aria-hidden="true"></span><strong>Plan</strong><small>Content & URL map</small></li><li data-step-state="done"><span class="sc-step-node" aria-hidden="true"></span><strong>Move</strong><small>Build & reconnect</small></li><li data-step-state="done"><span class="sc-step-node" aria-hidden="true"></span><strong>Check & launch</strong><small>Test before going live</small></li></ol></div></div>`;
}
export type PreviewService = {name:string;short:string;text:string;mobileText?:string;tags:string;href:string;shots:{src:string;phone:string;name:string;hue:number;agency?:string;engagement?:string;href?:string}[]};
export function serviceMediaMarkup(service: PreviewService) {
  if (service.short === 'Support') return supportCardMarkup();
  if (service.short === 'Migrations & SEO') return auditCardMarkup();
  return `<figure class="sc-project"><div class="sc-browser-bar" aria-hidden="true"><i></i><i></i><i></i><span>${htmlText(service.shots[0].name)}</span></div><img src="${htmlText(service.shots[0].src)}" width="960" height="600" alt="${htmlText(service.shots[0].name)} website preview" loading="lazy" decoding="async"/><figcaption>${service.shots[0].href ? `<a href="${htmlText(service.shots[0].href)}">${htmlText(service.shots[0].name)} ↗</a>` : htmlText(service.shots[0].name)}${service.shots[0].engagement || service.shots[0].agency ? `<span>${htmlText([service.shots[0].engagement,service.shots[0].agency].filter(Boolean).join(' · '))}</span>` : ''}</figcaption></figure>`;
}
export function serviceCopyMarkup(service: PreviewService) {
  return service.mobileText ? `<p class="service-copy-full">${htmlText(service.text)}</p><p class="service-copy-compact">${htmlText(service.mobileText)}</p>` : `<p>${htmlText(service.text)}</p>`;
}
export function serviceAction(service: PreviewService) {
  return service.short === 'Support' ? 'Compare support plans' : service.short === 'Migrations & SEO' ? 'Get a free website audit' : 'Start a project';
}
const auditNodes = new WeakMap<HTMLElement, ReturnType<typeof collectAuditNodes>>();
function collectAuditNodes(audit: HTMLElement) {
  return {
    gauges:[...audit.querySelectorAll<HTMLElement>('.sc-gauge')].map((node,i) => ({node,label:categories[i],value:node.querySelector<HTMLElement>('strong')!,fill:node.querySelector<SVGCircleElement>('.sc-gauge-fill')!,score:-1,tone:''})),
    buttons:[...audit.querySelectorAll<HTMLButtonElement>('[data-audit-phase]')],
    progress:audit.querySelector<HTMLElement>('.sc-audit-progress')!,
    fill:audit.querySelector<HTMLElement>('.sc-audit-progress>span')!,
    readout:audit.querySelector<HTMLElement>('.sc-phase-readout')!,
    steps:[...audit.querySelectorAll<HTMLElement>('.sc-migration-steps li')],
    rail:audit.querySelector<HTMLElement>('.sc-migration-steps')!,
    status:audit.querySelector<HTMLElement>('.sc-migration-status')!,
    last:-1,phase:'',step:-1,percent:-1,done:false,
  };
}
function paintAudit(audit: HTMLElement, progress: number) {
  let nodes = auditNodes.get(audit);
  if (!nodes) { nodes = collectAuditNodes(audit); auditNodes.set(audit,nodes); }
  const p = Math.min(1,Math.max(0,progress));
  if (Math.abs(p-nodes.last)<.0005) return;
  nodes.gauges.forEach((gauge,i) => {
    const value = exampleScores.before[i] + (exampleScores.after[i]-exampleScores.before[i])*p;
    const score = Math.round(value),tone = score>=90?'good':score>=50?'average':'poor';
    if (score !== gauge.score) {
      gauge.value.textContent = String(score);
      gauge.node.setAttribute('aria-label',`${gauge.label}: ${score} out of 100. Illustrative score.`); gauge.score = score;
    }
    if (tone !== gauge.tone) { gauge.node.className = `sc-gauge ${tone}`; gauge.tone = tone; }
    gauge.fill.setAttribute('stroke-dasharray',`${value.toFixed(2)} 100`);
  });
  const phase = p<.001?'before':p>.999?'after':'progress';
  if (phase !== nodes.phase) {
    nodes.buttons.forEach(button => button.setAttribute('aria-pressed',String(button.dataset.auditPhase===phase)));
    audit.classList.toggle('sc-audit-complete',phase==='after'); nodes.phase = phase;
  }
  const percent = Math.round(p*100);
  if (percent !== nodes.percent) { nodes.progress.setAttribute('aria-valuenow',String(percent)); nodes.readout.textContent = `${percent}%`; nodes.percent = percent; }
  nodes.fill.style.transform = `scaleX(${p.toFixed(4)})`;
  nodes.progress.style.setProperty('--audit-progress',p.toFixed(4));
  nodes.rail.style.setProperty('--migration-progress',p.toFixed(4));
  const step = Math.min(2,Math.floor(p*3));
  const done = p>.999;
  if (step !== nodes.step || done !== nodes.done) nodes.steps.forEach((node,i) => { node.dataset.stepState = i<step || done?'done':i===step?'active':'next'; });
  if (step !== nodes.step) { nodes.status.textContent = ['Plan the move','Build & reconnect','Check before launch'][step]; nodes.step = step; }
  nodes.last = p;
  nodes.done = done;
}
export function mountServiceCardMedia(root: HTMLElement) {
  if (root.dataset.mediaReady) return;
  root.dataset.mediaReady = 'true';
  root.addEventListener('click',event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-migration]');
    const audit = button?.closest<HTMLElement>('.sc-audit'); if (!button || !audit) return;
    const route = routes[Number(button.dataset.migration)]; if (!route) return;
    audit.querySelectorAll<HTMLButtonElement>('[data-migration]').forEach(item => item.setAttribute('aria-pressed',String(item===button)));
    audit.querySelector('[data-migration-from]')!.textContent = route.from;
    audit.querySelector('[data-migration-to]')!.textContent = route.to;
    const detail = audit.querySelector<HTMLElement>('.sc-migration-detail')!; detail.textContent = route.detail;
    if (!matchMedia('(prefers-reduced-motion:reduce)').matches && !root.matches('.cc-still,.is-still')) detail.animate([{opacity:.35,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.22,1,.36,1)'});
  });
  const narrow=matchMedia('(max-width:760px)');
  const syncDetails=()=>root.querySelectorAll<HTMLDetailsElement>('.sc-migration-details').forEach(detail=>{ detail.open=!narrow.matches; });
  syncDetails(); narrow.addEventListener('change',syncDetails); root.addEventListener('service-card-content',syncDetails);
  mountAuditMotion(root,paintAudit);
}
