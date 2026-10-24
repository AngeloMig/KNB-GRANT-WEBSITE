// Quote builder page: dashboard, editor, options, invoices, business profile.
import { steps, estimate, BUDGET_RANGES, type Answers } from '../data/estimator';
import { readPayload } from '../data/payload';
import { EMAIL_KINDS, buildEmail, commitments, income, monthTasks, type EmailContext, type EmailKind, type Task } from '../data/quote-insights';
import { quoteLines, teamLines, TEAM_LINE_IDS, parseBrief, formatMoney, projectTitle, LINE_PRESETS, phaseTotals, DEFAULT_EXCLUDED, DEFAULT_INCLUDED, DEFAULT_TERMS, type QuoteLine } from '../data/pricing';
import {
  STATUSES, MILESTONE_WHEN, NEED_DUE, addDays, approvedChanges, balanceDue, billedOption, changeTotals, currentQuoteId, dashboardStats, datedPlan, defaultNeeds, freshQuote,
  imageToDataUrl, invoiceStatus, isDefaultSchedule, loadLibrary, loadProfile, loadQuotes, milestoneDate, needDate, nextChangeNumber, nextMonday, nextReceiptNumber, paidTotal,
  canPhase, dateFit, margin, migrate, newOption, newQuoteNumber, nextInvoiceNumber, niceDate, optionKind, optionPlan, optionTimeline, optionTotals, quoteEmail, saveLibrary,
  saveProfile, saveQuotes, saveSettings, setCurrentQuoteId, lastBackupAt, markBackedUp, loadCapacity, saveCapacity, syncInvoice, today, uid, validUntil, warrantyEnd,
  RETAINER_EXCLUDED, addMonths, RETAINER_INCLUDED, RETAINER_TERMS, PACKAGES, loadPackageSettings, packagePrice, packageRate, planSavings, savePackageSettings, yearlyPrice, type PackageId, type PackagePrices, type PackageSettings, bankLine, defaultRetainer, isWeekend, packageTexts, packageHours, packageLine, packageOf, hoursText, monthFor, retainerMonths, retainerPlan, retainerTermsText,
  type ChangeOrder, type Invoice, type InvoiceLine, type LibraryItem, type MilestoneWhen, type NeedDue, type Profile, type QuoteOption, type QuoteState, type RetainerMonth, type Status, type SupportPackage,
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
let pkgSettings = loadPackageSettings();
const startId = currentQuoteId();
let state: QuoteState = startId && quotes[startId] ? quotes[startId] : freshQuote();
let view: 'dashboard' | 'editor' = Object.keys(quotes).length ? 'dashboard' : 'editor';
let filter: 'all' | 'retainer' | Status = 'all';

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
/** A short message at the bottom of the screen, optionally with one action (e.g. Undo, Reload). */
function toast(text: string, error = false, action?: { label: string; run: () => void }) {
  let t = document.querySelector<HTMLElement>('.q-toast');
  if (!t) { t = el('div', { className: 'q-toast', role: 'status' }); document.body.append(t); }
  t.replaceChildren(el('span', { textContent: text }));
  if (action) {
    const b = el('button', { type: 'button', className: 'q-toast-action', textContent: action.label });
    b.addEventListener('click', () => { t!.classList.remove('is-on'); action.run(); });
    t.append(b);
  }
  t.classList.toggle('is-error', error);
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t!.classList.remove('is-on'), action ? 7000 : 2600);
}

/** A designed confirmation dialog. Resolves true when the person confirms. */
function confirmDialog(opts: { title: string; text: string; list?: string[]; confirm?: string; danger?: boolean }): Promise<boolean> {
  const d = $<HTMLDialogElement>('#q-confirm');
  $('#q-confirm-title').textContent = opts.title;
  $('#q-confirm-text').textContent = opts.text;
  $('#q-confirm-list').replaceChildren(...(opts.list ?? []).map((item) => el('li', { textContent: item })));
  const ok = $<HTMLButtonElement>('#q-confirm-ok');
  ok.textContent = opts.confirm ?? 'Delete';
  ok.classList.toggle('q-danger-btn', opts.danger !== false);
  d.classList.toggle('is-danger', opts.danger !== false);
  d.returnValue = '';
  d.showModal();
  return new Promise((resolve) => d.addEventListener('close', () => resolve(d.returnValue === 'ok'), { once: true }));
}

/**
 * Deletes something after confirmation, with Undo: the whole quote (or quote list / item library)
 * is snapshotted first, so undo restores exactly what was there.
 */
async function deleteWithUndo(opts: { title: string; text: string; list?: string[]; confirm?: string; done: string; scope?: 'quote' | 'quotes' | 'library'; run: () => void }) {
  if (!(await confirmDialog(opts))) return false;
  const scope = opts.scope ?? 'quote';
  const before = scope === 'quote' ? structuredClone(state) : scope === 'quotes' ? structuredClone(quotes) : structuredClone(library);
  const beforeId = state.id;
  opts.run();
  toast(opts.done, false, {
    label: 'Undo',
    run: () => {
      if (scope === 'quote') { if (state.id === beforeId) { state = before as QuoteState; renderEditor(); save(); } }
      else if (scope === 'quotes') {
        quotes = before as Record<string, QuoteState>;
        saveQuotes(quotes);
        // If the deleted quote was the one open in the editor, open it again.
        if (quotes[beforeId] && state.id !== beforeId) { state = quotes[beforeId]; setCurrentQuoteId(beforeId); }
        if (view === 'dashboard') renderDashboard(); else renderEditor();
      }
      else { library = before as LibraryItem[]; saveLibrary(library); renderLibrary(); }
      toast('Restored');
    },
  });
  return true;
}

/* ---------- Views ---------- */
function setView(next: 'dashboard' | 'editor') {
  view = next;
  $('#v-dashboard').hidden = next !== 'dashboard';
  $('#v-editor').hidden = next !== 'editor';
  $('#q-context').hidden = next !== 'editor';
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.view === next)));
  $('#q-mobile-bar').hidden = next !== 'editor';
  if (next === 'dashboard') renderDashboard(); else renderEditor();
  window.scrollTo({ top: 0 });
  maybeTour();
}
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view as 'dashboard' | 'editor')));

/* ---------- Dashboard ---------- */
/** Launched projects: how long they really took from kick-off, against the estimate. */
function renderAccuracy(all: QuoteState[]) {
  const box = $('#q-accuracy');
  const rows = all.flatMap((q) => {
    if (q.retainer || q.status !== 'accepted' || !q.delivery.kickoff || !q.delivery.launchedOn) return [];
    const plan = optionPlan(q.answers, billedOption(q));
    if (!plan) return [];
    const weeks = Math.round(((new Date(`${q.delivery.launchedOn}T00:00:00`).getTime() - new Date(`${q.delivery.kickoff}T00:00:00`).getTime()) / (7 * 86400000)) * 10) / 10;
    if (weeks <= 0) return [];
    return [{ q, low: plan.low, high: plan.high, weeks, off: weeks > plan.high ? weeks - plan.high : weeks < plan.low ? weeks - plan.low : 0 }];
  });
  box.hidden = !rows.length;
  if (!rows.length) return;
  const within = rows.filter((x) => x.off === 0).length;
  const avg = Math.round((rows.reduce((t, x) => t + x.off, 0) / rows.length) * 10) / 10;
  box.replaceChildren(el('details', { className: 'q-accuracy' },
    el('summary', {}, el('strong', { textContent: 'Estimate accuracy' }), el('span', { textContent: `${within} of ${rows.length} launched project${rows.length === 1 ? '' : 's'} within the estimate${avg ? ` · on average ${Math.abs(avg)} wk ${avg > 0 ? 'later' : 'sooner'} than the range` : ''}` })),
    el('p', { className: 'q-help', textContent: 'Real time from kick-off to launch, against the estimator’s range for each project. If projects keep running over, the estimator needs more time on that kind of work.' }),
    ...rows.map((x) => el('div', { className: 'q-accuracy-row' },
      el('span', { textContent: x.q.client.company || x.q.client.name || x.q.meta.number }),
      el('span', { className: 'q-muted', textContent: `Estimated ${x.low}–${x.high} wk` }),
      el('span', { textContent: `Took ${x.weeks} wk` }),
      el('span', { className: `q-chip-status is-${x.off === 0 ? 'accepted' : x.off > 0 ? 'declined' : 'sent'}`, textContent: x.off === 0 ? 'Within' : x.off > 0 ? `${Math.round(x.off * 10) / 10} wk over` : `${Math.round(-x.off * 10) / 10} wk early` })))));
}

function renderDashboard() {
  const all = Object.values(quotes).sort((a, b) => b.savedAt - a.savedAt);
  renderAccuracy(all);
  renderBackupNote(all);
  renderTodo(all);
  renderBusiness(all);
  const stats = dashboardStats(all);
  const currency = all[0]?.settings.currency ?? state.settings.currency;
  // Three key numbers, then small alerts (each one filters the list).
  const tiles: [string, string, string, string][] = [
    ['Accepted this month', money(stats.acceptedThisMonth, currency), new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), 'is-dark'],
    ['Awaiting reply', money(stats.awaiting.value, currency), `${stats.awaiting.count} sent quote${stats.awaiting.count === 1 ? '' : 's'}`, ''],
    ['Unpaid invoices', money(stats.unpaid, currency), stats.unpaid ? 'Balance still to collect' : 'Everything is paid', stats.unpaid ? 'is-due' : ''],
    ['Retainers', `${money(stats.retainers.monthly, currency)}`, `${stats.retainers.count} active · per month`, ''],
  ];
  $('#q-stats').replaceChildren(...tiles.map(([label, value, note, cls]) => el('div', { className: `q-stat ${cls}`.trim() }, el('span', { textContent: label }), el('strong', { textContent: value }), el('small', { textContent: note }))));
  const alerts: { text: string; count: number; warn: boolean; to: typeof filter }[] = [
    { text: 'follow-ups due', count: stats.followUps, warn: stats.followUps > 0, to: 'sent' },
    { text: 'expiring in 7 days', count: stats.expiring, warn: stats.expiring > 0, to: 'sent' },
    { text: 'in the bug-fix period', count: stats.warranty, warn: stats.warrantyEnding > 0, to: 'accepted' },
    { text: `retainer hrs used of ${hoursText(stats.retainerHours.available)}`, count: stats.retainerHours.used, warn: stats.retainerHours.near > 0, to: 'retainer' },
  ];
  $('#q-alerts').replaceChildren(...alerts.map((a) => {
    const b = el('button', { type: 'button', className: `q-alert${a.warn ? ' is-warn' : ''}${a.count ? '' : ' is-zero'}` }, el('strong', { textContent: hoursText(a.count) }), a.text);
    b.addEventListener('click', () => setFilter(a.to));
    return b;
  }));
  // Counts on the filters.
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((b) => {
    const f = b.dataset.filter!;
    b.dataset.count = String(f === 'all' ? all.length : f === 'retainer' ? all.filter((q) => q.retainer).length : all.filter((q) => q.status === f).length);
  });

  const term = ($<HTMLInputElement>('#q-search').value || '').trim().toLowerCase();
  const shown = all.filter((q) => (filter === 'all' || (filter === 'retainer' ? Boolean(q.retainer) : q.status === filter)) && (!term || [q.client.name, q.client.company, q.project.title, q.meta.number].join(' ').toLowerCase().includes(term)));
  const list = $('#q-list');
  if (!all.length) {
    list.replaceChildren(el('div', { className: 'q-dash-empty' }, el('strong', { textContent: 'No quotes yet' }), el('span', { textContent: 'Start one from a client’s estimate PDF.' }), el('div', { className: 'q-dash-empty-actions' }, Object.assign(el('button', { type: 'button', className: 'q-btn', textContent: 'New quote' }), { onclick: () => newQuote() }), Object.assign(el('button', { type: 'button', className: 'q-btn q-ghost', textContent: 'Try a sample quote' }), { onclick: () => sampleQuote() }))));
    return;
  }
  if (!shown.length) { list.replaceChildren(el('p', { className: 'q-empty', textContent: 'No quotes match.' })); return; }
  const now = today();
  const head = el('div', { className: 'q-list-head', ariaHidden: 'true' }, el('span', { textContent: 'Client & project' }), el('span', { textContent: 'Status' }), el('span', { textContent: 'Total' }), el('span', { textContent: 'Next step' }), el('span'));
  list.replaceChildren(head, ...shown.map((q) => {
    const o = billedOption(q);
    const total = optionTotals(q, o).total;
    const valid = validUntil(q);
    const unpaid = q.invoices.filter((i) => invoiceStatus(i) !== 'paid');
    const wEnd = warrantyEnd(q);
    const month = q.retainer && q.status === 'accepted' ? monthFor(q, now) : null;
    const next = q.retainer && q.status === 'accepted'
      ? q.retainer.endedOn && q.retainer.endedOn < now ? { text: `Retainer ended ${niceDate(q.retainer.endedOn)}`, warn: false }
        : month ? { text: `This month ${hoursText(month.used)} of ${hoursText(month.available)} hrs${unpaid.length ? ` · ${unpaid.length} unpaid` : ''}`, warn: month.available > 0 && month.used / month.available >= (q.retainer.warnAt || 80) / 100 || unpaid.some((i) => i.due < now) }
        : { text: `Retainer starts ${niceDate(q.retainer.start)}`, warn: false }
      : q.status === 'accepted' && wEnd
      ? wEnd >= now ? { text: `Bug-fix period ends ${niceDate(wEnd)}`, warn: wEnd <= addDays(now, 14) } : { text: `Launched ${niceDate(q.delivery.launchedOn)} · warranty ended`, warn: false }
      : q.status === 'sent'
      ? q.followUp && q.followUp <= now ? { text: `Follow up (${niceDate(q.followUp)})`, warn: true } : valid < now ? { text: 'Expired', warn: true } : { text: `Valid until ${niceDate(valid)}`, warn: valid <= addDays(now, 7) }
      : q.status === 'accepted' ? unpaid.length ? { text: `${unpaid.length} unpaid invoice${unpaid.length > 1 ? 's' : ''}`, warn: unpaid.some((i) => i.due < now) } : { text: q.invoices.length ? 'All invoices paid' : 'No invoices yet', warn: false }
      : { text: `Edited ${new Date(q.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`, warn: false };
    const select = el('select', { className: `q-chip-select is-${q.status}`, ariaLabel: 'Status' });
    STATUSES.forEach((s) => select.append(new Option(s.label, s.id)));
    select.value = q.status;
    select.addEventListener('click', (e) => e.stopPropagation());
    select.addEventListener('change', () => { setStatus(q, select.value as Status); quotes[q.id] = q; saveQuotes(quotes); renderDashboard(); });
    const row = el('article', { className: 'q-row', tabIndex: 0 },
      el('div', { className: 'q-row-main' },
        el('span', { className: `q-avatar${q.retainer ? ' is-retainer' : ''}`, textContent: initials(q.client.company || q.client.name), ariaHidden: 'true' }),
        el('div', {},
          el('strong', {}, q.client.company || q.client.name || 'Untitled client', ...(q.retainer ? [el('em', { className: 'q-badge', textContent: 'Retainer' })] : [])),
          el('span', { textContent: [q.project.title, q.meta.number].filter(Boolean).join(' · ') }))),
      select,
      el('div', { className: 'q-row-total' }, el('strong', { textContent: o.lines.length ? `${money(total, q.settings.currency)}${q.monthly ? ' / mo' : ''}` : '—' }), el('span', { textContent: q.retainer ? `Retainer · ${q.retainer.pkg && q.retainer.pkg !== 'custom' ? packageOf(q.retainer.pkg).name : `${hoursText(retainerPlan(q).hours)} hrs / month`}` : q.options.length > 1 ? `${q.options.length} options` : optionKind(o) })),
      el('span', { className: `q-row-next${next.warn ? ' is-warn' : ''}`, textContent: next.text }),
      el('div', { className: 'q-row-tools' },
        iconButton('⧉', `Duplicate ${q.meta.number}`, () => { duplicate(q); }),
        iconButton('×', `Delete ${q.meta.number}`, () => deleteWithUndo({
          title: 'Delete this quote?',
          text: `${q.client.company || q.client.name || 'Untitled client'} · ${q.meta.number}. This removes everything saved with it:`,
          list: [`${q.options.length} option${q.options.length === 1 ? '' : 's'} and their pricing`, ...(q.invoices.length ? [q.invoices.length === 1 ? '1 invoice and its payments' : `${q.invoices.length} invoices and their payments`] : []), ...(q.changes.length ? [`${q.changes.length} change order${q.changes.length === 1 ? '' : 's'}`] : []), 'The client checklist and delivery details'],
          done: `Deleted ${q.meta.number}`, scope: 'quotes',
          run: () => { delete quotes[q.id]; saveQuotes(quotes); if (q.id === state.id) state = freshQuote(); renderDashboard(); },
        }), 'is-danger')),
    );
    const open = () => openQuote(q);
    row.addEventListener('click', (e) => { if (!(e.target as HTMLElement).closest('button, select')) open(); });
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === row) open(); });
    return row;
  }));
}
/** Up to two initials for a client, for the avatar. */
const initials = (name: string) => (name || '?').split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
function setFilter(next: typeof filter) {
  filter = next;
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.filter === next)));
  renderDashboard();
}
document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((b) => b.addEventListener('click', () => setFilter(b.dataset.filter as typeof filter)));
$('#q-search').addEventListener('input', renderDashboard);

function newQuote() { state = freshQuote(); status(''); setView('editor'); }
function openQuote(q: QuoteState) { state = q; setCurrentQuoteId(q.id); logMonth = ''; status(''); setView('editor'); }
function duplicate(q: QuoteState) {
  const copy = migrate(structuredClone(q));
  Object.assign(copy, { id: uid(), savedAt: Date.now(), status: 'draft', statusDates: {}, followUp: '', invoices: [], acceptedOption: '', changes: [] });
  copy.needs = copy.needs.map((n) => ({ ...n, id: uid(), done: false }));
  copy.delivery = { ...copy.delivery, kickoff: nextMonday(addDays(today(), 7)), launchedOn: '', liveUrl: '', adminUrl: '', links: '', access: '', notes: '', testimonial: 'none', testimonialAsked: '' };
  copy.meta = { ...copy.meta, number: newQuoteNumber(), date: today() };
  if (copy.retainer) copy.retainer = { ...copy.retainer, log: [], endedOn: '' };
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
$<HTMLSelectElement>('#q-status-select').addEventListener('change', (e) => { setStatus(state, (e.target as HTMLSelectElement).value as Status); fillBound(); renderSummary(); renderTimeline(); renderNeeds(); renderChangeSummary(); save(); });
$<HTMLSelectElement>('#q-accepted').addEventListener('change', (e) => { state.acceptedOption = (e.target as HTMLSelectElement).value; renderSummary(); renderInvoices(); renderTimeline(); renderNeeds(); renderChangeSummary(); save(); });

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
  // The same value can have two fields (e.g. the discount in Pricing and in Retainer).
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(`[data-bind="${path}"]`).forEach((other) => { if (other !== f) other.value = f.value; });
  // A new rate moves every hourly line still on the old rate (custom rates stay), in every option.
  if (path === 'settings.rate') state.options.forEach((o) => o.lines.forEach((l) => { if ((l.unit ?? 'hours') === 'hours' && l.rate === before && l.id !== 'team') l.rate = state.settings.rate; }));
  if (path === 'teamRate') state.options.forEach((o) => o.lines.forEach((l) => { if (l.id === 'team' && l.rate === beforeTeam) l.rate = state.teamRate; }));
  if (path === 'teamPremium') state.options.forEach((o) => { if (o.team > 1 && o.lines.length) applyTeam(o, o.team); });
  if (path === 'settings.rate') state.options.forEach((o) => { if (o.team > 1 && o.lines.length) applyTeam(o, o.team); });
  if (['settings.rate', 'teamRate', 'teamPremium', 'settings.currency'].includes(path)) { renderLines(); renderOptionTabs(); }
  if (path.startsWith('delivery.') || path === 'meta.date') { renderTimeline(); renderNeeds(); renderSchedule(); renderDelivery(); }
  if (path === 'retainer.start' && state.retainer) state.delivery.kickoff = state.retainer.start;
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
      select.addEventListener('change', () => { state.answers[step.id] = select.value || undefined; scopeChanged(step.id); });
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
/** The launch date doesn't change the price (only how each option compares with it), so it doesn't ask for a recalculation. */
function scopeChanged(stepId = '') {
  if (stepId !== 'deadline') $('#q-dirty').hidden = false;
  state.options.forEach((o) => { o.timeline = optionTimeline(state.answers, o); });
  renderScope();
  renderOptionTabs();
  renderSummary();
  renderTimeline();
  save();
}

/* ---------- Pricing: options ---------- */
function calcOption(o: QuoteOption) {
  const { lines, result } = quoteLines(state.answers, state.settings, { team: o.team, teamRate: state.teamRate, teamPremium: state.teamPremium, essentials: o.essentials });
  const custom = o.lines.filter((l) => l.id.startsWith('custom-'));
  o.lines = [...lines, ...custom];
  // A support plan picked in the estimator becomes that package, at its price.
  const pkg = result.mode === 'monthly' ? PACKAGES.find((p) => p.id === result.support?.id && p.id !== 'custom') : undefined;
  if (pkg) o.lines = [packageLine(pkg, packageHours(pkg), packageRate(pkg.id, pkgSettings.prices, state.settings.rate)), ...o.lines.filter((l) => l.id !== 'retainer')];
  o.timeline = optionTimeline(state.answers, o);
  o.edited = false;
  state.monthly = result.mode === 'monthly';
  if (state.monthly && isDefaultSchedule(state.schedule)) state.schedule = [{ label: 'Billed monthly in advance', percent: 100 }];
}
async function recalc(ask = true) {
  const edited = state.options.some((o) => o.edited && o.lines.length);
  if (ask && edited && !(await confirmDialog({ title: 'Recalculate pricing?', text: 'Every option is recalculated from the scope. Your manual edits to calculated lines are replaced. Items you added yourself stay.', confirm: 'Recalculate', danger: false }))) return;
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
$<HTMLInputElement>('#q-option-essentials').addEventListener('change', async (e) => {
  const o = opt();
  const box = e.target as HTMLInputElement;
  if (o.edited && !(await confirmDialog({ title: 'Recalculate this option?', text: 'Switching recalculates this option’s lines. Your manual edits to calculated lines are replaced.', confirm: 'Switch', danger: false }))) { box.checked = o.essentials; return; }
  o.essentials = (e.target as HTMLInputElement).checked;
  calcOption(o);
  renderPricing();
  save();
});
$('#q-option-remove').addEventListener('click', () => {
  if (state.options.length < 2) return;
  const o = opt();
  deleteWithUndo({
    title: `Remove ${o.name}?`,
    text: `${optionKind(o)} · ${money(optionTotals(state, o).total)}. Its ${o.lines.length} line items are removed too.${state.acceptedOption === o.id ? ' It’s the accepted option, so the quote will need a new accepted option.' : ''}`,
    done: `Removed ${o.name}`,
    run: () => {
      const removed = state.options.splice(state.active, 1)[0];
      if (state.acceptedOption === removed.id) state.acceptedOption = '';
      state.active = Math.max(0, state.active - 1);
      renderPricing();
      save();
    },
  });
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
    row.dataset.line = line.id;
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
    const revisions = el('input', { type: 'number', min: '0', max: '9', value: String(line.revisions ?? 0), className: 'q-rev-input', ariaLabel: 'Revision rounds' });
    revisions.addEventListener('input', () => { line.revisions = Math.max(0, Math.min(9, Number(revisions.value) || 0)); revLabel.classList.toggle('is-on', Boolean(line.revisions)); o.edited = true; save(); });
    const revLabel = el('label', { className: `q-flag q-rev${line.revisions ? ' is-on' : ''}`, title: 'Rounds of revisions included (0 = not stated)' }, revisions, 'revisions');
    const flags = el('div', { className: 'q-flags' },
      revLabel,
      flag('Phase 2', line.phase === 2, (v) => { line.phase = v ? 2 : 1; changed(); }),
      flag('At cost', Boolean(line.passThrough), (v) => { line.passThrough = v; changed(); }),
      flag('Optional', Boolean(line.optional), (v) => { line.optional = v; changed(); }));
    const qty = el('input', { type: 'number', min: '0', step: 'any', value: String(line.hours), className: 'q-in q-num q-qty', ariaLabel: 'Quantity' });
    const unit = el('select', { className: 'q-in q-unit', ariaLabel: 'Unit' });
    unit.append(new Option(state.monthly ? 'hrs/mo' : 'hrs', 'hours'), new Option('fixed', 'fixed'));
    unit.value = line.unit ?? 'hours';
    const rate = el('input', { type: 'number', min: '0', step: 'any', value: String(line.rate), className: 'q-in q-num q-rate', ariaLabel: (line.unit ?? 'hours') === 'fixed' ? 'Price' : 'Hourly rate' });
    const amount = el('output', { className: 'q-amount', textContent: money(line.hours * line.rate) });
    // The hour bank's price follows its premium % (Retainer terms), so it isn't typed here.
    if (line.id === 'rollover') { [qty, rate].forEach((x) => { x.readOnly = true; x.title = 'Set by the hour bank premium in Retainer terms'; }); unit.disabled = true; }
    const update = () => { amount.textContent = money(line.hours * line.rate); o.edited = true; renderSummary(); renderOptionTabs(); save(); };
    title.addEventListener('input', () => { line.title = title.value; o.edited = true; save(); });
    detail.addEventListener('input', () => { line.detail = detail.value; grow(); o.edited = true; save(); });
    qty.addEventListener('input', () => { line.hours = Math.max(0, Number(qty.value) || 0); update(); });
    rate.addEventListener('input', () => { line.rate = Math.max(0, Number(rate.value) || 0); update(); });
    unit.addEventListener('change', () => { line.unit = unit.value as 'hours' | 'fixed'; if (line.unit === 'hours' && !line.rate) line.rate = state.settings.rate; changed(); });
    const tools = el('div', { className: 'q-row-tools' },
      iconButton('☆', `Save ${line.title} to your items`, () => saveToLibrary(line)),
      iconButton('⧉', `Duplicate ${line.title}`, () => { o.lines.splice(index + 1, 0, { ...line, id: `custom-${uid()}` }); changed(); }),
      iconButton('×', `Remove ${line.title}`, () => deleteWithUndo({
        title: 'Remove this item?',
        text: `${line.title || 'Untitled item'} · ${money(line.hours * line.rate)}${line.optional ? ' (optional extra)' : ''}.`,
        done: `Removed ${line.title || 'item'}`,
        run: () => { o.lines.splice(index, 1); changed(); },
      }), 'is-danger'));
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
    const remove = iconButton('×', `Remove ${item.title} from your items`, () => deleteWithUndo({
      title: 'Remove from your items?',
      text: `“${item.title}” is removed from your saved items. Quotes that already use it keep it.`,
      done: `Removed “${item.title}” from your items`, scope: 'library',
      run: () => { library = library.filter((i) => i.key !== item.key); saveLibrary(library); renderLibrary(); },
    }), 'is-danger');
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
  renderMode();
  renderContext();
  renderTotals();
  // Once accepted, the summary shows the accepted option: the same one payments and invoices use.
  const o = state.status === 'accepted' ? billedOption(state) : opt();
  const t = optionTotals(state, o);
  const ready = o.lines.some((l) => !l.optional);
  const multi = state.options.length > 1;
  $<HTMLSelectElement>('#q-status-select').value = state.status;
  $('.q-follow').hidden = state.status !== 'sent';
  $('#q-status-select').className = `is-${state.status}`;
  const acceptedWrap = $('#q-accepted-wrap');
  acceptedWrap.hidden = !(state.status === 'accepted' && multi);
  const acc = $<HTMLSelectElement>('#q-accepted');
  acc.replaceChildren(...state.options.map((x) => new Option(`${x.name} · ${money(optionTotals(state, x).total)}`, x.id)));
  acc.value = state.acceptedOption || o.id;

  $('#q-total-label').textContent = multi ? `${o.name} total${state.status === 'accepted' ? ' · accepted' : ''}` : state.monthly && state.retainer ? 'Monthly fee' : 'Quotation total';
  const total = $('#q-total');
  total.textContent = ready ? money(t.total) : '';
  total.classList.toggle('is-empty', !ready);
  $('#q-start').hidden = ready;
  $('.q-actions').classList.toggle('is-empty', !ready && !state.options.some((x) => x.lines.some((l) => !l.optional)));
  $('#q-sub').textContent = ready
    ? `${state.monthly ? 'Per month' : 'Fixed price'}${t.tax ? `, including ${state.pricing.taxLabel || 'tax'}` : ''}${t.optional ? ` · plus ${money(t.optional)} optional` : ''}${multi ? ` · ${state.options.length} options` : ''}`
    : 'Upload the client’s estimate to start pricing.';
  const hourly = o.lines.filter((l) => !l.optional && (l.unit ?? 'hours') === 'hours');
  const retainer = state.monthly ? state.retainer : undefined;
  const thisMonth = retainer ? monthFor(state) : null;
  const facts: [string, string][] = ready && retainer ? [
    ['Hours / month', hoursText(t.hours)],
    ['Average hourly rate', t.hours ? `${money(hourly.reduce((s, l) => s + l.hours * l.rate, 0) / t.hours)} / hr` : '—'],
    ['Extra hours', `${money(retainer.overageRate)} / hr`],
    [retainer.start > today() ? 'Starts' : 'Started', niceDate(retainer.start)],
    ...(thisMonth ? [['This month', `${hoursText(thisMonth.used)} of ${hoursText(thisMonth.available)} hrs`] as [string, string]] : []),
    ['Valid until', niceDate(validUntil(state))],
  ] : ready ? [
    ['Hours', `${Math.round(t.hours * 10) / 10}`],
    ['Average hourly rate', t.hours ? `${money(hourly.reduce((s, l) => s + l.hours * l.rate, 0) / t.hours)} / hr` : '—'],
    ...(() => {
      const plan = optionPlan(state.answers, o);
      const dated = datedPlan(state, o);
      if (!plan) return [['Timeline', o.timeline || optionTimeline(state.answers, o) || '—']] as [string, string][];
      return [['Timeline', `${plan.low}–${plan.high} weeks${o.team > 1 ? ` · ${o.team} devs` : ''}`], ...(dated ? [['Launch', `≈ ${niceDate(dated.launch)}`]] : [])] as [string, string][];
    })(),
    ...clientDateFact(o),
    ...budgetFact(t.total),
    ...(state.status === 'accepted' && approvedChanges(state).length ? [['With change orders', money(t.total + approvedChanges(state).reduce((s, c) => s + changeTotals(state, c).total, 0))] as [string, string]] : []),
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
  renderSendState();
  renderNext();
}

/** "Client budget: $2,000–$5,000 · above" for the summary, when they picked a budget in the estimator. */
function budgetFact(total: number): [string, string][] {
  const id = String(state.answers.budget ?? '');
  const range = BUDGET_RANGES[id];
  const label = steps.find((x) => x.id === 'budget')?.options?.find((x) => x.id === id)?.label;
  if (!label) return [];
  // Budgets are in US dollars, so only compare quotes in USD.
  if (!range || state.settings.currency !== 'USD') return [['Client budget', label]];
  const [low, high] = range;
  const verdict = total > high ? `${money(total - high)} above` : total < low ? 'below their range' : 'fits';
  return [['Client budget', `${label} · ${verdict}`]];
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
  // Same option as the summary: the accepted one once accepted, otherwise the one being edited.
  const o = state.status === 'accepted' ? billedOption(state) : opt();
  $('#q-profit-label').textContent = state.options.length > 1 ? `Profit check · ${o.name}` : 'Profit check';
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
  $('#q-profit-peek').textContent = o.lines.length ? `${money(m.yourTake)} · ${Math.round(m.marginPct * 100)}%` : '';
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
      const when = el('select', { className: 'q-in q-when', ariaLabel: 'When it’s due' });
      MILESTONE_WHEN.forEach((w) => when.append(new Option(w.label, w.id)));
      when.value = m.when ?? 'launch';
      const date = el('input', { type: 'date', className: 'q-in q-when-date', value: m.date ?? '', ariaLabel: 'Due date' });
      date.hidden = when.value !== 'date';
      const dateText = el('span', { className: 'q-when-text' });
      dateText.dataset.index = String(index);
      when.addEventListener('change', () => { m.when = when.value as MilestoneWhen; date.hidden = m.when !== 'date'; if (m.when === 'date' && !m.date) { m.date = milestoneDate(state, billedOption(state), { ...m, when: 'launch' }) || today(); date.value = m.date; } renderSchedule(false); save(); });
      date.addEventListener('input', () => { m.date = date.value; renderSchedule(false); save(); });
      const pct = el('input', { type: 'number', min: '0', max: '100', value: String(m.percent), className: 'q-in q-num', ariaLabel: 'Percent' });
      const amount = el('output', { className: 'q-amount' });
      amount.dataset.index = String(index);
      label.addEventListener('input', () => { m.label = label.value; renderSummary(); save(); });
      pct.addEventListener('input', () => { m.percent = Math.max(0, Number(pct.value) || 0); renderSummary(); save(); });
      const invoiced = state.invoices.some((i) => i.milestone === m.label);
      const invoice = el('button', { type: 'button', className: 'q-btn q-ghost q-small', textContent: invoiced ? 'Invoice again' : 'Create invoice' });
      invoice.addEventListener('click', () => createInvoice(m.label, m.percent));
      return el('div', { className: 'q-milestone' },
        el('span', { className: 'q-ms-num', textContent: String(index + 1).padStart(2, '0') }),
        el('div', { className: 'q-ms-main' }, label, el('div', { className: 'q-ms-when' }, when, date, dateText)),
        el('span', { className: 'q-pct' }, pct, '%'), amount, invoice,
        iconButton('×', `Remove ${m.label}`, () => deleteWithUndo({
          title: 'Remove this milestone?',
          text: `${m.label || 'Milestone'} · ${m.percent}%. The remaining milestones won’t add up to 100% until you adjust them.${state.invoices.some((i) => i.milestone === m.label) ? ' Invoices already created for it stay.' : ''}`,
          done: `Removed ${m.label || 'milestone'}`,
          run: () => { state.schedule.splice(index, 1); renderSchedule(); renderSummary(); save(); },
        }), 'is-danger'));
    }));
  }
  box.querySelectorAll<HTMLOutputElement>('output[data-index]').forEach((out) => { const m = state.schedule[Number(out.dataset.index)]; if (m) out.textContent = money((t.total * m.percent) / 100); });
  box.querySelectorAll<HTMLElement>('.q-when-text').forEach((span) => { const m = state.schedule[Number(span.dataset.index)]; const d = m ? milestoneDate(state, billedOption(state), m) : ''; span.textContent = d && m?.when !== 'date' ? `≈ ${niceDate(d)}` : ''; });
  box.querySelectorAll<HTMLButtonElement>('.q-small').forEach((b) => { b.disabled = !t.total; });
  const sum = state.schedule.reduce((s, m) => s + m.percent, 0);
  const st = $('#q-schedule-status');
  st.textContent = sum === 100 ? 'Adds up to 100%' : `Adds up to ${sum}%. It should total 100%.`;
  st.classList.toggle('is-error', sum !== 100);
}
$('#q-add-milestone').addEventListener('click', () => { state.schedule.push({ label: 'Milestone', percent: 0, when: 'build' }); renderSchedule(); renderSummary(); save(); });

function createInvoice(milestone: string, percent: number, fixed?: { amount: number; tax: number; changeId: string }) {
  const o = billedOption(state);
  const t = optionTotals(state, o);
  const amount = fixed ? fixed.amount : Math.round(t.total * percent) / 100;
  const tax = fixed ? fixed.tax : Math.round(t.tax * percent) / 100;
  const inv: Invoice = { id: uid(), number: nextInvoiceNumber(profile.invoicePrefix), milestone, percent, amount, tax, currency: state.settings.currency, issued: today(), due: addDays(today(), Number(profile.paymentDays) || 0), status: 'unpaid', payments: [], changeId: fixed?.changeId };
  state.invoices.push(inv);
  renderInvoices();
  renderSchedule();
  renderChanges();
  save();
  toast(`Created ${inv.number} for ${money(amount)}`);
  if (!profile.payment.trim()) toast('Tip: add how clients pay you in Business profile, so it shows on invoices.');
}

/** Payment methods to suggest: the labels from Business profile ("Wise", "PayPal"…). */
const paymentMethods = () => profile.payment.split(/\r?\n/).map((l) => l.split(':')[0].trim()).filter(Boolean);

function renderInvoices() {
  closePop('payment');
  const box = $('#q-invoices');
  if (!state.invoices.length) { box.replaceChildren(); return; }
  const now = today();
  box.replaceChildren(el('p', { className: 'q-invoices-title', textContent: 'Invoices' }), ...state.invoices.map((inv, index) => {
    syncInvoice(inv);
    const st = invoiceStatus(inv);
    const overdue = st !== 'paid' && inv.due < now;
    const chipText = st === 'paid' ? `Paid ${niceDate(inv.paidOn ?? '')}` : st === 'partial' ? `${money(balanceDue(inv), inv.currency)} left${overdue ? ' · overdue' : ''}` : overdue ? 'Overdue' : `Due ${niceDate(inv.due)}`;
    const chip = el('span', { className: `q-chip-status is-${st === 'paid' ? 'accepted' : overdue ? 'declined' : 'sent'}`, textContent: chipText });
    const view = el('button', { type: 'button', className: 'q-btn q-ghost q-small', textContent: 'View' });
    view.addEventListener('click', () => showPdf(view, async (m) => m.buildInvoicePdf(state, inv, profile)));
    const pdf = el('button', { type: 'button', className: 'q-btn q-small', textContent: 'Download' });
    pdf.addEventListener('click', () => savePdf(pdf, async (m) => m.buildInvoicePdf(state, inv, profile)));
    const pay = el('button', { type: 'button', className: 'q-btn q-ghost q-small', textContent: st === 'paid' ? 'Payments' : 'Record payment' });

    // Payment form + list (toggled)
    const panel = el('div', { className: 'q-pay-panel' });
    panel.hidden = true;
    const amount = el('input', { type: 'number', min: '0', step: 'any', value: String(balanceDue(inv)), className: 'q-in q-num', ariaLabel: 'Amount received' });
    const date = el('input', { type: 'date', value: today(), className: 'q-in', ariaLabel: 'Date received' });
    const method = el('input', { className: 'q-in', placeholder: 'Method (e.g. Wise)', value: paymentMethods()[0] ?? '', ariaLabel: 'Payment method' });
    method.setAttribute('list', 'q-methods');
    const note = el('input', { className: 'q-in', placeholder: 'Reference (optional)', ariaLabel: 'Reference' });
    const add = el('button', { type: 'button', className: 'q-btn q-small', textContent: 'Save payment' });
    add.addEventListener('click', async () => {
      const value = Math.round(Math.max(0, Number(amount.value) || 0) * 100) / 100;
      if (!value) { toast('Enter the amount received.', true); return; }
      if (value > balanceDue(inv) + 0.009 && !(await confirmDialog({ title: 'More than what’s due', text: `${money(value, inv.currency)} is more than the ${money(balanceDue(inv), inv.currency)} still due on ${inv.number}. Record it anyway?`, confirm: 'Record payment', danger: false }))) return;
      inv.payments.push({ id: uid(), date: date.value || today(), amount: value, method: method.value.trim(), note: note.value.trim(), receipt: nextReceiptNumber() });
      syncInvoice(inv);
      renderInvoices();
      renderSummary();
      save();
      toast(invoiceStatus(inv) === 'paid' ? `${inv.number} is now paid in full` : `Recorded. ${money(balanceDue(inv), inv.currency)} still due.`);
    });
    const list = el('div', { className: 'q-pay-list' }, ...inv.payments.map((pmt, pi) => {
      const receipt = el('button', { type: 'button', className: 'q-btn q-ghost q-small', textContent: 'Receipt' });
      receipt.addEventListener('click', () => showPdf(receipt, async (m) => m.buildReceiptPdf(state, inv, pmt, profile)));
      return el('div', { className: 'q-pay-row' },
        el('span', { textContent: `${niceDate(pmt.date)} · ${money(pmt.amount, inv.currency)}${pmt.method ? ` · ${pmt.method}` : ''}${pmt.note ? ` · ${pmt.note}` : ''}` }),
        el('span', { className: 'q-pay-receipt', textContent: pmt.receipt }), receipt,
        iconButton('×', `Delete payment of ${money(pmt.amount, inv.currency)}`, () => deleteWithUndo({
          title: 'Delete this payment?',
          text: `${money(pmt.amount, inv.currency)} received ${niceDate(pmt.date)}${pmt.method ? ` by ${pmt.method}` : ''} on ${inv.number}. Its receipt ${pmt.receipt} won’t be available any more, and the invoice balance goes back up.`,
          done: 'Payment deleted',
          run: () => { inv.payments.splice(pi, 1); syncInvoice(inv); renderInvoices(); renderSummary(); save(); },
        }), 'is-danger'));
    }));
    panel.append(...(st === 'paid' ? [] : [el('div', { className: 'q-pay-form' }, amount, date, method, note, add)]), list);
    pay.addEventListener('click', () => { if (guided()) popNode(panel, `${inv.number} · payments`, 'payment', st === 'paid' ? `Paid in full. Receipts for each payment are below.` : `${money(balanceDue(inv), inv.currency)} still due. Enter the amount received, the date, and how they paid.`); else panel.hidden = !panel.hidden; });
    if (inv.payments.length && st !== 'paid') panel.hidden = false;

    return el('div', { className: 'q-invoice-wrap' },
      el('div', { className: 'q-invoice' },
        el('div', {}, el('strong', { textContent: inv.number }), el('span', { textContent: `${inv.milestone}${inv.changeId || inv.lines ? '' : ` · ${inv.percent}%`}${inv.payments.length ? ` · paid ${money(paidTotal(inv), inv.currency)}` : ''}` })),
        el('strong', { className: 'q-amount', textContent: money(inv.amount, inv.currency) }), chip, view, pdf, pay,
        Object.assign(el('button', { type: 'button', className: 'q-btn q-ghost q-small', textContent: 'Email' }), { onclick: () => openEmail(state, st !== 'paid' && inv.due < now ? 'reminder' : 'invoice', { invoice: inv }) }),
        iconButton('×', `Delete ${inv.number}`, () => deleteWithUndo({
          title: `Delete invoice ${inv.number}?`,
          text: `${inv.milestone} · ${money(inv.amount, inv.currency)}.${inv.payments.length ? ' This also deletes:' : ' If you already sent it to the client, keep it and mark it paid or adjust it instead.'}`,
          list: inv.payments.length ? [inv.payments.length === 1 ? `1 recorded payment (${money(paidTotal(inv), inv.currency)}) and its receipt` : `${inv.payments.length} recorded payments (${money(paidTotal(inv), inv.currency)}) and their receipts`] : [],
          done: `Deleted ${inv.number}`,
          run: () => { state.invoices.splice(index, 1); renderInvoices(); renderSchedule(); renderChanges(); renderSummary(); save(); },
        }), 'is-danger')),
      panel);
  }), el('datalist', { id: 'q-methods' }, ...paymentMethods().map((m) => new Option(m))));
}

/* ---------- Timeline & dates ---------- */
function renderTimeline() {
  const box = $('#q-timeline');
  const o = state.status === 'accepted' ? billedOption(state) : opt();
  const d = datedPlan(state, o);
  if (estimate(state.answers).mode === 'monthly') { box.replaceChildren(el('p', { className: 'q-help', textContent: 'Support retainers run month to month, so there are no phase dates.' })); return; }
  if (!d) { box.replaceChildren(el('p', { className: 'q-empty', textContent: state.delivery.kickoff ? 'Import an estimate or pick a project type to see the dates.' : 'Pick a kick-off date to see the dates.' })); return; }
  const rows = d.phases.map((p) => el('div', { className: 'q-date-row' },
    el('i', { className: `q-dot phase-${p.id}` }), el('strong', { textContent: p.label }),
    el('span', { textContent: `${niceDate(p.start)} – ${niceDate(p.end)}` }), el('span', { className: 'q-muted', textContent: `~${p.display}` })));
  const extra = d.workingDays ? [el('p', { className: 'q-help q-gap-top', textContent: `Includes ${d.workingDays} working day${d.workingDays === 1 ? '' : 's'} added by approved change orders.` })] : [];
  box.replaceChildren(
    el('p', { className: 'q-date-head' }, el('span', { textContent: state.options.length > 1 ? `${o.name} · ` : '' }), el('strong', { textContent: `Launch around ${niceDate(d.launch, 'long')}` }), el('span', { className: 'q-muted', textContent: ` (between ${niceDate(d.earliest)} and ${niceDate(d.latest)})` })),
    ...rows, ...extra);
}
$('#q-kickoff-monday').addEventListener('click', () => { state.delivery.kickoff = nextMonday(addDays(today(), 7)); fillBound(); renderTimeline(); renderNeeds(); renderSchedule(); renderDelivery(); renderSummary(); save(); });

/* ---------- What we need from the client ---------- */
function renderNeeds() {
  const box = $('#q-needs');
  const o = state.status === 'accepted' ? billedOption(state) : opt();
  if (!state.needs.length) { box.replaceChildren(el('p', { className: 'q-empty', textContent: 'No items yet. Import an estimate to get a checklist, or add one.' })); renderProgress(); return; }
  const done = state.needs.filter((n) => n.done).length;
  box.replaceChildren(
    el('p', { className: 'q-needs-count', textContent: `${done} of ${state.needs.length} received` }),
    ...state.needs.map((n, index) => {
      const check = el('input', { type: 'checkbox', checked: n.done, ariaLabel: 'Received' });
      check.addEventListener('change', () => { n.done = check.checked; row.classList.toggle('is-done', n.done); renderNeeds(); save(); });
      const text = el('input', { value: n.text, className: 'q-in', ariaLabel: 'What the client provides' });
      text.addEventListener('input', () => { n.text = text.value; save(); });
      const due = el('select', { className: 'q-in q-when', ariaLabel: 'Needed by' });
      NEED_DUE.forEach((x) => due.append(new Option(x.label, x.id)));
      due.value = n.due;
      const date = needDate(state, o, n.due);
      const dateText = el('span', { className: 'q-when-text', textContent: date ? niceDate(date) : '' });
      due.addEventListener('change', () => { n.due = due.value as NeedDue; renderNeeds(); save(); });
      const row = el('div', { className: `q-need${n.done ? ' is-done' : ''}` }, check, text, due, dateText,
        iconButton('×', 'Remove item', () => deleteWithUndo({
          title: 'Remove this checklist item?',
          text: n.text || 'Empty item',
          done: 'Checklist item removed',
          run: () => { state.needs.splice(index, 1); renderNeeds(); save(); },
        }), 'is-danger'));
      return row;
    }));
  renderProgress();
}
$('#q-add-need').addEventListener('click', () => { state.needs.push({ id: uid(), text: '', due: 'kickoff', done: false }); renderNeeds(); save(); ($('#q-needs').querySelector<HTMLInputElement>('.q-need:last-child .q-in'))?.focus(); });
$('#q-reset-needs').addEventListener('click', async () => {
  if (!state.needs.length) { state.needs = defaultNeeds(state.answers); renderNeeds(); save(); return; }
  await deleteWithUndo({
    title: 'Rebuild the checklist?',
    text: `The ${state.needs.length} current items (${state.needs.filter((n) => n.done).length} ticked) are replaced with a fresh checklist from the scope.`,
    confirm: 'Rebuild', done: 'Checklist rebuilt',
    run: () => { state.needs = defaultNeeds(state.answers); renderNeeds(); save(); },
  });
});

/* ---------- Change orders ---------- */
function renderChanges() {
  const box = $('#q-changes');
  if (!state.changes.length) { box.replaceChildren(el('p', { className: 'q-empty', textContent: 'No change orders. Add one when the client asks for something outside the accepted scope.' })); renderChangeSummary(); return; }
  box.replaceChildren(...state.changes.map((c, index) => {
    const totals = changeTotals(state, c);
    const title = el('input', { value: c.title, className: 'q-in q-in-title', placeholder: 'What’s changing (e.g. Add a wholesale page)', ariaLabel: 'Change title' });
    title.addEventListener('input', () => { c.title = title.value; save(); });
    const detail = el('textarea', { value: c.detail, className: 'q-in', rows: 2, placeholder: 'Details: what’s included and why', ariaLabel: 'Change details' });
    detail.addEventListener('input', () => { c.detail = detail.value; save(); });
    const statusSel = el('select', { className: `q-chip-select is-${c.status === 'approved' ? 'accepted' : c.status}`, ariaLabel: 'Change status' });
    [['draft', 'Draft'], ['sent', 'Sent'], ['approved', 'Approved'], ['declined', 'Declined']].forEach(([v, l]) => statusSel.append(new Option(l, v)));
    statusSel.value = c.status;
    statusSel.addEventListener('change', () => { c.status = statusSel.value as ChangeOrder['status']; renderChanges(); renderTimeline(); renderNeeds(); renderSchedule(false); save(); });
    const days = el('input', { type: 'number', min: '0', value: String(c.days), className: 'q-in q-num', ariaLabel: 'Extra working days' });
    days.addEventListener('input', () => { c.days = Math.max(0, Number(days.value) || 0); renderTimeline(); renderChangeSummary(); save(); });
    const lines = el('div', { className: 'q-co-lines' }, ...c.lines.map((l, li) => {
      const lt = el('input', { value: l.title, className: 'q-in', placeholder: 'Item', ariaLabel: 'Item' });
      const lq = el('input', { type: 'number', min: '0', step: 'any', value: String(l.hours), className: 'q-in q-num', ariaLabel: 'Hours' });
      const lr = el('input', { type: 'number', min: '0', step: 'any', value: String(l.rate), className: 'q-in q-num', ariaLabel: 'Rate' });
      const la = el('output', { className: 'q-amount', textContent: money(l.hours * l.rate) });
      const upd = () => { la.textContent = money(l.hours * l.rate); totalEl.textContent = money(changeTotals(state, c).total); renderChangeSummary(); save(); };
      lt.addEventListener('input', () => { l.title = lt.value; save(); });
      lq.addEventListener('input', () => { l.hours = Math.max(0, Number(lq.value) || 0); upd(); });
      lr.addEventListener('input', () => { l.rate = Math.max(0, Number(lr.value) || 0); upd(); });
      return el('div', { className: 'q-co-line' }, lt, lq, el('span', { className: 'q-muted', textContent: 'hrs ×' }), lr, la, iconButton('×', 'Remove item', () => deleteWithUndo({
        title: 'Remove this item?',
        text: `${l.title || 'Untitled item'} · ${money(l.hours * l.rate)} from change order ${c.number}.`,
        done: 'Item removed',
        run: () => { c.lines.splice(li, 1); renderChanges(); save(); },
      }), 'is-danger'));
    }));
    const addItem = el('button', { type: 'button', className: 'q-link', textContent: '+ Add item' });
    addItem.addEventListener('click', () => { c.lines.push({ id: `co-${uid()}`, title: '', detail: '', hours: 1, rate: state.settings.rate, unit: 'hours' }); renderChanges(); save(); });
    const totalEl = el('strong', { textContent: money(totals.total) });
    const view = el('button', { type: 'button', className: 'q-btn q-ghost q-small', textContent: 'View' });
    view.addEventListener('click', () => showPdf(view, async (m) => m.buildChangeOrderPdf(state, c, profile)));
    const pdf = el('button', { type: 'button', className: 'q-btn q-small', textContent: 'Download' });
    pdf.addEventListener('click', () => savePdf(pdf, async (m) => m.buildChangeOrderPdf(state, c, profile)));
    const invoiced = state.invoices.some((i) => i.changeId === c.id);
    const invoice = el('button', { type: 'button', className: 'q-btn q-ghost q-small', textContent: invoiced ? 'Invoiced' : 'Create invoice' });
    invoice.disabled = invoiced || c.status !== 'approved' || !totals.total;
    invoice.title = c.status !== 'approved' ? 'Approve the change order first' : '';
    invoice.addEventListener('click', () => createInvoice(`Change order ${c.number}: ${c.title || 'extra work'}`, 100, { amount: Math.round(totals.total * 100) / 100, tax: Math.round(totals.tax * 100) / 100, changeId: c.id }));
    return el('div', { className: 'q-co' },
      el('div', { className: 'q-co-head' }, el('strong', { textContent: c.number }), el('span', { className: 'q-muted', textContent: niceDate(c.date) }), statusSel,
        iconButton('×', `Delete ${c.number}`, () => deleteWithUndo({
          title: `Delete change order ${c.number}?`,
          text: `${c.title || 'Untitled change'} · ${money(totals.total)}${c.status === 'approved' ? '. It’s approved, so the project total and launch date change back.' : '.'}${invoiced ? ' Its invoice stays.' : ''}`,
          done: `Deleted ${c.number}`,
          run: () => { state.changes.splice(index, 1); renderChanges(); renderTimeline(); renderNeeds(); renderSchedule(false); renderSummary(); save(); },
        }), 'is-danger')),
      title, detail, lines, addItem,
      el('div', { className: 'q-co-foot' },
        el('label', { className: 'q-co-days' }, 'Adds', days, 'working days'),
        el('span', { className: 'q-co-total' }, 'Total ', totalEl),
        view, pdf, invoice));
  }));
  renderChangeSummary();
}
function renderChangeSummary() {
  const o = billedOption(state);
  const base = optionTotals(state, o).total;
  const approved = approvedChanges(state);
  const extra = approved.reduce((s, c) => s + changeTotals(state, c).total, 0);
  const days = approved.reduce((s, c) => s + (Number(c.days) || 0), 0);
  $('#q-change-summary').textContent = approved.length
    ? `Accepted quote ${money(base)} + ${approved.length} approved change${approved.length > 1 ? 's' : ''} ${money(extra)} = ${money(base + extra)} project total${days ? `, ${days} extra working days` : ''}.`
    : '';
}
$('#q-add-change').addEventListener('click', () => {
  if (guided()) { openChangeOrder(); return; }
  state.changes.push({ id: uid(), number: nextChangeNumber(state), date: today(), title: '', detail: '', lines: [{ id: `co-${uid()}`, title: '', detail: '', hours: 4, rate: state.settings.rate, unit: 'hours' }], days: 2, status: 'draft' });
  renderChanges();
  save();
  ($('#q-changes').querySelector<HTMLInputElement>('.q-co:last-child .q-in-title'))?.focus();
});

/* ---------- Delivery: kick-off, launch, warranty, handover ---------- */
function renderDelivery() {
  const end = warrantyEnd(state);
  const now = today();
  $('#q-warranty').textContent = !state.delivery.launchedOn
    ? 'Set the launch date once the site is live to start the bug-fix period.'
    : end >= now ? `Bug-fix period runs until ${niceDate(end, 'long')} (${Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${now}T00:00:00`).getTime()) / 86400000)} days left).` : `Bug-fix period ended on ${niceDate(end, 'long')}.`;
  $('#q-warranty').classList.toggle('is-warn', Boolean(end) && end >= now && end <= addDays(now, 14));
  const ready = billedOption(state).lines.some((l) => !l.optional);
  ($('#q-kickoff-view') as HTMLButtonElement).disabled = !ready;
  ($('#q-kickoff-pdf') as HTMLButtonElement).disabled = !ready;
  renderStartRetainer();
}
$('#q-launched-today').addEventListener('click', () => { state.delivery.launchedOn = today(); fillBound(); renderDelivery(); save(); });
$('#q-kickoff-view').addEventListener('click', () => showPdf($<HTMLButtonElement>('#q-kickoff-view'), async (m) => m.buildKickoffPdf(state, profile)));
$('#q-kickoff-pdf').addEventListener('click', () => savePdf($<HTMLButtonElement>('#q-kickoff-pdf'), async (m) => m.buildKickoffPdf(state, profile)));
$('#q-handover-view').addEventListener('click', () => showPdf($<HTMLButtonElement>('#q-handover-view'), async (m) => m.buildHandoverPdf(state, profile)));
$('#q-handover-pdf').addEventListener('click', () => savePdf($<HTMLButtonElement>('#q-handover-pdf'), async (m) => m.buildHandoverPdf(state, profile)));

/* ---------- Retainers ---------- */
const round2 = (n: number) => Math.round(n * 100) / 100;
/** The month whose hours are shown in the log (its start date). */
let logMonth = '';

/** Monthly quotes always carry retainer terms; a new one swaps the project texts for retainer ones. */
function ensureRetainer() {
  if (!state.monthly || state.retainer) return;
  // The plan picked in the estimator (if any) sets the package; the price list sets savings, yearly offer and extra hours.
  const plan = estimate(state.answers).support;
  const pkg = PACKAGES.find((p) => p.id === plan?.id && p.id !== 'custom');
  state.retainer = {
    ...defaultRetainer({ start: state.delivery.kickoff, rate: state.settings.rate }),
    overageRate: pkgSettings.payg, paygRate: pkgSettings.payg, freeMonths: pkgSettings.freeMonths,
    ...(pkg ? { pkg: pkg.id, dailyHours: pkg.daily, weekendEmergency: pkg.emergency, response: pkg.response } : {}),
  };
  const texts = pkg ? packageTexts(pkg) : { included: RETAINER_INCLUDED.join('\n'), excluded: RETAINER_EXCLUDED.join('\n') };
  if (state.text.included === DEFAULT_INCLUDED.join('\n')) state.text.included = texts.included;
  if (state.text.excluded === DEFAULT_EXCLUDED.join('\n')) state.text.excluded = texts.excluded;
  if (state.text.terms === DEFAULT_TERMS.join('\n')) state.text.terms = RETAINER_TERMS.join('\n');
  fillBound();
}

/**
 * Keeps the hour bank's price line in step with the retainer terms and the other lines.
 * Adding or removing it redraws the lines; a price change only updates that row (so typing elsewhere keeps focus).
 */
function syncBankLines() {
  const r = state.monthly ? state.retainer : undefined;
  let redraw = false;
  for (const o of state.options) {
    const i = o.lines.findIndex((l) => l.id === 'rollover');
    const want = r ? bankLine(r, o.lines) : null;
    if (!want) { if (i >= 0) { o.lines.splice(i, 1); redraw = true; } continue; }
    if (i < 0) { o.lines.push(want); redraw = true; continue; }
    const have = o.lines[i];
    if (have.rate !== want.rate || have.title !== want.title || have.detail !== want.detail) {
      o.lines[i] = { ...have, ...want };
      if (o === opt()) {
        const row = document.querySelector<HTMLElement>('#q-lines [data-line="rollover"]');
        if (have.title !== want.title || have.detail !== want.detail || !row) redraw = true;
        else { row.querySelector<HTMLInputElement>('.q-rate')!.value = String(want.rate); row.querySelector('.q-amount')!.textContent = money(want.rate); }
      }
    }
  }
  if (redraw) { renderLines(); renderOptionTabs(); }
}

/** The header above the editor: which quote this is. */
function renderContext() {
  const who = state.client.company || state.client.name;
  $('#q-ctx-avatar').textContent = initials(who);
  $('#q-ctx-avatar').classList.toggle('is-retainer', Boolean(state.retainer && state.monthly));
  $('#q-ctx-client').textContent = who || 'New quote';
  $('#q-ctx-sub').textContent = [state.retainer && state.monthly ? 'Retainer' : 'Project', state.project.title, state.meta.number, STATUSES.find((x) => x.id === state.status)?.label].filter(Boolean).join(' · ');
}

/** Sticky section bar: the sections shown for this quote, ticked when done (from the progress checks). */
const SECTION_CHECK: Record<string, string> = { 's-import': 'import', 's-client': 'client', 's-scope': 'scope', 's-pricing': 'pricing', 's-retainer': 'retainer', 's-dates': 'dates', 's-payment': 'payment', 's-needs': 'needs', 's-terms': 'terms' };
const SECTION_SHORT: Record<string, string> = { 's-import': 'Import', 's-client': 'Client', 's-scope': 'Scope', 's-pricing': 'Pricing', 's-retainer': 'Retainer', 's-dates': 'Dates', 's-payment': 'Payments', 's-needs': 'Checklist', 's-terms': 'Terms', 's-changes': 'Changes', 's-delivery': 'Delivery' };
let jumpKey = '';
function renderJump() {
  const sections = [...document.querySelectorAll<HTMLElement>('#v-editor .q-main > .q-card')].filter((x) => !x.hidden);
  const key = sections.map((x) => x.id).join(',');
  if (key === jumpKey) return;
  jumpKey = key;
  $('#q-jump').replaceChildren(...sections.map((sec, i) => {
    const a = el('a', { href: `#${sec.id}` }, el('i', { textContent: String(i + 1).padStart(2, '0') }), SECTION_SHORT[sec.id] ?? sec.querySelector('h2')?.textContent ?? '');
    a.dataset.section = sec.id;
    return a;
  }));
  sections.forEach((sec) => sectionObserver.observe(sec));
}
// Highlights the section being read.
const sectionObserver = new IntersectionObserver((entries) => {
  if (guided()) return;
  for (const e of entries) if (e.isIntersecting) document.querySelectorAll<HTMLElement>('#q-jump a').forEach((a) => a.classList.toggle('is-active', a.dataset.section === e.target.id));
}, { rootMargin: '-30% 0px -60% 0px' });

/** A package whose hours were edited by hand in Pricing becomes a custom package. */
function syncPackage() {
  const r = state.monthly ? state.retainer : undefined;
  if (!r || r.pkg === 'custom') return;
  const line = billedOption(state).lines.find((l) => l.id === 'retainer');
  if (!line || line.hours !== packageHours(packageOf(r.pkg))) { r.pkg = 'custom'; r.dailyHours = 0; r.weekendEmergency = false; }
}

/** Package cards: name, hours, the monthly price, and what it saves against pay-as-you-go. Medium is "Most popular". */
function renderPackageCards(box: HTMLElement, selected: string, priceFor: (p: SupportPackage) => number, customHours: number, onPick: (p: SupportPackage) => void) {
  box.replaceChildren(...PACKAGES.map((p) => {
    const hours = p.id === 'custom' ? customHours : packageHours(p);
    const price = priceFor(p);
    const saved = planSavings(hours, price, pkgSettings.payg);
    const b = el('button', { type: 'button', role: 'radio', className: `q-pkg is-${p.id}${p.popular ? ' is-popular' : ''}` },
      ...(p.popular ? [el('i', { className: 'q-pkg-badge', textContent: 'Most popular' })] : []),
      el('strong', { textContent: p.name }),
      el('span', { textContent: p.daily ? `${p.daily} hrs a day, Mon–Fri` : `${hoursText(hours)} hrs a month` }),
      el('em', { textContent: `${money(price)} / mo` }),
      // A saving if there is one; otherwise the price per day, which feels small.
      el('b', { className: `q-pkg-save${saved ? '' : ' is-daily'}`, textContent: saved ? `Save ${money(saved)}/mo vs pay-as-you-go` : `About ${money(Math.round(price / 30))} a day` }),
      el('small', { textContent: p.blurb }));
    b.setAttribute('aria-checked', String(p.id === selected));
    b.addEventListener('click', () => onPick(p));
    return b;
  }));
}

/** Your price list (monthly prices, pay-as-you-go rate, yearly offer, hourly rates on PDFs), under the package cards. */
function renderPackageRates() {
  const ps = pkgSettings;
  document.querySelectorAll<HTMLElement>('[data-pkg-rates]').forEach((box) => {
    const num = (value: number, label: string, onChange: (v: number) => void, width = '') => {
      const input = el('input', { type: 'number', min: '0', step: 'any', value: String(value), ariaLabel: label });
      if (width) input.style.width = width;
      input.addEventListener('change', () => onChange(Math.max(0, Number(input.value) || 0)));
      return input;
    };
    const hide = el('input', { type: 'checkbox', checked: ps.hideRates, ariaLabel: 'Hide hourly rates on client PDFs' });
    hide.addEventListener('change', () => updateSettings({ hideRates: hide.checked }, hide.checked ? 'Client PDFs show monthly prices only' : 'Client PDFs show hourly rates'));
    box.replaceChildren(
      el('div', { className: 'q-pkg-rates-row' },
        el('span', { className: 'q-pkg-rates-title', textContent: 'Monthly prices' }),
        ...PACKAGES.filter((p) => p.id !== 'custom').map((p) => {
          const id = p.id as keyof PackagePrices;
          return el('label', {}, p.name, el('span', { className: 'q-pkg-rate' }, '$', num(ps.prices[id], `${p.name} monthly price`, (v) => setPackagePrice(id, v)), '/mo'));
        })),
      el('div', { className: 'q-pkg-rates-row' },
        el('label', {}, 'Pay-as-you-go', el('span', { className: 'q-pkg-rate' }, '$', num(ps.payg, 'Pay-as-you-go hourly rate', (v) => updateSettings({ payg: v }, `Savings now compare with ${money(v)} an hour`)), '/hr')),
        el('label', {}, 'Yearly prepay', el('span', { className: 'q-pkg-rate' }, num(ps.freeMonths, 'Months free when paying yearly', (v) => updateSettings({ freeMonths: Math.min(11, Math.round(v)) }, v ? `Yearly prepay: ${Math.round(v)} months free` : 'No yearly offer'), '48px'), 'months free')),
        el('label', { className: 'q-pkg-hide' }, hide, 'Hide hourly rates on client PDFs')));
  });
}
function updateSettings(patch: Partial<PackageSettings>, message: string) {
  pkgSettings = { ...pkgSettings, ...patch };
  savePackageSettings(pkgSettings);
  renderPackageRates();
  updateRetainerFee();
  if (state.monthly && state.retainer) renderRetainer();
  toast(message);
}
/** Changes one package's monthly price: the price list, the cards, and this retainer if it uses that package at the old price. */
function setPackagePrice(id: keyof PackagePrices, price: number) {
  const before = pkgSettings.prices[id];
  pkgSettings = { ...pkgSettings, prices: { ...pkgSettings.prices, [id]: price } };
  savePackageSettings(pkgSettings);
  const r = state.monthly ? state.retainer : undefined;
  if (r && r.pkg === id) {
    const rate = packageRate(id, pkgSettings.prices, state.settings.rate);
    for (const o of state.options) o.lines.forEach((l) => { if (l.id === 'retainer' && Math.abs(l.hours * l.rate - before) < 0.05) l.rate = rate; });
    renderPricing();
    save();
  }
  if (startPkg.id === id) $<HTMLInputElement>('#q-ret-price').value = String(price);
  renderPackageRates();
  updateRetainerFee();
  if (r) renderRetainer();
  toast(`${packageOf(id).name} is now ${money(price)} a month`);
}

/** Switches a retainer quote to a package: its price line, daily hours, response time and weekend emergencies. */
async function setPackage(p: SupportPackage) {
  const r = state.retainer;
  if (!r || p.id === r.pkg) return;
  if (r.log.length && !(await confirmDialog({ title: `Switch to ${p.name}?`, text: 'The new hours apply to every month of this retainer, including months already logged. To change from a date, end this retainer and start a new one.', confirm: 'Switch', danger: false }))) return;
  const current = billedOption(state).lines.find((l) => l.id === 'retainer');
  const hours = p.id === 'custom' ? current?.hours || 20 : packageHours(p);
  // Each package has its own rate; Custom keeps the current one.
  const rate = p.id === 'custom' ? current?.rate ?? state.settings.rate : packageRate(p.id, pkgSettings.prices, state.settings.rate);
  for (const o of state.options) {
    const i = o.lines.findIndex((l) => l.id === 'retainer');
    const line = packageLine(p, hours, rate);
    if (i >= 0) o.lines[i] = { ...o.lines[i], ...line }; else o.lines.unshift(line);
  }
  const wasDefault = PACKAGES.some((x) => x.response === r.response);
  Object.assign(r, { pkg: p.id, dailyHours: p.daily, weekendEmergency: p.emergency });
  if (wasDefault) r.response = p.response;
  // Swap the covered / not covered lists too, unless they were edited by hand.
  const stock = [...PACKAGES.map(packageTexts), { included: RETAINER_INCLUDED.join('\n'), excluded: RETAINER_EXCLUDED.join('\n') }];
  const edited = !stock.some((t) => t.included === state.text.included) || !stock.some((t) => t.excluded === state.text.excluded);
  if (!edited) Object.assign(state.text, packageTexts(p));
  state.answers.hours = String(hours);
  fillBound();
  renderPricing();
  save();
  toast(edited ? `Switched to ${p.name}. Your edited covered / not covered lists were kept.` : `Switched to ${p.name}`);
}
/**
 * Packages PDFs: data-packages-pdf is every package, data-package-pdf only the chosen one.
 * Each package is priced at its own rate; the chosen one at the rate typed (or the retainer's rate).
 */
function packagesPdfOptions(only: boolean) {
  const r = state.monthly ? state.retainer : undefined;
  const line = r ? billedOption(state).lines.find((l) => l.id === 'retainer') : undefined;
  const chosen: PackageId = r ? r.pkg : startPkg.id;
  const customHours = r ? line?.hours ?? 20 : Number($<HTMLInputElement>('#q-ret-hours').value) || 20;
  const chosenPrice = r ? retainerPlan(state).subtotal : startPrice();
  const prices = Object.fromEntries(PACKAGES.map((p) => [p.id, p.id === chosen ? chosenPrice : packagePrice(p.id, pkgSettings.prices, 20, state.settings.rate)])) as Record<PackageId, number>;
  // On a retainer quote, the single-package PDF uses the quote's own covered / not covered lists.
  const lists = r ? { included: state.text.included.split('\n').filter((x) => x.trim()), excluded: state.text.excluded.split('\n').filter((x) => x.trim()) } : undefined;
  const client = state.client.name || state.client.company ? state : undefined;
  const discount = r ? retainerPlan(state).discount : startDiscount(chosenPrice);
  return {
    prices, currency: state.settings.currency, client, recommended: chosen, customHours,
    payg: r ? r.paygRate : pkgSettings.payg, freeMonths: r ? r.freeMonths : pkgSettings.freeMonths, hideRates: pkgSettings.hideRates,
    ...(only ? { only: chosen, lists, discount } : {}),
  };
}
document.querySelectorAll<HTMLButtonElement>('[data-packages-pdf], [data-package-pdf]').forEach((b) => b.addEventListener('click', () => {
  const only = Boolean(b.dataset.packagePdf);
  const build: Builder = async (m) => m.buildPackagesPdf(packagesPdfOptions(only), profile);
  if ((b.dataset.packagePdf ?? b.dataset.packagesPdf) === 'view') showPdf(b, build); else savePdf(b, build);
}));
$<HTMLInputElement>('#q-log-date').addEventListener('change', (e) => { if (state.retainer?.weekendEmergency) $<HTMLInputElement>('#q-log-emergency').checked = isWeekend((e.target as HTMLInputElement).value); });

/** Shows the sections for a project quote or a retainer quote, and numbers the visible ones. */
function renderMode() {
  ensureRetainer();
  syncPackage();
  // Before anything reads the fee: the hour bank's price depends on the other lines.
  syncBankLines();
  const ret = Boolean(state.monthly && state.retainer);
  ['#s-dates', '#s-changes', '#s-delivery'].forEach((id) => { $(id).hidden = ret; });
  $('#s-retainer').hidden = !ret;
  document.querySelectorAll<HTMLElement>('[data-project-only]').forEach((e) => { e.hidden = ret; });
  document.querySelectorAll<HTMLElement>('[data-retainer-only]').forEach((e) => { e.hidden = !ret; });
  $('#s-send').hidden = !guided();
  let n = 0;
  document.querySelectorAll<HTMLElement>('#v-editor .q-main > .q-card').forEach((sec) => { if (sec.hidden) return; n += 1; const step = sec.querySelector('.q-step'); if (step) step.textContent = String(n).padStart(2, '0'); });
  if (ret) renderRetainer();
  if (guided()) renderGuided(); else renderJump();
}

/** Delivery → Ongoing support: create a retainer quote that follows this project. */
function retainerStartDate() {
  const end = warrantyEnd(state);
  const after = end ? addDays(end, 1) : '';
  return after && after > today() ? after : today();
}
function renderStartRetainer() {
  const linked = Object.values(quotes).filter((q) => q.retainer?.fromQuote === state.id);
  $('#q-ret-existing').replaceChildren(...linked.map((q) => {
    const plan = retainerPlan(q);
    const b = el('button', { type: 'button', className: 'q-ret-link' },
      el('strong', { textContent: `Retainer ${q.meta.number}` }),
      el('span', { textContent: `${hoursText(plan.hours)} hrs / month · ${money(plan.fee, q.settings.currency)} / month · ${STATUSES.find((x) => x.id === q.status)?.label ?? ''}` }),
      el('em', { textContent: 'Open' }));
    b.addEventListener('click', () => openQuote(q));
    return b;
  }));
  const hours = $<HTMLInputElement>('#q-ret-hours');
  const date = $<HTMLInputElement>('#q-ret-date');
  if (hours.dataset.for !== state.id) {
    hours.dataset.for = state.id;
    // Start on the "Most popular" plan.
    pickStartPackage(PACKAGES.find((p) => p.popular) ?? PACKAGES[0]);
    date.value = retainerStartDate();
  }
  updateRetainerFee();
  $('#q-ret-create').textContent = linked.length ? 'Create another retainer quote' : 'Create retainer quote';
}
let startPkg: SupportPackage = PACKAGES[0];
/** The discount typed in the start form, for a monthly amount. */
function startDiscount(base: number) {
  const value = Math.max(0, Number($<HTMLInputElement>('#q-ret-discount').value) || 0);
  return Math.min(base, $<HTMLSelectElement>('#q-ret-discount-type').value === 'percent' ? (base * value) / 100 : value);
}
['#q-ret-discount', '#q-ret-discount-type'].forEach((sel) => $(sel).addEventListener('input', () => updateRetainerFee()));
/** The start form's monthly price before discount: a package's price (editable for this client), or Custom's hours × rate. */
function startPrice() {
  const hours = Number($<HTMLInputElement>('#q-ret-hours').value) || 0;
  return startPkg.id === 'custom' ? hours * (Number($<HTMLInputElement>('#q-ret-rate').value) || 0) : Number($<HTMLInputElement>('#q-ret-price').value) || 0;
}
/** Picks a package in the start form: its hours and monthly price (Custom: your hourly rate). */
function pickStartPackage(p: SupportPackage) {
  startPkg = p;
  if (p.id === 'custom') $<HTMLInputElement>('#q-ret-rate').value = String(state.settings.rate);
  else { $<HTMLInputElement>('#q-ret-hours').value = String(packageHours(p)); $<HTMLInputElement>('#q-ret-price').value = String(pkgSettings.prices[p.id]); }
  updateRetainerFee();
  if (p.id === 'custom') $<HTMLInputElement>('#q-ret-hours').focus();
}
function updateRetainerFee() {
  const custom = startPkg.id === 'custom';
  const hoursInput = $<HTMLInputElement>('#q-ret-hours');
  const rateInput = $<HTMLInputElement>('#q-ret-rate');
  const priceInput = $<HTMLInputElement>('#q-ret-price');
  if (!custom) hoursInput.value = String(packageHours(startPkg));
  hoursInput.disabled = !custom;
  rateInput.disabled = !custom;
  priceInput.disabled = custom;
  hoursInput.closest('label')!.firstChild!.textContent = startPkg.daily ? `Hours a month (${startPkg.daily} a day, Mon–Fri)` : 'Hours a month';
  const hours = Number(hoursInput.value) || 0;
  const price = startPrice();
  // Packages: the price is typed and the hourly rate follows. Custom: the other way round.
  if (custom) priceInput.value = String(Math.round(price * 100) / 100);
  else rateInput.value = hours ? String(Math.round((price / hours) * 100) / 100) : '0';
  const off = startDiscount(price);
  const saved = planSavings(hours, price - off, pkgSettings.payg);
  $('#q-ret-fee').textContent = `${money(price - off)}${state.pricing.tax ? ` + ${state.pricing.taxLabel || 'tax'}` : ''}`;
  $('#q-ret-discount-note').textContent = [off ? `${money(price)} − ${money(off)} discount, every month.` : 'Optional. Applies to every month of the retainer.', saved ? `Saves the client ${money(saved)} a month vs pay-as-you-go.` : ''].filter(Boolean).join(' ');
  // The price typed here is for the chosen package only; the other cards keep their list prices.
  renderPackageCards($('#q-ret-pkgs'), startPkg.id, (p) => (p.id === startPkg.id ? price : packagePrice(p.id, pkgSettings.prices, 20, state.settings.rate)), custom ? hours || 20 : 20, pickStartPackage);
  $('#q-ret-pkg-name').textContent = startPkg.name;
}
['#q-ret-hours', '#q-ret-rate', '#q-ret-price'].forEach((sel) => $(sel).addEventListener('input', updateRetainerFee));
$('#q-ret-create').addEventListener('click', () => {
  const p = state;
  const pkg = startPkg;
  const hours = pkg.id === 'custom' ? Math.max(1, Math.round((Number($<HTMLInputElement>('#q-ret-hours').value) || 20) * 4) / 4) : packageHours(pkg);
  // Packages: the hourly rate comes from the monthly price (4 decimals, so the line totals the price).
  const rate = pkg.id === 'custom' ? Math.max(0, Number($<HTMLInputElement>('#q-ret-rate').value) || p.settings.rate) : Math.round((startPrice() / hours) * 10000) / 10000;
  const start = $<HTMLInputElement>('#q-ret-date').value || today();
  const r = freshQuote();
  r.client = { ...p.client };
  r.settings = { ...p.settings };
  r.pricing = { ...p.pricing, discount: Math.max(0, Number($<HTMLInputElement>('#q-ret-discount').value) || 0), discountType: $<HTMLSelectElement>('#q-ret-discount-type').value as 'percent' | 'amount' };
  r.answers = { type: 'support', hours: String(hours), ...(p.answers.platform ? { platform: p.answers.platform } : {}) };
  r.monthly = true;
  r.project = {
    title: `${p.project.title || 'Website'}: ${pkg.id === 'custom' ? 'monthly' : pkg.name} support`,
    summary: `Ongoing help after launch${p.delivery.liveUrl ? ` for ${p.delivery.liveUrl}` : ''}: updates, fixes and improvements, with a set number of hours each month.`,
  };
  r.options = [{ ...newOption(pkg.id === 'custom' ? 'Monthly support' : `${pkg.name} support`), timeline: 'Ongoing, billed monthly', lines: [packageLine(pkg, hours, rate)] }];
  r.schedule = [{ label: 'Billed monthly in advance', percent: 100 }];
  r.text = { ...packageTexts(pkg), terms: RETAINER_TERMS.join('\n'), note: '' };
  r.needs = defaultNeeds(r.answers);
  r.delivery = { ...r.delivery, kickoff: start, channel: p.delivery.channel, liveUrl: p.delivery.liveUrl, adminUrl: p.delivery.adminUrl, warrantyDays: 0 };
  r.retainer = {
    ...defaultRetainer({ start, rate, fromQuote: p.id, fromNumber: p.meta.number }),
    pkg: pkg.id, dailyHours: pkg.daily, weekendEmergency: pkg.emergency, response: pkg.response,
    // Extra hours at your pay-as-you-go rate; the plan's savings compared with it; the yearly offer from your price list.
    overageRate: pkg.id === 'custom' ? rate : pkgSettings.payg, paygRate: pkgSettings.payg, freeMonths: pkgSettings.freeMonths,
  };
  r.meta.ref = p.meta.number;
  r.costRate = p.costRate;
  quotes[r.id] = r;
  saveQuotes(quotes);
  closePop();
  openQuote(r);
  requestAnimationFrame(() => goTo('s-retainer:setup'));
  toast(`Created retainer quote ${r.meta.number}. Check the terms, then send it.`);
});

function renderRetainer() {
  const r = state.retainer;
  if (!r) return;
  const now = today();
  // Months up to a week ahead, so next month can be invoiced in advance.
  const months = retainerMonths(state, addDays(now, 7));
  const current = months.find((m) => now >= m.start && now <= m.end) ?? null;

  const from = r.fromQuote ? quotes[r.fromQuote] : undefined;
  const fromBox = $('#q-ret-from');
  fromBox.hidden = !r.fromNumber;
  if (r.fromNumber) {
    const link = el('button', { type: 'button', className: 'q-link', textContent: `project ${r.fromNumber}` });
    link.addEventListener('click', () => { if (from) openQuote(from); });
    fromBox.replaceChildren('Follows ', from ? link : `project ${r.fromNumber}`, from?.project.title ? ` (${from.project.title})` : '', '.');
  }
  $('#q-ret-terms').replaceChildren(...retainerTermsText(state).map((t) => el('li', { textContent: t })));
  const plan = retainerPlan(state);
  const free = Math.max(0, Math.min(11, Math.round(r.freeMonths) || 0));
  const saved = r.paygRate ? planSavings(plan.hours, plan.beforeTax, r.paygRate) : 0;
  $('#q-ret-billing-summary').textContent = [
    r.billing === 'yearly' ? `Billed yearly: ${money(yearlyPrice(plan.fee, free))} for 12 months${free ? ` (${free} free)` : ''}. Create the yearly invoice under Months below.` : free ? `The quote also offers yearly prepay: ${money(yearlyPrice(plan.fee, free))} for 12 months (${free} free).` : 'No yearly offer on the quote.',
    saved ? `The quote shows the client saves ${money(saved)} a month vs pay-as-you-go at ${money(r.paygRate)}/hr.` : '',
  ].filter(Boolean).join(' ');
  $('#q-ret-discount-summary').textContent = plan.discount ? `${money(plan.subtotal)} − ${money(plan.discount)} discount = ${money(plan.beforeTax)} a month${plan.tax ? ` before ${state.pricing.taxLabel || 'tax'}` : ''}. Shown on the quote and every monthly invoice.` : 'No discount. Enter a percentage or a fixed amount taken off every month.';
  document.querySelectorAll<HTMLElement>('[data-rollover]').forEach((x) => { x.hidden = x.dataset.rollover !== r.rolloverMode; });
  document.querySelectorAll<HTMLElement>('[data-emergency-only]').forEach((x) => { x.hidden = !r.weekendEmergency; });
  const line = billedOption(state).lines.find((l) => l.id === 'retainer');
  renderPackageCards($('#q-ret-pkg-cards'), r.pkg, (p) => (p.id === r.pkg && line ? line.hours * line.rate : packagePrice(p.id, pkgSettings.prices, 20, state.settings.rate)), r.pkg === 'custom' ? line?.hours ?? 20 : 20, setPackage);
  $('#q-ret-pkg-name2').textContent = packageOf(r.pkg).name;
  renderRetainerNow(current);
  renderLog(months, current);
  renderMonths(months);
  const dateInput = $<HTMLInputElement>('#q-log-date');
  if (!dateInput.value) dateInput.value = now < r.start ? r.start : now;
}

function renderRetainerNow(m: RetainerMonth | null) {
  const r = state.retainer!;
  const plan = retainerPlan(state);
  const box = $('#q-ret-now');
  if (!plan.hours) { box.replaceChildren(el('p', { className: 'q-empty', textContent: 'Add the monthly hours in Pricing first.' })); return; }
  if (!m) {
    const text = r.endedOn && r.endedOn < today() ? `The retainer ended on ${niceDate(r.endedOn, 'long')}.` : `Starts on ${niceDate(r.start, 'long')}: ${hoursText(plan.hours)} hours a month.`;
    box.replaceChildren(el('p', { className: 'q-empty', textContent: text }));
    return;
  }
  const pct = m.available ? m.used / m.available : m.used ? 1 : 0;
  const warn = pct >= (r.warnAt || 80) / 100;
  const tone = m.over ? 'is-over' : warn ? 'is-warn' : '';
  const bar = el('span', { className: `q-meter ${tone}` }, el('i'));
  (bar.firstChild as HTMLElement).style.width = `${Math.min(100, Math.round(pct * 100))}%`;
  const note = m.over
    ? `${hoursText(m.over)} hrs over this month. Only bill them if the client approved: ${money(m.over * r.overageRate)} at ${money(r.overageRate)} an hour, added to the next invoice.`
    : warn
      ? `${Math.round(pct * 100)}% used, ${hoursText(m.remaining)} hrs left. Let the client know before going over.`
      : r.rolloverMode === 'bank'
        ? `${hoursText(m.remaining)} hrs left${m.carried ? `, including ${hoursText(m.carried)} banked from earlier months` : ''}. ${m.expired ? `Unused hours expire after ${niceDate(m.end)}, the end of this ${r.bankMonths}-month bank.` : `The bank runs until ${niceDate(m.bankEnd)}; unused hours then expire.`}`
        : `${hoursText(m.remaining)} hrs left${m.carried ? `, including ${hoursText(m.carried)} carried from last month` : ''}. ${m.carryNext ? `Up to ${hoursText(m.carryNext)} unused hrs carry into next month.` : 'Unused hours expire'} ${m.carryNext ? '' : `on ${niceDate(m.end)}.`}`.trim();
  box.replaceChildren(
    el('div', { className: 'q-meter-head' }, el('strong', { textContent: `${hoursText(m.used)} of ${hoursText(m.available)} hrs used` }), el('span', { textContent: r.dailyHours ? `${m.label} · ${hoursText(r.dailyHours)} hrs × ${hoursText(m.included / r.dailyHours)} working days` : m.label })),
    bar,
    el('p', { className: `q-meter-note ${tone}`, textContent: note }),
    ...(m.emergency ? [el('p', { className: 'q-meter-note', textContent: `Plus ${hoursText(m.emergency)} weekend emergency hrs, included in VIP.` })] : []));
}

function renderLog(months: RetainerMonth[], current: RetainerMonth | null) {
  const r = state.retainer!;
  const box = $('#q-ret-log');
  if (!r.log.length) { box.replaceChildren(el('p', { className: 'q-empty', textContent: 'No hours logged yet.' })); return; }
  const withHours = months.filter((m) => m.entries.length || m === current);
  if (!withHours.some((m) => m.start === logMonth)) logMonth = (current ?? withHours[withHours.length - 1])?.start ?? '';
  const pick = el('select', { className: 'q-in q-log-month', ariaLabel: 'Month' });
  [...withHours].reverse().forEach((m) => pick.append(new Option(`${m.label} · ${hoursText(m.used)} hrs`, m.start)));
  pick.value = logMonth;
  pick.addEventListener('change', () => { logMonth = pick.value; renderRetainer(); });
  const m = months.find((x) => x.start === logMonth);
  const outside = r.log.filter((e) => e.date < r.start).length;
  const rows = (m?.entries ?? []).map((e) => {
    const date = el('input', { type: 'date', value: e.date, className: 'q-in', ariaLabel: 'Date' });
    const task = el('input', { value: e.task, className: 'q-in', ariaLabel: 'Task' });
    const hours = el('input', { type: 'number', min: '0', step: '0.25', value: String(e.hours), className: 'q-in q-num', ariaLabel: 'Hours' });
    date.addEventListener('change', () => { if (!date.value || date.value < r.start) { date.value = e.date; toast(`Dates start from ${niceDate(r.start)}, when the retainer starts.`, true); return; } e.date = date.value; logMonth = monthFor(state, e.date)?.start ?? logMonth; renderSummary(); save(); });
    task.addEventListener('input', () => { e.task = task.value; save(); });
    hours.addEventListener('change', () => { e.hours = round2(Math.max(0, Number(hours.value) || 0)); renderSummary(); save(); });
    const flag = el('input', { type: 'checkbox', checked: Boolean(e.emergency), ariaLabel: 'Weekend emergency' });
    flag.addEventListener('change', () => { e.emergency = flag.checked; renderSummary(); save(); });
    const flagLabel = el('label', { className: `q-log-flag${e.emergency ? ' is-on' : ''}`, title: 'VIP weekend emergency: included, not taken from the weekday hours' }, flag, 'Emergency');
    // Only weekend entries (on VIP) can be emergencies; keep the tick visible on any entry already marked.
    flagLabel.hidden = !e.emergency && !(r.weekendEmergency && isWeekend(e.date));
    return el('div', { className: 'q-log-row' }, date, el('div', { className: 'q-log-task' }, task, flagLabel), hours,
      iconButton('×', 'Delete this time entry', () => deleteWithUndo({
        title: 'Delete this time entry?',
        text: `${niceDate(e.date)} · ${hoursText(e.hours)} hrs · ${e.task || 'No description'}. It comes off the month’s hours and the client’s report.`,
        done: 'Time entry deleted',
        run: () => { r.log = r.log.filter((x) => x.id !== e.id); renderSummary(); save(); },
      }), 'is-danger'));
  });
  box.replaceChildren(
    el('div', { className: 'q-log-head' }, pick, el('span', { className: 'q-muted', textContent: m ? `${m.entries.length} entr${m.entries.length === 1 ? 'y' : 'ies'}` : '' })),
    ...(rows.length ? rows : [el('p', { className: 'q-empty', textContent: 'No time logged this month yet.' })]),
    ...(outside ? [el('p', { className: 'q-help q-warn-text', textContent: `${outside} entr${outside === 1 ? 'y is' : 'ies are'} dated before the start (${niceDate(r.start)}) and not counted.` })] : []));
}

/** What a month's invoice holds: the fee, plus last month's extra hours if they haven't been billed. */
function retainerInvoiceDraft(m: RetainerMonth, extraOnly = false) {
  const r = state.retainer!;
  const plan = retainerPlan(state);
  const months = retainerMonths(state, addDays(today(), 7));
  const lines: InvoiceLine[] = [];
  if (!extraOnly) {
    lines.push({ title: `Monthly support · ${m.label}`, detail: `${hoursText(plan.hours)} hours of work${r.rolloverMode === 'bank' ? `, with a ${r.bankMonths}-month hour bank` : ''}, billed in advance`, amount: round2(plan.subtotal) });
    if (plan.discount) lines.push({ title: `Discount${state.pricing.discountType === 'percent' ? ` (${state.pricing.discount}%)` : ''}`, detail: 'Retainer discount, every month', amount: -round2(plan.discount) });
  }
  const src = extraOnly ? m : months[m.index - 1];
  // Last month's approved hours over the monthly hours. (VIP weekend emergencies are included, never billed.)
  const extra = src && src.over > 0 && !state.invoices.some((i) => i.overFor === src.start) ? src : null;
  if (extra) lines.push({ title: `Extra hours · ${extra.label}`, detail: `${hoursText(extra.over)} hrs at ${money(r.overageRate)} an hour, approved`, amount: round2(extra.over * r.overageRate) });
  const tax = round2((extraOnly ? 0 : plan.tax) + (extra ? (extra.over * r.overageRate * (state.pricing.tax || 0)) / 100 : 0));
  return { lines, tax, amount: round2(lines.reduce((s, l) => s + l.amount, 0) + tax), extra };
}
function createRetainerInvoice(m: RetainerMonth, extraOnly = false) {
  const d = retainerInvoiceDraft(m, extraOnly);
  if (!d.amount) { toast('Nothing to invoice for that month.', true); return; }
  const now = today();
  const days = Number(profile.paymentDays) || 0;
  const inv: Invoice = {
    id: uid(), number: nextInvoiceNumber(profile.invoicePrefix), milestone: extraOnly ? `Extra hours · ${m.label}` : `Monthly support · ${m.label}`,
    percent: 100, amount: d.amount, tax: d.tax, currency: state.settings.currency, issued: now,
    // Billed in advance: due on the month's first day, or within the usual days once the month has started.
    due: !extraOnly && m.start > now ? m.start : addDays(now, days),
    status: 'unpaid', payments: [], period: extraOnly ? undefined : m.start, overFor: d.extra?.start, overHours: d.extra?.over, lines: d.lines,
  };
  state.invoices.push(inv);
  renderInvoices();
  renderSummary();
  save();
  toast(`Created ${inv.number} for ${money(inv.amount)}${d.extra && !extraOnly ? `, including ${hoursText(d.extra.over)} extra hrs` : ''}`);
  if (!profile.payment.trim()) toast('Tip: add how clients pay you in Business profile, so it shows on invoices.');
}

function renderMonths(months: RetainerMonth[]) {
  const r = state.retainer!;
  const box = $('#q-ret-months');
  if (!months.length) { box.replaceChildren(el('p', { className: 'q-empty', textContent: `Months appear here from a week before the start (${niceDate(r.start, 'long')}).` })); return; }
  const now = today();
  const yearly = r.billing === 'yearly';
  // Yearly billing: one invoice covers the next 12 months that aren't invoiced yet.
  const yearRow: HTMLElement[] = [];
  if (yearly) {
    const first = firstUnbilledMonth();
    const d = yearlyInvoiceDraft(first);
    const b = el('button', { type: 'button', className: 'q-btn q-small', textContent: `Create yearly invoice (${money(d.amount)})` });
    b.addEventListener('click', () => createYearlyInvoice(first));
    yearRow.push(el('div', { className: 'q-ret-year' }, el('span', { textContent: `Next yearly invoice covers ${niceDate(first)} to ${niceDate(addDays(addMonths(r.start, monthIndexOf(first) + 12), -1))}${r.freeMonths ? `, with ${r.freeMonths} months free` : ''}.` }), b));
  }
  box.replaceChildren(...yearRow, ...[...months].reverse().map((m) => {
    const inv = state.invoices.find((i) => i.period === m.start || Boolean(i.periods?.includes(m.start)));
    const extraBilled = state.invoices.find((i) => i.overFor === m.start);
    const upcoming = m.start > now;
    const st = inv ? invoiceStatus(inv) : null;
    const chip = el('span', {
      className: `q-chip-status is-${!inv ? 'draft' : st === 'paid' ? 'accepted' : inv.due < now ? 'declined' : 'sent'}`,
      textContent: !inv ? (upcoming ? 'Starts soon' : 'Not invoiced') : `${inv.number} · ${st === 'paid' ? 'paid' : st === 'partial' ? 'part paid' : inv.due < now ? 'overdue' : 'unpaid'}`,
    });
    const done = m.end < now;
    const usage = upcoming ? `Starts ${niceDate(m.start)}` : `${hoursText(m.used)} of ${hoursText(m.available)} hrs${m.carried ? ` (${hoursText(m.carried)} ${r.rolloverMode === 'bank' ? 'banked' : 'carried'})` : ''}${m.over ? ` · ${hoursText(m.over)} over${extraBilled ? ', billed' : ''}` : ''}${m.emergency ? ` · ${hoursText(m.emergency)} weekend emergency (included)` : ''}${done && m.expired ? ` · ${hoursText(m.expired)} expired` : ''}${r.rolloverMode === 'bank' && m.bankEnd === m.end ? ' · bank ends' : ''}`;
    const tools: HTMLElement[] = [];
    if (!inv && !yearly) {
      const draft = retainerInvoiceDraft(m);
      const b = el('button', { type: 'button', className: 'q-btn q-small', textContent: 'Create invoice' });
      b.title = `${money(draft.amount)}${draft.extra ? `, including ${hoursText(draft.extra.over)} extra hrs from ${draft.extra.label}` : ''}`;
      b.disabled = !draft.amount;
      b.addEventListener('click', () => createRetainerInvoice(m));
      tools.push(b);
    }
    if (m.over && !extraBilled && m.end < now) {
      const b = el('button', { type: 'button', className: 'q-btn q-ghost q-small', textContent: 'Bill extra hours' });
      b.title = `${hoursText(m.over)} hrs × ${money(r.overageRate)}. Or leave them for next month’s invoice.`;
      b.addEventListener('click', () => createRetainerInvoice(m, true));
      tools.push(b);
    }
    if (!upcoming) {
      const view = el('button', { type: 'button', className: 'q-btn q-ghost q-small', textContent: 'Report' });
      view.title = 'View the usage report';
      view.addEventListener('click', () => showPdf(view, async (mod) => mod.buildUsageReportPdf(state, m.start, profile)));
      const pdf = iconButton('↓', `Download the usage report for ${m.label}`, () => savePdf(pdf, async (mod) => mod.buildUsageReportPdf(state, m.start, profile)));
      tools.push(view, pdf, Object.assign(el('button', { type: 'button', className: 'q-btn q-ghost q-small', textContent: 'Email' }), { onclick: () => openEmail(state, 'report', { month: m }) }));
    }
    const row = el('div', { className: `q-ret-month${m.start === logMonth ? ' is-current' : ''}` },
      el('div', { className: 'q-ret-month-main' }, el('strong', { textContent: m.label }), el('span', { textContent: usage })),
      chip, el('div', { className: 'q-ret-month-tools' }, ...tools));
    return row;
  }));
}

/* Yearly prepay */
const monthIndexOf = (start: string) => { const r = state.retainer!; let i = 0; while (addMonths(r.start, i) < start && i < 600) i += 1; return i; };
/** The first month (from the start) that no invoice covers yet. */
function firstUnbilledMonth() {
  const r = state.retainer!;
  for (let i = 0; i < 600; i++) {
    const start = addMonths(r.start, i);
    if (!state.invoices.some((inv) => inv.period === start || inv.periods?.includes(start))) return start;
  }
  return r.start;
}
/** 12 months from a month start: the fee for 12 months, any discount, the free months, and tax on what's paid. */
function yearlyInvoiceDraft(first: string) {
  const r = state.retainer!;
  const plan = retainerPlan(state);
  const free = Math.max(0, Math.min(11, Math.round(r.freeMonths) || 0));
  const i = monthIndexOf(first);
  const periods = Array.from({ length: 12 }, (_, k) => addMonths(r.start, i + k));
  const end = addDays(addMonths(r.start, i + 12), -1);
  const lines: InvoiceLine[] = [{ title: `Support · 12 months`, detail: `${niceDate(first)} to ${niceDate(end)}, ${hoursText(plan.hours)} hours a month`, amount: round2(plan.subtotal * 12) }];
  if (plan.discount) lines.push({ title: `Discount${state.pricing.discountType === 'percent' ? ` (${state.pricing.discount}%)` : ''}`, detail: 'Every month', amount: -round2(plan.discount * 12) });
  if (free) lines.push({ title: `Yearly prepay: ${free} month${free === 1 ? '' : 's'} free`, detail: 'Paid yearly in advance', amount: -round2(plan.beforeTax * free) });
  const tax = round2(plan.tax * (12 - free));
  return { lines, tax, amount: round2(lines.reduce((t, l) => t + l.amount, 0) + tax), periods, end };
}
function createYearlyInvoice(first: string) {
  const d = yearlyInvoiceDraft(first);
  const now = today();
  const inv: Invoice = {
    id: uid(), number: nextInvoiceNumber(profile.invoicePrefix), milestone: `Yearly support · ${niceDate(first)} – ${niceDate(d.end)}`,
    percent: 100, amount: d.amount, tax: d.tax, currency: state.settings.currency, issued: now,
    due: first > now ? first : addDays(now, Number(profile.paymentDays) || 0),
    status: 'unpaid', payments: [], periods: d.periods, lines: d.lines,
  };
  state.invoices.push(inv);
  renderInvoices();
  renderSummary();
  save();
  toast(`Created ${inv.number} for ${money(inv.amount)}, covering 12 months`);
}

$<HTMLFormElement>('#q-ret-add').addEventListener('submit', (e) => {
  e.preventDefault();
  const r = state.retainer;
  if (!r) return;
  const date = $<HTMLInputElement>('#q-log-date').value || today();
  const hours = round2(Math.max(0, Number($<HTMLInputElement>('#q-log-hours').value) || 0));
  const task = $<HTMLInputElement>('#q-log-task').value.trim();
  if (!hours) { toast('Enter the hours worked.', true); return; }
  if (date < r.start) { toast(`That’s before the retainer starts (${niceDate(r.start)}).`, true); return; }
  if (r.endedOn && date > r.endedOn) { toast(`That’s after the retainer ended (${niceDate(r.endedOn)}).`, true); return; }
  const before = monthFor(state, date);
  const emergency = r.weekendEmergency && $<HTMLInputElement>('#q-log-emergency').checked;
  r.log.push({ id: uid(), date, hours, task, ...(emergency ? { emergency: true } : {}) });
  const after = monthFor(state, date);
  logMonth = after?.start ?? logMonth;
  $<HTMLInputElement>('#q-log-hours').value = '';
  $<HTMLInputElement>('#q-log-task').value = '';
  renderSummary();
  save();
  const limit = (r.warnAt || 80) / 100;
  const pct = (m: RetainerMonth | null) => (m && m.available ? m.used / m.available : 0);
  if (emergency) toast(`Added ${hoursText(hours)} weekend emergency hrs (included in VIP)`);
  else if (after && after.over && !(before && before.over)) toast(`${after.label} is now ${hoursText(after.over)} hrs over. Check the client approved extra hours.`, true);
  else if (after && pct(after) >= limit && pct(before) < limit) toast(`${Math.round(pct(after) * 100)}% of ${after.label}’s hours used. Let the client know.`);
  else toast(`Added ${hoursText(hours)} hrs`);
  $<HTMLInputElement>('#q-log-hours').focus();
});

/* ---------- Progress checklist ---------- */
function renderProgress() {
  const checks = progressChecks();
  if (!guided()) document.querySelectorAll<HTMLElement>('#q-jump a').forEach((a) => { const k = SECTION_CHECK[a.dataset.section!]; a.classList.toggle('is-done', Boolean(k && checks[k])); });
  const anchors = [...document.querySelectorAll<HTMLElement>('[data-check]')];
  anchors.forEach((a) => a.classList.toggle('is-done', checks[a.dataset.check!]));
  // Only the steps that apply to this kind of quote (project or retainer) count.
  const shownChecks = anchors.filter((a) => !a.hidden).map((a) => a.dataset.check!);
  const done = shownChecks.filter((k) => checks[k]).length;
  const all = shownChecks.length;
  $('#q-progress-count').textContent = `${done} of ${all}`;
  $('#q-progress-fill').style.width = `${Math.round((done / all) * 100)}%`;
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
  state.needs = defaultNeeds(answers);
  recalc(false);
  state.project.title = projectTitle(answers);
  fillBound();
  renderEditor();
  goTo('s-client');
}
async function importFile(file: File) {
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { status('That isn’t a PDF. Upload the estimate PDF from the estimator.', true); return; }
  const payload = readPayload(await file.arrayBuffer());
  if (!payload) { status('This PDF has no estimator data (it may be older than this tool). Paste the brief from the client’s email instead.', true); return; }
  applyAnswers(payload.answers, payload.ref);
  // Details the client typed in the estimator, if any.
  const c = payload.client;
  if (c && (c.name || c.email)) {
    state.client = { name: c.name || state.client.name, company: c.company || state.client.company, email: c.email || state.client.email, website: c.website || state.client.website };
    fillBound();
    renderSummary();
    save();
  }
  const count = Object.values(payload.answers).filter((v) => v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)).length;
  status(`Imported ${payload.ref} (${niceDate(payload.date, 'long')}): ${count} answers${c && (c.name || c.email) ? ` and ${c.name || c.email}’s details` : '. Add the client’s details next'}.`);
}
$<HTMLInputElement>('#q-file').addEventListener('change', (e) => { const input = e.target as HTMLInputElement; const file = input.files?.[0]; if (file) importFile(file); input.value = ''; });
const drop = $('#q-drop');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); const file = e.dataTransfer?.files[0]; if (file) importFile(file); });
/**
 * Client details in a pasted brief: the "From: name · company · email · website" line of the estimator's brief,
 * or the "name / email / company / website" fields of the emailed form.
 */
function briefClient(text: string) {
  const field = (label: string) => text.match(new RegExp(`^[ \\t]*${label}[ \\t]*[:\\t][ \\t]*(.+)$`, 'im'))?.[1]?.trim().replace(/^—$/, '') ?? '';
  const client = { name: field('name'), email: field('email'), company: field('company'), website: field('website') };
  const from = field('From');
  if (from) {
    const parts = from.split('·').map((p) => p.trim()).filter(Boolean);
    const email = parts.find((p) => p.includes('@')) ?? '';
    const website = parts.find((p) => !p.includes('@') && /\.[a-z]{2,}/i.test(p) && p !== parts[0]) ?? '';
    const company = parts.slice(1).find((p) => p !== email && p !== website) ?? '';
    Object.assign(client, { name: client.name || parts[0] || '', email: client.email || email, company: client.company || company, website: client.website || website });
  }
  return client;
}
$('#q-read').addEventListener('click', () => {
  const text = $<HTMLTextAreaElement>('#q-brief').value;
  const answers = parseBrief(text);
  if (!answers.type) { status('Couldn’t find the project details. Paste the lines that look like “Platform: Shopify”.', true); return; }
  applyAnswers(answers, text.match(/EST-\d{8}-[A-Z0-9]+/)?.[0] ?? '');
  const c = briefClient(text);
  if (c.name || c.email) {
    state.client = { name: c.name || state.client.name, company: c.company || state.client.company, email: c.email || state.client.email, website: c.website || state.client.website };
    fillBound();
    renderSummary();
    save();
  }
  status(`Read the brief: ${Object.keys(answers).length} answers${c.name || c.email ? ` and ${c.name || c.email}’s details` : '. Add the client’s details next'}.`);
});

/* ---------- PDFs ---------- */
type PdfModule = typeof import('./quote-pdf');
type Builder = (m: PdfModule) => Promise<{ doc: import('jspdf').jsPDF; filename: string }>;
const quoteBuilder: Builder = async (m) => m.buildQuotePdf(state, profile, { hideRates: pkgSettings.hideRates });
/** What the preview window's Download button saves (the quote, or the invoice being viewed). */
let dialogBuilder: Builder = quoteBuilder;

/**
 * Loads the PDF code. If this page was opened before the site was rebuilt, the old file is gone:
 * say so plainly and offer a reload (all work is already saved in this browser).
 */
async function loadPdf(): Promise<PdfModule | null> {
  try {
    return await import('./quote-pdf');
  } catch (error) {
    console.error(error);
    toast('This page was updated since you opened it. Reload to continue (your work is saved).', true, { label: 'Reload', run: () => location.reload() });
    return null;
  }
}
const isIconButton = (b: HTMLElement) => b.classList.contains('q-icon-btn');

/** Saves a PDF, with clear feedback on the button (and a toast if it fails). */
async function savePdf(button: HTMLButtonElement, build: Builder) {
  const label = button.textContent;
  if (!isIconButton(button)) button.textContent = 'Preparing…';
  button.disabled = true;
  const m = await loadPdf();
  if (!m) { button.textContent = label; button.disabled = false; return; }
  try {
    await m.download(build(m));
    if (!isIconButton(button)) button.textContent = 'Downloaded';
    toast('PDF downloaded. If nothing appears, use View and save it from the preview.');
  } catch (error) {
    console.error(error);
    if (!isIconButton(button)) button.textContent = 'Couldn’t create PDF';
    toast(`Couldn’t create the PDF${error instanceof Error && error.message ? ` (${error.message})` : ''}. Try View instead.`, true);
  }
  window.setTimeout(() => { button.textContent = label; button.disabled = false; }, 2200);
}

/** Shows a PDF in the preview window (a new tab on phones). */
const dialog = $<HTMLDialogElement>('#q-dialog');
let previewUrl = '';
async function showPdf(button: HTMLButtonElement, build: Builder) {
  const label = button.innerHTML;
  if (isIconButton(button)) button.setAttribute('aria-busy', 'true'); else button.textContent = 'Preparing…';
  try {
    const m = await loadPdf();
    if (!m) return;
    const { url, filename } = await m.preview(build(m));
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = url;
    dialogBuilder = build;
    if (window.matchMedia('(max-width: 700px)').matches) window.open(url, '_blank');
    else { $('#q-dialog-title').textContent = filename; $<HTMLIFrameElement>('#q-frame').src = url; dialog.showModal(); }
  } catch (error) {
    console.error(error);
    toast(`Couldn’t create the PDF${error instanceof Error && error.message ? ` (${error.message})` : ''}.`, true);
  } finally {
    button.innerHTML = label;
    button.removeAttribute('aria-busy');
  }
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
function backup() {
  const blob = new Blob([JSON.stringify({ v: 3, exported: new Date().toISOString(), profile, library, quotes }, null, 2)], { type: 'application/json' });
  const time = new Date().toTimeString().slice(0, 5).replace(':', '');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `quotes-backup-${today()}-${time}.json` });
  a.click();
  URL.revokeObjectURL(a.href);
  markBackedUp();
  toast('Backup downloaded. Keep it somewhere safe, like iCloud, Drive or Dropbox.');
  if (view === 'dashboard') renderDashboard();
}
$('#q-export').addEventListener('click', backup);
$<HTMLInputElement>('#q-restore').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  let data: any;
  let incoming: QuoteState[];
  try {
    data = JSON.parse(await file.text());
    incoming = Object.values<unknown>(data?.quotes ?? {}).map(migrate);
    if (!incoming.length) throw new Error('empty');
  } catch { toast('That file isn’t a quotes backup.', true); return; }
  // Check what the backup holds first, and never replace a quote that's newer in this browser.
  const added = incoming.filter((q) => !quotes[q.id]);
  const newer = incoming.filter((q) => quotes[q.id] && q.savedAt > quotes[q.id].savedAt);
  const kept = incoming.length - added.length - newer.length;
  const invoiceCount = incoming.reduce((t, q) => t + q.invoices.length, 0);
  const ok = await confirmDialog({
    title: 'Restore this backup?',
    text: `Backup from ${data.exported ? new Date(data.exported).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'an unknown date'}: ${incoming.length} quote${incoming.length === 1 ? '' : 's'} and ${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'}.`,
    list: [`${added.length} new quote${added.length === 1 ? '' : 's'} will be added`, `${newer.length} will be updated (the backup’s version is newer)`, `${kept} kept as they are (this browser’s version is the same or newer)`],
    confirm: 'Restore', danger: false,
  });
  if (!ok) return;
  try {
    for (const q of [...added, ...newer]) quotes[q.id] = q;
    saveQuotes(quotes);
    if (data.library?.length) { library = [...library, ...data.library.filter((i: LibraryItem) => !library.some((x) => x.title === i.title))]; saveLibrary(library); }
    if (data.profile && !profile.payment && !profile.logo) { profile = { ...profile, ...data.profile }; saveProfile(profile); }
    renderDashboard();
    toast(`Restored: ${added.length} added, ${newer.length} updated`);
  } catch { toast('Couldn’t restore that backup.', true); }
});

/* ---------- Backup reminder ---------- */
function renderBackupNote(all: QuoteState[]) {
  const box = $('#q-backup');
  const last = lastBackupAt();
  const daysSince = last ? Math.floor((Date.now() - last) / 86400000) : -1;
  $('.q-dash-note').textContent = last ? `Last backup ${daysSince === 0 ? 'today' : `${daysSince} day${daysSince === 1 ? '' : 's'} ago`}. Quotes are saved in this browser only.` : 'Quotes are saved in this browser only. Back up now and then.';
  const due = all.length > 0 && (daysSince < 0 || daysSince >= 7);
  box.hidden = !due;
  if (!due) return;
  const button = el('button', { type: 'button', className: 'q-btn q-small', textContent: 'Back up now' });
  button.addEventListener('click', backup);
  box.replaceChildren(
    el('span', {}, el('strong', { textContent: daysSince < 0 ? 'You haven’t backed up yet.' : `Last backup ${daysSince} days ago.` }), ` Everything (${all.length} quote${all.length === 1 ? '' : 's'}, invoices and hours) lives only in this browser.`),
    button);
}

/* ---------- This month ---------- */
function renderTodo(all: QuoteState[]) {
  const tasks = monthTasks(all);
  $('#q-todo').hidden = !tasks.length;
  $('#q-todo-title').textContent = `This month · ${tasks.length}`;
  $('#q-todo-list').replaceChildren(...tasks.map((t) => {
    const q = quotes[t.quoteId];
    const open = el('button', { type: 'button', className: 'q-btn q-ghost q-small', textContent: 'Open' });
    open.addEventListener('click', () => openQuote(q));
    const actions: HTMLElement[] = [open];
    if (t.email) {
      const ctx: EmailContext = { invoice: q.invoices.find((i) => i.id === t.invoiceId), month: t.monthStart ? retainerMonths(q, addDays(today(), 7)).find((m) => m.start === t.monthStart) : undefined };
      const email = el('button', { type: 'button', className: 'q-btn q-small', textContent: 'Email' });
      email.addEventListener('click', () => openEmail(q, t.email!, ctx));
      actions.push(email);
    }
    return el('div', { className: `q-task is-${t.tone}` },
      el('i', { className: 'q-task-dot' }),
      el('div', { className: 'q-task-main' }, el('strong', { textContent: t.title }), el('span', { textContent: `${t.client} · ${t.detail}` })),
      el('div', { className: 'q-task-actions' }, ...actions));
  }));
}

/* ---------- Capacity and income ---------- */
function renderBusiness(all: QuoteState[]) {
  const box = $('#q-business');
  if (!all.length) { box.replaceChildren(); return; }
  const currency = all[0]?.settings.currency ?? state.settings.currency;
  // Capacity: hours committed this month against what you can do.
  const cap = loadCapacity();
  const items = commitments(all);
  const used = items.reduce((t, x) => t + x.hours, 0);
  const pct = cap ? used / cap : 0;
  const tone = pct > 1 ? 'is-over' : pct >= 0.85 ? 'is-warn' : '';
  const capInput = el('input', { type: 'number', min: '10', step: '5', value: String(cap), ariaLabel: 'Hours you can do a month' });
  capInput.addEventListener('change', () => { saveCapacity(Math.max(10, Number(capInput.value) || 130)); renderDashboard(); });
  const meter = el('span', { className: `q-meter ${tone}` }, el('i'));
  (meter.firstChild as HTMLElement).style.width = `${Math.min(100, Math.round(pct * 100))}%`;
  const free = Math.round(cap - used);
  const capCard = el('div', { className: 'q-biz-card' },
    el('div', { className: 'q-biz-head' }, el('span', { className: 'q-biz-label', textContent: 'Capacity this month' }), el('label', { className: 'q-biz-cap' }, capInput, 'hrs a month')),
    el('strong', { className: 'q-biz-figure', textContent: `${Math.round(used)} of ${cap} hrs` }),
    meter,
    el('p', { className: `q-biz-note ${tone}`, textContent: pct > 1 ? `Over capacity by ${-free} hrs: you’ll need help (or later start dates) before taking on more.` : pct >= 0.85 ? `Nearly full: ${free} hrs free. A Large or VIP plan would need a second developer.` : free >= 40 ? `${free} hrs free: room for about ${Math.floor(free / 40)} more Medium plan${Math.floor(free / 40) === 1 ? '' : 's'}.` : `${free} hrs free: enough for a Basic plan, not a Medium one.` }),
    el('ul', { className: 'q-biz-list' }, ...items.slice(0, 6).map((x) => el('li', {}, el('span', { textContent: x.client }), el('span', { className: 'q-muted', textContent: `${x.kind} · ${x.hours} hrs` })))));
  // Income: recurring, paid this year, what you keep, and the last 12 months.
  const inc = income(all);
  const max = Math.max(1, ...inc.months.map((m) => Math.max(m.invoiced, m.paid)));
  const chart = el('div', { className: 'q-chart', role: 'img', ariaLabel: 'Invoiced and paid over the last 12 months' },
    ...inc.months.map((m) => {
      const a = el('i', { className: 'is-invoiced' });
      const b = el('i', { className: 'is-paid' });
      a.style.height = `${(m.invoiced / max) * 100}%`;
      b.style.height = `${(m.paid / max) * 100}%`;
      return el('div', { className: 'q-chart-col', title: `${m.label}: invoiced ${money(m.invoiced, currency)}, paid ${money(m.paid, currency)}` }, el('div', { className: 'q-chart-bars' }, a, b), el('span', { textContent: m.label }));
    }));
  const figure = (value: string, label: string) => el('div', {}, el('strong', { className: 'q-biz-figure', textContent: value }), el('span', { textContent: label }));
  const incCard = el('div', { className: 'q-biz-card' },
    el('div', { className: 'q-biz-head' }, el('span', { className: 'q-biz-label', textContent: 'Income' }), el('span', { className: 'q-chart-key' }, el('i', { className: 'is-invoiced' }), 'Invoiced', el('i', { className: 'is-paid' }), 'Paid')),
    el('div', { className: 'q-biz-figures' }, figure(money(inc.recurring, currency), 'Recurring each month'), figure(money(inc.paidYear, currency), `Paid in ${today().slice(0, 4)}`), figure(money(inc.keptYear, currency), 'Yours after helpers (est.)')),
    chart);
  box.replaceChildren(capCard, incCard);
}

/* ---------- Emails ---------- */
const emailDialog = $<HTMLDialogElement>('#q-emails');
let emailFor: { q: QuoteState; ctx: EmailContext } | null = null;
/** Opens the email window for a quote, ready to copy or open in the mail app. */
function openEmail(q: QuoteState, kind: EmailKind, ctx: EmailContext = {}) {
  emailFor = { q, ctx };
  const retainer = Boolean(q.retainer && q.monthly);
  const sel = $<HTMLSelectElement>('#q-email-kind');
  sel.replaceChildren(...EMAIL_KINDS.filter((k) => k.for === 'any' || (k.for === 'retainer') === retainer).map((k) => new Option(k.label, k.id)));
  sel.value = kind;
  fillEmail();
  $('#q-emails-title').textContent = `Email · ${q.client.company || q.client.name || q.meta.number}`;
  emailDialog.showModal();
}
function fillEmail() {
  if (!emailFor) return;
  const kind = $<HTMLSelectElement>('#q-email-kind').value as EmailKind;
  const e = buildEmail(emailFor.q, kind, profile, { ...emailFor.ctx, prices: pkgSettings.prices });
  $<HTMLInputElement>('#q-email-to').value = emailFor.q.client.email || '(no email saved for this client)';
  $<HTMLInputElement>('#q-email-subject').value = e.subject;
  $<HTMLTextAreaElement>('#q-email-text').value = e.body;
  $('#q-email-note').textContent = ['invoice', 'reminder', 'report'].includes(kind) ? 'Attach the PDF before sending.' : kind === 'testimonial' ? 'Copying or opening it marks the testimonial as asked, with today’s date.' : '';
  syncEmailLink();
}
function syncEmailLink() {
  if (!emailFor) return;
  const subject = $<HTMLInputElement>('#q-email-subject').value;
  const body = $<HTMLTextAreaElement>('#q-email-text').value;
  $<HTMLAnchorElement>('#q-email-open').href = `mailto:${encodeURIComponent(emailFor.q.client.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
/** After an email is copied or opened: a testimonial request marks the quote as asked. */
function emailSent() {
  if (!emailFor) return;
  const kind = $<HTMLSelectElement>('#q-email-kind').value as EmailKind;
  const q = emailFor.q;
  if (kind === 'testimonial' && q.delivery.testimonial === 'none') {
    q.delivery.testimonial = 'asked';
    q.delivery.testimonialAsked = today();
    if (q === state) { fillBound(); save(); } else { quotes[q.id] = q; saveQuotes(quotes); }
    if (view === 'dashboard') renderDashboard();
  }
}
$('#q-email-kind').addEventListener('change', fillEmail);
['#q-email-subject', '#q-email-text'].forEach((sel) => $(sel).addEventListener('input', syncEmailLink));
$('#q-email-copy').addEventListener('click', async () => {
  const text = `Subject: ${$<HTMLInputElement>('#q-email-subject').value}\n\n${$<HTMLTextAreaElement>('#q-email-text').value}`;
  try { await navigator.clipboard.writeText(text); toast('Email copied'); emailSent(); } catch { toast('Couldn’t copy. Use “Open in email app”.', true); }
});
$('#q-email-open').addEventListener('click', () => emailSent());
document.querySelectorAll<HTMLButtonElement>('[data-email-kind]').forEach((b) => b.addEventListener('click', () => openEmail(state, b.dataset.emailKind as EmailKind)));
$('#q-more-emails').addEventListener('click', () => {
  const retainer = Boolean(state.retainer && state.monthly);
  const unpaid = state.invoices.find((i) => balanceDue(i) > 0);
  openEmail(state, unpaid ? (unpaid.due < today() ? 'reminder' : 'invoice') : retainer ? 'report' : state.status === 'sent' ? 'followup' : state.delivery.launchedOn ? 'testimonial' : 'followup', unpaid ? { invoice: unpaid } : {});
});

/* ---------- Layout: guided (stages and steps) or classic (one long page) ---------- */
// Both layouts use the same quotes and the same sections; switching only changes what's shown.
const LAYOUT_KEY = 'quote-layout-v1';
const TOUR_KEY = 'quote-tour-v1';
const readKey = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const writeKey = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } };
let layout: 'guided' | 'classic' = (new URLSearchParams(location.search).get('layout') ?? readKey(LAYOUT_KEY)) === 'classic' ? 'classic' : 'guided';
const guided = () => layout === 'guided';
function applyLayout() {
  $('.quote-page').classList.toggle('q-guided', guided());
  // Folded extras: closed in the guided layout, always open in the classic one.
  document.querySelectorAll<HTMLDetailsElement>('details.q-more').forEach((d) => { d.open = !guided(); });
  $('#q-layout-toggle').textContent = guided() ? 'Classic layout' : 'Guided layout';
  jumpKey = '';
  closePop();
  if (view === 'editor') renderEditor();
}
$('#q-layout-toggle').addEventListener('click', () => {
  layout = guided() ? 'classic' : 'guided';
  writeKey(LAYOUT_KEY, layout);
  applyLayout();
  toast(guided() ? 'Guided layout: one step at a time.' : 'Classic layout: every section on one page.');
});

type StageId = 'build' | 'send' | 'run' | 'deliver';
interface Stage { id: StageId; label: string; steps: string[] }
const STEP_LABEL: Record<string, string> = { ...SECTION_SHORT, 's-send': 'Send', 's-payment:plan': 'Payment plan', 's-payment': 'Invoices', 's-retainer:setup': 'Retainer terms', 's-retainer:run': 'Hours & months' };
const sectionShown = (step: string) => !document.getElementById(step.split(':')[0])?.hidden;
/** The stages for this quote, each with the steps (sections, or part of one) that apply to it. */
function stagesFor(): Stage[] {
  const ret = Boolean(state.monthly && state.retainer);
  const stages: Stage[] = ret ? [
    { id: 'build', label: 'Build the quote', steps: ['s-import', 's-client', 's-scope', 's-pricing', 's-retainer:setup', 's-terms'] },
    { id: 'send', label: 'Send it', steps: ['s-send'] },
    { id: 'run', label: 'Monthly work', steps: ['s-retainer:run', 's-payment', 's-needs'] },
  ] : [
    { id: 'build', label: 'Build the quote', steps: ['s-import', 's-client', 's-scope', 's-pricing', 's-dates', 's-payment:plan', 's-terms'] },
    { id: 'send', label: 'Send it', steps: ['s-send'] },
    { id: 'run', label: 'Run the project', steps: ['s-payment', 's-needs', 's-changes'] },
    { id: 'deliver', label: 'Deliver', steps: ['s-delivery'] },
  ];
  return stages.map((s) => ({ ...s, steps: s.steps.filter(sectionShown) }));
}
function progressChecks(): Record<string, boolean> {
  return {
    import: Boolean(state.answers.type),
    client: Boolean((state.client.name || state.client.company) && state.client.email),
    scope: Boolean(state.answers.type) && $('#q-dirty').hidden,
    pricing: state.options.some((o) => o.lines.some((l) => !l.optional)),
    payment: state.schedule.reduce((s, m) => s + m.percent, 0) === 100,
    terms: Boolean(state.text.terms.trim()),
    dates: Boolean(state.delivery.kickoff),
    needs: state.needs.length > 0 && state.needs.every((n) => n.done),
    retainer: Boolean(state.retainer?.start) && (state.retainer?.overageRate ?? 0) > 0,
  };
}
function stepDone(step: string, c: Record<string, boolean>) {
  const [sid, part] = step.split(':');
  if (sid === 's-send') return state.status !== 'draft';
  if (sid === 's-payment' && !part) return state.invoices.length > 0 && state.invoices.every((i) => invoiceStatus(i) === 'paid');
  if (sid === 's-delivery') return Boolean(state.delivery.launchedOn);
  if (sid === 's-changes' || part === 'run') return false;
  if (!c.pricing && sid !== 's-client') return false;
  const k = SECTION_CHECK[sid];
  return Boolean(k && c[k]);
}
/** Where a quote opens: the stage that matches its status, at the first step not done yet. */
function defaultStage(): StageId {
  if (state.status === 'accepted') return state.monthly && state.retainer ? 'run' : state.delivery.launchedOn ? 'deliver' : 'run';
  return state.status === 'draft' ? 'build' : 'send';
}
let stage: StageId = 'build';
let stepOf: Partial<Record<StageId, number>> = {};
let guidedFor = '';
/** Shows one step at a time: the stage tabs, the steps in this stage, and Back / Next. */
function renderGuided() {
  const stages = stagesFor();
  const c = progressChecks();
  if (guidedFor !== state.id) {
    guidedFor = state.id;
    stage = defaultStage();
    stepOf = {};
    const first = stages.find((s) => s.id === stage)?.steps.findIndex((st) => !stepDone(st, c)) ?? 0;
    stepOf[stage] = Math.max(0, first);
  }
  if (!stages.some((s) => s.id === stage)) stage = 'build';
  const si = stages.findIndex((s) => s.id === stage);
  const cur = stages[si];
  const i = Math.min(Math.max(0, stepOf[stage] ?? 0), cur.steps.length - 1);
  stepOf[stage] = i;
  const [sid, part] = cur.steps[i].split(':');
  document.querySelectorAll<HTMLElement>('#v-editor .q-main > .q-card').forEach((card) => {
    const on = card.id === sid;
    card.classList.toggle('is-current', on);
    if (on && part) card.dataset.showPart = part; else delete card.dataset.showPart;
    if (on) {
      const n = card.querySelector('.q-step');
      if (n) n.textContent = String(i + 1).padStart(2, '0');
      card.querySelector('.q-head')?.setAttribute('data-eyebrow', `Stage ${si + 1} · ${cur.label}`);
    }
  });
  // Stages after the client says yes stay quiet until then (still clickable).
  const later = (s: Stage) => (s.id === 'run' || s.id === 'deliver') && state.status !== 'accepted';
  $('#q-stages').replaceChildren(...stages.map((s, n) => {
    const done = s.steps.filter((st) => stepDone(st, c)).length;
    const hint = later(s) ? 'After they accept'
      : s.id === 'send' ? (STATUSES.find((x) => x.id === state.status)?.label ?? '') + (state.status === 'draft' ? ' · not sent yet' : '')
      : `${done} of ${s.steps.length} done`;
    const b = el('button', { type: 'button', className: `q-stage${s.id === stage ? ' is-current' : ''}${later(s) ? ' is-later' : ''}${done === s.steps.length && !later(s) ? ' is-done' : ''}` },
      el('i', { textContent: String(n + 1) }),
      el('span', { className: 'q-stage-text' }, el('strong', { textContent: s.label }), el('small', { textContent: hint })));
    b.setAttribute('aria-current', String(s.id === stage));
    b.addEventListener('click', () => { if (stage === s.id) return; stage = s.id; renderGuided(); scrollToEditor(); });
    return b;
  }));
  jumpKey = '';
  $('#q-jump').replaceChildren(...cur.steps.map((st, n) => {
    const a = el('a', { href: `#${st.split(':')[0]}`, className: `${n === i ? 'is-active' : ''}${stepDone(st, c) ? ' is-done' : ''}` }, el('i', { textContent: String(n + 1).padStart(2, '0') }), STEP_LABEL[st] ?? STEP_LABEL[st.split(':')[0]] ?? '');
    a.dataset.section = st.split(':')[0];
    a.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); stepOf[stage] = n; renderGuided(); scrollToEditor(); });
    return a;
  }));
  $('#q-jump').hidden = cur.steps.length < 2;
  // Back / Next, crossing into the next stage at the end of one.
  const first = si === 0 && i === 0;
  const lastStep = i === cur.steps.length - 1;
  const nextStage = stages[si + 1];
  $<HTMLButtonElement>('#q-step-back').disabled = first;
  const next = $<HTMLButtonElement>('#q-step-next');
  next.textContent = lastStep ? (nextStage ? `Next: ${nextStage.label} →` : 'All steps done') : `Next: ${STEP_LABEL[cur.steps[i + 1]] ?? STEP_LABEL[cur.steps[i + 1].split(':')[0]]} →`;
  next.disabled = lastStep && !nextStage;
  $('#q-step-count').textContent = `${cur.label} · step ${i + 1} of ${cur.steps.length}`;
  $<HTMLButtonElement>('#q-mobile-next').disabled = next.disabled;
}
function moveStep(delta: number) {
  const stages = stagesFor();
  const si = stages.findIndex((s) => s.id === stage);
  const i = (stepOf[stage] ?? 0) + delta;
  if (i >= stages[si].steps.length) { if (!stages[si + 1]) return; stage = stages[si + 1].id; stepOf[stage] = 0; }
  else if (i < 0) { if (!stages[si - 1]) return; stage = stages[si - 1].id; stepOf[stage] = stages[si - 1].steps.length - 1; }
  else stepOf[stage] = i;
  renderGuided();
  scrollToEditor();
}
$('#q-step-next').addEventListener('click', () => moveStep(1));
$('#q-step-back').addEventListener('click', () => moveStep(-1));
$('#q-mobile-next').addEventListener('click', () => moveStep(1));
function scrollToEditor() {
  const top = $('#q-context').getBoundingClientRect().top + window.scrollY - 16;
  if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
}
/** Opens a section (or part of one, "s-payment:plan"): scrolls to it in the classic layout, opens its step in the guided one. */
function goTo(target: string) {
  const sid = target.split(':')[0];
  if (!guided()) { document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (guidedFor !== state.id) renderGuided();
  const stages = stagesFor();
  const find = (match: (st: string) => boolean): [StageId, number] | null => {
    const cur = stages.find((s) => s.id === stage);
    const here = cur ? cur.steps.findIndex(match) : -1;
    if (cur && here >= 0) return [cur.id, here];
    for (const s of stages) { const j = s.steps.findIndex(match); if (j >= 0) return [s.id, j]; }
    return null;
  };
  const hit = find((st) => st === target) ?? find((st) => st.split(':')[0] === sid);
  if (!hit) return;
  [stage] = hit;
  stepOf[stage] = hit[1];
  renderGuided();
  scrollToEditor();
}
// Links to sections (progress list, "Upload the estimate") open the step instead of scrolling.
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#s-"]');
  if (!a || !guided() || a.closest('#q-jump')) return;
  e.preventDefault();
  goTo(a.getAttribute('href')!.slice(1));
});

/* ---------- Send step ---------- */
document.querySelectorAll<HTMLButtonElement>('[data-proxy]').forEach((b) => b.addEventListener('click', () => $<HTMLElement>(b.dataset.proxy!).click()));
document.querySelectorAll<HTMLButtonElement>('[data-set-status]').forEach((b) => b.addEventListener('click', () => {
  const sel = $<HTMLSelectElement>('#q-status-select');
  sel.value = b.dataset.setStatus!;
  sel.dispatchEvent(new Event('change'));
  const s = b.dataset.setStatus;
  toast(s === 'sent' ? `Marked as sent. Follow up on ${niceDate(state.followUp)}.` : s === 'accepted' ? 'Accepted. Next: invoices and kick-off.' : 'Marked as declined.');
  if (s === 'accepted') goTo(state.monthly && state.retainer ? 's-retainer:run' : 's-payment');
}));
function renderSendState() {
  const when = (s: Status) => (state.statusDates[s] ? ` on ${niceDate(state.statusDates[s]!)}` : '');
  $('#q-send-state').textContent = state.status === 'draft' ? 'Not sent yet.'
    : state.status === 'sent' ? `Sent${when('sent')}.${state.followUp ? ` Follow up on ${niceDate(state.followUp)}.` : ''}`
    : state.status === 'accepted' ? `Accepted${when('accepted')}.` : `Declined${when('declined')}.`;
  document.querySelectorAll<HTMLButtonElement>('[data-set-status]').forEach((b) => { b.classList.toggle('is-on', b.dataset.setStatus === state.status); });
}

/* ---------- Next step ---------- */
/** Email details for a to-do task: its invoice or its retainer month. */
function taskContext(q: QuoteState, t: Task): EmailContext {
  return { invoice: q.invoices.find((i) => i.id === t.invoiceId), month: t.monthStart ? retainerMonths(q, addDays(today(), 7)).find((m) => m.start === t.monthStart) : undefined };
}
interface NextStep { title: string; detail: string; label: string; run: () => void }
function nextStep(): NextStep {
  const c = progressChecks();
  const ret = Boolean(state.monthly && state.retainer);
  const go = (target: string, label: string) => ({ label, run: () => goTo(target) });
  if (!c.pricing) return { title: 'Upload the client’s estimate', detail: 'Their answers fill in the scope and the price for you.', ...go('s-import', 'Upload estimate') };
  if (!c.client) return { title: 'Add the client’s name and email', detail: 'They go on the quote and in the emails.', ...go('s-client', 'Add details') };
  if (!$('#q-dirty').hidden) return { title: 'Recalculate the price', detail: 'The scope changed since the price was worked out.', ...go('s-scope', 'Open scope') };
  if (state.status === 'draft') {
    if (!ret && !c.dates) return { title: 'Pick a kick-off date', detail: 'The quote then shows real dates for each phase.', ...go('s-dates', 'Set the date') };
    if (!ret && !c.payment) return { title: 'Make the payments add up to 100%', detail: 'The payment plan prints on the quote.', ...go('s-payment:plan', 'Fix payments') };
    if (ret && !c.retainer) return { title: 'Finish the retainer terms', detail: 'A start date and the rate for extra hours.', ...go('s-retainer:setup', 'Open terms') };
    return { title: 'Send the quote', detail: 'Check the PDF, email it, then mark it as sent.', ...go('s-send', 'Send it') };
  }
  if (state.status === 'sent') {
    if (state.followUp && state.followUp <= today()) return { title: 'Follow up with the client', detail: `The follow-up was due ${niceDate(state.followUp)}.`, label: 'Write the email', run: () => openEmail(state, 'followup') };
    return { title: 'Wait for their reply', detail: state.followUp ? `Follow up on ${niceDate(state.followUp)} if it’s quiet. Mark it accepted when they say yes.` : 'Mark it accepted when they say yes.', ...go('s-send', 'Open') };
  }
  if (state.status === 'declined') return { title: 'Declined', detail: 'Nothing to do. Duplicate it from the list to try a new version.', label: 'All quotes', run: () => setView('dashboard') };
  const task = monthTasks([state])[0];
  if (task) {
    if (/^(inv|yearly)-/.test(task.id)) return { title: task.title, detail: task.detail, ...go('s-retainer:run', 'Open months') };
    if (task.email) return { title: task.title, detail: task.detail, label: 'Write the email', run: () => openEmail(state, task.email!, taskContext(state, task)) };
  }
  if (ret) return { title: 'Log hours as you work', detail: 'The month’s usage and the client’s report build from the log.', label: 'Log hours', run: () => { goTo('s-retainer:run'); openLogHours(); } };
  if (!state.invoices.length) return { title: `Invoice the ${(state.schedule[0]?.label || 'deposit').toLowerCase()}`, detail: 'Create it from the payment plan, then email it.', ...go('s-payment', 'Open invoices') };
  if (!c.needs) return { title: 'Collect what you need from the client', detail: `${state.needs.filter((n) => n.done).length} of ${state.needs.length} received so far.`, ...go('s-needs', 'Open checklist') };
  if (!state.delivery.launchedOn) return { title: 'Build it, then mark it launched', detail: 'Send the kick-off pack first if you haven’t.', ...go('s-delivery', 'Open delivery') };
  if (!Object.values(quotes).some((q) => q.retainer?.fromQuote === state.id)) return { title: 'Offer ongoing support', detail: 'A monthly plan for when the bug-fix period ends.', label: 'Set it up', run: () => { goTo('s-delivery'); openRetainerSetup(); } };
  return { title: 'All up to date', detail: 'Nothing is waiting on you for this quote.', label: '', run: () => {} };
}
let nextRun: () => void = () => {};
function renderNext() {
  if (!guided()) return;
  const n = nextStep();
  $('#q-next-title').textContent = n.title;
  $('#q-next-detail').textContent = n.detail;
  const b = $<HTMLButtonElement>('#q-next-go');
  b.textContent = n.label;
  b.hidden = !n.label;
  nextRun = n.run;
}
$('#q-next-go').addEventListener('click', () => nextRun());

/* ---------- Popups for small jobs ---------- */
const pop = $<HTMLDialogElement>('#q-pop');
let popped: { node: HTMLElement; home: Comment | null; hidden: boolean; kind: string } | null = null;
/** Shows part of the page (or a new form) in a popup; it goes back to its place when the popup closes. */
function popNode(node: HTMLElement, title: string, kind: string, intro = '') {
  if (pop.open) pop.close();
  pop.classList.toggle('is-wide', kind === 'retainer');
  $('#q-pop-intro').textContent = intro;
  $('#q-pop-intro').hidden = !intro;
  let home: Comment | null = null;
  if (node.isConnected) { home = document.createComment('popup'); node.before(home); }
  popped = { node, home, hidden: node.hidden, kind };
  node.hidden = false;
  $('#q-pop-title').textContent = title;
  $('#q-pop-body').replaceChildren(node);
  pop.showModal();
  node.querySelector<HTMLElement>('input:not([type=hidden]):not([type=date]), textarea')?.focus();
}
function closePop(kind?: string) { if (pop.open && (!kind || popped?.kind === kind)) pop.close(); }
pop.addEventListener('close', () => {
  if (!popped) return;
  const { node, home, hidden } = popped;
  popped = null;
  if (home?.isConnected) { home.replaceWith(node); node.hidden = hidden; } else node.remove();
});
$('#q-pop-close').addEventListener('click', () => pop.close());
function openLogHours() {
  const date = $<HTMLInputElement>('#q-log-date');
  if (!date.value) date.value = today();
  popNode($('#q-ret-add'), 'Log hours', 'log', 'The date, the hours and what you did. The task shows on the client’s monthly report.');
  $<HTMLInputElement>('#q-log-hours').focus();
}
$('#q-log-open').addEventListener('click', openLogHours);
// After time is added (the form clears), the popup closes; the toast says what happened.
$('#q-ret-add').addEventListener('submit', () => { if (popped?.kind === 'log' && !$<HTMLInputElement>('#q-log-hours').value) closePop('log'); });
function openRetainerSetup() { popNode($('#q-ret-setup'), 'Ongoing support', 'retainer', 'Pick a package and a start date. This creates a separate retainer quote for the same client, ready to send.'); }
$('#q-ret-setup-open').addEventListener('click', openRetainerSetup);
/** New change order: the essentials in a popup; the full card (more items, PDF, invoice) is on the page. */
function openChangeOrder() {
  const field = (label: string, input: HTMLElement) => el('label', {}, label, input);
  const title = el('input', { placeholder: 'e.g. Add a wholesale page', required: true });
  const detail = el('textarea', { rows: 3, placeholder: 'What’s included and why' });
  const hours = el('input', { type: 'number', min: '0', step: 'any', value: '4' });
  const rate = el('input', { type: 'number', min: '0', step: 'any', value: String(state.settings.rate) });
  const days = el('input', { type: 'number', min: '0', step: '1', value: '2' });
  const total = el('strong', { className: 'q-pop-total' });
  const sync = () => { total.textContent = `${money((Number(hours.value) || 0) * (Number(rate.value) || 0))} · adds ${Number(days.value) || 0} working days`; };
  [hours, rate, days].forEach((x) => x.addEventListener('input', sync));
  sync();
  const form = el('form', { className: 'q-pop-form' },
    field('What’s changing', title), field('Details (optional)', detail),
    el('div', { className: 'q-grid q-grid-3' }, field('Hours', hours), field('Hourly rate', rate), field('Extra working days', days)),
    total,
    el('div', { className: 'q-doc-actions' }, el('button', { type: 'submit', className: 'q-btn', textContent: 'Add change order' })));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.changes.push({ id: uid(), number: nextChangeNumber(state), date: today(), title: title.value.trim(), detail: detail.value.trim(), lines: [{ id: `co-${uid()}`, title: title.value.trim(), detail: '', hours: Math.max(0, Number(hours.value) || 0), rate: Math.max(0, Number(rate.value) || 0), unit: 'hours' }], days: Math.max(0, Number(days.value) || 0), status: 'draft' });
    renderChanges();
    save();
    closePop();
    toast(`Added ${state.changes[state.changes.length - 1].number}. Download the PDF and send it for approval.`);
  });
  popNode(form, 'New change order', 'change');
}

/* ---------- "What's this?" notes ---------- */
const tipBox = el('div', { className: 'q-tip-pop', role: 'tooltip', id: 'q-tip-pop' });
tipBox.hidden = true;
document.body.append(tipBox);
let tipFor: HTMLElement | null = null;
function showTip(t: HTMLElement) {
  if (tipFor === t && !tipBox.hidden) { hideTip(); return; }
  tipFor = t;
  tipBox.textContent = t.dataset.tip ?? '';
  tipBox.hidden = false;
  t.setAttribute('aria-describedby', 'q-tip-pop');
  const r = t.getBoundingClientRect();
  const w = Math.min(280, window.innerWidth - 24);
  tipBox.style.width = `${w}px`;
  tipBox.style.left = `${Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2))}px`;
  tipBox.style.top = `${r.bottom + 8}px`;
}
function hideTip() { tipBox.hidden = true; tipFor?.removeAttribute('aria-describedby'); tipFor = null; }
document.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('.q-tip');
  if (t) { e.preventDefault(); showTip(t); } else hideTip();
});
document.addEventListener('keydown', (e) => {
  const t = (e.target as HTMLElement).closest?.<HTMLElement>('.q-tip');
  if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); showTip(t); }
  if (e.key === 'Escape') hideTip();
});
window.addEventListener('scroll', hideTip, { passive: true });

/* ---------- First-time tour ---------- */
const TOUR: { target: string; title: string; text: string }[] = [
  { target: '#q-stages', title: 'Stages', text: 'Every quote moves through these, from building it to delivering. Click any stage to jump there.' },
  { target: '#q-jump', title: 'Steps', text: 'Each stage has a few steps. A green dot means the step is done.' },
  { target: '#q-stepper', title: 'Back and Next', text: 'Work through one step at a time. Everything saves as you type, so you can move around freely.' },
  { target: '#q-next', title: 'Next step', text: 'Not sure what to do? This card always shows the next thing to do, with a button that does it.' },
  { target: '.q-side-total', title: 'Total and PDF', text: 'The price, the PDF and the email to the client are always here.' },
  { target: '#q-layout-toggle', title: 'Prefer one page?', text: 'Switch to the classic layout any time. Your quotes stay exactly the same. The ? button replays this tour.' },
];
const tourBox = el('div', { className: 'q-tour', role: 'dialog', ariaLabel: 'Tour' });
tourBox.hidden = true;
document.body.append(tourBox);
let tourAt = -1;
function tourStep(n: number) {
  document.querySelectorAll('.q-tour-target').forEach((x) => x.classList.remove('q-tour-target'));
  const stops = TOUR.filter((s) => { const t = document.querySelector<HTMLElement>(s.target); return t && t.getClientRects().length > 0; });
  if (n < 0 || n >= stops.length) { endTour(); return; }
  tourAt = n;
  const stop = stops[n];
  const target = document.querySelector<HTMLElement>(stop.target)!;
  target.classList.add('q-tour-target');
  target.scrollIntoView({ block: 'center' });
  const back = el('button', { type: 'button', className: 'q-btn q-ghost q-small', textContent: 'Back' });
  back.disabled = n === 0;
  back.addEventListener('click', () => tourStep(n - 1));
  const next = el('button', { type: 'button', className: 'q-btn q-small', textContent: n === stops.length - 1 ? 'Got it' : 'Next' });
  next.addEventListener('click', () => tourStep(n + 1));
  const skip = el('button', { type: 'button', className: 'q-link', textContent: 'Skip tour' });
  skip.addEventListener('click', endTour);
  tourBox.replaceChildren(
    el('span', { className: 'q-tour-count', textContent: `${n + 1} of ${stops.length}` }),
    el('strong', { textContent: stop.title }), el('p', { textContent: stop.text }),
    el('div', { className: 'q-tour-actions' }, skip, back, next));
  tourBox.hidden = false;
  placeTour();
  next.focus();
}
function placeTour() {
  const target = document.querySelector<HTMLElement>('.q-tour-target');
  if (!target || tourBox.hidden) return;
  const r = target.getBoundingClientRect();
  const w = Math.min(320, window.innerWidth - 24);
  tourBox.style.width = `${w}px`;
  const h = tourBox.offsetHeight;
  const below = r.bottom + 14 + h < window.innerHeight;
  tourBox.style.top = `${below ? r.bottom + 14 : Math.max(12, r.top - h - 14)}px`;
  tourBox.style.left = `${Math.max(12, Math.min(window.innerWidth - w - 12, r.left))}px`;
}
function startTour() { if (view !== 'editor') setView('editor'); requestAnimationFrame(() => tourStep(0)); }
function endTour() {
  tourBox.hidden = true;
  tourAt = -1;
  document.querySelectorAll('.q-tour-target').forEach((x) => x.classList.remove('q-tour-target'));
  writeKey(TOUR_KEY, 'done');
}
window.addEventListener('resize', placeTour);
window.addEventListener('scroll', () => { if (tourAt >= 0) placeTour(); }, { passive: true });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && tourAt >= 0) endTour(); });
$('#q-tour-start').addEventListener('click', startTour);
/** The first time the guided editor opens, show the tour once. */
function maybeTour() { if (guided() && view === 'editor' && !readKey(TOUR_KEY) && tourAt < 0) setTimeout(() => { if (view === 'editor' && tourAt < 0) startTour(); }, 500); }

/* ---------- Sample quote ---------- */
const SAMPLE_BRIEF = ['Project: A new website or store', 'Platform: Shopify', 'Catalog: 50–500', 'Page layouts: 8', 'Store features: Advanced filters & search, Reviews & loyalty', 'Notes: A sample quote to explore the builder. Delete it when you’re done.'].join('\n');
function sampleQuote() {
  state = freshQuote();
  applyAnswers(parseBrief(SAMPLE_BRIEF), 'EST-SAMPLE');
  state.client = { name: 'Alex Example', company: 'Sample Co. (example)', email: 'alex@example.com', website: 'example.com' };
  state.project.title = `Sample: ${state.project.title}`;
  fillBound();
  renderSummary();
  save();
  setView('editor');
  toast('Sample quote created. Try anything; delete it from the list when you’re done.');
}
$('#q-sample').addEventListener('click', sampleQuote);

/* ---------- Render ---------- */
function renderPricing() { renderOptionTabs(); renderTeam(); renderLines(); renderSummary(); renderInvoices(); renderTimeline(); }
function renderEditor() {
  fillBound();
  $('#q-dirty').hidden = true;
  renderScope();
  renderSchedule();
  renderLibrary();
  renderPricing();
  renderNeeds();
  renderChanges();
  renderDelivery();
}
renderPackageRates();
// The monthly-work part of the Retainer section (shown in its own step in the guided layout).
{
  let part = 'setup';
  for (const child of $('#s-retainer').children as HTMLCollectionOf<HTMLElement>) {
    if (child.tagName === 'HEADER') continue;
    if (child.id === 'q-ret-run-start') part = 'run';
    child.dataset.part = part;
  }
}
applyLayout();
setView(view);
