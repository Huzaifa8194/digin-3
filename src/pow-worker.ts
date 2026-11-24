// Solves the site's proof-of-work CAPTCHA (ALTCHA v1, SHA-256) off the main thread:
// find n in [0, maxNumber] with sha256(salt + n) === challenge.
type Job = { algorithm: string; challenge: string; salt: string; maxNumber: number; signature: string };

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
const enc = new TextEncoder();
const ctx = self as unknown as { postMessage(message: unknown): void; onmessage: ((event: MessageEvent<Job>) => void) | null };

ctx.onmessage = async (event: MessageEvent<Job>) => {
  const job = event.data;
  if (job.algorithm !== 'SHA-256') { ctx.postMessage(null); return; }
  const started = performance.now();
  for (let n = 0; n <= job.maxNumber; n++) {
    if (hex(await crypto.subtle.digest('SHA-256', enc.encode(job.salt + n))) === job.challenge) {
      ctx.postMessage({ algorithm: job.algorithm, challenge: job.challenge, number: n, salt: job.salt, signature: job.signature, took: Math.round(performance.now() - started) });
      return;
    }
  }
  ctx.postMessage(null);
};
