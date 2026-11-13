type PaintAudit = (audit: HTMLElement, progress: number) => void;
type Scene = { host:HTMLElement; card:HTMLElement; audit:HTMLElement; gauges:HTMLElement; top:number; pinned:boolean; value:number; from:number; target:number; started:number; duration:number; animating:boolean; manual:boolean; intent:number; scroll:number; entry:number; armed:boolean; armedGesture:number };
const clamp = (value:number) => Math.min(1,Math.max(0,value));
const ease = (value:number) => { const p=clamp(value); return p*p*(3-2*p); };

/** A small native scroll starts one finite card/audit sequence; scrolling is never intercepted. */
export function mountAuditMotion(root: HTMLElement, paint: PaintAudit) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)'),active = new Set<Scene>();
  let scenes:Scene[]=[],frame=0,measuring=true,lastY=scrollY,scrollToken=0,direction=1,intent=0,lastWheel=0,wheelDirection=0;
  const allowed = () => !reduce.matches && !root.classList.contains('cc-still') && !root.classList.contains('is-still');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const scene=scenes.find(item=>item.host===entry.target); if(!scene) return;
      if(entry.isIntersecting) active.add(scene);
      else { active.delete(scene); if(scene.animating) { scene.animating=false; scene.value=scene.target; paint(scene.audit,scene.value); } }
    }); schedule();
  },{rootMargin:'120px 0px'});
  const resize = new ResizeObserver(()=>{ measuring=true; schedule(); });
  function schedule() { if(!frame && !document.hidden) frame=requestAnimationFrame(update); }
  function start(scene:Scene,target:number,duration:number,time:number) {
    scene.from=scene.value; scene.target=target; scene.duration=duration; scene.started=time; scene.animating=allowed() && Math.abs(target-scene.value)>.001;
    if(!scene.animating) { scene.value=target; paint(scene.audit,target); }
  }
  function update(time:number) {
    frame=0; if(document.hidden) return;
    const enabled=allowed(),minimumTop=(root.querySelector<HTMLElement>('.cc-controls,.sv-preview-controls')?.offsetHeight||60)+24;
    // Batch geometry reads. No layout reads inside the following write pass.
    const sizes=measuring?scenes.map(scene=>({scene,height:scene.card.offsetHeight})):[];
    const positions=[...active].map(scene=>({scene,host:scene.host.getBoundingClientRect(),card:scene.card.getBoundingClientRect(),gauges:scene.gauges.getBoundingClientRect()}));
    const measured=measuring;
    sizes.forEach(({scene,height})=>{
      scene.top=Math.max(minimumTop,Math.round((innerHeight-height)/2));
      scene.pinned=enabled && innerWidth>760 && height<=innerHeight-minimumTop-28;
      scene.armed=false; scene.armedGesture=intent;
      scene.host.classList.toggle('is-pinned',scene.pinned);
      scene.host.style.setProperty('--sc-scene-top',`${scene.top}px`);
      // Hold the centered card for the next separate gesture, without a long scrub.
      scene.host.style.height=scene.pinned?`${height+320}px`:'';
    }); measuring=false;
    let again=measured;
    positions.forEach(({scene,host,card,gauges})=>{
      const entry=enabled?ease((innerHeight-host.top)/Math.max(1,innerHeight-scene.top)):1;
      if(Math.abs(entry-scene.entry)>.0005) {
        scene.card.style.setProperty('--sc-entry-y',`${(12*(1-entry)).toFixed(2)}px`);
        scene.card.style.setProperty('--sc-entry-scale',(0.99+0.01*entry).toFixed(4));
        scene.card.classList.toggle('sc-entered',entry>.999); scene.entry=entry;
      }
      const readable=gauges.top>=minimumTop && gauges.bottom<=innerHeight-24;
      const centered=scene.pinned ? Math.abs(card.top-scene.top)<3 : readable && Math.abs((gauges.top+gauges.bottom)/2-(minimumTop+innerHeight)/2)<110;
      const wasArmed=scene.armed;
      if(centered && !scene.armed) { scene.armed=true; scene.armedGesture=intent; }
      if(scene.scroll!==scrollToken) {
        scene.scroll=scrollToken;
        if(scene.manual && scene.intent!==intent) scene.manual=false;
        if(enabled && readable && !scene.manual && (scene.armed || wasArmed) && intent!==scene.armedGesture) {
          const target=direction>0?1:0;
          if(target!==scene.target || (!scene.animating && Math.abs(scene.value-target)>.001)) start(scene,target,720,time);
        }
      }
      if(!centered) scene.armed=false;
      if(!enabled) { scene.animating=false; if(!scene.manual) scene.value=scene.target=1; }
      else if(scene.animating) {
        const p=clamp((time-scene.started)/scene.duration);
        scene.value=scene.from+(scene.target-scene.from)*ease(p);
        if(p<1) again=true; else scene.animating=false;
      }
      paint(scene.audit,scene.value);
    }); if(again) schedule();
  }
  function refresh() {
    observer.disconnect(); resize.disconnect(); active.clear();
    scenes.forEach(scene=>{
      scene.host.replaceWith(scene.card); scene.card.classList.remove('sc-motion-card','sc-entered');
      scene.card.style.removeProperty('--sc-entry-y'); scene.card.style.removeProperty('--sc-entry-scale');
    });
    scenes=[...root.querySelectorAll<HTMLElement>('.sc-audit')].flatMap(audit=>{
      const card=audit.closest<HTMLElement>('.cc-card,.sv-stack-card'); if(!card) return [];
      const host=document.createElement('div'); host.className='sc-scroll-scene';
      card.before(host); host.append(card); card.classList.add('sc-motion-card');
      const value=allowed()?0:1;
      return [{host,card,audit,gauges:audit.querySelector<HTMLElement>('.sc-gauges')!,top:84,pinned:false,value,from:value,target:value,started:0,duration:720,animating:false,manual:false,intent,scroll:scrollToken,entry:-1,armed:false,armedGesture:intent}];
    });
    scenes.forEach(scene=>{ paint(scene.audit,scene.value); observer.observe(scene.host); resize.observe(scene.card); });
    measuring=true; lastY=scrollY; schedule();
  }
  root.addEventListener('click',event=>{
    const button=(event.target as Element).closest<HTMLButtonElement>('[data-audit-phase]');
    const scene=scenes.find(item=>item.audit===button?.closest('.sc-audit')); if(!button || !scene) return;
    scene.manual=true; scene.intent=intent; scene.scroll=scrollToken;
    start(scene,button.dataset.auditPhase==='after'?1:0,360,performance.now()); schedule();
  });
  // These listeners only identify a fresh user gesture after a manual button choice.
  root.addEventListener('wheel',event=>{
    if(Math.abs(event.deltaY)<=1) return;
    const now=performance.now(),next=Math.sign(event.deltaY);
    if(now-lastWheel>180 || next!==wheelDirection) intent++;
    lastWheel=now; wheelDirection=next;
  },{passive:true});
  root.addEventListener('touchstart',()=>{ intent++; },{passive:true});
  root.addEventListener('keydown',event=>{
    if((event.target as Element).matches('input,select,textarea,[contenteditable=true]')) return;
    if(!event.repeat && ['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)) intent++;
  });
  addEventListener('scroll',()=>{
    const delta=scrollY-lastY; lastY=scrollY;
    if(Math.abs(delta)>2) { direction=Math.sign(delta); scrollToken++; }
    if(active.size && allowed()) schedule();
  },{passive:true});
  addEventListener('resize',()=>{ measuring=true; schedule(); },{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden) { cancelAnimationFrame(frame); frame=0; }
    else { measuring=true; schedule(); }
  });
  root.addEventListener('change',event=>{ if((event.target as Element).matches('#cc-pause,[data-motion-toggle]')) { measuring=true; schedule(); } });
  reduce.addEventListener('change',()=>{ measuring=true; schedule(); });
  root.addEventListener('service-card-content',refresh);
  refresh();
}
