// The estimate PDF carries the client's answers in its metadata, so the quote page can read them back.
import type { Answers } from './estimator';

const PREFIX = 'estimator:';

/** Contact details the client typed in the estimator (optional). */
export interface PayloadClient { name: string; email: string; company: string; website: string }
export interface Payload { v: 1; ref: string; date: string; answers: Answers; client?: PayloadClient }

/** Base64 (UTF-8 safe) so it survives as plain ASCII inside the PDF's Keywords field. */
export const encodePayload = (payload: Payload) => PREFIX + btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(payload))));

/** Finds and decodes the payload in a PDF's raw bytes. Returns null for PDFs without one. */
export function readPayload(bytes: ArrayBuffer): Payload | null {
  const text = new TextDecoder('latin1').decode(bytes);
  const match = text.match(/estimator:([A-Za-z0-9+/=]+)/);
  if (!match) return null;
  try {
    const json = new TextDecoder().decode(Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0)));
    const data = JSON.parse(json);
    return data && data.v === 1 && data.answers ? (data as Payload) : null;
  } catch {
    return null;
  }
}
