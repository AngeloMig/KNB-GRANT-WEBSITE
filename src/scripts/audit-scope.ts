import { auditAreas } from '../data/audit-scope';

/** All five explanations remain visible until the accessible tabs are ready. */
export function auditScopeMarkup() {
  return `<section class="sc-audit-scope"><h4><span class="sc-scope-dot" aria-hidden="true"></span>What’s included in your free audit</h4><div class="sc-scope-tabs" aria-label="What the free audit includes">${auditAreas.map((area,i)=>`<button type="button" data-scope-tab="${i}">${area.name}</button>`).join('')}</div><div class="sc-scope-panels">${auditAreas.map((area,i)=>`<section class="sc-scope-panel" data-scope-panel="${i}"><span class="sc-scope-caption">Included in the review</span><h5>${area.outcome}</h5><p>${area.copy}</p><ul>${area.checks.map(check=>`<li>${check}</li>`).join('')}</ul></section>`).join('')}</div><footer class="sc-scope-foot">A review and recommendations. Any development work is agreed separately.</footer></section>`;
}

let scopeId=0;
export function mountAuditScopes(root:HTMLElement) {
  root.querySelectorAll<HTMLElement>('.sc-audit-scope').forEach(scope=>{
    if(scope.dataset.scopeReady)return;
    const tabs=[...scope.querySelectorAll<HTMLButtonElement>('[data-scope-tab]')];
    const panels=[...scope.querySelectorAll<HTMLElement>('[data-scope-panel]')];
    if(!tabs.length||tabs.length!==panels.length)return;
    let prefix:string;
    do {prefix=`audit-scope-tabs-${++scopeId}`;} while(document.getElementById(`${prefix}-0`));
    const reduce=matchMedia('(prefers-reduced-motion:reduce)');
    const nav=scope.querySelector<HTMLElement>('.sc-scope-tabs')!;
    nav.setAttribute('role','tablist');nav.setAttribute('aria-orientation','horizontal');
    tabs.forEach((tab,i)=>{
      tab.id=`${prefix}-${i}`;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',`${prefix}-panel-${i}`);
      panels[i].id=`${prefix}-panel-${i}`;panels[i].setAttribute('role','tabpanel');panels[i].setAttribute('aria-labelledby',tab.id);panels[i].tabIndex=0;
    });
    let selected=-1;
    const activate=(next:number,focus=false,animate=true)=>{
      const index=(next+tabs.length)%tabs.length;
      tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});
      panels.forEach((panel,i)=>{panel.hidden=i!==index;panel.getAnimations().forEach(a=>a.cancel());});
      if(index!==selected&&animate&&!reduce.matches&&!document.hidden&&typeof panels[index].animate==='function'){
        panels[index].animate([{opacity:.45,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.22,1,.36,1)'});
      }
      selected=index;if(focus)tabs[index].focus();
    };
    activate(0,false,false);scope.dataset.scopeReady='true';
    nav.addEventListener('click',event=>{
      const tab=(event.target as Element).closest<HTMLButtonElement>('[data-scope-tab]');if(tab)activate(tabs.indexOf(tab));
    });
    nav.addEventListener('keydown',event=>{
      if(!(event.target as HTMLElement).matches('[data-scope-tab]'))return;
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();activate(event.key==='Home'?0:event.key==='End'?tabs.length-1:selected+(event.key==='ArrowRight'?1:-1),true);
    });
    reduce.addEventListener('change',()=>{if(reduce.matches)panels.forEach(panel=>panel.getAnimations().forEach(a=>a.cancel()));});
  });
}
