// Talks to the site backend (Django, /api/). Every failure resolves to a result the
// form can act on; nothing throws. When the backend is unreachable (e.g. a static
// preview) the caller falls back to a drafted email, which was the old behaviour.
//
// Anti-bot: the session carries a proof-of-work puzzle (self-hosted ALTCHA). It is
// solved in a Web Worker as soon as the visitor focuses the form, so by the time
// they press Send the answer is usually ready.

export type LeadPayload = {
  kind: 'inquiry' | 'demo';
  email: string;
  name?: string;
  company?: string;
  interest?: string;
  product?: string;
  message?: string;
  website?: string; // honeypot, must stay empty
};

export type LeadResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string[]> }
  | { ok: false; fallback: true; message?: string };

type Puzzle = { algorithm: string; challenge: string; salt: string; maxNumber: number; signature: string };
type Session = { csrfToken: string; formToken: string; accepting: boolean; pow: Puzzle | null };
type Ready = Session & { solution: Promise<string | null> };
let session: Promise<Ready | null> | null = null;

function solve(puzzle: Puzzle | null): Promise<string | null> {
  if (!puzzle) return Promise.resolve('');
  if (typeof Worker === 'undefined' || !globalThis.crypto?.subtle) return Promise.resolve(null);
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./pow-worker.ts', import.meta.url), { type: 'module' });
    } catch {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => { worker.terminate(); resolve(null); }, 60000);
    worker.onmessage = (e) => { clearTimeout(timer); worker.terminate(); resolve(e.data ? JSON.stringify(e.data) : null); };
    worker.onerror = () => { clearTimeout(timer); worker.terminate(); resolve(null); };
    worker.postMessage(puzzle);
  });
}

function loadSession(): Promise<Ready | null> {
  return fetch('/api/form-session/', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null))
    .then((s: Session | null) => (s ? { ...s, solution: solve(s.pow) } : null))
    .catch(() => null);
}

/** Start the session (and the puzzle) early, on first focus. */
export function warmLeadSession() {
  if (!session) session = loadSession();
}

export async function submitLead(payload: LeadPayload, retry = true): Promise<LeadResult> {
  warmLeadSession();
  const s = await session;
  if (!s) { session = null; return { ok: false, fallback: true }; }
  if (!s.accepting) return { ok: false, fallback: true };
  const altcha = await s.solution;
  if (altcha === null) return { ok: false, fallback: true };
  session = null; // a solved puzzle is single-use; the next send gets a fresh one
  let res: Response;
  try {
    res = await fetch('/api/leads/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRFToken': s.csrfToken },
      body: JSON.stringify({ ...payload, page: location.pathname, formToken: s.formToken, altcha }),
    });
  } catch {
    return { ok: false, fallback: true };
  }
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (res.ok && data.ok) return { ok: true };
  if (res.status === 403 && data.code === 'csrf' && retry) return submitLead(payload, false);
  if (res.status === 400 && data.errors && typeof data.errors === 'object') {
    warmLeadSession(); // ready for the corrected resend
    return { ok: false, errors: data.errors as Record<string, string[]> };
  }
  return { ok: false, fallback: true, message: typeof data.error === 'string' ? data.error : undefined };
}
