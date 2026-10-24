// Project estimator: questions, conditions and the timing model.
// Grant: every number here is in weeks of calendar time for one developer, assuming feedback
// within ~2 business days. They are calibrated to typical freelance timelines; adjust freely.
// The page always presents the result as a rough guide, never a quote.

export type Answers = Record<string, string | string[] | number | undefined>;

export interface Option {
  id: string;
  label: string;
  hint?: string;
  /** Hint that depends on earlier answers, e.g. how realistic a launch date is (overrides hint). */
  hintFor?: (a: Answers) => string;
  /** Only offer this option when the condition holds. */
  when?: (a: Answers) => boolean;
}

export interface StepNote {
  tone: 'yes' | 'maybe' | 'no';
  title: string;
  text: string;
}

export interface Step {
  id: string;
  kind: 'single' | 'multi' | 'range' | 'text';
  /** Short label used in the progress bar, summary and brief. */
  label: string;
  question: string;
  help?: string;
  /** Help text that depends on earlier answers (overrides help). */
  helpFor?: (a: Answers) => string;
  /** A note shown under the options for the current choice. Steps with one don't auto-advance. */
  noteFor?: (a: Answers) => StepNote | null;
  options?: Option[];
  range?: { min: number; max: number; step: number; initial: number; unit: string; marks: number[] };
  /** Only ask this step when the condition holds. */
  when?: (a: Answers) => boolean;
  optional?: boolean;
}

const pick = (a: Answers, id: string) => (typeof a[id] === 'string' ? (a[id] as string) : '');
const picks = (a: Answers, id: string) => (Array.isArray(a[id]) ? (a[id] as string[]) : []);
const type = (a: Answers) => pick(a, 'type');
export const isBuild = (a: Answers) => ['new', 'redesign', 'theme', 'migration'].includes(type(a));
export const isStore = (a: Answers) => ['shopify', 'shopify-plus', 'woocommerce'].includes(pick(a, 'platform'));

export const steps: Step[] = [
  {
    id: 'type', kind: 'single', label: 'Project',
    question: 'What do you need?',
    options: [
      { id: 'new', label: 'A new website or store', hint: 'Built from scratch' },
      { id: 'redesign', label: 'A redesign or rebuild', hint: 'Fresh build of an existing site' },
      { id: 'theme', label: 'Customise a theme or template', hint: 'Fastest route to launch' },
      { id: 'migration', label: 'Move to a new platform', hint: 'e.g. WooCommerce to Shopify' },
      { id: 'improvements', label: 'Speed, SEO & fixes', hint: 'Improve what you have' },
      { id: 'support', label: 'Ongoing support', hint: 'Monthly help, no fixed end' },
    ],
  },
  {
    id: 'platform', kind: 'single', label: 'Platform',
    question: 'Which platform?',
    help: 'Moving platforms? Pick where you’re moving to.',
    options: [
      { id: 'shopify', label: 'Shopify' },
      { id: 'shopify-plus', label: 'Shopify Plus', hint: 'High-volume or B2B stores' },
      { id: 'webflow', label: 'Webflow', hint: 'Marketing sites, CMS' },
      { id: 'wordpress', label: 'WordPress', hint: 'Content-heavy sites' },
      { id: 'woocommerce', label: 'WooCommerce', hint: 'Store on WordPress' },
      { id: 'unsure', label: 'Not sure yet', hint: 'Grant can recommend one' },
    ],
  },
  {
    id: 'from', kind: 'single', label: 'Moving from',
    question: 'Where is the site now?',
    when: (a) => type(a) === 'migration',
    options: [
      // You can't move to the platform you're already on (that's a redesign), so it isn't offered.
      { id: 'woocommerce', label: 'WooCommerce / WordPress', when: (a) => !['wordpress', 'woocommerce'].includes(pick(a, 'platform')) },
      { id: 'magento', label: 'Magento / Adobe Commerce', hint: 'Usually the most complex' },
      { id: 'bigcommerce', label: 'BigCommerce' },
      { id: 'squarespace', label: 'Squarespace or Wix', hint: 'Limited data export' },
      { id: 'shopify', label: 'Shopify', when: (a) => !['shopify', 'shopify-plus'].includes(pick(a, 'platform')) },
      { id: 'custom', label: 'Custom or other', hint: 'Needs a closer look' },
    ],
  },
  {
    id: 'moving', kind: 'multi', label: 'Moving over',
    question: 'What needs to move over?',
    help: 'Pick everything that should come across.',
    when: (a) => type(a) === 'migration',
    options: [
      { id: 'products', label: 'Products & collections', when: isStore },
      { id: 'customers', label: 'Customer accounts', when: isStore },
      { id: 'orders', label: 'Order history', when: isStore },
      { id: 'content', label: 'Blog posts & pages' },
      { id: 'redirects', label: 'URL redirects & SEO', hint: 'Protects your rankings' },
    ],
  },
  {
    id: 'catalog', kind: 'single', label: 'Catalog',
    question: 'How many products?',
    help: 'Count products, not variants.',
    when: (a) => isBuild(a) && isStore(a),
    options: [
      { id: 'xs', label: 'Under 50' },
      { id: 's', label: '50–500' },
      { id: 'm', label: '500–5,000' },
      { id: 'l', label: '5,000+' },
    ],
  },
  {
    id: 'layouts', kind: 'range', label: 'Page layouts',
    question: 'How many unique page layouts?',
    help: 'Count different designs, not pages. A store might have home, collection, product, cart, about, contact and blog: 7 layouts.',
    when: isBuild,
    range: { min: 1, max: 30, step: 1, initial: 6, unit: 'layouts', marks: [1, 10, 20, 30] },
  },
  {
    id: 'storeFeatures', kind: 'multi', label: 'Store features', optional: true,
    question: 'Any store features?',
    help: 'Pick any that apply, or skip.',
    when: (a) => isBuild(a) && isStore(a),
    options: [
      { id: 'filters', label: 'Advanced filters & search' },
      { id: 'subscriptions', label: 'Subscriptions' },
      { id: 'bundles', label: 'Bundles & upsells' },
      { id: 'b2b', label: 'B2B / wholesale pricing' },
      { id: 'reviews', label: 'Reviews & loyalty' },
      { id: 'markets', label: 'Multiple currencies or languages' },
      { id: 'configurator', label: 'Product customiser', hint: 'Build-your-own options' },
      { id: 'preorder', label: 'Pre-orders & back-in-stock' },
      { id: 'checkout', label: 'Checkout customisation', hint: 'Shopify Plus only', when: (a) => pick(a, 'platform') === 'shopify-plus' },
    ],
  },
  {
    id: 'webflowFeatures', kind: 'multi', label: 'Webflow features', optional: true,
    question: 'Anything special in Webflow?',
    help: 'Pick any that apply, or skip.',
    when: (a) => isBuild(a) && pick(a, 'platform') === 'webflow',
    options: [
      { id: 'cms', label: 'CMS collections', hint: 'Blog, case studies, team' },
      { id: 'interactions', label: 'Advanced interactions', hint: 'Scroll animations, GSAP' },
      { id: 'localization', label: 'Multiple languages' },
      { id: 'memberships', label: 'Members-only areas', hint: 'Memberstack or similar' },
      { id: 'ecommerce', label: 'Webflow Ecommerce' },
    ],
  },
  {
    id: 'wpApproach', kind: 'single', label: 'WordPress build',
    question: 'How should WordPress be built?',
    when: (a) => isBuild(a) && ['wordpress', 'woocommerce'].includes(pick(a, 'platform')),
    options: [
      { id: 'custom', label: 'Custom theme', hint: 'Fast and lean' },
      { id: 'blocks', label: 'Custom blocks', hint: 'Flexible editing in Gutenberg' },
      { id: 'builder', label: 'Page builder', hint: 'Elementor or similar, quickest' },
      { id: 'unsure', label: 'Recommend one' },
    ],
  },
  {
    id: 'improvements', kind: 'multi', label: 'Improvements',
    question: 'What needs improving?',
    help: 'Pick everything you want looked at.',
    when: (a) => type(a) === 'improvements',
    options: [
      { id: 'speed', label: 'Page speed & Core Web Vitals' },
      { id: 'seo', label: 'Technical SEO audit & fixes' },
      { id: 'a11y', label: 'Accessibility pass' },
      { id: 'apps', label: 'App or plugin clean-up' },
      { id: 'fixes', label: 'Bug fixes & small changes' },
      { id: 'tracking', label: 'Analytics & tracking setup' },
    ],
  },
  {
    id: 'hours', kind: 'single', label: 'Support',
    question: 'Which support plan fits?',
    help: 'Not sure? Medium suits most growing stores. You can move up or down a plan with a month’s notice.',
    when: (a) => type(a) === 'support',
    // Option ids are the plan's monthly hours (VIP is daily), matching the plans in the quote builder.
    options: [
      { id: '20', label: 'Basic · 20 hours a month', hint: 'Updates and small fixes' },
      { id: '40', label: 'Medium · 40 hours a month', hint: 'Most popular · regular improvements' },
      { id: '80', label: 'Large · 80 hours a month', hint: 'Ongoing projects, priority replies' },
      { id: 'vip', label: 'VIP · 8 hours a day, Mon–Fri', hint: 'Dedicated developer, weekend emergencies' },
      { id: 'unsure', label: 'Not sure yet', hint: 'Grant will recommend one' },
    ],
  },
  {
    id: 'integrations', kind: 'multi', label: 'Integrations', optional: true,
    question: 'What needs connecting?',
    help: 'Pick any tools the site should talk to, or skip.',
    when: (a) => isBuild(a),
    options: [
      { id: 'email', label: 'Email marketing', hint: 'Klaviyo, Mailchimp' },
      { id: 'crm', label: 'CRM', hint: 'HubSpot, Salesforce' },
      { id: 'tracking', label: 'Analytics & ads tracking', hint: 'GA4, Meta' },
      { id: 'search', label: 'Search', hint: 'Algolia or similar' },
      { id: 'erp', label: 'Inventory / ERP / 3PL', hint: 'Usually the longest' },
      { id: 'api', label: 'Custom API or app' },
    ],
  },
  {
    id: 'design', kind: 'single', label: 'Design',
    question: 'Where are the designs at?',
    when: (a) => ['new', 'redesign', 'migration'].includes(type(a)),
    options: [
      { id: 'ready', label: 'Figma designs are ready' },
      { id: 'partial', label: 'Some designs are ready', hint: 'The rest should match' },
      { id: 'theme', label: 'Use a theme, tailored to my brand', hint: 'Faster and lower cost' },
      { id: 'none', label: 'I need a designer too', hint: 'Grant works with designers' },
    ],
  },
  {
    id: 'content', kind: 'single', label: 'Content',
    question: 'Is your content ready?',
    help: 'Text, images and product details. This is often what slows a launch down.',
    when: isBuild,
    options: [
      { id: 'ready', label: 'Yes, it’s ready' },
      { id: 'partial', label: 'Partly ready' },
      { id: 'none', label: 'Not started yet' },
    ],
  },
  {
    id: 'deadline', kind: 'single', label: 'Deadline',
    question: 'When would you like to launch?',
    when: (a) => type(a) !== 'support',
    help: 'Pick the closest. Each date shows how realistic it is for this project.',
    noteFor: deadlineNote,
    // Option ids are the deadline in weeks.
    options: [
      { id: 'asap', label: 'As soon as possible' },
      { id: '2', label: 'Within 2 weeks', hintFor: (a) => deadlineHint(a, 2) },
      { id: '4', label: 'Within a month', hintFor: (a) => deadlineHint(a, 4) },
      { id: '8', label: 'In 1–2 months', hintFor: (a) => deadlineHint(a, 8) },
      { id: '13', label: 'In 2–3 months', hintFor: (a) => deadlineHint(a, 13) },
      { id: '26', label: 'In 3–6 months', hintFor: (a) => deadlineHint(a, 26) },
      { id: 'flexible', label: 'Flexible', hint: 'Usually the most cost-effective' },
    ],
  },
  {
    id: 'speedup', kind: 'single', label: 'Hitting your date',
    question: 'How should we hit your date?',
    help: 'Your date is shorter than the estimate for one developer.',
    helpFor: speedHelp,
    when: (a) => Boolean(model(a)?.tight),
    // Options only appear when they get reasonably close to the date (within 2x), so nobody is
    // promised that more developers can turn a 9-month build into 2 weeks.
    options: [
      { id: 'team2', label: 'Add a second developer', when: (a) => shortlist(a).includes('team2'), hintFor: (a) => choiceHint(a, 'team2') },
      { id: 'team3', label: 'A team of 3 developers', when: (a) => shortlist(a).includes('team3'), hintFor: (a) => choiceHint(a, 'team3') },
      { id: 'phase', label: 'Launch the essentials first', when: (a) => shortlist(a).includes('phase'), hintFor: (a) => choiceHint(a, 'phase') },
      { id: 'priority', label: 'Do the highest-impact fixes first', when: (a) => shortlist(a).includes('priority'), hintFor: (a) => choiceHint(a, 'priority') },
      { id: 'both', label: 'Bigger team and the essentials first', when: (a) => shortlist(a).includes('both'), hintFor: (a) => choiceHint(a, 'both') },
      { id: 'theme', label: 'Start from a premium theme', when: (a) => shortlist(a).includes('theme'), hintFor: (a) => choiceHint(a, 'theme') },
      { id: 'holding', label: 'A launch page now, full site later', when: (a) => type(a) === 'new' && outOfReach(a), hint: 'Live in about a week' },
      { id: 'keep', label: 'Keep your current site live until it’s ready', when: (a) => ['redesign', 'migration'].includes(type(a)) && outOfReach(a), hint: 'No downtime · switch over in one go' },
      { id: 'move', label: 'Move the launch date', hintFor: (a) => { const m = model(a); return m ? `Realistic: ${m.low}–${m.high} weeks · most cost-effective` : 'Most cost-effective'; } },
      { id: 'advise', label: 'Not sure, advise me' },
    ],
  },
  {
    id: 'budget', kind: 'single', label: 'Budget', optional: true,
    question: 'Roughly what budget do you have in mind?',
    help: 'Optional, and only shared with Grant. It helps suggest the right scope from the start.',
    when: (a) => type(a) !== 'support',
    options: [
      { id: 'under2', label: 'Under $2,000', hint: 'A focused first version' },
      { id: '2to5', label: '$2,000–$5,000' },
      { id: '5to10', label: '$5,000–$10,000' },
      { id: '10plus', label: '$10,000+' },
      { id: 'unsure', label: 'Not sure yet', hint: 'Grant will suggest options' },
    ],
  },
  {
    id: 'notes', kind: 'text', label: 'Notes', optional: true,
    question: 'Anything else Grant should know?',
    help: 'Goals, links to sites you like, important dates… anything that helps. Optional.',
  },
];

/** Budget answers as a range in USD (for the quote builder's budget check). */
export const BUDGET_RANGES: Record<string, [number, number]> = { under2: [0, 2000], '2to5': [2000, 5000], '5to10': [5000, 10000], '10plus': [10000, Infinity] };

/* ---------- Timing model ---------- */

// Core build, in weeks: development plus Grant's own testing for ~5 layouts, with designs supplied.
const CORE: Record<string, Record<string, number>> = {
  new: { shopify: 3.5, 'shopify-plus': 5.5, webflow: 2.25, wordpress: 4, woocommerce: 4.5, unsure: 4 },
  redesign: { shopify: 3.5, 'shopify-plus': 5.5, webflow: 2.25, wordpress: 4, woocommerce: 4.5, unsure: 4 },
  theme: { shopify: 1.5, 'shopify-plus': 2, webflow: 1, wordpress: 1.5, woocommerce: 2, unsure: 1.5 },
  migration: { shopify: 3.5, 'shopify-plus': 5, webflow: 2.25, wordpress: 4, woocommerce: 4.5, unsure: 4 },
};
const LAYOUTS_INCLUDED = 5;
const PER_LAYOUT = { custom: 0.4, theme: 0.2 };
const CATALOG_SETUP: Record<string, number> = { xs: 0, s: 0.3, m: 0.75, l: 1.25 };
const CATALOG_MIGRATION: Record<string, number> = { xs: 0.5, s: 1, m: 2, l: 3.5 };
const FROM: Record<string, number> = { woocommerce: 0, magento: 1, bigcommerce: 0.3, squarespace: 0.4, shopify: 0, custom: 1.5 };
const MOVING: Record<string, number> = { customers: 0.3, orders: 0.5, content: 0.3, redirects: 0.5 };
const STORE: Record<string, number> = { filters: 0.5, subscriptions: 1, bundles: 0.5, b2b: 1.5, reviews: 0.4, markets: 1, configurator: 2, preorder: 0.3, checkout: 1 };
const WEBFLOW: Record<string, number> = { cms: 0.5, interactions: 0.75, localization: 1, memberships: 1.5, ecommerce: 1.5 };
const WP_FACTOR: Record<string, number> = { custom: 1, blocks: 1.1, builder: 0.75, unsure: 1 };
const INTEGRATIONS: Record<string, number> = { email: 0.3, crm: 0.5, tracking: 0.3, search: 0.5, erp: 2, api: 2 };
const DESIGN: Record<string, { add: number; factor: number }> = {
  ready: { add: 0, factor: 1 }, partial: { add: 1, factor: 1 }, theme: { add: 0, factor: 0.65 }, none: { add: 3, factor: 1 },
};
const CONTENT: Record<string, number> = { ready: 0, partial: 0.5, none: 1.5 };
const IMPROVEMENTS: Record<string, number> = { speed: 0.75, seo: 0.75, a11y: 1, apps: 0.5, fixes: 0.5, tracking: 0.5 };

export const LABELS: Record<string, string> = {
  filters: 'Advanced filters & search', subscriptions: 'Subscriptions', bundles: 'Bundles & upsells', b2b: 'B2B / wholesale',
  reviews: 'Reviews & loyalty', markets: 'Multiple markets', configurator: 'Product customiser', preorder: 'Pre-orders',
  checkout: 'Checkout customisation', cms: 'CMS collections', interactions: 'Advanced interactions', localization: 'Localisation',
  memberships: 'Members-only areas', ecommerce: 'Webflow Ecommerce', email: 'Email marketing', crm: 'CRM integration',
  tracking: 'Tracking setup', search: 'Search integration', erp: 'Inventory / ERP link', api: 'Custom API work',
  customers: 'Customer migration', orders: 'Order history', content: 'Blog & page migration', redirects: 'Redirects & SEO',
  speed: 'Speed work', seo: 'Technical SEO', a11y: 'Accessibility pass', apps: 'App clean-up', fixes: 'Fixes',
};

export interface Route { id: string; label: string; low: number; high: number; cost: string; fit?: 'fits' | 'close' | 'far' }

export interface Phase { id: string; label: string; weeks: number; display: string }

/** Human-friendly length: days for short phases, half weeks for mid, whole weeks for long ones. */
export const formatWeeks = (w: number) => {
  if (w < 1) { const days = Math.max(1, Math.round(w * 5)); return `${days} day${days > 1 ? 's' : ''}`; }
  if (w < 3) return `${Math.round(w * 2) / 2} wk`;
  return `${Math.round(w)} wk`;
};
/** A support plan (the same plans as the quote builder's packages, without prices). */
export interface SupportPlan { id: 'basic' | 'medium' | 'large' | 'vip' | 'custom'; name: string; hours: number; daily: number; reply: string; recommended?: boolean }
const SUPPORT_PLANS: Record<string, SupportPlan> = {
  '20': { id: 'basic', name: 'Basic', hours: 20, daily: 0, reply: 'Replies within 1 business day' },
  '40': { id: 'medium', name: 'Medium', hours: 40, daily: 0, reply: 'Replies the same business day' },
  '80': { id: 'large', name: 'Large', hours: 80, daily: 0, reply: 'Priority replies within 4 business hours' },
  // 8 hours × the average 21.67 working days in a month.
  vip: { id: 'vip', name: 'VIP', hours: 173, daily: 8, reply: 'Replies within 1 hour during working hours' },
};
/** The plan for an answer; "not sure" starts on Medium, and older estimates (5 or 10 hours) are a custom plan. */
export function supportPlan(answer: unknown): SupportPlan {
  const id = String(answer ?? '');
  if (SUPPORT_PLANS[id]) return SUPPORT_PLANS[id];
  if (id === 'unsure' || !id) return { ...SUPPORT_PLANS['40'], recommended: true };
  const hours = Number(id) || 20;
  return { id: 'custom', name: 'Custom', hours, daily: 0, reply: 'Replies within 1 business day' };
}

export interface Estimate {
  mode: 'none' | 'weeks' | 'monthly';
  low: number;
  high: number;
  hours?: number;
  /** Ongoing support: the plan chosen. */
  support?: SupportPlan;
  phases: Phase[];
  drivers: { label: string; weeks: number }[];
  /** Every driver, not just the top four (used for pricing). */
  allDrivers: { label: string; weeks: number }[];
  notes: string[];
  /** The launch date is still earlier than the estimate. */
  tight: boolean;
  /** Developers working in parallel (1 unless the client chose a bigger team). */
  team: number;
  /** One-developer, full-scope range, when the result shows a team or a first phase instead. */
  baseline?: { low: number; high: number };
  /** One-developer phases, for comparing team sizes. */
  basePhases: Phase[];
  /** Short line describing the scenario, e.g. "With 2 developers · higher cost". */
  scenario?: string;
  /** How the chosen speed-up option lands against the date. */
  fit?: 'fits' | 'close' | 'far';
  /** Plain-English verdict on the launch date (same as the note under the date options). */
  verdict?: StepNote;
  /** The speed-up route the client picked, if their date needed one. */
  choice?: string;
  /** Every realistic way to launch sooner, with how each lands against the date. */
  routes: Route[];
  /** Full-scope range for each team size that makes sense for this project. */
  teams: { n: number; low: number; high: number }[];
  /** Wider range: unknown platform, custom source or third-party integrations. */
  unsure: boolean;
}

const round = (n: number) => Math.round(n * 2) / 2;

/** Rough range around a calendar-week figure: a bit under to a fair bit over. */
export const spread = (weeks: number, unsure = false) => {
  const low = Math.max(1, Math.round(weeks * 0.85));
  return { low, high: Math.max(low + 1, Math.round(weeks * (unsure ? 1.35 : 1.2) + 0.25)) };
};

// More developers split the build and data work; discovery, design, content and QA don't speed up.
// Each extra person also adds coordination and code-review time.
// factor: share of the build/data time with n developers; qa: share of QA time (testing splits, but less well);
// overhead: extra calendar weeks for coordination and code reviews.
const TEAM: Record<number, { factor: number; qa: number; overhead: number }> = { 1: { factor: 1, qa: 1, overhead: 0 }, 2: { factor: 0.55, qa: 0.8, overhead: 0.25 }, 3: { factor: 0.42, qa: 0.7, overhead: 0.4 } };
const PARALLEL = ['build', 'data'];
/** One-developer phases re-timed for a team of n developers (for the quote page). */
export function phasesForTeam(r: Estimate, n: number): Phase[] {
  return planFor(r, n).phases;
}

/** Timeline for any team size, optionally launching the essentials first (quote page options). */
export function planFor(r: Estimate, n: number, essentialsFirst = false): { low: number; high: number; phases: Phase[] } {
  const source = r.choice === 'theme' ? r.phases : r.basePhases;
  const base = essentialsFirst ? essentials(source) : source;
  const raw = n > 1 ? teamPhases(base, n) : base;
  return { ...spread(teamWeeks(base, n), r.unsure), phases: raw.filter((p) => p.weeks > 0).map((p) => ({ ...p, display: formatWeeks(p.weeks) })) };
}

/** Calendar weeks for a team of n developers, from one-developer phases. */
export const teamWeeks = (phases: { id: string; weeks: number }[], n: number) => {
  const { factor, qa, overhead } = TEAM[n] ?? TEAM[1];
  return phases.reduce((sum, p) => sum + (PARALLEL.includes(p.id) ? p.weeks * factor : p.id === 'qa' ? p.weeks * qa : p.weeks), 0) + overhead;
};

// The one-developer, full-scope model, before any speed-up choice. Cached per answer set,
// because step conditions call it several times per render.
type Raw = { id: string; label: string; weeks: number }[];
type Range = { low: number; high: number };
interface Model extends Range {
  total: number; parallel: number; unsure: boolean; raw: Raw;
  teams: ({ n: number } & Range)[];
  /** Essentials first, one developer. */
  phase: Range & { raw: Raw };
  /** Essentials first, with the largest team that helps. */
  both: Range & { n: number; raw: Raw };
  /** Same project built on a premium theme, when that saves at least two weeks. */
  theme?: Range & { raw: Raw; drivers: { label: string; weeks: number }[]; allDrivers: { label: string; weeks: number }[] };
  drivers: { label: string; weeks: number }[]; allDrivers: { label: string; weeks: number }[]; notes: string[]; tight: boolean; deadlineWeeks: number;
}
let cacheKey = '';
let cacheValue: Model | null = null;
function model(a: Answers): Model | null {
  const key = JSON.stringify(a, (k, v) => (k === 'speedup' || k === 'notes' || k === 'budget' ? undefined : v));
  if (key !== cacheKey) { cacheKey = key; cacheValue = buildModel(a); }
  return cacheValue;
}
/** Phase 1 keeps core pages and must-have features; the rest follows after launch. */
const essentials = (raw: Raw): Raw => raw.map((p) => ({ ...p, weeks: p.id === 'build' ? p.weeks * 0.55 : p.id === 'content' ? p.weeks * 0.7 : p.id === 'qa' ? Math.max(0.5, p.weeks * 0.8) : p.weeks }));
const teamPhases = (raw: Raw, n: number): Raw => {
  const { factor, qa, overhead } = TEAM[n];
  return raw.map((p) => (PARALLEL.includes(p.id) ? { ...p, weeks: p.weeks * factor + (p.id === 'build' ? overhead : 0) } : p.id === 'qa' ? { ...p, weeks: p.weeks * qa } : p));
};
const sum = (raw: Raw) => raw.reduce((total, p) => total + p.weeks, 0);

/* ---------- How realistic is the launch date? ---------- */

type Tier = 'fits' | 'team' | 'phase' | 'teamOrPhase' | 'theme' | 'both' | 'close' | 'far';
/** The quickest realistic launch of any option. */
const fastest = (m: Model) => Math.min(m.both.low, m.theme?.low ?? Infinity);
/** Where a date lands against what each option can deliver. */
function reach(m: Model, date: number) {
  const teamFit = m.teams.some((t) => t.n > 1 && t.low <= date);
  const phaseFit = m.phase.low <= date;
  const themeFit = (m.theme?.low ?? Infinity) <= date;
  const bothFit = m.both.low <= date;
  const tier: Tier = m.low <= date ? 'fits'
    : teamFit && phaseFit ? 'teamOrPhase'
    : teamFit ? 'team'
    : phaseFit ? 'phase'
    : themeFit ? 'theme'
    : bothFit ? 'both'
    : fastest(m) <= date * 1.5 ? 'close'
    : 'far';
  return { tier, teamFit, phaseFit, themeFit, bothFit };
}
/** Improvement jobs prioritise fixes rather than launching "the essentials". */
const firstPart = (a: Answers) => (type(a) === 'improvements' ? { short: 'prioritising fixes', long: 'doing the highest-impact fixes first' } : { short: 'smaller first launch', long: 'launching the essentials first' });
function deadlineHint(a: Answers, date: number) {
  const m = model(a);
  if (!m) return '';
  const first = firstPart(a).short;
  return {
    fits: 'Fits the estimate',
    team: 'Possible with a bigger team',
    phase: `Possible with a ${first}`.replace('a prioritising', 'by prioritising'),
    teamOrPhase: `Possible with a bigger team or ${first}`,
    theme: 'Possible on a premium theme',
    both: `Only with a bigger team and ${first}`,
    close: 'Very tight for this scope',
    far: 'Not realistic for this scope',
  }[reach(m, date).tier];
}
const DATE_LABEL: Record<string, string> = { 2: '2 weeks', 4: 'a month', 8: '1–2 months', 13: '2–3 months', 26: '3–6 months' };
/** Plain-English verdict on the chosen launch date, shown under the deadline options. */
function deadlineNote(a: Answers): StepNote | null {
  const m = model(a);
  const choice = pick(a, 'deadline');
  if (!m || !choice) return null;
  const weeks = (x: Range) => `${x.low}–${x.high} weeks`;
  const one = `One developer needs about ${weeks(m)}`;
  if (choice === 'asap') return { tone: 'yes', title: 'As soon as possible', text: `${one}. Grant will confirm the earliest start date. If you have a firm date, pick it instead to see your options.` };
  if (choice === 'flexible') return { tone: 'yes', title: 'The most cost-effective choice', text: `With room on timing, one developer can take this on at a steady pace: about ${weeks(m)}.` };
  const date = Number(choice);
  const label = DATE_LABEL[choice] ?? `${date} weeks`;
  const { tier } = reach(m, date);
  const fitTeam = m.teams.find((t) => t.n > 1 && t.low <= date);
  const teamText = fitTeam?.n === 2 ? 'a second developer' : 'a team of 3 developers';
  const first = type(a) === 'improvements' ? 'Doing the highest-impact fixes first' : 'Launching the essentials first';
  switch (tier) {
    case 'fits':
      return { tone: 'yes', title: 'This works', text: `One developer can launch this in about ${weeks(m)}, the most cost-effective option.${m.high > date ? ' It’s close to the upper end, so keeping changes small will help.' : ''}` };
    case 'team':
      return { tone: 'maybe', title: fitTeam?.n === 2 ? 'Possible with an extra developer' : 'Possible with extra developers', text: `${one}. To launch within ${label}, ${teamText} would work in parallel (about ${weeks(fitTeam!)}). This adds to the cost.` };
    case 'phase':
      return { tone: 'maybe', title: type(a) === 'improvements' ? 'Possible by prioritising' : 'Possible with a smaller first launch', text: `${one} for everything. ${first} takes about ${weeks(m.phase)}, and the rest follows after.` };
    case 'teamOrPhase':
      return { tone: 'maybe', title: 'Possible, with a trade-off', text: `${one}. To launch within ${label}, add ${fitTeam?.n === 2 ? 'a second developer' : '2 more developers'} (about ${weeks(fitTeam!)}, higher cost), or try ${first.toLowerCase()} (about ${weeks(m.phase)}).` };
    case 'theme':
      return { tone: 'maybe', title: 'Possible on a premium theme', text: `A custom design takes about ${weeks(m)}. Starting from a premium theme takes about ${weeks(m.theme!)}, and usually costs less.` };
    case 'both':
      return { tone: 'maybe', title: 'Only with extra developers and a smaller launch', text: `${one}. Launching within ${label} takes ${m.both.n} developers building the essentials first (about ${weeks(m.both)}). This is the highest-cost option.` };
    case 'close':
      return { tone: 'no', title: 'Very tight for this project', text: `${one}. Even with extra developers and a smaller first launch, the quickest realistic launch is about ${fastest(m)} weeks. The next question shows your options.` };
    default:
      return { tone: 'no', title: `This project can’t be built within ${label}`, text: `${one}. Even with more developers and a smaller first launch, the quickest realistic launch is about ${fastest(m)} weeks. The next question shows what can work${type(a) === 'new' ? ', like a launch page first' : ''}.` };
  }
}
/** The same verdict for the PDF, without wording that only makes sense inside the wizard. */
function forDocument(note: StepNote | null): StepNote | undefined {
  if (!note) return undefined;
  return { ...note, text: note.text.replace(/ The next question shows[^.]*\./, '').replace(/ If you have a firm date, pick it instead to see your options\./, '') };
}
/** Is this option's earliest launch within 2x the date? Anything further isn't worth offering. */
const within = (a: Answers, low: number | undefined) => { const m = model(a); return Boolean(m && low !== undefined && low <= m.deadlineWeeks * 2); };
const offerTeam = (a: Answers, n: number) => within(a, model(a)?.teams.find((t) => t.n === n)?.low);
/** The combined option only when neither a team nor a smaller launch is enough on its own. */
const offerBoth = (a: Answers) => {
  const m = model(a);
  if (!m || !isBuild(a) || m.both.n < 2) return false;
  const r = reach(m, m.deadlineWeeks);
  return !r.teamFit && !r.phaseFit && within(a, m.both.low);
};
/** Relative cost of each speed-up route (lower is cheaper). */
const COST_RANK: Record<string, number> = { theme: 0, phase: 1, priority: 1, team2: 2, team3: 3, both: 4 };
/**
 * Which speed-up routes to offer: every route that fits the date (cheapest first, max four);
 * if none fit, the three fastest that get within 2x of the date.
 */
function shortlist(a: Answers): string[] {
  const m = model(a);
  if (!m) return [];
  const candidates = [
    offerTeam(a, 2) && 'team2', offerTeam(a, 3) && 'team3',
    isBuild(a) && within(a, m.phase.low) && 'phase', type(a) === 'improvements' && 'priority',
    offerBoth(a) && 'both', within(a, m.theme?.low) && 'theme',
  ].filter(Boolean) as string[];
  const low = (id: string) => choiceRange(m, id)?.low ?? Infinity;
  const fitting = candidates.filter((id) => low(id) <= m.deadlineWeeks).sort((x, y) => COST_RANK[x] - COST_RANK[y]);
  if (fitting.length) return fitting.slice(0, 4);
  return candidates.sort((x, y) => low(x) - low(y) || COST_RANK[x] - COST_RANK[y]).slice(0, 3);
}
const outOfReach = (a: Answers) => { const m = model(a); return Boolean(m && ['close', 'far'].includes(reach(m, m.deadlineWeeks).tier)); };

/** The range each speed-up choice delivers. */
function choiceRange(m: Model, choice: string): (Range & { raw: Raw; team: number }) | null {
  const team = (n: number) => { const t = m.teams.find((x) => x.n === n); return t ? { low: t.low, high: t.high, raw: teamPhases(m.raw, n), team: n } : null; };
  if (choice === 'team2') return team(2);
  if (choice === 'team3') return team(3);
  if (choice === 'phase' || choice === 'priority') return { ...m.phase, team: 1 };
  if (choice === 'both') return { ...m.both, team: m.both.n };
  if (choice === 'theme') return m.theme ? { ...m.theme, team: 1 } : null;
  return null;
}
const COST: Record<string, string> = { team2: 'higher cost', team3: 'highest cost', both: 'highest cost', phase: 'the rest follows later', priority: 'the rest follows later', theme: 'often lower cost' };
function choiceHint(a: Answers, choice: string) {
  const m = model(a);
  const r = m && choiceRange(m, choice);
  if (!m || !r) return '';
  return `${r.low <= m.deadlineWeeks ? 'Fits your date' : `About ${r.low}–${r.high} weeks`} · ${COST[choice]}`;
}
function speedHelp(a: Answers) {
  const m = model(a);
  if (!m) return '';
  const base = `With one developer this takes about ${m.low}–${m.high} weeks.`;
  const { tier } = reach(m, m.deadlineWeeks);
  if (tier === 'team' || tier === 'phase' || tier === 'teamOrPhase' || tier === 'theme') return `${base} These options can get you to your date:`;
  if (tier === 'both') return `${base} Only a bigger team and a smaller first launch together can get there:`;
  if (tier === 'close') return `${base} Even the fastest option needs about ${fastest(m)} weeks, so your date is very tight. Here’s what would work:`;
  return `${base} Even the fastest option needs about ${fastest(m)} weeks, so your date isn’t realistic for this scope. Here’s what would work instead:`;
}

export function estimate(a: Answers): Estimate {
  const t = type(a);
  const empty: Estimate = { mode: 'none', low: 0, high: 0, phases: [], drivers: [], allDrivers: [], notes: [], tight: false, team: 1, basePhases: [], teams: [], routes: [], unsure: false };
  if (!t) return empty;

  if (t === 'support') {
    const plan = supportPlan(pick(a, 'hours'));
    const notes = [
      plan.recommended ? 'Medium is a good starting point for most stores: about a day of work every week. Grant will confirm the right plan on a short call.' : '',
      plan.daily ? 'A dedicated developer for 8 hours every working day, Monday to Friday.' : `About ${Math.round((plan.hours / 4.33) * 2) / 2} hours of work a week, for updates, fixes and improvements.`,
      `${plan.reply}.`,
      plan.daily ? 'Weekend emergencies are included: if the site goes down or checkout stops working on a Saturday or Sunday, it gets fixed.' : '',
      'Unused hours don’t roll over to the next month. You can move up or down a plan with a month’s notice.',
      'Paying yearly in advance gets 2 months free.',
    ].filter(Boolean);
    return { ...empty, mode: 'monthly', hours: plan.hours, support: plan, notes };
  }

  const m = model(a)!;
  const notes = [...m.notes];
  const show = (raw: Raw): Phase[] => raw.filter((p) => p.weeks > 0).map((p) => ({ ...p, display: formatWeeks(p.weeks) }));
  const basePhases = show(m.raw);
  const date = m.deadlineWeeks;
  const hasDate = Number.isFinite(date) && date > 0;
  const gradeOf = (low: number) => (!hasDate ? undefined : low <= date ? 'fits' : low <= date * 1.5 ? 'close' : 'far') as Route['fit'];
  const ROUTE: Record<string, [string, string]> = {
    team2: ['2 developers', 'Higher cost'], team3: ['3 developers', 'Highest team cost'],
    phase: ['Essentials first', 'Rest follows later'], priority: ['Highest-impact fixes first', 'Rest follows later'],
    theme: ['Premium theme', 'Usually lower cost'], both: [`Essentials first, ${m.both.n} developers`, 'Highest cost'],
  };
  const routeIds = ['team2', 'team3', t === 'improvements' ? 'priority' : 'phase', 'theme', ...(m.both.n > 1 && isBuild(a) ? ['both'] : [])];
  const routes: Route[] = [{ id: 'standard', label: '1 developer (standard)', low: m.low, high: m.high, cost: 'Most cost-effective', fit: gradeOf(m.low) }, ...routeIds.flatMap((id) => {
    const x = choiceRange(m, id);
    return x ? [{ id, label: ROUTE[id][0], low: x.low, high: x.high, cost: ROUTE[id][1], fit: gradeOf(x.low) }] : [];
  })];
  const result: Estimate = { mode: 'weeks', low: m.low, high: m.high, phases: basePhases, drivers: m.drivers, allDrivers: m.allDrivers, notes, tight: m.tight, team: 1, basePhases, teams: m.teams, unsure: m.unsure, routes, verdict: forDocument(deadlineNote(a)), choice: m.tight ? pick(a, 'speedup') || undefined : undefined };
  const baseline = { low: m.low, high: m.high };

  // Comfortable or borderline dates (no speed-up needed).
  if (hasDate && !m.tight) {
    if (m.high > date) notes.unshift('Your date sits inside the estimate range, so keeping scope changes small will help you hit it.');
    else if (date >= m.high * 1.5) notes.push('Your date leaves comfortable room for feedback rounds, content and testing.');
  }
  if (!m.tight) return result;

  const r = reach(m, date);
  const choice = pick(a, 'speedup');
  const range = choiceRange(m, choice);
  const grade = (low: number) => (low <= date ? 'fits' : low <= date * 1.5 ? 'close' : 'far');
  const span = (x: Range) => `${x.low}–${x.high} weeks`;

  if (range) {
    const g = grade(range.low);
    const scenario: Record<string, string> = {
      team2: 'With 2 developers · higher cost', team3: 'With 3 developers · highest cost', phase: 'Phase 1 · the essentials',
      priority: 'Highest-impact fixes first', both: `Phase 1 with ${range.team} developers · highest cost`, theme: 'Premium theme · one developer',
    };
    Object.assign(result, { low: range.low, high: range.high, phases: show(range.raw), team: range.team, baseline, tight: g !== 'fits', fit: g, scenario: scenario[choice] });
    if (choice === 'theme' && m.theme) {
      result.drivers = m.theme.drivers;
      result.allDrivers = m.theme.allDrivers;
      const designer = notes.findIndex((n) => n.includes('trusted designer partner'));
      if (designer >= 0) notes.splice(designer, 1);
    }
    const later = spread(sum(m.raw) - sum(essentials(m.raw)) + 0.5);
    const what: Record<string, Record<string, string>> = {
      team2: {
        fits: 'With 2 developers working in parallel, this fits your date. Expect a noticeably higher cost than one developer: more people, plus time for coordination and code reviews.',
        close: `With 2 developers it’s about ${span(range)}, a little past your date. ${r.bothFit ? 'Launching the essentials first as well would close the gap.' : 'A slightly later date would fit.'}`,
        far: `Even with 2 developers it’s about ${span(range)}, well past your date. A later date or a much smaller first launch would be needed.`,
      },
      team3: {
        fits: 'With 3 developers working in parallel, this fits your date. It’s the highest-cost team option: more people, plus time for coordination and code reviews.',
        close: `With 3 developers it’s about ${span(range)}, a little past your date. ${r.bothFit ? 'Launching the essentials first as well would close the gap.' : 'A slightly later date would fit.'}`,
        far: `Even with 3 developers it’s about ${span(range)}, well past your date. Adding more people beyond this mostly adds coordination time.`,
      },
      phase: {
        fits: `Phase 1 launches the essentials: key pages, must-have features and a working checkout or contact flow. The rest follows in a second phase of about ${span(later)}.`,
        close: `A smaller first launch needs about ${span(range)}, a little past your date. ${m.teams.length > 1 ? 'Adding a second developer as well would close the gap.' : 'Moving the date by a couple of weeks would fit.'}`,
        far: `Even a smaller first launch needs about ${span(range)}, well past your date. A later date is the realistic option.`,
      },
      priority: {
        fits: 'The fixes with the biggest impact go first, so you see results by your date. The rest follows straight after.',
        close: `The highest-impact fixes take about ${span(range)}, a little past your date.`,
        far: `Even the highest-impact fixes take about ${span(range)}. A later date would be more realistic.`,
      },
      both: {
        fits: `${range.team} developers building the essentials first is the quickest route, and it fits your date. It’s also the highest-cost option. The rest follows after launch.`,
        close: `Even ${range.team} developers building only the essentials need about ${span(range)}, a little past your date. A slightly later date would fit.`,
        far: `About ${range.low} weeks is the quickest realistic launch, even with ${range.team} developers building only the essentials. A later date would keep costs down and lower the risk.`,
      },
      theme: {
        fits: 'Starting from a quality premium theme fits your date and usually lowers the cost, while still matching your brand.',
        close: `On a premium theme it’s about ${span(range)}, a little past your date. A slightly later date would fit, and it’s still the lower-cost route.`,
        far: `Even on a premium theme it’s about ${span(range)}, well past your date.`,
      },
    };
    notes.unshift(what[choice][g]);
  } else if (choice === 'holding') {
    Object.assign(result, { tight: false, baseline, scenario: 'Launch page first · full site after' });
    notes.unshift(`A simple launch page (logo, story and an email sign-up) can be live in about a week, collecting interest while the full site is built over about ${span(m)}.`);
  } else if (choice === 'keep') {
    Object.assign(result, { tight: false, scenario: 'Current site stays live' });
    notes.unshift(`Your current site stays live and keeps working while the new one is built over about ${span(m)}. Then it switches over in one go, with no downtime.`);
  } else if (choice === 'move') {
    Object.assign(result, { tight: false, scenario: 'One developer · new launch date' });
    notes.unshift(`Keeping one developer is the most cost-effective option. A launch about ${span(m)} after kick-off fits this scope.`);
  } else if (choice === 'advise') {
    notes.unshift(r.tier === 'far'
      ? 'Grant will suggest a realistic launch date, and what could go live first, on the call.'
      : 'Grant will suggest the best mix of team size and launch scope on the call, based on your date and budget.');
  } else {
    // Not answered yet: say honestly what can and can't hit the date.
    const fitTeam = m.teams.find((x) => x.n > 1 && x.low <= date);
    const teamText = fitTeam ? (fitTeam.n === 2 ? 'a second developer' : 'a team of 3 developers') : '';
    const first = firstPart(a).long;
    notes.unshift({
      team: `That’s tighter than the estimate. ${teamText[0]?.toUpperCase() + teamText.slice(1)} (faster, but higher cost) can hit your date.`,
      phase: `That’s tighter than the estimate. ${first[0].toUpperCase() + first.slice(1)} can hit your date.`,
      teamOrPhase: `That’s tighter than the estimate. You can hit your date with ${teamText} (faster, but higher cost) or by ${first}.`,
      theme: `That’s tighter than the estimate. Starting from a premium theme can hit your date, and usually costs less.`,
      both: 'That’s much tighter than the estimate. Only a bigger team and a smaller first launch together can hit it, at the highest cost.',
      close: `That’s much tighter than the estimate. Even the fastest option needs about ${fastest(m)} weeks.`,
      far: `That date isn’t realistic for this scope: even the fastest option would take about ${fastest(m)} weeks.${t === 'new' ? ' A launch page first, or a later date, would work.' : ' A later date would work.'}`,
      fits: '',
    }[r.tier]);
  }

  // Context tips for tight dates, most useful first (max three).
  const tips: string[] = [];
  const designChoice = pick(a, 'design');
  const layouts = Number(a.layouts ?? 6);
  if (date <= 2 && isBuild(a) && t !== 'theme') tips.push('Two weeks usually only suits a theme setup, small updates or a launch page.');
  if (m.theme && choice !== 'theme' && designChoice === 'none') tips.push(`Design can’t be sped up much by adding developers. Starting from a premium theme would bring it to about ${span(m.theme)}.`);
  if (layouts > 15) tips.push(`Reusing templates for similar pages, instead of ${layouts} unique layouts, would shorten the build.`);
  if (picks(a, 'integrations').some((id) => id === 'erp' || id === 'api')) tips.push('The ERP or custom API connection can go live in a second phase, after launch.');
  const heavy = picks(a, 'storeFeatures').filter((id) => ['b2b', 'configurator', 'subscriptions', 'markets'].includes(id));
  if (heavy.length) tips.push(`${heavy.map((id) => LABELS[id]).join(', ')} could follow in a second phase.`);
  if (t === 'migration') tips.push('Rushing a migration risks lost data and search rankings. Plan the switch-over for a quiet sales period.');
  if (t === 'migration' && pick(a, 'catalog') === 'l') tips.push('Moving 5,000+ products takes time to check properly, whatever the team size.');
  if (choice !== 'move' && choice !== 'holding' && choice !== 'keep') notes.splice(1, 0, ...tips.slice(0, 3));
  return result;
}

function buildModel(a: Answers): Model | null {
  const t = type(a);
  const platform = pick(a, 'platform') || 'unsure';
  if (!t || t === 'support') return null;

  const drivers: { label: string; weeks: number }[] = [];
  const notes: string[] = [];
  const add = (label: string, weeks: number) => { if (weeks > 0) drivers.push({ label, weeks }); return weeks; };
  let build = 0;
  let design = 0;
  let data = 0;
  let content = 0;

  if (t === 'improvements') {
    const chosen = picks(a, 'improvements');
    build = chosen.reduce((sum, id) => sum + add(LABELS[id] ?? id, IMPROVEMENTS[id] ?? 0), 0) || 0.5;
    if (chosen.includes('speed')) notes.push('Speed work starts with an audit, so the fixes can target what actually slows the site down.');
  } else {
    const designChoice = DESIGN[pick(a, 'design')] ?? DESIGN.ready;
    const core = CORE[t][platform] ?? CORE[t].unsure;
    const layouts = Number(a.layouts ?? 6);
    const perLayout = t === 'theme' || pick(a, 'design') === 'theme' ? PER_LAYOUT.theme : PER_LAYOUT.custom;
    let structural = core + Math.max(0, layouts - LAYOUTS_INCLUDED) * perLayout;
    if (layouts > LAYOUTS_INCLUDED) drivers.push({ label: `${layouts} page layouts`, weeks: (layouts - LAYOUTS_INCLUDED) * perLayout * designChoice.factor });
    if (['wordpress', 'woocommerce'].includes(platform)) structural *= WP_FACTOR[pick(a, 'wpApproach')] ?? 1;
    build += structural * designChoice.factor;

    if (isStore(a)) {
      const catalog = pick(a, 'catalog') || 'xs';
      if (t === 'migration') {
        if (picks(a, 'moving').includes('products')) data += add('Product data migration', CATALOG_MIGRATION[catalog]);
      } else {
        build += add('Product setup', CATALOG_SETUP[catalog]);
      }
      for (const id of picks(a, 'storeFeatures')) build += add(LABELS[id], STORE[id] ?? 0);
      if (picks(a, 'storeFeatures').includes('checkout')) notes.push('Shopify Plus checkout changes are built with Checkout Extensibility, which keeps them upgrade-safe.');
      if (picks(a, 'storeFeatures').includes('b2b') && platform === 'shopify') notes.push('Shopify’s built-in B2B tools need Shopify Plus. On standard Shopify, wholesale runs through an app.');
    }
    if (platform === 'webflow') for (const id of picks(a, 'webflowFeatures')) build += add(LABELS[id], WEBFLOW[id] ?? 0);

    if (t === 'migration') {
      data += add('Migrating from ' + ({ woocommerce: 'WooCommerce', magento: 'Magento', bigcommerce: 'BigCommerce', squarespace: 'Squarespace/Wix', shopify: 'Shopify', custom: 'a custom platform' } as Record<string, string>)[pick(a, 'from')] , FROM[pick(a, 'from')] ?? 0);
      for (const id of picks(a, 'moving')) if (id !== 'products') data += add(LABELS[id], MOVING[id] ?? 0);
      if (!picks(a, 'moving').includes('redirects')) notes.push('Worth adding URL redirects: without them, a migration can lose search rankings.');
      if (pick(a, 'from') === 'squarespace') notes.push('Squarespace and Wix export limited data, so some content may need to be moved by hand.');
    }

    for (const id of picks(a, 'integrations')) build += add(LABELS[id], INTEGRATIONS[id] ?? 0);
    if (picks(a, 'integrations').includes('erp')) notes.push('Inventory and ERP links depend on the other system’s API; timing firms up once Grant has seen it.');

    design = add('Design phase', designChoice.add);
    if (pick(a, 'design') === 'none') notes.push('Grant is a developer, so design runs with a trusted designer partner. This adds a design phase before the build.');
    if (pick(a, 'design') === 'theme') notes.push('Starting from a quality theme cuts build time noticeably while still matching your brand.');
    content = add('Content preparation', CONTENT[pick(a, 'content')] ?? 0);
    if (pick(a, 'content') === 'none') notes.push('Content is the most common cause of delays. Starting on it now keeps the launch on track.');
  }

  if (platform === 'unsure' && t !== 'improvements') notes.push('Not sure on the platform? Shopify suits most stores, Webflow suits marketing sites, and WordPress suits content-heavy sites.');

  // Small jobs get a short audit and check; bigger builds a proper discovery and QA phase.
  const small = t === 'improvements';
  const discovery = small ? 0.25 : round(Math.max(0.5, (build + design) * 0.07));
  const qa = small ? 0.25 : round(Math.max(0.5, build * 0.12));
  const raw = [
    { id: 'discovery', label: t === 'improvements' ? 'Audit' : 'Discovery', weeks: discovery },
    { id: 'design', label: 'Design', weeks: design },
    { id: 'build', label: t === 'improvements' ? 'Fixes' : 'Build', weeks: build },
    { id: 'data', label: 'Data migration', weeks: data },
    { id: 'content', label: 'Content', weeks: content },
    { id: 'qa', label: 'QA & launch', weeks: qa },
  ].filter((phase) => phase.weeks > 0);
  // The total uses exact figures; phases are rounded only for display (min. a quarter week).
  const total = raw.reduce((sum, phase) => sum + phase.weeks, 0);
  const parallel = raw.filter((phase) => PARALLEL.includes(phase.id)).reduce((sum, phase) => sum + phase.weeks, 0);
  const unsure = platform === 'unsure' || pick(a, 'from') === 'custom' || picks(a, 'integrations').some((id) => id === 'erp' || id === 'api');
  const { low, high } = spread(total, unsure);
  // Team sizes that actually shorten the schedule (small builds gain little from more people).
  const teams = [{ n: 1, low, high }];
  for (const n of [2, 3]) {
    const range = spread(teamWeeks(raw, n), unsure);
    if (parallel >= (n === 2 ? 2 : 4) && range.low < teams[teams.length - 1].low) teams.push({ n, ...range });
  }

  const deadline = pick(a, 'deadline');
  const deadlineWeeks = Number(deadline);
  const tight = Number.isFinite(deadlineWeeks) && deadlineWeeks > 0 && low > deadlineWeeks;
  if (deadline === 'asap') notes.push('For an ASAP start, Grant will confirm the earliest available start date.');

  drivers.sort((x, y) => y.weeks - x.weeks);
  const phaseRaw = essentials(raw);
  const phase = { ...spread(sum(phaseRaw), unsure), raw: phaseRaw };
  const bestTeam = teams[teams.length - 1].n;
  const both = { ...spread(teamWeeks(phaseRaw, bestTeam), unsure), n: bestTeam, raw: teamPhases(phaseRaw, bestTeam) };
  // Would a premium theme help? Only for custom builds where it saves at least two weeks.
  let theme: Model['theme'];
  if (['new', 'redesign'].includes(t) && ['none', 'partial'].includes(pick(a, 'design'))) {
    const alt = buildModel({ ...a, design: 'theme', deadline: undefined });
    if (alt && alt.low <= low - 2) theme = { low: alt.low, high: alt.high, raw: alt.raw, drivers: alt.drivers, allDrivers: alt.allDrivers };
  }
  return { low, high, total, parallel, unsure, raw, teams, phase, both, theme, drivers: drivers.slice(0, 4), allDrivers: drivers, notes, tight, deadlineWeeks };
}
