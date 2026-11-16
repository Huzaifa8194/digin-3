// /darkintel360: the page starts in the dark web and turns the light on.
// Concept card
//   Idea:       your data is traded in the dark; DarkIntel360 is the light. The film's own story, told by scroll.
//   Signature:  one point of light. It sits in the dark feed, floods the page with light, then rides the
//               orbit around the film through seven modules, circles the five sources and closes on the 360 ring.
//   Motion verb: come into the light (blur resolves to sharp, the way the film cuts).
// One clock (gsap.ticker); every page effect lives in onPage(); reduced motion gets a still, complete page.
import './darkintel360.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { boot, onPage, onScroll, prefersReducedMotion, scrollToTarget, isTouch } from '../engine';

gsap.registerPlugin(ScrollTrigger);

const TAU = Math.PI * 2;
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const phone = () => innerWidth <= 600;

/** A point on an SVG ellipse (viewBox units, rotated), mapped to px inside `host`. The SVG uses preserveAspectRatio="none". */
type Ring = { vw: number; vh: number; cx: number; cy: number; rx: number; ry: number; rot: number };
function ringMapper(svg: SVGSVGElement, host: HTMLElement, ring: Ring) {
  let box = { x: 0, y: 0, w: 1, h: 1 };
  const measure = () => {
    const a = svg.getBoundingClientRect(), b = host.getBoundingClientRect();
    box = { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
  };
  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);
  addEventListener('resize', measure);
  const c = Math.cos((ring.rot * Math.PI) / 180), s = Math.sin((ring.rot * Math.PI) / 180);
  return (theta: number) => {
    const ex = ring.rx * Math.cos(theta), ey = ring.ry * Math.sin(theta);
    const x = ring.cx + ex * c - ey * s, y = ring.cy + ex * s + ey * c;
    return { x: box.x + (x / ring.vw) * box.w, y: box.y + (y / ring.vh) * box.h };
  };
}

/** Lazy video: attach the source shortly before it is needed. */
function arm(video: HTMLVideoElement) {
  if (!video.src && video.dataset.src) { video.src = video.dataset.src; video.load(); }
}

// ---------- 1. The dark feed: leaked records scroll past; a torch (pointer, or the light) reads them ----------
const WORDS = ['combo_list', 'stealer_log', 'db_dump', 'fullz', 'corp_vpn', 'admin_panel', 'payroll', 'hr_export', 'cookies', 'sessions', 'crm_backup', 'mail_access'];
const TLD = ['.pk', '.com', '.ae', '.sa', '.co.uk', '.org', '.net'];
const pick = <T,>(a: T[]) => a[(Math.random() * a.length) | 0];
const hex = (n: number) => Array.from({ length: n }, () => '0123456789abcdef'[(Math.random() * 16) | 0]).join('');
const mask = (n: number) => '*'.repeat(n);
function leakLine() {
  const r = Math.random();
  if (r < 0.3) return `${pick(WORDS)}_${2020 + ((Math.random() * 7) | 0)}.txt   ${(Math.random() * 9 + 0.4).toFixed(1)}M rows   sold   ${hex(8)}`;
  if (r < 0.6) return `${String.fromCharCode(97 + ((Math.random() * 26) | 0))}${mask(4)}.${mask(5)}@${mask(6)}${pick(TLD)}  :  ${mask(10)}  :  https://portal.${mask(6)}${pick(TLD)}/login`;
  if (r < 0.8) return `HOST-${hex(4).toUpperCase()}  ${pick(['PK', 'AE', 'SA', 'GB', 'US', 'TR'])}  passwords ${(Math.random() * 90 + 4) | 0}  cookies ${(Math.random() * 600 + 20) | 0}  ${pick(WORDS)}`;
  return `[${hex(6)}] selling access ${pick(TLD).slice(1).toUpperCase()} gov ${pick(WORDS)}  escrow ok  ${hex(12)}`;
}

function startFeed() {
  onPage(() => {
    const night = $('[data-night]'), canvas = $<HTMLCanvasElement>('[data-feed]'), orb = $('[data-orb]');
    if (!night || !canvas) return;
    const ctx = canvas.getContext('2d')!;
    const reduced = prefersReducedMotion();
    let w = 0, h = 0, dpr = 1, lh = 18, rows: { text: string; hot: number; x: number }[] = [], offset = 0;
    const torch = { x: 0, y: 0, tx: 0, ty: 0, r: 220, user: false };
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, phone() ? 1.5 : 2);
      w = night.clientWidth; h = night.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      lh = phone() ? 15 : 18;
      const n = Math.ceil(h / lh) + 2;
      while (rows.length < n) rows.push({ text: leakLine() + '    ' + leakLine(), hot: Math.random() < 0.12 ? 1 : 0, x: -Math.random() * 300 });
      torch.r = phone() ? 140 : 230;
      const o = orb?.getBoundingClientRect(), b = night.getBoundingClientRect();
      if (o && !torch.user) { torch.tx = torch.x = o.left - b.left + o.width / 2; torch.ty = torch.y = o.top - b.top + o.height / 2; }
    };
    size();
    addEventListener('resize', size);
    night.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const b = night.getBoundingClientRect();
      torch.user = true; torch.tx = e.clientX - b.left; torch.ty = e.clientY - b.top;
    });
    night.addEventListener('pointerleave', () => { torch.user = false; size(); });

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${phone() ? 10 : 12}px "JetBrains Mono", Consolas, monospace`;
      ctx.textBaseline = 'top';
      if (!torch.user && !reduced) { torch.tx += Math.sin(t * 0.6) * 0.6; torch.ty += Math.cos(t * 0.45) * 0.4; }
      torch.x += (torch.tx - torch.x) * 0.12; torch.y += (torch.ty - torch.y) * 0.12;
      const pass = (lit: boolean) => {
        for (let i = 0; i < rows.length; i++) {
          const y = i * lh - offset;
          const row = rows[i];
          ctx.fillStyle = row.hot ? (lit ? 'rgba(255,90,120,0.95)' : 'rgba(255,51,85,0.28)') : (lit ? 'rgba(246,241,251,0.85)' : 'rgba(246,241,251,0.075)');
          ctx.fillText(row.text, row.x, y);
        }
      };
      pass(false);
      ctx.save();
      ctx.beginPath(); ctx.arc(torch.x, torch.y, torch.r, 0, TAU); ctx.clip();
      const g = ctx.createRadialGradient(torch.x, torch.y, 0, torch.x, torch.y, torch.r);
      g.addColorStop(0, 'rgba(155,140,255,0.16)'); g.addColorStop(1, 'rgba(155,140,255,0)');
      ctx.fillStyle = g; ctx.fillRect(torch.x - torch.r, torch.y - torch.r, torch.r * 2, torch.r * 2);
      pass(true);
      ctx.restore();
    };

    if (reduced) { draw(0); return; }
    let on = true, last = 0, frame = 0;
    ScrollTrigger.create({ trigger: night, start: 'top bottom', end: 'bottom top', onToggle: (s) => { on = s.isActive; } });
    const tick = (t: number) => {
      if (!on || document.hidden) return;
      if (phone() && (frame++ & 1)) return; // half rate on phones
      const dt = Math.min(0.05, t - (last || t)); last = t;
      offset += dt * 14;
      if (offset >= lh) { offset -= lh; const r = rows.shift()!; r.text = leakLine() + '    ' + leakLine(); r.hot = Math.random() < 0.12 ? 1 : 0; r.x = -Math.random() * 300; rows.push(r); }
      draw(t);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  });
}

// ---------- 1b. Typing line, then the light comes on (pinned, scrubbed) ----------
function startLight() {
  onPage(({ intro }) => {
    const night = $('[data-night]'), copy = $('[data-night-copy]'), flood = $('[data-flood]'), orb = $('[data-orb]');
    const mark = $('[data-mark]'), ring = $<SVGEllipseElement>('[data-mark-ring]'), type = $('[data-type]');
    const root = document.documentElement;
    if (!night || !copy || !flood || !mark) return;

    // typed line
    if (type && !prefersReducedMotion()) {
      const full = type.textContent || '';
      type.textContent = '';
      const o = { n: 0 };
      intro.add(gsap.to(o, { n: full.length, duration: full.length * 0.055, delay: 0.6, ease: 'none', onUpdate: () => { type.textContent = full.slice(0, Math.round(o.n)); } }), 0);
      intro.from(copy.children, { autoAlpha: 0, filter: 'blur(14px)', y: 24, duration: 1.4, stagger: 0.12, ease: 'expo.out', clearProps: 'filter' }, 0);
      intro.from(orb, { scale: 0, duration: 1.6, ease: 'expo.out' }, 0.5);
    }

    const setScene = (day: boolean) => {
      root.dataset.scene = day ? 'day' : 'night';
      const meta = $<HTMLMetaElement>('meta[name="theme-color"]');
      if (meta) meta.content = day ? '#f1eff9' : '#0b0710';
    };

    if (prefersReducedMotion()) {
      ScrollTrigger.create({ trigger: copy, start: 'top top', end: 'bottom top+=60', onToggle: (s) => setScene(!s.isActive && s.progress > 0.5), onLeave: () => setScene(true), onEnterBack: () => setScene(false) });
      return;
    }

    const at = phone() ? '78% 22%' : '72% 42%';
    gsap.set(flood, { clipPath: `circle(0% at ${at})` });
    if (ring) gsap.set(ring, { strokeDashoffset: 1 });
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: night, start: 'top top', end: '+=170%', pin: true, scrub: 0.7, invalidateOnRefresh: true,
        onUpdate: (s) => setScene(s.progress > 0.42),
      },
    });
    tl.to(copy, { autoAlpha: 0, filter: 'blur(16px)', y: -60, duration: 0.3 }, 0)
      .to('.di-night__hint', { autoAlpha: 0, duration: 0.1 }, 0)
      .to(orb, { scale: 4, duration: 0.3, ease: 'power2.in' }, 0.05)
      .to(flood, { clipPath: `circle(150% at ${at})`, duration: 0.42, ease: 'power2.in' }, 0.22)
      .to(orb, { autoAlpha: 0, duration: 0.08 }, 0.5)
      .from('[data-mark] .di-word', { autoAlpha: 0, filter: 'blur(18px)', scale: 0.92, duration: 0.28 }, 0.5)
      .to(ring, { strokeDashoffset: 0, duration: 0.3, ease: 'power1.inOut' }, 0.58)
      .from(['.di-mark__line', '.di-mark__lede'], { autoAlpha: 0, filter: 'blur(10px)', y: 30, stagger: 0.06, duration: 0.2 }, 0.68)
      .to({}, { duration: 0.12 });

    $('[data-lighton]')?.addEventListener('click', (e) => {
      e.preventDefault();
      const st = tl.scrollTrigger!;
      scrollToTarget(st.start + (st.end - st.start) * 0.9);
    });
  });
}

// ---------- 2. The reel: seven modules, each one a cut of the film ----------
function startReel() {
  onPage(() => {
    const reel = $('[data-reel]'), video = $<HTMLVideoElement>('[data-reel-video]');
    const chapters = $$('[data-ch]'), rail = $$<HTMLAnchorElement>('[data-rail]'), count = $('[data-count]');
    const tilt = $('[data-tilt]'), orb = $('[data-reel-orb]'), figure = $('.di-screen');
    const ringSvg = $<SVGSVGElement>('.di-screen__ring');
    if (!reel || !chapters.length) return;
    const reduced = prefersReducedMotion();
    let idx = -1;

    const cue = (i: number) => {
      if (!video) return;
      const t0 = parseFloat(chapters[i].dataset.t0 || '0');
      if (video.readyState >= 1) video.currentTime = t0 + 0.05;
      else video.addEventListener('loadedmetadata', () => { video.currentTime = t0 + 0.05; }, { once: true });
      video.play().catch(() => {});
    };

    const show = (i: number, instant = false) => {
      if (i === idx) return;
      const prev = idx; idx = i;
      rail.forEach((a, k) => (k === i ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current')));
      if (count) count.textContent = String(i + 1).padStart(2, '0');
      if (reduced) return;
      const next = chapters[i];
      if (prev >= 0) {
        const old = chapters[prev];
        gsap.to(old.children, { autoAlpha: 0, filter: 'blur(10px)', y: i > prev ? -24 : 24, duration: 0.35, stagger: 0.03, ease: 'power2.in', overwrite: true, onComplete: () => old.classList.remove('is-on') });
      }
      next.classList.add('is-on');
      gsap.fromTo(next.children, { autoAlpha: 0, filter: 'blur(12px)', y: i >= prev ? 30 : -30 },
        { autoAlpha: 1, filter: 'blur(0px)', y: 0, duration: instant ? 0 : 0.9, delay: instant ? 0 : 0.2, stagger: 0.06, ease: 'expo.out', overwrite: true });
      // the film itself jumps too: a quick blur over the cut
      if (video && !instant) gsap.fromTo(video, { filter: 'blur(8px) brightness(1.15)' }, { filter: 'blur(0px) brightness(1)', duration: 0.6, ease: 'power2.out' });
      cue(i);
    };

    if (reduced) { chapters.forEach((c) => c.classList.add('is-on')); return; }

    const place = ringSvg && figure ? ringMapper(ringSvg, figure, { vw: 1000, vh: 600, cx: 500, cy: 300, rx: 490, ry: 250, rot: -6 }) : null;
    let p = 0, active = false;

    const st = ScrollTrigger.create({
      trigger: reel, start: 'top top', end: () => '+=' + innerHeight * 5.6, pin: true, scrub: true, invalidateOnRefresh: true,
      onUpdate: (s) => { p = s.progress; show(Math.min(chapters.length - 1, Math.floor(p * chapters.length))); },
      onToggle: (s) => { active = s.isActive; if (!active) video?.pause(); else video?.play().catch(() => {}); },
    });
    ScrollTrigger.create({ trigger: reel, start: 'top bottom+=100%', once: true, onEnter: () => video && arm(video) });
    show(0, true);

    rail.forEach((a, i) => a.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToTarget(st.start + ((i + 0.5) / chapters.length) * (st.end - st.start));
    }));

    const tick = (t: number) => {
      if (!active && !ScrollTrigger.isInViewport(reel)) return;
      const n = chapters.length, local = p * n - Math.min(n - 1, Math.floor(p * n));
      // the screen swings like the film's dashboards: tilted at each cut, square to you mid-chapter
      const swing = Math.cos(local * TAU);
      if (tilt) gsap.set(tilt, { rotationY: -9 - 6 * swing + Math.sin(t * 0.5) * 0.6, rotationX: 5 + 2.5 * swing, scale: 0.97 - 0.03 * swing });
      if (place && orb) {
        const pt = place(-Math.PI / 2 + p * TAU + Math.sin(t * 0.8) * 0.015);
        gsap.set(orb, { x: pt.x, y: pt.y });
      }
      if (video && idx >= 0 && !video.paused) {
        const t1 = parseFloat(chapters[idx].dataset.t1 || '0');
        if (video.currentTime >= t1 - 0.05) video.currentTime = parseFloat(chapters[idx].dataset.t0 || '0') + 0.05;
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  });
}

// ---------- 3. Scoring: the film's filter cut on loop; the two scores count up ----------
function startScored() {
  onPage(() => {
    const clip = $<HTMLVideoElement>('[data-clip]');
    const reduced = prefersReducedMotion();
    if (clip) {
      const t0 = parseFloat(clip.dataset.t0 || '0'), t1 = parseFloat(clip.dataset.t1 || '0');
      clip.loop = false;
      const seek = () => { if (clip.currentTime < t0 || clip.currentTime >= t1) clip.currentTime = t0; };
      clip.addEventListener('timeupdate', () => { if (clip.currentTime >= t1) clip.currentTime = t0; });
      ScrollTrigger.create({
        trigger: clip, start: 'top bottom+=50%', end: 'bottom top',
        onToggle: (s) => {
          if (s.isActive) { arm(clip); if (clip.readyState >= 1) seek(); else clip.addEventListener('loadedmetadata', seek, { once: true }); if (!reduced) clip.play().catch(() => {}); }
          else clip.pause();
        },
      });
      if (reduced) { clip.controls = true; clip.removeAttribute('aria-label'); }
    }
    if (reduced) return;
    $$('[data-score]').forEach((card) => {
      const n = parseInt(card.dataset.score || '0', 10), arc = $<SVGCircleElement>('.di-score__arc', card), out = $('[data-score-n]', card);
      const o = { v: 0 };
      gsap.set(arc, { strokeDasharray: '0 100' });
      if (out) out.textContent = '0';
      gsap.to(o, {
        v: n, duration: 1.8, ease: 'expo.out', delay: 0.3,
        scrollTrigger: { trigger: card, start: 'top 85%', once: true },
        onUpdate: () => { gsap.set(arc, { strokeDasharray: `${o.v.toFixed(1)} 100` }); if (out) out.textContent = String(Math.round(o.v)); },
      });
    });
  });
}

// ---------- 4. Sources: the light circles the orbit; each source lights as it passes ----------
function startOrbit() {
  onPage(() => {
    const host = $('[data-orbit]'), svg = $<SVGSVGElement>('.di-orbit__ring'), orb = $('[data-orbit-orb]');
    const items = $$('[data-node]');
    if (!host || !svg || !orb || prefersReducedMotion()) return;
    const place = ringMapper(svg, host, { vw: 800, vh: 520, cx: 400, cy: 260, rx: 370, ry: 190, rot: -10 });
    let on = false, phase = 0, last = 0;
    ScrollTrigger.create({ trigger: host, start: 'top bottom', end: 'bottom top', onToggle: (s) => { on = s.isActive; } });
    const tick = (t: number) => {
      if (!on) { last = t; return; }
      phase = (phase + Math.min(0.05, t - (last || t)) / 14) % 1; last = t;
      const pt = place(phase * TAU - Math.PI / 2);
      gsap.set(orb, { x: pt.x, y: pt.y });
      items.forEach((li) => {
        const d = Math.abs(((phase - parseFloat(li.dataset.node || '0') + 1.5) % 1) - 0.5);
        li.classList.toggle('is-lit', d < 0.09);
      });
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  });
}

// ---------- 5. End: the ring draws, the light settles into orbit around the 360 ----------
function startEnd() {
  onPage(() => {
    const host = $('.di-end__mark'), svg = $<SVGSVGElement>('.di-end__ring'), ring = $<SVGEllipseElement>('[data-end-ring]'), orb = $('[data-end-orb]');
    if (!host || !svg || !orb || prefersReducedMotion()) return;
    gsap.fromTo(ring, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.8, ease: 'expo.inOut', scrollTrigger: { trigger: host, start: 'top 80%', once: true } });
    gsap.from('[data-endword]', { autoAlpha: 0, filter: 'blur(18px)', scale: 0.94, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: host, start: 'top 80%', once: true } });
    const place = ringMapper(svg, host, { vw: 1000, vh: 300, cx: 500, cy: 150, rx: 480, ry: 110, rot: -5 });
    let on = false;
    ScrollTrigger.create({ trigger: host, start: 'top bottom', end: 'bottom top', onToggle: (s) => { on = s.isActive; } });
    const tick = (t: number) => {
      if (!on) return;
      const pt = place(t * 0.35 - Math.PI * 0.6);
      gsap.set(orb, { x: pt.x, y: pt.y, autoAlpha: Math.sin(t * 0.35 - Math.PI * 0.6) > 0.55 ? 0.35 : 1 }); // passes behind the word
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  });
}

// ---------- Chrome: header state, current section, the film ----------
function startChrome() {
  onPage(() => {
    const top = $('.di-top');
    onScroll((s) => top?.classList.toggle('is-scrolled', s.y > 30));
    const links = $$<HTMLAnchorElement>('.di-top__nav a[href^="#"]');
    links.forEach((a) => {
      const sec = $(a.hash);
      if (!sec) return;
      ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => (s.isActive ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')) });
    });

    const dialog = $<HTMLDialogElement>('[data-dialog]'), film = $<HTMLVideoElement>('.di-dialog__video');
    if (!dialog || !film) return;
    $$('[data-film]').forEach((b) => b.addEventListener('click', () => {
      arm(film);
      dialog.showModal();
      film.currentTime = 0;
      film.play().catch(() => {});
    }));
    dialog.addEventListener('close', () => film.pause());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    if (isTouch()) film.setAttribute('playsinline', '');
  });
}

startFeed();
startLight();
startReel();
startScored();
startOrbit();
startEnd();
startChrome();
boot();
