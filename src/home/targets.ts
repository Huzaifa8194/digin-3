// Named risks on the radar. Each target sits at a fixed bearing and radius on the disc. When the
// beam or a ping crosses it, a reticle locks on and a label types the risk; a moment later it
// flips to what DigiInn360 does about it. Names are illustrative of the services and products.
import { gsap } from 'gsap';

type Layout = { cx: number; cy: number; r: number };
type State = 'idle' | 'risk' | 'fixed';
type Target = { deg: number; r: number; risk: string; fix: string; state: State; vis: number; fixed: number; el: HTMLElement; text: HTMLElement; until: number; x: number; y: number };

const LIST: [number, number, string, string][] = [
  [24, 0.62, 'Kerberoastable account', 'Path closed'],
  [61, 0.34, 'API without authentication', 'Retested'],
  [98, 0.78, 'SMB1 enabled', 'Hardened'],
  [137, 0.5, '.hta runs on double click', 'Opens as text'],
  [171, 0.84, 'certutil reaching the internet', 'Blocked twice'],
  [205, 0.3, 'Unknown autorun entry', 'Contained'],
  [236, 0.7, 'Leaked credentials on a forum', 'Rotated'],
  [268, 0.46, 'Exported Android activity', 'Fixed and verified'],
  [301, 0.82, 'Macros enabled in Office', 'Policy applied'],
  [333, 0.55, 'Unmonitored server', 'Monitored 24/7'],
];

/** Opt-in sonar: Web Audio, no files. Off until the visitor turns it on. */
class Sonar {
  private ctx: AudioContext | null = null;
  on = false;
  toggle() {
    this.on = !this.on;
    if (this.on && !this.ctx) this.ctx = new AudioContext();
    if (this.on) this.ctx?.resume();
    return this.on;
  }
  ping(freq = 880, gain = 0.06, len = 0.5) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.55, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(this.ctx.destination);
    o.start(t); o.stop(t + len + 0.05);
  }
}

export function createTargets(host: HTMLElement, compact: () => boolean) {
  const sonar = new Sonar();
  const targets: Target[] = LIST.map(([deg, r, risk, fix]) => {
    const el = document.createElement('div');
    el.className = 'hm-tag';
    el.innerHTML = '<span class="hm-tag__line"></span><span class="hm-tag__text"></span>';
    host.appendChild(el);
    return { deg, r, risk, fix, state: 'idle', vis: 0, fixed: 0, el, text: el.querySelector('.hm-tag__text')!, until: 0, x: 0, y: 0 };
  });
  const T = new Float32Array(40);
  const P = new Float32Array(9).fill(-100);
  let pingIdx = 0;
  const pings: { x: number; y: number; t: number }[] = [];

  const type = (t: Target, label: string, cls: string) => {
    t.el.className = `hm-tag ${cls}`;
    const o = { n: 0 };
    gsap.to(o, { n: label.length, duration: Math.min(0.5, label.length * 0.025), ease: 'none', onUpdate: () => { t.text.textContent = label.slice(0, Math.round(o.n)); } });
  };
  const trigger = (t: Target, now: number) => {
    if (t.state !== 'idle') return;
    t.state = 'risk';
    t.until = now + 1.7;
    type(t, `▲ ${t.risk}`, 'is-risk');
    sonar.ping(980, 0.05, 0.45);
  };

  return {
    sonar,
    /** Called every frame with the beam (unwrapped degrees) before and after this frame. */
    update(prev: number, cur: number, L: Layout, now: number, dpr: number, viewH: number, active: boolean) {
      const lo = Math.min(prev, cur), hi = Math.max(prev, cur);
      targets.forEach((t, i) => {
        const a = (t.deg / 180) * Math.PI;
        t.x = L.cx + Math.sin(a) * t.r * L.r;
        t.y = L.cy - Math.cos(a) * t.r * L.r;
        if (active && hi - lo < 180) {
          const n = Math.ceil((lo - t.deg) / 360);
          if (t.deg + 360 * n <= hi && hi > lo) trigger(t, now);
        }
        // pings crossing the target
        if (active) pings.forEach((p) => {
          const age = now - p.t, rad = age * 600, d = Math.hypot(t.x - p.x, t.y - p.y);
          if (age > 0 && age < 2.2 && Math.abs(d - rad) < 14) trigger(t, now);
        });
        if (t.state === 'risk' && now > t.until) { t.state = 'fixed'; t.until = now + 2.4; type(t, `✓ ${t.fix}`, 'is-fixed'); sonar.ping(520, 0.035, 0.6); }
        else if (t.state === 'fixed' && now > t.until) { t.state = 'idle'; t.el.className = 'hm-tag'; }
        const wantVis = t.state === 'idle' ? 0 : 1, wantFix = t.state === 'fixed' ? 1 : 0;
        t.vis += (wantVis - t.vis) * 0.18;
        t.fixed += (wantFix - t.fixed) * 0.12;
        T.set([t.x * dpr, (viewH - t.y) * dpr, t.vis, t.fixed], i * 4);
        const flip = t.x > L.cx + L.r * 0.3; // labels on the right side point left
        t.el.style.transform = `translate(${t.x.toFixed(1)}px, ${t.y.toFixed(1)}px)`;
        t.el.classList.toggle('is-flip', flip);
        t.el.classList.toggle('is-compact', compact());
      });
      pings.forEach((p, k) => P.set([p.x * dpr, (viewH - p.y) * dpr, p.t], k * 3));
      return { T, P };
    },
    ping(x: number, y: number, now: number) {
      const p = { x, y, t: now };
      if (pings.length < 3) pings.push(p); else pings[pingIdx = (pingIdx + 1) % 3] = p;
      sonar.ping(660, 0.07, 0.9);
    },
  };
}
