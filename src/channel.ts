// The "secure channel" strip above the contact and partner forms. It draws the real
// anti-bot work happening in the visitor's browser (lead-api onChannel):
//   idle     a quiet carrier line breathing between You and Islamabad
//   solving  red noise while the proof-of-work puzzle is being solved, with the real hash count
//   ready    the line locks flat and blue: channel verified
//   sending  a pulse runs from You to Islamabad
//   sent     the far end lights up: delivered
// One driver, one clock (gsap.ticker), paused off screen, static under reduced motion.
import { gsap } from 'gsap';
import './channel.css';
import { onChannel, warmLeadSession, type ChannelState } from './lead-api';
import { prefersReducedMotion } from './engine';

const LABEL: Record<ChannelState['phase'], string> = {
  idle: 'Standby',
  opening: 'Opening channel',
  solving: 'Verifying you are human',
  ready: 'Channel verified',
  sending: 'Sending',
  sent: 'Delivered to Islamabad',
  offline: 'Email fallback',
};
const GLYPHS = '0123456789ABCDEF';

const running = new WeakMap<HTMLElement, gsap.core.Tween>();
function scramble(el: HTMLElement, text: string) {
  running.get(el)?.kill(); // a newer label always wins over one still resolving
  if (prefersReducedMotion()) { el.textContent = text; return; }
  const state = { p: 0 };
  running.set(el, gsap.to(state, {
    p: 1, duration: 0.45, ease: 'none',
    onUpdate: () => {
      const shown = Math.floor(state.p * text.length);
      el.textContent = text.slice(0, shown) + text.slice(shown).replace(/\S/g, () => GLYPHS[(Math.random() * 16) | 0]);
    },
    onComplete: () => { el.textContent = text; },
  }));
}

export function mountChannel(root: HTMLElement, form: HTMLFormElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-ch-line]')!;
  const stateEl = root.querySelector<HTMLElement>('[data-ch-state]')!;
  const workEl = root.querySelector<HTMLElement>('[data-ch-work]')!;
  const srEl = root.querySelector<HTMLElement>('[data-ch-sr]');
  const g = canvas.getContext('2d')!;
  const css = getComputedStyle(root);
  const colors = { mut: css.getPropertyValue('--mut').trim() || '#9aa8ba', risk: css.getPropertyValue('--risk').trim() || '#ff3341', ahead: css.getPropertyValue('--ahead-t').trim() || '#8cc0ff' };
  const reduced = prefersReducedMotion();
  const fmt = new Intl.NumberFormat('en-US');

  let s: ChannelState = { phase: 'idle', tried: 0, max: 0 };
  let w = 0, h = 0, dpr = 1, t = 0, noise = 0, lock = 0, pulse = -1, arrived = 0, visible = true;

  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    draw();
  };

  function draw() {
    if (!w) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const mid = h / 2, pad = 6, span = w - pad * 2;
    const offline = s.phase === 'offline';
    const col = offline ? colors.mut : lock > 0.5 ? colors.ahead : noise > 0.05 ? colors.risk : colors.mut;
    // the line
    g.lineWidth = 1.5; g.strokeStyle = col; g.globalAlpha = offline ? 0.6 : 1;
    g.setLineDash(offline ? [4, 6] : []);
    g.beginPath();
    for (let x = 0; x <= span; x += 2) {
      const u = x / span;
      const env = Math.sin(Math.PI * u); // pinned at both ends
      const carrier = Math.sin(u * 18 - t * 1.6) * 2.2 * (1 - lock);
      const jitter = (Math.sin(u * 97 + t * 23) * 0.6 + Math.sin(u * 41 - t * 17) * 0.4) * 9 * noise;
      const y = mid + (carrier + jitter) * env;
      x === 0 ? g.moveTo(pad + x, y) : g.lineTo(pad + x, y);
    }
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 1;
    // end nodes: You (left) and Islamabad (right)
    const node = (x: number, on: number) => {
      g.beginPath(); g.arc(x, mid, 3.5, 0, Math.PI * 2);
      g.fillStyle = on > 0 ? colors.ahead : colors.mut; g.fill();
      if (on > 0) { g.beginPath(); g.arc(x, mid, 3.5 + 9 * on, 0, Math.PI * 2); g.strokeStyle = colors.ahead; g.globalAlpha = 0.5 * (1 - on) + 0.15; g.stroke(); g.globalAlpha = 1; }
    };
    node(pad, lock > 0.5 ? 1 : 0);
    node(w - pad, arrived);
    // the travelling pulse
    if (pulse >= 0 && pulse <= 1) {
      const x = pad + span * pulse;
      const grad = g.createLinearGradient(x - 60, 0, x, 0);
      grad.addColorStop(0, 'transparent'); grad.addColorStop(1, colors.ahead);
      g.strokeStyle = grad; g.lineWidth = 3;
      g.beginPath(); g.moveTo(Math.max(pad, x - 60), mid); g.lineTo(x, mid); g.stroke();
      g.beginPath(); g.arc(x, mid, 4, 0, Math.PI * 2); g.fillStyle = colors.ahead; g.fill();
    }
  }

  const tick = (_time: number, delta: number) => { t += delta / 1000; draw(); };
  const running = () => !reduced && visible;
  const sync = () => (running() ? gsap.ticker.add(tick) : gsap.ticker.remove(tick));

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); draw(); });
  io.observe(root);
  new ResizeObserver(size).observe(canvas);
  size();
  sync();

  let lastPhase: ChannelState['phase'] | null = null;
  onChannel((next) => {
    s = next;
    const p = next.phase;
    if (p !== lastPhase) {
      lastPhase = p;
      root.dataset.phase = p;
      scramble(stateEl, LABEL[p]);
      if (srEl && p !== 'opening' && p !== 'idle') srEl.textContent = LABEL[p];
      const target = { noise: p === 'solving' || p === 'opening' ? 1 : 0, lock: p === 'ready' || p === 'sending' || p === 'sent' ? 1 : 0 };
      if (reduced) { noise = target.noise; lock = target.lock; }
      else gsap.to({ get noise() { return noise; }, set noise(v) { noise = v; }, get lock() { return lock; }, set lock(v) { lock = v; } }, { ...target, duration: 0.6, ease: 'expo.out', overwrite: true });
      if (p === 'sending') {
        if (reduced) pulse = 1;
        else gsap.fromTo({ get v() { return pulse; }, set v(x) { pulse = x; } }, { v: 0 }, { v: 1, duration: 0.9, ease: 'power2.inOut' });
      }
      if (p === 'sent') {
        pulse = -1;
        if (reduced) arrived = 1;
        else gsap.fromTo({ get v() { return arrived; }, set v(x) { arrived = x; } }, { v: 0.01 }, { v: 1, duration: 0.8, ease: 'expo.out' });
      }
      if (p === 'idle' || p === 'opening' || p === 'solving') arrived = 0;
      draw();
    }
    workEl.textContent =
      p === 'solving' || p === 'opening' ? `${fmt.format(next.tried)} hashes`
      : p === 'ready' || p === 'sending' ? `${fmt.format(next.tried)} hashes · locked`
      : p === 'sent' ? 'Received'
      : p === 'offline' ? 'Send opens your email app'
      : 'Opens when you start typing';
  });

  form.addEventListener('focusin', warmLeadSession, { once: true });
}
