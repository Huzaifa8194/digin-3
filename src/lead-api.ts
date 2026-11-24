// Talks to the site backend (Django, /api/). Every failure resolves to a result the
// form can act on; nothing throws. When the backend is unreachable (e.g. a static
// preview) the caller falls back to a drafted email, which was the old behaviour.
//
// Anti-bot: the session carries a proof-of-work puzzle (self-hosted ALTCHA). It is
// solved in a Web Worker as soon as the visitor focuses a form, so by the time they
// press Send the answer is usually ready. Pages can watch that real work through
// onChannel() (the contact and partner pages draw it as a "secure channel").

export type LeadPayload = {
  kind: 'inquiry' | 'demo' | 'partner';
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  interest?: string;
  product?: string;
  message?: string;
  partner_type?: string;
  company_website?: string;
  country?: string;
  website?: string; // honeypot, must stay empty
};

export type LeadResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string[]> }
  | { ok: false; fallback: true; message?: string };

export type ChannelPhase = 'idle' | 'opening' | 'solving' | 'ready' | 'sending' | 'sent' | 'offline';
export type ChannelState = { phase: ChannelPhase; tried: number; max: number };

type Puzzle = { algorithm: string; challenge: string; salt: string; maxNumber: number; signature: string };
type Session = { csrfToken: string; formToken: string; accepting: boolean; pow: Puzzle | null };
type Ready = Session & { solution: Promise<string | null> };
let session: Promise<Ready | null> | null = null;

const listeners = new Set<(s: ChannelState) => void>();
let channel: ChannelState = { phase: 'idle', tried: 0, max: 0 };
function emit(next: Partial<ChannelState>) {
  channel = { ...channel, ...next };
  listeners.forEach((l) => l(channel));
}
/** Follow the real anti-bot work and the send state. Returns an unsubscribe function. */
export function onChannel(listener: (s: ChannelState) => void) {
  listeners.add(listener);
  listener(channel);
  return () => listeners.delete(listener);
}

function solve(puzzle: Puzzle | null): Promise<string | null> {
  if (!puzzle) { emit({ phase: 'ready' }); return Promise.resolve(''); }
  if (typeof Worker === 'undefined' || !globalThis.crypto?.subtle) { emit({ phase: 'offline' }); return Promise.resolve(null); }
  emit({ phase: 'solving', tried: 0, max: puzzle.maxNumber });
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./pow-worker.ts', import.meta.url), { type: 'module' });
    } catch {
      emit({ phase: 'offline' });
      resolve(null);
      return;
    }
    const finish = (value: string | null) => { clearTimeout(timer); worker.terminate(); emit({ phase: value === null ? 'offline' : 'ready' }); resolve(value); };
    const timer = setTimeout(() => finish(null), 60000);
    worker.onmessage = (e) => {
      const msg = e.data as { type: string; tried?: number; solution?: unknown };
      if (msg.type === 'progress') { emit({ tried: msg.tried ?? 0 }); return; }
      if (msg.tried) emit({ tried: msg.tried });
      finish(msg.solution ? JSON.stringify(msg.solution) : null);
    };
    worker.onerror = () => finish(null);
    worker.postMessage(puzzle);
  });
}

function loadSession(): Promise<Ready | null> {
  emit({ phase: 'opening', tried: 0 });
  return fetch('/api/form-session/', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null))
    .then((s: Session | null) => {
      if (!s) { emit({ phase: 'offline' }); return null; }
      return { ...s, solution: solve(s.pow) };
    })
    .catch(() => { emit({ phase: 'offline' }); return null; });
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
  emit({ phase: 'sending' });
  let res: Response;
  try {
    res = await fetch('/api/leads/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRFToken': s.csrfToken },
      body: JSON.stringify({ ...payload, page: location.pathname, formToken: s.formToken, altcha }),
    });
  } catch {
    emit({ phase: 'offline' });
    return { ok: false, fallback: true };
  }
  const data = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (res.ok && data.ok) { emit({ phase: 'sent' }); return { ok: true }; }
  if (res.status === 403 && data.code === 'csrf' && retry) return submitLead(payload, false);
  if (res.status === 400 && data.errors && typeof data.errors === 'object') {
    warmLeadSession(); // ready for the corrected resend
    return { ok: false, errors: data.errors as Record<string, string[]> };
  }
  emit({ phase: 'offline' });
  return { ok: false, fallback: true, message: typeof data.error === 'string' ? data.error : undefined };
}
