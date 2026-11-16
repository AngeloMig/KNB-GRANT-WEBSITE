import { mountAuditMotion } from './service-card-motion';
import { supportPlans, vipSupport } from '../data/support-plans';
import { withBase } from '../utils/paths';
import { arrowMarkup } from '../utils/arrow';
import { auditScopeMarkup, mountAuditScopes } from './audit-scope';
export { auditScopeMarkup } from './audit-scope';

export const htmlText = (value: string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const brief = ['Updates, fixes and routine care.','New pages and regular improvements.','Larger features and priority support.'];
const mobileBrief = ['Updates & fixes.','Pages & improvements.','Features & priority help.'];
export function supportCardMarkup() {
  return `<div class="sc-support sc-widget"><header><span>Monthly website support</span><strong>A little help. Or a lot.</strong></header><div class="sc-plan-grid">${supportPlans.map((plan,i) => `<a class="sc-plan" href="${withBase(`/estimate/?plan=${plan.value}`)}"><div class="sc-plan-top"><span>${plan.name}</span>${arrowMarkup(true)}</div><p class="sc-plan-hours"><strong class="display">${plan.hours}</strong><span>hours<br>per month</span></p><p><span class="sc-plan-brief-full">${brief[i]}</span><span class="sc-plan-brief-compact">${mobileBrief[i]}</span></p><small>${htmlText(plan.reply)}</small></a>`).join('')}<a class="sc-plan sc-plan-vip" href="${withBase('/estimate/?plan=vip')}"><div class="sc-plan-top"><span>VIP</span>${arrowMarkup(true)}</div><p class="sc-plan-hours"><strong class="display">8</strong><span>hours a day<br>Mon–Fri</span></p><p><span class="sc-plan-brief-full">Dedicated development, every working day.</span><span class="sc-plan-brief-compact">Dedicated developer.</span></p><small>${htmlText(vipSupport.reply)}</small></a></div><footer>Planning, development, checks and reporting fit within your hours.</footer></div>`;
}
const categories = ['Performance','Accessibility','Best practices','SEO'];
const exampleScores = { before:[48,81,92,78], after:[96,100,100,100] };
// These are separate illustrations, not a conversion from Lighthouse scores.
function scoreMeaning(index:number,progress:number) {
  if(index===0) return `Loads in ${(6.8+(1.9-6.8)*progress).toFixed(1)} s`;
  const count=Math.round([0,9,4,12][index]*(1-progress));
  return index===1?`${count} ${count===1?'check':'checks'} left`:index===2?`${count} ${count===1?'warning':'warnings'} left`:`${count} search ${count===1?'check':'checks'} left`;
}
function gauge(label: string, score: number, index:number) {
  const tone = score >= 90 ? 'good' : score >= 50 ? 'average' : 'poor';
  return `<li class="sc-gauge ${tone}" aria-label="${label}: ${score} out of 100. Illustrative score."><div class="sc-gauge-ring"><svg viewBox="0 0 80 80" aria-hidden="true"><circle class="sc-gauge-track" cx="40" cy="40" r="34"/><circle class="sc-gauge-fill" cx="40" cy="40" r="34" pathLength="100" stroke-dasharray="${score} 100"/></svg><strong>${score}</strong></div><span>${label}</span><small class="sc-score-meaning">${scoreMeaning(index,1)}</small></li>`;
}
export function auditCardMarkup(includeScope = true) {
  return `<div class="sc-audit sc-widget sc-audit-complete"><header><div><span>Illustrative report</span><strong>A healthier website.</strong></div><div class="sc-audit-switch" role="group" aria-label="Illustrative audit comparison"><button type="button" data-audit-phase="before" aria-pressed="false">Before</button><button type="button" data-audit-phase="after" aria-pressed="true">After</button></div></header><div class="sc-scroll-guide"><div class="sc-audit-progress" role="progressbar" aria-label="Illustrative before and after transition" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" style="--audit-progress:1"><span style="transform:scaleX(1)"></span><i aria-hidden="true"><b></b></i></div><div><span>Before</span><span class="sc-phase-readout">100%</span><span>After</span></div></div><ul class="sc-gauges">${categories.map((label,i) => gauge(label,exampleScores.after[i],i)).join('')}</ul><p class="sc-audit-note">Example scores and checks, not measured client results.</p>${includeScope ? auditScopeMarkup() : ''}</div>`;
}
export type PreviewService = {name:string;short:string;text:string;mobileText?:string;tags:string;href:string;shots:{src:string;phone:string;name:string;hue:number;agency?:string;engagement?:string;href?:string}[]};
export function serviceMediaMarkup(service: PreviewService) {
  if (service.short === 'Support') return supportCardMarkup();
  if (service.short === 'Performance') return auditCardMarkup();
  return `<figure class="sc-project"><div class="sc-browser-bar" aria-hidden="true"><i></i><i></i><i></i><span>${htmlText(service.shots[0].name)}</span></div><img src="${htmlText(service.shots[0].src)}" width="960" height="600" alt="${htmlText(service.shots[0].name)} website preview" loading="lazy" decoding="async"/><figcaption>${service.shots[0].href ? `<a href="${htmlText(service.shots[0].href)}">${htmlText(service.shots[0].name)} ${arrowMarkup(true)}</a>` : htmlText(service.shots[0].name)}${service.shots[0].engagement || service.shots[0].agency ? `<span>${htmlText([service.shots[0].engagement,service.shots[0].agency].filter(Boolean).join(' · '))}</span>` : ''}</figcaption></figure>`;
}
export function serviceCopyMarkup(service: PreviewService) {
  return service.mobileText ? `<p class="service-copy-full">${htmlText(service.text)}</p><p class="service-copy-compact">${htmlText(service.mobileText)}</p>` : `<p>${htmlText(service.text)}</p>`;
}
export function serviceAction(service: PreviewService) {
  return service.short === 'Support' ? 'Compare support plans' : service.short === 'Performance' ? 'Get my free website audit' : 'Start a project';
}
const auditNodes = new WeakMap<HTMLElement, ReturnType<typeof collectAuditNodes>>();
function collectAuditNodes(audit: HTMLElement) {
  return {
    gauges:[...audit.querySelectorAll<HTMLElement>('.sc-gauge')].map((node,i) => ({node,label:categories[i],value:node.querySelector<HTMLElement>('strong')!,fill:node.querySelector<SVGCircleElement>('.sc-gauge-fill')!,meaningNode:node.querySelector<HTMLElement>('.sc-score-meaning')!,meaning:'',score:-1,tone:''})),
    buttons:[...audit.querySelectorAll<HTMLButtonElement>('[data-audit-phase]')],
    progress:audit.querySelector<HTMLElement>('.sc-audit-progress')!,
    fill:audit.querySelector<HTMLElement>('.sc-audit-progress>span')!,
    readout:audit.querySelector<HTMLElement>('.sc-phase-readout')!,
    surface:audit.closest<HTMLElement>('.sv-stack-inner,.cc-card') || audit,
    last:-1,phase:'',percent:-1,
  };
}
export function paintAudit(audit: HTMLElement, progress: number) {
  let nodes = auditNodes.get(audit);
  if (!nodes) { nodes = collectAuditNodes(audit); auditNodes.set(audit,nodes); }
  const p = Math.min(1,Math.max(0,progress));
  if (Math.abs(p-nodes.last)<.0005) return;
  nodes.gauges.forEach((gauge,i) => {
    const value = exampleScores.before[i] + (exampleScores.after[i]-exampleScores.before[i])*p;
    const score = Math.round(value),tone = score>=90?'good':score>=50?'average':'poor';
    const meaning=scoreMeaning(i,p);
    if (score !== gauge.score || meaning!==gauge.meaning) {
      gauge.value.textContent = String(score);
      gauge.node.setAttribute('aria-label',`${gauge.label}: ${score} out of 100. ${meaning}. Illustrative example.`); gauge.score = score;
      gauge.meaningNode.textContent=meaning;gauge.meaning=meaning;
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
  nodes.surface.style.setProperty('--audit-phase',p.toFixed(4));
  nodes.last = p;
}
export function mountServiceCardMedia(root: HTMLElement) {
  if (root.dataset.mediaReady) return;
  root.dataset.mediaReady = 'true';
  mountAuditScopes(root);
  mountAuditMotion(root,paintAudit);
}
