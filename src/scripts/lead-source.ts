/**
 * Where a visitor came from, for the lead emails: the site that sent them, the first page they landed on
 * this visit, and any campaign tags in that first link. Nothing personal; kept for the browser session only.
 */
const KEY = 'gp-lead-source';
const TAGS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

interface Source { referrer: string; landing: string; campaign: string }

/** Runs on every page; only the first page of a visit is recorded. */
export function captureSource() {
  try { if (sessionStorage.getItem(KEY)) return; } catch { return; }
  const params = new URLSearchParams(location.search);
  const tags = TAGS.filter((k) => params.get(k)).map((k) => `${k.replace('utm_', '')}=${params.get(k)}`);
  if (params.has('gclid')) tags.push('Google Ads click');
  if (params.has('fbclid')) tags.push('Facebook or Instagram click');
  let referrer = '';
  try {
    const from = new URL(document.referrer);
    if (from.origin !== location.origin) referrer = from.hostname.replace(/^www\./, '');
  } catch { /* no referrer */ }
  const source: Source = { referrer, landing: location.pathname, campaign: tags.join(', ') };
  try { sessionStorage.setItem(KEY, JSON.stringify(source)); } catch { /* storage unavailable */ }
}

/** Fields to add to a form email. */
export function sourceFields(): Record<string, string> {
  let source: Source | null = null;
  try { source = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { source = null; }
  return {
    came_from: source?.referrer || 'Direct visit, or the site hid where it came from',
    first_page: source?.landing || '—',
    campaign: source?.campaign || '—',
    sent_from: location.pathname,
  };
}
