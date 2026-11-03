/**
 * Cloudflare Turnstile — a free, usually invisible "are you human?" check on the forms. The tracker verifies the token
 * (TURNSTILE_SECRET_KEY on Vercel) before it stores a lead, so bots can't post leads directly.
 * Off until PUBLIC_TURNSTILE_SITE_KEY is set in .env; then each form gets a widget that only appears if Cloudflare
 * wants the visitor to tick a box. FormSubmit email is not affected either way.
 */
import { TURNSTILE_SITE_KEY } from '../data/forms';

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  getResponse: (id: string) => string | undefined;
  reset: (id: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

let loading: Promise<TurnstileApi | null> | null = null;
function loadApi(): Promise<TurnstileApi | null> {
  if (!TURNSTILE_SITE_KEY) return Promise.resolve(null);
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => resolve(window.turnstile ?? null);
    script.onerror = () => resolve(null);
    document.head.append(script);
  });
  return loading;
}

export interface HumanCheck {
  /** The current token (waits a few seconds for Cloudflare if needed); undefined if the check is off or failed to load. */
  token(): Promise<string | undefined>;
  /** Tokens work once: call after each send so the next one gets a fresh token. */
  reset(): void;
}

export function humanCheck(container: HTMLElement | null): HumanCheck {
  if (!TURNSTILE_SITE_KEY || !container) return { token: async () => undefined, reset: () => undefined };
  let id: string | null = null;
  const ready = loadApi().then((api) => {
    if (api && container.isConnected) id = api.render(container, { sitekey: TURNSTILE_SITE_KEY, appearance: 'interaction-only', theme: 'light' });
    return api;
  });
  return {
    async token() {
      const api = await ready;
      if (!api || id === null) return undefined;
      for (let i = 0; i < 30; i++) {
        const t = api.getResponse(id);
        if (t) return t;
        await new Promise((r) => setTimeout(r, 200));
      }
      return undefined;
    },
    reset() { void ready.then((api) => { if (api && id !== null) api.reset(id); }); },
  };
}
