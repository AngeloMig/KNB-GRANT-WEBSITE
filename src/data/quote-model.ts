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

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  note: string;
  /** Receipt number, given when the payment is recorded. */
  receipt: string;
}

/** A line on an invoice that isn't a share of the quote (retainer months, extra hours). Amounts before tax. */
export interface InvoiceLine { title: string; detail: string; amount: number }

export interface Invoice {
  id: string;
  number: string;
  /** What the invoice is for: a milestone label, or a change order. */
  milestone: string;
  percent: number;
  amount: number;
  tax: number;
  currency: string;
  issued: string;
  due: string;
  /** Kept for older saved quotes; the real state comes from payments (see invoiceStatus). */
  status: 'unpaid' | 'paid';
  paidOn?: string;
  payments: Payment[];
  /** Set when the invoice is for a change order. */
  changeId?: string;
  /** Retainer invoices: the month billed (its start date), any extra hours billed with it, and the lines. */
  period?: string;
  /** A yearly invoice: the start of each month it covers. */
  periods?: string[];
  overFor?: string;
  overHours?: number;
  lines?: InvoiceLine[];
}

/** When a payment milestone falls due in the project. */
export type MilestoneWhen = 'kickoff' | 'design' | 'build' | 'launch' | 'date';
export const MILESTONE_WHEN: { id: MilestoneWhen; label: string }[] = [
  { id: 'kickoff', label: 'At kick-off' }, { id: 'design', label: 'Designs approved' }, { id: 'build', label: 'Staging site ready' }, { id: 'launch', label: 'At launch' }, { id: 'date', label: 'On a date' },
];
export interface Milestone { label: string; percent: number; when?: MilestoneWhen; date?: string }

/** Something the client needs to provide, and roughly when. */
export type NeedDue = 'kickoff' | 'build' | 'content' | 'launch';
export const NEED_DUE: { id: NeedDue; label: string }[] = [
  { id: 'kickoff', label: 'By kick-off' }, { id: 'build', label: 'Before the build' }, { id: 'content', label: 'Before content loading' }, { id: 'launch', label: 'Before launch' },
];
export interface NeedItem { id: string; text: string; due: NeedDue; done: boolean }

/** Extra work agreed after the quote was accepted. */
export interface ChangeOrder {
  id: string;
  number: string;
  date: string;
  title: string;
  detail: string;
  lines: QuoteLine[];
  /** Working days the change adds to the timeline. */
  days: number;
  status: 'draft' | 'sent' | 'approved' | 'declined';
}

/** Running the project: kick-off, communication, launch, warranty and handover. */
export interface Delivery {
  kickoff: string;
  channel: string;
  updates: string;
  launchedOn: string;
  warrantyDays: number;
  liveUrl: string;
  adminUrl: string;
  /** Useful links for the client, one per line ("Label: https://…"). */
  links: string;
  /** Accounts and access handed over, one per line (never passwords). */
  access: string;
  notes: string;
  /** Asking the client for a testimonial after launch. */
  testimonial: 'none' | 'asked' | 'received' | 'approved';
  testimonialAsked: string;
}

export type RolloverMode = 'none' | 'next' | 'bank';
export const ROLLOVER_MODES: { id: RolloverMode; label: string }[] = [
  { id: 'none', label: 'Expire each month' },
  { id: 'next', label: 'Carry into next month (capped)' },
  { id: 'bank', label: 'Hour bank, costs more' },
];

/** Support packages. VIP is a dedicated developer for a number of hours each working day, with weekend emergency calls. */
export type PackageId = 'basic' | 'medium' | 'large' | 'vip' | 'custom';
export interface SupportPackage {
  id: PackageId;
  name: string;
  hours: number;
  daily: number;
  response: string;
  emergency: boolean;
  blurb: string;
  /** One line on who it's for (packages PDF). */
  tagline: string;
  /** The package it builds on ("Everything in Medium, plus…"). */
  builds?: PackageId;
  /** Inherited lines this package replaces (by how they start), e.g. a monthly call replaced by a weekly one. */
  drops?: string[];
  /** Shown as "Most popular" (the plan most clients should pick). */
  popular?: boolean;
  /** What's included on top of the package it builds on. */
  can: string[];
  /** What isn't included. */
  cant: string[];
}
/** Average working days (Monday to Friday) in a month: 52 weeks × 5 ÷ 12. */
export const WORKDAYS_PER_MONTH = 21.67;
export const PACKAGES: SupportPackage[] = [
  {
    id: 'basic', name: 'Basic', hours: 20, daily: 0, emergency: false, blurb: 'Updates and small fixes',
    response: 'Replies within 1 business day; work starts within 2–3 business days',
    tagline: 'Keep your website healthy and up to date.',
    can: [
      'Content updates: text, images, banners, products, collections and blog posts.',
      'Small layout and style tweaks to existing pages and sections.',
      'Fixing bugs in existing pages and features.',
      'App, plugin and theme updates, with a check that everything still works afterwards.',
      'A monthly health check: speed, broken links, forms and checkout.',
      'A short monthly report: what was done and the hours used.',
    ],
    cant: [
      'New pages or templates built from scratch.',
      'New custom features, apps or integrations.',
      'Redesigns of the website or of whole pages.',
      'Same-day or urgent fixes: requests are handled in order, within the response time.',
      'Work outside business hours, weekends or public holidays.',
      'Copywriting, photography and product photo editing.',
      'Platform plans, app subscriptions, licences, domains and hosting (paid by you).',
    ],
  },
  {
    id: 'medium', name: 'Medium', hours: 40, daily: 0, emergency: false, blurb: 'Regular improvements', builds: 'basic', popular: true,
    response: 'Replies the same business day; work starts within 1–2 business days',
    tagline: 'Keep improving the website every month.',
    can: [
      'New pages and landing pages built from your existing sections.',
      'New sections and small custom features.',
      'Conversion improvements on product pages, cart and navigation.',
      'SEO basics: page titles, meta descriptions, redirects and structured data checks.',
      'Analytics and tracking setup and fixes (Google Analytics, Meta pixel, Tag Manager).',
      'Email marketing app setup, such as sign-up forms and store connections.',
      'A 30-minute check-in call each month to plan the next priorities.',
    ],
    cant: [
      'Full redesigns or switching to a new theme.',
      'Large custom apps or complex integrations (ERP, inventory systems, custom APIs).',
      'Work outside business hours, weekends or public holidays.',
      'Copywriting, photography and product photo editing.',
      'Platform plans, app subscriptions, licences, domains and hosting (paid by you).',
    ],
  },
  {
    id: 'large', name: 'Large', hours: 80, daily: 0, emergency: false, blurb: 'Ongoing projects, priority', builds: 'medium', drops: ['A 30-minute check-in call'],
    response: 'Priority: replies within 4 business hours; work starts the next business day',
    tagline: 'Ongoing projects with priority support.',
    can: [
      'Priority queue: your requests are handled before other support clients’.',
      'Larger features: custom sections, product filters, bundles and subscriptions.',
      'Integrations with third-party apps and APIs.',
      'Speed optimisation projects (Core Web Vitals).',
      'Seasonal campaign pages and A/B test setup.',
      'A planning call every two weeks and a simple roadmap for the next months.',
    ],
    cant: [
      'A full rebuild or a move to another platform. These are quoted as separate projects.',
      'Work outside business hours, weekends or public holidays.',
      'Work on other websites or brands, unless agreed in writing.',
      'Copywriting and photography, unless agreed in advance.',
      'Platform plans, app subscriptions, licences, domains and hosting (paid by you).',
    ],
  },
  {
    id: 'vip', name: 'VIP', hours: Math.round(8 * WORKDAYS_PER_MONTH), daily: 8, emergency: true, blurb: 'Dedicated developer, weekend emergencies', builds: 'large', drops: ['A planning call every two weeks'],
    response: 'Dedicated developer 8 hours a day, Monday to Friday; replies within 1 hour during working hours',
    tagline: 'A dedicated developer for your business, every working day.',
    can: [
      'A dedicated developer for 8 hours every working day, Monday to Friday.',
      'Replies within 1 hour during working hours, and a short update at the end of each day.',
      'Weekend emergencies included: if the site is down, checkout or payments stop working, or there’s a security problem, call or message on Saturday or Sunday for an urgent fix, at no extra charge.',
      'Bigger builds within the hours: new templates, section redesigns and custom apps.',
      'A weekly planning call and a shared task board.',
      'Code reviews and coordination with your other teams or agencies.',
    ],
    cant: [
      'Weekend work that isn’t an emergency: content changes, new features and campaigns wait until Monday.',
      'More than 8 hours on a working day, unless you approve extra hours (billed at the hourly rate).',
      'Public holidays, except for emergencies, which are handled like weekend emergencies.',
      'A full rebuild or a move to another platform, unless it fits within the hours and is agreed in writing.',
      'Copywriting and photography, unless agreed in advance.',
      'Platform plans, app subscriptions, licences, domains and hosting (paid by you).',
    ],
  },
  {
    id: 'custom', name: 'Custom', hours: 0, daily: 0, emergency: false, blurb: 'Any number of hours',
    response: 'Replies within 1 business day; work starts within 2–3 business days',
    tagline: 'A set number of hours each month.', can: [], cant: [],
  },
];
/** Everything a package includes, with what it builds on (for quotes). */
export function packageIncluded(p: SupportPackage): string[] {
  const base = p.builds ? packageIncluded(packageOf(p.builds)) : [];
  return [...base.filter((line) => !(p.drops ?? []).some((d) => line.startsWith(d))), ...p.can];
}
/** What a package's "covered" and "not covered" lists should be on a retainer quote. */
export function packageTexts(p: SupportPackage) {
  if (p.id === 'custom') return { included: RETAINER_INCLUDED.join('\n'), excluded: RETAINER_EXCLUDED.join('\n') };
  return { included: packageIncluded(p).join('\n'), excluded: p.cant.join('\n') };
}
/** Weekend emergencies, in plain words (packages PDF). */
export const EMERGENCY_EXAMPLES = {
  yes: ['The website is down or shows an error', 'Checkout, payments or orders stop working', 'A security problem, such as a hacked admin or malware', 'A broken page that is losing sales right now'],
  no: ['Content, price or product updates', 'New features, pages or design changes', 'Campaigns or launches planned in advance', 'Small bugs that don’t stop people buying'],
};
/**
 * Your price list: a monthly price per package (Custom uses the hours and rate you type), the pay-as-you-go
 * hourly rate that plans are compared with, how many months are free when a client pays yearly (0 = no yearly
 * offer), and whether client PDFs show hourly rates.
 */
export type PackagePrices = Record<Exclude<PackageId, 'custom'>, number>;
export interface PackageSettings { prices: PackagePrices; payg: number; freeMonths: number; hideRates: boolean }
export const DEFAULT_PACKAGE_SETTINGS: PackageSettings = { prices: { basic: 299, medium: 549, large: 999, vip: 2499 }, payg: 15, freeMonths: 2, hideRates: true };
export const loadPackageSettings = (): PackageSettings => {
  const saved = store.get<Partial<PackageSettings>>(KEYS.packageSettings) ?? {};
  return { ...DEFAULT_PACKAGE_SETTINGS, ...saved, prices: { ...DEFAULT_PACKAGE_SETTINGS.prices, ...(saved.prices ?? {}) } };
};
export const savePackageSettings = (p: PackageSettings) => store.set(KEYS.packageSettings, p);
/** A package's hourly rate, from its monthly price (Custom: the fallback rate). Kept to 4 decimals so the line totals the price. */
export const packageRate = (id: PackageId, prices: PackagePrices, fallback: number) => (id === 'custom' ? fallback : Math.round((prices[id] / packageHours(packageOf(id))) * 10000) / 10000);
/** A package's monthly price (Custom: hours × rate). */
export const packagePrice = (id: PackageId, prices: PackagePrices, customHours: number, customRate: number) => (id === 'custom' ? customHours * customRate : prices[id]);
/**
 * What a plan saves each month against paying the pay-as-you-go rate for the same hours.
 * 0 when it's under 5% of the pay-as-you-go price ("save $1" reads as no saving at all).
 */
export const planSavings = (hours: number, price: number, payg: number) => {
  const full = hours * payg;
  const saved = Math.round((full - price) * 100) / 100;
  return full > 0 && saved >= full * 0.05 ? saved : 0;
};
/** Yearly prepay: 12 months for the price of (12 − free). */
export const yearlyPrice = (monthly: number, freeMonths: number) => Math.round(monthly * (12 - Math.max(0, Math.min(11, freeMonths))) * 100) / 100;
export const packageOf = (id: PackageId | undefined) => PACKAGES.find((p) => p.id === id) ?? PACKAGES[PACKAGES.length - 1];
/** Hours a package includes in an average month. */
export const packageHours = (p: SupportPackage, custom = 20) => (p.daily ? Math.round(p.daily * WORKDAYS_PER_MONTH) : p.hours || custom);
/** The retainer's price line for a package. */
export function packageLine(p: SupportPackage, hours: number, rate: number): QuoteLine {
  const title = p.daily ? `${p.name} support: dedicated developer, ${p.daily} hours a day` : p.id === 'custom' ? 'Monthly support retainer' : `${p.name} support: ${hours} hours a month`;
  const detail = p.daily
    ? `${p.daily} hours each working day, Monday to Friday (about ${hours} hours a month), plus weekend emergency calls. Billed monthly in advance.`
    : `${hours} hours a month for updates, fixes and improvements. Billed monthly in advance.`;
  return { id: 'retainer', title, detail, hours, rate, unit: 'hours' };
}

/** Hours worked on a retainer. Emergency entries are VIP weekend call-outs, included in the fee. */
export interface WorkEntry { id: string; date: string; hours: number; task: string; emergency?: boolean }

/** A monthly support retainer: its terms and the hours log. The fee and hours come from the quote's lines. */
export interface Retainer {
  /** First day of the first month. Each month runs from this day of the month. */
  start: string;
  /** Charged per hour above the monthly hours, only after the client approves. */
  overageRate: number;
  /** What happens to unused hours: they expire each month, carry into the next month (up to `rollover`),
   * or build up in an hour bank for `bankMonths` months (then expire), for a higher fee. */
  rolloverMode: RolloverMode;
  /** Most unused hours that carry into the next month ('next' mode). */
  rollover: number;
  /** Length of the hour bank in months ('bank' mode); unused hours expire at the end of each period. */
  bankMonths: number;
  /** Hour bank premium, as a % of the monthly fee ('bank' mode). */
  rolloverPremium: number;
  /** The package chosen. */
  pkg: PackageId;
  /** Hours per working day (VIP); each month then includes this × its Monday–Friday days. 0 = a set number per month. */
  dailyHours: number;
  /** Weekend emergency calls (VIP): included in the fee, logged apart from the weekday hours. */
  weekendEmergency: boolean;
  /** Paid each month, or yearly in advance with some months free. */
  billing: 'monthly' | 'yearly';
  /** Months free on yearly billing (0 = no yearly offer on the quote). */
  freeMonths: number;
  /** The pay-as-you-go hourly rate the plan is compared with ("save $X a month"). 0 = don't compare. */
  paygRate: number;
  /** Warn when this % of the month's hours is used. */
  warnAt: number;
  minMonths: number;
  noticeDays: number;
  response: string;
  /** The project quote this retainer follows (id and number). */
  fromQuote: string;
  fromNumber: string;
  /** Set when the retainer ends; no months after this date. */
  endedOn: string;
  log: WorkEntry[];
}

/* ---------- Website audit: a free audit for a lead, which can turn into a quote ---------- */
export type AuditArea = 'speed' | 'mobile' | 'seo' | 'checkout' | 'design' | 'other';
/** Each area with a plain line on why it matters, for the audit PDF. */
export const AUDIT_AREAS: { id: AuditArea; label: string; why: string }[] = [
  { id: 'speed', label: 'Speed', why: 'Faster pages keep more visitors, especially on phones, and Google ranks them higher.' },
  { id: 'mobile', label: 'Mobile', why: 'Most visitors arrive on a phone, so this is where first impressions are made.' },
  { id: 'seo', label: 'SEO', why: 'Clear titles, working links and described images help people find you in search.' },
  { id: 'checkout', label: 'Checkout & conversion', why: 'Small hurdles near the buy button decide whether a visit becomes a sale.' },
  { id: 'design', label: 'Design & content', why: 'Visitors decide in seconds whether they are in the right place.' },
  { id: 'other', label: 'Other', why: '' },
];
export type AuditImpact = 'high' | 'medium' | 'low';
export const AUDIT_IMPACTS: { id: AuditImpact; label: string }[] = [{ id: 'high', label: 'High impact' }, { id: 'medium', label: 'Medium' }, { id: 'low', label: 'Low' }];
export interface AuditFinding {
  id: string; area: AuditArea; issue: string; fix: string; impact: AuditImpact; hours: number;
  /** A screenshot showing the issue (a small JPEG data URL). */
  image?: string;
}
export interface Audit {
  url: string;
  date: string;
  /** Mobile scores from Google PageSpeed Insights, 0–100 (null = not checked). */
  scores: { performance: number | null; accessibility: number | null; bestPractices: number | null; seo: number | null };
  summary: string;
  findings: AuditFinding[];
  /** When the audit was emailed to the client. */
  sentOn: string;
}
export const AUDIT_SCORES: { id: keyof Audit['scores']; label: string }[] = [
  { id: 'performance', label: 'Performance' }, { id: 'accessibility', label: 'Accessibility' }, { id: 'bestPractices', label: 'Best practices' }, { id: 'seo', label: 'SEO' },
];
/** Common findings to start from; the hours are a first guess to adjust. */
export const AUDIT_PRESETS: Omit<AuditFinding, 'id'>[] = [
  { area: 'speed', impact: 'high', hours: 3, issue: 'Large, uncompressed images slow every page', fix: 'Convert images to WebP, size them correctly and lazy-load anything below the first screen' },
  { area: 'speed', impact: 'high', hours: 4, issue: 'Apps and scripts load on every page, even where they aren’t used', fix: 'Remove unused apps and tracking, and load the rest only where needed' },
  { area: 'speed', impact: 'medium', hours: 3, issue: 'Fonts and code hold up the first screen', fix: 'Preload the main font, defer non-essential scripts and inline the critical styles' },
  { area: 'mobile', impact: 'medium', hours: 2, issue: 'Buttons and links are small or close together on phones', fix: 'Make tap targets larger and add spacing on mobile' },
  { area: 'mobile', impact: 'medium', hours: 4, issue: 'The menu and filters are hard to use on a phone', fix: 'Simplify the mobile menu and make filters easy to reach' },
  { area: 'seo', impact: 'medium', hours: 3, issue: 'Missing or duplicate page titles and descriptions', fix: 'Write unique titles and descriptions for the main pages and products' },
  { area: 'seo', impact: 'medium', hours: 2, issue: 'Broken links and pages that return errors', fix: 'Fix the links and redirect removed pages' },
  { area: 'seo', impact: 'low', hours: 2, issue: 'Images have no alt text', fix: 'Add descriptive alt text to product and content images' },
  { area: 'checkout', impact: 'high', hours: 3, issue: 'Shipping costs only appear at the end of checkout', fix: 'Show shipping costs and delivery times on product and cart pages' },
  { area: 'checkout', impact: 'medium', hours: 2, issue: 'Few trust signals near the buy button', fix: 'Add reviews, the returns policy and payment icons near Add to cart' },
  { area: 'design', impact: 'medium', hours: 2, issue: 'The first screen doesn’t say clearly what you sell', fix: 'Rewrite the headline and add one clear main button above the fold' },
];
export const defaultAudit = (url = ''): Audit => ({ url, date: today(), scores: { performance: null, accessibility: null, bestPractices: null, seo: null }, summary: '', findings: [], sentOn: '' });
export const auditHours = (a: Audit) => a.findings.reduce((t, f) => t + (Number(f.hours) || 0), 0);
export const SCORE_BANDS = { good: 'Good', ok: 'Needs work', poor: 'Poor', none: 'Not checked' } as const;
/** The average of the scores that were checked (null when none were). */
export const auditOverall = (a: Audit) => { const v = Object.values(a.scores).filter((x): x is number => x !== null); return v.length ? Math.round(v.reduce((t, x) => t + x, 0) / v.length) : null; };
/** PageSpeed's own bands: 90+ good, 50–89 needs work, below 50 poor. */
export const scoreTone = (n: number | null) => (n === null ? 'none' : n >= 90 ? 'good' : n >= 50 ? 'ok' : 'poor');
/** "example.com" from whatever was typed. */
export const siteHost = (url: string) => url.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '');

export interface QuoteState {
  v: 4;
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
  needs: NeedItem[];
  changes: ChangeOrder[];
  delivery: Delivery;
  /** Only on monthly support quotes. */
  retainer?: Retainer;
  /** Only when the quote started as a free website audit. */
  audit?: Audit;
}

/* ---------- Storage ---------- */
const KEYS = { lastBackup: 'quotes-last-backup-v1', capacity: 'capacity-hours-v1', packageSettings: 'package-settings-v1', quotes: 'quotes-v2', current: 'quote-current-v2', settings: 'quote-settings-v1', profile: 'quote-profile-v1', library: 'quote-library-v1', invoiceNo: 'invoice-counter-v1', receiptNo: 'receipt-counter-v1', oldDraft: 'quote-draft-v1' };
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
/** The first Monday on or after a date. */
export const nextMonday = (date: string) => { const d = new Date(`${date || today()}T00:00:00`); d.setDate(d.getDate() + ((8 - d.getDay()) % 7)); return d.toLocaleDateString('en-CA'); };
const round2 = (n: number) => Math.round(n * 100) / 100;

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
  { label: 'Deposit to start', percent: 50, when: 'kickoff' },
  { label: 'Designs or staging site approved', percent: 25, when: 'build' },
  { label: 'Launch', percent: 25, when: 'launch' },
];
const DEFAULT_DELIVERY = (): Delivery => ({ kickoff: nextMonday(addDays(today(), 7)), channel: 'Email', updates: 'A short progress update every Friday', launchedOn: '', warrantyDays: 30, liveUrl: '', adminUrl: '', links: '', access: '', notes: '', testimonial: 'none', testimonialAsked: '' });
export const isDefaultSchedule = (s: Milestone[]) => s.length === 3 && s.every((m, i) => m.label === DEFAULT_SCHEDULE[i].label && m.percent === DEFAULT_SCHEDULE[i].percent);

export const newOption = (name: string, team = 1, essentials = false): QuoteOption => ({ id: uid(), name, team, essentials, lines: [], timeline: '', edited: false });

export function freshQuote(): QuoteState {
  const settings = { ...DEFAULT_SETTINGS, ...(store.get<PricingSettings>(KEYS.settings) ?? {}) };
  return {
    v: 4, id: uid(), savedAt: Date.now(), status: 'draft', statusDates: {}, followUp: '',
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
    needs: [],
    changes: [],
    delivery: DEFAULT_DELIVERY(),
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
  q.v = 4;
  q.needs ??= [];
  q.changes ??= [];
  q.delivery = { ...DEFAULT_DELIVERY(), ...(raw.delivery ?? {}) };
  // Milestones from before dates existed: first at kick-off, last at launch, the rest when staging is ready.
  q.schedule = (q.schedule ?? []).map((m, i, all) => ({ ...m, when: m.when ?? (i === 0 ? 'kickoff' : i === all.length - 1 ? 'launch' : 'build') }));
  // Invoices from before partial payments: a "paid" invoice becomes one full payment.
  q.invoices = (q.invoices ?? []).map((inv) => ({ ...inv, payments: inv.payments ?? (inv.status === 'paid' ? [{ id: uid(), date: inv.paidOn ?? inv.issued, amount: inv.amount, method: '', note: '', receipt: '' }] : []) }));
  q.status ??= 'draft';
  q.statusDates ??= {};
  q.invoices ??= [];
  q.costRate ??= base.costRate;
  q.teamRate ??= q.settings.rate;
  q.teamPremium ??= 15;
  q.acceptedOption ??= '';
  if (q.monthly && !q.retainer) q.retainer = defaultRetainer({ start: q.delivery.kickoff, rate: q.settings.rate });
  // Retainers saved before rollover modes: a carry limit meant "next month".
  if (q.retainer) q.retainer = { ...defaultRetainer({ start: q.delivery.kickoff, rate: q.settings.rate }), ...q.retainer, rolloverMode: q.retainer.rolloverMode ?? (q.retainer.rollover ? 'next' : 'none') };
  if (q.audit) q.audit = { ...defaultAudit(), ...q.audit, scores: { ...defaultAudit().scores, ...q.audit.scores } };
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
/** When the last backup file was downloaded (ms), or 0. */
export const lastBackupAt = () => store.get<number>(KEYS.lastBackup) ?? 0;
export const markBackedUp = () => store.set(KEYS.lastBackup, Date.now());
/** Billable hours you can realistically do in a month. */
export const loadCapacity = () => store.get<number>(KEYS.capacity) ?? 130;
export const saveCapacity = (hours: number) => store.set(KEYS.capacity, hours);

export function nextInvoiceNumber(prefix: string) {
  const year = today().slice(0, 4);
  const counter = store.get<Record<string, number>>(KEYS.invoiceNo) ?? {};
  counter[year] = (counter[year] ?? 0) + 1;
  store.set(KEYS.invoiceNo, counter);
  return `${prefix || 'INV'}-${year}-${String(counter[year]).padStart(3, '0')}`;
}

export function nextReceiptNumber() {
  const year = today().slice(0, 4);
  const counter = store.get<Record<string, number>>(KEYS.receiptNo) ?? {};
  counter[year] = (counter[year] ?? 0) + 1;
  store.set(KEYS.receiptNo, counter);
  return `RCPT-${year}-${String(counter[year]).padStart(3, '0')}`;
}

/* ---------- Invoices & payments ---------- */
export const paidTotal = (i: Invoice) => round2(i.payments.reduce((s, p) => s + p.amount, 0));
export const balanceDue = (i: Invoice) => round2(Math.max(0, i.amount - paidTotal(i)));
export const invoiceStatus = (i: Invoice): 'unpaid' | 'partial' | 'paid' => (paidTotal(i) <= 0 ? 'unpaid' : balanceDue(i) <= 0.009 ? 'paid' : 'partial');
/** Keeps the legacy status field in step with payments. */
export function syncInvoice(i: Invoice) {
  const st = invoiceStatus(i);
  i.status = st === 'paid' ? 'paid' : 'unpaid';
  i.paidOn = st === 'paid' ? i.payments[i.payments.length - 1]?.date : undefined;
}

/* ---------- Change orders ---------- */
export function changeTotals(q: QuoteState, c: ChangeOrder) {
  const subtotal = c.lines.reduce((s, l) => s + l.hours * l.rate, 0);
  const tax = (subtotal * (q.pricing.tax || 0)) / 100;
  return { subtotal, tax, total: subtotal + tax };
}
export const approvedChanges = (q: QuoteState) => q.changes.filter((c) => c.status === 'approved');
export const nextChangeNumber = (q: QuoteState) => `CO-${String(q.changes.length + 1).padStart(2, '0')}`;

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
/* ---------- Calendar dates ---------- */
export interface DatedPhase extends Phase { start: string; end: string }
/**
 * Real dates for an option, from the kick-off date: each phase back to back (calendar weeks),
 * plus any working days added by approved change orders. Earliest/latest follow the week range.
 */
export function datedPlan(q: QuoteState, o: QuoteOption) {
  const plan = optionPlan(q.answers, o);
  const kickoff = q.delivery.kickoff;
  if (!plan || !kickoff) return null;
  let cursor = kickoff;
  const phases: DatedPhase[] = plan.phases.map((p) => {
    const days = Math.max(1, Math.round(p.weeks * 7));
    const start = cursor;
    const end = addDays(start, days - 1);
    cursor = addDays(end, 1);
    return { ...p, start, end };
  });
  // Change orders add working days: about 7 calendar days per 5 working days.
  const workingDays = approvedChanges(q).reduce((s, c) => s + (Number(c.days) || 0), 0);
  const extra = Math.round((workingDays * 7) / 5);
  const planned = phases.length ? phases[phases.length - 1].end : kickoff;
  return {
    phases,
    launch: addDays(planned, extra),
    earliest: addDays(kickoff, plan.low * 7 + extra),
    latest: addDays(kickoff, plan.high * 7 + extra),
    extraDays: extra,
    workingDays,
  };
}
/** The date a milestone falls on, from the option's dated plan. */
export function milestoneDate(q: QuoteState, o: QuoteOption, m: Milestone): string {
  if (m.when === 'date') return m.date ?? '';
  const d = datedPlan(q, o);
  if (!d) return m.when === 'kickoff' ? q.delivery.kickoff : '';
  const end = (id: string) => d.phases.find((p) => p.id === id)?.end;
  if (m.when === 'kickoff') return q.delivery.kickoff;
  if (m.when === 'design') return end('design') ?? end('discovery') ?? q.delivery.kickoff;
  if (m.when === 'build') return end('build') ?? end('data') ?? d.launch;
  return d.launch;
}
/** The date a checklist item is needed by. */
export function needDate(q: QuoteState, o: QuoteOption, due: NeedDue): string {
  const d = datedPlan(q, o);
  if (!d) return due === 'kickoff' ? q.delivery.kickoff : '';
  const start = (id: string) => d.phases.find((p) => p.id === id)?.start;
  if (due === 'kickoff') return q.delivery.kickoff;
  if (due === 'build') return start('build') ?? start('data') ?? q.delivery.kickoff;
  if (due === 'content') return start('content') ?? start('qa') ?? d.launch;
  return addDays(d.launch, -3);
}

/* ---------- What we need from the client ---------- */
/** A starting checklist from the client's answers (editable on the page). */
export function defaultNeeds(answers: Answers): NeedItem[] {
  const out: NeedItem[] = [];
  const add = (text: string, due: NeedDue) => out.push({ id: uid(), text, due, done: false });
  const type = String(answers.type ?? '');
  const platform = String(answers.platform ?? '');
  const has = (step: string, id: string) => Array.isArray(answers[step]) && (answers[step] as string[]).includes(id);
  const store = ['shopify', 'shopify-plus', 'woocommerce'].includes(platform);
  add('One main contact for feedback and approvals (name, email and phone)', 'kickoff');
  if (platform === 'shopify' || platform === 'shopify-plus') add('Staff or collaborator access to your Shopify store for Grant (Settings → Users and permissions)', 'kickoff');
  if (platform === 'shopify-plus' && (has('storeFeatures', 'checkout') || has('storeFeatures', 'b2b'))) add('Shopify Plus organization access, for checkout and B2B settings', 'kickoff');
  if (platform === 'webflow') add('An invite to your Webflow workspace (Designer access) and the site plan', 'kickoff');
  if (platform === 'wordpress' || platform === 'woocommerce') add('WordPress admin access and hosting access (control panel or SFTP)', 'kickoff');
  if (platform === 'unsure' || !platform) add('Access to the platform your website will run on', 'kickoff');
  if (type === 'support' || type === 'improvements') {
    add('Admin access to your website, and a list of the pages that matter most', 'kickoff');
    if (type === 'support') add('One shared place to send requests (email thread or task board)', 'kickoff');
    return out;
  }
  add('Logo files (SVG or high-resolution PNG), brand colours and fonts', 'kickoff');
  const design = String(answers.design ?? '');
  if (design === 'ready') add('Link to the Figma file (view access, or edit access if Grant should adjust it)', 'kickoff');
  else if (design === 'partial') add('Your existing designs and any brand guidelines', 'kickoff');
  else add('Two or three websites you like, and what you like about them', 'kickoff');
  if (type === 'migration') {
    add('Admin access to your current website, for exporting your data', 'kickoff');
    if (has('moving', 'redirects')) add('Google Search Console access, and any URLs that matter most for search', 'build');
  }
  add(String(answers.content ?? '') === 'ready' ? 'Final text and images for every page (a shared folder link)' : 'Text and images for every page (Grant can share a simple content template)', 'content');
  if (store) {
    add('Product details: titles, descriptions, prices, variants and images (CSV or spreadsheet)', 'build');
    add('Shipping zones and rates, tax settings, and your payment provider account', 'build');
  }
  if (has('integrations', 'email')) add('Access to your email marketing account (e.g. Klaviyo or Mailchimp)', 'build');
  if (has('integrations', 'crm')) add('Access to your CRM', 'build');
  if (has('integrations', 'tracking')) add('Access to Google Analytics, Google Tag Manager and your Meta pixel', 'build');
  if (has('integrations', 'search')) add('Access to your search app account', 'build');
  if (has('integrations', 'erp')) add('ERP or inventory system API documentation and test login', 'build');
  if (has('integrations', 'api')) add('API documentation and test login for the custom integration', 'build');
  add('Privacy policy, terms and returns or refund policy text', 'content');
  add('Domain login, or someone who can update the domain settings (DNS) on launch day', 'launch');
  return out;
}

/* ---------- Warranty ---------- */
export const warrantyEnd = (q: QuoteState) => (q.delivery.launchedOn ? addDays(q.delivery.launchedOn, Number(q.delivery.warrantyDays) || 0) : '');

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
  } else if (priced[0] && q.retainer) {
    const plan = retainerPlan(q);
    lines.push(`Monthly fee: ${money(plan.fee)} for ${hoursText(plan.hours)} hours of work, billed monthly in advance, starting ${niceDate(q.retainer.start, 'long')}.`);
    lines.push(`Extra hours, only if you approve them: ${money(q.retainer.overageRate)} an hour. Everything else is in the attached PDF.`);
  } else if (priced[0]) {
    const o = priced[0];
    lines.push(`Total: ${money(optionTotals(q, o).total)}${q.monthly ? ' per month' : ' (fixed price)'}`);
    lines.push(`Timeline: ${o.timeline || optionTimeline(q.answers, o)}`);
  }
  const optional = priced[0] ? optionTotals(q, priced[0]).optional : 0;
  if (optional) lines.push(`There are also optional extras worth ${money(optional)} you can add if useful.`);
  lines.push('');
  if (deposit && priced[0] && !q.retainer) lines.push(`The first payment (${deposit.label.toLowerCase()}) is ${deposit.percent}%${priced.length === 1 ? `, ${money((optionTotals(q, priced[0]).total * deposit.percent) / 100)}` : ' of the option you choose'}.`);
  lines.push(`The quote is valid until ${niceDate(validUntil(q), 'long')}. Just reply to accept, or let me know if you'd like to adjust anything.`, '', 'Best,', profile.name);
  if (profile.website || profile.phone) lines.push([profile.website, profile.phone].filter(Boolean).join(' · '));
  return { subject: `Quotation ${q.meta.number}: ${title}`, body: lines.join('\n') };
}

/* ---------- Retainers ---------- */
const OUT_OF_HOURS = 'Urgent out-of-hours work, unless agreed in advance.';

export const RETAINER_INCLUDED = [
  'Content updates: text, images, products, collections and blog posts.',
  'Small changes and improvements to existing pages and sections.',
  'Bug fixes, app and plugin updates, and checks after platform updates.',
  'Small new features that fit within the month’s hours.',
  'A short monthly report: what was done and the hours used.',
];
export const RETAINER_EXCLUDED = [
  'Redesigns, new templates or large new features. These are quoted separately.',
  'Platform plans, app subscriptions, licences, domains and hosting.',
  OUT_OF_HOURS,
];
export const RETAINER_TERMS = [
  'This quotation is valid for {validDays} days from the date above.',
  'Invoices are due within 7 days.',
  'Requests are sent to one shared place (email thread or task board), so nothing is missed.',
  'Ownership of all work passes to you once each month is paid.',
];

/** Monday-to-Friday days between two dates (inclusive). */
export function weekdays(start: string, end: string) {
  let n = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) { const day = new Date(`${d}T00:00:00`).getDay(); if (day !== 0 && day !== 6) n += 1; }
  return n;
}
export const isWeekend = (date: string) => [0, 6].includes(new Date(`${date}T00:00:00`).getDay());

export function defaultRetainer(o: { start?: string; rate: number; fromQuote?: string; fromNumber?: string }): Retainer {
  return {
    start: o.start || today(), overageRate: o.rate, rolloverMode: 'none', rollover: 5, bankMonths: 3, rolloverPremium: 20, warnAt: 80, minMonths: 3, noticeDays: 30,
    pkg: 'custom', dailyHours: 0, weekendEmergency: false, billing: 'monthly', freeMonths: 2, paygRate: 0,
    response: 'Replies within 1 business day; work starts within 2–3 business days',
    fromQuote: o.fromQuote ?? '', fromNumber: o.fromNumber ?? '', endedOn: '', log: [],
  };
}

const daysIn = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
/** The same day of the month, n months later (the 31st becomes the last day of shorter months). */
export function addMonths(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(y, m - 1 + n, 1);
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d, daysIn(target.getFullYear(), target.getMonth()))).toLocaleDateString('en-CA');
}
export const hoursText = (n: number) => String(Math.round(n * 100) / 100);
export const ordinal = (n: number) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;

/** Hours included each month, and the monthly fee (from the accepted option's lines). */
export function retainerPlan(q: QuoteState) {
  const o = billedOption(q);
  const t = optionTotals(q, o);
  return { hours: t.hours, fee: t.total, subtotal: t.subtotal, discount: t.discount, beforeTax: t.subtotal - t.discount, tax: t.tax };
}

/** The hour bank's price line for an option, or null when the retainer has no bank (or no premium). */
export function bankLine(r: Retainer, lines: QuoteLine[]): QuoteLine | null {
  if (r.rolloverMode !== 'bank' || !(r.rolloverPremium > 0)) return null;
  const base = lines.filter((l) => l.id !== 'rollover' && !l.optional).reduce((s, l) => s + l.hours * l.rate, 0);
  const bank = Math.max(1, Math.round(r.bankMonths) || 3);
  return {
    id: 'rollover', title: `Hour bank: unused hours kept for ${bank} month${bank === 1 ? '' : 's'}`,
    detail: `${r.rolloverPremium}% on the monthly fee. Unused hours build up within each ${bank}-month period; any left at the end expire.`,
    hours: 1, rate: round2((base * r.rolloverPremium) / 100), unit: 'fixed',
  };
}

export interface RetainerMonth {
  index: number;
  start: string;
  end: string;
  label: string;
  included: number;
  carried: number;
  available: number;
  used: number;
  remaining: number;
  over: number;
  /** Unused hours that carry into the next month. */
  carryNext: number;
  /** Unused hours that expire at the end of this month. */
  expired: number;
  /** VIP weekend emergency hours: included, and not taken from the month's hours. */
  emergency: number;
  /** Hour bank: the last day of the bank period this month is in. */
  bankEnd: string;
  entries: WorkEntry[];
}
/** "November 2026" when months start on the 1st, otherwise "23 Nov – 22 Dec 2026". */
export function monthLabel(start: string, end: string) {
  if (start.endsWith('-01')) return new Date(`${start}T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const a = new Date(`${start}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${a} – ${niceDate(end)}`;
}
/**
 * Every retainer month from the start up to the current month (or the last logged entry, or the end date).
 * Hours carried from last month are used first.
 * - none: unused hours expire at the end of each month.
 * - next: unused monthly hours carry into the next month only, up to the limit.
 * - bank: unused hours build up through each bank period (e.g. 3 months) and expire at its end.
 */
export function retainerMonths(q: QuoteState, now = today()): RetainerMonth[] {
  const r = q.retainer;
  if (!r?.start) return [];
  const monthly = retainerPlan(q).hours;
  const lastLog = r.log.reduce((m, e) => (e.date > m ? e.date : m), '');
  let until = [now, lastLog].sort().pop()!;
  if (r.endedOn && r.endedOn < until) until = r.endedOn;
  const out: RetainerMonth[] = [];
  const bank = Math.max(1, Math.round(r.bankMonths) || 3);
  let carried = 0;
  for (let i = 0; i < 240; i++) {
    const start = addMonths(r.start, i);
    if (start > until) break;
    const end = addDays(addMonths(r.start, i + 1), -1);
    const entries = r.log.filter((e) => e.date >= start && e.date <= end).sort((a, b) => a.date.localeCompare(b.date));
    const used = round2(entries.filter((e) => !e.emergency).reduce((s, e) => s + (Number(e.hours) || 0), 0));
    const emergency = round2(entries.filter((e) => e.emergency).reduce((s, e) => s + (Number(e.hours) || 0), 0));
    // A daily package includes its hours for each Monday-to-Friday day in this month.
    const included = r.dailyHours > 0 ? round2(r.dailyHours * weekdays(start, end)) : monthly;
    const available = round2(included + carried);
    const remaining = round2(Math.max(0, available - used));
    const bankLast = i % bank === bank - 1;
    const carryNext = r.rolloverMode === 'bank'
      ? (bankLast ? 0 : remaining)
      : r.rolloverMode === 'next' ? round2(Math.min(r.rollover || 0, Math.max(0, included - Math.max(0, used - carried)))) : 0;
    const bankEnd = r.rolloverMode === 'bank' ? addDays(addMonths(r.start, (Math.floor(i / bank) + 1) * bank), -1) : '';
    out.push({ index: i, start, end, label: monthLabel(start, end), included, carried, available, used, remaining, over: round2(Math.max(0, used - available)), carryNext, expired: round2(remaining - carryNext), emergency, bankEnd, entries });
    carried = carryNext;
  }
  return out;
}
/** The month a date falls in (null before the start). */
export const monthFor = (q: QuoteState, date = today()) => retainerMonths(q, date).find((m) => date >= m.start && date <= m.end) ?? null;

/** The terms of a retainer in plain words (quote PDF and the page preview). */
export function retainerTermsText(q: QuoteState) {
  const r = q.retainer;
  if (!r) return [];
  const money = (n: number) => formatMoney(n, q.settings.currency);
  const plan = retainerPlan(q);
  const day = Number(r.start.slice(8, 10)) || 1;
  const bank = Math.max(1, Math.round(r.bankMonths) || 3);
  const rollover = r.rolloverMode === 'bank'
    ? `Hour bank: unused hours build up for ${bank} month${bank === 1 ? '' : 's'} at a time (the first period runs ${niceDate(r.start)} to ${niceDate(addDays(addMonths(r.start, bank), -1))}). Any left at the end of a period expire. The bank adds ${r.rolloverPremium}% to the monthly fee, already included above.`
    : r.rolloverMode === 'next' && r.rollover
      ? `Unused hours carry into the next month only, up to ${hoursText(r.rollover)} hours. They don’t build up beyond that.`
      : 'Unused hours don’t carry over: each month’s hours are used that month or expire.';
  const pkg = packageOf(r.pkg);
  const named = pkg.id === 'custom' ? '' : `${pkg.name} support: `;
  const hours = r.dailyHours > 0
    ? `${hoursText(r.dailyHours)} hours of work each working day, Monday to Friday (about ${hoursText(plan.hours)} hours a month)`
    : `${hoursText(plan.hours)} hours of work each month`;
  const free = Math.max(0, Math.min(11, Math.round(r.freeMonths) || 0));
  const yearly = yearlyPrice(plan.fee, free);
  const saved = r.paygRate ? planSavings(plan.hours, plan.beforeTax, r.paygRate) : 0;
  const price = `${money(plan.fee)} a month${plan.discount ? ` (after a ${q.pricing.discountType === 'percent' ? `${q.pricing.discount}%` : money(plan.discount)} discount, from ${money(plan.subtotal)})` : ''}${plan.tax ? ` (including ${q.pricing.taxLabel || 'tax'})` : ''}`;
  const billing = r.billing === 'yearly'
    ? `paid yearly in advance: ${money(yearly)} for 12 months${free ? ` (${free} month${free === 1 ? '' : 's'} free)` : ''}, starting ${niceDate(r.start, 'long')}`
    : `billed in advance on the ${ordinal(day)} of each month, starting ${niceDate(r.start, 'long')}`;
  return [
    `${named}${hours} for ${price}, ${billing}.${saved ? ` That’s ${money(saved)} a month less than pay-as-you-go at ${money(r.paygRate)} an hour.` : ''}`,
    ...(r.billing !== 'yearly' && free ? [`Prefer to pay yearly? ${money(yearly)} for 12 months, with ${free} month${free === 1 ? '' : 's'} free.`] : []),
    rollover,
    ...(r.weekendEmergency ? ['Weekend emergencies are included: if something urgent breaks on a Saturday or Sunday (for example the site is down or checkout isn’t working), call or message for an urgent fix, at no extra charge.'] : []),
    `If a month needs more than its hours, you’ll hear first (at about ${r.warnAt}% used). Extra hours are billed at ${money(r.overageRate)} an hour on the next invoice, and only after you approve them.`,
    ...(r.response.trim() ? [`${r.response.trim().replace(/\.$/, '')}.`] : []),
    `${r.minMonths ? `Minimum term of ${r.minMonths} month${r.minMonths === 1 ? '' : 's'}, then month to month. ` : 'Month to month. '}The monthly hours can be changed with a month’s notice, and either side can end it with ${r.noticeDays} days’ written notice.`,
    'You get a short report each month: what was done and the hours used.',
  ];
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
    unpaid: quotes.flatMap((q) => q.invoices).reduce((s, i) => s + balanceDue(i), 0),
    warranty: quotes.filter((q) => { const end = warrantyEnd(q); return end && end >= now; }).length,
    warrantyEnding: quotes.filter((q) => { const end = warrantyEnd(q); return end && end >= now && end <= addDays(now, 14); }).length,
    ...(() => {
      const active = quotes.filter((q) => q.retainer && q.status === 'accepted' && q.retainer.start <= now && !(q.retainer.endedOn && q.retainer.endedOn < now));
      const months = active.map((q) => monthFor(q, now)).filter((m): m is RetainerMonth => Boolean(m));
      return {
        retainers: { count: active.length, monthly: active.reduce((s, q) => s + retainerPlan(q).fee, 0) },
        retainerHours: { used: round2(months.reduce((s, m) => s + m.used, 0)), available: round2(months.reduce((s, m) => s + m.available, 0)), near: active.filter((q) => { const m = monthFor(q, now); return m && m.available && m.used / m.available >= (q.retainer!.warnAt || 80) / 100; }).length },
      };
    })(),
  };
}

/** Resizes an uploaded image to a small PNG data URL (keeps localStorage and PDFs light). */
/** A screenshot for an audit finding: a JPEG at most 1400px wide, small enough to keep in the browser. */
export function screenshotToDataUrl(file: Blob, max = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
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
