// Proof-of-work solver for the admin login (ALTCHA v1, SHA-256).
const enc = new TextEncoder();
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
self.onmessage = async (event) => {
  const job = event.data;
  for (let n = 0; n <= job.maxNumber; n++) {
    if (hex(await crypto.subtle.digest('SHA-256', enc.encode(job.salt + n))) === job.challenge) {
      self.postMessage({ algorithm: job.algorithm, challenge: job.challenge, number: n, salt: job.salt, signature: job.signature });
      return;
    }
  }
  self.postMessage(null);
};
