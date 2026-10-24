// Quotation and invoice PDFs for the quote builder. Loaded only when a PDF is downloaded or previewed.
import { jsPDF } from 'jspdf';
import { formatMoney, phaseTotals, revisionText, scopeRows, type QuoteLine } from '../data/pricing';
import {
  MILESTONE_WHEN, NEED_DUE, addDays, approvedChanges, balanceDue, billedOption, changeTotals, datedPlan, hoursText, invoiceStatus, milestoneDate, needDate, niceDate, optionKind, optionPlan,
  AUDIT_AREAS, AUDIT_SCORES, SCORE_BANDS, auditHours, auditOverall, scoreTone, siteHost, optionTimeline, optionTotals, optionWeeks, retainerMonths, today, addMonths, weekdays, PACKAGES, EMERGENCY_EXAMPLES, RETAINER_EXCLUDED as RETAINER_EXCLUDED_PDF, RETAINER_INCLUDED as RETAINER_INCLUDED_PDF, packageHours, packageIncluded, packageOf, planSavings, yearlyPrice, type PackageId, type PackagePrices, retainerPlan, retainerTermsText, validUntil, warrantyEnd, type ChangeOrder, type Invoice, type Payment, type Profile, type QuoteOption, type QuoteState,
} from '../data/quote-model';
import { ARCHIVO_400, ARCHIVO_600, BIG_SHOULDERS_800 } from './pdf-fonts';

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

// The brand fonts cover Latin and common punctuation; swap or drop anything they can't draw.
const clean = (text: string) => text.replace(/→/g, '->').replace(/₱/g, 'PHP ').replace(/[★✓✔]/g, '').replace(/[^\x20-\x7E -ÿ‘’“”–—…•−€£]/g, '');
const listOf = (text: string) => text.split(/\r?\n/).map((l) => l.trim().replace(/^[-•*]\s*/, '')).filter(Boolean);
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client';
const LIGHT: RGB = [190, 190, 190];
const WHITE: RGB = [255, 255, 255];

/** Shared page furniture: brand fonts, header band, headings, lists, figures and footer. */
function makeDoc(profile: Profile) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.addFileToVFS('Archivo-400.ttf', ARCHIVO_400); doc.addFont('Archivo-400.ttf', 'Archivo', 'normal');
  doc.addFileToVFS('Archivo-600.ttf', ARCHIVO_600); doc.addFont('Archivo-600.ttf', 'Archivo', 'bold');
  doc.addFileToVFS('BigShoulders-800.ttf', BIG_SHOULDERS_800); doc.addFont('BigShoulders-800.ttf', 'Display', 'normal');
  const s = { y: M };
  const color = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  /** Archivo for text ('normal' / 'bold'); Big Shoulders for display figures and titles. */
  const font = (size: number, style: 'normal' | 'bold' | 'display' = 'normal') => {
    if (style === 'display') doc.setFont('Display', 'normal'); else doc.setFont('Archivo', style);
    doc.setFontSize(size);
  };
  const ensure = (h: number) => { if (s.y + h > H - 22) { doc.addPage(); s.y = M + 4; } };
  const hr = (yy: number, c = LINE, w = 0.15) => { doc.setDrawColor(...c); doc.setLineWidth(w); doc.line(M, yy, W - M, yy); };
  /** Small spaced capitals, for labels. */
  const label = (text: string, x: number, y: number, c: RGB = MUTED, align: 'left' | 'right' | 'center' = 'left') => {
    font(7, 'bold'); color(c); doc.text(clean(text.toUpperCase()), x, y, { align, charSpace: 0.35 });
  };
  const paragraph = (text: string, size = 9.5, c = INK, width = CW, x = M) => {
    font(size); color(c);
    const lines = doc.splitTextToSize(clean(text), width) as string[];
    const lh = size * 0.45;
    ensure(lines.length * lh + 1.6);
    doc.text(lines, x, s.y + lh * 0.8);
    s.y += lines.length * lh + 1.8;
  };
  let sectionNo = 0;
  /** Section heading: a numbered ink tab, the title, and a hairline. */
  const heading = (title: string, keep = 16) => {
    sectionNo += 1;
    ensure(keep + 8);
    s.y += 7;
    doc.setFillColor(...INK); doc.roundedRect(M, s.y - 4.1, 8, 5.4, 1.2, 1.2, 'F');
    font(10, 'display'); color(WHITE); doc.text(String(sectionNo).padStart(2, '0'), M + 4, s.y - 0.1, { align: 'center' });
    font(12.5, 'bold'); color(INK); doc.text(clean(title), M + 11, s.y);
    s.y += 3.2; hr(s.y, LINE, 0.2); s.y += 5;
  };
  /** A smaller label inside a section (e.g. WHAT'S INCLUDED). */
  const subhead = (text: string) => { ensure(9); label(text, M, s.y + 3); s.y += 6.5; };
  const bullets = (items: string[], x = M, width = CW) => {
    for (const item of items) {
      font(9.5); color(INK);
      const lines = doc.splitTextToSize(clean(item), width - 6) as string[];
      ensure(lines.length * 4.2 + 1.5);
      doc.setFillColor(...INK); doc.rect(x + 0.4, s.y + 1.7, 1.4, 1.4, 'F');
      doc.text(lines, x + 5, s.y + 3.3);
      s.y += lines.length * 4.2 + 1.9;
    }
  };
  /** A tick in an ink circle, or a cross in an outlined one. */
  const mark = (yes: boolean, x: number, y: number) => {
    if (yes) {
      doc.setFillColor(...INK); doc.circle(x, y, 1.7, 'F');
      doc.setDrawColor(...WHITE); doc.setLineWidth(0.38);
      doc.line(x - 0.75, y + 0.05, x - 0.2, y + 0.6); doc.line(x - 0.2, y + 0.6, x + 0.8, y - 0.55);
    } else {
      doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3); doc.circle(x, y, 1.7, 'S');
      doc.setDrawColor(...MUTED); doc.setLineWidth(0.32);
      doc.line(x - 0.6, y - 0.6, x + 0.6, y + 0.6); doc.line(x + 0.6, y - 0.6, x - 0.6, y + 0.6);
    }
  };
  /** A list with ticks or crosses, in a column. Returns the y after it. */
  const markList = (items: string[], yes: boolean, x: number, width: number, y: number, paged = false) => {
    for (const item of items) {
      font(9.3); color(yes ? INK : [70, 70, 70] as RGB);
      const lines = doc.splitTextToSize(clean(item), width - 7) as string[];
      if (paged) { s.y = y; ensure(lines.length * 4.2 + 2); y = s.y; }
      mark(yes, x + 1.7, y + 2.2);
      doc.text(lines, x + 6, y + 3.3);
      y += lines.length * 4.2 + 2.2;
    }
    return y;
  };
  /** How tall two side-by-side lists are (so a heading can stay with them). */
  const twoListsHeight = (left: string[], right: string[]) => {
    const colW = (CW - 10) / 2;
    const height = (items: string[]) => items.reduce((h, item) => { font(9.3); return h + (doc.splitTextToSize(clean(item), colW - 7) as string[]).length * 4.2 + 2.2; }, 8);
    return Math.max(height(left), height(right));
  };
  /** Two lists side by side (included / not included); stacked when they wouldn't fit on one page. */
  const twoLists = (left: [string, string[]], right: [string, string[]]) => {
    const colW = (CW - 10) / 2;
    const tall = twoListsHeight(left[1], right[1]);
    if (tall > 200) {
      for (const [title, items] of [left, right] as [string, string[]][]) { if (!items.length) continue; subhead(title); s.y = markList(items, title === left[0], M, CW, s.y, true) + 2; }
      return;
    }
    ensure(tall + 2);
    const top = s.y;
    label(left[0], M, top + 3); label(right[0], M + colW + 10, top + 3);
    const a = markList(left[1], true, M, colW, top + 6.5);
    const b = markList(right[1], false, M + colW + 10, colW, top + 6.5);
    doc.setDrawColor(...LINE); doc.setLineWidth(0.15); doc.line(M + colW + 5, top, M + colW + 5, Math.max(a, b) - 1);
    s.y = Math.max(a, b) + 2;
  };
  /** Ink band across the top of the first page: your name (or logo), the document title and number. */
  const header = (title: string, number: string, prefix = 'No. ') => {
    const bandH = 36;
    doc.setFillColor(...INK); doc.rect(0, 0, W, bandH, 'F');
    if (profile.logo) {
      const props = doc.getImageProperties(profile.logo);
      const h = 12;
      const w = Math.min(56, (props.width / props.height) * h);
      doc.setFillColor(...WHITE); doc.roundedRect(M - 3, 9, w + 6, h + 6, 2, 2, 'F');
      doc.addImage(profile.logo, 'PNG', M, 12, w, (w / props.width) * props.height);
    } else {
      font(26, 'display'); color(WHITE); doc.text(clean(profile.name.toUpperCase()), M, 20);
      font(8); color(LIGHT); doc.text(clean(profile.tagline), M, 26.5);
    }
    font(30, 'display'); color(WHITE); doc.text(clean(title), W - M, 21, { align: 'right' });
    font(8.5); color(LIGHT); doc.text(clean(`${prefix}${number}`), W - M, 27.5, { align: 'right' });
    s.y = bandH + 11;
  };
  /** Three columns of small blocks (e.g. Prepared for / by / Details). */
  const blocks = (cols: [string, string[]][]) => {
    const colW = (CW - 12) / 3;
    let end = s.y;
    cols.forEach(([title, rows], i) => {
      const x = M + i * (colW + 6);
      label(title, x, s.y);
      let yy = s.y + 5.2;
      rows.filter(Boolean).forEach((r, j) => { font(9.3, j === 0 ? 'bold' : 'normal'); color(j === 0 ? INK : MUTED); const ls = doc.splitTextToSize(clean(r), colW) as string[]; doc.text(ls, x, yy); yy += ls.length * 4.2; });
      end = Math.max(end, yy);
    });
    s.y = end + 3;
    hr(s.y, LINE, 0.2);
    s.y += 6;
  };
  /** Footer on every page, and a slim running header on pages after the first. */
  const footer = (right: string) => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      if (i > 1) {
        font(7.5, 'bold'); color(INK); doc.text(clean(profile.name.toUpperCase()), M, 10, { charSpace: 0.3 });
        font(7.5); color(MUTED); doc.text(clean(right), W - M, 10, { align: 'right' });
        hr(12.5, LINE, 0.2);
      }
      hr(H - 14, LINE, 0.2);
      doc.setFillColor(...INK); doc.rect(M, H - 14.6, 10, 1.2, 'F');
      font(7.5); color(MUTED);
      doc.text(clean([profile.name, profile.email, profile.website, right].filter(Boolean).join('   ·   ')), M, H - 8.5);
      doc.text(`${i} / ${pages}`, W - M, H - 8.5, { align: 'right' });
    }
  };
  const fromRows = () => [profile.name, profile.email, profile.phone, profile.website, ...profile.address.split(/\r?\n/), profile.taxId ? `Tax ID ${profile.taxId}` : ''];
  /** How to pay: your methods in a soft box. */
  const payment = () => {
    const methods = listOf(profile.payment);
    if (!methods.length) return;
    heading('How to pay', 30);
    font(9.5);
    const lines = methods.flatMap((m) => doc.splitTextToSize(clean(m), CW - 12) as string[]);
    const h = lines.length * 4.6 + 8;
    ensure(h + 2);
    doc.setFillColor(...SURFACE); doc.roundedRect(M, s.y, CW, h, 2.5, 2.5, 'F');
    color(INK); doc.text(lines, M + 6, s.y + 6.4, { lineHeightFactor: 1.35 });
    s.y += h + 3;
  };
  /** Phase-by-phase dates (from the kick-off date), with the launch window. */
  const datedTable = (q: QuoteState, o: QuoteOption) => {
    const d = datedPlan(q, o);
    if (!d) return false;
    for (const p of d.phases) {
      ensure(8);
      doc.setFillColor(...(PHASE_COLORS[p.id] ?? INK)); doc.roundedRect(M, s.y + 1.1, 3, 3, 0.8, 0.8, 'F');
      font(9.5, 'bold'); color(INK); doc.text(clean(p.label), M + 6, s.y + 3.7);
      font(9.5); doc.text(clean(`${niceDate(p.start)} – ${niceDate(p.end)}`), M + 58, s.y + 3.7);
      color(MUTED); doc.text(clean(`~${p.display}`), W - M, s.y + 3.7, { align: 'right' });
      s.y += 6; hr(s.y, LINE, 0.1); s.y += 1.4;
    }
    if (d.workingDays) paragraph(`Includes ${d.workingDays} working day${d.workingDays === 1 ? '' : 's'} added by approved change orders.`, 8.5, MUTED);
    s.y += 2;
    ensure(16);
    doc.setFillColor(...SURFACE); doc.roundedRect(M, s.y, CW, 14, 2.5, 2.5, 'F');
    label('Launch', M + 6, s.y + 5.6);
    font(15, 'display'); color(INK); doc.text(clean(`Around ${niceDate(d.launch, 'long')}`), M + 6, s.y + 11.2);
    font(8.5); color(MUTED); doc.text(doc.splitTextToSize(clean(`Expected between ${niceDate(d.earliest)} and ${niceDate(d.latest)}, depending mostly on feedback and content timing.`), CW / 2 - 6) as string[], M + CW / 2, s.y + 6);
    s.y += 18;
    return true;
  };
  /** The client checklist, with a due date for each item. */
  const needsList = (q: QuoteState, o: QuoteOption, boxes = false) => {
    for (const n of q.needs) {
      const due = needDate(q, o, n.due);
      const when = `${q.retainer ? 'Before support starts' : NEED_DUE.find((x) => x.id === n.due)?.label ?? ''}${due ? ` · ${niceDate(due)}` : ''}`;
      font(9.3);
      const lines = doc.splitTextToSize(clean(n.text), CW - 64) as string[];
      ensure(lines.length * 4.2 + 3);
      doc.setDrawColor(...(boxes ? INK : LIGHT)); doc.setLineWidth(0.25); doc.roundedRect(M, s.y + 0.9, 3.4, 3.4, 0.6, 0.6, 'S');
      if (n.done) mark(true, M + 1.7, s.y + 2.6);
      font(9.3); color(INK); doc.text(lines, M + 6.5, s.y + 3.4);
      font(8.3); color(MUTED); doc.text(clean(when), W - M, s.y + 3.4, { align: 'right' });
      s.y += lines.length * 4.2 + 2;
      hr(s.y, LINE, 0.08); s.y += 1.4;
    }
  };
  /** Two signature blocks (client and you), in a bordered box. */
  const signatures = (clientName: string) => {
    s.y += 4;
    ensure(44);
    const sigW = (CW - 22) / 2;
    doc.setDrawColor(...LINE); doc.setLineWidth(0.25); doc.roundedRect(M, s.y, CW, 40, 2.5, 2.5, 'S');
    ([[0, clientName], [1, profile.name]] as [number, string][]).forEach(([i, who]) => {
      const x = M + 6 + i * (sigW + 10);
      label(i === 0 ? 'Client' : 'Developer', x, s.y + 6);
      if (i === 1 && profile.signature) { const pr = doc.getImageProperties(profile.signature); const h = 9; const w = Math.min(sigW, (pr.width / pr.height) * h); doc.addImage(profile.signature, 'PNG', x, s.y + 8, w, h); }
      doc.setDrawColor(...INK); doc.setLineWidth(0.2);
      doc.line(x, s.y + 19, x + sigW, s.y + 19);
      font(9.5, 'bold'); color(INK); doc.text(clean(who), x, s.y + 24);
      font(8); color(MUTED); doc.text('Signature', x + sigW, s.y + 24, { align: 'right' });
      doc.line(x, s.y + 33, x + sigW * 0.5, s.y + 33);
      doc.text('Date', x, s.y + 37);
    });
    s.y += 44;
  };
  /** A big boxed figure (e.g. AMOUNT DUE) with a second figure on the right. */
  const figureBox = (title: string, value: string, title2: string, value2: string, stamp?: { text: string; color: RGB }) => {
    ensure(28);
    doc.setFillColor(...SURFACE); doc.roundedRect(M, s.y, CW, 24, 3, 3, 'F');
    label(title, M + 7, s.y + 7.5);
    font(26, 'display'); color(INK); doc.text(clean(value), M + 7, s.y + 18.5);
    label(title2, M + CW / 2, s.y + 7.5);
    // Leave room for a stamp on the right, wrapping the second figure if needed.
    font(15, 'display');
    const sw = stamp ? doc.getTextWidth(stamp.text) + 10 : 0;
    font(12, 'bold'); color(INK);
    const v2 = doc.splitTextToSize(clean(value2), CW / 2 - 8 - (stamp ? sw + 6 : 0)) as string[];
    doc.text(v2, M + CW / 2, s.y + (v2.length > 1 ? 13.5 : 15.5));
    if (stamp) {
      font(15, 'display');
      doc.setDrawColor(...stamp.color); doc.setLineWidth(0.8);
      doc.roundedRect(W - M - sw - 7, s.y + 6, sw, 12, 2, 2, 'S');
      color(stamp.color); doc.text(stamp.text, W - M - 7 - sw / 2, s.y + 14.4, { align: 'center' });
    }
    s.y += 31;
  };
  /** A soft header bar for a table: [label, x, align] cells. */
  const tableBar = (cells: [string, number, 'left' | 'right'][]) => {
    ensure(18);
    doc.setFillColor(...SURFACE); doc.roundedRect(M, s.y, CW, 8, 2, 2, 'F');
    for (const [text, x, align] of cells) label(text, x, s.y + 5.3, MUTED, align);
    s.y += 10;
  };
  /** The figure that matters (a total or balance) on an ink bar, right-aligned. */
  const totalBar = (text: string, value: string) => {
    ensure(15);
    const x = W - M - 86;
    s.y += 1;
    doc.setFillColor(...INK); doc.roundedRect(x, s.y, 86, 12, 2.5, 2.5, 'F');
    label(text, x + 4, s.y + 7.5, LIGHT);
    font(17, 'display'); color(WHITE); doc.text(clean(value), W - M - 4, s.y + 8.6, { align: 'right' });
    s.y += 15;
  };
  const clientBlock = (q: QuoteState) => [q.client.company || q.client.name || 'Client', q.client.company && q.client.name ? q.client.name : '', q.client.email];
  return { doc, s, color, font, ensure, hr, label, paragraph, heading, subhead, bullets, mark, markList, twoLists, header, blocks, footer, fromRows, payment, datedTable, needsList, signatures, figureBox, tableBar, totalBar, twoListsHeight, clientBlock };
}

/* ---------- Quotation ---------- */

/** hideRates: leave hourly rates off the pricing table (quantities and amounts only). */
export async function buildQuotePdf(q: QuoteState, profile: Profile, opts: { hideRates?: boolean } = {}) {
  const P = makeDoc(profile);
  const { doc, s, color, font, ensure, hr, label, paragraph, heading, subhead, bullets } = P;
  const money = (n: number) => clean(formatMoney(n, q.settings.currency));
  const per = q.monthly ? ' / month' : '';
  const priced = q.options.filter((o) => o.lines.some((l) => !l.optional));
  const options = priced.length ? priced : q.options.slice(0, 1);
  const multi = options.length > 1;
  const timelineOf = (o: QuoteOption) => o.timeline || optionTimeline(q.answers, o);
  const r = q.retainer;

  P.header('QUOTATION', q.meta.number);
  P.blocks([
    ['Prepared for', [q.client.company || q.client.name || 'Client', q.client.company && q.client.name ? q.client.name : '', q.client.email, q.client.website]],
    ['Prepared by', P.fromRows()],
    ['Details', [`Issued ${niceDate(q.meta.date, 'long')}`, `Valid until ${niceDate(validUntil(q), 'long')}`, r?.fromNumber ? `Follows project ${r.fromNumber}` : q.meta.ref ? `Estimate ref ${q.meta.ref}` : '']],
  ]);

  // Title and summary
  if (q.project.title) {
    font(24, 'display'); color(INK);
    const t = doc.splitTextToSize(clean(q.project.title.toUpperCase()), CW) as string[];
    ensure(t.length * 9 + 4);
    doc.text(t, M, s.y + 7);
    s.y += t.length * 9 + 2;
  }
  if (q.project.summary) paragraph(q.project.summary, 10, MUTED, CW * 0.86);
  s.y += 2;

  // At a glance: one dark card with the total and three facts, or the options side by side.
  if (!multi) {
    const o = options[0];
    const t = optionTotals(q, o);
    const plan = optionPlan(q.answers, o);
    const dated = datedPlan(q, o);
    const first = q.schedule[0];
    const facts: [string, string][] = r
      ? [
        ['Hours', r.dailyHours ? `${hoursText(r.dailyHours)} hrs a day, Mon–Fri` : `${hoursText(retainerPlan(q).hours)} hrs a month`],
        ['Starts', niceDate(r.start, 'long')],
        r.weekendEmergency ? ['Weekends', 'Emergencies included'] : ['Unused hours', r.rolloverMode === 'bank' ? `Banked ${r.bankMonths} months` : r.rolloverMode === 'next' ? 'Carry 1 month' : 'Expire monthly'],
      ]
      : [
        ['Timeline', plan ? `${plan.low}–${plan.high} weeks${o.team > 1 ? `, ${o.team} developers` : ''}` : timelineOf(o) || '-'],
        ['Launch', dated ? `Around ${niceDate(dated.launch)}` : 'Set at kick-off'],
        [first ? 'First payment' : 'Payment', first ? `${money((t.total * first.percent) / 100)} (${first.percent}%)` : 'On invoice'],
      ];
    const h = 36;
    ensure(h + 4);
    doc.setFillColor(...INK); doc.roundedRect(M, s.y, CW, h, 3.5, 3.5, 'F');
    label(r ? 'Monthly fee' : q.monthly ? 'Monthly total' : 'Project total', M + 8, s.y + 9, LIGHT);
    font(36, 'display'); color(WHITE); doc.text(money(t.total), M + 8, s.y + 24);
    const amountW = doc.getTextWidth(money(t.total));
    if (per) { font(10, 'bold'); color(LIGHT); doc.text('/ month', M + 10 + amountW, s.y + 24); }
    font(8.3); color(LIGHT);
    const free = r ? Math.max(0, Math.min(11, Math.round(r.freeMonths) || 0)) : 0;
    const saving = r?.paygRate ? planSavings(retainerPlan(q).hours, t.subtotal - t.discount, r.paygRate) : 0;
    const billing = r?.billing === 'yearly' ? `Paid yearly: ${money(yearlyPrice(t.total, free))} for 12 months${free ? ` (${free} free)` : ''}` : r || q.monthly ? 'Billed monthly in advance' : 'Fixed price';
    doc.text(clean([billing, t.discount ? `${money(t.discount)} discount applied` : '', saving ? `saves ${money(saving)}/mo vs pay-as-you-go` : '', t.tax ? `incl. ${q.pricing.taxLabel || 'tax'}` : ''].filter(Boolean).join(' · ')), M + 8, s.y + 30.5);
    const fx = M + CW * 0.5;
    const fw = (CW * 0.5 - 8) / 3;
    facts.forEach(([k, v], i) => {
      const x = fx + i * fw;
      doc.setDrawColor(70, 70, 70); doc.setLineWidth(0.2); doc.line(x - 3, s.y + 7, x - 3, s.y + h - 7);
      label(k, x, s.y + 9, LIGHT);
      font(9.6, 'bold'); color(WHITE);
      doc.text(doc.splitTextToSize(clean(v), fw - 4) as string[], x, s.y + 15.5);
    });
    s.y += h + 6;
  } else {
    subhead('Choose an option');
    const colW = (CW - (options.length - 1) * 4) / options.length;
    const h = 34;
    ensure(h + 4);
    options.forEach((o, i) => {
      const x = M + i * (colW + 4);
      const chosen = o.id === q.acceptedOption;
      doc.setFillColor(...(chosen ? INK : SURFACE)); doc.roundedRect(x, s.y, colW, h, 3, 3, 'F');
      const fg: RGB = chosen ? WHITE : INK;
      label(o.name + (chosen ? '  ·  accepted' : ''), x + 5, s.y + 7, chosen ? LIGHT : MUTED);
      font(22, 'display'); color(fg); doc.text(`${money(optionTotals(q, o).total)}${per}`, x + 5, s.y + 17.5);
      font(8.6, 'bold'); color(fg); doc.text(clean(optionKind(o)), x + 5, s.y + 24);
      font(8.3); color(chosen ? LIGHT : MUTED); doc.text(clean(`About ${optionWeeks(q.answers, o)} from kick-off`), x + 5, s.y + 29);
    });
    s.y += h + 6;
  }
  // A personal note, set off with an ink bar.
  if (q.text.note.trim()) {
    font(10);
    const lines = doc.splitTextToSize(clean(q.text.note.trim()), CW - 8) as string[];
    ensure(lines.length * 4.6 + 4);
    doc.setFillColor(...INK); doc.rect(M, s.y, 1, lines.length * 4.6 + 1.5, 'F');
    color(INK); doc.text(lines, M + 6, s.y + 3.6);
    s.y += lines.length * 4.6 + 6;
  }

  // Project details
  // Retainers show their hours in pricing and terms, so skip the estimator's "Support" answer. The client's budget stays private.
  const rows = scopeRows(q.answers).filter(([name]) => name !== 'Notes' && name !== 'Hitting your date' && !(r && name === 'Support') && name !== 'Budget');
  if (rows.length) {
    heading('Project details', 30);
    for (const [name, value] of rows) {
      font(9.5);
      const lines = doc.splitTextToSize(clean(value), CW - 52) as string[];
      ensure(lines.length * 4.2 + 4);
      font(8.8); color(MUTED); doc.text(clean(name), M, s.y + 3.4);
      font(9.5); color(INK); doc.text(lines, M + 52, s.y + 3.4);
      s.y += lines.length * 4.2 + 2.2;
      hr(s.y, LINE, 0.08); s.y += 1.8;
    }
  }

  // Timeline: a phase bar, then dates (or one line per option).
  const plan = optionPlan(q.answers, options[0]);
  if (plan) {
    heading('Timeline', 34);
    const total = plan.phases.reduce((t, p) => t + p.weeks, 0) || 1;
    ensure(16);
    let x = M;
    const usable = CW - 1 * (plan.phases.length - 1);
    for (const p of plan.phases) { const w = (p.weeks / total) * usable; doc.setFillColor(...(PHASE_COLORS[p.id] ?? INK)); doc.roundedRect(x, s.y, Math.max(w, 1.5), 5, 1.4, 1.4, 'F'); x += w + 1; }
    s.y += 9;
    if (multi) {
      for (const o of options) { ensure(7); font(9.5, 'bold'); color(INK); doc.text(clean(o.name), M, s.y + 3.4); font(9.5); doc.text(clean(`${optionWeeks(q.answers, o)} from kick-off  ·  ${optionKind(o)}`), M + 34, s.y + 3.4); const d = q.delivery.kickoff ? datedPlan(q, o) : null; if (d) { color(MUTED); doc.text(clean(`launch around ${niceDate(d.launch)}`), W - M, s.y + 3.4, { align: 'right' }); } s.y += 6; hr(s.y, LINE, 0.08); s.y += 1.4; }
      paragraph(`Calendar time from kick-off${q.delivery.kickoff ? ` on ${niceDate(q.delivery.kickoff, 'long')}` : ''}, assuming feedback within about two business days.`, 8.8, MUTED);
    } else if (q.delivery.kickoff && datedPlan(q, options[0])) {
      paragraph(`${timelineOf(options[0])}, starting ${niceDate(q.delivery.kickoff, 'long')}. Dates assume feedback within about two business days.`, 9, MUTED);
      s.y += 1;
      P.datedTable(q, options[0]);
    } else {
      let lx = M;
      for (const p of plan.phases) {
        const text = clean(`${p.label} ~${p.display}`);
        font(8.6); const w = doc.getTextWidth(text) + 10;
        if (lx + w > W - M) { lx = M; s.y += 5.5; }
        doc.setFillColor(...(PHASE_COLORS[p.id] ?? INK)); doc.roundedRect(lx, s.y - 2.6, 3, 3, 0.8, 0.8, 'F');
        color(INK); doc.text(text, lx + 4.5, s.y);
        lx += w;
      }
      s.y += 5;
      paragraph(`${timelineOf(options[0])}. Calendar time assumes feedback within about two business days.`, 9, MUTED);
    }
  }

  // Pricing, per option, grouped by phase where the work is split.
  const hideRates = Boolean(opts.hideRates);
  const cols = { item: M + 4, qty: hideRates ? M + CW - 34 : M + CW - 60, rate: M + CW - 34, amount: W - M - 4 };
  const qty = (l: QuoteLine) => { const n = Math.round(l.hours * 100) / 100; return (l.unit ?? 'hours') === 'fixed' ? `${n} x` : `${n} hrs`; };
  const tableHead = () => {
    ensure(18);
    doc.setFillColor(...SURFACE); doc.roundedRect(M, s.y, CW, 8, 2, 2, 'F');
    label('Item', cols.item, s.y + 5.3); label(q.monthly ? 'Hrs / mo' : 'Qty', cols.qty, s.y + 5.3, MUTED, 'right'); if (!hideRates) label('Rate', cols.rate, s.y + 5.3, MUTED, 'right'); label('Amount', cols.amount, s.y + 5.3, MUTED, 'right');
    s.y += 10;
  };
  const lineRow = (l: QuoteLine, keep = 0) => {
    font(9.6, 'bold');
    const title = doc.splitTextToSize(clean(l.title), CW - 76) as string[];
    font(8.4);
    const text = [l.detail, revisionText(l)].filter(Boolean).join(' ');
    const detail = text ? (doc.splitTextToSize(clean(text), CW - 76) as string[]) : [];
    const h = title.length * 4.3 + detail.length * 3.7 + 3.6;
    ensure(h + 1 + keep);
    font(9.6, 'bold'); color(INK); doc.text(title, cols.item, s.y + 3.6);
    font(8.4); color(MUTED); if (detail.length) doc.text(detail, cols.item, s.y + 3.8 + title.length * 4.3);
    font(9.4); color(MUTED);
    doc.text(qty(l), cols.qty, s.y + 3.6, { align: 'right' });
    if (!hideRates) doc.text(money(l.rate), cols.rate, s.y + 3.6, { align: 'right' });
    font(9.6, 'bold'); color(INK); doc.text(money(l.hours * l.rate), cols.amount, s.y + 3.6, { align: 'right' });
    s.y += h; hr(s.y, LINE, 0.1); s.y += 2;
  };
  /** Subtotal rows, then the total on an ink bar. */
  const totalsBlock = (o: QuoteOption) => {
    const t = optionTotals(q, o);
    const x = M + CW - 86;
    const rowsT: [string, string][] = [['Subtotal', money(t.subtotal)]];
    if (t.discount) rowsT.push([`Discount${q.pricing.discountType === 'percent' ? ` (${q.pricing.discount}%)` : ''}`, `−${money(t.discount)}`]);
    if (t.tax) rowsT.push([`${q.pricing.taxLabel || 'Tax'} (${q.pricing.tax}%)`, money(t.tax)]);
    ensure(rowsT.length * 6 + 16);
    s.y += 1;
    for (const [k, v] of rowsT) { font(9.3); color(MUTED); doc.text(clean(k), x + 4, s.y + 4); color(INK); doc.text(v, cols.amount, s.y + 4, { align: 'right' }); s.y += 6; }
    s.y += 1;
    doc.setFillColor(...INK); doc.roundedRect(x, s.y, 86, 12, 2.5, 2.5, 'F');
    label(`${multi ? `${o.name} total` : 'Total'}${per}`, x + 4, s.y + 7.5, LIGHT);
    font(17, 'display'); color(WHITE); doc.text(money(t.total), cols.amount, s.y + 8.6, { align: 'right' });
    s.y += 16;
  };
  heading(multi ? 'Pricing by option' : 'Pricing', 70);
  const keepLast = r ? 34 : 44;
  options.forEach((o, i) => {
    if (multi) { ensure(52); if (i) s.y += 4; font(11.5, 'bold'); color(INK); doc.text(clean(`${o.name}: ${optionKind(o)}`), M, s.y + 3); s.y += 7; }
    tableHead();
    const billable = o.lines.filter((l) => !l.optional);
    const pt = phaseTotals(o.lines);
    if (pt.split) {
      for (const phase of [1, 2] as const) {
        ensure(14);
        doc.setFillColor(...INK); doc.circle(M + 1.2, s.y + 2.4, 0.9, 'F');
        label(phase === 1 ? 'Phase 1 · launch with the essentials' : 'Phase 2 · after launch', M + 4, s.y + 3.4, INK);
        font(9); color(MUTED); doc.text(money(phase === 1 ? pt.one : pt.two), cols.amount, s.y + 3.4, { align: 'right' });
        s.y += 6.5;
        billable.filter((l) => (l.phase ?? 1) === phase).forEach((l, i, all) => lineRow(l, phase === 2 && i === all.length - 1 ? keepLast : 0));
      }
    } else {
      // The last line stays on the same page as the totals (and, on project quotes, the note under them).
      billable.forEach((l, i) => lineRow(l, i === billable.length - 1 ? keepLast : 0));
    }
    totalsBlock(o);
    const extras = o.lines.filter((l) => l.optional);
    if (extras.length) {
      subhead('Optional extras · not included in the total');
      extras.forEach((l) => lineRow(l));
    }
  });
  // Retainers explain billing under "How the retainer works", so the note is for other quotes only.
  if (!r) paragraph(q.monthly ? 'Billed monthly in advance. Hours can be adjusted month to month.' : 'Fixed price for the scope above. Any changes to the scope are quoted and agreed before work starts.', 8.5, MUTED);

  if (r) { heading('How the retainer works', 40); bullets(retainerTermsText(q)); }

  // Payment schedule (not for retainers: they're billed monthly). Cards for one option, a table for several.
  if (q.schedule.length && !r) {
    heading('Payment schedule', 40);
    if (!multi && q.schedule.length <= 4) {
      const n = q.schedule.length;
      const cw = (CW - (n - 1) * 4) / n;
      font(9, 'bold');
      const labels = q.schedule.map((m) => doc.splitTextToSize(clean(m.label), cw - 10) as string[]);
      const h = 30 + Math.max(...labels.map((l) => l.length)) * 4;
      ensure(h + 2);
      q.schedule.forEach((m, i) => {
        const x = M + i * (cw + 4);
        const due = milestoneDate(q, options[0], m);
        doc.setFillColor(...SURFACE); doc.roundedRect(x, s.y, cw, h, 3, 3, 'F');
        label(`${String(i + 1).padStart(2, '0')} · ${m.percent}%`, x + 5, s.y + 7);
        font(9, 'bold'); color(INK); doc.text(labels[i], x + 5, s.y + 13);
        const yy = s.y + 13 + labels[i].length * 4 + 4;
        font(16, 'display'); color(INK); doc.text(money((optionTotals(q, options[0]).total * m.percent) / 100), x + 5, yy + 2);
        font(8.2); color(MUTED); doc.text(clean(due ? (m.when === 'date' ? niceDate(due) : `About ${niceDate(due)}`) : MILESTONE_WHEN.find((w) => w.id === m.when)?.label ?? ''), x + 5, yy + 8);
      });
      s.y += h + 4;
    } else {
      const amountCols = options.map((_, i) => W - M - (options.length - 1 - i) * 30);
      if (multi) { options.forEach((o, i) => label(o.name, amountCols[i], s.y, MUTED, 'right')); s.y += 3; }
      q.schedule.forEach((m, i) => {
        ensure(8);
        font(9.5, 'bold'); color(INK); doc.text(String(i + 1).padStart(2, '0'), M, s.y + 3.5);
        font(9.5); doc.text(clean(m.label), M + 10, s.y + 3.5);
        const due = multi ? MILESTONE_WHEN.find((w) => w.id === m.when)?.label ?? '' : milestoneDate(q, options[0], m);
        if (due) { font(8.4); color(MUTED); doc.text(clean(multi || m.when === 'date' ? due : `about ${niceDate(due)}`), M + 10 + doc.getTextWidth(clean(m.label)) * (9.5 / 8.4) + 4, s.y + 3.5); }
        font(9.5); color(MUTED); doc.text(`${m.percent}%`, amountCols[0] - (multi ? 34 : 24), s.y + 3.5, { align: 'right' });
        options.forEach((o, j) => { font(9.5, 'bold'); color(INK); doc.text(money((optionTotals(q, o).total * m.percent) / 100), amountCols[j], s.y + 3.5, { align: 'right' }); });
        s.y += 6; hr(s.y, LINE, 0.1); s.y += 1.5;
      });
    }
  }
  P.payment();

  if (q.needs.length) {
    heading('What we’ll need from you', 30);
    paragraph('To keep the project on schedule, please have these ready. Share logins through each platform’s invite feature or a password manager, never by email.', 9, MUTED);
    s.y += 1;
    P.needsList(q, options[0]);
  }

  // Included and not included, side by side.
  const included = listOf(q.text.included);
  const excluded = listOf(q.text.excluded);
  if (included.length || excluded.length) {
    // Keep the heading with the lists when they fit on one page.
    const tall = P.twoListsHeight(included, excluded);
    heading(r ? 'What’s covered' : 'What’s included', tall <= 200 ? tall + 4 : 40);
    if (included.length && excluded.length) P.twoLists([r ? 'Covered each month' : 'Included', included], [r ? 'Not covered' : 'Not included', excluded]);
    else if (included.length) s.y = P.markList(included, true, M, CW, s.y, true);
    else s.y = P.markList(excluded, false, M, CW, s.y, true);
  }
  const terms = listOf(q.text.terms.replace(/\{validDays\}/g, String(q.meta.validDays || 30)));
  if (terms.length) {
    heading('Terms', 34);
    terms.forEach((term, i) => {
      font(9);
      const lines = doc.splitTextToSize(clean(term), CW - 9) as string[];
      ensure(lines.length * 4 + 2);
      font(9, 'bold'); color(MUTED); doc.text(`${i + 1}.`, M, s.y + 3.2);
      font(9); color(INK); doc.text(lines, M + 7, s.y + 3.2);
      s.y += lines.length * 4 + 1.8;
    });
  }

  // Acceptance
  heading('Acceptance', 70);
  paragraph(r
    ? `To accept, sign below or reply to confirm by email before ${niceDate(validUntil(q), 'long')}. The ${r.billing === 'yearly' ? 'yearly' : 'first monthly'} invoice follows, and support starts on ${niceDate(r.start, 'long')} once it is paid.`
    : `To accept, sign below${multi ? ' and circle the option you choose' : ''}, or reply to confirm by email before ${niceDate(validUntil(q), 'long')}. A deposit invoice follows, and the project is scheduled once it is paid.`, 9.3, MUTED);
  P.signatures(q.client.company || q.client.name || 'Client');

  P.footer(`Quotation ${q.meta.number}`);
  doc.setProperties({ title: `Quotation ${q.meta.number} — ${profile.name}`, subject: q.project.title || 'Project quotation', author: profile.name });
  return { doc, filename: `quotation-${q.meta.number.toLowerCase()}-${slug(q.client.company || q.client.name)}.pdf` };
}

/* ---------- Invoice ---------- */

export async function buildInvoicePdf(q: QuoteState, invoice: Invoice, profile: Profile) {
  const P = makeDoc(profile);
  const { doc, s, color, font, hr, paragraph } = P;
  const money = (n: number) => clean(formatMoney(n, invoice.currency));
  const o = billedOption(q);
  P.header('INVOICE', invoice.number);
  P.blocks([
    ['Bill to', [q.client.company || q.client.name || 'Client', q.client.company && q.client.name ? q.client.name : '', q.client.email]],
    ['From', P.fromRows()],
    ['Details', [`Issued ${niceDate(invoice.issued, 'long')}`, `Due ${niceDate(invoice.due, 'long')}`, q.retainer ? `Retainer ${q.meta.number}` : `Quotation ${q.meta.number}`]],
  ]);

  // Amount due (the balance, after any payments)
  const st = invoiceStatus(invoice);
  const last = invoice.payments[invoice.payments.length - 1];
  if (st === 'paid') P.figureBox('AMOUNT PAID', money(invoice.amount), 'PAID ON', niceDate(last?.date ?? invoice.due, 'long'), { text: 'PAID', color: GREEN });
  else if (st === 'partial') P.figureBox('BALANCE DUE', money(balanceDue(invoice)), 'DUE BY', niceDate(invoice.due, 'long'), { text: 'PART PAID', color: [132, 86, 10] });
  else P.figureBox('AMOUNT DUE', money(invoice.amount), 'DUE BY', niceDate(invoice.due, 'long'));

  // Lines
  P.tableBar([['Description', M + 4, 'left'], ['Amount', W - M - 4, 'right']]);
  const total = optionTotals(q, o).total;
  const item = (desc: string, sub: string, amount: number) => {
    font(10, 'bold'); color(INK);
    const dl = doc.splitTextToSize(clean(desc), CW - 44) as string[];
    doc.text(dl, M + 4, s.y + 4);
    font(8.5); color(MUTED); doc.text(doc.splitTextToSize(clean(sub), CW - 44) as string[], M + 4, s.y + 4 + dl.length * 4.4);
    font(10, 'bold'); color(INK); doc.text(clean(amount < 0 ? `−${money(-amount)}` : money(amount)), W - M - 4, s.y + 4, { align: 'right' });
    s.y += dl.length * 4.4 + 9; hr(s.y, LINE, 0.1); s.y += 2;
  };
  if (invoice.lines?.length) {
    for (const l of invoice.lines) item(l.title, [l.detail, q.project.title].filter(Boolean).join(' · '), l.amount);
  } else {
    const desc = invoice.changeId ? invoice.milestone : `${invoice.milestone} (${invoice.percent}% of ${money(total)})`;
    item(desc, `${q.project.title || 'Project'} · Quotation ${q.meta.number}${q.options.length > 1 ? ` · ${o.name}: ${optionKind(o)}` : ''}`, invoice.amount - invoice.tax);
  }
  const row = (label: string, value: string, strong = false) => {
    if (strong) { P.totalBar(label, value); return; }
    font(9.5); color(MUTED);
    doc.text(clean(label), W - M - 82, s.y + 4);
    color(INK); doc.text(clean(value), W - M - 4, s.y + 4, { align: 'right' });
    s.y += 6;
  };
  if (invoice.tax) { row('Subtotal', money(invoice.amount - invoice.tax)); row(`${q.pricing.taxLabel || 'Tax'} (${q.pricing.tax}%)`, money(invoice.tax)); }
  // With payments, only the balance gets the ink bar.
  row('Invoice total', money(invoice.amount), !invoice.payments.length);
  for (const pmt of invoice.payments) row(`Paid ${niceDate(pmt.date)}${pmt.method ? ` (${pmt.method})` : ''}`, `-${money(pmt.amount)}`);
  if (invoice.payments.length) { row(st === 'paid' ? 'Balance' : 'Balance due', money(balanceDue(invoice)), true); }

  if (st !== 'paid') P.payment();
  s.y += 4;
  paragraph(st === 'paid'
    ? 'Thank you, this invoice has been paid in full.'
    : `Please use ${invoice.number} as the payment reference. ${st === 'partial' ? `The remaining ${money(balanceDue(invoice))}` : 'Payment'} is due by ${niceDate(invoice.due, 'long')}.`, 9, MUTED);

  P.footer(`Invoice ${invoice.number}`);
  doc.setProperties({ title: `Invoice ${invoice.number} — ${profile.name}`, subject: q.project.title || 'Invoice', author: profile.name });
  return { doc, filename: `invoice-${invoice.number.toLowerCase()}-${slug(q.client.company || q.client.name)}.pdf` };
}

/* ---------- Receipt ---------- */

export async function buildReceiptPdf(q: QuoteState, invoice: Invoice, payment: Payment, profile: Profile) {
  const P = makeDoc(profile);
  const { doc, s, color, font, hr, paragraph } = P;
  const money = (n: number) => clean(formatMoney(n, invoice.currency));
  const before = invoice.payments.slice(0, invoice.payments.indexOf(payment)).reduce((t, p) => t + p.amount, 0);
  const remaining = Math.max(0, Math.round((invoice.amount - before - payment.amount) * 100) / 100);
  P.header('RECEIPT', payment.receipt || 'Receipt');
  P.blocks([
    ['Received from', P.clientBlock(q)],
    ['Received by', P.fromRows()],
    ['Details', [`Received ${niceDate(payment.date, 'long')}`, payment.method ? `Paid by ${payment.method}` : '', payment.note ? `Reference ${payment.note}` : '', `For invoice ${invoice.number}`]],
  ]);
  P.figureBox('AMOUNT RECEIVED', money(payment.amount), remaining ? 'BALANCE REMAINING' : 'INVOICE', remaining ? money(remaining) : 'Paid in full', remaining ? undefined : { text: 'PAID', color: GREEN });
  P.tableBar([['For', M + 4, 'left']]);
  font(10, 'bold'); color(INK); doc.text(doc.splitTextToSize(clean(invoice.milestone), CW - 8) as string[], M + 4, s.y + 4); s.y += 6;
  font(8.5); color(MUTED); doc.text(clean(`${q.project.title || 'Project'} · Invoice ${invoice.number} · Quotation ${q.meta.number}`), M + 4, s.y + 3); s.y += 7; hr(s.y, LINE, 0.1); s.y += 2;
  const row = (label: string, value: string, strong = false) => {
    if (strong) { P.totalBar(label, value); return; }
    font(9.5); color(MUTED);
    doc.text(clean(label), W - M - 82, s.y + 4); color(INK); doc.text(clean(value), W - M - 4, s.y + 4, { align: 'right' });
    s.y += 6;
  };
  row('Invoice total', money(invoice.amount));
  if (before) row('Paid before', `-${money(before)}`);
  row('This payment', `-${money(payment.amount)}`);
  row('Balance remaining', money(remaining), true);
  s.y += 4;
  paragraph('Thank you for your payment. Please keep this receipt for your records.', 9.5, INK);
  P.footer(`Receipt ${payment.receipt}`);
  doc.setProperties({ title: `Receipt ${payment.receipt} — ${profile.name}`, subject: `Payment for invoice ${invoice.number}`, author: profile.name });
  return { doc, filename: `receipt-${(payment.receipt || invoice.number).toLowerCase()}-${slug(q.client.company || q.client.name)}.pdf` };
}

/* ---------- Change order ---------- */

export async function buildChangeOrderPdf(q: QuoteState, change: ChangeOrder, profile: Profile) {
  const P = makeDoc(profile);
  const { doc, s, color, font, ensure, hr, paragraph, heading } = P;
  const money = (n: number) => clean(formatMoney(n, q.settings.currency));
  const o = billedOption(q);
  const totals = changeTotals(q, change);
  const number = `${q.meta.number}-${change.number}`;
  P.header('CHANGE ORDER', number);
  P.blocks([
    ['Prepared for', P.clientBlock(q)],
    ['Prepared by', P.fromRows()],
    ['Details', [`Date ${niceDate(change.date, 'long')}`, `Original quotation ${q.meta.number}`, change.status === 'approved' ? 'Approved' : 'For approval']],
  ]);
  P.figureBox('THIS CHANGE', money(totals.total), 'TIMELINE', change.days ? `Adds ${change.days} working days` : 'No change to the timeline');
  heading('What’s changing');
  if (change.title) { font(12, 'bold'); color(INK); ensure(7); doc.text(clean(change.title), M, s.y + 4); s.y += 7.5; }
  if (change.detail) paragraph(change.detail, 9.5, MUTED);
  heading('Cost', 30);
  P.tableBar([['Item', M + 4, 'left'], ['Hours', M + CW - 60, 'right'], ['Rate', M + CW - 34, 'right'], ['Amount', W - M - 4, 'right']]);
  for (const l of change.lines) {
    ensure(8);
    font(9.5, 'bold'); color(INK); doc.text(clean(l.title || 'Extra work'), M + 4, s.y + 3.6);
    font(9.5); color(MUTED); doc.text(`${l.hours}`, M + CW - 60, s.y + 3.6, { align: 'right' }); doc.text(money(l.rate), M + CW - 34, s.y + 3.6, { align: 'right' });
    font(9.5, 'bold'); color(INK); doc.text(money(l.hours * l.rate), W - M - 4, s.y + 3.6, { align: 'right' });
    s.y += 6.5; hr(s.y, LINE, 0.1); s.y += 1.5;
  }
  const row = (label: string, value: string, strong = false) => {
    if (strong) { P.totalBar(label, value); return; }
    font(9.5); color(MUTED);
    doc.text(clean(label), W - M - 82, s.y + 4); color(INK); doc.text(clean(value), W - M - 4, s.y + 4, { align: 'right' });
    s.y += 6;
  };
  s.y += 1;
  if (totals.tax) { row('Subtotal', money(totals.subtotal)); row(`${q.pricing.taxLabel || 'Tax'} (${q.pricing.tax}%)`, money(totals.tax)); }
  row('Change total', money(totals.total), true);

  // Effect on the project: total and launch date, counting this change as approved.
  const others = approvedChanges(q).filter((c) => c.id !== change.id);
  const projectTotal = optionTotals(q, o).total + others.reduce((t, c) => t + changeTotals(q, c).total, 0) + totals.total;
  heading('Effect on the project', 30);
  paragraph(`Project total with this change: ${money(projectTotal)} (accepted quotation ${money(optionTotals(q, o).total)}${others.length ? `, plus ${others.length} earlier approved change${others.length > 1 ? 's' : ''}` : ''}).`, 9.5, INK);
  const withThis = { ...q, changes: q.changes.map((c) => (c.id === change.id ? { ...c, status: 'approved' as const } : c)) };
  const d = datedPlan(withThis, o);
  if (d) paragraph(`Estimated launch with this change: around ${niceDate(d.launch, 'long')}.`, 9.5, INK);
  paragraph('Work on this change starts once it’s approved. It’s invoiced separately, due within the usual payment terms. Everything else in the original quotation stays the same.', 9, MUTED);
  heading('Approval', 60);
  paragraph('To approve, sign below or reply to confirm by email.', 9.5, MUTED);
  P.signatures(q.client.company || q.client.name || 'Client');
  P.footer(`Change order ${number}`);
  doc.setProperties({ title: `Change order ${number} — ${profile.name}`, subject: change.title || 'Change order', author: profile.name });
  return { doc, filename: `change-order-${number.toLowerCase()}-${slug(q.client.company || q.client.name)}.pdf` };
}

/* ---------- Website audit ---------- */

const TONE: Record<string, RGB> = { good: GREEN, ok: [184, 116, 0], poor: [196, 43, 43], none: LIGHT };
const IMPACT: Record<string, { text: string; color: RGB }> = { high: { text: 'HIGH IMPACT', color: [196, 43, 43] }, medium: { text: 'MEDIUM', color: [184, 116, 0] }, low: { text: 'LOW', color: MUTED } };
/** A lighter version of a colour (for ring tracks and soft fills). */
const tint = (c: RGB, amount: number): RGB => c.map((v) => Math.round(v + (255 - v) * amount)) as RGB;

export async function buildAuditPdf(q: QuoteState, profile: Profile) {
  const P = makeDoc(profile);
  const { doc, s, color, font, ensure, hr, paragraph, heading, label } = P;
  const a = q.audit!;
  const money = (n: number) => clean(formatMoney(n, q.settings.currency));
  const site = siteHost(a.url || q.client.website) || 'Website';
  const rank = { high: 0, medium: 1, low: 2 };
  const findings = a.findings.filter((x) => x.issue.trim() || x.fix.trim()).sort((x, y) => rank[x.impact] - rank[y.impact]);
  const hours = auditHours(a);
  const overall = auditOverall(a);

  /** A score ring like PageSpeed's: a tinted track and an arc that fills to the score. */
  const ring = (cx: number, cy: number, r: number, v: number | null, w: number) => {
    const tone = TONE[scoreTone(v)];
    doc.setLineWidth(w);
    doc.setDrawColor(...(v === null ? LINE : tint(tone, 0.8)));
    doc.circle(cx, cy, r, 'S');
    if (!v) return;
    doc.setDrawColor(...tone);
    doc.setLineCap('round');
    const steps = Math.max(2, Math.round(v * 0.8));
    let px = cx, py = cy - r;
    for (let i = 1; i <= steps; i++) {
      const t = -Math.PI / 2 + (i / steps) * 2 * Math.PI * (v / 100);
      const nx = cx + r * Math.cos(t), ny = cy + r * Math.sin(t);
      doc.line(px, py, nx, ny);
      px = nx; py = ny;
    }
    doc.setLineCap('butt');
  };
  /** An outlined pill (impact), returning its width. */
  const pill = (text: string, c: RGB, x: number, y: number) => {
    font(6.3, 'bold');
    const w = doc.getTextWidth(text) + text.length * 0.3 + 6;
    doc.setDrawColor(...c); doc.setLineWidth(0.35); doc.roundedRect(x, y, w, 5, 2.5, 2.5, 'S');
    color(c); doc.text(text, x + w / 2, y + 3.45, { align: 'center', charSpace: 0.3 });
    return w;
  };

  P.header('WEBSITE AUDIT', site, '');
  P.blocks([
    ['Prepared for', P.clientBlock(q)],
    ['Prepared by', P.fromRows()],
    ['Details', [`Audited ${niceDate(a.date, 'long')}`, a.url, 'Free, no obligation']],
  ]);

  // At a glance: the overall score, the verdict in words, the summary, and the counts.
  const counts = (['high', 'medium', 'low'] as const).map((k) => [k, findings.filter((x) => x.impact === k).length] as const).filter(([, n]) => n);
  font(9.6);
  const summary = a.summary.trim() ? doc.splitTextToSize(clean(a.summary), CW - 58) as string[] : [];
  const boxH = Math.max(46, 24 + summary.length * 4.4 + 12);
  ensure(boxH + 4);
  doc.setFillColor(...SURFACE); doc.roundedRect(M, s.y, CW, boxH, 3, 3, 'F');
  const cx = M + 24, cy = s.y + boxH / 2 - 2;
  ring(cx, cy, 14, overall, 2.6);
  font(22, 'display'); color(overall === null ? MUTED : TONE[scoreTone(overall)]); doc.text(overall === null ? '–' : String(overall), cx, cy + 3.2, { align: 'center' });
  label('Overall', cx, cy + 21, MUTED, 'center');
  const tx = M + 48;
  label('At a glance', tx, s.y + 9);
  font(17, 'display'); color(INK); doc.text(clean(overall === null ? `Website audit for ${site}` : overall >= 90 ? 'In good shape, with a few quick wins' : overall >= 50 ? 'Solid, with clear room to improve' : 'Losing visitors it could keep'), tx, s.y + 17);
  let yy = s.y + 23.5;
  if (summary.length) { font(9.6); color(INK); doc.text(summary, tx, yy); yy += summary.length * 4.4 + 2; }
  if (counts.length || hours) {
    let px = tx;
    for (const [k, n] of counts) { px += pill(`${n} ${IMPACT[k].text}`, IMPACT[k].color, px, yy) + 3; }
    if (hours) { font(8.6); color(MUTED); doc.text(clean(`About ${hoursText(hours)} hrs to fix`), px + 1, yy + 3.6); }
  }
  s.y += boxH + 4;

  // Scores: four rings with the number inside and the rating below.
  if (AUDIT_SCORES.some((x) => a.scores[x.id] !== null)) {
    heading('Scores', 44);
    const colW = CW / 4;
    ensure(36);
    AUDIT_SCORES.forEach((x, i) => {
      const v = a.scores[x.id];
      const ccx = M + colW * i + colW / 2, ccy = s.y + 11;
      ring(ccx, ccy, 10, v, 2);
      font(16, 'display'); color(v === null ? LIGHT : TONE[scoreTone(v)]); doc.text(v === null ? '–' : String(v), ccx, ccy + 2.3, { align: 'center' });
      font(9, 'bold'); color(INK); doc.text(clean(x.label), ccx, ccy + 17, { align: 'center' });
      font(8.2); color(v === null ? MUTED : TONE[scoreTone(v)]); doc.text(clean(SCORE_BANDS[scoreTone(v)]), ccx, ccy + 21.5, { align: 'center' });
    });
    s.y += 36;
    paragraph('Mobile scores from Google PageSpeed Insights. 90 to 100 is good, 50 to 89 needs work, below 50 is poor.', 8.3, MUTED);
  }

  // Top priorities: the three findings that matter most, big and numbered.
  if (findings.length >= 2) {
    heading('Top priorities', 40);
    findings.slice(0, 3).forEach((x, i) => {
      font(10.2, 'bold');
      const issue = doc.splitTextToSize(clean(x.issue || x.fix), CW - 26) as string[];
      font(9.2);
      const fix = x.fix.trim() && x.issue.trim() ? doc.splitTextToSize(clean(x.fix), CW - 26) as string[] : [];
      const h = issue.length * 4.5 + fix.length * 4.1 + 6;
      ensure(h + 2);
      font(22, 'display'); color(INK); doc.text(String(i + 1).padStart(2, '0'), M, s.y + 8);
      font(10.2, 'bold'); color(INK); doc.text(issue, M + 16, s.y + 4.5);
      if (fix.length) { font(9.2); color(MUTED); doc.text(fix, M + 16, s.y + 4.5 + issue.length * 4.5); }
      s.y += h; if (i < Math.min(3, findings.length) - 1) { hr(s.y - 1.5, LINE, 0.1); s.y += 1.5; }
    });
  }

  // Every finding, by area, with its screenshot.
  if (findings.length) {
    heading('What I found', 30);
    let n = 0;
    for (const area of AUDIT_AREAS) {
      const items = findings.filter((x) => x.area === area.id);
      if (!items.length) continue;
      ensure(22);
      font(11, 'bold'); color(INK); doc.text(clean(area.label), M, s.y + 4);
      s.y += 6;
      if (area.why) { paragraph(area.why, 8.6, MUTED); }
      s.y += 1;
      for (const x of items) {
        n += 1;
        font(10, 'bold');
        const issue = doc.splitTextToSize(clean(x.issue || 'Finding'), CW - 40) as string[];
        font(9.2);
        const fix = x.fix.trim() ? doc.splitTextToSize(clean(`Fix: ${x.fix}`), CW - 40) as string[] : [];
        let img: { w: number; h: number } | null = null;
        if (x.image) {
          try {
            const pr = doc.getImageProperties(x.image);
            const w = Math.min(CW - 12, (pr.width / pr.height) * 80);
            img = { w, h: (w / pr.width) * pr.height };
          } catch { img = null; }
        }
        const textH = 7 + issue.length * 4.6 + fix.length * 4.2 + 2;
        const h = textH + (img ? img.h + 5 : 0) + 3;
        ensure(Math.min(h, 200) + 2);
        doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.roundedRect(M, s.y, CW, h, 2.5, 2.5, 'S');
        font(8, 'bold'); color(MUTED); doc.text(String(n).padStart(2, '0'), M + 6, s.y + 6.8);
        pill(IMPACT[x.impact].text, IMPACT[x.impact].color, M + 15, s.y + 3.3);
        if (x.hours) { font(8.4); color(MUTED); doc.text(clean(`~${hoursText(x.hours)} hrs to fix`), W - M - 6, s.y + 6.8, { align: 'right' }); }
        font(10, 'bold'); color(INK); doc.text(issue, M + 6, s.y + 13.2);
        if (fix.length) { font(9.2); color(MUTED); doc.text(fix, M + 6, s.y + 13.2 + issue.length * 4.6); }
        if (img && x.image) {
          const iy = s.y + textH + 3;
          doc.addImage(x.image, 'JPEG', M + 6, iy, img.w, img.h);
          doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.rect(M + 6, iy, img.w, img.h, 'S');
        }
        s.y += h + 3;
      }
      s.y += 2;
    }
  }

  // Fixing it: the work in order, the estimate, and an offer to do it.
  if (hours) {
    heading('Fixing it', 50);
    P.tableBar([['Fix', M + 4, 'left'], ['Impact', W - M - 34, 'right'], ['Hours', W - M - 4, 'right']]);
    for (const x of findings) {
      font(9.3);
      const lines = doc.splitTextToSize(clean(x.fix || x.issue), CW - 52) as string[];
      ensure(lines.length * 4.2 + 4);
      color(INK); doc.text(lines, M + 4, s.y + 3.6);
      font(8.2, 'bold'); color(IMPACT[x.impact].color); doc.text(x.impact === 'high' ? 'High' : x.impact === 'medium' ? 'Medium' : 'Low', W - M - 34, s.y + 3.6, { align: 'right' });
      font(9.3); color(INK); doc.text(hoursText(x.hours), W - M - 4, s.y + 3.6, { align: 'right' });
      s.y += lines.length * 4.2 + 2.6; hr(s.y, LINE, 0.1); s.y += 1.6;
    }
    s.y += 1;
    P.totalBar('Estimated', `${hoursText(hours)} hrs · ${money(hours * q.settings.rate)}`);
    // The offer, on an ink panel.
    font(9.6);
    const offer = doc.splitTextToSize(clean(`Reply to this email for a fixed quote. The work is done in the order above, so the biggest wins come first. Or share this report with your own team: the findings are yours to keep.`), CW - 16) as string[];
    const oh = 16 + offer.length * 4.4 + 9;
    ensure(oh + 2);
    s.y += 3;
    doc.setFillColor(...INK); doc.roundedRect(M, s.y, CW, oh, 3, 3, 'F');
    font(16, 'display'); color(WHITE); doc.text('WANT THESE FIXED?', M + 8, s.y + 11);
    font(9.6); color(LIGHT); doc.text(offer, M + 8, s.y + 18);
    font(9.2, 'bold'); color(WHITE); doc.text(clean([profile.email, profile.website].filter(Boolean).join('   ·   ')), M + 8, s.y + oh - 5.5);
    s.y += oh + 2;
  }
  P.footer(`Website audit · ${site}`);
  doc.setProperties({ title: `Website audit ${site} — ${profile.name}`, subject: `Website audit for ${site}`, author: profile.name });
  return { doc, filename: `website-audit-${slug(site)}.pdf` };
}

/* ---------- Kick-off pack ---------- */

export async function buildKickoffPdf(q: QuoteState, profile: Profile) {
  const P = makeDoc(profile);
  const { doc, s, color, font, paragraph, heading, bullets } = P;
  const money = (n: number) => clean(formatMoney(n, q.settings.currency));
  const o = billedOption(q);
  const d = datedPlan(q, o);
  const first = (q.client.name || '').split(/\s+/)[0] || 'there';
  P.header('KICK-OFF PACK', q.meta.number);
  P.blocks([
    ['Client', P.clientBlock(q)],
    ['Your team', [profile.name, profile.email, o.team > 1 ? `Plus ${o.team - 1} developer${o.team > 2 ? 's' : ''}` : 'Lead developer']],
    ['Key dates', [q.delivery.kickoff ? `Kick-off ${niceDate(q.delivery.kickoff, 'long')}` : 'Kick-off date to confirm', d ? `Launch around ${niceDate(d.launch, 'long')}` : '']],
  ]);
  paragraph(`Hi ${first}, thank you for choosing to work with ${profile.name}. This pack sets out the plan: the timeline, payments, what we’ll need from you, and how we’ll work together. Keep it handy for the project.`, 10, INK);

  heading('The project');
  if (q.project.title) { font(12, 'bold'); color(INK); doc.text(clean(q.project.title), M, s.y + 4); s.y += 7.5; }
  if (q.project.summary) paragraph(q.project.summary, 9.5, MUTED);
  paragraph(`${q.options.length > 1 ? `${o.name}: ` : ''}${optionKind(o)}. Project total ${money(optionTotals(q, o).total + approvedChanges(q).reduce((t, c) => t + changeTotals(q, c).total, 0))}.`, 9.5, INK);

  if (d) { heading('Timeline', 40); P.datedTable(q, o); }

  if (q.schedule.length) {
    heading('Payments', 30);
    q.schedule.forEach((m, i) => {
      const due = milestoneDate(q, o, m);
      font(9.5, 'bold'); color(INK); doc.text(String(i + 1).padStart(2, '0'), M, s.y + 3.5);
      font(9.5); doc.text(clean(m.label), M + 10, s.y + 3.5);
      color(MUTED); doc.text(clean(due ? `about ${niceDate(due)}` : ''), M + 110, s.y + 3.5);
      font(9.5, 'bold'); color(INK); doc.text(money((optionTotals(q, o).total * m.percent) / 100), W - M, s.y + 3.5, { align: 'right' });
      s.y += 7;
    });
    const changes = approvedChanges(q);
    if (changes.length) paragraph(`Plus ${changes.length === 1 ? `change order ${changes[0].number}` : `${changes.length} approved change orders`} (${money(changes.reduce((t, c) => t + changeTotals(q, c).total, 0))}), invoiced separately.`, 9, MUTED);
    P.payment();
  }

  if (q.needs.length) {
    heading('What we need from you', 30);
    paragraph('Please tick these off as you send them. Items needed by kick-off help us start on time.', 9, MUTED);
    s.y += 1;
    P.needsList(q, o, true);
  }

  heading('How we’ll work together', 40);
  const revisions = o.lines.filter((l) => l.revisions && !l.optional).map((l) => `${l.title}: ${l.revisions} round${l.revisions === 1 ? '' : 's'}`);
  bullets([
    `We’ll talk by ${q.delivery.channel || 'email'}. ${q.delivery.updates || 'You’ll get regular progress updates.'}`,
    'Please reply to questions and previews within about two business days, so the timeline holds.',
    ...(revisions.length ? [`Revisions included: ${revisions.join('; ')}.`] : []),
    'New requests outside the agreed scope are welcome. They’re quoted as a change order first, so you always know the cost and timing.',
    'Share logins through each platform’s invite feature or a password manager, never by email.',
  ]);

  heading('Next steps', 30);
  bullets([
    'Pay the deposit invoice. Work starts on the kick-off date once it’s received.',
    'Send the kick-off items on the checklist above.',
    'We’ll have a short kick-off call to confirm goals, pages and priorities.',
  ]);
  P.footer(`Kick-off pack ${q.meta.number}`);
  doc.setProperties({ title: `Kick-off pack ${q.meta.number} — ${profile.name}`, subject: q.project.title || 'Kick-off pack', author: profile.name });
  return { doc, filename: `kickoff-pack-${q.meta.number.toLowerCase()}-${slug(q.client.company || q.client.name)}.pdf` };
}

/* ---------- Handover ---------- */

/** opts: the retainer made from this project (its plan is described), or your package prices (to suggest one). */
export async function buildHandoverPdf(q: QuoteState, profile: Profile, opts: { retainer?: QuoteState; prices?: PackagePrices } = {}) {
  const P = makeDoc(profile);
  const { doc, paragraph, heading, bullets } = P;
  const money = (n: number) => clean(formatMoney(n, q.settings.currency));
  const o = billedOption(q);
  const end = warrantyEnd(q);
  P.header('HANDOVER', q.meta.number);
  P.blocks([
    ['Client', P.clientBlock(q)],
    ['From', P.fromRows()],
    ['Key dates', [q.delivery.launchedOn ? `Launched ${niceDate(q.delivery.launchedOn, 'long')}` : 'Launch date to confirm', end ? `Bug-fix period until ${niceDate(end, 'long')}` : '']],
  ]);
  paragraph(`${q.project.title ? `${q.project.title} is` : 'Your project is'} live. This document lists what was built, where everything is, and what happens next.`, 10, INK);

  heading('What was built');
  const built = [...o.lines.filter((l) => !l.optional && !['pm', 'team', 'team-premium', 'discovery'].includes(l.id)).map((l) => l.title), ...approvedChanges(q).map((c) => `${c.title || 'Extra work'} (change order ${c.number})`)];
  bullets(built);

  const links = [q.delivery.liveUrl ? `Live website: ${q.delivery.liveUrl}` : '', q.delivery.adminUrl ? `Admin login: ${q.delivery.adminUrl}` : '', ...listOf(q.delivery.links)].filter(Boolean);
  if (links.length) { heading('Key links'); bullets(links); }

  const access = listOf(q.delivery.access);
  heading('Accounts & access');
  if (access.length) bullets(access);
  paragraph('You own every account. Now that the project is finished, change any passwords that were shared during the build, and remove access for anyone who no longer needs it.', 9, MUTED);

  heading('Bug-fix period');
  paragraph(end
    ? `Until ${niceDate(end, 'long')}, any bugs in the work delivered are fixed free of charge. Just send a short description and a screenshot. New features or changes after launch are quoted separately.`
    : 'For the agreed period after launch, any bugs in the work delivered are fixed free of charge. New features or changes are quoted separately.', 9.5, INK);

  if (q.delivery.notes.trim()) { heading('Notes'); paragraph(q.delivery.notes.trim(), 9.5, INK); }

  heading('Ongoing support');
  const R = opts.retainer;
  if (R?.retainer) {
    const plan = R.retainer.pkg === 'custom' ? 'monthly support' : `${packageOf(R.retainer.pkg).name} support plan`;
    paragraph(R.status === 'accepted'
      ? `Your ${plan} (quotation ${R.meta.number}) starts on ${niceDate(R.retainer.start, 'long')}: ${hoursText(retainerPlan(R).hours)} hours a month for updates, fixes and improvements. Send requests any time.`
      : `The quotation for ongoing support (${R.meta.number}) covers a ${plan} with ${hoursText(retainerPlan(R).hours)} hours a month, starting ${niceDate(R.retainer.start, 'long')}. Reply to start it.`, 9.5, INK);
  } else if (opts.prices) {
    paragraph(`For help after the bug-fix period (updates, new pages, improvements), monthly support plans start at ${money(opts.prices.basic)} for 20 hours a month. Medium, with 40 hours for ${money(opts.prices.medium)} a month, is the most popular. Just reply and I’ll send the details.`, 9.5, INK);
  } else {
    paragraph('If you’d like help after the bug-fix period, for updates, new pages or improvements, a monthly support retainer is available. Just reply to ask.', 9.5, INK);
  }
  paragraph(`Thank you for working with ${profile.name}.`, 10, INK);
  P.footer(`Handover ${q.meta.number}`);
  doc.setProperties({ title: `Handover ${q.meta.number} — ${profile.name}`, subject: q.project.title || 'Handover', author: profile.name });
  return { doc, filename: `handover-${q.meta.number.toLowerCase()}-${slug(q.client.company || q.client.name)}.pdf` };
}

/* ---------- Retainer usage report ---------- */

export async function buildUsageReportPdf(q: QuoteState, monthStart: string, profile: Profile) {
  const P = makeDoc(profile);
  const { doc, s, color, font, ensure, hr, paragraph, heading } = P;
  const r = q.retainer!;
  const money = (n: number) => clean(formatMoney(n, q.settings.currency));
  const months = retainerMonths(q, monthStart);
  const m = months.find((x) => x.start === monthStart);
  if (!m) throw new Error('That month is outside the retainer');
  const number = `${q.meta.number}-${String(m.index + 1).padStart(2, '0')}`;
  const first = (q.client.name || '').split(/\s+/)[0] || 'there';
  P.header('SUPPORT REPORT', number);
  P.blocks([
    ['Client', P.clientBlock(q)],
    ['From', P.fromRows()],
    ['Period', [m.label, `${niceDate(m.start, 'long')} to ${niceDate(m.end, 'long')}`, `Retainer ${q.meta.number}`]],
  ]);
  const lapsed = m.end < today() && m.remaining > 0 && m.expired >= m.remaining;
  P.figureBox('HOURS USED', `${hoursText(m.used)} of ${hoursText(m.available)}`, m.over ? 'EXTRA HOURS' : lapsed ? 'UNUSED, EXPIRED' : 'HOURS LEFT', m.over ? `${hoursText(m.over)} hrs` : `${hoursText(m.remaining)} hrs`);
  paragraph(`Hi ${first}, here’s what was done on ${q.project.title ? q.project.title.replace(/: [\w ]*support$/i, '') : 'your website'} this month, and how the hours were used.`, 10, INK);

  heading('Work done', 30);
  if (!m.entries.length) paragraph('No work was logged this month.', 9.5, MUTED);
  else {
    font(7.5, 'bold'); color(MUTED);
    doc.text('DATE', M, s.y); doc.text('WORK', M + 28, s.y); doc.text('HOURS', W - M, s.y, { align: 'right' });
    s.y += 2.5; hr(s.y, INK, 0.2); s.y += 2;
    for (const e of m.entries) {
      font(9.5);
      const lines = doc.splitTextToSize(clean(`${e.task || 'Support work'}${e.emergency ? ' (weekend emergency, included)' : ''}`), CW - 50) as string[];
      ensure(lines.length * 4 + 4);
      color(MUTED); doc.text(clean(niceDate(e.date)), M, s.y + 3.5);
      color(INK); doc.text(lines, M + 28, s.y + 3.5);
      font(9.5, 'bold'); doc.text(hoursText(e.hours), W - M, s.y + 3.5, { align: 'right' });
      s.y += lines.length * 4 + 2.5; hr(s.y, LINE, 0.1); s.y += 1.5;
    }
    font(10, 'bold'); color(INK); ensure(8);
    doc.text('Total', W - M - 30, s.y + 4.5, { align: 'right' }); doc.text(`${hoursText(m.used + m.emergency)} hrs`, W - M, s.y + 4.5, { align: 'right' });
    s.y += 9;
  }

  heading('Hours this month', 40);
  const row = (label: string, value: string, strong = false) => {
    ensure(7);
    font(strong ? 10.5 : 9.5, strong ? 'bold' : 'normal'); color(strong ? INK : MUTED);
    doc.text(clean(label), M, s.y + 4); color(INK); doc.text(clean(value), W - M, s.y + 4, { align: 'right' });
    s.y += strong ? 7.5 : 6.5;
  };
  row(r.dailyHours ? `Hours this month (${hoursText(r.dailyHours)} a day × ${hoursText(m.included / r.dailyHours)} working days)` : 'Monthly hours', `${hoursText(m.included)} hrs`);
  if (m.carried) row(r.rolloverMode === 'bank' ? 'Banked from earlier months' : 'Carried from last month', `+${hoursText(m.carried)} hrs`);
  row(m.emergency ? 'Used (weekend emergencies not counted)' : 'Used', `${hoursText(m.used)} hrs`);
  doc.setDrawColor(...INK); doc.setLineWidth(0.3); doc.line(M, s.y, W - M, s.y); s.y += 1;
  if (m.over) row('Extra hours', `${hoursText(m.over)} hrs`, true);
  else row('Left this month', `${hoursText(m.remaining)} hrs`, true);
  // Reports are usually sent at the end of the month; mid-month, unused hours haven't expired yet.
  const gone = m.end < today() ? 'have expired' : 'expire at the end of the month';
  const unused = r.rolloverMode === 'bank'
    ? m.expired ? `This was the last month of the ${r.bankMonths}-month hour bank, so the ${hoursText(m.expired)} unused hours ${gone}. A new bank starts next month.` : `${hoursText(m.carryNext)} unused hours stay in your hour bank until ${niceDate(m.bankEnd, 'long')}.`
    : r.rolloverMode === 'next' && r.rollover
      ? `${m.carryNext ? `${hoursText(m.carryNext)} unused hours carry into next month` : 'No unused hours carry into next month'} (up to ${hoursText(r.rollover)} hours can carry over).${m.expired ? ` The other ${hoursText(m.expired)} ${gone}.` : ''}`
      : `Unused hours don’t carry over${m.remaining ? `, so the ${hoursText(m.remaining)} unused hours ${gone}` : ''}.`;
  if (!m.over) paragraph(unused, 9, MUTED);
  else paragraph(`The extra ${hoursText(m.over)} hours, approved during the month, are billed at ${money(r.overageRate)} an hour (${money(m.over * r.overageRate)}) on the next invoice.`, 9, INK);
  if (m.emergency) paragraph(`Plus ${hoursText(m.emergency)} hours of weekend emergency work, included in your plan at no extra charge.`, 9, INK);

  heading('Next month', 24);
  const plan = retainerPlan(q);
  const next = addDays(m.end, 1);
  // A daily package's next month includes its own Monday-to-Friday days.
  const nextHours = r.dailyHours ? r.dailyHours * weekdays(next, addDays(addMonths(r.start, m.index + 2), -1)) : plan.hours;
  paragraph(r.endedOn && r.endedOn <= m.end
    ? `The retainer ended on ${niceDate(r.endedOn, 'long')}. Thank you for working with ${profile.name}.`
    : `The next month starts on ${niceDate(next, 'long')} with ${hoursText(nextHours + (m.over ? 0 : m.carryNext))} hours available. Send requests any time, and let me know what matters most so the hours go to the right things.`, 9.5, INK);
  P.footer(`Support report ${number}`);
  doc.setProperties({ title: `Support report ${number} — ${profile.name}`, subject: `${q.project.title || 'Support'} · ${m.label}`, author: profile.name });
  return { doc, filename: `support-report-${number.toLowerCase()}-${slug(q.client.company || q.client.name)}.pdf` };
}

/* ---------- Support packages ---------- */

interface PackagesPdfOptions {
  /** Monthly price per package. */
  prices: Record<PackageId, number>;
  currency: string;
  client?: QuoteState;
  recommended?: PackageId;
  /** Hours for a Custom package. */
  customHours?: number;
  /** Pay-as-you-go hourly rate the plans are compared with (0 = no comparison). */
  payg: number;
  /** Months free when paying yearly (0 = no yearly offer). */
  freeMonths: number;
  /** Leave hourly rates off the PDF (monthly prices only). */
  hideRates: boolean;
  /** Only this package (a single-package PDF), instead of all of them. */
  only?: PackageId;
  /** Covered / not covered lists to use instead of the package's (e.g. a retainer quote's edited lists). */
  lists?: { included: string[]; excluded: string[] };
  /** A monthly discount for the single package. */
  discount?: number;
}

/**
 * Support packages: either every package (comparison, then one page each) or a single package in full.
 * Prices are monthly; savings compare with pay-as-you-go, and a yearly prepay offer is shown when set.
 */
export async function buildPackagesPdf(o: PackagesPdfOptions, profile: Profile) {
  const P = makeDoc(profile);
  const { doc, s, color, font, ensure, hr, label, paragraph, heading, subhead, bullets } = P;
  const money = (n: number) => clean(formatMoney(n, o.currency));
  const date = today();
  const free = Math.max(0, Math.min(11, Math.round(o.freeMonths) || 0));
  const hoursOf = (id: PackageId) => packageHours(packageOf(id), o.customHours ?? 20);
  const fee = (id: PackageId) => o.prices[id] ?? 0;
  const rateOf = (id: PackageId) => (hoursOf(id) ? fee(id) / hoursOf(id) : 0);
  const saved = (id: PackageId, price = fee(id)) => (o.payg ? planSavings(hoursOf(id), price, o.payg) : 0);
  const hoursLabel = (id: PackageId) => { const p = packageOf(id); return p.daily ? `${p.daily} hrs a day, Mon–Fri` : `${hoursText(hoursOf(id))} hrs a month`; };
  const reply = (id: PackageId) => (id === 'basic' ? 'Within 1 business day' : id === 'medium' ? 'Same business day' : id === 'large' ? 'Within 4 business hours' : id === 'vip' ? 'Within 1 hour' : 'Within 1 business day');
  const included = (id: PackageId) => (id === 'custom' ? RETAINER_INCLUDED_PDF : packageIncluded(packageOf(id)));
  const excluded = (id: PackageId) => (id === 'custom' ? RETAINER_EXCLUDED_PDF : packageOf(id).cant);
  /** "Pay-as-you-go for these hours would be $600 — you save $51 a month." and the yearly offer. */
  const valueLines = (id: PackageId, price = fee(id)) => {
    const sv = saved(id, price);
    const lines: string[] = [];
    if (sv) lines.push(`Pay-as-you-go for the same hours would be ${money(hoursOf(id) * o.payg)} a month. On this plan you save ${money(sv)} every month.`);
    else lines.push(`That’s about ${money(Math.round(price / 30))} a day for a website that’s looked after.`);
    if (free) lines.push(`Prefer to pay yearly? ${money(yearlyPrice(price, free))} for 12 months, with ${free} month${free === 1 ? '' : 's'} free.`);
    return lines;
  };

  const emergencies = () => {
    heading('Weekend emergencies', 60);
    paragraph('VIP includes urgent help on Saturdays, Sundays and public holidays, at no extra charge. Call or message, and the problem is looked at straight away.', 9.5, INK);
    const colW = (CW - 10) / 2;
    ensure(40);
    const top = s.y + 1;
    label('An emergency', M, top + 3); label('Not an emergency (waits until Monday)', M + colW + 10, top + 3);
    const a = P.markList(EMERGENCY_EXAMPLES.yes, true, M, colW, top + 6.5);
    const b = P.markList(EMERGENCY_EXAMPLES.no, false, M + colW + 10, colW, top + 6.5);
    s.y = Math.max(a, b) + 2;
  };
  const howItWorks = () => {
    heading(o.only ? 'How it works' : 'How every package works', 60);
    bullets([
      free ? `Billed monthly in advance, or yearly in advance with ${free} month${free === 1 ? '' : 's'} free. Work starts once the first payment is received.` : 'Billed monthly in advance. Work starts once the first month is paid.',
      'Unused hours don’t carry over to the next month. An hour bank (unused hours kept for 3 months) is available for 20% more.',
      `You’ll hear when about 80% of the month’s hours are used. Extra hours are only worked after you approve them${o.payg && !o.hideRates ? `, at ${money(o.payg)} an hour,` : ''} and are billed on the next invoice.`,
      'Requests go to one shared place (an email thread or task board), so nothing is missed.',
      'A short report every month: what was done and the hours used.',
      'Minimum term of 3 months, then month to month. Either side can end it with 30 days’ written notice.',
      'Share logins through each platform’s invite feature or a password manager, never by email.',
    ]);
  };

  // ----- One package -----
  if (o.only) {
    const p = packageOf(o.only);
    const id = p.id;
    const discount = Math.min(fee(id), o.discount ?? 0);
    const price = fee(id) - discount;
    const sv = saved(id, price);
    const name = id === 'custom' ? 'Monthly support' : `${p.name} support`;
    P.header(clean(name.toUpperCase()), niceDate(date, 'long'), '');
    P.blocks([
      ['Prepared for', o.client ? P.clientBlock(o.client) : ['Your business']],
      ['From', P.fromRows()],
      ['Details', [o.hideRates ? 'Monthly plan' : `${money(rateOf(id))} an hour`, `Valid for 30 days from ${niceDate(date, 'long')}`, p.popular ? 'Our most popular plan' : '']],
    ]);
    font(24, 'display'); color(INK); doc.text(clean(name.toUpperCase()), M, s.y + 7); s.y += 11;
    paragraph(id === 'custom' ? 'A set number of hours each month for updates, fixes and improvements to your website.' : p.tagline, 10.5, MUTED);
    s.y += 2;
    // Dark card: the price and three facts
    const h = 36;
    ensure(h + 4);
    doc.setFillColor(...INK); doc.roundedRect(M, s.y, CW, h, 3.5, 3.5, 'F');
    label(p.popular ? 'Monthly price · most popular' : 'Monthly price', M + 8, s.y + 9, LIGHT);
    font(36, 'display'); color(WHITE); doc.text(money(price), M + 8, s.y + 24);
    const amountW = doc.getTextWidth(money(price));
    font(10, 'bold'); color(LIGHT); doc.text('/ month', M + 10 + amountW, s.y + 24);
    font(8.3); color(LIGHT); doc.text(clean([discount ? `${money(fee(id))} − ${money(discount)} discount` : '', 'billed monthly in advance', free ? `or ${money(yearlyPrice(price, free))} a year` : ''].filter(Boolean).join(' · ')), M + 8, s.y + 30.5);
    const facts: [string, string][] = [
      ['Hours', hoursLabel(id)],
      ['Replies', reply(id)],
      p.emergency ? ['Weekends', 'Emergencies included'] : sv ? ['You save', `${money(sv)} a month`] : o.hideRates ? ['Reports', 'Every month'] : ['Rate', `${money(rateOf(id))} an hour`],
    ];
    const fx = M + CW * 0.5;
    const fw = (CW * 0.5 - 8) / 3;
    facts.forEach(([k, v], i) => {
      const x = fx + i * fw;
      doc.setDrawColor(70, 70, 70); doc.setLineWidth(0.2); doc.line(x - 3, s.y + 7, x - 3, s.y + h - 7);
      label(k, x, s.y + 9, LIGHT);
      font(9.6, 'bold'); color(WHITE); doc.text(doc.splitTextToSize(clean(v), fw - 4) as string[], x, s.y + 15.5);
    });
    s.y += h + 4;
    paragraph(`${p.response.replace(/\.$/, '')}.`, 9.5, INK);
    for (const line of valueLines(id, price)) paragraph(line, 9.5, INK);
    heading('What’s included', 40);
    s.y = P.markList(o.lists?.included.length ? o.lists.included : included(id), true, M, CW, s.y, true) + 2;
    heading('Not included', 40);
    s.y = P.markList(o.lists?.excluded.length ? o.lists.excluded : excluded(id), false, M, CW, s.y, true) + 2;
    if (p.emergency) emergencies();
    howItWorks();
    heading('Next step', 26);
    paragraph(`Reply to go ahead with ${name}${free ? ', and say whether you’d like to pay monthly or yearly' : ''}. A short quotation with the start date follows, and the first invoice once you accept.`, 9.5, INK);
    P.footer(name);
    doc.setProperties({ title: `${name} — ${profile.name}`, subject: 'Monthly support', author: profile.name });
    return { doc, filename: `${slug(name)}${o.client ? `-${slug(o.client.client.company || o.client.client.name)}` : ''}.pdf` };
  }

  // ----- All packages -----
  const packages = PACKAGES.filter((p) => p.id !== 'custom');
  P.header('SUPPORT PACKAGES', niceDate(date, 'long'), '');
  P.blocks([
    ['Prepared for', o.client ? P.clientBlock(o.client) : ['Your business']],
    ['From', P.fromRows()],
    ['Details', ['Monthly plans', `Valid for 30 days from ${niceDate(date, 'long')}`, o.recommended && o.recommended !== 'custom' ? `Recommended: ${packageOf(o.recommended).name}` : '']],
  ]);
  font(24, 'display'); color(INK); doc.text('MONTHLY SUPPORT', M, s.y + 7); s.y += 11;
  paragraph('Monthly support keeps your website fast, secure and improving after launch. Pick the plan that matches how much help you need. You can move up or down a plan with a month’s notice.', 10, MUTED);

  heading('Compare the plans', 54);
  const showRate = !o.hideRates;
  const cols = showRate
    ? { name: M + 4, hours: M + 27, rate: M + 72, fee: M + 96, save: M + 118, reply: M + 123, weekends: W - M - 4 }
    : { name: M + 4, hours: M + 30, rate: 0, fee: M + 84, save: M + 108, reply: M + 116, weekends: W - M - 4 };
  P.tableBar([
    ['Plan', cols.name, 'left'], ['Hours', cols.hours, 'left'], ...(showRate ? [['Rate', cols.rate, 'right'] as [string, number, 'right']] : []),
    ['Price / month', cols.fee, 'right'], ['You save', cols.save, 'right'], ['Replies', cols.reply, 'left'], ['Weekends', cols.weekends, 'right'],
  ]);
  for (const p of packages) {
    const rec = p.id === o.recommended;
    ensure(12);
    const rowH = p.popular ? 11 : 8.5;
    if (rec) { doc.setFillColor(...SURFACE); doc.roundedRect(M, s.y, CW, rowH, 2, 2, 'F'); }
    font(10, 'bold'); color(INK); doc.text(clean(p.name), cols.name, s.y + 5.6);
    if (rec) { const nw = doc.getTextWidth(p.name); doc.setFillColor(...GREEN); doc.circle(cols.name + nw + 2.4, s.y + 4.4, 1, 'F'); }
    if (p.popular) { font(6.3, 'bold'); color(GREEN); doc.text('MOST POPULAR', cols.name, s.y + 9.2, { charSpace: 0.3 }); }
    font(9); color(INK); doc.text(clean(hoursLabel(p.id)), cols.hours, s.y + 5.6);
    if (showRate) { color(MUTED); doc.text(`${money(rateOf(p.id))}/hr`, cols.rate, s.y + 5.6, { align: 'right' }); }
    font(9.6, 'bold'); color(INK); doc.text(money(fee(p.id)), cols.fee, s.y + 5.6, { align: 'right' });
    const sv = saved(p.id);
    font(9); color(sv ? GREEN : MUTED); doc.text(sv ? money(sv) : '-', cols.save, s.y + 5.6, { align: 'right' });
    font(8.6); color(MUTED); doc.text(clean(reply(p.id)), cols.reply, s.y + 5.6);
    color(p.emergency ? INK : MUTED); doc.text(p.emergency ? 'Emergencies incl.' : '-', cols.weekends, s.y + 5.6, { align: 'right' });
    s.y += rowH; hr(s.y, LINE, 0.1);
  }
  s.y += 3;
  paragraph([
    'Prices are per month, billed in advance.',
    o.payg ? 'Savings compare with paying the pay-as-you-go rate for the same hours.' : '',
    free ? `Pay yearly and get ${free} month${free === 1 ? '' : 's'} free.` : '',
    o.recommended && o.recommended !== 'custom' ? 'The green dot marks the plan recommended for you.' : '',
    `VIP is about ${packageHours(packageOf('vip'))} hours in an average month (8 hours × the working days in that month).`,
  ].filter(Boolean).join(' '), 8.5, MUTED);
  howItWorks();

  // One page per package, so its lists never split.
  for (const p of packages) {
    doc.addPage(); s.y = M + 4;
    heading(`${p.name}: ${p.tagline}`, 110);
    const stamp = p.id === o.recommended ? { text: 'RECOMMENDED', color: GREEN } : p.popular ? { text: 'MOST POPULAR', color: INK } : undefined;
    P.figureBox('PRICE / MONTH', money(fee(p.id)), showRate ? 'HOURS & RATE' : 'HOURS', showRate ? `${hoursLabel(p.id)} · ${money(rateOf(p.id))}/hr` : hoursLabel(p.id), stamp);
    s.y -= 4;
    paragraph(`${p.response.replace(/\.$/, '')}.`, 9.5, INK);
    for (const line of valueLines(p.id)) paragraph(line, 9.3, INK);
    s.y += 1;
    subhead('What’s included');
    if (p.builds) { font(9.5, 'bold'); color(INK); ensure(6); doc.text(clean(`Everything in ${packageOf(p.builds).name}, plus:`), M, s.y + 3); s.y += 6.5; }
    s.y = P.markList(p.can, true, M, CW, s.y, true) + 1;
    subhead('Not included');
    s.y = P.markList(p.cant, false, M, CW, s.y, true) + 1;
    if (p.emergency) emergencies();
  }
  heading('Next step', 26);
  paragraph(`Reply with the plan you’d like${o.recommended && o.recommended !== 'custom' ? ` (${packageOf(o.recommended).name} is recommended for you)` : ''}. A short quotation with the start date follows, and the first invoice once you accept.`, 9.5, INK);
  P.footer('Support packages');
  doc.setProperties({ title: `Support packages — ${profile.name}`, subject: 'Monthly support packages', author: profile.name });
  return { doc, filename: `support-packages${o.client ? `-${slug(o.client.client.company || o.client.client.name)}` : ''}.pdf` };
}

/* ---------- Save or preview ---------- */
type Built = Promise<{ doc: jsPDF; filename: string }>;
export async function download(built: Built) { const { doc, filename } = await built; doc.save(filename); }
export async function preview(built: Built) { const { doc, filename } = await built; return { url: URL.createObjectURL(doc.output('blob')), filename }; }
