import { arrowMarkup } from '../utils/arrow';
import { mountStackLayout } from './stack-layout';
import { serviceMediaMarkup, serviceCopyMarkup, mountServiceCardMedia } from './service-card-media';

type Shot = { name: string; src: string; small: string; phone: string; hue: number };
type Service = { name: string; short: string; text: string; mobileText?: string; tags: string; href: string; shots: Shot[] };

export function mountServicesPreview(page: HTMLElement) {
  if (page.dataset.ready) return;
  page.dataset.ready = 'true';
  const services: Service[] = JSON.parse(page.dataset.services!);
  const boxes = [...page.querySelectorAll<HTMLElement>('.sv-demo')];
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const compact = matchMedia('(max-width: 760px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = page.querySelector<HTMLInputElement>('[data-motion-toggle]')!;
  let paused = false, frame = 0;
  const fine = () => pointer.matches && !compact.matches;
  const motion = () => !paused && !reduce.matches;
  const visible = new Set<HTMLElement>();
  const tasks = new Map<HTMLElement, () => boolean>();
  const prefs = new Set<() => void>();
  const n2 = (i: number) => String(i + 1).padStart(2, '0');
  const esc = (value: string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
  const action = (s: Service) => s.short === 'Support' ? 'Compare support plans' : s.short === 'Migrations & SEO' ? 'Get a free website audit' : 'Start a project';
  const img = (src: string, cls = '') => `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" decoding="async" draggable="false" width="${src.includes('mobile') ? 440 : 960}" height="${src.includes('mobile') ? 956 : 600}"/>`;
  const rows = (extra: (s: Service, i: number) => string = () => '') => `<div class="sv-list">${services.map((s,i) => `<a class="sv-row" href="${esc(s.href)}" data-i="${i}"><span class="sv-n">${n2(i)}</span><h3>${esc(s.name)}</h3><div class="sv-copy"><p>${esc(s.text)}</p><small>${esc(s.tags)}</small></div><i class="sv-arrow" aria-hidden="true">${arrowMarkup(true)}</i>${extra(s,i)}</a>`).join('')}</div>`;
  const swap = (images: HTMLElement[], i: number) => {
    const current = images.find(image => image.classList.contains('on'));
    if (!images[i] || current === images[i]) return;
    images.forEach(image => image.classList.remove('was'));
    if (current) {
      current.classList.remove('on'); current.classList.add('was');
      window.setTimeout(() => current.classList.remove('was'),650);
    }
    images[i].classList.add('on');
  };
  const tick = () => {
    frame = 0;
    tasks.forEach((step,box) => {
      if (!motion() || !fine() || document.hidden || !visible.has(box) || !step()) tasks.delete(box);
    });
    if (tasks.size) frame = requestAnimationFrame(tick);
  };
  const wake = (box: HTMLElement, step: () => boolean) => {
    if (!motion() || !fine() || document.hidden || !visible.has(box)) return;
    tasks.set(box,step);
    if (!frame) frame = requestAnimationFrame(tick);
  };
  const syncPrefs = () => {
    page.classList.toggle('is-still',!motion());
    page.classList.toggle('is-compact',compact.matches);
    page.classList.toggle('is-touch',!fine());
    page.classList.toggle('is-hidden',document.hidden);
    toggle.checked = paused || reduce.matches;
    toggle.disabled = reduce.matches;
    if (!motion() || document.hidden) { cancelAnimationFrame(frame); frame = 0; tasks.clear(); }
    prefs.forEach(sync => sync());
  };
  toggle.parentElement!.hidden = false;
  toggle.addEventListener('change',() => { paused = toggle.checked; syncPrefs(); });
  [pointer,compact,reduce].forEach(query => query.addEventListener('change',syncPrefs));
  document.addEventListener('visibilitychange',syncPrefs);

  // 1: cursor-follow image. No idle or off-screen animation loop.
  {
    const box = boxes[0];
    box.innerHTML = `${rows(s => img(s.shots[0].small,'sv-thumb'))}<div class="sv-float" aria-hidden="true">${services.map(s => img(s.shots[0].src)).join('')}</div>`;
    const float = box.querySelector<HTMLElement>('.sv-float')!;
    const images = [...float.querySelectorAll<HTMLElement>('img')];
    let x = 0,y = 0,tx = 0,ty = 0,rotation = 0,entered = false;
    const step = () => {
      const dx = tx - x,dy = ty - y;
      x += dx * .15; y += dy * .15;
      rotation += (Math.max(-8,Math.min(8,dx * .2)) - rotation) * .15;
      float.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rotation.toFixed(2)}deg)`;
      return Math.abs(dx) + Math.abs(dy) + Math.abs(rotation) > .2;
    };
    box.addEventListener('pointermove',event => {
      if (!fine() || event.pointerType === 'touch') return;
      const r = box.getBoundingClientRect();
      tx = Math.max(0,Math.min(r.width - 360,event.clientX - r.left)); ty = event.clientY - r.top;
      if (!entered) { x = tx; y = ty; entered = true; }
      wake(box,step);
    });
    box.querySelectorAll<HTMLElement>('.sv-row').forEach(row => row.addEventListener('pointerenter',event => {
      if (!fine() || !motion() || event.pointerType === 'touch') return;
      swap(images,Number(row.dataset.i)); float.classList.add('on');
    }));
    box.querySelector('.sv-list')!.addEventListener('pointerleave',() => { float.classList.remove('on'); entered = false; });
    prefs.add(() => { if (!fine() || !motion()) float.classList.remove('on'); });
  }
  // 2: one accessible accordion, with collapsed links removed from keyboard navigation.
  {
    const box = boxes[1];
    box.innerHTML = services.map((s,i) => `<div class="sv-acc${i === 0 ? ' on' : ''}"><button type="button" class="sv-acc-head" id="sv-acc-${i}" aria-controls="sv-acc-body-${i}" aria-expanded="${i === 0}"><span class="sv-n">${n2(i)}</span><span class="sv-service-name">${esc(s.name)}</span><small>${esc(s.tags)}</small><i aria-hidden="true"></i></button><div class="sv-acc-body" id="sv-acc-body-${i}" role="region" aria-labelledby="sv-acc-${i}"><div class="sv-acc-inner"><div class="sv-acc-text"><p>${esc(s.text)}</p><a href="${esc(s.href)}">${action(s)} ${arrowMarkup(true)}</a></div><div class="sv-acc-shots">${s.shots.map((shot,k) => `<figure style="--k:${k}">${img(shot.small)}<figcaption>${esc(shot.name)}</figcaption></figure>`).join('')}</div></div></div></div>`).join('');
    const items = [...box.querySelectorAll<HTMLElement>('.sv-acc')];
    const open = (i: number) => items.forEach((item,k) => {
      const on = k === i,body = item.querySelector<HTMLElement>('.sv-acc-body')!;
      item.classList.toggle('on',on); item.querySelector('button')!.setAttribute('aria-expanded',String(on));
      body.inert = !on; body.setAttribute('aria-hidden',String(!on));
    });
    items.forEach((item,i) => {
      item.querySelector('button')!.addEventListener('click',() => open(item.classList.contains('on') ? -1 : i));
      item.addEventListener('pointerenter',event => { if (fine() && event.pointerType !== 'touch') open(i); });
    });
    open(0);
  }
  // 3: pinned laptop and readable service descriptions.
  {
    const box = boxes[2];
    box.innerHTML = `<div class="sv-pin-list">${services.map((s,i) => `<div class="sv-pin-item${i === 0 ? ' on' : ''}" data-i="${i}"><span class="sv-n">${n2(i)}</span><h3>${esc(s.name)}</h3><p>${esc(s.text)}</p><small>${esc(s.tags)}</small><a href="${esc(s.href)}">${action(s)} ${arrowMarkup(true)}</a></div>`).join('')}</div><div class="sv-pin-stage"><div class="sv-laptop"><div class="sv-screen">${services.map((s,i) => img(s.shots[0].src,i === 0 ? 'on' : '')).join('')}</div><span class="sv-laptop-base"></span></div><p class="sv-pin-count"><b>01</b> / ${n2(services.length - 1)} <span>${esc(services[0].shots[0].name)}</span></p></div>`;
    const items = [...box.querySelectorAll<HTMLElement>('.sv-pin-item')];
    const images = [...box.querySelectorAll<HTMLElement>('.sv-screen img')];
    const count = box.querySelector<HTMLElement>('.sv-pin-count')!;
    const set = (i: number) => {
      items.forEach((item,k) => item.classList.toggle('on',k === i)); swap(images,i);
      count.querySelector('b')!.textContent = n2(i); count.querySelector('span')!.textContent = services[i].shots[0].name;
    };
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) set(Number((entry.target as HTMLElement).dataset.i)); }),{rootMargin:'-40% 0px -40% 0px'});
    items.forEach((item,i) => { observer.observe(item); item.addEventListener('focusin',() => set(i)); });
  }
  // 4: directional fill, also available on keyboard focus.
  {
    const box = boxes[3];
    box.innerHTML = rows(s => `<span class="sv-fill"></span><span class="sv-fan" aria-hidden="true">${s.shots.map(shot => img(shot.small)).join('')}</span>`);
    box.querySelectorAll<HTMLElement>('.sv-row').forEach(row => {
      const fill = row.querySelector<HTMLElement>('.sv-fill')!;
      const side = (event: PointerEvent) => event.clientY < row.getBoundingClientRect().top + row.clientHeight / 2 ? '0%' : '100%';
      row.addEventListener('pointerenter',event => { if (!fine() || event.pointerType === 'touch') return; fill.style.transformOrigin = `50% ${side(event)}`; row.classList.add('is-in'); });
      row.addEventListener('pointerleave',event => { fill.style.transformOrigin = `50% ${side(event)}`; row.classList.remove('is-in'); });
      row.addEventListener('focus',() => row.classList.add('is-in'));
      row.addEventListener('blur',() => row.classList.remove('is-in'));
    });
  }
  // 5: marquee preview on first phone tap; the next tap follows the service link.
  {
    const box = boxes[4];
    box.innerHTML = `<p class="sv-touch-help">Tap once to preview; tap the same row again to open it. Use “Pause animations” to keep the preview still.</p>${rows(s => { const part = s.shots.map(shot => `<b>${esc(s.name)}</b>${img(shot.small)}`).join(''); return `<span class="sv-mq" style="--hue:${s.shots[0].hue}" aria-hidden="true"><span class="sv-mq-track">${part}${part}</span></span>`; })}`;
    box.querySelectorAll<HTMLElement>('.sv-row').forEach(row => row.addEventListener('click',event => {
      if (fine() || row.classList.contains('is-in')) return;
      event.preventDefault(); box.querySelectorAll('.sv-row').forEach(other => other.classList.toggle('is-in',other === row));
    }));
  }
  // 6: native buttons select columns; enquiry links are independent actions.
  {
    const box = boxes[5];
    box.innerHTML = `<div class="sv-cols">${services.map((s,i) => `<article class="sv-col${i === 0 ? ' on' : ''}">${img(s.shots[0].src)}<button type="button" class="sv-col-trigger" aria-label="Preview ${esc(s.name)}" aria-expanded="${i === 0}" aria-controls="sv-col-body-${i}"><span class="sv-col-label"><i>${n2(i)}</i>${esc(s.short)}</span></button><div class="sv-col-body" id="sv-col-body-${i}"><h3>${esc(s.name)}</h3><p>${esc(s.text)}</p><small>${esc(s.tags)}</small><a href="${esc(s.href)}">${action(s)} ${arrowMarkup(true)}</a></div></article>`).join('')}</div>`;
    const columns = [...box.querySelectorAll<HTMLElement>('.sv-col')];
    const set = (i: number) => columns.forEach((column,k) => {
      column.classList.toggle('on',k === i); column.querySelector('button')!.setAttribute('aria-expanded',String(k === i));
      const body = column.querySelector<HTMLElement>('.sv-col-body')!; body.inert = k !== i; body.setAttribute('aria-hidden',String(k !== i));
    });
    columns.forEach((column,i) => {
      const trigger = column.querySelector('button')!;
      trigger.addEventListener('click',() => set(i)); trigger.addEventListener('focus',() => set(i));
      column.addEventListener('pointerenter',event => { if (fine() && event.pointerType !== 'touch') set(i); });
    });
    set(0);
  }
  // 7: complete tab semantics, explicit autoplay, and no double advance from pseudo-element events.
  {
    const box = boxes[6];
    box.innerHTML = `<div class="sv-tab-controls"><p>Choose a service, or play the guided preview.</p><button type="button" class="sv-tab-play"></button></div><div class="sv-tabs" role="tablist" aria-label="Service previews">${services.map((s,i) => `<button type="button" role="tab" id="sv-tab-${i}" aria-controls="sv-panel-${i}" class="sv-tab${i === 0 ? ' on' : ''}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><span>${n2(i)}</span>${esc(s.short)}<i aria-hidden="true"></i></button>`).join('')}</div><div class="sv-panels">${services.map((s,i) => `<div class="sv-panel${i === 0 ? ' on' : ''}" role="tabpanel" id="sv-panel-${i}" aria-labelledby="sv-tab-${i}" style="--hue:${s.shots[0].hue}"><div class="sv-panel-text"><h3>${esc(s.name)}</h3><p>${esc(s.text)}</p><small>${esc(s.tags)}</small><a href="${esc(s.href)}">${action(s)} ${arrowMarkup(true)}</a></div><div class="sv-panel-media">${img(s.shots[0].src,'sv-panel-desk')}${img(s.shots[0].phone,'sv-panel-phone')}</div></div>`).join('')}</div>`;
    const tabs = [...box.querySelectorAll<HTMLButtonElement>('.sv-tab')];
    const panels = [...box.querySelectorAll<HTMLElement>('.sv-panel')];
    const play = box.querySelector<HTMLButtonElement>('.sv-tab-play')!;
    let playing = fine(),hovered = false,chosen = false;
    const sync = () => {
      const focus = document.activeElement?.closest('.sv-tabs,.sv-panels');
      box.classList.toggle('is-paused',!playing || !motion() || hovered || Boolean(focus && box.contains(focus)) || document.hidden);
      play.textContent = playing ? 'Pause autoplay' : 'Play autoplay'; play.hidden = reduce.matches; play.disabled = !motion();
    };
    const set = (i: number) => {
      tabs.forEach((tab,k) => { tab.classList.toggle('on',k === i); tab.setAttribute('aria-selected',String(k === i)); tab.tabIndex = k === i ? 0 : -1; });
      panels.forEach((panel,k) => { panel.classList.toggle('on',k === i); panel.inert = k !== i; panel.setAttribute('aria-hidden',String(k !== i)); });
    };
    const choose = (i: number) => { chosen = true; playing = false; set(i); sync(); };
    tabs.forEach((tab,i) => {
      tab.addEventListener('click',() => choose(i));
      tab.addEventListener('keydown',event => {
        const target = event.key === 'ArrowRight' ? (i + 1) % tabs.length : event.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
        if (target < 0) return;
        event.preventDefault(); choose(target); tabs[target].focus({preventScroll:true});
        const strip = box.querySelector<HTMLElement>('.sv-tabs')!;
        if (strip.scrollWidth > strip.clientWidth) strip.scrollTo({left:tabs[target].offsetLeft - strip.clientWidth / 2 + tabs[target].offsetWidth / 2,behavior:motion() ? 'smooth' : 'instant'});
      });
      tab.querySelector('i')!.addEventListener('animationend',event => { if (event.animationName === 'sv-tick' && tab.classList.contains('on') && playing && motion() && !box.classList.contains('is-paused')) set((i + 1) % tabs.length); });
    });
    play.addEventListener('click',() => { chosen = true; playing = !playing; sync(); });
    [box.querySelector('.sv-tabs')!,box.querySelector('.sv-panels')!].forEach(area => {
      area.addEventListener('pointerenter',() => { hovered = fine(); sync(); }); area.addEventListener('pointerleave',() => { hovered = false; sync(); });
    });
    box.addEventListener('focusin',sync); box.addEventListener('focusout',() => queueMicrotask(sync));
    prefs.add(() => { if (!fine() && !chosen) playing = false; hovered = false; sync(); });
    set(0); sync();
  }
  // 8: image-filled letters remain readable; pointer, keyboard and phone-scroll choices agree.
  {
    const box = boxes[7];
    box.innerHTML = `<div class="sv-bigs">${services.map((s,i) => `<a class="sv-big" href="${esc(s.href)}" data-i="${i}" style="background-image:url('${esc(s.shots[0].src)}')"><span>${n2(i)}</span>${esc(s.short)}</a>`).join('')}</div><div class="sv-big-cap"><h3></h3><p></p><small></small></div>`;
    const names = [...box.querySelectorAll<HTMLElement>('.sv-big')],caption = box.querySelector<HTMLElement>('.sv-big-cap')!;
    const set = (i: number) => {
      box.classList.add('has-on'); names.forEach((name,k) => name.classList.toggle('on',k === i));
      caption.querySelector('h3')!.textContent = services[i].name; caption.querySelector('p')!.textContent = services[i].text; caption.querySelector('small')!.textContent = services[i].tags; caption.classList.add('in');
    };
    names.forEach((name,i) => { name.addEventListener('pointerenter',() => { if (fine()) set(i); }); name.addEventListener('focus',() => set(i)); });
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (!fine() && entry.isIntersecting) set(Number((entry.target as HTMLElement).dataset.i)); }),{rootMargin:'-40% 0px -40% 0px'});
    names.forEach(name => observer.observe(name)); set(0);
  }
  // 9: read all positions, then write; no work while this stack is off-screen.
  {
    const box = boxes[8];
    box.innerHTML = services.map((s,i) => `<div class="sv-stack-card${i > 2 ? ' sv-stack-detail' : ''}" style="--i:${i};--hue:${s.shots[0].hue}"><div class="sv-stack-inner"><span class="sv-stack-word" aria-hidden="true">${esc(s.short)}</span><div class="sv-stack-text"><h3>${esc(s.name)}</h3>${serviceCopyMarkup(s)}<small>${esc(s.tags)}</small><a href="${esc(s.href)}">${action(s)} ${arrowMarkup(true)}</a></div><div class="sv-stack-media">${i > 2 ? serviceMediaMarkup(s) : img(s.shots[0].src)}</div></div></div>`).join('');
    mountStackLayout(box);
    const cards = [...box.querySelectorAll<HTMLElement>('.sv-stack-card')]; let queued = false;
    const update = () => {
      queued = false; if (!motion() || compact.matches || !visible.has(box)) return;
      const rects = cards.map(card => card.getBoundingClientRect());
      const values = rects.map((r,i) => rects[i+1] ? Math.min(1,Math.max(0,(r.bottom - rects[i+1].top) / r.height)) : 0);
      cards.forEach((card,i) => card.style.setProperty('--p',values[i].toFixed(3)));
    };
    addEventListener('scroll',() => { if (!queued && motion() && !compact.matches && visible.has(box)) { queued = true; requestAnimationFrame(update); } },{passive:true});
    prefs.add(() => { if (!motion()) cards.forEach(card => card.style.setProperty('--p','0')); });
  }
  // 10: preview selectors and a separate, honest CTA work on touch and keyboard.
  {
    const box = boxes[9];
    box.innerHTML = `<div class="sv-spot"><div class="sv-spot-imgs" aria-hidden="true">${services.map((s,i) => img(s.shots[0].src,i === 0 ? 'on' : '')).join('')}</div><div class="sv-list">${services.map((s,i) => `<div class="sv-spot-item"><button type="button" class="sv-row${i === 0 ? ' is-in' : ''}" data-i="${i}" aria-label="Preview ${esc(s.name)}" aria-expanded="${i === 0}" aria-controls="sv-spot-action-${i}"><span class="sv-n">${n2(i)}</span><span class="sv-service-name">${esc(s.name)}</span><span class="sv-copy"><span class="sv-description">${esc(s.text)}</span><small>${esc(s.tags)}</small></span><i class="sv-arrow" aria-hidden="true">${i === 0 ? '−' : '+'}</i></button><a class="sv-spot-cta" id="sv-spot-action-${i}" href="${esc(s.href)}"${i ? ' hidden' : ''}>${action(s)} ${arrowMarkup(true)}</a></div>`).join('')}</div></div>`;
    const spot = box.querySelector<HTMLElement>('.sv-spot')!,layer = box.querySelector<HTMLElement>('.sv-spot-imgs')!;
    const images = [...layer.querySelectorAll<HTMLElement>('img')],buttons = [...box.querySelectorAll<HTMLButtonElement>('.sv-row')];
    let x = 0,y = 0,tx = 0,ty = 0,radius = 0,targetRadius = 0;
    const draw = () => { layer.style.setProperty('--mx',`${x.toFixed(1)}px`); layer.style.setProperty('--my',`${y.toFixed(1)}px`); layer.style.setProperty('--r',`${radius.toFixed(1)}px`); };
    const step = () => { const delta = Math.abs(tx-x) + Math.abs(ty-y) + Math.abs(targetRadius-radius); x += (tx-x)*.16; y += (ty-y)*.16; radius += (targetRadius-radius)*.14; draw(); return delta > .2; };
    const set = (i: number) => {
      swap(images,i); buttons.forEach((button,k) => { button.classList.toggle('is-in',k === i); button.setAttribute('aria-expanded',String(k === i)); button.querySelector('.sv-arrow')!.textContent = k === i ? '−' : '+'; });
      box.querySelectorAll<HTMLAnchorElement>('.sv-spot-cta').forEach((link,k) => { link.hidden = k !== i; });
    };
    spot.addEventListener('pointermove',event => { if (!fine() || event.pointerType === 'touch') return; const rect = spot.getBoundingClientRect(); tx = event.clientX-rect.left; ty = event.clientY-rect.top; targetRadius = 220; wake(box,step); });
    spot.addEventListener('pointerenter',event => { if (!fine() || event.pointerType === 'touch') return; const rect = spot.getBoundingClientRect(); x = tx = event.clientX-rect.left; y = ty = event.clientY-rect.top; targetRadius = 220; wake(box,step); });
    spot.addEventListener('pointerleave',() => { targetRadius = 0; wake(box,step); });
    buttons.forEach((button,i) => {
      button.addEventListener('click',() => set(i)); button.addEventListener('pointerenter',event => { if (fine() && event.pointerType !== 'touch') set(i); });
      button.addEventListener('focus',() => { set(i); const parent = spot.getBoundingClientRect(),rect = button.getBoundingClientRect(); x = tx = rect.left-parent.left+rect.width/2; y = ty = rect.top-parent.top+rect.height/2; radius = targetRadius = 220; draw(); });
    });
    prefs.add(() => { spot.classList.toggle('is-touch',!fine()); if (!motion() || !fine()) { radius = targetRadius = 0; draw(); } });
  }
  mountServiceCardMedia(page);
  syncPrefs();
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    const box = entry.target as HTMLElement;
    box.classList.toggle('is-off',!entry.isIntersecting);
    if (entry.isIntersecting) visible.add(box); else { visible.delete(box); tasks.delete(box); }
  }));
  boxes.forEach(box => { box.classList.add('is-off'); observer.observe(box); });
}
