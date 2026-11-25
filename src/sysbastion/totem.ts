// Chapter 05: one gold object per Harden section, built from extruded 2D shapes. They slide in
// from the side you clicked (scale 2.3 -> 1, expo), the old one leaves the other way (-> 0.2),
// then sway and lean toward the pointer. Ported from the reference's totem stage.
import * as THREE from 'three';
import { addTick } from './clock';
import type { ModuleShape } from './content';
import { dpr, onQuality, onViewport, reduced, richGL, tierScale } from './device';

const GOLD = new THREE.Color('#c79650');
const SIZE = 2.6, ASPECT = 1440 / 900;
const M = { dur: 1.1, offset: 5.9, rot: 0.26, enterScale: 2.3, exitScale: 0.2 };
const inOutCubic = (e: number) => (e < 0.5 ? 4 * e * e * e : 1 - (-2 * e + 2) ** 3 / 2);
const inOutExpo = (e: number) => (e === 0 || e === 1 ? e : e < 0.5 ? 2 ** (20 * e - 10) / 2 : (2 - 2 ** (-20 * e + 10)) / 2);

function envTexture(renderer: THREE.WebGLRenderer) {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 512;
  const c = cv.getContext('2d')!;
  let g = c.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#23252b'); g.addColorStop(0.5, '#0d0e10'); g.addColorStop(1, '#050506');
  c.fillStyle = g; c.fillRect(0, 0, 1024, 512);
  g = c.createRadialGradient(360, 150, 10, 360, 150, 300);
  g.addColorStop(0, '#fff5e2'); g.addColorStop(0.45, '#caa86e'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, 1024, 512);
  g = c.createRadialGradient(800, 200, 6, 800, 200, 190);
  g.addColorStop(0, '#dbe3ff'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, 1024, 512);
  const t = new THREE.CanvasTexture(cv);
  t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(t).texture;
  t.dispose(); pm.dispose();
  return env;
}

// --- shapes, drawn on a 2-unit box centred at 0 (y up) ---
const circle = (r: number, x = 0, y = 0, cw = false) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, cw); return p; };
const rect = (x: number, y: number, w: number, h: number) => { const p = new THREE.Path(); p.moveTo(x, y); p.lineTo(x + w, y); p.lineTo(x + w, y + h); p.lineTo(x, y + h); p.closePath(); return p; };
const rectShape = (x: number, y: number, w: number, h: number) => { const s = new THREE.Shape(); s.moveTo(x, y); s.lineTo(x + w, y); s.lineTo(x + w, y + h); s.lineTo(x, y + h); s.closePath(); return s; };

function shapesFor(kind: ModuleShape): THREE.Shape[] {
  switch (kind) {
    case 'shield': {
      const s = new THREE.Shape();
      s.moveTo(0, 1); s.lineTo(0.82, 0.7); s.lineTo(0.82, 0.05);
      s.bezierCurveTo(0.82, -0.5, 0.45, -0.85, 0, -1.05);
      s.bezierCurveTo(-0.45, -0.85, -0.82, -0.5, -0.82, 0.05);
      s.lineTo(-0.82, 0.7); s.closePath();
      const tick = new THREE.Path();
      tick.moveTo(-0.42, 0.02); tick.lineTo(-0.12, -0.28); tick.lineTo(0.44, 0.3); tick.lineTo(0.32, 0.42); tick.lineTo(-0.12, -0.04); tick.lineTo(-0.3, 0.14); tick.closePath();
      s.holes.push(tick);
      return [s];
    }
    case 'tower': {
      const s = new THREE.Shape();
      s.moveTo(-0.62, -1.05); s.lineTo(0.62, -1.05); s.lineTo(0.62, 0.62);
      for (let i = 0; i < 4; i++) { const x = 0.62 - i * 0.31; s.lineTo(x, 1); s.lineTo(x - 0.16, 1); s.lineTo(x - 0.16, 0.8); s.lineTo(x - 0.31, 0.8); }
      s.lineTo(-0.62, 0.8); s.closePath();
      const door = new THREE.Path(); door.moveTo(-0.2, -1.05 + 0.001); door.lineTo(0.2, -1.05 + 0.001); door.lineTo(0.2, -0.55); door.absarc(0, -0.55, 0.2, 0, Math.PI, false); door.closePath();
      s.holes.push(rect(-0.32, 0.15, 0.16, 0.34), rect(0.16, 0.15, 0.16, 0.34));
      const base = s; base.holes.push(door);
      return [base];
    }
    case 'scroll': {
      const s = new THREE.Shape();
      s.moveTo(-0.72, -1); s.lineTo(0.72, -1); s.lineTo(0.72, 0.62); s.lineTo(0.34, 1); s.lineTo(-0.72, 1); s.closePath();
      for (let i = 0; i < 4; i++) s.holes.push(rect(-0.48, 0.42 - i * 0.34, i === 3 ? 0.56 : 0.96, 0.12));
      const fold = new THREE.Shape(); fold.moveTo(0.3, 0.62); fold.lineTo(0.72, 0.62); fold.lineTo(0.3, 1.04); fold.closePath();
      return [s, fold];
    }
    case 'prompt': {
      const s = new THREE.Shape();
      const r = 0.22, w = 1, h = 0.82;
      s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r); s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h);
      s.lineTo(-w + r, h); s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
      const chev = new THREE.Path();
      chev.moveTo(-0.62, 0.36); chev.lineTo(-0.48, 0.5); chev.lineTo(-0.06, 0.08); chev.lineTo(-0.48, -0.34); chev.lineTo(-0.62, -0.2); chev.lineTo(-0.34, 0.08); chev.closePath();
      s.holes.push(chev, rect(0.04, -0.4, 0.56, 0.14));
      return [s];
    }
    case 'globe': {
      const ring = new THREE.Shape(); ring.absarc(0, 0, 1, 0, Math.PI * 2, false); ring.holes.push(circle(0.84, 0, 0, true));
      const mer = new THREE.Shape(); mer.absellipse(0, 0, 0.42, 0.92, 0, Math.PI * 2, false, 0);
      const merHole = new THREE.Path(); merHole.absellipse(0, 0, 0.28, 0.8, 0, Math.PI * 2, true, 0); mer.holes.push(merHole);
      const eq = rectShape(-0.92, -0.07, 1.84, 0.14), lat1 = rectShape(-0.72, 0.42, 1.44, 0.11), lat2 = rectShape(-0.72, -0.53, 1.44, 0.11);
      return [ring, mer, eq, lat1, lat2];
    }
    case 'book': {
      const l = new THREE.Shape(); l.moveTo(-0.06, -0.86); l.lineTo(-1.02, -0.62); l.lineTo(-1.02, 0.92); l.lineTo(-0.06, 0.7); l.closePath();
      const r = new THREE.Shape(); r.moveTo(0.06, -0.86); r.lineTo(1.02, -0.62); r.lineTo(1.02, 0.92); r.lineTo(0.06, 0.7); r.closePath();
      for (let i = 0; i < 3; i++) { l.holes.push(rect(-0.86, 0.38 - i * 0.36, 0.62, 0.08)); r.holes.push(rect(0.24, 0.38 - i * 0.36, 0.62, 0.08)); }
      return [l, r];
    }
  }
}

function build(kind: ModuleShape, env: THREE.Texture) {
  const geo = new THREE.ExtrudeGeometry(shapesFor(kind), { depth: 0.42, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.05, bevelSegments: 4, curveSegments: 28 });
  geo.center();
  geo.computeBoundingBox();
  const sz = new THREE.Vector3(); geo.boundingBox!.getSize(sz);
  const s = SIZE / Math.max(sz.x, sz.y, sz.z);
  geo.scale(s, s, s);
  const mat = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.3, envMap: env, envMapIntensity: 1 });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, mat));
  return g;
}

type Item = { group: THREE.Group; mode: 'enter' | 'exit' | 'idle'; t: number; dir: number };

export function mountTotem(canvas: HTMLCanvasElement, isActive: () => boolean) {
  if (!richGL()) return { show: () => {}, dispose: () => {} };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const ratio = () => dpr(2, 2) * tierScale([1, 0.8, 0.66]);
  renderer.setPixelRatio(ratio());
  renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  cam.position.set(0, 0.15, 5.2); cam.lookAt(0, 0, 0);
  const env = envTexture(renderer);
  const light = (col: string, i: number, d: number, p: [number, number, number]) => { const l = new THREE.PointLight(col, i, d, 2); l.position.set(...p); scene.add(l); };
  light('#ffffff', 20, 7, [2.29, -0.29, 1.11]);
  light('#9fb6ff', 24.5, 5.9, [-1.8, 0.2, -1.1]);
  const items: Item[] = [];
  const pointer = { x: 0, y: 0, on: false };
  const move = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    pointer.on = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  };
  addEventListener('pointermove', move, { passive: true });
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(ratio());
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.zoom = Math.min(1, w / h / ASPECT); cam.updateProjectionMatrix();
  };
  resize();
  const offView = onViewport(resize);
  onQuality(resize);
  const still = reduced();
  let tx = 0, ty = 0;

  const show = (kind: ModuleShape, dir: number) => {
    const g = build(kind, env);
    g.position.x = dir * M.offset; g.scale.setScalar(still ? 1 : M.enterScale);
    scene.add(g);
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.mode === 'exit' || still) { scene.remove(it.group); dispose(it.group); items.splice(i, 1); }
      else { it.mode = 'exit'; it.t = 0; it.dir = dir; }
    }
    items.push({ group: g, mode: still ? 'idle' : 'enter', t: 0, dir });
  };
  const dispose = (g: THREE.Group) => g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });

  const off = addTick((time, dt) => {
    if (!isActive() || !items.length) return;
    const gain = pointer.on && !still ? 0.32 : 0;
    const a = Math.max(-0.5, Math.min(0.5, pointer.x * gain)), b = Math.max(-0.4, Math.min(0.4, -pointer.y * gain));
    const k = Math.min(1, dt * 4);
    tx += (a - tx) * k; ty += (b - ty) * k;
    const bob = still ? 0 : Math.sin(time * 0.6) * 0.07, sway = still ? 0 : Math.sin(time * 0.45) * 0.06, roll = still ? 0 : Math.sin(time * 0.5 + 1.3) * 0.025;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      let r = 0;
      if (it.mode !== 'idle') it.t = Math.min(1, it.t + dt / M.dur);
      if (it.mode === 'enter') {
        const e = inOutExpo(it.t), n = inOutCubic(it.t);
        it.group.position.x = it.dir * M.offset * (1 - e);
        it.group.scale.setScalar(M.enterScale - (M.enterScale - 1) * n);
        r = it.dir * M.rot * (1 - n);
        if (it.t >= 1) it.mode = 'idle';
      } else if (it.mode === 'exit') {
        const e = inOutExpo(it.t), n = inOutCubic(it.t);
        it.group.position.x = -it.dir * M.offset * e;
        it.group.scale.setScalar(1 - (1 - M.exitScale) * n);
        r = -it.dir * M.rot * n;
        if (it.t >= 1) { scene.remove(it.group); dispose(it.group); items.splice(i, 1); continue; }
      } else { it.group.position.x = 0; it.group.scale.setScalar(1); }
      it.group.position.y = bob;
      it.group.rotation.set(ty, tx + r + sway, roll);
    }
    renderer.render(scene, cam);
  });
  return {
    show,
    dispose() { off(); offView(); removeEventListener('pointermove', move); items.forEach((i) => dispose(i.group)); env.dispose(); renderer.dispose(); },
  };
}
