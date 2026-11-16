import { paintAudit } from './service-card-media';
import { mountAuditScopes } from './audit-scope';

export function mountSeoDetailsPreview(root:HTMLElement) {
  if(root.dataset.seoDetailsReady)return;
  root.dataset.seoDetailsReady='true';
  root.dataset.mediaReady='true';
  mountAuditScopes(root);
  const select=root.querySelector<HTMLSelectElement>('#sd-select')!;
  const panels=[...root.querySelectorAll<HTMLElement>('[data-sd-addon]')];
  const directory=root.querySelector<HTMLDetailsElement>('.sd-directory')!;
  const audit=root.querySelector<HTMLElement>('.sc-audit')!;
  const surface=root.querySelector<HTMLElement>('.sd-service')!;
  const still=root.querySelector<HTMLInputElement>('#sd-still')!;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)'),compact=matchMedia('(max-width:1100px)');
  let selected=0,showAll=false,p=1,frame=0,target=1,lastDone=-1,lastVerdict='';
  const allowed=()=>!reduce.matches&&!still.checked;
  const animate=(node:HTMLElement)=>{
    if(!allowed()||typeof node.animate!=='function')return;
    node.getAnimations().forEach(animation=>animation.cancel());
    node.animate([{opacity:.3,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'cubic-bezier(.22,1,.36,1)'});
  };
  const fixNodes=[...root.querySelectorAll<HTMLElement>('[data-sd-fix]')];
  const title=root.querySelector<HTMLElement>('[data-sd-verdict-title]')!,copy=root.querySelector<HTMLElement>('[data-sd-verdict-copy]')!;
  const paint=(value:number)=>{
    p=value;paintAudit(audit,p);surface.style.setProperty('--audit-phase',p.toFixed(4));
    const verdict=p<.3?'before':p<.98?'progress':'after';
    if(verdict!==lastVerdict){
      title.textContent=verdict==='before'?'A few things need attention.':verdict==='progress'?'Working through the priorities.':'A clearer, quicker experience.';
      copy.textContent=verdict==='before'?'In this example, loading speed and search checks are the first areas to review.':verdict==='progress'?'The example report is changing as the work moves forward.':'The example checks are complete. Review the improvements, then agree on what comes next.';
      lastVerdict=verdict;
    }
    const done=Math.min(4,Math.floor(p*4));
    if(done!==lastDone){fixNodes.forEach((node,i)=>node.classList.toggle('is-done',i<done));root.querySelector('[data-sd-fix-count]')!.textContent=`${done} of 4 example fixes shown`;lastDone=done;}
    surface.dataset.progress=String(Math.round(p*100));
  };
  const to=(next:number,duration=600)=>{
    cancelAnimationFrame(frame);frame=0;target=next;
    if(!allowed()){paint(next);return;}
    const from=p,start=performance.now();
    const step=(time:number)=>{const t=Math.min(1,(time-start)/duration),ease=1-(1-t)**3;paint(from+(next-from)*ease);frame=t<1?requestAnimationFrame(step):0;};
    frame=requestAnimationFrame(step);
  };
  const replay=()=>{cancelAnimationFrame(frame);paint(0);to(1,1600);};
  const render=(next:number,hash=true)=>{
    selected=(next+panels.length)%panels.length;
    panels.forEach((panel,i)=>{panel.hidden=!showAll&&i!==selected;});
    select.value=String(selected);root.querySelector('#sd-count')!.textContent=`${String(selected+1).padStart(2,'0')} / ${panels.length}`;
    root.querySelectorAll<HTMLAnchorElement>('[data-sd-select]').forEach(link=>{if(Number(link.dataset.sdSelect)===selected)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');});
    root.querySelector('#sd-announcement')!.textContent=`Addition ${selected+1}: ${panels[selected].querySelector('h3')!.textContent}`;
    if(hash)history.replaceState(null,'',`#seo-addition-${selected+1}`);
    if(!showAll)animate(panels[selected]);
  };
  const initial=Number(location.hash.replace('#seo-addition-',''))-1;
  if(Number.isInteger(initial)&&initial>=0&&initial<panels.length)selected=initial;
  directory.open=!compact.matches;compact.addEventListener('change',()=>{directory.open=!compact.matches;});
  render(selected,false);paint(1);
  select.addEventListener('change',()=>render(Number(select.value)));
  root.querySelector('#sd-prev')!.addEventListener('click',()=>render(selected-1));
  root.querySelector('#sd-next')!.addEventListener('click',()=>render(selected+1));
  root.querySelector('#sd-replay')!.addEventListener('click',replay);
  root.querySelector('#sd-all')!.addEventListener('click',event=>{
    showAll=!showAll;const button=event.currentTarget as HTMLButtonElement;
    button.setAttribute('aria-pressed',String(showAll));button.textContent=showAll?'Compare one at a time':'Show all additions';
    root.classList.toggle('sd-show-all',showAll);render(selected);
  });
  const hideScores=root.querySelector<HTMLInputElement>('#sd-hide-scores')!;
  const syncScores=()=>root.classList.toggle('sd-hide-scores',hideScores.checked);
  hideScores.addEventListener('change',syncScores);syncScores();
  const stop=()=>{cancelAnimationFrame(frame);frame=0;paint(target);};
  const syncMotion=()=>{root.classList.toggle('is-still',!allowed());if(!allowed()){stop();root.getAnimations({subtree:true}).forEach(animation=>animation.cancel());}};
  still.addEventListener('change',syncMotion);reduce.addEventListener('change',syncMotion);syncMotion();
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  const destinations:Record<string,[string,string]>={collection:['/old-collection','/collections/current-range'],product:['/moved-product','/products/current-product'],contact:['/missing-enquiry-page','/contact']};
  const broken=root.querySelector<HTMLSelectElement>('#sd-broken-select')!;
  const resetLink=()=>{root.querySelector('[data-sd-old-link]')!.textContent=destinations[broken.value][0];root.querySelector('[data-sd-link-result]')!.textContent='Page not found';root.querySelector('[data-sd-repair-status]')!.textContent='Illustrative link. Your website is unchanged.';root.querySelector('[data-sd-action="repair"]')!.textContent='Preview a working link';};
  broken.addEventListener('change',resetLink);
  root.addEventListener('click',event=>{
    const button=(event.target as Element).closest<HTMLElement>('button,a[data-sd-select]');if(!button)return;
    if(button.dataset.sdSelect!==undefined){event.preventDefault();render(Number(button.dataset.sdSelect));if(compact.matches)directory.open=false;panels[selected].scrollIntoView({block:'start',behavior:allowed()?'smooth':'instant'});return;}
    if(button.dataset.auditPhase){to(button.dataset.auditPhase==='after'?1:0);return;}
    if(button.dataset.sdAction==='replay'){replay();return;}
    if(button.dataset.sdAction==='repair'){
      root.querySelector('[data-sd-link-result]')!.textContent=destinations[broken.value][1];
      root.querySelector('[data-sd-repair-status]')!.textContent='Working destination shown for this example. No live link has changed.';button.textContent='Working link previewed';return;
    }
    if(button.dataset.sdAction==='tap'){root.querySelector('[data-sd-tap-status]')!.textContent='Tapped. The larger target gives you more room.';return;}
    const group=button.dataset.sdGroup,value=button.dataset.sdValue;if(group===undefined||value===undefined)return;
    const panel=button.closest<HTMLElement>('[data-sd-addon]')!;
    panel.querySelectorAll<HTMLButtonElement>(`[data-sd-group="${group}"]`).forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    panel.querySelectorAll<HTMLElement>(`[data-sd-panel="${group}"]`).forEach(item=>{item.hidden=item.dataset.sdValue!==value;if(!item.hidden)animate(item);});
    if(group==='device'){
      const image=panel.querySelector<HTMLImageElement>('[data-sd-device-image]')!;
      image.src=value==='phone'?image.dataset.phone!:image.dataset.desktop!;
      image.alt=`Tero website preview on ${value==='phone'?'a phone':'desktop'}`;
      panel.querySelector<HTMLElement>('[data-sd-device]')!.dataset.sdDevice=value;
    }
  });
  root.addEventListener('input',event=>{
    const field=event.target as HTMLInputElement;
    if(field.hasAttribute('data-sd-image-range'))field.closest('[data-sd-addon]')!.querySelector<HTMLElement>('.sd-image-compare')!.style.setProperty('--image-split',String(Number(field.value)/100));
    if(field.hasAttribute('data-sd-snippet-title'))root.querySelector('[data-sd-search-title]')!.textContent=field.value||'Your page title';
    if(field.hasAttribute('data-sd-snippet-description'))root.querySelector('[data-sd-search-description]')!.textContent=field.value||'A helpful page description.';
  });
  root.addEventListener('change',event=>{
    if(!(event.target as Element).hasAttribute('data-sd-script'))return;
    const count=root.querySelectorAll('[data-sd-script]:checked').length;
    root.querySelector('[data-sd-script-count]')!.textContent=`${count} example ${count===1?'item':'items'} selected for review. No code is removed.`;
  });
  root.addEventListener('focusin',event=>{const button=(event.target as HTMLElement).closest<HTMLElement>('[data-sd-key]');if(button)root.querySelector('[data-sd-key-status]')!.textContent=`Keyboard focus: ${button.dataset.sdKey}`;});
  addEventListener('hashchange',()=>{const next=Number(location.hash.replace('#seo-addition-',''))-1;if(Number.isInteger(next)&&next>=0&&next<panels.length)render(next,false);});
}
