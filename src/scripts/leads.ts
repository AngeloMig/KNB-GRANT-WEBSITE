/**
 * Sends a form lead to the tracker's Inquiries inbox (KNB Attendance Tracker, /api/leads).
 * Best effort and never in the way: FormSubmit email stays the backup, so a failure here is silent.
 * Nothing secret is involved; the tracker checks the origin, rate-limits and validates everything.
 */
import { LEADS_ENDPOINT } from '../data/forms';

export async function sendLead(payload: Record<string, unknown>): Promise<boolean> {
  try {
    const body = JSON.stringify(payload);
    const response = await fetch(LEADS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      credentials: 'omit',
      // Lets a small lead finish sending if the visitor leaves the page; browsers cap keepalive bodies at 64 KB.
      keepalive: body.length < 60_000,
    });
    return response.ok;
  } catch {
    return false;
  }
}
