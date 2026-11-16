export function mountAboutLab(root:HTMLElement) {
  const panels=[...root.querySelectorAll<HTMLElement>('[data-al-panel]')];
  const select=root.querySelector<HTMLSelectElement>('#al-select')!;
  const directory=root.querySelector<HTMLDetailsElement>('.al-directory')!;
  const all=root.querySelector<HTMLButtonElement>('#al-all')!;
  const pause=root.querySelector<HTMLInputElement>('#al-pause')!;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)');
  const compact=matchMedia('(max-width:760px)');
  let selected=0,showAll=false;
  const animate=(node:HTMLElement)=>{
    if(reduce.matches || pause.checked || typeof node.animate!=='function') return;
    node.getAnimations().forEach(animation=>animation.cancel());
    node.animate([{opacity:.25,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'cubic-bezier(.22,1,.36,1)'});
  };
  const render=(next:number,updateHash=true)=>{
    selected=(next+panels.length)%panels.length;
    panels.forEach((panel,index)=>{panel.hidden=!showAll && index!==selected;});
    select.value=String(selected);
    root.querySelector('#al-count')!.textContent=`${String(selected+1).padStart(2,'0')} / ${panels.length}`;
    root.querySelectorAll<HTMLAnchorElement>('[data-al-select]').forEach(link=>{
      if(Number(link.dataset.alSelect)===selected) link.setAttribute('aria-current','true');
      else link.removeAttribute('aria-current');
    });
    root.querySelector('#al-announcement')!.textContent=`Idea ${selected+1}: ${panels[selected].querySelector('h2')!.textContent}`;
    if(updateHash) history.replaceState(null,'',`#about-idea-${selected+1}`);
    if(!showAll) animate(panels[selected].querySelector<HTMLElement>('.al-demo')!);
  };
  const initial=Number(location.hash.replace('#about-idea-',''))-1;
  if(Number.isInteger(initial) && initial>=0 && initial<panels.length) selected=initial;
  root.dataset.aboutReady='true';
  render(selected,false);
  directory.open=!compact.matches;
  compact.addEventListener('change',()=>{directory.open=!compact.matches;});
  select.addEventListener('change',()=>render(Number(select.value)));
  root.querySelector('#al-prev')!.addEventListener('click',()=>render(selected-1));
  root.querySelector('#al-next')!.addEventListener('click',()=>render(selected+1));
  all.addEventListener('click',()=>{
    showAll=!showAll; all.setAttribute('aria-pressed',String(showAll));
    all.textContent=showAll?'Compare one at a time':'Show all ideas';
    root.classList.toggle('al-show-all',showAll); render(selected);
    if(showAll) panels[selected].scrollIntoView({block:'start',behavior:reduce.matches || pause.checked?'instant':'smooth'});
  });
  root.addEventListener('click',event=>{
    const target=(event.target as Element).closest<HTMLElement>('button,a[data-al-select]');
    if(!target) return;
    if(target.dataset.alSelect!==undefined) {
      event.preventDefault(); render(Number(target.dataset.alSelect));
      if(compact.matches) directory.open=false;
      (showAll?panels[selected]:root.querySelector<HTMLElement>('#al-stage')!).scrollIntoView({block:'start',behavior:reduce.matches || pause.checked?'instant':'smooth'});
      return;
    }
    const panel=target.closest<HTMLElement>('[data-al-panel]'); if(!panel) return;
    const keys=['platform','audience','proof','process','tools','layer','note'] as const;
    // Audience buttons use a target name to keep the display attribute readable.
    if(target.dataset.target) {
      panel.querySelectorAll<HTMLElement>('[data-audience]').forEach(node=>{node.hidden=node.dataset.audience!==target.dataset.target;if(!node.hidden)animate(node);});
    }
    keys.filter(key=>key!=='audience').forEach(key=>{
      const value=target.dataset[key]; if(value===undefined) return;
      panel.querySelectorAll<HTMLElement>(`[data-${key}-panel]`).forEach(node=>{node.hidden=node.getAttribute(`data-${key}-panel`)!==value;if(!node.hidden)animate(node);});
    });
    if(target.hasAttribute('data-portrait')) panel.querySelector<HTMLElement>('.al-portrait')!.dataset.treatment=target.dataset.portrait;
    const group=target.closest('[data-local-options],.al-process-tabs');
    group?.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button===target)));
    if(target.hasAttribute('data-principle')) {
      panel.querySelectorAll<HTMLButtonElement>('[data-principle]').forEach(button=>{
        const active=button===target; button.setAttribute('aria-expanded',String(active));
        const text=button.querySelector<HTMLElement>('small')!;text.hidden=!active;if(active)animate(text);
      });
    }
  });
  const stopMotion=()=>{root.classList.toggle('is-still',pause.checked||reduce.matches);if(pause.checked||reduce.matches)root.getAnimations({subtree:true}).forEach(animation=>animation.cancel());};
  pause.addEventListener('change',stopMotion);reduce.addEventListener('change',stopMotion);stopMotion();
  const city=root.querySelector<HTMLSelectElement>('#al-city')!;
  const updateTime=()=>{
    if(document.hidden) return;
    const now=new Date();
    root.querySelectorAll<HTMLElement>('time[data-zone]').forEach(node=>{
      node.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:node.dataset.zone,hour:'2-digit',minute:'2-digit'}).format(now);
      node.setAttribute('datetime',now.toISOString());
    });
    root.querySelector('#al-city-date')!.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:city.value,weekday:'short',day:'numeric',month:'short'}).format(now);
  };
  city.addEventListener('change',()=>{
    root.querySelector<HTMLElement>('#al-compare-time')!.dataset.zone=city.value;
    root.querySelector('#al-city-name')!.textContent=city.selectedOptions[0].textContent;updateTime();
  });
  updateTime(); window.setInterval(updateTime,60000);
  document.addEventListener('visibilitychange',updateTime);
  addEventListener('hashchange',()=>{const n=Number(location.hash.replace('#about-idea-',''))-1;if(Number.isInteger(n)&&n>=0&&n<panels.length)render(n,false);});
}
