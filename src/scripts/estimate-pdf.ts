// Builds the downloadable estimate summary. Loaded only when someone presses "Download summary (PDF)".
import { jsPDF } from 'jspdf';
import type { Answers, Estimate } from '../data/estimator';
import { encodePayload } from '../data/payload';
import { PACKAGES, RETAINER_EXCLUDED, RETAINER_INCLUDED, packageIncluded } from '../data/quote-model';
import { ARCHIVO_400, ARCHIVO_600, BIG_SHOULDERS_800 } from './pdf-fonts';

interface PdfInput {
  rows: [string, string][];
  result: Estimate;
  months: string;
  notes: string;
  email: string;
  /** The client's raw answers, stored in the PDF so the quote page can import them. */
  answers: Answers;
  /** The estimate's reference (the same one used when the brief is sent). */
  ref?: string;
  /** The client's details from the review step, if they typed them. */
  contact?: { name: string; email: string; company: string; website: string };
}

const INK: [number, number, number] = [22, 22, 22];
const MUTED: [number, number, number] = [110, 110, 110];
const LINE: [number, number, number] = [214, 214, 214];
const WARN: [number, number, number] = [196, 32, 38];
const WARN_INK: [number, number, number] = [112, 22, 24];
const WARN_BG: [number, number, number] = [252, 241, 240];
// Phase colours, matching the site (project-card canvases).
const PHASE_COLORS: Record<string, [number, number, number]> = {
  discovery: [197, 207, 220],
  design: [238, 224, 222],
  build: [22, 22, 22],
  data: [205, 200, 232],
  content: [227, 218, 205],
  qa: [189, 192, 170],
};
const PHASE_TEXT: Record<string, string> = {
  discovery: 'Kick-off call, goals, sitemap and a technical plan. Access to your accounts, apps and assets is set up.',
  design: 'Page designs are prepared with a designer and approved before any building starts.',
  build: 'Development of the theme or site: responsive layouts, features and integrations, with regular previews for your feedback.',
  data: 'Products, customers, orders and content are moved, checked and redirected so nothing is lost and rankings are protected.',
  content: 'Your text, images and product details are prepared and loaded. This is often the step that decides the launch date.',
  qa: 'Testing across devices and browsers, speed and SEO checks, then go-live and a handover walkthrough.',
};
const AUDIT_TEXT: Record<string, string> = {
  discovery: 'A review of speed, SEO and code to find what actually matters.',
  build: 'The agreed improvements, implemented and measured against the starting point.',
  qa: 'A final check that everything works, plus a short summary of what changed.',
};

// Standard PDF fonts only cover basic Latin, so swap characters they can't draw.
const clean = (text: string) => text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/→/g, '->').replace(/(\d)½/g, '$1.5').replace(/½/g, '0.5').replace(/[^\x20-\x7E–—…· -ÿ]/g, '');

export async function downloadEstimatePdf(input: PdfInput) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  // The same brand fonts as the quote builder's documents.
  doc.addFileToVFS('Archivo-400.ttf', ARCHIVO_400); doc.addFont('Archivo-400.ttf', 'Archivo', 'normal');
  doc.addFileToVFS('Archivo-600.ttf', ARCHIVO_600); doc.addFont('Archivo-600.ttf', 'Archivo', 'bold');
  doc.addFileToVFS('BigShoulders-800.ttf', BIG_SHOULDERS_800); doc.addFont('BigShoulders-800.ttf', 'Display', 'normal');
  const W = 210;
  const H = 297;
  const M = 18;
  const CW = W - M * 2;
  let y = M;
  const today = new Date();
  const date = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const localDate = today.toLocaleDateString('en-CA');
  const ref = input.ref || `EST-${localDate.replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const contact = input.contact && (input.contact.name || input.contact.email) ? input.contact : undefined;

  const color = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  /** Archivo for text; Big Shoulders ('display') for the name and the big figure. */
  const font = (size: number, style: 'normal' | 'bold' | 'display' = 'normal') => { if (style === 'display') doc.setFont('Display', 'normal'); else doc.setFont('Archivo', style); doc.setFontSize(size); };
  const ensure = (h: number) => { if (y + h > H - 22) { doc.addPage(); y = M; } };
  const rule = (yy: number, dots = false) => {
    doc.setDrawColor(...(dots ? INK : LINE));
    doc.setLineWidth(dots ? 0.3 : 0.2);
    doc.line(M, yy, W - M, yy);
    if (dots) { doc.setFillColor(...INK); doc.circle(M, yy, 0.9, 'F'); doc.circle(W - M, yy, 0.9, 'F'); }
  };
  const paragraph = (text: string, size = 9.5, c = INK, width = CW, x = M, gap = 1.6) => {
    font(size); color(c);
    const lines = doc.splitTextToSize(clean(text), width) as string[];
    const lh = size * 0.42;
    ensure(lines.length * lh + gap);
    doc.text(lines, x, y + lh * 0.8);
    y += lines.length * lh + gap;
  };
  let sectionNo = 0;
  const heading = (title: string) => {
    sectionNo += 1;
    const n = String(sectionNo).padStart(2, '0');
    ensure(16);
    y += 6;
    // A numbered ink tab, as on the quote builder's documents.
    doc.setFillColor(...INK); doc.roundedRect(M, y - 4.1, 8, 5.4, 1.2, 1.2, 'F');
    font(10, 'display'); doc.setTextColor(255, 255, 255); doc.text(n, M + 4, y - 0.1, { align: 'center' });
    font(12.5, 'bold'); color(INK);
    doc.text(clean(title), M + 11, y);
    y += 3.5;
    rule(y);
    y += 5;
  };
  const bullets = (items: string[]) => {
    for (const item of items) {
      font(9.5); color(INK);
      const lines = doc.splitTextToSize(clean(item), CW - 7) as string[];
      ensure(lines.length * 4 + 1.5);
      doc.setFillColor(...INK);
      doc.circle(M + 1.2, y + 2.4, 0.7, 'F');
      doc.text(lines, M + 5, y + 3.3);
      y += lines.length * 4 + 1.8;
    }
  };

  // Header
  font(26, 'display'); color(INK);
  doc.text('GRANT DEV14', M, y + 7);
  font(8.5); color(MUTED);
  doc.text('Shopify, Webflow & WordPress developer', M, y + 12.5);
  font(10, 'bold'); color(INK);
  doc.text('Project estimate summary', W - M, y + 5, { align: 'right' });
  font(8.5); color(MUTED);
  doc.text(`${date}  ·  Ref ${ref}`, W - M, y + 10, { align: 'right' });
  // Red "not a quotation" label, so it's clear even at a glance.
  font(7.5, 'bold');
  const stamp = 'NOT A QUOTATION';
  const stampW = doc.getTextWidth(stamp) + 6;
  doc.setDrawColor(...WARN); doc.setLineWidth(0.4);
  doc.roundedRect(W - M - stampW, y + 12.5, stampW, 5.2, 1.2, 1.2, 'S');
  color(WARN);
  doc.text(stamp, W - M - stampW / 2, y + 16.1, { align: 'center' });
  y += 21;
  rule(y, true);
  y += 7;

  // Not-a-quote notice
  const notice = 'This summary was created automatically from your answers in the project estimator. It is an indicative timeline to help you plan. It is not a quotation, proposal or contract, and it does not include pricing. Final scope, timeline and cost are agreed in a written proposal after a short call with Grant.';
  font(9.5);
  const noticeLines = doc.splitTextToSize(clean(notice), CW - 18) as string[];
  const boxH = noticeLines.length * 4 + 14;
  doc.setFillColor(...WARN_BG);
  doc.roundedRect(M, y, CW, boxH, 3, 3, 'F');
  // Warning triangle with an exclamation mark.
  doc.setFillColor(...WARN);
  doc.triangle(M + 8, y + 3.6, M + 11.6, y + 9.6, M + 4.4, y + 9.6, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(M + 7.6, y + 5.4, 0.8, 2.3, 'F');
  doc.circle(M + 8, y + 8.5, 0.45, 'F');
  font(10.5, 'bold'); color(WARN);
  doc.text('IMPORTANT: THIS IS NOT A QUOTATION', M + 14, y + 8.2);
  font(9.5); color(WARN_INK);
  doc.text(noticeLines, M + 14, y + 13.8);
  y += boxH + 3;

  // 01 Your project (with the client's details first, when given)
  heading('Your project');
  const contactRows: [string, string][] = contact ? ([['Name', contact.name], ['Company', contact.company], ['Email', contact.email], ['Website', contact.website]] as [string, string][]).filter(([, v]) => v) : [];
  for (const [label, value] of [...contactRows, ...input.rows]) {
    font(9.5);
    const lines = doc.splitTextToSize(clean(value), CW - 48) as string[];
    ensure(lines.length * 4 + 3);
    color(MUTED); doc.text(clean(label), M, y + 3.3);
    color(INK); doc.text(lines, M + 48, y + 3.3);
    y += lines.length * 4 + 2;
    doc.setDrawColor(...LINE); doc.setLineWidth(0.1); doc.line(M, y, W - M, y);
    y += 2;
  }

  // 02 Estimate
  const r = input.result;
  heading(r.mode === 'monthly' ? 'Ongoing support' : 'Estimated timeline');
  ensure(26);
  font(34, 'display'); color(INK);
  const plan = r.support;
  const big = r.mode === 'monthly' && plan ? `${plan.name} · ${plan.daily ? `${plan.daily} hours a day` : `${plan.hours} hours / month`}` : `${r.low}–${r.high} weeks`;
  doc.text(clean(big), M, y + 11);
  if (input.months) { font(11); color(MUTED); doc.text(clean(input.months), M, y + 18); }
  y += input.months ? 23 : 16;
  if (r.mode === 'monthly') {
    paragraph(plan?.daily
      ? 'A dedicated developer for 8 hours every working day, Monday to Friday, with weekend emergencies included. Billed monthly, with the price confirmed in a short proposal.'
      : `A set number of hours each month for updates, fixes and improvements${plan?.recommended ? ' (Medium is a good place to start; Grant will confirm the right plan with you)' : ''}. You can move up or down a plan with a month’s notice.`);
    if (plan) paragraph(`${plan.reply}.`, 9.5, MUTED);
  } else {
    if (r.scenario) {
      font(10.5, 'bold'); color(INK);
      ensure(7); doc.text(clean(r.scenario), M, y + 3.5); y += 6.5;
      if (r.baseline && (r.baseline.low !== r.low || r.baseline.high !== r.high)) { font(9.5); color(MUTED); doc.text(clean(`One developer, ${r.choice === 'theme' ? 'custom design' : 'full scope'}: ${r.baseline.low}–${r.baseline.high} weeks`), M, y + 3); y += 6.5; }
    }
    const who = r.team > 1 ? `a team of ${r.team} developers working in parallel` : 'one developer';
    const what = r.scenario?.startsWith('Phase 1') ? 'Calendar time from kick-off to launching the essentials (phase 1)' : 'Calendar time from kick-off to launch';
    paragraph(`${what} for ${who}, assuming feedback from you within about two business days.`, 9.5, MUTED);
    // Phase bar
    const total = r.phases.reduce((s, p) => s + p.weeks, 0) || 1;
    ensure(10);
    let x = M;
    const gap = 0.8;
    const usable = CW - gap * (r.phases.length - 1);
    for (const p of r.phases) {
      const w = (p.weeks / total) * usable;
      doc.setFillColor(...(PHASE_COLORS[p.id] ?? INK));
      doc.roundedRect(x, y, Math.max(w, 1.5), 4.5, 1.2, 1.2, 'F');
      x += w + gap;
    }
    y += 9;
    // Phase table
    const isAudit = r.phases.some((p) => p.label === 'Audit');
    for (const p of r.phases) {
      const text = (isAudit ? AUDIT_TEXT[p.id] : undefined) ?? PHASE_TEXT[p.id] ?? '';
      font(9.5);
      const lines = doc.splitTextToSize(clean(text), CW - 62) as string[];
      ensure(lines.length * 4 + 4);
      doc.setFillColor(...(PHASE_COLORS[p.id] ?? INK));
      doc.roundedRect(M, y + 0.8, 3, 3, 0.8, 0.8, 'F');
      font(9.5, 'bold'); color(INK); doc.text(clean(p.label), M + 6, y + 3.3);
      font(9.5); color(MUTED); doc.text(`~${p.display}`, M + 40, y + 3.3);
      color(INK); doc.text(lines, M + 62, y + 3.3);
      y += lines.length * 4 + 2.5;
      doc.setDrawColor(...LINE); doc.setLineWidth(0.1); doc.line(M, y, W - M, y);
      y += 2;
    }
  }

  // Your launch date: the same verdict shown under the date options on the site.
  if (r.mode === 'weeks' && r.verdict) {
    heading('Your launch date');
    const tone = { yes: { bg: [234, 246, 237], fg: [30, 105, 58] }, maybe: { bg: [253, 244, 224], fg: [132, 86, 10] }, no: { bg: WARN_BG, fg: WARN } }[r.verdict.tone] as { bg: [number, number, number]; fg: [number, number, number] };
    font(9.5);
    const lines = doc.splitTextToSize(clean(r.verdict.text), CW - 12) as string[];
    const h = lines.length * 4 + 12;
    ensure(h + 2);
    doc.setFillColor(...tone.bg);
    doc.roundedRect(M, y, CW, h, 3, 3, 'F');
    font(10.5, 'bold'); color(tone.fg); doc.text(clean(r.verdict.title), M + 6, y + 7);
    font(9.5); color(r.verdict.tone === 'no' ? WARN_INK : INK); doc.text(lines, M + 6, y + 12.2);
    y += h + 3;
  }

  // Ways to launch sooner: every realistic route, how long it takes and how it lands against the date.
  if (r.mode === 'weeks') {
    heading('Ways to launch sooner');
    if (r.routes.length < 2) {
      paragraph('For a project this size, one developer is usually the fastest and most cost-effective option. Adding people would mostly add coordination time.');
    } else {
      paragraph('The standard estimate assumes one developer. To launch sooner, the work can be split across 2–3 developers working in parallel, the first launch can focus on the essentials, or both. Faster routes cost more: more people work at the same time, and extra time goes into coordination, code reviews and testing.');
      const fitText = { fits: 'Fits your date', close: 'A little past it', far: 'Too long' } as Record<string, string>;
      const chosen = (id: string) => (id === 'standard' ? r.choice === 'move' || r.choice === 'keep' || r.choice === 'holding' : r.choice === id);
      const rows = r.routes.map((x) => [x.label, `${x.low}–${x.high} weeks`, x.cost, x.fit ? fitText[x.fit] : '', chosen(x.id)] as [string, string, string, string, boolean]);
      // Column headers
      font(8, 'bold'); color(MUTED);
      ensure(8);
      doc.text('ROUTE', M, y + 3); doc.text('TIMELINE', M + 62, y + 3); doc.text('COST', M + 92, y + 3); if (r.routes.some((x) => x.fit)) doc.text('VS YOUR DATE', M + 134, y + 3);
      y += 5.5;
      for (const [label, time, cost, fit, isChosen] of rows) {
        ensure(8);
        if (isChosen) { doc.setFillColor(244, 244, 244); doc.rect(M, y - 1, CW, 6.6, 'F'); }
        font(9.5, 'bold'); color(INK); doc.text(clean(label + (isChosen ? '  (your choice)' : '')), M + (isChosen ? 1.5 : 0), y + 3.3);
        font(9.5); doc.text(clean(time), M + 62, y + 3.3);
        color(MUTED); doc.text(clean(cost), M + 92, y + 3.3);
        if (fit) { const c: [number, number, number] = fit === 'Fits your date' ? [30, 105, 58] : fit === 'Too long' ? WARN : [132, 86, 10]; color(c); doc.text(clean(fit), M + 134, y + 3.3); }
        y += 5.5;
        doc.setDrawColor(...LINE); doc.setLineWidth(0.1); doc.line(M, y, W - M, y);
        y += 2;
      }
      y += 1;
      paragraph('Some steps don’t get faster with more people: your feedback and approvals, preparing content, and waiting on third parties. Timings are approximate, and the exact team, scope and cost are set out in the proposal.', 9, MUTED);
    }
  }

  // Drivers
  if (r.drivers.length) {
    heading('What’s driving the time');
    for (const d of r.drivers) {
      ensure(7);
      font(9.5); color(INK); doc.text(clean(d.label), M, y + 3.3);
      color(MUTED); doc.text(`+${Math.round(d.weeks * 10) / 10} wk`, W - M, y + 3.3, { align: 'right' });
      y += 6;
    }
  }

  // 04 Notes & recommendations (support plans say all of this in their own sections below)
  if (r.notes.length && r.mode !== 'monthly') {
    heading('Notes & recommendations');
    bullets(r.notes);
  }

  // Support: what the plan includes and how it works, instead of the project assumptions.
  if (r.mode === 'monthly') {
    const pkg = PACKAGES.find((p) => p.id === plan?.id && p.id !== 'custom');
    heading('What the plan includes');
    bullets(pkg ? packageIncluded(pkg) : RETAINER_INCLUDED);
    heading('Not included');
    bullets([...(pkg ? pkg.cant : RETAINER_EXCLUDED), 'Pricing. The monthly price is confirmed in a short proposal.']);
    heading('How support works');
    bullets([
      'Billed monthly in advance. Paying yearly in advance gets 2 months free.',
      'Unused hours don’t roll over to the next month. An hour bank that keeps them for 3 months is available.',
      'You hear when about 80% of the month’s hours are used. Extra hours are only worked after you approve them.',
      'A short report every month: what was done and the hours used.',
      'Minimum term of 3 months, then month to month, with 30 days’ notice to end it.',
    ]);
  } else {
  // 05 Assumptions
  heading('Assumptions behind this estimate');
  bullets([
    `${r.team > 1 ? `A team of ${r.team} developers works` : 'One developer works'} on your project, and you can give feedback within about two business days.`,
    ...(r.team > 1 ? [`The extra developer${r.team > 2 ? 's are' : ' is'} available from kick-off, working alongside Grant.`] : []),
    ...(r.scenario?.startsWith('Phase 1') || r.choice === 'priority' ? ['The first phase covers the essentials agreed on the call. The remaining scope follows in a second phase after launch.'] : []),
    ...(r.choice === 'theme' ? ['A suitable premium theme is chosen together, then customised to match your brand.'] : []),
    'Designs, content and account access are ready when needed, unless you said otherwise above.',
    'Third-party apps, APIs and platforms work as documented.',
    'The scope stays as described here. Changes are welcome, and are discussed first because they can affect the timeline.',
    'Timings are calendar weeks from kick-off to launch, not hours of work.',
  ]);

  // 06 Not included
  heading('Not included in this estimate');
  bullets([
    r.team > 1 ? 'Pricing, including the cost of the extra developers. This is confirmed in a written proposal.' : 'Pricing. Cost is confirmed in a written proposal.',
    ...(r.choice === 'holding' ? ['The launch page itself is a small, separate piece of work, quoted in the proposal.'] : []),
    'Platform plans, app subscriptions, theme licences, domains and hosting fees.',
    'Copywriting, photography and design work, unless a design phase is shown above.',
    'Support after launch. This is available separately as a monthly retainer.',
  ]);
  }

  // Next steps: kept together on one page.
  ensure(62);
  heading('Next steps');
  const nextSteps = [
    ['Send this summary', `Email it to Grant at ${input.email}, or reply to any of Grant’s messages.`],
    ['Short call', 'A quick chat to go through your goals, details and any questions.'],
    ...(r.mode === 'monthly'
      ? [['Short proposal', 'The plan, start date and monthly price.'], ['Support starts', 'Once the first payment is received, requests can start straight away.']]
      : [['Written proposal', 'A clear proposal with fixed scope, timeline and price.'], ['Kick-off', 'Once you are happy with the proposal, the project starts.']]),
  ];
  nextSteps.forEach(([title, text], i) => {
    ensure(10);
    font(16, 'bold'); color(INK); doc.text(String(i + 1).padStart(2, '0'), M, y + 5.5);
    font(10, 'bold'); doc.text(clean(title), M + 12, y + 3.2);
    font(9.5); color(MUTED); doc.text(doc.splitTextToSize(clean(text), CW - 12) as string[], M + 12, y + 7.6);
    y += 12;
  });

  if (input.notes) {
    heading('Your notes');
    paragraph(input.notes);
  }

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE); doc.setLineWidth(0.2);
    doc.line(M, H - 14, W - M, H - 14);
    font(7.5); color(MUTED);
    doc.text(clean(`Grant Dev14  ·  ${input.email}  ·  Indicative estimate, not a quotation`), M, H - 9);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 9, { align: 'right' });
  }

  doc.setProperties({ title: 'Project estimate summary — Grant Dev14', subject: 'Indicative project timeline (not a quotation)', author: 'Grant Dev14', keywords: encodePayload({ v: 1, ref, date: localDate, answers: input.answers, ...(contact ? { client: contact } : {}) }) });
  doc.save(`grant-dev14-project-estimate-${localDate}.pdf`);
}
