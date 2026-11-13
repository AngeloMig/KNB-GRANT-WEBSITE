import { mountStackLayout } from './stack-layout';
import { mountServiceCardMedia } from './service-card-media';
export function mountServicesStack(root:HTMLElement) {
  if(root.dataset.stackReady) return; root.dataset.stackReady='true';
  const reduce=matchMedia('(prefers-reduced-motion:reduce)'),wide=matchMedia('(min-width:761px) and (min-height:651px)');
  const cards=[...root.querySelectorAll<HTMLElement>('.sv-stack-card')];
  let visible=false,frame=0;
  const update=()=>{
    frame=0; if(!visible || document.hidden) return;
    const enabled=!reduce.matches && wide.matches;
    const rects=enabled?cards.map(card=>card.getBoundingClientRect()):[];
    const values=cards.map((_,i)=>enabled && rects[i+1]?Math.min(1,Math.max(0,(rects[i].bottom-rects[i+1].top)/rects[i].height)):0);
    cards.forEach((card,i)=>{ if(!card.classList.contains('sc-motion-card')) card.style.setProperty('--p',values[i].toFixed(3)); });
  };
  const schedule=()=>{ if(!frame && visible && !document.hidden) frame=requestAnimationFrame(update); };
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)schedule();}).observe(root);
  addEventListener('scroll',()=>{ if(wide.matches && !reduce.matches) schedule(); },{passive:true}); addEventListener('resize',schedule,{passive:true});
  document.addEventListener('visibilitychange',schedule); reduce.addEventListener('change',schedule); wide.addEventListener('change',schedule);
  mountStackLayout(root);
  mountServiceCardMedia(root);
}
