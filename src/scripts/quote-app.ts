// Quote builder page: dashboard, editor, options, invoices, business profile.
import { steps, estimate, type Answers } from '../data/estimator';
import { readPayload } from '../data/payload';
import { quoteLines, teamLines, TEAM_LINE_IDS, parseBrief, formatMoney, projectTitle, LINE_PRESETS, phaseTotals, type QuoteLine } from '../data/pricing';
import {
  STATUSES, addDays, billedOption, currentQuoteId, dashboardStats, freshQuote, imageToDataUrl, isDefaultSchedule, loadLibrary, loadProfile, loadQuotes,
  canPhase, dateFit, margin, migrate, newOption, newQuoteNumber, nextInvoiceNumber, niceDate, optionKind, optionPlan, optionTimeline, optionTotals, quoteEmail, saveLibrary,
  saveProfile, saveQuotes, saveSettings, setCurrentQuoteId, today, uid, validUntil, type Invoice, type LibraryItem, type Profile, type QuoteOption, type QuoteState, type Status,
} from '../data/quote-model';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
/** Creates an element with properties and children. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

let quotes = loadQuotes();
let profile = loadProfile();
let library = loadLibrary();
const startId = currentQuoteId();
let state: QuoteState = startId && quotes[startId] ? quotes[startId] : freshQuote();
let view: 'dashboard' | 'editor' = Object.keys(quotes).length ? 'dashboard' : 'editor';
let filter: 'all' | Status = 'all';

const opt = () => state.options[state.active];
const money = (n: number, currency = state.settings.currency) => formatMoney(n, currency);
const hasContent = (q: QuoteState) => q.options.some((o) => o.lines.length) || Boolean(q.client.name || q.client.company || q.answers.type);

/* ---------- Saving ---------- */
let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    state.savedAt = Date.now();
    if (hasContent(state)) quotes[state.id] = state; else delete quotes[state.id];
    if (!saveQuotes(quotes)) toast('Couldn’t save: browser storage is full. Back up and delete old quotes.', true);
    setCurrentQuoteId(state.id);
    saveSettings(state.settings);
  }, 250);
}

/* ---------- Small helpers ---------- */
function iconButton(text: string, label: string, onClick: () => void, extra = '') {
  const b = el('button', { type: 'button', className: `q-icon ${extra}`.trim(), textContent: text, title: label });
  b.setAttribute('aria-label', label);
  b.addEventListener('click', onClick);
  return b;
}
function status(text: string, error = false) { const s = $('#q-status'); s.textContent = text; s.classList.toggle('is-error', error); }
let toastTimer = 0;
function toast(text: string, error = false) {
  let t = document.querySelector<HTMLElement>('.q-toast');
  if (!t) { t = el('div', { className: 'q-toast', role: 'status' }); document.body.append(t); }
  t.textContent = text;
  t.classList.toggle('is-error', error);
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t!.classList.remove('is-on'), 2600);
}

/* ---------- Views ---------- */
function setView(next: 'dashboard' | 'editor') {
  view = next;
  $('#v-dashboard').hidden = next !== 'dashboard';
  $('#v-editor').hidden = next !== 'editor';
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.view === next)));
  $('#q-mobile-bar').hidden = next !== 'editor';
  if (next === 'dashboard') renderDashboard(); else renderEditor();
  window.scrollTo({ top: 0 });
}
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view as 'dashboard' | 'editor')));

/* ---------- Dashboard ---------- */
function renderDashboard() {
  const all = Object.values(quotes).sort((a, b) => b.savedAt - a.savedAt);
  const stats = dashboardStats(all);
  const currency = all[0]?.settings.currency ?? state.settings.currency;
  const tiles: [string, string, string][] = [
    ['Awaiting reply', money(stats.awaiting.value, currency), `${stats.awaiting.count} sent quote${stats.awaiting.count === 1 ? '' : 's'}`],
    ['Accepted this month', money(stats.acceptedThisMonth, currency), new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })],
    ['Follow-ups due', String(stats.followUps), 'Sent quotes to chase today'],
    ['Expiring soon', String(stats.expiring), 'Sent quotes, next 7 days'],
    ['Unpaid invoices', money(stats.unpaid, currency), 'Across all quotes'],
  ];
  const statsBox = $('#q-stats');
  statsBox.replaceChildren(...tiles.map(([label, value, note]) => el('div', { className: 'q-stat' }, el('span', { textContent: label }), el('strong', { textContent: value }), el('small', { textContent: note }))));

  const term = ($<HTMLInputElement>('#q-search').value || '').trim().toLowerCase();
  const shown = all.filter((q) => (filter === 'all' || q.status === filter) && (!term || [q.client.name, q.client.company, q.project.title, q.meta.number].join(' ').toLowerCase().includes(term)));
  const list = $('#q-list');
  if (!all.length) {
    list.replaceChildren(el('div', { className: 'q-dash-empty' }, el('strong', { textContent: 'No quotes yet' }), el('span', { textContent: 'Start one from a client’s estimate PDF.' }), Object.assign(el('button', { type: 'button', className: 'q-btn', textContent: 'New quote' }), { onclick: () => newQuote() })));
    return;
  }
  if (!shown.length) { list.replaceChildren(el('p', { className: 'q-empty', textContent: 'No quotes match.' })); return; }
  const now = today();
  list.replaceChildren(...shown.map((q) => {
    const o = billedOption(q);
    const total = optionTotals(q, o).total;
    const valid = validUntil(q);
    const unpaid = q.invoices.filter((i) => i.status === 'unpaid');
    const next = q.status === 'sent'
      ? q.followUp && q.followUp <= now ? { text: `Follow up (${niceDate(q.followUp)})`, warn: true } : valid < now ? { text: 'Expired', warn: true } : { text: `Valid until ${niceDate(valid)}`, warn: valid <= addDays(now, 7) }
      : q.status === 'accepted' ? unpaid.length ? { text: `${unpaid.length} unpaid invoice${unpaid.length > 1 ? 's' : ''}`, warn: unpaid.some((i) => i.due < now) } : { text: q.invoices.length ? 'All invoices paid' : 'No invoices yet', warn: false }
      : { text: `Edited ${new Date(q.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`, warn: false };
    const select = el('select', { className: `q-chip-select is-${q.status}`, ariaLabel: 'Status' });
    STATUSES.forEach((s) => select.append(new Option(s.label, s.id)));
    select.value = q.status;
    select.addEventListener('click', (e) => e.stopPropagation());
    select.addEventListener('change', () => { setStatus(q, select.value as Status); quotes[q.id] = q; saveQuotes(quotes); renderDashboard(); });
    const row = el('article', { className: 'q-row', tabIndex: 0 },
      el('div', { className: 'q-row-main' }, el('strong', { textContent: q.client.company || q.client.name || 'Untitled client' }), el('span', { textContent: [q.project.title, q.meta.number].filter(Boolean).join(' · ') })),
      select,
      el('div', { className: 'q-row-total' }, el('strong', { textContent: o.lines.length ? money(total, q.settings.currency) : '—' }), el('span', { textContent: q.options.length > 1 ? `${q.options.length} options` : optionKind(o) })),
      el('span', { className: `q-row-next${next.warn ? ' is-warn' : ''}`, textContent: next.text }),
      el('div', { className: 'q-row-tools' },
        iconButton('⧉', `Duplicate ${q.meta.number}`, () => { duplicate(q); }),
        iconButton('×', `Delete ${q.meta.number}`, () => { if (window.confirm(`Delete quote ${q.meta.number}? This can’t be undone.`)) { delete quotes[q.id]; saveQuotes(quotes); if (q.id === state.id) state = freshQuote(); renderDashboard(); } }, 'is-danger')),
    );
    const open = () => { state = q; setCurrentQuoteId(q.id); setView('editor'); };
    row.addEventListener('click', (e) => { if (!(e.target as HTMLElement).closest('button, select')) open(); });
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === row) open(); });
    return row;
  }));
}
document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((b) => b.addEventListener('click', () => {
  filter = b.dataset.filter as typeof filter;
  document.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  renderDashboard();
}));
$('#q-search').addEventListener('input', renderDashboard);

function newQuote() { state = freshQuote(); status(''); setView('editor'); }
function duplicate(q: QuoteState) {
  const copy = migrate(structuredClone(q));
  Object.assign(copy, { id: uid(), savedAt: Date.now(), status: 'draft', statusDates: {}, followUp: '', invoices: [], acceptedOption: '' });
  copy.meta = { ...copy.meta, number: newQuoteNumber(), date: today() };
  quotes[copy.id] = copy;
  saveQuotes(quotes);
  toast(`Duplicated as ${copy.meta.number}`);
  if (view === 'dashboard') renderDashboard(); else { state = copy; renderEditor(); }
}
$('#q-new').addEventListener('click', newQuote);
// Lock: forget the remembered password on this device and show the password screen again.
$('#q-lock').addEventListener('click', () => { try { localStorage.removeItem('quote-unlock-v1'); } catch { /* storage unavailable */ } location.reload(); });

/* ---------- Status ---------- */
function setStatus(q: QuoteState, s: Status) {
  q.status = s;
  q.statusDates[s] = today();
  if (s === 'sent' && !q.followUp) q.followUp = addDays(today(), 3);
  if (s === 'accepted' && !q.acceptedOption) q.acceptedOption = q.options[q.active]?.id ?? q.options[0].id;
  if (s !== 'sent') q.followUp = s === 'draft' ? q.followUp : '';
}
$<HTMLSelectElement>('#q-status-select').addEventListener('change', (e) => { setStatus(state, (e.target as HTMLSelectElement).value as Status); fillBound(); renderSummary(); save(); });
$<HTMLSelectElement>('#q-accepted').addEventListener('change', (e) => { state.acceptedOption = (e.target as HTMLSelectElement).value; renderSummary(); renderInvoices(); save(); });

/* ---------- Field binding (data-bind="section.key") ---------- */
const getPath = (path: string) => path.split('.').reduce<any>((obj, key) => obj?.[key], state);
const setPath = (path: string, value: unknown) => { const keys = path.split('.'); const last = keys.pop()!; keys.reduce<any>((obj, key) => obj[key], state)[last] = value; };
const bound = () => document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-bind]');
function fillBound() { bound().forEach((f) => { const v = getPath(f.dataset.bind!); f.value = v === undefined || v === null ? '' : String(v); }); }
bound().forEach((f) => f.addEventListener('input', () => {
  const path = f.dataset.bind!;
  const numeric = f instanceof HTMLInputElement && f.type === 'number';
  const before = state.settings.rate;
  const beforeTeam = state.teamRate;
  setPath(path, numeric ? Math.max(0, Number(f.value) || 0) : f.value);
  // A new rate moves every hourly line still on the old rate (custom rates stay), in every option.
  if (path === 'settings.rate') state.options.forEach((o) => o.lines.forEach((l) => { if ((l.unit ?? 'hours') === 'hours' && l.rate === before && l.id !== 'team') l.rate = state.settings.rate; }));
  if (path === 'teamRate') state.options.forEach((o) => o.lines.forEach((l) => { if (l.id === 'team' && l.rate === beforeTeam) l.rate = state.teamRate; }));
  if (path === 'teamPremium') state.options.forEach((o) => { if (o.team > 1 && o.lines.length) applyTeam(o, o.team); });
  if (path === 'settings.rate') state.options.forEach((o) => { if (o.team > 1 && o.lines.length) applyTeam(o, o.team); });
  if (['settings.rate', 'teamRate', 'teamPremium', 'settings.currency'].includes(path)) { renderLines(); renderOptionTabs(); }
  renderSummary();
  save();
}));

/* ---------- Scope ---------- */
function renderScope() {
  const box = $('#q-scope');
  box.replaceChildren();
  for (const step of steps) {
    if (step.when && !step.when(state.answers)) continue;
    const row = el('div', { className: 'q-scope-row' }, el('span', { className: 'q-scope-label', textContent: step.label }));
    const options = (step.options ?? []).filter((o) => !o.when || o.when(state.answers));
    if (step.kind === 'single') {
      const select = el('select', { ariaLabel: step.label });
      select.append(new Option('—', ''));
      options.forEach((o) => select.append(new Option(o.label, o.id)));
      select.value = String(state.answers[step.id] ?? '');
      select.addEventListener('change', () => { state.answers[step.id] = select.value || undefined; scopeChanged(); });
      row.append(select);
    } else if (step.kind === 'multi') {
      const chosen = new Set((state.answers[step.id] as string[] | undefined) ?? []);
      row.append(el('div', { className: 'q-chips' }, ...options.map((o) => {
        const box = el('input', { type: 'checkbox', checked: chosen.has(o.id) });
        box.addEventListener('change', () => { box.checked ? chosen.add(o.id) : chosen.delete(o.id); state.answers[step.id] = [...chosen]; scopeChanged(); });
        return el('label', { className: 'q-chip' }, box, o.label);
      })));
    } else if (step.kind === 'range') {
      const input = el('input', { type: 'number', min: String(step.range?.min ?? 1), max: String(step.range?.max ?? 99), value: String(state.answers[step.id] ?? step.range?.initial ?? ''), ariaLabel: step.label });
      input.addEventListener('change', () => { state.answers[step.id] = Number(input.value) || step.range?.initial; scopeChanged(); });
      row.append(input);
    } else {
      const area = el('textarea', { rows: 2, value: String(state.answers[step.id] ?? ''), ariaLabel: step.label });
      area.addEventListener('input', () => { state.answers[step.id] = area.value; save(); });
      row.append(area);
    }
    box.append(row);
  }
  const r = estimate(state.answers);
  $('#q-estimate').textContent = r.mode === 'weeks' ? `Client’s estimate: ${r.low}–${r.high} weeks with one developer${r.scenario ? ` · they chose: ${r.scenario}` : ''}` : r.mode === 'monthly' ? `Support retainer: ${r.hours} hours a month` : 'Pick a project type, or import an estimate, to calculate pricing.';
}
function scopeChanged() { $('#q-dirty').hidden = false; renderScope(); renderTeam(); renderProgress(); save(); }

/* ---------- Pricing: options ---------- */
function calcOption(o: QuoteOption) {
  const { lines, result } = quoteLines(state.answers, state.settings, { team: o.team, teamRate: state.teamRate, teamPremium: state.teamPremium, essentials: o.essentials });
  const custom = o.lines.filter((l) => l.id.startsWith('custom-'));
  o.lines = [...lines, ...custom];
  o.timeline = optionTimeline(state.answers, o);
  o.edited = false;
  state.monthly = result.mode === 'monthly';
  if (state.monthly && isDefaultSchedule(state.schedule)) state.schedule = [{ label: 'Billed monthly in advance', percent: 100 }];
}
function recalc(ask = true) {
  const edited = state.options.some((o) => o.edited && o.lines.length);
  if (ask && edited && !window.confirm('Recalculate every option? Manual edits to calculated lines will be replaced (items you added yourself stay).')) return;
  state.options.forEach(calcOption);
  if (!state.project.title) state.project.title = projectTitle(state.answers);
  $('#q-dirty').hidden = true;
  fillBound();
  renderPricing();
  save();
}
$('#q-recalc').addEventListener('click', () => recalc(true));

function renderOptionTabs() {
  const tabs = $('#q-option-tabs');
  tabs.replaceChildren(...state.options.map((o, i) => {
    const t = optionTotals(state, o);
    const fit = dateFit(state.answers, o);
    const b = el('button', { type: 'button', role: 'tab' }, el('strong', { textContent: o.name }), el('span', { textContent: o.lines.length ? `${money(t.total)} · ${optionKind(o)}` : optionKind(o) }), ...(fit ? [el('em', { className: `q-fit is-${fit.tone}`, textContent: fit.label })] : []));
    b.setAttribute('aria-selected', String(i === state.active));
    if (o.id === state.acceptedOption && state.status === 'accepted') b.classList.add('is-accepted');
    b.addEventListener('click', () => { state.active = i; renderPricing(); save(); });
    return b;
  }));
  $<HTMLInputElement>('#q-option-name').value = opt().name;
  $<HTMLInputElement>('#q-option-essentials').checked = opt().essentials;
  const phased = canPhase(state.answers);
  $<HTMLInputElement>('#q-option-essentials').disabled = !phased;
  $('#q-option-essentials').closest('label')!.toggleAttribute('hidden', !phased);
  document.querySelectorAll<HTMLElement>('[data-new-option="essentials"], [data-new-option="both"]').forEach((b) => { b.hidden = !phased; });
  // 2 and 3 developers are always offered; the team picker says when a size isn't any faster.
  const timed = estimate(state.answers).mode === 'weeks';
  $('[data-new-option="team2"]').hidden = !timed;
  $('[data-new-option="team3"]').hidden = !timed;
  $('[data-new-option="both"]').hidden = !phased;
  $('[data-new-option="both"]').textContent = 'Essentials first, 3 developers';
  $('#q-option-remove').hidden = state.options.length < 2;
}
$<HTMLInputElement>('#q-option-name').addEventListener('input', (e) => { opt().name = (e.target as HTMLInputElement).value || 'Option'; renderOptionTabs(); renderSummary(); save(); });
$<HTMLInputElement>('#q-option-essentials').addEventListener('change', (e) => {
  const o = opt();
  if (o.edited && !window.confirm('Switching recalculates this option’s lines. Manual edits to calculated lines will be replaced.')) { (e.target as HTMLInputElement).checked = o.essentials; return; }
  o.essentials = (e.target as HTMLInputElement).checked;
  calcOption(o);
  renderPricing();
  save();
});
$('#q-option-remove').addEventListener('click', () => {
  if (state.options.length < 2 || !window.confirm(`Remove ${opt().name}?`)) return;
  const removed = state.options.splice(state.active, 1)[0];
  if (state.acceptedOption === removed.id) state.acceptedOption = '';
  state.active = Math.max(0, state.active - 1);
  renderPricing();
  save();
});
document.querySelectorAll<HTMLButtonElement>('[data-new-option]').forEach((b) => b.addEventListener('click', () => {
  const kind = b.dataset.newOption!;
  const letter = String.fromCharCode(65 + state.options.length);
  let o: QuoteOption;
  if (kind === 'copy') o = { ...structuredClone(opt()), id: uid(), name: `Option ${letter}` };
  else {
    const team = kind === 'team2' ? 2 : kind === 'team3' ? 3 : kind === 'both' ? 3 : 1;
    o = newOption(`Option ${letter}`, team, (kind === 'essentials' || kind === 'both') && canPhase(state.answers));
    calcOption(o);
  }
  state.options.push(o);
  state.active = state.options.length - 1;
  ($('#q-option-menu') as HTMLDetailsElement).open = false;
  renderPricing();
  save();

}));

/* ---------- Pricing: team size ---------- */
function renderTeam() {
  const r = estimate(state.answers);
  const box = $('#q-team-box');
  box.hidden = r.mode !== 'weeks';
  if (r.mode !== 'weeks') return;
  const o = opt();
  const plans = [1, 2, 3].map((n) => optionPlan(state.answers, { ...o, team: n }));
  // Calendar weeks for each size (the ranges are rounded wide, so compare the underlying weeks).
  const weeks = plans.map((pl) => (pl ? pl.phases.reduce((t, ph) => t + ph.weeks, 0) : 0));
  const saved = (n: number) => weeks[0] - weeks[n - 1];
  // A size "helps" when it saves at least half a week over the next smaller team.
  const faster = (n: number) => n === 1 || weeks[n - 2] - weeks[n - 1] >= 0.5;
  const speedLabel = (n: number) => {
    if (n === 1) return '';
    if (!faster(n)) return n === 2 || saved(n) < 0.5 ? 'no faster' : `no faster than ${n - 1}`;
    const s = saved(n);
    return s < 1 ? 'barely faster' : `about ${Math.round(s)} wk sooner`;
  };
  $('#q-team').replaceChildren(...[1, 2, 3].map((n) => {
    const plan = plans[n - 1];
    const extra = o.lines.length ? teamExtra(o, n) : 0;
    const b = el('button', { type: 'button', role: 'radio' },
      el('strong', { textContent: `${n} developer${n > 1 ? 's' : ''}` }),
      el('span', { textContent: plan ? `${plan.low}–${plan.high} weeks${speedLabel(n) ? ` · ${speedLabel(n)}` : ''}` : '' }),
      el('em', { textContent: n === 1 ? 'Base price' : o.lines.length ? `+${money(extra)}` : 'Higher cost' }));
    b.setAttribute('aria-checked', String(n === o.team));
    b.classList.toggle('is-slow', !faster(n));
    b.addEventListener('click', () => setTeam(n));
    return b;
  }));
  const added = o.lines.filter((l) => TEAM_LINE_IDS.includes(l.id)).reduce((s, l) => s + l.hours * l.rate, 0);
  const save = saved(o.team);
  const sooner = save < 1 ? 'a few days' : `about ${Math.round(save)} week${Math.round(save) === 1 ? '' : 's'}`;
  const short = weeks[0] < 6 ? ' On short projects extra developers save less time, because planning, testing and content don’t split well between people.' : '';
  const note = o.team === 1
    ? `One developer is the most cost-effective. Pick 2 or 3 developers if the client needs to launch sooner or wants a bigger team, at a higher cost.${short}`
    : !faster(o.team)
      ? `For a project this size, ${o.team} developers won’t launch it noticeably sooner than ${o.team - 1}${save >= 0.5 ? ` (still ${sooner} sooner than one developer)` : ''}. The extra ${money(added)} pays for more people on the project, not more speed.`
      : `Launches ${sooner} sooner than one developer, for ${money(added)} more: the faster-delivery premium plus coordination and code reviews.${short}`;
  $('#q-team-note').textContent = note;
  $('#q-team-note').classList.toggle('is-warn', o.team > 1 && !faster(o.team));
}
/** Replaces an option's team lines (premium + coordination) for a team size, keeping everything else. */
function applyTeam(o: QuoteOption, n: number) {
  o.team = n;
  o.lines = o.lines.filter((l) => !TEAM_LINE_IDS.includes(l.id));
  const lines = teamLines(o.lines, n, state.teamRate, state.teamPremium).map((l) => ({ ...l, phase: o.essentials ? (1 as const) : undefined }));
  const at = o.lines.findIndex((l) => l.id === 'pm' || l.id.startsWith('custom-'));
  o.lines.splice(at >= 0 ? at : o.lines.length, 0, ...lines);
  o.timeline = optionTimeline(state.answers, o);
}
/** What a team size adds to an option's total, for the team buttons. */
function teamExtra(o: QuoteOption, n: number) {
  const base = o.lines.filter((l) => !TEAM_LINE_IDS.includes(l.id));
  return teamLines(base, n, state.teamRate, state.teamPremium).reduce((s, l) => s + l.hours * l.rate, 0);
}
function setTeam(n: number) {
  applyTeam(opt(), n);
  renderPricing();
  save();
}

/* ---------- Pricing: line items ---------- */
function renderLines() {
  const box = $('#q-lines');
  const o = opt();
  box.replaceChildren();
  if (!o.lines.length) {
    box.append(el('p', { className: 'q-empty', textContent: 'No items yet. Upload the client’s estimate, recalculate from the scope, or add an item below.' }));
    return;
  }
  const head = el('div', { className: 'q-tr q-th', role: 'row' });
  head.innerHTML = '<span></span><span>Item</span><span>Qty</span><span>Unit</span><span>Rate</span><span>Amount</span><span></span>';
  box.append(head);
  const split = phaseTotals(o.lines).split || o.essentials;
  const order = split ? [...o.lines.filter((l) => (l.phase ?? 1) === 1), ...o.lines.filter((l) => l.phase === 2)] : o.lines;
  let lastPhase = 0;
  order.forEach((line) => {
    const index = o.lines.indexOf(line);
    const phase = line.phase ?? 1;
    if (split && phase !== lastPhase) {
      lastPhase = phase;
      box.append(el('div', { className: 'q-phase-head', textContent: phase === 1 ? 'Phase 1 · launch with the essentials' : 'Phase 2 · after launch' }));
    }
    const row = el('div', { className: 'q-tr', role: 'row' });
    row.classList.toggle('is-optional', Boolean(line.optional));
    const move = el('div', { className: 'q-move' },
      Object.assign(iconButton('↑', `Move ${line.title} up`, () => { if (index > 0) { [o.lines[index - 1], o.lines[index]] = [o.lines[index], o.lines[index - 1]]; changed(); } }), { disabled: index === 0 }),
      Object.assign(iconButton('↓', `Move ${line.title} down`, () => { if (index < o.lines.length - 1) { [o.lines[index + 1], o.lines[index]] = [o.lines[index], o.lines[index + 1]]; changed(); } }), { disabled: index === o.lines.length - 1 }));
    const title = el('input', { value: line.title, className: 'q-in q-in-title', ariaLabel: 'Item' });
    const detail = el('textarea', { value: line.detail, className: 'q-in q-in-detail', placeholder: 'Details (optional)', rows: 1, ariaLabel: 'Details' });
    const grow = () => { detail.style.height = 'auto'; detail.style.height = `${detail.scrollHeight}px`; };
    requestAnimationFrame(grow);
    const flag = (label: string, checked: boolean, onChange: (v: boolean) => void) => {
      const box2 = el('input', { type: 'checkbox', checked });
      box2.addEventListener('change', () => onChange(box2.checked));
      return el('label', { className: `q-flag${checked ? ' is-on' : ''}` }, box2, label);
    };
    const flags = el('div', { className: 'q-flags' },
      flag('Phase 2', line.phase === 2, (v) => { line.phase = v ? 2 : 1; changed(); }),
      flag('At cost', Boolean(line.passThrough), (v) => { line.passThrough = v; changed(); }),
      flag('Optional', Boolean(line.optional), (v) => { line.optional = v; changed(); }));
    const qty = el('input', { type: 'number', min: '0', step: 'any', value: String(line.hours), className: 'q-in q-num q-qty', ariaLabel: 'Quantity' });
    const unit = el('select', { className: 'q-in q-unit', ariaLabel: 'Unit' });
    unit.append(new Option(state.monthly ? 'hrs/mo' : 'hrs', 'hours'), new Option('fixed', 'fixed'));
    unit.value = line.unit ?? 'hours';
    const rate = el('input', { type: 'number', min: '0', step: 'any', value: String(line.rate), className: 'q-in q-num q-rate', ariaLabel: (line.unit ?? 'hours') === 'fixed' ? 'Price' : 'Hourly rate' });
    const amount = el('output', { className: 'q-amount', textContent: money(line.hours * line.rate) });
    const update = () => { amount.textContent = money(line.hours * line.rate); o.edited = true; renderSummary(); renderOptionTabs(); save(); };
    title.addEventListener('input', () => { line.title = title.value; o.edited = true; save(); });
    detail.addEventListener('input', () => { line.detail = detail.value; grow(); o.edited = true; save(); });
    qty.addEventListener('input', () => { line.hours = Math.max(0, Number(qty.value) || 0); update(); });
    rate.addEventListener('input', () => { line.rate = Math.max(0, Number(rate.value) || 0); update(); });
    unit.addEventListener('change', () => { line.unit = unit.value as 'hours' | 'fixed'; if (line.unit === 'hours' && !line.rate) line.rate = state.settings.rate; changed(); });
    const tools = el('div', { className: 'q-row-tools' },
      iconButton('☆', `Save ${line.title} to your items`, () => saveToLibrary(line)),
      iconButton('⧉', `Duplicate ${line.title}`, () => { o.lines.splice(index + 1, 0, { ...line, id: `custom-${uid()}` }); changed(); }),
      iconButton('×', `Remove ${line.title}`, () => { o.lines.splice(index, 1); changed(); }, 'is-danger'));
    row.append(move, el('div', { className: 'q-item' }, title, detail, flags), qty, unit, rate, amount, tools);
    box.append(row);
  });
}
function changed() { opt().edited = true; renderLines(); renderSummary(); renderOptionTabs(); save(); }

/* ---------- Item library ---------- */
function saveToLibrary(line: QuoteLine) {
  const { id: _id, ...rest } = line;
  library = [...library.filter((i) => i.title !== line.title), { ...rest, key: uid(), rate: (line.unit ?? 'hours') === 'fixed' ? line.rate : 0 }];
  saveLibrary(library);
  renderLibrary();
  toast(`Saved “${line.title}” to your items`);
}
function renderLibrary() {
  const box = $('#q-library');
  if (!library.length) { box.replaceChildren(el('p', { className: 'q-menu-empty', textContent: 'Use ☆ on any item to save it here.' })); return; }
  box.replaceChildren(...library.map((item) => {
    const add = el('button', { type: 'button', textContent: item.title });
    add.addEventListener('click', () => addLine({ ...item, rate: (item.unit ?? 'hours') === 'fixed' ? item.rate : state.settings.rate }));
    const remove = iconButton('×', `Remove ${item.title} from your items`, () => { library = library.filter((i) => i.key !== item.key); saveLibrary(library); renderLibrary(); }, 'is-danger');
    return el('div', { className: 'q-menu-item' }, add, remove);
  }));
}
function addLine(line: Omit<QuoteLine, 'id'> & { key?: string }) {
  const { key: _key, ...rest } = line as LibraryItem;
  const o = opt();
  o.lines.push({ ...rest, id: `custom-${uid()}` });
  ($('#q-add-menu') as HTMLDetailsElement).open = false;
  changed();
  const rows = document.querySelectorAll<HTMLElement>('#q-lines .q-tr:not(.q-th)');
  const last = rows[rows.length - 1];
  last?.querySelector<HTMLInputElement>(line.unit === 'fixed' && !line.rate ? '.q-rate' : '.q-in-title')?.focus();
  last?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((b) => b.addEventListener('click', () => {
  const preset = LINE_PRESETS[Number(b.dataset.preset)].line;
  addLine({ ...preset, rate: preset.unit === 'fixed' ? 0 : state.settings.rate, phase: opt().essentials ? 1 : undefined });
}));

/* ---------- Totals, summary, profit ---------- */
function renderTotals() {
  const o = opt();
  const t = optionTotals(state, o);
  const pt = phaseTotals(o.lines);
  const per = state.monthly ? ' / month' : '';
  const rows: [string, string, string?][] = [];
  if (pt.split) rows.push(['Phase 1', money(pt.one), 'is-muted'], ['Phase 2', money(pt.two), 'is-muted']);
  rows.push(['Subtotal', money(t.subtotal)]);
  if (t.discount) rows.push([`Discount${state.pricing.discountType === 'percent' ? ` (${state.pricing.discount}%)` : ''}`, `−${money(t.discount)}`]);
  if (t.tax) rows.push([`${state.pricing.taxLabel || 'Tax'} (${state.pricing.tax}%)`, money(t.tax)]);
  rows.push([`${state.options.length > 1 ? `${o.name} total` : 'Total'}${per}`, money(t.total), 'is-total']);
  if (t.optional) rows.push(['Optional extras (not in total)', money(t.optional), 'is-muted']);
  $('#q-totals').replaceChildren(...rows.flatMap(([k, v, cls]) => [el('dt', { textContent: k, className: cls ?? '' }), el('dd', { textContent: v, className: cls ?? '' })]));
}

function renderSummary() {
  renderTotals();
  // Once accepted, the summary shows the accepted option: the same one payments and invoices use.
  const o = state.status === 'accepted' ? billedOption(state) : opt();
  const t = optionTotals(state, o);
  const ready = o.lines.some((l) => !l.optional);
  const multi = state.options.length > 1;
  $<HTMLSelectElement>('#q-status-select').value = state.status;
  $('#q-status-select').className = `is-${state.status}`;
  const acceptedWrap = $('#q-accepted-wrap');
  acceptedWrap.hidden = !(state.status === 'accepted' && multi);
  const acc = $<HTMLSelectElement>('#q-accepted');
  acc.replaceChildren(...state.options.map((x) => new Option(`${x.name} · ${money(optionTotals(state, x).total)}`, x.id)));
  acc.value = state.acceptedOption || o.id;

  $('#q-total-label').textContent = multi ? `${o.name} total${state.status === 'accepted' ? ' · accepted' : ''}` : 'Quotation total';
  const total = $('#q-total');
  total.textContent = ready ? money(t.total) : '';
  total.classList.toggle('is-empty', !ready);
  $('#q-sub').textContent = ready
    ? `${state.monthly ? 'Per month' : 'Fixed price'}${t.tax ? `, including ${state.pricing.taxLabel || 'tax'}` : ''}${t.optional ? ` · plus ${money(t.optional)} optional` : ''}${multi ? ` · ${state.options.length} options` : ''}`
    : 'Upload the client’s estimate to start pricing.';
  const hourly = o.lines.filter((l) => !l.optional && (l.unit ?? 'hours') === 'hours');
  const facts: [string, string][] = ready ? [
    ['Hours', `${Math.round(t.hours * 10) / 10}`],
    ['Average hourly rate', t.hours ? `${money(hourly.reduce((s, l) => s + l.hours * l.rate, 0) / t.hours)} / hr` : '—'],
    ['Timeline', o.timeline || optionTimeline(state.answers, o) || '—'],
    ...clientDateFact(o),
    [state.schedule[0]?.label || 'Deposit', money((t.total * (state.schedule[0]?.percent ?? 0)) / 100)],
    ['Valid until', niceDate(validUntil(state))],
  ] : [];
  $('#q-facts').replaceChildren(...facts.flatMap(([k, v]) => [el('dt', { textContent: k }), el('dd', { textContent: v })]));
  const anyReady = state.options.some((x) => x.lines.some((l) => !l.optional));
  ['#q-download', '#q-preview', '#q-copy-email', '#q-mobile-download'].forEach((sel) => { ($(sel) as HTMLButtonElement).disabled = !anyReady; });
  const email = quoteEmail(state, profile);
  $<HTMLAnchorElement>('#q-mail').href = `mailto:${encodeURIComponent(state.client.email)}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
  $('#q-mail').classList.toggle('is-disabled', !anyReady);
  $('#q-mobile-total').textContent = ready ? `${money(t.total)}${state.monthly ? ' / mo' : ''}` : '';
  renderMargin();
  renderSchedule(false);
  renderProgress();
  renderTeam();
}

/** "Client wants: Within a month · fits" for the summary, when they picked a date. */
function clientDateFact(o: QuoteOption): [string, string][] {
  const fit = dateFit(state.answers, o);
  if (!fit) return [];
  const wanted = steps.find((x) => x.id === 'deadline')?.options?.find((x) => x.id === state.answers.deadline)?.label ?? '';
  const verdict = fit.tone === 'yes' ? 'fits' : fit.tone === 'maybe' ? 'a little past' : 'too long';
  return [['Client wants', `${wanted} · ${verdict}`]];
}

function renderMargin() {
  const o = opt();
  $('#q-profit summary').firstChild!.textContent = state.options.length > 1 ? `Profit check · ${o.name} ` : 'Profit check ';
  const m = margin(state, o);
  const rows: [string, string, string?][] = [
    ['Client pays (before tax)', money(m.revenue)],
    ...(m.passThrough ? [['Paid on at cost', `−${money(m.passThrough)}`] as [string, string]] : []),
    ...(m.extraCost ? [[`Paid to extra developers (${m.extraHours} hrs)`, `−${money(m.extraCost)}`] as [string, string]] : []),
    ['Your take', money(m.yourTake), 'is-total'],
    ['Your hours', `${Math.round(m.yourHours)}`],
    ['You earn per hour', m.yourHours ? `${money(m.yourRate)} / hr` : '—'],
    ['Margin', `${Math.round(m.marginPct * 100)}%`],
  ];
  $('#q-margin').replaceChildren(...rows.flatMap(([k, v, cls]) => [el('dt', { textContent: k, className: cls ?? '' }), el('dd', { textContent: v, className: cls ?? '' })]));
  const note = $('#q-margin-note');
  const low = m.yourHours > 0 && m.yourRate < state.settings.rate - 0.01;
  note.textContent = !o.lines.length ? '' : low
    ? `You’d earn ${money(m.yourRate)} an hour, below your ${money(state.settings.rate)} rate. Raise the extra-developer rate or lower what you pay them.`
    : o.team > 1 ? `Extra developers earn you ${money(Math.max(0, state.teamRate - state.costRate))} an hour on their time.` : '';
  note.classList.toggle('is-warn', low);
}

/* ---------- Payments & invoices ---------- */
function renderSchedule(rebuild = true) {
  const t = optionTotals(state, billedOption(state));
  const box = $('#q-schedule');
  if (rebuild) {
    box.replaceChildren(...state.schedule.map((m, index) => {
      const label = el('input', { value: m.label, className: 'q-in', ariaLabel: 'Milestone' });
      const pct = el('input', { type: 'number', min: '0', max: '100', value: String(m.percent), className: 'q-in q-num', ariaLabel: 'Percent' });
      const amount = el('output', { className: 'q-amount' });
      amount.dataset.index = String(index);
      label.addEventListener('input', () => { m.label = label.value; renderSummary(); save(); });
      pct.addEventListener('input', () => { m.percent = Math.max(0, Number(pct.value) || 0); renderSummary(); save(); });
      const invoiced = state.invoices.some((i) => i.milestone === m.label);
      const invoice = el('button', { type: 'button', className: 'q-btn q-ghost q-small', textContent: invoiced ? 'Invoice again' : 'Create invoice' });
      invoice.addEventListener('click', () => createInvoice(m.label, m.percent));
      return el('div', { className: 'q-milestone' },
        el('span', { className: 'q-ms-num', textContent: String(index + 1).padStart(2, '0') }), label,
        el('span', { className: 'q-pct' }, pct, '%'), amount, invoice,
        iconButton('×', `Remove ${m.label}`, () => { state.schedule.splice(index, 1); renderSchedule(); renderSummary(); save(); }, 'is-danger'));
    }));
  }
  box.querySelectorAll<HTMLOutputElement>('output[data-index]').forEach((out) => { const m = state.schedule[Number(out.dataset.index)]; if (m) out.textContent = money((t.total * m.percent) / 100); });
  box.querySelectorAll<HTMLButtonElement>('.q-small').forEach((b) => { b.disabled = !t.total; });
  const sum = state.schedule.reduce((s, m) => s + m.percent, 0);
  const st = $('#q-schedule-status');
  st.textContent = sum === 100 ? 'Adds up to 100%' : `Adds up to ${sum}%. It should total 100%.`;
  st.classList.toggle('is-error', sum !== 100);
}
$('#q-add-milestone').addEventListener('click', () => { state.schedule.push({ label: 'Milestone', percent: 0 }); renderSchedule(); renderSummary(); save(); });

function createInvoice(milestone: string, percent: number) {
  const o = billedOption(state);
  const t = optionTotals(state, o);
  const amount = Math.round(t.total * percent) / 100;
  const tax = Math.round(t.tax * percent) / 100;
  const inv: Invoice = { id: uid(), number: nextInvoiceNumber(profile.invoicePrefix), milestone, percent, amount, tax, currency: state.settings.currency, issued: today(), due: addDays(today(), Number(profile.paymentDays) || 0), status: 'unpaid' };
  state.invoices.push(inv);
  renderInvoices();
  renderSchedule();
  save();
  toast(`Created ${inv.number} for ${money(amount)}`);
  if (!profile.payment.trim()) toast('Tip: add how clients pay you in Business profile, so it shows on invoices.');
}
function renderInvoices() {
  const box = $('#q-invoices');
  if (!state.invoices.length) { box.replaceChildren(); return; }
  const now = today();
  box.replaceChildren(el('p', { className: 'q-invoices-title', textContent: 'Invoices' }), ...state.invoices.map((inv, index) => {
    const overdue = inv.status === 'unpaid' && inv.due < now;
    const chip = el('span', { className: `q-chip-status is-${inv.status === 'paid' ? 'accepted' : overdue ? 'declined' : 'sent'}`, textContent: inv.status === 'paid' ? `Paid ${niceDate(inv.paidOn ?? '')}` : overdue ? 'Overdue' : `Due ${niceDate(inv.due)}` });
    const view = el('button', { type: 'button', className: 'q-btn q-ghost q-small', textContent: 'View' });
    view.addEventListener('click', () => showPdf(view, async (m) => m.buildInvoicePdf(state, inv, profile)));
    const pdf = el('button', { type: 'button', className: 'q-btn q-small', textContent: 'Download' });
    pdf.addEventListener('click', () => savePdf(pdf, async (m) => m.buildInvoicePdf(state, inv, profile)));
    const paid = el('button', { type: 'button', className: 'q-btn q-ghost q-small', textContent: inv.status === 'paid' ? 'Mark unpaid' : 'Mark paid' });
    paid.addEventListener('click', () => { inv.status = inv.status === 'paid' ? 'unpaid' : 'paid'; inv.paidOn = inv.status === 'paid' ? today() : undefined; renderInvoices(); save(); });
    return el('div', { className: 'q-invoice' },
      el('div', {}, el('strong', { textContent: inv.number }), el('span', { textContent: `${inv.milestone} · ${inv.percent}%` })),
      el('strong', { className: 'q-amount', textContent: money(inv.amount, inv.currency) }), chip, view, pdf, paid,
      iconButton('×', `Delete ${inv.number}`, () => { if (window.confirm(`Delete invoice ${inv.number}?`)) { state.invoices.splice(index, 1); renderInvoices(); renderSchedule(); save(); } }, 'is-danger'));
  }));
}

/* ---------- Progress checklist ---------- */
function renderProgress() {
  const checks: Record<string, boolean> = {
    import: Boolean(state.answers.type),
    client: Boolean((state.client.name || state.client.company) && state.client.email),
    scope: Boolean(state.answers.type) && $('#q-dirty').hidden,
    pricing: state.options.some((o) => o.lines.some((l) => !l.optional)),
    payment: state.schedule.reduce((s, m) => s + m.percent, 0) === 100,
    terms: Boolean(state.text.terms.trim()),
  };
  document.querySelectorAll<HTMLElement>('[data-check]').forEach((a) => a.classList.toggle('is-done', checks[a.dataset.check!]));
}

/* ---------- Import ---------- */
function applyAnswers(answers: Answers, ref = '') {
  if (state.answers.type || state.options.some((o) => o.lines.length)) state = freshQuote();
  state.answers = answers;
  if (ref) state.meta.ref = ref;
  if (typeof answers.notes === 'string' && answers.notes) state.project.summary = answers.notes;
  const r = estimate(answers);
  // Start with the client's own choice: their team size, and essentials first if they picked it.
  state.options = [newOption('Option A', r.team, (r.choice === 'phase' || r.choice === 'both') && canPhase(answers))];
  state.active = 0;
  recalc(false);
  state.project.title = projectTitle(answers);
  fillBound();
  renderEditor();
  document.querySelector('#s-client')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function importFile(file: File) {
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { status('That isn’t a PDF. Upload the estimate PDF from the estimator.', true); return; }
  const payload = readPayload(await file.arrayBuffer());
  if (!payload) { status('This PDF has no estimator data (it may be older than this tool). Paste the brief from the client’s email instead.', true); return; }
  applyAnswers(payload.answers, payload.ref);
  const count = Object.values(payload.answers).filter((v) => v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)).length;
  status(`Imported ${payload.ref} (${niceDate(payload.date, 'long')}): ${count} answers. Add the client’s details next.`);
}
$<HTMLInputElement>('#q-file').addEventListener('change', (e) => { const input = e.target as HTMLInputElement; const file = input.files?.[0]; if (file) importFile(file); input.value = ''; });
const drop = $('#q-drop');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); const file = e.dataTransfer?.files[0]; if (file) importFile(file); });
$('#q-read').addEventListener('click', () => {
  const text = $<HTMLTextAreaElement>('#q-brief').value;
  const answers = parseBrief(text);
  if (!answers.type) { status('Couldn’t find the project details. Paste the lines that look like “Platform: Shopify”.', true); return; }
  applyAnswers(answers, text.match(/EST-\d{8}-[A-Z0-9]+/)?.[0] ?? '');
  status(`Read the brief: ${Object.keys(answers).length} answers. Add the client’s details next.`);
});

/* ---------- PDFs ---------- */
type PdfModule = typeof import('./quote-pdf');
type Builder = (m: PdfModule) => ReturnType<PdfModule['buildQuotePdf']>;
const quoteBuilder: Builder = async (m) => m.buildQuotePdf(state, profile);
/** What the preview window's Download button saves (the quote, or the invoice being viewed). */
let dialogBuilder: Builder = quoteBuilder;

/** Saves a PDF, with clear feedback on the button (and a toast if it fails). */
async function savePdf(button: HTMLButtonElement, build: Builder) {
  const label = button.textContent;
  button.textContent = 'Preparing…';
  button.disabled = true;
  try {
    const m = await import('./quote-pdf');
    await m.download(build(m));
    button.textContent = 'Downloaded';
    toast('PDF downloaded. If nothing appears, use View and save it from the preview.');
  } catch (error) {
    console.error(error);
    button.textContent = 'Couldn’t create PDF';
    toast('Couldn’t create the PDF. Try View instead.', true);
  }
  window.setTimeout(() => { button.textContent = label; button.disabled = false; }, 2200);
}

/** Shows a PDF in the preview window (a new tab on phones). */
const dialog = $<HTMLDialogElement>('#q-dialog');
let previewUrl = '';
async function showPdf(button: HTMLButtonElement, build: Builder) {
  const label = button.textContent;
  button.textContent = 'Preparing…';
  try {
    const m = await import('./quote-pdf');
    const { url, filename } = await m.preview(build(m));
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = url;
    dialogBuilder = build;
    if (window.matchMedia('(max-width: 700px)').matches) window.open(url, '_blank');
    else { $('#q-dialog-title').textContent = filename; $<HTMLIFrameElement>('#q-frame').src = url; dialog.showModal(); }
  } catch (error) {
    console.error(error);
    toast('Couldn’t create the PDF.', true);
  }
  button.textContent = label;
}
['#q-download', '#q-mobile-download'].forEach((sel) => $(sel).addEventListener('click', () => savePdf($<HTMLButtonElement>(sel), quoteBuilder)));
$('#q-dialog-download').addEventListener('click', () => savePdf($<HTMLButtonElement>('#q-dialog-download'), dialogBuilder));
$('#q-preview').addEventListener('click', () => showPdf($<HTMLButtonElement>('#q-preview'), quoteBuilder));
$('#q-dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

/* ---------- Email ---------- */
$('#q-copy-email').addEventListener('click', async () => {
  const { subject, body } = quoteEmail(state, profile);
  try { await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); toast('Email copied. Attach the PDF and send.'); }
  catch { toast('Couldn’t copy. Use “Open in email” instead.', true); }
});
$('#q-mail').addEventListener('click', (e) => { if ($('#q-mail').classList.contains('is-disabled')) e.preventDefault(); });

/* ---------- Business profile ---------- */
const profileDialog = $<HTMLDialogElement>('#q-profile');
const profileForm = $<HTMLFormElement>('#q-profile-form');
let draftImages = { logo: profile.logo, signature: profile.signature };
function showImages() {
  for (const key of ['logo', 'signature'] as const) {
    const img = $<HTMLImageElement>(`#q-${key}-preview`);
    img.hidden = !draftImages[key];
    if (draftImages[key]) img.src = draftImages[key];
  }
}
$('#q-open-profile').addEventListener('click', () => {
  for (const [key, value] of Object.entries(profile)) { const f = profileForm.elements.namedItem(key) as HTMLInputElement | null; if (f && f.type !== 'file') f.value = String(value ?? ''); }
  draftImages = { logo: profile.logo, signature: profile.signature };
  showImages();
  profileDialog.showModal();
});
for (const key of ['logo', 'signature'] as const) {
  $<HTMLInputElement>(`#q-${key}-file`).addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try { draftImages[key] = await imageToDataUrl(file, key === 'logo' ? 480 : 360); showImages(); } catch { toast('Couldn’t read that image.', true); }
  });
}
profileForm.querySelectorAll<HTMLButtonElement>('[data-clear]').forEach((b) => b.addEventListener('click', () => { draftImages[b.dataset.clear as 'logo' | 'signature'] = ''; showImages(); }));
profileDialog.addEventListener('close', () => {
  if (profileDialog.returnValue !== 'save') return;
  const data = new FormData(profileForm);
  const next: Profile = { ...profile, ...draftImages };
  for (const key of ['name', 'tagline', 'email', 'phone', 'website', 'address', 'taxId', 'payment', 'invoicePrefix'] as const) next[key] = String(data.get(key) ?? '').trim();
  next.paymentDays = Math.max(0, Number(data.get('paymentDays')) || 0);
  next.name ||= 'Grant Dev14';
  profile = next;
  if (!saveProfile(profile)) toast('Couldn’t save the profile: try a smaller logo.', true); else toast('Business profile saved');
  renderSummary();
});

/* ---------- Backup & restore ---------- */
$('#q-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ v: 3, exported: new Date().toISOString(), profile, library, quotes }, null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `quotes-backup-${today()}.json` });
  a.click();
  URL.revokeObjectURL(a.href);
});
$<HTMLInputElement>('#q-restore').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const incoming = Object.values<unknown>(data?.quotes ?? {}).map(migrate);
    if (!incoming.length) throw new Error('empty');
    for (const q of incoming) quotes[q.id] = q;
    saveQuotes(quotes);
    if (data.library?.length) { library = [...library, ...data.library.filter((i: LibraryItem) => !library.some((x) => x.title === i.title))]; saveLibrary(library); }
    if (data.profile && !profile.payment && !profile.logo) { profile = { ...profile, ...data.profile }; saveProfile(profile); }
    renderDashboard();
    toast(`Restored ${incoming.length} quote${incoming.length > 1 ? 's' : ''}`);
  } catch { toast('That file isn’t a quotes backup.', true); }
});

/* ---------- Render ---------- */
function renderPricing() { renderOptionTabs(); renderTeam(); renderLines(); renderSummary(); renderInvoices(); }
function renderEditor() {
  fillBound();
  $('#q-dirty').hidden = true;
  renderScope();
  renderSchedule();
  renderLibrary();
  renderPricing();
}
setView(view);
