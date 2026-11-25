// Chapter 08 email field. A bubble rides the end of what you type and answers it: wrong shapes
// get a one-liner, a real address gets the enter key. Submitting sends the request to the site
// backend; if the backend can't be reached it falls back to a drafted email to DigiInn360.

const POOLS: Record<string, string[]> = {
  noat: ['no @ yet.', 'keep typing.'],
  atonly: ['@ where, exactly?', 'and the domain?'],
  nodot: ['it needs an ending, like .com.', 'almost. finish the domain.'],
  space: ['emails don’t take spaces.'],
  multiat: ['one @ is enough.'],
  mash: ['that looks like a keyboard test.', 'denied by default.'],
  invalid: ['not quite an email.', 'close. check it once more.'],
};
const IDLE = ['take your time.', 'still here.', 'no rush.'];
const FREE = new Set('gmail googlemail icloud me mac hotmail outlook live msn yahoo ymail proton protonmail pm gmx aol mail web yandex zoho fastmail hey'.split(' '));
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const LOCAL_OK = /[a-z0-9._%+-]/i, DOMAIN_OK = /[a-z0-9.-]/i;

type Verdict = { kind: 'hidden' } | { kind: 'pool'; pool: string } | { kind: 'line'; text: string } | { kind: 'quip'; text: string } | { kind: 'enter' };

function badChar(v: string): string | null {
  const at = v.indexOf('@');
  const local = at === -1 ? v : v.slice(0, at), domain = at === -1 ? '' : v.slice(at + 1);
  const find = (s: string, re: RegExp) => { for (const c of s) if (!re.test(c)) return c; return null; };
  const c = find(local, LOCAL_OK) ?? find(domain, DOMAIN_OK);
  if (!c) return null;
  if (c === "'" || c === '"' || c === '`') return 'no quotes in an email.';
  if (c === ',') return 'commas are for lists.';
  if (c === '/' || c === '\\') return 'that’s a path, not an email.';
  return `emails don’t do "${c}".`;
}
function mashed(v: string) {
  if (v.length < 6) return false;
  const t = v.toLowerCase();
  if (new Set(t).size / t.length <= 0.34) return true;
  const h = Math.floor(t.length / 2);
  if (t.length % 2 === 0 && t.slice(0, h) === t.slice(h)) return true;
  return ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '0123456789'].some((row) => { for (let i = 0; i + 6 <= row.length; i++) if (t.includes(row.slice(i, i + 6))) return true; return false; });
}
function judge(raw: string): Verdict {
  const v = raw.trim();
  if (!v) return { kind: 'hidden' };
  if (/^(https?:\/\/|www\.)/i.test(v)) return { kind: 'line', text: 'that’s a website, not an email.' };
  if (/\s/.test(v)) return { kind: 'pool', pool: 'space' };
  if (/\p{Extended_Pictographic}/u.test(v)) return { kind: 'line', text: 'an emoji won’t get through.' };
  const ats = (v.match(/@/g) ?? []).length;
  if (ats > 1) return { kind: 'pool', pool: 'multiat' };
  const bad = badChar(v);
  if (bad) return { kind: 'line', text: bad };
  if (ats === 0) return { kind: 'pool', pool: mashed(v) ? 'mash' : 'noat' };
  const [local, domain] = v.split('@');
  if (!local) return { kind: 'line', text: 'nothing before the @?' };
  if (!domain) return { kind: 'pool', pool: 'atonly' };
  if (v.includes('..')) return { kind: 'line', text: 'one dot at a time.' };
  if (local.startsWith('.') || local.endsWith('.')) return { kind: 'line', text: 'dots go between things.' };
  if (!/\.[a-z]{2,}$/i.test(domain)) return { kind: 'pool', pool: 'nodot' };
  if (!EMAIL.test(v)) return v.length > 60 ? { kind: 'line', text: 'that’s a paragraph, not an email.' } : { kind: 'pool', pool: 'invalid' };
  if (/test/i.test(v)) return { kind: 'quip', text: 'running a test? fair.' };
  if (FREE.has(domain.split('.')[0].toLowerCase())) return { kind: 'quip', text: 'a work address gets a faster reply.' };
  return { kind: 'quip', text: 'a work domain. good.' };
}

export function mountForm(foot: HTMLElement) {
  const form = foot.querySelector<HTMLFormElement>('[data-form]')!;
  const input = form.querySelector<HTMLInputElement>('[data-email]')!;
  const wrap = form.querySelector<HTMLElement>('[data-input-wrap]')!;
  const ph = form.querySelector<HTMLElement>('[data-ph]')!;
  const measure = form.querySelector<HTMLElement>('[data-measure]')!;
  const bwrap = form.querySelector<HTMLElement>('[data-bubblewrap]')!;
  const bmeasure = form.querySelector<HTMLElement>('[data-bmeasure]')!;
  const cap = form.querySelector<HTMLElement>('[data-cap]')!;
  const seen: Record<string, number> = {};
  let idleK = -1, timer = 0, idleTimer = 0, quipTimer = 0;
  type Mode = { mode: 'hidden' } | { mode: 'text'; text: string; side: 'left' | 'right' | 'center'; idle?: boolean } | { mode: 'enter' };
  let state: Mode = { mode: 'hidden' };
  const side = (v: string) => (v.includes('@') ? 'right' : 'left') as 'left' | 'right';

  const layout = () => {
    measure.textContent = input.value;
    const W = wrap.offsetWidth, half = measure.offsetWidth / 2;
    wrap.style.setProperty('--endx', `${Math.max(0, Math.min(W / 2 + half, W - 120)).toFixed(0)}px`);
    wrap.style.setProperty('--startx', `${Math.min(W, Math.max(W / 2 - half, 120)).toFixed(0)}px`);
    let h = 0; for (const c of input.value) h = (h * 31 + c.charCodeAt(0)) | 0;
    wrap.style.setProperty('--tilt', `${(Math.abs(h) % 13) - 6}deg`);
  };
  const render = () => {
    bwrap.style.left = state.mode === 'text' && state.side === 'left' ? 'var(--startx, 50%)' : state.mode === 'text' && state.side === 'center' ? '50%' : 'var(--endx, 50%)';
    if (state.mode === 'hidden') { bwrap.innerHTML = ''; wrap.style.removeProperty('--bw'); return; }
    if (state.mode === 'enter') {
      bwrap.innerHTML = `<div class="bubble bubble--enter"><button class="bubble__go" type="submit" aria-label="Request the demo">↵</button></div>`;
      wrap.style.removeProperty('--bw');
      return;
    }
    bmeasure.textContent = state.text;
    wrap.style.setProperty('--bw', `${bmeasure.offsetWidth + 44 + (state.idle ? 26 : 0)}px`);
    const cls = state.side === 'left' ? ' bubble--left' : state.side === 'center' ? ' bubble--center' : '';
    bwrap.innerHTML = `<div class="bubble${cls}"><span class="bubble__txt">${esc(state.text)}${state.idle ? '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}</span></div>`;
  };
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const set = (m: Mode) => { state = m; render(); armIdle(); };
  const armIdle = () => {
    clearTimeout(idleTimer);
    if (state.mode !== 'text' || IDLE.includes(state.text)) return;
    idleTimer = window.setTimeout(() => {
      const v = judge(input.value);
      if (v.kind === 'pool' || v.kind === 'line') { idleK = (idleK + 1) % IDLE.length; set({ mode: 'text', text: IDLE[idleK], side: 'center', idle: true }); }
    }, 2200);
  };
  const react = () => {
    clearTimeout(quipTimer);
    const v = judge(input.value);
    if (v.kind === 'pool') { const pool = POOLS[v.pool]; const k = (seen[v.pool] ?? -1) + 1; seen[v.pool] = k; set({ mode: 'text', text: pool[k % pool.length], side: side(input.value) }); }
    else if (v.kind === 'line') set({ mode: 'text', text: v.text, side: side(input.value) });
    else if (v.kind === 'quip') { set({ mode: 'text', text: v.text, side: 'right' }); quipTimer = window.setTimeout(() => set({ mode: 'enter' }), 800); }
    else if (v.kind === 'enter') set({ mode: 'enter' });
    else set({ mode: 'hidden' });
  };
  input.addEventListener('input', () => {
    layout();
    ph.classList.toggle('off', !!input.value || document.activeElement === input);
    clearTimeout(timer);
    if (!input.value.trim()) { set({ mode: 'hidden' }); return; }
    timer = window.setTimeout(react, 500);
  });
  input.addEventListener('focus', () => ph.classList.add('off'));
  foot.addEventListener('focusin', () => foot.classList.add('live'));
  input.addEventListener('blur', () => ph.classList.toggle('off', input.value.length > 0));
  layout();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    const v = judge(email);
    if (v.kind !== 'quip' && v.kind !== 'enter') {
      if (v.kind === 'hidden') set({ mode: 'text', text: 'your work email first.', side: 'center' });
      else if (v.kind === 'pool') set({ mode: 'text', text: POOLS[v.pool][0], side: side(email) });
      else if (v.kind === 'line') set({ mode: 'text', text: v.text, side: side(email) });
      input.focus();
      return;
    }
    // The request is finished on the contact page, with this email already filled in.
    try { sessionStorage.setItem('demo-email', email); } catch { /* storage blocked */ }
    location.href = '/contact/?product=SysBastion';
  });
  cap.hidden = false;
}
