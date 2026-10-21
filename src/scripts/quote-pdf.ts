// Quotation and invoice PDFs for the quote builder. Loaded only when a PDF is downloaded or previewed.
import { jsPDF } from 'jspdf';
import { formatMoney, phaseTotals, scopeRows, type QuoteLine } from '../data/pricing';
import { billedOption, niceDate, optionKind, optionPlan, optionTimeline, optionTotals, optionWeeks, validUntil, type Invoice, type Profile, type QuoteOption, type QuoteState } from '../data/quote-model';

type RGB = [number, number, number];
const INK: RGB = [22, 22, 22];
const MUTED: RGB = [110, 110, 110];
const LINE: RGB = [214, 214, 214];
const SURFACE: RGB = [245, 245, 245];
const GREEN: RGB = [30, 105, 58];
const PHASE_COLORS: Record<string, RGB> = {
  discovery: [196, 205, 218], design: [238, 224, 222], build: [22, 22, 22], data: [205, 200, 232], content: [227, 218, 205], qa: [189, 192, 170],
};
const W = 210;
const H = 297;
const M = 18;
const CW = W - M * 2;

// Standard PDF fonts only cover basic Latin, so swap characters they can't draw.
const clean = (text: string) => text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/→/g, '->').replace(/−/g, '-').replace(/(\d)½/g, '$1.5').replace(/½/g, '0.5').replace(/[^\x20-\x7E–—…· -ÿ]/g, '');
const listOf = (text: string) => text.split(/\r?\n/).map((l) => l.trim().replace(/^[-•*]\s*/, '')).filter(Boolean);
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client';

/** Shared page furniture: fonts, headings, bullets, header and footer. */
function makeDoc(profile: Profile) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const s = { y: M };
  const color = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (size: number, style: 'normal' | 'bold' = 'normal') => { doc.setFont('helvetica', style); doc.setFontSize(size); };
  const ensure = (h: number) => { if (s.y + h > H - 22) { doc.addPage(); s.y = M; } };
  const hr = (yy: number, c = LINE, w = 0.15) => { doc.setDrawColor(...c); doc.setLineWidth(w); doc.line(M, yy, W - M, yy); };
  const paragraph = (text: string, size = 9.5, c = INK, width = CW, x = M) => {
    font(size); color(c);
    const lines = doc.splitTextToSize(clean(text), width) as string[];
    const lh = size * 0.42;
    ensure(lines.length * lh + 1.6);
    doc.text(lines, x, s.y + lh * 0.8);
    s.y += lines.length * lh + 1.6;
  };
  let sectionNo = 0;
  const heading = (title: string, keep = 16) => {
    sectionNo += 1;
    ensure(keep);
    s.y += 6;
    font(8, 'bold'); color(MUTED); doc.text(String(sectionNo).padStart(2, '0'), M, s.y);
    font(13, 'bold'); color(INK); doc.text(clean(title), M + 9, s.y);
    s.y += 3.5; hr(s.y); s.y += 5;
  };
  const bullets = (items: string[]) => {
    for (const item of items) {
      font(9.5); color(INK);
      const lines = doc.splitTextToSize(clean(item), CW - 7) as string[];
      ensure(lines.length * 4 + 1.5);
      doc.setFillColor(...INK); doc.circle(M + 1.2, s.y + 2.4, 0.7, 'F');
      doc.text(lines, M + 5, s.y + 3.3);
      s.y += lines.length * 4 + 1.8;
    }
  };
  /** Logo (or name), document title on the right, dotted rule. */
  const header = (title: string, number: string) => {
    if (profile.logo) {
      const props = doc.getImageProperties(profile.logo);
      const h = 13;
      const w = Math.min(60, (props.width / props.height) * h);
      doc.addImage(profile.logo, 'PNG', M, s.y, w, (w / props.width) * props.height);
    } else {
      font(22, 'bold'); color(INK); doc.text(clean(profile.name.toUpperCase()), M, s.y + 7);
      font(8.5); color(MUTED); doc.text(clean(profile.tagline), M, s.y + 12.5);
    }
    font(20, 'bold'); color(INK); doc.text(title, W - M, s.y + 7, { align: 'right' });
    font(8.5); color(MUTED); doc.text(clean(`No. ${number}`), W - M, s.y + 12.5, { align: 'right' });
    s.y += 19;
    doc.setDrawColor(...INK); doc.setLineWidth(0.3); doc.line(M, s.y, W - M, s.y);
    doc.setFillColor(...INK); doc.circle(M, s.y, 0.9, 'F'); doc.circle(W - M, s.y, 0.9, 'F');
    s.y += 8;
  };
  /** Three columns of small blocks (e.g. Prepared for / by / Details). */
  const blocks = (cols: [string, string[]][]) => {
    const colW = (CW - 8) / 3;
    let end = s.y;
    cols.forEach(([title, rows], i) => {
      const x = M + i * (colW + 4);
      font(7.5, 'bold'); color(MUTED); doc.text(title.toUpperCase(), x, s.y);
      let yy = s.y + 5;
      rows.filter(Boolean).forEach((r, j) => { font(9.5, j === 0 ? 'bold' : 'normal'); color(j === 0 ? INK : MUTED); const ls = doc.splitTextToSize(clean(r), colW) as string[]; doc.text(ls, x, yy); yy += ls.length * 4.2; });
      end = Math.max(end, yy);
    });
    s.y = end + 2;
  };
  const footer = (right: string) => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      hr(H - 14, LINE, 0.2);
      font(7.5); color(MUTED);
      doc.text(clean([profile.name, profile.email, right].filter(Boolean).join('  ·  ')), M, H - 9);
      doc.text(`Page ${i} of ${pages}`, W - M, H - 9, { align: 'right' });
    }
  };
  const fromRows = () => [profile.name, profile.email, profile.phone, profile.website, ...profile.address.split(/\r?\n/), profile.taxId ? `Tax ID ${profile.taxId}` : ''];
  const payment = () => {
    const methods = listOf(profile.payment);
    if (!methods.length) return;
    heading('How to pay', 30);
    for (const m of methods) paragraph(m, 9.5, INK);
  };
  return { doc, s, color, font, ensure, hr, paragraph, heading, bullets, header, blocks, footer, fromRows, payment };
}

/* ---------- Quotation ---------- */

export async function buildQuotePdf(q: QuoteState, profile: Profile) {
  const P = makeDoc(profile);
  const { doc, s, color, font, ensure, hr, paragraph, heading, bullets } = P;
  const money = (n: number) => clean(formatMoney(n, q.settings.currency));
  const per = q.monthly ? ' / month' : '';
  const priced = q.options.filter((o) => o.lines.some((l) => !l.optional));
  const options = priced.length ? priced : q.options.slice(0, 1);
  const multi = options.length > 1;
  const timelineOf = (o: QuoteOption) => o.timeline || optionTimeline(q.answers, o);

  P.header('QUOTATION', q.meta.number);
  P.blocks([
    ['Prepared for', [q.client.company || q.client.name || 'Client', q.client.company && q.client.name ? q.client.name : '', q.client.email, q.client.website]],
    ['Prepared by', P.fromRows()],
    ['Details', [`Issued ${niceDate(q.meta.date, 'long')}`, `Valid until ${niceDate(validUntil(q), 'long')}`, q.meta.ref ? `Estimate ref ${q.meta.ref}` : '']],
  ]);

  // At a glance: one total, or the options side by side.
  if (!multi) {
    const o = options[0];
    ensure(24);
    doc.setFillColor(...SURFACE); doc.roundedRect(M, s.y, CW, 20, 3, 3, 'F');
    font(7.5, 'bold'); color(MUTED); doc.text(q.monthly ? 'MONTHLY TOTAL' : 'PROJECT TOTAL', M + 6, s.y + 7);
    font(20, 'bold'); color(INK); doc.text(`${money(optionTotals(q, o).total)}${per}`, M + 6, s.y + 15.5);
    font(7.5, 'bold'); color(MUTED); doc.text('TIMELINE', M + CW / 2, s.y + 7);
    font(10.5, 'bold'); color(INK); doc.text(doc.splitTextToSize(clean(timelineOf(o) || '-'), CW / 2 - 8) as string[], M + CW / 2, s.y + 13);
    s.y += 25;
  } else {
    const colW = (CW - (options.length - 1) * 4) / options.length;
    const h = 30;
    ensure(h + 4);
    options.forEach((o, i) => {
      const x = M + i * (colW + 4);
      const chosen = o.id === q.acceptedOption;
      doc.setFillColor(...(chosen ? INK : SURFACE)); doc.roundedRect(x, s.y, colW, h, 3, 3, 'F');
      const fg: RGB = chosen ? [255, 255, 255] : INK;
      font(7.5, 'bold'); color(chosen ? [200, 200, 200] : MUTED); doc.text(clean(o.name.toUpperCase() + (chosen ? '  ·  ACCEPTED' : '')), x + 5, s.y + 6.5);
      font(16, 'bold'); color(fg); doc.text(`${money(optionTotals(q, o).total)}${per}`, x + 5, s.y + 14);
      font(8.5); color(fg); doc.text(clean(optionKind(o)), x + 5, s.y + 20);
      color(chosen ? [200, 200, 200] : MUTED); doc.text(clean(`About ${optionWeeks(q.answers, o)} from kick-off`), x + 5, s.y + 24.5);
    });
    s.y += h + 5;
  }
  if (q.text.note.trim()) paragraph(q.text.note.trim(), 10, INK);

  // Project
  heading('Project');
  if (q.project.title) { font(12, 'bold'); color(INK); ensure(7); doc.text(clean(q.project.title), M, s.y + 4); s.y += 7.5; }
  if (q.project.summary) paragraph(q.project.summary, 9.5, MUTED);
  const rows = scopeRows(q.answers).filter(([label]) => label !== 'Notes' && label !== 'Hitting your date');
  if (rows.length) {
    s.y += 1;
    for (const [label, value] of rows) {
      font(9.5);
      const lines = doc.splitTextToSize(clean(value), CW - 48) as string[];
      ensure(lines.length * 4 + 3);
      color(MUTED); doc.text(clean(label), M, s.y + 3.3);
      color(INK); doc.text(lines, M + 48, s.y + 3.3);
      s.y += lines.length * 4 + 2;
      hr(s.y, LINE, 0.1); s.y += 2;
    }
  }

  // Timeline: a phase bar for a single option; one line per option otherwise.
  const plan = optionPlan(q.answers, options[0]);
  if (plan) {
    heading('Timeline', 40);
    if (multi) {
      for (const o of options) { font(9.5, 'bold'); color(INK); ensure(6); doc.text(clean(o.name), M, s.y + 3.3); font(9.5); doc.text(clean(`${optionWeeks(q.answers, o)} from kick-off  ·  ${optionKind(o)}`), M + 30, s.y + 3.3); s.y += 6; }
      paragraph('Calendar time from kick-off, assuming feedback within about two business days.', 9, MUTED);
    } else {
      paragraph(`${timelineOf(options[0])}. Calendar time assumes feedback within about two business days.`, 9.5, MUTED);
      const total = plan.phases.reduce((t, p) => t + p.weeks, 0) || 1;
      ensure(14);
      let x = M;
      const usable = CW - 0.8 * (plan.phases.length - 1);
      for (const p of plan.phases) { const w = (p.weeks / total) * usable; doc.setFillColor(...(PHASE_COLORS[p.id] ?? INK)); doc.roundedRect(x, s.y, Math.max(w, 1.5), 4.5, 1.2, 1.2, 'F'); x += w + 0.8; }
      s.y += 8;
      let lx = M;
      for (const p of plan.phases) {
        const label = clean(`${p.label} ~${p.display}`);
        font(8.5); const w = doc.getTextWidth(label) + 9;
        if (lx + w > W - M) { lx = M; s.y += 5.5; }
        doc.setFillColor(...(PHASE_COLORS[p.id] ?? INK)); doc.roundedRect(lx, s.y - 2.6, 3, 3, 0.8, 0.8, 'F');
        color(INK); doc.text(label, lx + 4.5, s.y);
        lx += w;
      }
      s.y += 4;
    }
  }

  // Pricing, per option, grouped by phase where the work is split.
  const cols = { item: M, qty: M + CW - 62, rate: M + CW - 38, amount: W - M };
  const qty = (l: QuoteLine) => { const n = Math.round(l.hours * 100) / 100; return (l.unit ?? 'hours') === 'fixed' ? `${n} x` : `${n} hrs`; };
  const tableHead = () => {
    font(7.5, 'bold'); color(MUTED);
    doc.text('ITEM', cols.item, s.y); doc.text(q.monthly ? 'HRS / MO' : 'QTY', cols.qty, s.y, { align: 'right' }); doc.text('RATE', cols.rate, s.y, { align: 'right' }); doc.text('AMOUNT', cols.amount, s.y, { align: 'right' });
    s.y += 2.5; hr(s.y, INK, 0.2); s.y += 2;
  };
  const lineRow = (l: QuoteLine) => {
    font(9.5, 'bold');
    const title = doc.splitTextToSize(clean(l.title), CW - 72) as string[];
    font(8.5);
    const detail = l.detail ? (doc.splitTextToSize(clean(l.detail), CW - 72) as string[]) : [];
    const h = title.length * 4.2 + detail.length * 3.7 + 3;
    ensure(h + 1);
    font(9.5, 'bold'); color(INK); doc.text(title, cols.item, s.y + 3.6);
    font(8.5); color(MUTED); if (detail.length) doc.text(detail, cols.item, s.y + 3.6 + title.length * 4.2);
    font(9.5); color(INK);
    doc.text(qty(l), cols.qty, s.y + 3.6, { align: 'right' });
    doc.text(money(l.rate), cols.rate, s.y + 3.6, { align: 'right' });
    font(9.5, 'bold'); doc.text(money(l.hours * l.rate), cols.amount, s.y + 3.6, { align: 'right' });
    s.y += h; hr(s.y, LINE, 0.1); s.y += 1.5;
  };
  const totalRow = (label: string, value: string, strong = false) => {
    ensure(8);
    font(strong ? 11 : 9.5, strong ? 'bold' : 'normal'); color(strong ? INK : MUTED);
    doc.text(clean(label), cols.rate, s.y + 4, { align: 'right' });
    color(INK); doc.text(value, cols.amount, s.y + 4, { align: 'right' });
    s.y += strong ? 8 : 6;
  };
  heading(multi ? 'Pricing by option' : 'Pricing', 70);
  options.forEach((o, i) => {
    if (multi) { ensure(30); if (i) s.y += 4; font(11, 'bold'); color(INK); doc.text(clean(`${o.name}: ${optionKind(o)}`), M, s.y + 3); s.y += 8; }
    tableHead();
    const billable = o.lines.filter((l) => !l.optional);
    const pt = phaseTotals(o.lines);
    if (pt.split) {
      for (const phase of [1, 2] as const) {
        ensure(14);
        font(8.5, 'bold'); color(MUTED); doc.text(phase === 1 ? 'PHASE 1  ·  LAUNCH WITH THE ESSENTIALS' : 'PHASE 2  ·  AFTER LAUNCH', M, s.y + 3.5); s.y += 6;
        billable.filter((l) => (l.phase ?? 1) === phase).forEach(lineRow);
        totalRow(`Phase ${phase} subtotal`, money(phase === 1 ? pt.one : pt.two));
      }
    } else {
      billable.forEach(lineRow);
    }
    const t = optionTotals(q, o);
    s.y += 1;
    totalRow('Subtotal', money(t.subtotal));
    if (t.discount) totalRow(`Discount${q.pricing.discountType === 'percent' ? ` (${q.pricing.discount}%)` : ''}`, `-${money(t.discount)}`);
    if (t.tax) totalRow(`${q.pricing.taxLabel || 'Tax'} (${q.pricing.tax}%)`, money(t.tax));
    doc.setDrawColor(...INK); doc.setLineWidth(0.3); doc.line(cols.qty - 20, s.y, W - M, s.y); s.y += 1;
    totalRow(`${multi ? `${o.name} total` : 'Total'}${per}`, money(t.total), true);
    const extras = o.lines.filter((l) => l.optional);
    if (extras.length) {
      ensure(16);
      font(8.5, 'bold'); color(MUTED); doc.text('OPTIONAL EXTRAS  ·  NOT INCLUDED IN THE TOTAL', M, s.y + 3.5); s.y += 6;
      extras.forEach(lineRow);
    }
  });
  paragraph(q.monthly ? 'Billed monthly in advance. Hours can be adjusted month to month.' : 'Fixed price for the scope above. Any changes to the scope are quoted and agreed before work starts.', 8.5, MUTED);

  // Payment schedule: amounts for each option.
  if (q.schedule.length) {
    heading('Payment schedule', 30);
    const amountCols = options.map((_, i) => W - M - (options.length - 1 - i) * 30);
    if (multi) { font(7.5, 'bold'); color(MUTED); options.forEach((o, i) => doc.text(clean(o.name.toUpperCase()), amountCols[i], s.y, { align: 'right' })); s.y += 3; }
    q.schedule.forEach((m, i) => {
      ensure(8);
      font(9.5, 'bold'); color(INK); doc.text(String(i + 1).padStart(2, '0'), M, s.y + 3.5);
      font(9.5); doc.text(clean(m.label), M + 10, s.y + 3.5);
      color(MUTED); doc.text(`${m.percent}%`, amountCols[0] - (multi ? 34 : 24), s.y + 3.5, { align: 'right' });
      options.forEach((o, j) => { font(9.5, 'bold'); color(INK); doc.text(money((optionTotals(q, o).total * m.percent) / 100), amountCols[j], s.y + 3.5, { align: 'right' }); });
      s.y += 6; hr(s.y, LINE, 0.1); s.y += 1.5;
    });
  }
  P.payment();

  const included = listOf(q.text.included);
  if (included.length) { heading('What’s included', 34); bullets(included); }
  const excluded = listOf(q.text.excluded);
  if (excluded.length) { heading('Not included', 34); bullets(excluded); }
  const terms = listOf(q.text.terms.replace(/\{validDays\}/g, String(q.meta.validDays || 30)));
  if (terms.length) { heading('Terms', 34); bullets(terms); }

  // Acceptance
  heading('Acceptance', 66);
  paragraph(`To accept, sign below${multi ? ' and circle the option you choose' : ''}, or reply to confirm by email before ${niceDate(validUntil(q), 'long')}. A deposit invoice follows, and the project is scheduled once it is paid.`, 9.5, MUTED);
  s.y += 6;
  ensure(40);
  const sigW = (CW - 10) / 2;
  ([[0, q.client.company || q.client.name || 'Client'], [1, profile.name]] as [number, string][]).forEach(([i, who]) => {
    const x = M + i * (sigW + 10);
    if (i === 1 && profile.signature) { const pr = doc.getImageProperties(profile.signature); const h = 10; const w = Math.min(sigW, (pr.width / pr.height) * h); doc.addImage(profile.signature, 'PNG', x, s.y + 1, w, h); }
    doc.setDrawColor(...INK); doc.setLineWidth(0.2);
    doc.line(x, s.y + 12, x + sigW, s.y + 12);
    font(8.5); color(MUTED); doc.text('Signature', x, s.y + 16.5);
    font(9.5, 'bold'); color(INK); doc.text(clean(who), x, s.y + 21.5);
    doc.line(x, s.y + 31, x + sigW * 0.55, s.y + 31);
    font(8.5); color(MUTED); doc.text('Date', x, s.y + 35.5);
  });
  s.y += 38;

  P.footer(`Quotation ${q.meta.number}`);
  doc.setProperties({ title: `Quotation ${q.meta.number} — ${profile.name}`, subject: q.project.title || 'Project quotation', author: profile.name });
  return { doc, filename: `quotation-${q.meta.number.toLowerCase()}-${slug(q.client.company || q.client.name)}.pdf` };
}

/* ---------- Invoice ---------- */

export async function buildInvoicePdf(q: QuoteState, invoice: Invoice, profile: Profile) {
  const P = makeDoc(profile);
  const { doc, s, color, font, ensure, hr, paragraph } = P;
  const money = (n: number) => clean(formatMoney(n, invoice.currency));
  const o = billedOption(q);
  P.header('INVOICE', invoice.number);
  P.blocks([
    ['Bill to', [q.client.company || q.client.name || 'Client', q.client.company && q.client.name ? q.client.name : '', q.client.email]],
    ['From', P.fromRows()],
    ['Details', [`Issued ${niceDate(invoice.issued, 'long')}`, `Due ${niceDate(invoice.due, 'long')}`, `Quotation ${q.meta.number}`]],
  ]);

  // Amount due
  ensure(26);
  doc.setFillColor(...SURFACE); doc.roundedRect(M, s.y, CW, 22, 3, 3, 'F');
  font(7.5, 'bold'); color(MUTED); doc.text(invoice.status === 'paid' ? 'AMOUNT PAID' : 'AMOUNT DUE', M + 6, s.y + 7);
  font(22, 'bold'); color(INK); doc.text(money(invoice.amount), M + 6, s.y + 16.5);
  font(7.5, 'bold'); color(MUTED); doc.text(invoice.status === 'paid' ? 'PAID ON' : 'DUE BY', M + CW / 2, s.y + 7);
  font(12, 'bold'); color(INK); doc.text(niceDate(invoice.status === 'paid' ? invoice.paidOn ?? invoice.due : invoice.due, 'long'), M + CW / 2, s.y + 15);
  if (invoice.status === 'paid') {
    doc.setDrawColor(...GREEN); doc.setLineWidth(0.8);
    doc.roundedRect(W - M - 38, s.y + 5, 32, 12, 2, 2, 'S');
    font(14, 'bold'); color(GREEN); doc.text('PAID', W - M - 22, s.y + 13.3, { align: 'center' });
  }
  s.y += 30;

  // Line
  font(7.5, 'bold'); color(MUTED);
  doc.text('DESCRIPTION', M, s.y); doc.text('AMOUNT', W - M, s.y, { align: 'right' });
  s.y += 2.5; hr(s.y, INK, 0.2); s.y += 2;
  const total = optionTotals(q, o).total;
  const desc = `${invoice.milestone} (${invoice.percent}% of ${money(total)})`;
  const sub = `${q.project.title || 'Project'} · Quotation ${q.meta.number}${q.options.length > 1 ? ` · ${o.name}: ${optionKind(o)}` : ''}`;
  font(10, 'bold'); color(INK);
  const dl = doc.splitTextToSize(clean(desc), CW - 40) as string[];
  doc.text(dl, M, s.y + 4);
  font(8.5); color(MUTED); doc.text(doc.splitTextToSize(clean(sub), CW - 40) as string[], M, s.y + 4 + dl.length * 4.4);
  font(10, 'bold'); color(INK); doc.text(money(invoice.amount - invoice.tax), W - M, s.y + 4, { align: 'right' });
  s.y += dl.length * 4.4 + 9; hr(s.y, LINE, 0.1); s.y += 2;
  const row = (label: string, value: string, strong = false) => {
    font(strong ? 11 : 9.5, strong ? 'bold' : 'normal'); color(strong ? INK : MUTED);
    doc.text(clean(label), W - M - 40, s.y + 4, { align: 'right' });
    color(INK); doc.text(value, W - M, s.y + 4, { align: 'right' });
    s.y += strong ? 8 : 6;
  };
  if (invoice.tax) { row('Subtotal', money(invoice.amount - invoice.tax)); row(`${q.pricing.taxLabel || 'Tax'} (${q.pricing.tax}%)`, money(invoice.tax)); }
  doc.setDrawColor(...INK); doc.setLineWidth(0.3); doc.line(W - M - 80, s.y, W - M, s.y); s.y += 1;
  row(invoice.status === 'paid' ? 'Total paid' : 'Total due', money(invoice.amount), true);

  P.payment();
  s.y += 4;
  paragraph(invoice.status === 'paid'
    ? 'Thank you, this invoice has been paid in full.'
    : `Please use ${invoice.number} as the payment reference. Payment is due by ${niceDate(invoice.due, 'long')}.`, 9, MUTED);

  P.footer(`Invoice ${invoice.number}`);
  doc.setProperties({ title: `Invoice ${invoice.number} — ${profile.name}`, subject: q.project.title || 'Invoice', author: profile.name });
  return { doc, filename: `invoice-${invoice.number.toLowerCase()}-${slug(q.client.company || q.client.name)}.pdf` };
}

/* ---------- Save or preview ---------- */
type Built = Promise<{ doc: jsPDF; filename: string }>;
export async function download(built: Built) { const { doc, filename } = await built; doc.save(filename); }
export async function preview(built: Built) { const { doc, filename } = await built; return { url: URL.createObjectURL(doc.output('blob')), filename }; }
