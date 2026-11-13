import { cleanSupportChoice, recommendSupport, supportInquiryUrl, supportJobs, supportQuestions, type SupportChoice, type SupportPlanValue } from '../data/support-plans';

export function revealSupportTarget(target: HTMLElement, behavior: ScrollBehavior = 'instant') {
  const dialog = target.closest<HTMLDialogElement>('dialog');
  const surface = dialog?.querySelector<HTMLElement>('.support-modal-body');
  if (surface && dialog) {
    dialog.scrollTop = 0;
    surface.scrollTo({top:surface.scrollTop + target.getBoundingClientRect().top - surface.getBoundingClientRect().top,behavior});
  } else target.scrollIntoView({block:'start',behavior});
}

export function mountSupportFinder(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('#fit-form');
  if (!form) return;
  const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const steps = [...form.querySelectorAll<HTMLFieldSetElement>('.fit-step')];
  const stepButtons = [...form.querySelectorAll<HTMLButtonElement>('[data-step-go]')];
  const next = byId<HTMLButtonElement>('fit-next'), back = byId<HTMLButtonElement>('fit-back');
  const reset = byId<HTMLButtonElement>('fit-reset'), error = byId('fit-error');
  const result = byId('fit-result'), bar = byId<HTMLAnchorElement>('fit-bar');
  const base = root.dataset.base || '/';
  const store = 'grant-support-finder-v1';
  const small = matchMedia('(max-width: 640px)');
  let step = 0, ready = false, finderNear = false, comparisonNear = false, resultVisible = false;
  let answers: SupportChoice = {};
  const cards = [...document.querySelectorAll<HTMLElement>('.plan-card')];

  const syncBar = () => {
    bar.hidden = !(small.matches && ready && (finderNear || comparisonNear) && !resultVisible);
  };
  const read = () => {
    const values = new FormData(form);
    answers = cleanSupportChoice({ workload: values.get('workload'), focus: values.get('focus'), response: values.get('response'), jobs: values.getAll('job') });
  };
  const save = () => {
    try { sessionStorage.setItem(store, JSON.stringify({ ...answers, step, ready })); } catch { /* The finder also works without storage. */ }
  };
  const announce = (text: string) => { byId('fit-live').textContent = text; };
  const clearError = () => {
    error.hidden = true;
    steps.forEach((fieldset, index) => {
      fieldset.removeAttribute('aria-invalid');
      fieldset.setAttribute('aria-describedby', `fit-help-${supportQuestions[index].id}`);
    });
  };
  const renderResult = () => {
    const recommendation = ready ? recommendSupport(answers) : null;
    result.dataset.ready = String(Boolean(recommendation));
    byId('fit-pending').hidden = Boolean(recommendation);
    byId('fit-match').hidden = !recommendation;
    for (const question of supportQuestions) {
      const option = question.options.find(item => item.id === answers[question.id]);
      root.querySelector<HTMLElement>(`[data-answer-preview="${question.id}"]`)!.textContent = option?.label || 'Choose an answer';
    }
    const selected = supportJobs.filter(job => answers.jobs?.includes(job.id));
    const low = selected.reduce((sum, job) => sum + job.low, 0), high = selected.reduce((sum, job) => sum + job.high, 0);
    byId('fit-task-count').textContent = selected.length ? `${selected.length} selected · ${low}–${high} h` : 'none selected';
    for (const card of cards) {
      const picked = card.dataset.plan === recommendation?.id;
      card.classList.toggle('is-pick', picked);
      card.querySelector<HTMLElement>('.plan-pick')!.hidden = !picked;
      const link = card.querySelector<HTMLAnchorElement>('.plan-cta')!;
      const value = ({ basic: '20', medium: '40', large: '80' } as Record<string, SupportPlanValue>)[card.dataset.plan!];
      link.href = supportInquiryUrl(base, value, ready ? answers : undefined);
    }
    const vip = byId('support-vip');
    vip.classList.toggle('is-pick', recommendation?.id === 'vip');
    vip.querySelector<HTMLAnchorElement>('a')!.href = supportInquiryUrl(base, 'vip', ready ? answers : undefined);
    if (recommendation) {
      byId('fit-result-title').textContent = recommendation.name;
      byId('fit-capacity').textContent = recommendation.capacity;
      byId('fit-reply').textContent = recommendation.reply;
      byId('fit-reasons').replaceChildren(...recommendation.reasons.map(reason => {
        const item = document.createElement('li'); item.textContent = reason; return item;
      }));
      const total = byId('fit-job-total');
      total.hidden = !selected.length;
      total.textContent = `Your ${selected.length === 1 ? 'selected job' : `${selected.length} selected jobs`}: roughly ${low}–${high} hours, to be reviewed with Grant.`;
      byId<HTMLAnchorElement>('fit-cta').href = supportInquiryUrl(base, recommendation.value, answers);
      byId('fit-cta-label').textContent = `Continue with ${recommendation.name}`;
      byId('fit-bar-plan').textContent = recommendation.name;
      byId('fit-bar-capacity').textContent = recommendation.value === 'vip' ? 'Dedicated support' : `${recommendation.value} hours a month`;
    }
    syncBar();
    return recommendation;
  };
  const render = () => {
    steps.forEach((fieldset, index) => { fieldset.hidden = index !== step; });
    const firstMissing = supportQuestions.findIndex(question => !answers[question.id]);
    stepButtons.forEach((button, index) => {
      button.disabled = firstMissing >= 0 && index > firstMissing;
      if (index === step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    back.disabled = step === 0;
    next.firstChild!.textContent = step === steps.length - 1 ? 'Show my recommendation ' : 'Continue ';
    renderResult();
    save();
  };
  const focusStep = () => {
    const legend = steps[step].querySelector('legend')!;
    legend.tabIndex = -1;
    legend.focus({ preventScroll: true });
    const top = form.getBoundingClientRect().top;
    if (top < 20 || top > innerHeight * .45) revealSupportTarget(form,matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  };
  const go = (index: number) => { step = index; clearError(); render(); focusStep(); };

  // Restore only known option IDs; no personal/contact details are stored here.
  try {
    const saved = JSON.parse(sessionStorage.getItem(store) || 'null');
    answers = cleanSupportChoice(saved);
    ready = saved?.ready === true && Boolean(recommendSupport(answers));
    const firstMissing = supportQuestions.findIndex(question => !answers[question.id]);
    step = Number.isInteger(saved?.step) ? Math.max(0, Math.min(2, saved.step)) : 0;
    if (firstMissing >= 0) step = Math.min(step, firstMissing);
    for (const input of form.querySelectorAll<HTMLInputElement>('input')) {
      input.checked = input.name === 'job' ? Boolean(answers.jobs?.includes(input.value)) : answers[input.name as 'workload' | 'focus' | 'response'] === input.value;
    }
  } catch { answers = {}; }

  form.querySelector<HTMLElement>('.fit-progress')!.hidden = false;
  form.querySelector<HTMLElement>('.fit-controls')!.hidden = false;
  reset.hidden = false;
  stepButtons.forEach((button, index) => button.addEventListener('click', () => go(index)));
  back.addEventListener('click', () => go(Math.max(0, step - 1)));
  form.addEventListener('change', () => {
    read(); clearError(); render();
    if (ready) {
      const recommendation = recommendSupport(answers);
      if (recommendation) announce(`Suggested plan: ${recommendation.name}. ${recommendation.capacity}.`);
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault(); read();
    if (!answers[supportQuestions[step].id]) {
      error.textContent = 'Choose an answer to continue.'; error.hidden = false;
      steps[step].setAttribute('aria-invalid', 'true');
      steps[step].setAttribute('aria-describedby', `fit-help-${supportQuestions[step].id} fit-error`);
      steps[step].querySelector<HTMLInputElement>('input')!.focus();
      return;
    }
    if (step < steps.length - 1) { go(step + 1); return; }
    ready = true; clearError(); render();
    const recommendation = recommendSupport(answers)!;
    announce(`Suggested plan: ${recommendation.name}. ${recommendation.capacity}.`);
    // Showing an answer is a focus change, so reveal its title immediately.
    // It must also work when animation frames are throttled in a background tab.
    revealSupportTarget(result);
    byId('fit-result-title').focus({ preventScroll: true });
  });
  reset.addEventListener('click', () => {
    form.reset(); step = 0; ready = false; answers = {};
    const jobs = form.querySelector<HTMLDetailsElement>('.fit-jobs'); if (jobs) jobs.open = false;
    clearError(); render(); announce('Answers reset. Start with your workload.'); focusStep();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { finderNear = entry.isIntersecting; syncBar(); }).observe(root);
    new IntersectionObserver(([entry]) => { comparisonNear = entry.isIntersecting; syncBar(); }).observe(byId('compare'));
    new IntersectionObserver(([entry]) => { resultVisible = entry.isIntersecting && entry.intersectionRatio >= .15; syncBar(); }, { threshold: [0, .15] }).observe(result);
  }
  small.addEventListener('change', syncBar);
  render();
}
