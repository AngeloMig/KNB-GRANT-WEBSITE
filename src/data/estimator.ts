// Project estimator: questions, conditions and the timing model.
// Grant: every number here is in weeks of calendar time for one developer, assuming feedback
// within ~2 business days. They are calibrated to typical freelance timelines; adjust freely.
// The page always presents the result as a rough guide, never a quote.

export type Answers = Record<string, string | string[] | number | undefined>;

export interface Option {
  id: string;
  label: string;
  hint?: string;
  /** Only offer this option when the condition holds. */
  when?: (a: Answers) => boolean;
}

export interface Step {
  id: string;
  kind: 'single' | 'multi' | 'range' | 'text';
  /** Short label used in the progress bar, summary and brief. */
  label: string;
  question: string;
  help?: string;
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
      { id: 'woocommerce', label: 'WooCommerce / WordPress' },
      { id: 'magento', label: 'Magento / Adobe Commerce', hint: 'Usually the most complex' },
      { id: 'bigcommerce', label: 'BigCommerce' },
      { id: 'squarespace', label: 'Squarespace or Wix', hint: 'Limited data export' },
      { id: 'shopify', label: 'Shopify' },
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
    question: 'How much help each month?',
    when: (a) => type(a) === 'support',
    options: [
      { id: '5', label: 'Around 5 hours', hint: 'Small tweaks, peace of mind' },
      { id: '10', label: 'Around 10 hours', hint: 'Regular updates' },
      { id: '20', label: 'Around 20 hours', hint: 'Ongoing improvements' },
      { id: '40', label: '40+ hours', hint: 'Like a part-time developer' },
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
    options: [
      { id: 'asap', label: 'As soon as possible' },
      { id: '4', label: 'Within a month' },
      { id: '10', label: 'In 2–3 months' },
      { id: 'flexible', label: 'Flexible' },
    ],
  },
  {
    id: 'notes', kind: 'text', label: 'Notes', optional: true,
    question: 'Anything else Grant should know?',
    help: 'Links to your current site, goals, budget range… anything that helps. Optional.',
  },
];

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

export interface Phase { id: string; label: string; weeks: number; display: string }

/** Human-friendly length: days for short phases, half weeks for mid, whole weeks for long ones. */
export const formatWeeks = (w: number) => {
  if (w < 1) { const days = Math.max(1, Math.round(w * 5)); return `${days} day${days > 1 ? 's' : ''}`; }
  if (w < 3) return `${Math.round(w * 2) / 2} wk`;
  return `${Math.round(w)} wk`;
};
export interface Estimate {
  mode: 'none' | 'weeks' | 'monthly';
  low: number;
  high: number;
  hours?: number;
  phases: Phase[];
  drivers: { label: string; weeks: number }[];
  notes: string[];
  tight: boolean;
}

const round = (n: number) => Math.round(n * 2) / 2;

export function estimate(a: Answers): Estimate {
  const t = type(a);
  const platform = pick(a, 'platform') || 'unsure';
  const empty: Estimate = { mode: 'none', low: 0, high: 0, phases: [], drivers: [], notes: [], tight: false };
  if (!t) return empty;

  if (t === 'support') {
    const hours = Number(pick(a, 'hours') || 10);
    return { ...empty, mode: 'monthly', hours, notes: ['Support is usually a monthly retainer with a set number of hours. Unused time doesn’t usually roll over, so start small and adjust.'] };
  }

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
  const phases: Phase[] = raw.map((phase) => ({ ...phase, display: formatWeeks(phase.weeks) }));
  const unsure = platform === 'unsure' || pick(a, 'from') === 'custom' || picks(a, 'integrations').some((id) => id === 'erp' || id === 'api');
  const low = Math.max(1, Math.round(total * 0.85));
  const high = Math.max(low + 1, Math.round(total * (unsure ? 1.35 : 1.2) + 0.25));

  const deadline = pick(a, 'deadline');
  const deadlineWeeks = Number(deadline);
  const tight = Number.isFinite(deadlineWeeks) && deadlineWeeks > 0 && low > deadlineWeeks;
  if (tight) notes.unshift(`That’s tighter than the estimate. Two ways to hit your date: a smaller first launch with the essentials, then a second phase; or a team of 2–3 developers working in parallel, which is faster but costs more.`);
  if (deadline === 'asap') notes.push('For an ASAP start, Grant will confirm the earliest available start date.');

  drivers.sort((x, y) => y.weeks - x.weeks);
  return { mode: 'weeks', low, high, phases, drivers: drivers.slice(0, 4), notes, tight };
}
