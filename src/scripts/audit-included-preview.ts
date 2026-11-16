import { auditIncludedIdeas, auditAreas } from '../data/audit-included-ideas';

export function mountAuditIncludedPreview(root:HTMLElement) {
  if(root.dataset.incReady)return;
  root.dataset.incReady='true';
  const variants=[...root.querySelectorAll<HTMLElement>('[data-inc-variant]')];
  const select=root.querySelector<HTMLSelectElement>('#inc-select')!;
  const allButton=root.querySelector<HTMLButtonElement>('#inc-all')!;
  const still=root.querySelector<HTMLInputElement>('#inc-still')!;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');
  const directory=root.querySelector<HTMLDetailsElement>('.inc-directory')!;
  let index=0,showAll=false;
  const allowed=()=>!reduce.matches&&!still.checked;
  const reveal=(node:HTMLElement)=>{
    if(!allowed()||!node.animate)return;
    node.getAnimations().forEach(a=>a.cancel());
    node.animate([{opacity:.45,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.22,1,.36,1)'});
  };
  const render=(next:number,hash=true)=>{
    index=(next+variants.length)%variants.length;
    variants.forEach((v,i)=>v.hidden=!showAll&&i!==index);
    select.value=String(index);
    root.querySelector('#inc-count')!.textContent=`${String(index+1).padStart(2,'0')} / 20`;
    root.querySelector('#inc-announcement')!.textContent=`Design ${index+1}: ${auditIncludedIdeas[index].name}`;
    root.querySelectorAll<HTMLAnchorElement>('[data-inc-select]').forEach(a=>{
      if(Number(a.dataset.incSelect)===index)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');
    });
    if(hash)history.replaceState(null,'',`#audit-scope-${index+1}`);
    if(!showAll)reveal(variants[index]);
  };
  const fromHash=()=>{const n=Number(location.hash.replace('#audit-scope-',''))-1;return Number.isInteger(n)&&n>=0&&n<20?n:0;};
  render(fromHash(),false);
  select.addEventListener('change',()=>render(Number(select.value)));
  root.querySelector('#inc-prev')!.addEventListener('click',()=>render(index-1));
  root.querySelector('#inc-next')!.addEventListener('click',()=>render(index+1));
  allButton.addEventListener('click',()=>{
    showAll=!showAll;allButton.setAttribute('aria-pressed',String(showAll));
    allButton.textContent=showAll?'Compare one at a time':'Show all 20';
    root.classList.toggle('inc-show-all',showAll);render(index);
  });
  const syncMotion=()=>{root.classList.toggle('inc-is-still',!allowed());if(!allowed())root.getAnimations({subtree:true}).forEach(a=>a.cancel());};
  still.addEventListener('change',syncMotion);reduce.addEventListener('change',syncMotion);syncMotion();
  document.addEventListener('visibilitychange',()=>{if(document.hidden)root.getAnimations({subtree:true}).forEach(a=>a.cancel());});
  const activate=(explorer:HTMLElement,next:number,focus=false)=>{
    const tabs=[...explorer.querySelectorAll<HTMLButtonElement>('[data-inc-topic]')];
    const selected=(next+tabs.length)%tabs.length;
    explorer.dataset.active=String(selected);
    tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===selected));tab.tabIndex=i===selected?0:-1;});
    explorer.querySelectorAll<HTMLElement>('[data-inc-panel]').forEach(panel=>{
      panel.hidden=Number(panel.dataset.incPanel)!==selected;if(!panel.hidden)reveal(panel);
    });
    explorer.querySelectorAll<HTMLElement>('[data-inc-other]').forEach(panel=>panel.hidden=Number(panel.dataset.incOther)===selected);
    const count=explorer.querySelector('[data-inc-reader-count]');if(count)count.textContent=`${selected+1} of 5`;
    if(focus)tabs[selected].focus();
  };
  root.addEventListener('click',event=>{
    const target=(event.target as Element).closest<HTMLElement>('button,a[data-inc-select]');if(!target)return;
    if(target.dataset.incSelect!==undefined){
      event.preventDefault();render(Number(target.dataset.incSelect));directory.open=false;
      variants[index].scrollIntoView({block:'start',behavior:allowed()?'smooth':'instant'});return;
    }
    const explorer=target.closest<HTMLElement>('[data-inc-explorer]');
    if(explorer&&target.dataset.incTopic!==undefined){activate(explorer,Number(target.dataset.incTopic));return;}
    if(explorer&&target.dataset.incStep){activate(explorer,Number(explorer.dataset.active||0)+Number(target.dataset.incStep));return;}
    if(target.dataset.incDepth){
      const scope=target.closest<HTMLElement>('.inc-depth')!;
      scope.querySelectorAll('[data-inc-depth]').forEach(button=>button.setAttribute('aria-pressed',String(button===target)));
      scope.querySelectorAll<HTMLElement>('[data-inc-full]').forEach(panel=>{panel.hidden=target.dataset.incDepth!=='full';if(!panel.hidden)reveal(panel);});
    }
  });
  root.addEventListener('keydown',event=>{
    const tab=(event.target as HTMLElement).closest<HTMLButtonElement>('[role=tab][data-inc-topic]');if(!tab)return;
    const explorer=tab.closest<HTMLElement>('[data-inc-explorer]')!,vertical=tab.parentElement!.getAttribute('aria-orientation')==='vertical';
    const keys=vertical?['ArrowUp','ArrowDown']:['ArrowLeft','ArrowRight'];
    if(![...keys,'Home','End'].includes(event.key))return;
    event.preventDefault();const current=Number(tab.dataset.incTopic);
    activate(explorer,event.key==='Home'?0:event.key==='End'?4:current+(event.key===keys[1]?1:-1),true);
  });
  root.addEventListener('change',event=>{
    const input=event.target as HTMLInputElement;if(!input.hasAttribute('data-inc-concern'))return;
    const scope=input.closest<HTMLElement>('.inc-priorities')!;
    const selected=[...scope.querySelectorAll<HTMLInputElement>('[data-inc-concern]:checked')].map(field=>auditAreas[Number(field.dataset.incConcern)].name);
    scope.querySelector('.inc-priority-status')!.textContent=selected.length?`Your focus: ${selected.join(', ')}. All five areas are still included.`:'All five areas are included. Choose a concern to highlight it.';
  });
  root.querySelectorAll<HTMLDetailsElement>('.inc-design details').forEach(details=>details.addEventListener('toggle',()=>{
    if(details.open){const body=details.querySelector<HTMLElement>('.inc-disclosure-body,ul');if(body)reveal(body);}
  }));
  addEventListener('hashchange',()=>render(fromHash(),false));
}
