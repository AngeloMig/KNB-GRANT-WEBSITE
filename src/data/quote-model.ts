// Quote builder data: quotes (with options, status and invoices), the business profile and the item library.
// Everything is stored in this browser's localStorage.

import { estimate, planFor, type Answers, type Estimate, type Phase } from './estimator';
import { DEFAULT_EXCLUDED, DEFAULT_INCLUDED, DEFAULT_SETTINGS, DEFAULT_TERMS, formatMoney, isDevLine, lineTotals, phaseTotals, type PricingSettings, type QuoteLine } from './pricing';
import { profile as siteProfile } from './profile';

export type Status = 'draft' | 'sent' | 'accepted' | 'declined';
export const STATUSES: { id: Status; label: string }[] = [
  { id: 'draft', label: 'Draft' }, { id: 'sent', label: 'Sent' }, { id: 'accepted', label: 'Accepted' }, { id: 'declined', label: 'Declined' },
];

export interface Profile {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  taxId: string;
  /** How clients pay you, one method per line (bank, Wise, PayPal, GCash…). */
  payment: string;
  /** Days until an invoice is due. */
  paymentDays: number;
  invoicePrefix: string;
  /** Small PNG data URLs, resized on upload. */
  logo: string;
  signature: string;
}

export interface QuoteOption {
  id: string;
  name: string;
  team: number;
  essentials: boolean;
  lines: QuoteLine[];
  timeline: string;
  /** Lines were edited by hand since they were calculated. */
  edited: boolean;
}

export interface Invoice {
  id: string;
  number: string;
  milestone: string;
  percent: number;
  amount: number;
  tax: number;
  currency: string;
  issued: string;
  due: string;
  status: 'unpaid' | 'paid';
  paidOn?: string;
}

export interface Milestone { label: string; percent: number }

export interface QuoteState {
  v: 3;
  id: string;
  savedAt: number;
  status: Status;
  statusDates: Partial<Record<Status, string>>;
  followUp: string;
  meta: { number: string; date: string; validDays: number; ref: string };
  client: { name: string; company: string; email: string; website: string };
  project: { title: string; summary: string };
  answers: Answers;
  settings: PricingSettings;
  pricing: { discount: number; discountType: 'percent' | 'amount'; tax: number; taxLabel: string };
  options: QuoteOption[];
  active: number;
  /** The option the client accepted (invoices use it). */
  acceptedOption: string;
  schedule: Milestone[];
  text: { included: string; excluded: string; terms: string; note: string };
  monthly: boolean;
  /** What you charge, and what you pay, per hour for extra developers. */
  teamRate: number;
  /** Faster-delivery premium per extra developer, as a % of the build work. */
  teamPremium: number;
  costRate: number;
  invoices: Invoice[];
}

/* ---------- Storage ---------- */
const KEYS = { quotes: 'quotes-v2', current: 'quote-current-v2', settings: 'quote-settings-v1', profile: 'quote-profile-v1', library: 'quote-library-v1', invoiceNo: 'invoice-counter-v1', oldDraft: 'quote-draft-v1' };
export const store = {
  get<T>(key: string): T | null { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; } },
  set(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
  remove(key: string) { try { localStorage.removeItem(key); } catch { /* storage unavailable */ } },
};

/** Local date as YYYY-MM-DD (not UTC), so numbers and dates match the day in the Philippines. */
export const today = () => new Date().toLocaleDateString('en-CA');
export const addDays = (date: string, days: number) => { const d = new Date(`${date || today()}T00:00:00`); d.setDate(d.getDate() + days); return d.toLocaleDateString('en-CA'); };
export const niceDate = (date: string, month: 'short' | 'long' = 'short') => (date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month, year: 'numeric' }) : '');
export const uid = () => Math.random().toString(36).slice(2, 10);
export const newQuoteNumber = () => `Q-${today().replace(/-/g, '')}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
export const validUntil = (q: QuoteState) => addDays(q.meta.date, Number(q.meta.validDays) || 30);

/* ---------- Profile ---------- */
export const DEFAULT_PROFILE: Profile = {
  name: 'Grant Dev14', tagline: 'Shopify, Webflow & WordPress developer', email: siteProfile.email, phone: '', website: '', address: 'Philippines', taxId: '',
  payment: '', paymentDays: 7, invoicePrefix: 'INV', logo: '', signature: '',
};
export const loadProfile = (): Profile => ({ ...DEFAULT_PROFILE, ...(store.get<Profile>(KEYS.profile) ?? {}) });
export const saveProfile = (p: Profile) => store.set(KEYS.profile, p);

/* ---------- Item library ---------- */
export type LibraryItem = Omit<QuoteLine, 'id'> & { key: string };
export const loadLibrary = (): LibraryItem[] => store.get<LibraryItem[]>(KEYS.library) ?? [];
export const saveLibrary = (items: LibraryItem[]) => store.set(KEYS.library, items);

/* ---------- Quotes ---------- */
const DEFAULT_SCHEDULE: Milestone[] = [
  { label: 'Deposit to start', percent: 50 },
  { label: 'Designs or staging site approved', percent: 25 },
  { label: 'Launch', percent: 25 },
];
export const isDefaultSchedule = (s: Milestone[]) => s.length === 3 && s.every((m, i) => m.label === DEFAULT_SCHEDULE[i].label && m.percent === DEFAULT_SCHEDULE[i].percent);

export const newOption = (name: string, team = 1, essentials = false): QuoteOption => ({ id: uid(), name, team, essentials, lines: [], timeline: '', edited: false });

export function freshQuote(): QuoteState {
  const settings = { ...DEFAULT_SETTINGS, ...(store.get<PricingSettings>(KEYS.settings) ?? {}) };
  return {
    v: 3, id: uid(), savedAt: Date.now(), status: 'draft', statusDates: {}, followUp: '',
    meta: { number: newQuoteNumber(), date: today(), validDays: 30, ref: '' },
    client: { name: '', company: '', email: '', website: '' },
    project: { title: '', summary: '' },
    answers: {},
    settings,
    pricing: { discount: 0, discountType: 'percent', tax: 0, taxLabel: 'Tax' },
    options: [newOption('Option A')],
    active: 0,
    acceptedOption: '',
    schedule: DEFAULT_SCHEDULE.map((m) => ({ ...m })),
    text: { included: DEFAULT_INCLUDED.join('\n'), excluded: DEFAULT_EXCLUDED.join('\n'), terms: DEFAULT_TERMS.join('\n'), note: '' },
    monthly: false,
    teamRate: settings.rate,
    teamPremium: 15,
    costRate: Math.round(settings.rate * 0.7),
    invoices: [],
  };
}

/** Upgrades quotes saved by earlier versions of the page (single list of lines, no options). */
export function migrate(raw: any): QuoteState {
  const base = freshQuote();
  if (!raw || typeof raw !== 'object') return base;
  const q = { ...base, ...raw } as QuoteState & { lines?: QuoteLine[]; team?: number; edited?: boolean; project: { timeline?: string } };
  if (!Array.isArray(raw.options) || !raw.options.length) {
    q.options = [{ ...newOption('Option A', raw.team ?? 1), lines: raw.lines ?? [], timeline: raw.project?.timeline ?? '', edited: Boolean(raw.edited) }];
    q.active = 0;
  }
  q.project = { title: raw.project?.title ?? '', summary: raw.project?.summary ?? '' };
  q.v = 3;
  q.status ??= 'draft';
  q.statusDates ??= {};
  q.invoices ??= [];
  q.costRate ??= base.costRate;
  q.teamRate ??= q.settings.rate;
  q.teamPremium ??= 15;
  q.acceptedOption ??= '';
  q.active = Math.min(Math.max(0, q.active ?? 0), q.options.length - 1);
  delete (q as any).lines; delete (q as any).team; delete (q as any).edited;
  return q;
}

export function loadQuotes(): Record<string, QuoteState> {
  const raw = store.get<Record<string, unknown>>(KEYS.quotes) ?? {};
  const quotes: Record<string, QuoteState> = {};
  for (const [id, value] of Object.entries(raw)) quotes[id] = migrate(value);
  const old = store.get(KEYS.oldDraft);
  if (old) { const q = migrate(old); quotes[q.id] = q; store.remove(KEYS.oldDraft); store.set(KEYS.current, q.id); }
  return quotes;
}
export const saveQuotes = (quotes: Record<string, QuoteState>) => store.set(KEYS.quotes, quotes);
export const currentQuoteId = () => store.get<string>(KEYS.current);
export const setCurrentQuoteId = (id: string) => store.set(KEYS.current, id);
export const saveSettings = (s: PricingSettings) => store.set(KEYS.settings, s);

export function nextInvoiceNumber(prefix: string) {
  const year = today().slice(0, 4);
  const counter = store.get<Record<string, number>>(KEYS.invoiceNo) ?? {};
  counter[year] = (counter[year] ?? 0) + 1;
  store.set(KEYS.invoiceNo, counter);
  return `${prefix || 'INV'}-${year}-${String(counter[year]).padStart(3, '0')}`;
}

/* ---------- Calculations ---------- */
export const optionTotals = (q: QuoteState, o: QuoteOption) => lineTotals(o.lines, q.pricing);

/** The option invoices are based on: the accepted one, else the one being edited. */
export const billedOption = (q: QuoteState) => q.options.find((o) => o.id === q.acceptedOption) ?? q.options[q.active] ?? q.options[0];

/** Timeline and phases for an option (team size, essentials first). */
export function optionPlan(answers: Answers, o: QuoteOption): { low: number; high: number; phases: Phase[]; estimate: Estimate } | null {
  const r = estimate(answers);
  if (r.mode !== 'weeks') return null;
  return { ...planFor(r, o.team, o.essentials), estimate: r };
}
export function optionTimeline(answers: Answers, o: QuoteOption) {
  const r = estimate(answers);
  if (r.mode === 'monthly') return 'Ongoing, billed monthly';
  const plan = optionPlan(answers, o);
  if (!plan) return '';
  const bits = [o.team > 1 ? `${o.team} developers` : '', o.essentials ? 'essentials first' : ''].filter(Boolean).join(', ');
  return `${plan.low}–${plan.high} weeks from kick-off${bits ? ` (${bits})` : ''}`;
}
/** Just the weeks, e.g. "10–16 weeks" (for places that already say the team and scope). */
export function optionWeeks(answers: Answers, o: QuoteOption) {
  const plan = optionPlan(answers, o);
  return plan ? `${plan.low}–${plan.high} weeks` : estimate(answers).mode === 'monthly' ? 'Ongoing' : '';
}
/** How an option's timeline lands against the launch date the client picked in the estimator. */
export function dateFit(answers: Answers, o: QuoteOption): { label: string; tone: 'yes' | 'maybe' | 'no' } | null {
  const date = Number(answers.deadline);
  const plan = optionPlan(answers, o);
  if (!plan || !Number.isFinite(date) || date <= 0) return null;
  if (plan.low <= date) return { label: 'Fits client’s date', tone: 'yes' };
  if (plan.low <= date * 1.5) return { label: `About ${plan.low - date} wk past client’s date`, tone: 'maybe' };
  return { label: 'Too long for client’s date', tone: 'no' };
}
/** Essentials first only applies to builds (not improvements or support). */
export const canPhase = (answers: Answers) => ['new', 'redesign', 'theme', 'migration'].includes(String(answers.type ?? ''));
/** A short label for an option, e.g. "2 developers · essentials first". */
export const optionKind = (o: QuoteOption) => [`${o.team} developer${o.team > 1 ? 's' : ''}`, o.essentials ? 'essentials first' : 'full scope'].join(' · ');

/**
 * Private profit check for an option (never shown to the client).
 * Extra developers do their share of the build; you pay them the cost rate. Pass-through items aren't income.
 */
export function margin(q: QuoteState, o: QuoteOption) {
  const t = optionTotals(q, o);
  const billable = o.lines.filter((l) => !l.optional);
  const hourly = billable.filter((l) => (l.unit ?? 'hours') === 'hours');
  const revenue = t.subtotal - t.discount;
  const passThrough = billable.filter((l) => l.passThrough).reduce((s, l) => s + l.hours * l.rate, 0);
  const share = o.team > 1 ? (o.team - 1) / o.team : 0;
  const shared = hourly.filter((l) => isDevLine(l) || l.id === 'team');
  const extraHours = Math.round(shared.reduce((s, l) => s + l.hours, 0) * share);
  const extraCost = extraHours * q.costRate;
  const totalHours = hourly.reduce((s, l) => s + l.hours, 0);
  const yourHours = Math.max(0, totalHours - extraHours);
  const yourTake = revenue - passThrough - extraCost;
  return { revenue, passThrough, extraHours, extraCost, yourHours, yourTake, yourRate: yourHours ? yourTake / yourHours : 0, marginPct: revenue ? yourTake / revenue : 0 };
}

/** The email to send with the quotation PDF. */
export function quoteEmail(q: QuoteState, profile: Profile) {
  const money = (n: number) => formatMoney(n, q.settings.currency);
  const first = (q.client.name || '').split(/\s+/)[0] || 'there';
  const title = q.project.title || 'your project';
  const deposit = q.schedule[0];
  const lines = [`Hi ${first},`, '', `Thanks again for your time. Attached is the quotation for ${title} (${q.meta.number}).`, ''];
  const priced = q.options.filter((o) => o.lines.some((l) => !l.optional));
  if (priced.length > 1) {
    lines.push('There are a few options, so you can choose what suits your timeline and budget:');
    for (const o of priced) lines.push(`• ${o.name} (${optionKind(o)}): ${money(optionTotals(q, o).total)}, about ${optionWeeks(q.answers, o)}`);
  } else if (priced[0]) {
    const o = priced[0];
    lines.push(`Total: ${money(optionTotals(q, o).total)}${q.monthly ? ' per month' : ' (fixed price)'}`);
    lines.push(`Timeline: ${o.timeline || optionTimeline(q.answers, o)}`);
  }
  const optional = priced[0] ? optionTotals(q, priced[0]).optional : 0;
  if (optional) lines.push(`There are also optional extras worth ${money(optional)} you can add if useful.`);
  lines.push('');
  if (deposit && priced[0]) lines.push(`The first payment (${deposit.label.toLowerCase()}) is ${deposit.percent}%${priced.length === 1 ? `, ${money((optionTotals(q, priced[0]).total * deposit.percent) / 100)}` : ' of the option you choose'}.`);
  lines.push(`The quote is valid until ${niceDate(validUntil(q), 'long')}. Just reply to accept, or let me know if you'd like to adjust anything.`, '', 'Best,', profile.name);
  if (profile.website || profile.phone) lines.push([profile.website, profile.phone].filter(Boolean).join(' · '));
  return { subject: `Quotation ${q.meta.number}: ${title}`, body: lines.join('\n') };
}

/** Numbers for the quotes dashboard. */
export function dashboardStats(quotes: QuoteState[]) {
  const now = today();
  const month = now.slice(0, 7);
  const total = (q: QuoteState) => optionTotals(q, billedOption(q)).total;
  const sent = quotes.filter((q) => q.status === 'sent');
  return {
    awaiting: { count: sent.length, value: sent.reduce((s, q) => s + total(q), 0) },
    acceptedThisMonth: quotes.filter((q) => q.status === 'accepted' && (q.statusDates.accepted ?? '').startsWith(month)).reduce((s, q) => s + total(q), 0),
    expiring: sent.filter((q) => { const v = validUntil(q); return v >= now && v <= addDays(now, 7); }).length,
    followUps: sent.filter((q) => q.followUp && q.followUp <= now).length,
    unpaid: quotes.flatMap((q) => q.invoices.filter((i) => i.status === 'unpaid')).reduce((s, i) => s + i.amount, 0),
  };
}

/** Resizes an uploaded image to a small PNG data URL (keeps localStorage and PDFs light). */
export function imageToDataUrl(file: File, max = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export { phaseTotals };
