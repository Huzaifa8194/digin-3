// The Live Map, rebuilt locally: Natural Earth outlines, exposure fill, flag pins.
// 2D: SVG, zoom and drag. 3D: canvas orthographic globe, drag to turn, idles slowly. Loaded on demand.
import { geoEqualEarth, geoOrthographic, geoPath, geoCentroid, geoContains, geoDistance, geoGraticule10, type GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import { gsap } from 'gsap';
import world from 'world-atlas/countries-110m.json';
import { LIVE, FLAG } from './data';
import { flagUrl } from './flags';

type F = GeoJSON.Feature<GeoJSON.Geometry, { name: string }>;
const NAME_FIX: Record<string, string> = { 'United States of America': 'United States' };
// Countries with activity but no number on the demo list: tinted, pinned, no count.
const ACTIVE = ['Italy', 'United States', 'Pakistan', 'France', 'India', 'Germany', 'Indonesia', 'China', 'Uruguay', 'Brazil', 'Spain', 'United Kingdom', 'Iran', 'Vietnam', 'South Africa', 'Gabon', 'Colombia', 'Philippines', 'Japan', 'Netherlands', 'Turkey', 'Poland', 'Ukraine', 'Egypt', 'Saudi Arabia', 'Iraq', 'Kazakhstan', 'Romania', 'Greece', 'Morocco', 'Nigeria', 'Mexico', 'Canada', 'Russia'];
const EXTRA_PINS: Record<string, [number, number]> = { Bahrain: [50.55, 26.07], Singapore: [103.82, 1.35] };

export type MapApi = { mode: (m: '2d' | '3d') => void; focus: (country: string) => void; zoom: (d: number) => void; destroy: () => void };

export function mountMap(host: HTMLElement): MapApi {
  const topo = world as unknown as Parameters<typeof feature>[0] & { objects: { countries: never } };
  const countries = (feature(topo, (topo as any).objects.countries) as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry, { name: string }>).features as F[];
  const count: Record<string, number> = Object.fromEntries(LIVE.top);
  const max = Math.max(...LIVE.top.map(([, n]) => n));
  const nameOf = (f: F) => NAME_FIX[f.properties.name] || f.properties.name;
  const level = (name: string) => (count[name] != null ? 0.35 + 0.65 * Math.sqrt(count[name] / max) : ACTIVE.includes(name) ? 0.22 : 0);
  const pins = [...LIVE.top.map(([n]) => n), ...ACTIVE].filter((n, i, a) => a.indexOf(n) === i && FLAG[n]);

  host.innerHTML = `<div class="pm"><div class="pm__2d"><div class="pm__pan"><svg class="pm__svg" aria-label="World map of exposure" role="img"></svg><div class="pm__pins"></div></div></div><canvas class="pm__3d" hidden aria-label="Globe of exposure" role="img"></canvas><p class="pm__label" hidden></p></div>`;
  const svg = host.querySelector<SVGSVGElement>('.pm__svg')!, pan = host.querySelector<HTMLElement>('.pm__pan')!, pinBox = host.querySelector<HTMLElement>('.pm__pins')!;
  const canvas = host.querySelector<HTMLCanvasElement>('.pm__3d')!, label = host.querySelector<HTMLElement>('.pm__label')!;
  const ctx = canvas.getContext('2d')!;
  let W = 1, H = 1, mode: '2d' | '3d' = '2d', z = 1, px = 0, py = 0, alive = true, focused = '';
  const flat: GeoProjection = geoEqualEarth();
  const globe: GeoProjection = geoOrthographic().clipAngle(90);
  const rot = { l: -30, p: -25, idle: true, gz: 1 };
  const imgs: Record<string, HTMLImageElement> = {};
  pins.forEach((n) => { const im = new Image(); im.src = flagUrl(FLAG[n]); imgs[n] = im; });

  const cssVar = (k: string) => getComputedStyle(host).getPropertyValue(k).trim();
  const show = (txt: string, x: number, y: number) => { label.textContent = txt; label.hidden = false; gsap.set(label, { x, y }); };
  const hide = () => { label.hidden = true; };
  const centroid = (n: string): [number, number] | null => {
    const f = countries.find((c) => nameOf(c) === n);
    return f ? (geoCentroid(f) as [number, number]) : EXTRA_PINS[n] || null;
  };

  function draw2d() {
    flat.fitExtent([[10, 60], [W - 10, H - 10]], { type: 'Sphere' });
    const path = geoPath(flat);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = `<path class="pm__sphere" d="${path({ type: 'Sphere' })}"/><path class="pm__grat" d="${path(geoGraticule10())}"/>` +
      countries.map((f) => { const n = nameOf(f), l = level(n); return `<path class="pm__c${l ? ' is-hot' : ''}${n === focused ? ' is-focus' : ''}" style="--l:${l.toFixed(2)}" d="${path(f) || ''}" data-name="${n}"/>`; }).join('');
    pinBox.innerHTML = pins.map((n) => { const c = centroid(n); if (!c) return ''; const p = flat(c); return p ? `<img class="pm__pin${count[n] != null ? ' is-count' : ''}${n === focused ? ' is-focus' : ''}" style="left:${p[0].toFixed(1)}px;top:${p[1].toFixed(1)}px" src="${flagUrl(FLAG[n])}" alt="" data-name="${n}">` : ''; }).join('');
  }
  function draw3d() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = Math.min(W, H - 60) * 0.44 * rot.gz;
    globe.scale(r).translate([W / 2, H / 2 + 26]).rotate([rot.l, rot.p]);
    const path = geoPath(globe, ctx);
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = cssVar('--pm-sea'); ctx.fill();
    ctx.beginPath(); path(geoGraticule10()); ctx.strokeStyle = cssVar('--pm-grat'); ctx.lineWidth = 0.6; ctx.stroke();
    const land = cssVar('--pm-land'), hot = cssVar('--pm-hot'), edge = cssVar('--pm-edge');
    for (const f of countries) {
      const n = nameOf(f), l = level(n);
      ctx.beginPath(); path(f);
      ctx.fillStyle = l ? `color-mix(in srgb, ${hot} ${Math.round(l * 100)}%, ${land})` : land;
      if (!CSS.supports('color', 'color-mix(in srgb, red 50%, blue)')) ctx.fillStyle = l ? hot : land;
      ctx.fill(); ctx.strokeStyle = n === focused ? hot : edge; ctx.lineWidth = n === focused ? 2 : 0.5; ctx.stroke();
    }
    const center: [number, number] = [-rot.l, -rot.p];
    for (const n of pins) {
      const c = centroid(n); if (!c || geoDistance(c, center) > Math.PI / 2 - 0.08) continue;
      const p = globe(c); const im = imgs[n]; if (!p) continue;
      const w = count[n] != null ? 20 : 15, h = w * 0.75;
      ctx.fillStyle = '#fff'; ctx.fillRect(p[0] - w / 2 - 2, p[1] - h / 2 - 2, w + 4, h + 4);
      if (im.complete && im.naturalWidth) ctx.drawImage(im, p[0] - w / 2, p[1] - h / 2, w, h);
    }
    ctx.beginPath(); path({ type: 'Sphere' }); ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.stroke();
  }
  const size = () => { W = host.clientWidth || 800; H = host.clientHeight || 500; mode === '2d' ? draw2d() : draw3d(); };
  const ro = new ResizeObserver(size); ro.observe(host);
  size();

  // ---- 2D: hover, zoom, drag ----
  svg.addEventListener('pointermove', (e) => {
    const t = (e.target as Element).closest<SVGPathElement>('.pm__c');
    if (!t) return hide();
    const n = t.dataset.name!, r = host.getBoundingClientRect();
    show(count[n] != null ? `${n} · ${count[n]} exposures` : level(n) ? `${n} · activity reported` : n, e.clientX - r.left + 14, e.clientY - r.top + 14);
  });
  svg.addEventListener('pointerleave', hide);
  const setPan = () => gsap.to(pan, { x: px, y: py, scale: z, duration: 0.6, ease: 'expo.out', transformOrigin: '50% 50%' });
  {
    let down = false, sx = 0, sy = 0, bx = 0, by = 0;
    host.addEventListener('pointerdown', (e) => { down = true; sx = e.clientX; sy = e.clientY; bx = px; by = py; host.setPointerCapture(e.pointerId); rot.idle = false; });
    host.addEventListener('pointermove', (e) => {
      if (!down) { if (mode === '3d') hover3d(e); return; }
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (mode === '2d') { px = bx + dx; py = by + dy; gsap.set(pan, { x: px, y: py }); }
      else { rot.l += (e.movementX || 0) * 0.35; rot.p = Math.max(-80, Math.min(80, rot.p - (e.movementY || 0) * 0.35)); draw3d(); }
    });
    const up = () => { down = false; setTimeout(() => { rot.idle = true; }, 2500); };
    host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
  }
  function hover3d(e: PointerEvent) {
    const r = host.getBoundingClientRect(), ll = globe.invert?.([e.clientX - r.left, e.clientY - r.top]);
    if (!ll || geoDistance(ll, [-rot.l, -rot.p]) > Math.PI / 2) return hide();
    const f = countries.find((c) => geoContains(c, ll));
    if (!f) return hide();
    const n = nameOf(f);
    show(count[n] != null ? `${n} · ${count[n]} exposures` : level(n) ? `${n} · activity reported` : n, e.clientX - r.left + 14, e.clientY - r.top + 14);
  }
  const spin = () => { if (alive && mode === '3d' && rot.idle && !document.hidden) { rot.l += 0.12; draw3d(); } };
  gsap.ticker.add(spin);

  return {
    mode(m2) {
      mode = m2; hide();
      host.querySelector<HTMLElement>('.pm__2d')!.hidden = m2 === '3d';
      canvas.hidden = m2 === '2d';
      size();
      if (m2 === '3d') gsap.fromTo(canvas, { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'expo.out' });
    },
    focus(n) {
      focused = n;
      const c = centroid(n); if (!c) return;
      if (mode === '2d') {
        draw2d();
        const p = flat(c)!; z = 2.4; px = (W / 2 - p[0]) * z; py = (H / 2 - p[1]) * z; setPan();
        const r = host.getBoundingClientRect();
        show(count[n] != null ? `${n} · ${count[n]} exposures` : n, r.width / 2 + 16, r.height / 2 + 12);
      } else {
        rot.idle = false;
        gsap.to(rot, { l: -c[0], p: Math.max(-60, Math.min(60, -c[1])), duration: 1.4, ease: 'expo.inOut', onUpdate: draw3d, onComplete: () => { setTimeout(() => { rot.idle = true; }, 3000); } });
      }
    },
    zoom(d) {
      if (mode === '3d') { gsap.to(rot, { gz: Math.max(0.7, Math.min(2.6, rot.gz * (d > 0 ? 1.3 : 1 / 1.3))), duration: 0.5, ease: 'expo.out', onUpdate: draw3d }); return; }
      z = Math.max(1, Math.min(5, z * (d > 0 ? 1.5 : 1 / 1.5))); if (z === 1) { px = 0; py = 0; } setPan();
    },
    destroy() { alive = false; gsap.ticker.remove(spin); ro.disconnect(); host.innerHTML = ''; },
  };
}
