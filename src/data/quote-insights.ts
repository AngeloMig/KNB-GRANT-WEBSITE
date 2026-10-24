// Quote builder insights: ready-to-send emails, the dashboard's "This month" to-do list,
// how many hours are committed against your capacity, and income over the last 12 months.
import { formatMoney } from './pricing';
import {
  addDays, addMonths, balanceDue, billedOption, hoursText, margin, monthFor, niceDate, optionPlan, optionTotals, packageOf,
  retainerMonths, retainerPlan, today, validUntil, warrantyEnd, yearlyPrice,
  type Invoice, type PackageId, type Profile, type QuoteState, type RetainerMonth,
} from './quote-model';

/* ---------- Emails ---------- */
export type EmailKind = 'followup' | 'invoice' | 'reminder' | 'report' | 'upgrade' | 'checkin' | 'yearly' | 'launch' | 'testimonial';
export const EMAIL_KINDS: { id: EmailKind; label: string; for: 'any' | 'project' | 'retainer' }[] = [
  { id: 'followup', label: 'Follow up on the quote', for: 'any' },
  { id: 'invoice', label: 'Send an invoice', for: 'any' },
  { id: 'reminder', label: 'Payment reminder', for: 'any' },
  { id: 'launch', label: 'Launch day + support plans', for: 'project' },
  { id: 'testimonial', label: 'Ask for a testimonial', for: 'project' },
  { id: 'report', label: 'Monthly report', for: 'retainer' },
  { id: 'upgrade', label: 'Suggest a bigger plan', for: 'retainer' },
  { id: 'checkin', label: 'Check in (hours unused)', for: 'retainer' },
  { id: 'yearly', label: 'Offer yearly prepay', for: 'retainer' },
];
export interface Email { subject: string; body: string }
export interface EmailContext { invoice?: Invoice; month?: RetainerMonth; prices?: Record<string, number> }

const ORDER: PackageId[] = ['basic', 'medium', 'large', 'vip'];
/** The next plan up from a retainer's plan (none above VIP). */
export const nextPackage = (id: PackageId) => { const i = ORDER.indexOf(id); return i >= 0 && i < ORDER.length - 1 ? packageOf(ORDER[i + 1]) : id === 'custom' ? packageOf('medium') : null; };

/** A ready-to-send email for a quote. Plain words, signed with your business name. */
export function buildEmail(q: QuoteState, kind: EmailKind, profile: Profile, ctx: EmailContext = {}): Email {
  const money = (n: number) => formatMoney(n, q.settings.currency);
  const first = (q.client.name || '').split(/\s+/)[0] || 'there';
  const title = q.project.title || 'your project';
  const sign = ['', 'Best,', profile.name, [profile.website, profile.phone].filter(Boolean).join(' · ')].filter((l, i) => i < 3 || l).join('\n');
  const pay = profile.payment.trim() ? `\n\nHow to pay:\n${profile.payment.trim()}` : '';
  const done = (subject: string, lines: string[]) => ({ subject, body: [`Hi ${first},`, '', ...lines].join('\n') + '\n' + sign });
  const inv = ctx.invoice ?? q.invoices.find((i) => balanceDue(i) > 0) ?? q.invoices[q.invoices.length - 1];
  const r = q.retainer;
  switch (kind) {
    case 'followup':
      return done(`Following up: quotation ${q.meta.number}`, [
        `I wanted to check in on the quotation for ${title} (${q.meta.number}). Did you have any questions, or anything you'd like me to adjust?`,
        '',
        `It's valid until ${niceDate(validUntil(q), 'long')}. If the timing or budget needs to change, just say and I'll suggest options.`,
      ]);
    case 'invoice':
      if (!inv) return done(`Invoice for ${title}`, ['Please find the invoice attached.' + pay]);
      return done(`Invoice ${inv.number}: ${inv.milestone}`, [
        `Please find invoice ${inv.number} attached for ${inv.milestone.toLowerCase()}: ${money(balanceDue(inv) || inv.amount)}, due ${niceDate(inv.due, 'long')}.`,
        '',
        `Please use ${inv.number} as the payment reference.${pay}`,
      ]);
    case 'reminder': {
      if (!inv) return done(`Payment reminder`, ['A quick reminder about the open invoice.' + pay]);
      const late = Math.max(0, Math.round((new Date(`${today()}T00:00:00`).getTime() - new Date(`${inv.due}T00:00:00`).getTime()) / 86400000));
      const firm = late > 14;
      return done(firm ? `Overdue: invoice ${inv.number}` : `Friendly reminder: invoice ${inv.number}`, firm ? [
        `Invoice ${inv.number} (${money(balanceDue(inv))}) is now ${late} days overdue. Could you let me know when it will be paid?`,
        '',
        'If something has come up, reply and we can agree a plan. Work may need to pause until it is settled.' + pay,
      ] : [
        `A friendly reminder that invoice ${inv.number} for ${money(balanceDue(inv))} was due on ${niceDate(inv.due, 'long')}. If it's already on its way, thank you and please ignore this.` + pay,
      ]);
    }
    case 'report': {
      const m = ctx.month ?? (r ? retainerMonths(q).filter((x) => x.end < today()).pop() : undefined);
      if (!m) return done(`Your monthly support report`, ['Your support report for this month is attached.']);
      const tasks = m.entries.filter((e) => !e.emergency).slice(-4).map((e) => `• ${e.task}`);
      const near = m.available && m.used / m.available >= 0.9;
      const up = r ? nextPackage(r.pkg) : null;
      return done(`Your support report: ${m.label}`, [
        `Here's your support report for ${m.label}, attached. We used ${hoursText(m.used)} of ${hoursText(m.available)} hours.`,
        ...(tasks.length ? ['', 'Highlights:', ...tasks] : []),
        ...(m.over ? ['', `We went ${hoursText(m.over)} hours over, as agreed during the month. Those are on the next invoice.`] : []),
        ...(near && up ? ['', `You're regularly using most of your hours. If that continues, ${up.name} (${up.daily ? `${up.daily} hours a day` : `${up.hours} hours a month`}) might suit you better. Happy to talk it through.`] : []),
        '', 'Anything you\'d like me to focus on next month? Just reply.',
      ]);
    }
    case 'upgrade': {
      const up = r ? nextPackage(r.pkg) : null;
      const price = up && ctx.prices?.[up.id];
      return done(`Getting more done each month`, [
        `Over the last couple of months we've needed more than your plan's hours, which tells me there's more you'd like done.`,
        '',
        up ? `Moving to ${up.name} gives you ${up.daily ? `a dedicated developer ${up.daily} hours a day` : `${up.hours} hours a month`}${price ? ` for ${money(price)} a month` : ''}, so we can keep up without extra-hours invoices.` : 'We could increase your monthly hours so we can keep up without extra-hours invoices.',
        '', 'Want me to switch it from next month? Just reply.',
      ]);
    }
    case 'checkin':
      return done(`Making the most of your support hours`, [
        `I noticed we haven't used many of your support hours recently. Is there anything you'd like improved, fixed or added?`,
        '',
        'If you\'re not sure, I can suggest a few quick wins for speed, conversions or SEO. Or if a smaller plan suits you better for now, we can change that too.',
      ]);
    case 'yearly': {
      if (!r) return done('Yearly support', ['Paying yearly in advance gets 2 months free.']);
      const plan = retainerPlan(q);
      const free = Math.max(0, Math.min(11, Math.round(r.freeMonths) || 2));
      return done(`2 months free on your support plan`, [
        `A quick idea: if you pay for the year in advance, you get ${free} months free. That's ${money(yearlyPrice(plan.fee, free))} for 12 months instead of ${money(plan.fee * 12)}.`,
        '', 'Everything else stays the same. Want me to send the yearly invoice?',
      ]);
    }
    case 'launch': {
      const end = warrantyEnd(q);
      const basic = ctx.prices?.basic;
      return done(`We're live: ${title}`, [
        `${title} is live${q.delivery.liveUrl ? ` at ${q.delivery.liveUrl}` : ''}. Thank you for working with me on it.`,
        '',
        end ? `Any bugs in the work I delivered are fixed free until ${niceDate(end, 'long')}. Just send a short description and a screenshot.` : 'Any bugs in the work I delivered are fixed free during the bug-fix period.',
        '',
        `After that, a monthly support plan keeps the site updated and improving${basic ? `, from ${money(basic)} a month` : ''}. Medium is the most popular. Happy to send the details.`,
      ]);
    }
    case 'testimonial':
      return done(`A small favour?`, [
        `It was great working with you on ${title}. Would you be happy to share a few words about it? It really helps other businesses decide.`,
        '',
        'A short phone video (under a minute) is perfect, or two or three lines by email. These questions might help:',
        '• What was the problem before we started?',
        '• What was it like working together?',
        '• What has changed since launch?',
        '',
        'If you write a few lines, I\'ll tidy them up and send them back for your OK before anything goes on my website.',
      ]);
  }
}

/* ---------- This month: what needs doing ---------- */
export type TaskTone = 'warn' | 'info' | 'good';
export interface Task { id: string; quoteId: string; client: string; title: string; detail: string; tone: TaskTone; email?: EmailKind; invoiceId?: string; monthStart?: string; sort: number }

const days = (from: string, to: string) => Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000);
const isBilled = (q: QuoteState, start: string) => q.invoices.some((i) => i.period === start || i.periods?.includes(start));

/** Everything that needs doing across all quotes, most urgent first. */
export function monthTasks(quotes: QuoteState[], now = today()): Task[] {
  const tasks: Task[] = [];
  for (const q of quotes) {
    const client = q.client.company || q.client.name || q.meta.number;
    const add = (t: Omit<Task, 'quoteId' | 'client'>) => tasks.push({ ...t, quoteId: q.id, client });
    // Overdue invoices
    for (const inv of q.invoices) {
      if (balanceDue(inv) <= 0 || inv.due >= now) continue;
      const late = days(inv.due, now);
      add({ id: `overdue-${inv.id}`, title: `Chase ${inv.number}: ${formatMoney(balanceDue(inv), inv.currency)}`, detail: `${late} day${late === 1 ? '' : 's'} overdue`, tone: 'warn', email: 'reminder', invoiceId: inv.id, sort: 0 });
    }
    // Quotes waiting on the client
    if (q.status === 'sent') {
      if (q.followUp && q.followUp <= now) add({ id: `follow-${q.id}`, title: 'Follow up on the quote', detail: `${q.meta.number} · follow-up was due ${niceDate(q.followUp)}`, tone: 'warn', email: 'followup', sort: 1 });
      const v = validUntil(q);
      if (v >= now && v <= addDays(now, 7)) add({ id: `expire-${q.id}`, title: 'Quote expires soon', detail: `${q.meta.number} · valid until ${niceDate(v)}`, tone: 'info', email: 'followup', sort: 2 });
    }
    const r = q.retainer;
    if (r && q.monthly && q.status === 'accepted' && !(r.endedOn && r.endedOn < now)) {
      const months = retainerMonths(q, addDays(now, 7));
      // Invoices to create: monthly ones up to a week ahead; yearly when the next uncovered month is close.
      if (r.billing === 'yearly') {
        const next = months.find((m) => !isBilled(q, m.start));
        if (next) add({ id: `yearly-${q.id}-${next.start}`, title: 'Create the yearly invoice', detail: `Covers 12 months from ${niceDate(next.start)}`, tone: 'warn', email: 'invoice', monthStart: next.start, sort: 1 });
      } else {
        const due = months.filter((m) => !isBilled(q, m.start) && m.start <= addDays(now, 7));
        // Several missing months (a retainer started in the past) make one task, not one each.
        if (due.length > 1) add({ id: `inv-${q.id}-many`, title: `Create ${due.length} missing invoices`, detail: `Months from ${niceDate(due[0].start)}, oldest first`, tone: 'warn', email: 'invoice', monthStart: due[0].start, sort: 1 });
        else for (const m of due) add({ id: `inv-${q.id}-${m.start}`, title: `Create the invoice for ${m.label}`, detail: m.start > now ? `Month starts ${niceDate(m.start)}` : 'Month already started', tone: m.start <= now ? 'warn' : 'info', email: 'invoice', monthStart: m.start, sort: 1 });
      }
      // Reports for months that just ended
      const ended = months.filter((m) => m.end < now);
      const last = ended[ended.length - 1];
      if (last && days(last.end, now) <= 10) add({ id: `report-${q.id}-${last.start}`, title: `Send the ${last.label} report`, detail: `${hoursText(last.used)} of ${hoursText(last.available)} hrs used`, tone: 'info', email: 'report', monthStart: last.start, sort: 3 });
      // Upsell: over the hours two months running. Check in: under 40% two months running.
      const [a, b] = ended.slice(-2);
      if (a && b && a.over > 0 && b.over > 0) {
        const up = nextPackage(r.pkg);
        if (up) add({ id: `upsell-${q.id}`, title: `Suggest ${up.name}`, detail: `Over their hours in ${a.label} and ${b.label}`, tone: 'good', email: 'upgrade', sort: 4 });
      }
      if (a && b && a.available && b.available && a.used / a.available < 0.4 && b.used / b.available < 0.4) add({ id: `checkin-${q.id}`, title: 'Check in: hours unused', detail: `Used ${Math.round((a.used / a.available) * 100)}% and ${Math.round((b.used / b.available) * 100)}% of their hours`, tone: 'warn', email: 'checkin', sort: 4 });
    }
    // Projects after launch: ask for a testimonial (two weeks in) until it's in.
    if (!q.monthly && q.delivery.launchedOn && q.delivery.testimonial === 'none' && days(q.delivery.launchedOn, now) >= 14) {
      add({ id: `testimonial-${q.id}`, title: 'Ask for a testimonial', detail: `Launched ${niceDate(q.delivery.launchedOn)}`, tone: 'good', email: 'testimonial', sort: 5 });
    }
    if (!q.monthly && q.delivery.testimonial === 'asked' && q.delivery.testimonialAsked && days(q.delivery.testimonialAsked, now) >= 10) {
      add({ id: `testimonial-nudge-${q.id}`, title: 'Nudge for the testimonial', detail: `Asked ${niceDate(q.delivery.testimonialAsked)}`, tone: 'info', email: 'testimonial', sort: 6 });
    }
  }
  return tasks.sort((x, y) => x.sort - y.sort);
}

/* ---------- Capacity ---------- */
export interface Commitment { quoteId: string; client: string; kind: 'Retainer' | 'Project'; hours: number }
/** Your hours committed this month: active retainers' hours, and active projects' hours spread over their timeline. */
export function commitments(quotes: QuoteState[], now = today()): Commitment[] {
  const out: Commitment[] = [];
  for (const q of quotes) {
    if (q.status !== 'accepted') continue;
    const client = q.client.company || q.client.name || q.meta.number;
    const r = q.retainer;
    if (r && q.monthly) {
      if (r.endedOn && r.endedOn < now) continue;
      const m = monthFor(q, now);
      const hours = m ? m.included : r.start <= addMonths(now, 1) ? retainerPlan(q).hours : 0;
      if (hours) out.push({ quoteId: q.id, client, kind: 'Retainer', hours });
      continue;
    }
    // A project counts from kick-off until launch.
    if (!q.delivery.kickoff || q.delivery.kickoff > addDays(now, 30) || q.delivery.launchedOn) continue;
    const o = billedOption(q);
    const plan = optionPlan(q.answers, o);
    const weeks = plan ? (plan.low + plan.high) / 2 : 0;
    if (!weeks) continue;
    out.push({ quoteId: q.id, client, kind: 'Project', hours: Math.round((margin(q, o).yourHours / weeks) * 4.33) });
  }
  return out.sort((a, b) => b.hours - a.hours);
}

/* ---------- Income ---------- */
export interface IncomeMonth { key: string; label: string; invoiced: number; paid: number }
/** The last 12 months: invoiced (by issue date) and paid (by payment date), plus recurring income and an estimate after helpers. */
export function income(quotes: QuoteState[], now = today()) {
  const months: IncomeMonth[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(`${now.slice(0, 7)}-01T00:00:00`);
    d.setMonth(d.getMonth() - i);
    const key = d.toLocaleDateString('en-CA').slice(0, 7);
    months.push({ key, label: d.toLocaleDateString('en-GB', { month: 'short' }), invoiced: 0, paid: 0 });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  let paidYear = 0;
  let keptYear = 0;
  const year = now.slice(0, 4);
  for (const q of quotes) {
    // Share of each payment you keep after paying extra developers and passing on costs.
    const o = billedOption(q);
    const m = margin(q, o);
    const keep = m.revenue > 0 ? Math.max(0, Math.min(1, m.yourTake / m.revenue)) : 1;
    for (const inv of q.invoices) {
      const im = byKey.get(inv.issued.slice(0, 7));
      if (im) im.invoiced += inv.amount;
      for (const p of inv.payments) {
        const pm = byKey.get(p.date.slice(0, 7));
        if (pm) pm.paid += p.amount;
        if (p.date.startsWith(year)) { paidYear += p.amount; keptYear += p.amount * keep; }
      }
    }
  }
  const recurring = quotes.filter((q) => q.retainer && q.monthly && q.status === 'accepted' && q.retainer.start <= addMonths(now, 1) && !(q.retainer.endedOn && q.retainer.endedOn < now)).reduce((t, q) => t + optionTotals(q, billedOption(q)).total, 0);
  return { months, recurring, paidYear, keptYear };
}

