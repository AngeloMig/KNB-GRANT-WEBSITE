// Public support-page content. Prices and availability are confirmed with Grant.
export const supportPlans = [
  {
    id: 'basic', name: 'Basic', hours: 20, value: '20',
    best: 'Keep your website current and working well. For businesses that need regular care and small changes.',
    reply: 'Within 1 business day',
    items: [
      'Update products, prices and stock information.',
      'Replace photos, banners and promotional offers.',
      'Edit page text and business details.',
      'Fix broken links and buttons.',
      'Fix small layout issues on phones.',
      'Apply and check agreed website updates.',
      'Check contact forms and checkout.',
      'Reduce heavy image sizes for faster loading.',
      'Run a monthly website health check.',
      'Send a simple monthly work summary.',
    ],
    example: 'A routine care month: refresh offers and product details, fix small issues and check that customers can enquire or place an order.',
  },
  {
    id: 'medium', name: 'Medium', hours: 40, value: '40',
    best: 'Make regular improvements while keeping your website running. For businesses adding offers, pages and campaigns.',
    reply: 'The same business day',
    items: [
      'Everything in Basic, plus regular improvements.',
      'Create pages for offers and campaigns.',
      'Add or update service and information pages.',
      'Improve product and collection pages.',
      'Make menus and navigation easier to use.',
      'Build page sections you can reuse.',
      'Improve page titles and descriptions for search.',
      'Set up or check enquiry and sales tracking.',
      'Review where website visitors come from.',
      'Plan priorities in a 30-minute monthly call.',
    ],
    example: 'A campaign month: create a page for a new offer, improve key product pages and check how enquiries or sales are recorded.',
  },
  {
    id: 'large', name: 'Large', hours: 80, value: '80',
    best: 'Make bigger website changes, with work moving forward each week. For businesses that need new features and ongoing improvements.',
    reply: 'Within 4 business hours',
    items: [
      'Everything in Medium, with priority replies.',
      'Build features around how your business works.',
      'Improve product search and filters.',
      'Create enquiry forms for your sales process.',
      'Connect your website with other business tools.',
      'Work on slow pages and loading problems.',
      'Improve the layouts used across your website.',
      'Test larger changes across phones and computers.',
      'Keep larger jobs moving alongside everyday fixes.',
      'Review progress and priorities every two weeks.',
    ],
    example: 'A larger project: build a product finder, connect an agreed business tool and test the changes. Regular care continues; larger jobs may span more than one month.',
  },
] as const;

export const vipSupport = {
  capacity: '8 hours a day, Monday–Friday',
  purpose: 'A developer focused on your business, every working day.',
  reply: '15–60 minutes during agreed working hours',
  emergency: 'Target reply within 2–4 hours outside working hours, including weekdays and weekends.',
  items: [
    'Everything in Large, with a dedicated developer.',
    '8 hours of developer time each working day.',
    'Work on larger features and website improvements.',
    'Coordinate with your other teams or agencies.',
    'Share a short progress update each working day.',
    'Keep priorities together on a shared task board.',
    'Review work and next steps in a weekly call.',
    'Help with emergencies outside working hours.',
  ],
} as const;

export const supportJobs = [
  { id: 'images', label: 'Resize and compress heavy images', low: 1, high: 3, group: 'Speed & stability' },
  { id: 'code', label: 'Remove code pages never use', low: 2, high: 4, group: 'Speed & stability' },
  { id: 'css', label: 'Trim unused styling', low: 1, high: 3, group: 'Speed & stability' },
  { id: 'blocking', label: 'Improve first-screen loading', low: 2, high: 4, group: 'Speed & stability' },
  { id: 'lcp', label: 'Speed up the main image', low: 2, high: 5, group: 'Speed & stability' },
  { id: 'shift', label: 'Stop the layout jumping as it loads', low: 1, high: 3, group: 'Speed & stability' },
  { id: 'tap', label: 'Make mobile buttons easier to tap', low: 1, high: 2, group: 'Accessibility & search' },
  { id: 'seo', label: 'Write page descriptions for search', low: 1, high: 2, group: 'Accessibility & search' },
  { id: 'alt', label: 'Add image text descriptions', low: 1, high: 2, group: 'Accessibility & search' },
] as const;

export const supportQuestions = [
  { id: 'workload', short: 'Workload', title: 'How much ongoing help do you need?', help: 'Choose the way you expect to work together.', options: [
    { id: 'occasional', label: 'An occasional helping hand', detail: 'Small fixes and updates as they come up.' },
    { id: 'monthly', label: 'A regular monthly check-in', detail: 'A planned list of changes each month.' },
    { id: 'weekly', label: 'Development every week', detail: 'A continuing flow of work and improvements.' },
    { id: 'dedicated', label: 'A dedicated developer', detail: 'Developer time every working day.' },
  ] },
  { id: 'focus', short: 'Priorities', title: 'What should we focus on?', help: 'Pick the main priority. You can add specific jobs below.', options: [
    { id: 'care', label: 'Keep the website healthy', detail: 'Updates, fixes and routine maintenance.' },
    { id: 'growth', label: 'Improve how it performs', detail: 'Pages, conversion improvements and tracking.' },
    { id: 'features', label: 'Build features and integrations', detail: 'Larger changes alongside ongoing support.' },
  ] },
  { id: 'response', short: 'Response', title: 'How quickly do you need a reply?', help: 'Reply windows apply during business hours. Completion time depends on the work.', options: [
    { id: 'standard', label: 'Within 1 business day', detail: 'Planned work; a next-business-day reply is fine.' },
    { id: 'same-day', label: 'The same business day', detail: 'Regular work that benefits from a quicker response.' },
    { id: 'priority', label: 'Within 4 business hours', detail: 'Priority support for an active website or project.' },
  ] },
] as const;

export type SupportChoice = Partial<Record<'workload' | 'focus' | 'response', string>> & { jobs?: string[] };
export type SupportPlanValue = '20' | '40' | '80' | 'vip';
export interface SupportRecommendation { id: string; name: string; value: SupportPlanValue; capacity: string; reply: string; reasons: string[]; jobs: { count: number; low: number; high: number } }

export function cleanSupportChoice(value: unknown): SupportChoice {
  if (!value || typeof value !== 'object') return {};
  const raw = value as Record<string, unknown>, result: SupportChoice = {};
  for (const question of supportQuestions) {
    if (question.options.some(option => option.id === raw[question.id])) result[question.id] = raw[question.id] as string;
  }
  result.jobs = Array.isArray(raw.jobs) ? [...new Set(raw.jobs.filter((id): id is string => typeof id === 'string' && supportJobs.some(job => job.id === id)))] : [];
  return result;
}

export function recommendSupport(value: unknown): SupportRecommendation | null {
  const answers = cleanSupportChoice(value);
  if (!answers.workload || !answers.focus || !answers.response) return null;
  const selected = supportJobs.filter(job => answers.jobs?.includes(job.id));
  const jobs = selected.reduce((total, job) => ({ count: total.count + 1, low: total.low + job.low, high: total.high + job.high }), { count: 0, low: 0, high: 0 });
  // Match capacity bands and response needs separately. A quicker reply never
  // invents extra work hours; specific jobs are a minimum, not counted twice.
  let capacity = answers.workload === 'weekly' || answers.focus !== 'care' ? 40 : 20;
  if (answers.workload === 'weekly' && answers.focus === 'features') capacity = 80;
  if (jobs.high > 40) capacity = Math.max(capacity, 80);
  else if (jobs.high > 20) capacity = Math.max(capacity, 40);
  const responseCapacity = answers.response === 'priority' ? 80 : answers.response === 'same-day' ? 40 : 20;
  capacity = Math.max(capacity, responseCapacity);
  const plan = supportPlans.find(item => item.hours >= capacity)!;
  const dedicated = answers.workload === 'dedicated';
  const reasons = [
    supportQuestions[0].options.find(option => option.id === answers.workload)!.label,
    supportQuestions[1].options.find(option => option.id === answers.focus)!.label,
    `Reply preference: ${supportQuestions[2].options.find(option => option.id === answers.response)!.label.toLowerCase()}`,
  ];
  return { id: dedicated ? 'vip' : plan.id, name: dedicated ? 'VIP' : plan.name, value: dedicated ? 'vip' : plan.value, capacity: dedicated ? vipSupport.capacity : `${plan.hours} hours a month`, reply: dedicated ? `${vipSupport.reply}. ${vipSupport.emergency}` : plan.reply, reasons, jobs };
}

export function supportInquiryUrl(base: string, plan: SupportPlanValue, value?: unknown): string {
  const params = new URLSearchParams({ plan });
  const answers = cleanSupportChoice(value);
  for (const question of supportQuestions) if (answers[question.id]) params.set(question.id, answers[question.id]!);
  if (answers.jobs?.length) params.set('tasks', answers.jobs.join(','));
  return `${base.replace(/\/$/, '')}/estimate/?${params}`;
}

/** Only known public option IDs can become notes in the estimator. */
export function supportInquiryNotes(params: URLSearchParams): string {
  const answers = cleanSupportChoice({ workload: params.get('workload'), focus: params.get('focus'), response: params.get('response'), jobs: params.get('tasks')?.split(',') });
  const lines = supportQuestions.flatMap(question => {
    const option = question.options.find(item => item.id === answers[question.id]);
    return option ? [`${question.short}: ${option.label}`] : [];
  });
  const selected = supportJobs.filter(job => answers.jobs?.includes(job.id));
  if (selected.length) lines.push('Jobs to discuss:', ...selected.map(job => `- ${job.label} (rough guide: ${job.low}–${job.high} hours)`));
  return lines.length ? `From the support plan finder:\n${lines.join('\n')}\nScope and timing to be confirmed with Grant.` : '';
}
