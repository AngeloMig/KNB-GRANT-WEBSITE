/** Tall phone cards finish scrolling their content before joining the stack. */
export function mountStackLayout(root:HTMLElement) {
  if(root.dataset.stackLayout) return; root.dataset.stackLayout='true';
  const cards=[...root.querySelectorAll<HTMLElement>('.sv-stack-card')];
  const compact=matchMedia('(max-width:760px)');
  let frame=0;
  const measure=()=>{
    frame=0;
    const heights=compact.matches?cards.map(card=>card.offsetHeight):[];
    cards.forEach((card,index)=>{
      if(!compact.matches) { card.style.removeProperty('--mobile-stack-top'); return; }
      // Reserve space for the fixed estimate/navigation controls at the bottom.
      const top=Math.min(24+index*8,innerHeight-heights[index]-88);
      card.style.setProperty('--mobile-stack-top',`${Math.round(top)}px`);
    });
  };
  const schedule=()=>{ if(!frame && !document.hidden) frame=requestAnimationFrame(measure); };
  const observer=new ResizeObserver(schedule); cards.forEach(card=>observer.observe(card));
  addEventListener('resize',schedule,{passive:true}); compact.addEventListener('change',schedule);
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) { cancelAnimationFrame(frame); frame=0; } else schedule(); });
  schedule();
}
