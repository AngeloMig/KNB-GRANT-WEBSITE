/**
 * Quote builder → tracker sync. Sends every quote, support plan, invoice (with payments), receipt, change order and audit
 * to the client's lead in the KNB Attendance Tracker (Inquiries → Documents), each with its PDF, so the tracker shows what
 * was quoted, invoiced and paid without typing anything twice.
 *
 * How it stays safe:
 * - You sign in with your own tracker account (email + password). Nothing secret is built into the site: the Supabase URL
 *   and anon key are public by design, and the tracker's access rules (managers of the company only) decide what's allowed.
 * - The sign-in lasts until the browser is closed, unless you tick "Remember on this device".
 * - Synced items are matched by the quote builder's own ids, so a change updates the same item instead of duplicating it.
 *   A PDF is rebuilt and uploaded only when its content changed.
 * - Quotes deleted here stay in the tracker (the tracker is the record of what was sent).
 */
import {
  billedOption,
  changeTotals,
  invoiceStatus,
  loadPackageSettings,
  loadProfile,
  loadQuotes,
  optionTotals,
  packageOf,
  paidTotal,
  retainerMonths,
  retainerPlan,
  type Profile,
  type QuoteState,
} from '../data/quote-model';

const SUPABASE_URL = ((import.meta.env.PUBLIC_TRACKER_SUPABASE_URL as string | undefined) ?? '').replace(/\/+$/, '');
const ANON_KEY = (import.meta.env.PUBLIC_TRACKER_SUPABASE_ANON_KEY as string | undefined) ?? '';
export const trackerConfigured = Boolean(SUPABASE_URL && ANON_KEY);

const SESSION_KEY = 'tracker-session-v1';
const SYNC_KEY = 'tracker-sync-v1';
const BUCKET = 'inquiry-pdfs';
/** Currencies the tracker stores (others sync without an amount). */
const TRACKER_CURRENCIES = ['USD', 'PHP', 'EUR', 'GBP', 'AUD'];

type Session = { access_token: string; refresh_token: string; expires_at: number; email: string; remember: boolean };
type DocKind = 'quote' | 'invoice' | 'support' | 'receipt' | 'other';
type DocStatus = 'draft' | 'sent' | 'paid' | 'void';
type Lead = { id: string; company_id: string; status: string };
type SyncRecord = {
  externalId: string;
  kind: DocKind;
  title: string;
  amount: number | null;
  paidAmount: number | null;
  currency: string;
  status: DocStatus;
  issuedOn: string | null;
  dueOn: string | null;
  paidOn: string | null;
  note: string | null;
  meta: Record<string, unknown> | null;
  /** Changes when the PDF would look different. */
  pdfHash: string;
  /** Changes when any synced field changes. */
  dataHash: string;
  fileName: string;
  pdf: () => Promise<Blob>;
};
type SyncState = { hashes: Record<string, string>; lastSync: number; lastError: string; synced: number; skipped: number };

/* ---------- storage ---------- */
const read = <T>(storage: Storage, key: string): T | null => { try { return JSON.parse(storage.getItem(key) || 'null') as T | null; } catch { return null; } };
const write = (storage: Storage, key: string, value: unknown) => { try { if (value === null) storage.removeItem(key); else storage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } };

function readSession(): Session | null {
  return read<Session>(sessionStorage, SESSION_KEY) ?? read<Session>(localStorage, SESSION_KEY);
}
function writeSession(session: Session | null) {
  write(sessionStorage, SESSION_KEY, null);
  write(localStorage, SESSION_KEY, null);
  if (session) write(session.remember ? localStorage : sessionStorage, SESSION_KEY, session);
}
const loadSync = (): SyncState => ({ hashes: {}, lastSync: 0, lastError: '', synced: 0, skipped: 0, ...(read<SyncState>(localStorage, SYNC_KEY) ?? {}) });
const saveSync = (s: SyncState) => write(localStorage, SYNC_KEY, s);

/* ---------- auth ---------- */
async function token(grant: 'password' | 'refresh_token', body: Record<string, string>, remember: boolean): Promise<Session> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=${grant}`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) throw new Error(json.error_description || json.msg || 'Sign-in failed. Check the email and password.');
  return { access_token: json.access_token, refresh_token: json.refresh_token, expires_at: json.expires_at ?? Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600), email: json.user?.email ?? body.email ?? '', remember };
}

export async function connect(email: string, password: string, remember: boolean) {
  const session = await token('password', { email, password }, remember);
  writeSession(session);
  // A different account starts a fresh sync.
  const s = loadSync();
  saveSync({ ...s, lastError: '' });
  return session;
}

export function disconnect() {
  const session = readSession();
  writeSession(null);
  if (session) void fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: 'POST', headers: { apikey: ANON_KEY, Authorization: `Bearer ${session.access_token}` } }).catch(() => undefined);
}

export const connectedAs = () => readSession()?.email ?? null;

async function accessToken(force = false): Promise<string> {
  let session = readSession();
  if (!session) throw new Error('Not connected to the tracker.');
  if (force || session.expires_at * 1000 - Date.now() < 60_000) {
    try {
      session = await token('refresh_token', { refresh_token: session.refresh_token }, session.remember);
      writeSession(session);
    } catch {
      writeSession(null);
      throw new Error('The tracker sign-in expired. Connect again.');
    }
  }
  return session.access_token;
}

async function api(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${await accessToken()}`, ...(init.headers ?? {}) },
  });
  if (res.status === 401 && retry) { await accessToken(true); return api(path, init, false); }
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || json.error || `Tracker error ${res.status}`);
  }
  return res;
}
const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });

/* ---------- what to send ---------- */
function hash(value: unknown): string {
  const text = JSON.stringify(value) ?? '';
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

const lastDate = (dates: string[]) => dates.filter(Boolean).sort().pop() ?? null;

async function blobOf(built: Promise<{ doc: { output: (type: 'blob') => Blob }; filename: string }>) {
  const { doc } = await built;
  return doc.output('blob');
}

function recordsFor(q: QuoteState, profile: Profile, hideRates: boolean): SyncRecord[] {
  const pdfs = () => import('./quote-pdf');
  const known = TRACKER_CURRENCIES.includes(q.settings.currency);
  const currency = known ? q.settings.currency : 'USD';
  const money = (n: number) => (known ? Math.round(n * 100) / 100 : null);
  const otherCurrency = known ? null : `Amounts are in ${q.settings.currency} (not stored in the tracker).`;
  const base = { profile, client: q.client, number: q.meta.number };
  const out: SyncRecord[] = [];
  const { invoices, changes, delivery, needs, savedAt, ...core } = q;
  void delivery; void needs; void savedAt;

  if (q.monthly && q.retainer) {
    const r = q.retainer;
    const plan = retainerPlan(q);
    const month = retainerMonths(q).at(-1);
    const status: DocStatus = r.endedOn || q.status === 'declined' ? 'void' : q.status === 'accepted' && r.start ? 'sent' : 'draft';
    const { log, ...terms } = r;
    out.push({
      externalId: `plan:${q.id}`, kind: 'support', currency, status,
      title: `Support plan — ${packageOf(r.pkg).name} · ${plan.hours} h a month`,
      amount: money(plan.fee), paidAmount: null,
      issuedOn: q.meta.date || null, dueOn: null, paidOn: null,
      note: otherCurrency ?? (r.endedOn ? `Ended ${r.endedOn}` : r.start ? `Started ${r.start}` : null),
      meta: month ? { month: month.label, hoursUsed: month.used, hoursAvailable: month.available, hoursOver: month.over, entries: log.length } : { entries: log.length },
      pdfHash: hash({ ...base, core: { ...core, retainer: terms } }),
      dataHash: hash({ status, fee: plan.fee, hours: plan.hours, used: month?.used, available: month?.available, endedOn: r.endedOn, start: r.start }),
      fileName: `${q.meta.number}-support-plan.pdf`,
      pdf: async () => blobOf((await pdfs()).buildQuotePdf(q, profile, { hideRates })),
    });
  } else {
    const totals = optionTotals(q, billedOption(q));
    const status: DocStatus = q.status === 'accepted' ? 'paid' : q.status === 'declined' ? 'void' : q.status === 'sent' ? 'sent' : 'draft';
    out.push({
      externalId: `quote:${q.id}`, kind: 'quote', currency, status,
      title: `Quote ${q.meta.number}${q.project.title ? ` — ${q.project.title}` : ''}`,
      amount: money(totals.total), paidAmount: null,
      issuedOn: q.meta.date || null, dueOn: null, paidOn: null, note: otherCurrency, meta: { option: billedOption(q).name, hours: totals.hours },
      pdfHash: hash({ ...base, core, hideRates }),
      dataHash: hash({ status, total: totals.total, title: q.project.title, date: q.meta.date }),
      fileName: `${q.meta.number}.pdf`,
      pdf: async () => blobOf((await pdfs()).buildQuotePdf(q, profile, { hideRates })),
    });
  }

  for (const inv of invoices) {
    const paid = paidTotal(inv);
    const status: DocStatus = invoiceStatus(inv) === 'paid' ? 'paid' : 'sent';
    out.push({
      externalId: `invoice:${q.id}:${inv.id}`, kind: 'invoice', currency: TRACKER_CURRENCIES.includes(inv.currency || q.settings.currency) ? (inv.currency || q.settings.currency) : currency, status,
      title: `Invoice ${inv.number}${inv.milestone ? ` — ${inv.milestone}` : ''}`,
      amount: money(inv.amount), paidAmount: money(paid),
      issuedOn: inv.issued || null, dueOn: inv.due || null, paidOn: status === 'paid' ? lastDate(inv.payments.map((p) => p.date)) : null,
      note: otherCurrency ?? (inv.payments.length ? inv.payments.map((p) => `${p.date}: ${p.amount}${p.method ? ` (${p.method})` : ''}`).join(' · ').slice(0, 1000) : null),
      meta: { payments: inv.payments.length },
      pdfHash: hash({ ...base, inv }),
      dataHash: hash({ status, amount: inv.amount, paid, due: inv.due, issued: inv.issued, payments: inv.payments }),
      fileName: `${inv.number}.pdf`,
      pdf: async () => blobOf((await pdfs()).buildInvoicePdf(q, inv, profile)),
    });
    for (const p of inv.payments) {
      if (!p.receipt) continue;
      out.push({
        externalId: `receipt:${q.id}:${inv.id}:${p.id}`, kind: 'receipt', currency: out[out.length - 1].currency, status: 'paid',
        title: `Receipt ${p.receipt} — ${inv.number}`,
        amount: money(p.amount), paidAmount: null, issuedOn: p.date || null, dueOn: null, paidOn: p.date || null,
        note: p.method ? `Paid by ${p.method}` : null, meta: null,
        pdfHash: hash({ ...base, inv: { number: inv.number, amount: inv.amount }, p }),
        dataHash: hash(p),
        fileName: `${p.receipt}.pdf`,
        pdf: async () => blobOf((await pdfs()).buildReceiptPdf(q, inv, p, profile)),
      });
    }
  }

  for (const c of changes) {
    if (c.status === 'draft') continue;
    const status: DocStatus = c.status === 'approved' ? 'paid' : c.status === 'declined' ? 'void' : 'sent';
    out.push({
      externalId: `change:${q.id}:${c.id}`, kind: 'other', currency, status,
      title: `Change order ${c.number}${c.title ? ` — ${c.title}` : ''}`,
      amount: money(changeTotals(q, c).total), paidAmount: null, issuedOn: c.date || null, dueOn: null, paidOn: null,
      note: otherCurrency ?? (c.days ? `Adds ${c.days} working day${c.days === 1 ? '' : 's'}` : null), meta: null,
      pdfHash: hash({ ...base, c }), dataHash: hash({ status, c }),
      fileName: `${q.meta.number}-${c.number}.pdf`,
      pdf: async () => blobOf((await pdfs()).buildChangeOrderPdf(q, c, profile)),
    });
  }

  if (q.audit) {
    out.push({
      externalId: `audit:${q.id}`, kind: 'other', currency, status: 'sent',
      title: `Website audit${q.client.website ? ` — ${q.client.website}` : ''}`,
      amount: null, paidAmount: null, issuedOn: q.meta.date || null, dueOn: null, paidOn: null, note: null, meta: null,
      pdfHash: hash({ ...base, audit: q.audit }), dataHash: hash({ audit: q.audit, website: q.client.website }),
      fileName: `${q.meta.number}-audit.pdf`,
      pdf: async () => blobOf((await pdfs()).buildAuditPdf(q, profile)),
    });
  }
  return out;
}

/* ---------- sending ---------- */
async function leadFor(q: QuoteState, cache: Map<string, Lead>): Promise<Lead> {
  const key = q.client.email.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  const res = await api('/rest/v1/rpc/find_or_create_lead_for_client', {
    method: 'POST',
    ...json({ p_email: key, p_name: q.client.name, p_company: q.client.company, p_website: q.client.website }),
  });
  const id = String(await res.json());
  const rows = await (await api(`/rest/v1/inquiries?select=id,company_id,status&id=eq.${encodeURIComponent(id)}`)).json();
  if (!rows[0]) throw new Error('The tracker lead could not be read.');
  const lead = rows[0] as Lead;
  cache.set(key, lead);
  return lead;
}

async function removeFile(path: string) {
  await api(`/storage/v1/object/${BUCKET}`, { method: 'DELETE', ...json({ prefixes: [path] }) }).catch(() => undefined);
}

async function upsertDocument(lead: Lead, r: SyncRecord, previous: string | undefined) {
  const found = (await (await api(`/rest/v1/inquiry_documents?select=id,inquiry_id,file_path&source=eq.quote_builder&company_id=eq.${lead.company_id}&external_id=eq.${encodeURIComponent(r.externalId)}`)).json())[0] as { id: string; inquiry_id: string; file_path: string | null } | undefined;
  const [prevPdf] = (previous ?? '').split('|');
  let existing = found;
  // The client's email changed: the item moves to the other lead.
  if (existing && existing.inquiry_id !== lead.id) {
    await api(`/rest/v1/inquiry_documents?id=eq.${existing.id}`, { method: 'DELETE' });
    if (existing.file_path) await removeFile(existing.file_path);
    existing = undefined;
  }
  let file: Record<string, unknown> = {};
  let uploaded: string | null = null;
  if (!existing || !existing.file_path || prevPdf !== r.pdfHash) {
    const blob = await r.pdf();
    uploaded = `${lead.company_id}/${lead.id}/${crypto.randomUUID()}.pdf`;
    await api(`/storage/v1/object/${BUCKET}/${uploaded}`, { method: 'POST', body: blob, headers: { 'Content-Type': 'application/pdf', 'x-upsert': 'false' } });
    file = { file_path: uploaded, file_name: r.fileName.slice(0, 200), file_size: blob.size, file_type: 'application/pdf' };
  }
  const fields = {
    kind: r.kind, title: r.title.slice(0, 200), amount: r.amount, paid_amount: r.paidAmount, currency: r.currency, status: r.status,
    issued_on: r.issuedOn, due_on: r.dueOn, paid_on: r.paidOn, note: r.note?.slice(0, 1000) ?? null, meta: r.meta, ...file,
  };
  try {
    if (existing) {
      await api(`/rest/v1/inquiry_documents?id=eq.${existing.id}`, { method: 'PATCH', ...json(fields) });
      if (uploaded && existing.file_path) await removeFile(existing.file_path);
    } else {
      await api('/rest/v1/inquiry_documents', { method: 'POST', ...json({ inquiry_id: lead.id, company_id: lead.company_id, source: 'quote_builder', external_id: r.externalId, ...fields }) });
    }
  } catch (error) {
    if (uploaded) await removeFile(uploaded);
    throw error;
  }
}

/** Moves the lead along when the quote does: sent → Quoted, accepted → Won. Never moves a lost lead. */
async function advanceLead(lead: Lead, q: QuoteState) {
  const to = q.status === 'accepted' && ['new', 'replied', 'quoted'].includes(lead.status) ? 'won'
    : q.status === 'sent' && ['new', 'replied'].includes(lead.status) ? 'quoted' : null;
  if (!to) return;
  await api(`/rest/v1/inquiries?id=eq.${lead.id}`, { method: 'PATCH', ...json({ status: to }) });
  lead.status = to;
}

let running: Promise<SyncState> | null = null;

/** Sends everything that changed since the last sync. */
export function syncAll(): Promise<SyncState> {
  if (running) return running;
  running = (async () => {
    const state = loadSync();
    const profile = loadProfile();
    const hideRates = loadPackageSettings().hideRates;
    const cache = new Map<string, Lead>();
    let synced = 0;
    let skipped = 0;
    try {
      for (const q of Object.values(loadQuotes())) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.client.email.trim())) { skipped++; continue; }
        const records = recordsFor(q, profile, hideRates);
        const changed = records.filter((r) => state.hashes[r.externalId] !== `${r.pdfHash}|${r.dataHash}`);
        const statusKey = `status:${q.id}`;
        if (!changed.length && state.hashes[statusKey] === q.status) continue;
        const lead = await leadFor(q, cache);
        for (const r of changed) {
          await upsertDocument(lead, r, state.hashes[r.externalId]);
          state.hashes[r.externalId] = `${r.pdfHash}|${r.dataHash}`;
          synced++;
          saveSync(state);
        }
        await advanceLead(lead, q);
        state.hashes[statusKey] = q.status;
      }
      Object.assign(state, { lastSync: Date.now(), lastError: '', synced, skipped });
    } catch (error) {
      state.lastError = error instanceof Error ? error.message : 'Sync failed.';
    }
    saveSync(state);
    return state;
  })().finally(() => { running = null; });
  return running;
}

/* ---------- the panel on the quotes dashboard ---------- */
const ago = (ms: number) => {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

export function initTrackerPanel(panel: HTMLElement | null) {
  if (!panel || !trackerConfigured) return;
  panel.hidden = false;
  let timer = 0;
  let busy = false;

  const render = (message = '') => {
    const email = connectedAs();
    const s = loadSync();
    panel.innerHTML = '';
    if (!email) {
      panel.dataset.state = 'off';
      panel.innerHTML = `
        <div class="q-tracker-text"><strong>Tracker</strong><span>Send every quote, invoice and PDF to the KNB tracker automatically.</span></div>
        <form class="q-tracker-form" novalidate>
          <input type="email" name="email" autocomplete="username" placeholder="Tracker email" aria-label="Tracker email" required />
          <input type="password" name="password" autocomplete="current-password" placeholder="Password" aria-label="Tracker password" required />
          <label class="q-tracker-remember"><input type="checkbox" name="remember" /> Remember on this device</label>
          <button type="submit" class="q-btn q-small">Connect</button>
        </form>
        <p class="q-tracker-msg" role="status"></p>`;
      const form = panel.querySelector<HTMLFormElement>('form')!;
      const msg = panel.querySelector<HTMLElement>('.q-tracker-msg')!;
      if (message) { msg.textContent = message; msg.dataset.tone = 'error'; }
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const button = form.querySelector('button')!;
        button.disabled = true; button.textContent = 'Connecting…'; msg.textContent = '';
        try {
          await connect(String(data.get('email') || '').trim(), String(data.get('password') || ''), data.get('remember') === 'on');
          render();
          void run();
        } catch (error) {
          msg.textContent = error instanceof Error ? error.message : 'Could not connect.';
          msg.dataset.tone = 'error';
          button.disabled = false; button.textContent = 'Connect';
        }
      });
      return;
    }
    panel.dataset.state = s.lastError ? 'error' : 'on';
    const status = busy ? 'Syncing…' : s.lastError ? `Last sync failed: ${s.lastError}` : s.lastSync ? `Synced ${ago(s.lastSync)}${s.skipped ? ` · ${s.skipped} without a client email skipped` : ''}` : 'Not synced yet';
    const text = document.createElement('div');
    text.className = 'q-tracker-text';
    const strong = document.createElement('strong'); strong.textContent = 'Tracker';
    const span = document.createElement('span'); span.textContent = `Connected as ${email} · ${status}`;
    text.append(strong, span);
    const actions = document.createElement('div');
    actions.className = 'q-tracker-actions';
    const syncBtn = document.createElement('button'); syncBtn.type = 'button'; syncBtn.className = 'q-btn q-small'; syncBtn.textContent = busy ? 'Syncing…' : 'Sync now'; syncBtn.disabled = busy;
    syncBtn.addEventListener('click', () => void run());
    const off = document.createElement('button'); off.type = 'button'; off.className = 'q-link'; off.textContent = 'Disconnect';
    off.addEventListener('click', () => { disconnect(); render(); });
    actions.append(syncBtn, off);
    panel.append(text, actions);
  };

  const run = async () => {
    if (!connectedAs() || busy) return;
    busy = true; render();
    const s = await syncAll();
    busy = false;
    if (!connectedAs()) render(s.lastError); else render();
  };

  // Every save in the quote builder: sync a few seconds later (changes are batched).
  window.addEventListener('quotes-saved', () => { window.clearTimeout(timer); timer = window.setTimeout(() => void run(), 4000); });
  render();
  if (connectedAs()) timer = window.setTimeout(() => void run(), 1500);
  // Keep "Synced x min ago" honest.
  // (Only while connected — re-rendering the sign-in form would wipe what's being typed.)
  window.setInterval(() => { if (!busy && connectedAs()) render(); }, 60_000);
}
