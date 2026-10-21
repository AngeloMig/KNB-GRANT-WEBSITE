// Quote pricing: turns estimator answers into priced line items for the quote page.
// Hours come from the estimator's calendar weeks × billable hours per week, then × the hourly rate.
// Everything here is only a starting point: every line, hour and rate stays editable on the page.

import { estimate, steps, type Answers, type Estimate } from './estimator';

export interface QuoteLine {
  id: string;
  title: string;
  detail: string;
  hours: number;
  rate: number;
}

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

/** Builds the starting line items for a quote from the client's answers. */
export function quoteLines(answers: Answers, settings: PricingSettings): { lines: QuoteLine[]; result: Estimate } {
  const result = estimate(answers);
  const rate = settings.rate;
  const lines: QuoteLine[] = [];
  const add = (id: string, title: string, detail: string, hours: number) => { if (hours > 0) lines.push({ id, title, detail, hours, rate }); };

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
  if (result.team > 1) {
    const dev = lines.filter((l) => l.id === 'build' || l.id.startsWith('feature-') || l.id === 'data').reduce((sum, l) => sum + l.hours, 0);
    add('team', `Team of ${result.team} developers`, 'Coordination, code reviews and integration work so the build runs in parallel.', Math.round(dev * (result.team === 2 ? 0.15 : 0.25)));
  }
  if (settings.pmPercent > 0) {
    const base = lines.reduce((sum, l) => sum + l.hours, 0);
    add('pm', 'Project management', 'Planning, weekly updates, calls and coordination throughout the project.', Math.round((base * settings.pmPercent) / 100));
  }
  return { lines, result };
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
