// Builds the final quotation PDF from the quote page. Loaded only when "Download quotation (PDF)" is pressed.
import { jsPDF } from 'jspdf';
import type { Answers, Estimate } from '../data/estimator';
import { formatMoney, scopeRows, type PricingSettings, type QuoteLine } from '../data/pricing';
import { profile } from '../data/profile';

export interface QuoteInput {
  meta: { number: string; date: string; validDays: number; ref: string };
  client: { name: string; company: string; email: string; website: string };
  project: { title: string; summary: string; timeline: string };
  answers: Answers;
  settings: PricingSettings;
  pricing: { discount: number; discountType: 'percent' | 'amount'; tax: number; taxLabel: string };
  lines: QuoteLine[];
  schedule: { label: string; percent: number }[];
  text: { included: string; excluded: string; terms: string; note: string };
  monthly: boolean;
  totals: { subtotal: number; discount: number; tax: number; total: number; hours: number };
  estimate: Estimate;
}

const INK: [number, number, number] = [22, 22, 22];
const MUTED: [number, number, number] = [110, 110, 110];
const LINE: [number, number, number] = [214, 214, 214];
const SURFACE: [number, number, number] = [245, 245, 245];
const PHASE_COLORS: Record<string, [number, number, number]> = {
  discovery: [196, 205, 218], design: [238, 224, 222], build: [22, 22, 22], data: [205, 200, 232], content: [227, 218, 205], qa: [189, 192, 170],
};

// Standard PDF fonts only cover basic Latin, so swap characters they can't draw.
const clean = (text: string) => text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/→/g, '->').replace(/−/g, '-').replace(/(\d)½/g, '$1.5').replace(/½/g, '0.5').replace(/[^\x20-\x7E–—…· -ÿ]/g, '');
const listOf = (text: string) => text.split(/\r?\n/).map((l) => l.trim().replace(/^[-•*]\s*/, '')).filter(Boolean);

export async function downloadQuotePdf(q: QuoteInput) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const M = 18;
  const CW = W - M * 2;
  let y = M;
  const money = (n: number) => clean(formatMoney(n, q.settings.currency));
  const issued = new Date(`${q.meta.date || new Date().toISOString().slice(0, 10)}T00:00:00`);
  const valid = new Date(issued);
  valid.setDate(valid.getDate() + (Number(q.meta.validDays) || 30));
  const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const per = q.monthly ? ' / month' : '';

  const color = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (size: number, style: 'normal' | 'bold' = 'normal') => { doc.setFont('helvetica', style); doc.setFontSize(size); };
  const ensure = (h: number) => { if (y + h > H - 22) { doc.addPage(); y = M; } };
  const hr = (yy: number, c = LINE, w = 0.15) => { doc.setDrawColor(...c); doc.setLineWidth(w); doc.line(M, yy, W - M, yy); };
  const paragraph = (text: string, size = 9.5, c = INK, width = CW, x = M) => {
    font(size); color(c);
    const lines = doc.splitTextToSize(clean(text), width) as string[];
    const lh = size * 0.42;
    ensure(lines.length * lh + 1.6);
    doc.text(lines, x, y + lh * 0.8);
    y += lines.length * lh + 1.6;
  };
  let sectionNo = 0;
  const heading = (title: string, keep = 16) => {
    sectionNo += 1;
    ensure(keep);
    y += 6;
    font(8, 'bold'); color(MUTED); doc.text(String(sectionNo).padStart(2, '0'), M, y);
    font(13, 'bold'); color(INK); doc.text(clean(title), M + 9, y);
    y += 3.5; hr(y); y += 5;
  };
  const bullets = (items: string[]) => {
    for (const item of items) {
      font(9.5); color(INK);
      const lines = doc.splitTextToSize(clean(item), CW - 7) as string[];
      ensure(lines.length * 4 + 1.5);
      doc.setFillColor(...INK); doc.circle(M + 1.2, y + 2.4, 0.7, 'F');
      doc.text(lines, M + 5, y + 3.3);
      y += lines.length * 4 + 1.8;
    }
  };

  // Header
  font(22, 'bold'); color(INK); doc.text('GRANT DEV14', M, y + 7);
  font(8.5); color(MUTED); doc.text('Shopify, Webflow & WordPress developer', M, y + 12.5);
  font(20, 'bold'); color(INK); doc.text('QUOTATION', W - M, y + 7, { align: 'right' });
  font(8.5); color(MUTED);
  doc.text(clean(`No. ${q.meta.number}`), W - M, y + 12.5, { align: 'right' });
  y += 19;
  doc.setDrawColor(...INK); doc.setLineWidth(0.3); doc.line(M, y, W - M, y);
  doc.setFillColor(...INK); doc.circle(M, y, 0.9, 'F'); doc.circle(W - M, y, 0.9, 'F');
  y += 8;

  // Parties and key dates
  const colW = (CW - 8) / 3;
  const block = (x: number, title: string, rows: string[]) => {
    font(7.5, 'bold'); color(MUTED); doc.text(title.toUpperCase(), x, y);
    let yy = y + 5;
    rows.filter(Boolean).forEach((r, i) => { font(9.5, i === 0 ? 'bold' : 'normal'); color(i === 0 ? INK : MUTED); const ls = doc.splitTextToSize(clean(r), colW) as string[]; doc.text(ls, x, yy); yy += ls.length * 4.2; });
    return yy;
  };
  const clientRows = [q.client.company || q.client.name || 'Client', q.client.company && q.client.name ? q.client.name : '', q.client.email, q.client.website];
  const endA = block(M, 'Prepared for', clientRows);
  const endB = block(M + colW + 4, 'Prepared by', ['Grant Dev14', profile.email, 'Based in the Philippines']);
  const endC = block(M + (colW + 4) * 2, 'Details', [`Issued ${fmtDate(issued)}`, `Valid until ${fmtDate(valid)}`, q.meta.ref ? `Estimate ref ${q.meta.ref}` : '']);
  y = Math.max(endA, endB, endC) + 2;

  // Total at a glance
  ensure(24);
  doc.setFillColor(...SURFACE);
  doc.roundedRect(M, y, CW, 20, 3, 3, 'F');
  font(7.5, 'bold'); color(MUTED); doc.text(q.monthly ? 'MONTHLY TOTAL' : 'PROJECT TOTAL', M + 6, y + 7);
  font(20, 'bold'); color(INK); doc.text(`${money(q.totals.total)}${per}`, M + 6, y + 15.5);
  font(7.5, 'bold'); color(MUTED); doc.text('TIMELINE', M + CW / 2, y + 7);
  font(10.5, 'bold'); color(INK);
  doc.text(doc.splitTextToSize(clean(q.project.timeline || '—'), CW / 2 - 8) as string[], M + CW / 2, y + 13);
  y += 25;

  if (q.text.note.trim()) paragraph(q.text.note.trim(), 10, INK);

  // Project
  heading('Project');
  if (q.project.title) { font(12, 'bold'); color(INK); ensure(7); doc.text(clean(q.project.title), M, y + 4); y += 7.5; }
  if (q.project.summary) paragraph(q.project.summary, 9.5, MUTED);
  const rows = scopeRows(q.answers).filter(([label]) => label !== 'Notes');
  if (rows.length) {
    y += 1;
    for (const [label, value] of rows) {
      font(9.5);
      const lines = doc.splitTextToSize(clean(value), CW - 48) as string[];
      ensure(lines.length * 4 + 3);
      color(MUTED); doc.text(clean(label), M, y + 3.3);
      color(INK); doc.text(lines, M + 48, y + 3.3);
      y += lines.length * 4 + 2;
      hr(y, LINE, 0.1); y += 2;
    }
  }

  // Timeline
  const r = q.estimate;
  if (r.mode === 'weeks' && r.phases.length) {
    heading('Timeline', 40);
    paragraph(`${q.project.timeline || `${r.low}–${r.high} weeks`}. ${r.team > 1 ? `A team of ${r.team} developers works in parallel. ` : ''}Calendar time assumes feedback within about two business days.`, 9.5, MUTED);
    const total = r.phases.reduce((s, p) => s + p.weeks, 0) || 1;
    ensure(10);
    let x = M;
    const usable = CW - 0.8 * (r.phases.length - 1);
    for (const p of r.phases) { const w = (p.weeks / total) * usable; doc.setFillColor(...(PHASE_COLORS[p.id] ?? INK)); doc.roundedRect(x, y, Math.max(w, 1.5), 4.5, 1.2, 1.2, 'F'); x += w + 0.8; }
    y += 8;
    let lx = M;
    for (const p of r.phases) {
      const label = clean(`${p.label} ~${p.display}`);
      font(8.5); const w = doc.getTextWidth(label) + 9;
      if (lx + w > W - M) { lx = M; y += 5.5; }
      doc.setFillColor(...(PHASE_COLORS[p.id] ?? INK)); doc.roundedRect(lx, y - 2.6, 3, 3, 0.8, 0.8, 'F');
      color(INK); doc.text(label, lx + 4.5, y);
      lx += w;
    }
    y += 4;
  }

  // Pricing table
  heading('Pricing', 40);
  const cols = { item: M, hours: M + CW - 62, rate: M + CW - 38, amount: W - M };
  font(7.5, 'bold'); color(MUTED);
  doc.text('ITEM', cols.item, y); doc.text(q.monthly ? 'HRS / MO' : 'HOURS', cols.hours, y, { align: 'right' }); doc.text('RATE', cols.rate, y, { align: 'right' }); doc.text('AMOUNT', cols.amount, y, { align: 'right' });
  y += 2.5; hr(y, INK, 0.2); y += 2;
  q.lines.forEach((line) => {
    font(9.5, 'bold');
    const title = doc.splitTextToSize(clean(line.title), CW - 72) as string[];
    font(8.5);
    const detail = line.detail ? (doc.splitTextToSize(clean(line.detail), CW - 72) as string[]) : [];
    const h = title.length * 4.2 + detail.length * 3.7 + 3;
    ensure(h + 1);
    font(9.5, 'bold'); color(INK); doc.text(title, cols.item, y + 3.6);
    font(8.5); color(MUTED); if (detail.length) doc.text(detail, cols.item, y + 3.6 + title.length * 4.2);
    font(9.5); color(INK);
    doc.text(String(Math.round(line.hours * 100) / 100), cols.hours, y + 3.6, { align: 'right' });
    doc.text(money(line.rate), cols.rate, y + 3.6, { align: 'right' });
    font(9.5, 'bold'); doc.text(money(line.hours * line.rate), cols.amount, y + 3.6, { align: 'right' });
    y += h;
    hr(y, LINE, 0.1); y += 1.5;
  });
  // Totals
  const totalRow = (label: string, value: string, strong = false) => {
    ensure(8);
    font(strong ? 11 : 9.5, strong ? 'bold' : 'normal'); color(strong ? INK : MUTED);
    doc.text(clean(label), cols.rate, y + 4, { align: 'right' });
    color(INK); doc.text(value, cols.amount, y + 4, { align: 'right' });
    y += strong ? 8 : 6;
  };
  y += 1;
  totalRow('Subtotal', money(q.totals.subtotal));
  if (q.totals.discount) totalRow(`Discount${q.pricing.discountType === 'percent' ? ` (${q.pricing.discount}%)` : ''}`, `-${money(q.totals.discount)}`);
  if (q.totals.tax) totalRow(`${q.pricing.taxLabel || 'Tax'} (${q.pricing.tax}%)`, money(q.totals.tax));
  doc.setDrawColor(...INK); doc.setLineWidth(0.3); doc.line(cols.hours - 20, y, W - M, y); y += 1;
  totalRow(`Total${per}`, `${money(q.totals.total)}`, true);
  paragraph(q.monthly ? 'Billed monthly in advance. Hours can be adjusted month to month.' : 'Fixed price for the scope above. Any changes to the scope are quoted and agreed before work starts.', 8.5, MUTED);

  // Payment schedule
  if (q.schedule.length) {
    heading('Payment schedule', 30);
    q.schedule.forEach((m, i) => {
      ensure(8);
      font(9.5, 'bold'); color(INK); doc.text(String(i + 1).padStart(2, '0'), M, y + 3.5);
      font(9.5); doc.text(clean(m.label), M + 10, y + 3.5);
      color(MUTED); doc.text(`${m.percent}%`, cols.rate, y + 3.5, { align: 'right' });
      font(9.5, 'bold'); color(INK); doc.text(money((q.totals.total * m.percent) / 100), cols.amount, y + 3.5, { align: 'right' });
      y += 6; hr(y, LINE, 0.1); y += 1.5;
    });
  }

  const included = listOf(q.text.included);
  if (included.length) { heading('What’s included', 34); bullets(included); }
  const excluded = listOf(q.text.excluded);
  if (excluded.length) { heading('Not included', 34); bullets(excluded); }
  const terms = listOf(q.text.terms.replace(/\{validDays\}/g, String(q.meta.validDays || 30)));
  if (terms.length) { heading('Terms', 34); bullets(terms); }

  // Acceptance
  heading('Acceptance', 60);
  paragraph(`To accept this quotation, sign below or reply to confirm by email before ${fmtDate(valid)}. A deposit invoice follows, and the project is scheduled once it is paid.`, 9.5, MUTED);
  y += 6;
  ensure(30);
  const sigW = (CW - 10) / 2;
  for (const [i, who] of [[0, q.client.company || q.client.name || 'Client'], [1, 'Grant Dev14']] as [number, string][]) {
    const x = M + i * (sigW + 10);
    doc.setDrawColor(...INK); doc.setLineWidth(0.2);
    doc.line(x, y + 12, x + sigW, y + 12);
    font(8.5); color(MUTED); doc.text('Signature', x, y + 16.5);
    font(9.5, 'bold'); color(INK); doc.text(clean(who), x, y + 21.5);
    doc.line(x, y + 31, x + sigW * 0.55, y + 31);
    font(8.5); color(MUTED); doc.text('Date', x, y + 35.5);
  }
  y += 38;

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    hr(H - 14, LINE, 0.2);
    font(7.5); color(MUTED);
    doc.text(clean(`Grant Dev14  ·  ${profile.email}  ·  Quotation ${q.meta.number}`), M, H - 9);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 9, { align: 'right' });
  }

  doc.setProperties({ title: `Quotation ${q.meta.number} — Grant Dev14`, subject: q.project.title || 'Project quotation', author: 'Grant Dev14' });
  const who = (q.client.company || q.client.name || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  doc.save(`quotation-${q.meta.number.toLowerCase()}-${who}.pdf`);
}
