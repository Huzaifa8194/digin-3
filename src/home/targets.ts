// Named risks on the radar. Each target sits at a fixed bearing and radius on the disc. When the
// beam or a ping crosses it, a reticle locks on and a label types the risk; a moment later it
// flips to what DigiInn360 does about it. Names are illustrative of the services and products.
import { gsap } from 'gsap';

type Layout = { cx: number; cy: number; r: number };
type State = 'idle' | 'risk' | 'fixed';
type Target = { deg: number; r: number; risk: string; fix: string; state: State; vis: number; fixed: number; el: HTMLElement; text: HTMLElement; until: number; x: number; y: number; flip: boolean; born: number };
type Box = { l: number; r: number; t: number; b: number };

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
    return { deg, r, risk, fix, state: 'idle', vis: 0, fixed: 0, el, text: el.querySelector('.hm-tag__text')!, until: 0, x: 0, y: 0, flip: false, born: 0 };
  });
  const T = new Float32Array(40);
  const P = new Float32Array(9).fill(-100);
  let pingIdx = 0;
  const pings: { x: number; y: number; t: number }[] = [];

  const type = (t: Target, label: string, cls: string) => {
    t.el.className = `hm-tag ${cls}`;
    const o = { n: 0 };
    gsap.to(o, { n: label.length, duration: Math.min(0.3, label.length * 0.015), ease: 'none', onUpdate: () => { t.text.textContent = label.slice(0, Math.round(o.n)); } });
  };
  // The label's box from geometry (home.css .hm-tag__text: 34px off the target, 40px up, mono caps),
  // sized for the longer of its two texts so the flip from risk to fix never grows into a neighbour.
  // Computed, not measured: reading layout every frame would thrash.
  const box = (t: Target, flip: boolean): Box => {
    const fs = compact() ? 9.92 : 11.52;
    const w = (Math.max(t.risk.length, t.fix.length) + 2) * fs * 0.64 + fs * 1.3 + 2;
    const l = flip ? t.x - 34 - w : t.x + 34;
    return { l, r: l + w, t: t.y - 40, b: t.y - 40 + fs * 1.25 + fs * 0.6 + 2 };
  };
  const hit = (a: Box, b: Box, m = 8) => a.l < b.r + m && b.l < a.r + m && a.t < b.b + m && b.t < a.b + m;
  // Point the label inward on the right of the disc, and away from whichever screen edge it would cross.
  const side = (t: Target, L: Layout) => {
    let flip = t.x > L.cx + L.r * 0.3;
    if (!flip && box(t, false).r > innerWidth - 8) flip = true;
    if (flip && box(t, true).l < 8) flip = false;
    return flip;
  };
  // The fixed controls (pause, sound, bearing readout) own the bottom-right corner; labels keep out of it.
  const corner = (): Box => compact()
    ? { l: innerWidth - 136, r: innerWidth, t: innerHeight - 104, b: innerHeight }
    : { l: innerWidth - 170, r: innerWidth, t: innerHeight - 180, b: innerHeight };
  const fits = (t: Target, flip: boolean) => { const b = box(t, flip); return b.l >= 8 && b.r <= innerWidth - 8 && b.t >= 8 && b.b <= innerHeight - 8 && !hit(b, corner(), 6); };
  const trigger = (t: Target, now: number) => {
    if (t.state !== 'idle') return;
    // Labels never stack and never leave the screen: skip a target whose label would land on a live one
    // or past an edge, and keep five at most.
    const live = targets.filter((o) => o.state !== 'idle');
    const mine = box(t, t.flip);
    if (live.length >= 5 || !fits(t, t.flip) || live.some((o) => hit(mine, box(o, o.flip)))) return;
    t.born = now;
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
      targets.forEach((t) => {
        const a = (t.deg / 180) * Math.PI;
        t.x = L.cx + Math.sin(a) * t.r * L.r;
        t.y = L.cy - Math.cos(a) * t.r * L.r;
        t.flip = side(t, L);
      });
      // The disc moves between chapters, so live labels can drift into each other or off screen:
      // the older label keeps its place and the newer one stands down at once.
      const live = targets.filter((o) => o.state !== 'idle').sort((p, q) => p.born - q.born);
      live.forEach((t, k) => {
        const b = box(t, t.flip);
        if (!fits(t, t.flip) || live.slice(0, k).some((o) => o.state !== 'idle' && hit(b, box(o, o.flip), 4))) { t.state = 'idle'; t.el.className = 'hm-tag'; }
      });
      targets.forEach((t, i) => {
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
        t.el.style.transform = `translate(${t.x.toFixed(1)}px, ${t.y.toFixed(1)}px)`;
        t.el.classList.toggle('is-flip', t.flip);
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
