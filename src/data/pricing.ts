// Quote pricing: turns estimator answers into priced line items for the quote page.
// Hours come from the estimator's calendar weeks × billable hours per week, then × the hourly rate.
// Everything here is only a starting point: every line, hour and rate stays editable on the page.

import { estimate, steps, type Answers, type Estimate } from './estimator';

export interface QuoteLine {
  id: string;
  title: string;
  detail: string;
  /** Hours, or a quantity for fixed-price items. */
  hours: number;
  rate: number;
  /** 'hours' bills hours × hourly rate; 'fixed' bills quantity × unit price. */
  unit?: 'hours' | 'fixed';
  /** Optional extras are listed for the client but not counted in the total. */
  optional?: boolean;
  /** Phase 2 work follows after launch (essentials first). */
  phase?: 1 | 2;
  /** Paid on to someone else at cost (e.g. a theme licence): not your income. */
  passThrough?: boolean;
}

/** Quick-add items on the quote page. Hours use the current hourly rate; fixed items start at 0 for you to price. */
export const LINE_PRESETS: { label: string; line: Omit<QuoteLine, 'id' | 'rate'> & { price?: number } }[] = [
  { label: 'Custom item (hourly)', line: { title: 'New item', detail: '', hours: 1, unit: 'hours' } },
  { label: 'Fixed-price item', line: { title: 'Fixed-price item', detail: '', hours: 1, unit: 'fixed' } },
  { label: 'Extra page template', line: { title: 'Extra page template', detail: 'One more responsive page layout, built and tested.', hours: 8, unit: 'hours' } },
  { label: 'App setup & configuration', line: { title: 'App setup & configuration', detail: 'Install, configure and style one third-party app.', hours: 4, unit: 'hours' } },
  { label: 'Training session', line: { title: 'Training session', detail: 'A recorded walkthrough so your team can manage the site.', hours: 2, unit: 'hours' } },
  { label: 'Premium theme licence', line: { title: 'Premium theme licence', detail: 'One-off licence, paid at cost.', hours: 1, unit: 'fixed', passThrough: true } },
  { label: 'Monthly support (optional)', line: { title: 'Monthly support retainer', detail: 'Per month, starting after the 30-day bug-fix period.', hours: 10, unit: 'hours', optional: true } },
  { label: 'Rush delivery (optional)', line: { title: 'Priority scheduling', detail: 'Starts sooner and is prioritised over other work.', hours: 1, unit: 'fixed', optional: true } },
];

export interface PricingSettings {
  currency: string;
  rate: number;
  /** Billable hours in one calendar week of the estimator. */
  hoursPerWeek: number;
  /** Project management as a share of the other hours. */
  pmPercent: number;
}

export const DEFAULT_SETTINGS: PricingSettings = { currency: 'USD', rate: 15, hoursPerWeek: 30, pmPercent: 10 };

export const CURRENCIES = ['USD', 'AUD', 'GBP', 'EUR', 'CAD', 'NZD', 'PHP'];

/** Drivers that are part of the build phase (everything else belongs to design, data or content). */
const BUILD_DRIVER = (label: string) => !/^(Design phase|Content preparation|Migrating from|Product data migration|Customer migration|Order history|Blog & page migration|Redirects & SEO)/.test(label) && !/page layouts$/.test(label);
const DATA_DRIVER = (label: string) => /^(Migrating from|Product data migration|Customer migration|Order history|Blog & page migration|Redirects & SEO)/.test(label);

const hoursOf = (weeks: number, settings: PricingSettings) => Math.max(1, Math.round(weeks * settings.hoursPerWeek));

/** The label of the option the client picked for a step, e.g. "Shopify Plus". */
export function answerLabel(answers: Answers, id: string): string {
  const step = steps.find((s) => s.id === id);
  const value = answers[id];
  if (!step || value === undefined || value === '') return '';
  if (step.kind === 'range') return `${value} ${step.range?.unit ?? ''}`.trim();
  if (step.kind === 'text') return String(value);
  const ids = Array.isArray(value) ? value : [value];
  return ids.map((v) => step.options?.find((o) => o.id === v)?.label ?? String(v)).join(', ');
}

/** A readable project title, e.g. "New Shopify Plus store" or "Migration to Shopify". */
export function projectTitle(answers: Answers): string {
  const platformId = String(answers.platform ?? '');
  const platform = platformId && platformId !== 'unsure' ? answerLabel(answers, 'platform') : '';
  const kind = ['shopify', 'shopify-plus', 'woocommerce'].includes(platformId) ? 'store' : 'website';
  switch (answers.type) {
    case 'new': return `New ${platform ? `${platform} ` : ''}${kind}`;
    case 'redesign': return `${platform ? `${platform} ` : ''}${kind} redesign`.replace(/^./, (c) => c.toUpperCase());
    case 'theme': return `${platform ? `${platform} ` : ''}theme customisation`.replace(/^./, (c) => c.toUpperCase());
    case 'migration': return platform ? `Migration to ${platform}` : 'Platform migration';
    case 'improvements': return `${platform ? `${platform} ` : 'Website '}improvements`;
    case 'support': return `${platform ? `${platform} ` : 'Website '}support retainer`;
    default: return '';
  }
}

/** Scope rows (label, answer) for every step that applies, in wizard order. */
export function scopeRows(answers: Answers): [string, string][] {
  return steps
    .filter((step) => step.kind !== 'text' && (!step.when || step.when(answers)))
    .map((step) => [step.label, answerLabel(answers, step.id)] as [string, string])
    .filter(([, value]) => value);
}

/** Lines that are part of the build (the work extra developers share). */
export const isDevLine = (l: QuoteLine) => l.id === 'build' || l.id === 'build-2' || l.id.startsWith('feature-') || l.id.startsWith('fix-') || l.id === 'data';
export const TEAM_LINE_IDS = ['team', 'team-premium'];

/**
 * The extra cost of a bigger team, as two clear lines:
 * - a faster-delivery premium for each additional developer (a % of the build work), and
 * - coordination, code reviews and integration work, billed at the extra developers' rate.
 */
export function teamLines(lines: QuoteLine[], team: number, rate: number, premiumPercent = 15): QuoteLine[] {
  if (team < 2) return [];
  const dev = lines.filter((l) => isDevLine(l) && !l.optional);
  const devHours = dev.reduce((sum, l) => sum + l.hours, 0);
  const devAmount = dev.reduce((sum, l) => sum + l.hours * l.rate, 0);
  const extra = team - 1;
  const out: QuoteLine[] = [];
  const premium = Math.round((devAmount * premiumPercent * extra) / 100);
  if (premium > 0) out.push({ id: 'team-premium', title: `Additional developer${extra > 1 ? 's' : ''} ×${extra} · priority delivery`, detail: `${extra === 1 ? 'A second developer works' : `${extra} more developers work`} alongside Grant so the project launches sooner (${premiumPercent}% of the build per extra developer).`, hours: 1, rate: premium, unit: 'fixed' });
  const hours = Math.round(devHours * (team === 2 ? 0.15 : 0.25));
  if (hours > 0) out.push({ id: 'team', title: 'Team coordination & code reviews', detail: `Planning, code reviews and integration work so ${team} developers can build in parallel.`, hours, rate, unit: 'hours' });
  return out;
}

/** Features that can wait for a second phase when launching the essentials first. */
const HEAVY = ['B2B / wholesale', 'Product customiser', 'Subscriptions', 'Multiple markets', 'Localisation', 'Members-only areas', 'Custom API work', 'Inventory / ERP link', 'CRM integration', 'Advanced interactions', 'Webflow Ecommerce', 'Search integration', 'Bundles & upsells', 'Reviews & loyalty'];

/** Splits a full-scope price into Phase 1 (launch with the essentials) and Phase 2 (the rest, after launch). */
export function splitEssentials(lines: QuoteLine[]): QuoteLine[] {
  const out: QuoteLine[] = [];
  for (const line of lines) {
    if (line.id === 'build') {
      const first = Math.max(1, Math.round(line.hours * 0.55));
      out.push({ ...line, hours: first, phase: 1, detail: `${line.detail} Phase 1 covers the core pages.` });
      out.push({ ...line, id: 'build-2', title: 'Remaining pages & templates', detail: 'The rest of the page layouts, built after launch.', hours: Math.max(1, line.hours - first), phase: 2 });
    } else if (line.id.startsWith('feature-') && HEAVY.includes(line.title)) {
      out.push({ ...line, phase: 2 });
    } else if (line.id === 'qa') {
      out.push({ ...line, phase: 1 });
      out.push({ ...line, id: 'qa-2', title: 'Phase 2 testing & release', detail: 'Testing and releasing the phase 2 work.', hours: Math.max(1, Math.round(line.hours * 0.5)), phase: 2 });
    } else {
      out.push({ ...line, phase: line.phase ?? 1 });
    }
  }
  return out;
}

/** Subtotals by phase (billable lines only). */
export function phaseTotals(lines: QuoteLine[]) {
  const sum = (phase: 1 | 2) => lines.filter((l) => !l.optional && (l.phase ?? 1) === phase).reduce((s, l) => s + l.hours * l.rate, 0);
  return { one: sum(1), two: sum(2), split: lines.some((l) => !l.optional && l.phase === 2) };
}

/** Builds the starting line items for a quote from the client's answers. */
export function quoteLines(answers: Answers, settings: PricingSettings, options: { team?: number; teamRate?: number; teamPremium?: number; essentials?: boolean } = {}): { lines: QuoteLine[]; result: Estimate } {
  const result = estimate(answers);
  const rate = settings.rate;
  const lines: QuoteLine[] = [];
  const add = (id: string, title: string, detail: string, hours: number) => { if (hours > 0) lines.push({ id, title, detail, hours, rate, unit: 'hours' }); };

  if (result.mode === 'none') return { lines, result };

  if (result.mode === 'monthly') {
    add('retainer', 'Monthly support retainer', `${result.hours} hours a month for updates, fixes and improvements. Billed monthly.`, result.hours ?? 10);
    return { lines, result };
  }

  // Price the full one-developer scope. A premium theme genuinely changes the work, so it uses those phases.
  const themed = result.choice === 'theme';
  const phases = themed ? result.phases : result.basePhases;
  const weeks = (id: string) => phases.find((p) => p.id === id)?.weeks ?? 0;
  const platform = answerLabel(answers, 'platform') || 'Website';
  const layouts = Number(answers.layouts ?? 6);
  const type = String(answers.type ?? '');

  if (type === 'improvements') {
    add('audit', 'Audit', 'Review of speed, SEO and code to find what matters most.', hoursOf(weeks('discovery'), settings));
    for (const d of result.allDrivers) add(`fix-${d.label}`, d.label, 'Agreed improvements, implemented and measured against the starting point.', hoursOf(d.weeks, settings));
    add('qa', 'Final check & summary', 'Testing that everything works, plus a short report of what changed.', hoursOf(weeks('qa'), settings));
  } else {
    add('discovery', 'Discovery & technical planning', 'Kick-off call, goals, sitemap, technical plan and account setup.', hoursOf(weeks('discovery'), settings));
    if (weeks('design')) add('design', 'Design (with design partner)', `Page designs for ${layouts} layouts, prepared and approved before the build.`, hoursOf(weeks('design'), settings));

    const features = result.allDrivers.filter((d) => BUILD_DRIVER(d.label));
    const featureWeeks = features.reduce((sum, d) => sum + d.weeks, 0);
    const designSource = themed || answers.design === 'theme' ? 'built on a premium theme' : answers.design === 'ready' ? 'built from your Figma designs' : 'built from the approved designs';
    add('build', `${platform} development`, `${layouts} responsive page layouts, ${designSource}, with previews for your feedback.`, hoursOf(Math.max(0.5, weeks('build') - featureWeeks), settings));
    for (const d of features) add(`feature-${d.label}`, d.label, 'Set up, configured and tested.', hoursOf(d.weeks, settings));

    if (weeks('data')) {
      const items = result.allDrivers.filter((d) => DATA_DRIVER(d.label)).map((d) => d.label).join(', ');
      add('data', 'Data migration', `${items || 'Your data'}, moved and checked after the move${answers.moving && (answers.moving as string[]).includes('redirects') ? ', with redirects to protect search rankings' : ''}.`, hoursOf(weeks('data'), settings));
    }
    if (weeks('content')) add('content', 'Content & product loading', 'Loading your text, images and product details into the new site.', hoursOf(weeks('content') * 0.5, settings));
    add('qa', 'QA, launch & handover', 'Testing across devices and browsers, speed and SEO checks, go-live and a recorded walkthrough.', hoursOf(weeks('qa'), settings));
    if (result.choice === 'holding') add('holding', 'Launch page', 'A simple page with your logo, story and an email sign-up, live in about a week.', 12);
  }

  // A bigger team does the same work faster, but adds coordination and code reviews.
  lines.push(...teamLines(lines, options.team ?? result.team, options.teamRate ?? rate, options.teamPremium ?? 15));
  if (settings.pmPercent > 0) {
    const base = lines.filter((l) => (l.unit ?? 'hours') === 'hours').reduce((sum, l) => sum + l.hours, 0);
    add('pm', 'Project management', 'Planning, weekly updates, calls and coordination throughout the project.', Math.round((base * settings.pmPercent) / 100));
  }
  return { lines: options.essentials && result.mode === 'weeks' ? splitEssentials(lines) : lines, result };
}

/** Parses the plain-text brief the estimator emails ("Platform: Shopify Plus" lines) back into answers. */
export function parseBrief(text: string): Answers {
  const answers: Answers = {};
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (!match) continue;
    const [, label, raw] = match;
    if (/^notes$/i.test(label)) { answers.notes = raw; continue; }
    const step = steps.find((s) => s.label.toLowerCase() === label.trim().toLowerCase());
    if (!step) continue;
    if (step.kind === 'range') { const n = parseInt(raw, 10); if (Number.isFinite(n)) answers[step.id] = n; continue; }
    if (step.kind === 'text') { answers[step.id] = raw; continue; }
    const find = (value: string) => step.options?.find((o) => o.label.toLowerCase() === value.trim().toLowerCase())?.id;
    if (step.kind === 'single') { const id = find(raw); if (id) answers[step.id] = id; continue; }
    // Multi: labels can contain commas, so match each option label inside the text instead of splitting.
    const ids = (step.options ?? []).filter((o) => raw.toLowerCase().includes(o.label.toLowerCase())).map((o) => o.id);
    if (ids.length) answers[step.id] = ids;
  }
  return answers;
}

/** Totals for a set of lines: optional extras are kept separate. */
export function lineTotals(lines: QuoteLine[], pricing: { discount: number; discountType: 'percent' | 'amount'; tax: number }) {
  const billable = lines.filter((l) => !l.optional);
  const subtotal = billable.reduce((sum, l) => sum + l.hours * l.rate, 0);
  const d = pricing.discount || 0;
  const discount = Math.min(subtotal, pricing.discountType === 'percent' ? (subtotal * d) / 100 : d);
  const tax = ((subtotal - discount) * (pricing.tax || 0)) / 100;
  const hours = billable.filter((l) => (l.unit ?? 'hours') === 'hours').reduce((sum, l) => sum + l.hours, 0);
  const optional = lines.filter((l) => l.optional).reduce((sum, l) => sum + l.hours * l.rate, 0);
  return { subtotal, discount, tax, total: subtotal - discount + tax, hours, optional };
}

export const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

export const DEFAULT_INCLUDED = [
  'Development as described in the scope above, responsive on mobile, tablet and desktop.',
  'Speed, SEO basics and accessibility checks before launch.',
  'Up to 2 rounds of revisions on each page template.',
  'Launch support and a recorded handover walkthrough.',
  '30 days of bug fixes after launch.',
];
export const DEFAULT_EXCLUDED = [
  'Platform plans, app subscriptions, theme licences, domains and hosting.',
  'Copywriting and photography, unless listed above.',
  'New pages or features outside this scope. These are quoted separately.',
  'Ongoing support after the 30-day period, available as a monthly retainer.',
];
export const DEFAULT_TERMS = [
  'This quotation is valid for {validDays} days from the date above.',
  'Work starts once this quotation is accepted and the deposit is received.',
  'The timeline assumes feedback within about two business days. Delays in feedback or content move the launch date.',
  'Changes to the scope are quoted and agreed before work on them starts.',
  'Invoices are due within 7 days.',
  'Ownership of the code and design passes to you once the final payment is received.',
  'Either party can end the project with written notice. Work completed up to that point is invoiced.',
];
