// The fixed 3D stage for /aeronexus/: one phone that the whole page follows.
//  desk  : top-down staging desk (hero)
//  float : the phone alone in the dark (intro, features, Lost Mode)
//  macro : low and close on the desk (remote commands)
//  wire  : wireframe phones behind the "choose your own" wordmark
import * as THREE from 'three';
import { drawScreen, SW, SH, type Mode } from './screen';

export type StageState = {
  mode: 'desk' | 'float' | 'macro' | 'wire' | 'off'; opacity: number;
  px: number; py: number; ps: number; rx: number; ry: number; rz: number; drop: number; spin: number;
  screen: Mode; sp: number; ring: number; ringOut: number; rgx?: number; wire: number;
  gray: number; intro: number; shake: number; mx: number; my: number;
};

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const TEAL = 0x2dd4bf, AMBER = 0xf2a65a;

function rrShape(w: number, h: number, r: number) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function tex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function createStage(canvas: HTMLCanvasElement) {
  const LOW = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  const scr = document.createElement('canvas'); scr.width = SW; scr.height = SH; const sctx = scr.getContext('2d')!;
  drawScreen(sctx, 'home', 0, 9.68);
  let renderer: THREE.WebGLRenderer | null = null;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch { renderer = null; }
  if (!renderer) {
    canvas.style.display = 'none';
    return { ok: false, render() {}, resize() {}, dirty() {}, hit: () => false, viewW: () => 9.5, screenCanvas: () => scr };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, Math.min(innerWidth, innerHeight) < 760 ? 2 : LOW ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xcdeeff, 0x0a1218, 0.85));
  const key = new THREE.DirectionalLight(0xffe6c8, 2.5); key.position.set(-5, 9, 4); key.castShadow = true;
  key.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048); key.shadow.bias = -0.0004; key.shadow.radius = 7;
  Object.assign(key.shadow.camera, { left: -10, right: 10, top: 8, bottom: -8, near: 1, far: 30 }); scene.add(key);
  const rim = new THREE.DirectionalLight(TEAL, 1.1); rim.position.set(6, 3, -4); scene.add(rim);
  const fill = new THREE.PointLight(0xffffff, 26, 40); fill.position.set(2, 2, 8); scene.add(fill);

  // ---- the phone ----
  const PW = 0.72, PH = 1.5, PD = 0.07;
  const bodyGeo = new THREE.ExtrudeGeometry(rrShape(PW, PH, 0.1), { depth: PD, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 10 });
  bodyGeo.translate(0, 0, -PD / 2);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2b3946, metalness: 0.3, roughness: 0.42 });
  const sw = 0.692, sh = 1.45;
  const scrGeo = new THREE.ShapeGeometry(rrShape(sw, sh, 0.085), 10);
  { const p = scrGeo.attributes.position, uv = scrGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / sw + 0.5, p.getY(i) / sh + 0.5); }
  const scrTex = new THREE.CanvasTexture(scr); scrTex.colorSpace = THREE.SRGBColorSpace; scrTex.anisotropy = 8;
  const scrMat = new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false });
  const makePhone = (screen: THREE.Material) => {
    const g = new THREE.Group(); const b = new THREE.Mesh(bodyGeo, bodyMat); b.castShadow = true; g.add(b);
    const s = new THREE.Mesh(scrGeo, screen); s.position.z = PD / 2 + 0.0135; g.add(s);
    const bump = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.02), new THREE.MeshStandardMaterial({ color: 0x0f1820, metalness: 0.6, roughness: 0.3 })); bump.position.set(0.19, 0.5, -PD / 2 - 0.02); g.add(bump);
    g.rotation.order = 'YXZ'; return { g, body: b };
  };
  const { g: phone, body: phoneBody } = makePhone(scrMat); scene.add(phone);

  // ---- the staging desk ----
  const desk = new THREE.Group(); scene.add(desk);
  const deskTex = tex(1024, 1024, (c) => {
    c.fillStyle = '#1a2733'; c.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 1400; i++) { const y = Math.random() * 1024, w = 120 + Math.random() * 900; c.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${0.008 + Math.random() * 0.022})` : `rgba(0,0,0,${0.02 + Math.random() * 0.05})`; c.fillRect(Math.random() * 1024 - 200, y, w, 1 + Math.random() * 2.5); }
  });
  deskTex.wrapS = deskTex.wrapT = THREE.RepeatWrapping; deskTex.repeat.set(3, 2);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(44, 30), new THREE.MeshStandardMaterial({ map: deskTex, roughness: 0.82, metalness: 0.05 }));
  top.rotation.x = -Math.PI / 2; top.receiveShadow = true; desk.add(top);

  const MW = 9.6, MH = 6.2, TW = 2048, TH = Math.round((2048 * MH) / MW);
  const drawMat = (c: CanvasRenderingContext2D) => {
    const g = c.createLinearGradient(0, 0, TW, TH); g.addColorStop(0, '#0e4443'); g.addColorStop(1, '#0a3232'); c.fillStyle = g; c.fillRect(0, 0, TW, TH);
    const step = TW / 96;
    for (let i = 0; i <= 96; i++) { const major = i % 5 === 0; c.strokeStyle = `rgba(190,255,240,${major ? 0.34 : 0.13})`; c.lineWidth = major ? 2 : 1; c.beginPath(); c.moveTo(i * step, 0); c.lineTo(i * step, TH); c.stroke(); }
    for (let j = 0; j * step <= TH; j++) { const major = j % 5 === 0; c.strokeStyle = `rgba(190,255,240,${major ? 0.34 : 0.13})`; c.lineWidth = major ? 2 : 1; c.beginPath(); c.moveTo(0, j * step); c.lineTo(TW, j * step); c.stroke(); }
    c.fillStyle = 'rgba(210,255,244,.62)'; c.font = '20px "DM Mono", monospace'; c.textAlign = 'center';
    for (let i = 5; i < 96; i += 5) c.fillText(String(i * 5), i * step, TH - 26);
    c.textAlign = 'left'; for (let j = 5; j * step < TH - 60; j += 5) c.fillText(String(j * 5), 22, TH - j * step + 7);
    // enrol zone under the phone, and the mat's own label
    c.save(); c.translate(662, 884); c.rotate(-0.245); c.strokeStyle = 'rgba(210,255,244,.55)'; c.lineWidth = 2.5; c.setLineDash([10, 9]); c.strokeRect(-150, -262, 300, 524); c.setLineDash([]);
    c.fillStyle = 'rgba(210,255,244,.7)'; c.font = '600 19px "Hanken Grotesk", sans-serif'; c.textAlign = 'center'; c.fillText('PLACE DEVICE TO ENROLL', 0, -278); c.restore();
    c.textAlign = 'right'; c.fillStyle = 'rgba(210,255,244,.8)'; c.font = '700 34px Sora, sans-serif'; c.fillText('AERONEXUS', TW - 70, 96);
    c.font = '18px "DM Mono", monospace'; c.fillStyle = 'rgba(210,255,244,.55)'; c.fillText('DEVICE STAGING MAT  /  480 x 310', TW - 70, 126);
  };
  const matCv = document.createElement('canvas'); matCv.width = TW; matCv.height = TH; drawMat(matCv.getContext('2d')!);
  const matTex = new THREE.CanvasTexture(matCv); matTex.colorSpace = THREE.SRGBColorSpace; matTex.anisotropy = 8; matTex.repeat.set(1 / MW, 1 / MH); matTex.offset.set(0.5, 0.5);
  const matGeo = new THREE.ExtrudeGeometry(rrShape(MW, MH, 0.24), { depth: 0.04, bevelEnabled: false, curveSegments: 8 }); matGeo.rotateX(-Math.PI / 2);
  const mat = new THREE.Mesh(matGeo, [new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: 0x072423, roughness: 0.8 })]);
  mat.position.set(2.0, 0, -0.6); mat.rotation.y = -0.045; mat.receiveShadow = true; mat.castShadow = true; desk.add(mat);
  const MATY = 0.04;
  // the rest of the fleet, face down
  const darkScr = new THREE.MeshBasicMaterial({ color: 0x05080e });
  [[4.55, 1.55, 0.9, 0], [4.7, 1.42, 1.08, 1]].forEach(([x, z, yaw, k]) => { const p = makePhone(darkScr).g; p.position.set(x, MATY + 0.05 + k * 0.1, z); p.rotation.set(Math.PI / 2, yaw, 0); p.scale.setScalar(1.25); desk.add(p); });
  // stylus
  const pen = new THREE.Group(); const cream = new THREE.MeshStandardMaterial({ color: 0xefe4d2, roughness: 0.45 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 20), cream); shaft.rotation.z = Math.PI / 2; shaft.castShadow = true; pen.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 20), new THREE.MeshStandardMaterial({ color: 0x1d2a33, roughness: 0.4 })); tip.rotation.z = -Math.PI / 2; tip.position.x = 1.36; tip.castShadow = true; pen.add(tip);
  pen.position.set(4.2, MATY + 0.05, -2.2); pen.rotation.y = -1.08; desk.add(pen);
  // enrolment card
  const cardTex = tex(640, 410, (c) => {
    c.fillStyle = '#f2fffb'; c.fillRect(0, 0, 640, 410); c.fillStyle = '#0f766e'; c.fillRect(0, 0, 640, 92);
    c.fillStyle = '#fff'; c.font = '700 34px Sora, sans-serif'; c.fillText('AERONEXUS', 32, 60);
    c.fillStyle = '#071018'; for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) { const corner = (x < 4 && y < 4) || (x > 8 && y < 4) || (x < 4 && y > 8); if (corner ? (x % 3 !== 1 || y % 3 !== 1) && !(x === 3 || y === 3 || x === 9 || y === 9) || (x % 12 === 1 && false) : Math.random() > 0.5) c.fillRect(34 + x * 20, 124 + y * 20, 19, 19); }
    c.font = '600 26px "Hanken Grotesk", sans-serif'; c.fillText('Scan to enroll', 330, 170); c.font = '20px "DM Mono", monospace'; c.fillStyle = '#3b4a52'; c.fillText('Profile: Field Ops', 330, 210); c.fillText('Devices: company owned', 330, 240);
  });
  const card = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.014, 0.96), [0, 1, 2, 3, 4, 5].map((i) => new THREE.MeshStandardMaterial(i === 2 ? { map: cardTex, roughness: 0.6 } : { color: 0xe8f4f0, roughness: 0.7 })));
  card.position.set(-3.55, 0.008, 0.75); card.rotation.y = 0.22; card.castShadow = true; card.receiveShadow = true; desk.add(card);
  // cable
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.1, MATY + 0.05, 1.45), new THREE.Vector3(-0.25, MATY + 0.04, 2.25), new THREE.Vector3(-1.5, 0.05, 2.9), new THREE.Vector3(-3.4, 0.04, 3.5), new THREE.Vector3(-7, 0.04, 4.6)]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.035, 8), new THREE.MeshStandardMaterial({ color: 0x0c1218, roughness: 0.6 })); cable.castShadow = true; desk.add(cable);
  const DESK_P = new THREE.Vector3(0.3, MATY + 0.05, 0.5);

  // ---- geofence ring and wireframes ----
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.012, 8, 120), new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, toneMapped: false })); ring.rotation.order = 'YXZ'; scene.add(ring);
  const ringFill = new THREE.Mesh(new THREE.CircleGeometry(1.22, 96), new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.06, toneMapped: false, depthWrite: false })); ring.add(ringFill);
  const wire = new THREE.Group(); scene.add(wire);
  const edges = new THREE.EdgesGeometry(bodyGeo, 24), sEdges = new THREE.EdgesGeometry(scrGeo, 1);
  const wires = [0, 1, 2].map(() => {
    const m = new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0 });
    const g = new THREE.Group(); g.add(new THREE.LineSegments(edges, m)); const s = new THREE.LineSegments(sEdges, m); s.position.z = PD / 2 + 0.014; g.add(s); g.scale.setScalar(1.55); wire.add(g);
    return { g, m, x: 0, o: 0 };
  });
  const wRing = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.008, 6, 120), new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0 })); wire.add(wRing);

  // ---- per frame ----
  let ver = 0, lastKey = '', W = 1, H = 1, aspect = 16 / 9, lastMode = '';
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), look = new THREE.Vector3(), cTeal = new THREE.Color(TEAL), cAmber = new THREE.Color(AMBER);
  let lastO = -1, lastF = '';

  function render(s: StageState, time: number, d: number) {
    const vis = s.opacity > 0.005 && s.mode !== 'off';
    const oo = Math.round(s.opacity * 100) / 100; if (oo !== lastO) { lastO = oo; canvas.style.opacity = String(oo); canvas.style.visibility = vis ? 'visible' : 'hidden'; }
    const fl = s.gray ? 'grayscale(1) contrast(1.2) brightness(.82)' : s.intro < 0.995 ? `blur(${((1 - s.intro) * 16).toFixed(1)}px)` : '';
    if (fl !== lastF) { lastF = fl; canvas.style.filter = fl; }
    if (!vis) return;
    const k = s.screen + '|' + Math.round(s.sp * 60) + '|' + ver;
    if (k !== lastKey) { lastKey = k; drawScreen(sctx, s.screen, s.sp, 9.68); scrTex.needsUpdate = true; }
    const snap = s.mode !== lastMode; lastMode = s.mode;
    desk.visible = s.mode === 'desk' || s.mode === 'macro'; phone.visible = true; wire.visible = s.mode === 'wire';
    ring.visible = s.mode === 'float' && s.ring > 0.01; fill.visible = s.mode === 'float' || s.mode === 'wire';
    key.castShadow = desk.visible;

    if (s.mode === 'desk') {
      const z = 1 - s.intro;
      cam.fov = 30; cam.position.set(0.4 + s.mx * 0.24, lerp(11.5, 6.4, z), 2.6 + s.my * 0.16); look.set(0.4 + s.mx * 0.05, 0, 0.35 + z * 0.2); cam.lookAt(look);
      phone.position.copy(DESK_P); phone.rotation.set(-Math.PI / 2, 0.2, 0); phone.scale.setScalar(1.25);
    } else if (s.mode === 'macro') {
      cam.fov = 24; cam.position.set(DESK_P.x - 1.7 + s.px * 0.5, 1.25 - s.px * 0.12, DESK_P.z + 2.7); look.set(DESK_P.x + 0.1, 0.05, DESK_P.z - 1.15); cam.lookAt(look);
      phone.position.set(DESK_P.x + s.shake * 0.006, DESK_P.y, DESK_P.z); phone.rotation.set(-Math.PI / 2, 0.2 + s.shake * 0.01, 0); phone.scale.setScalar(1.25);
    } else if (s.mode === 'float') {
      cam.fov = 30; cam.position.set(0, 0, 10); look.set(0, 0, 0); cam.lookAt(look);
      const t = snap ? 1 : 1 - Math.exp(-d * 9);
      phone.position.x = lerp(phone.position.x, s.px, t); phone.position.y = lerp(phone.position.y, s.py, t); phone.position.z = 0;
      phone.rotation.x = lerp(phone.rotation.x, s.rx, t); phone.rotation.y = lerp(phone.rotation.y, s.ry + s.spin * Math.PI * 2, t); phone.rotation.z = lerp(phone.rotation.z, s.rz, t);
      phone.scale.setScalar(Math.max(0.0001, s.ps));
      if (ring.visible) {
        ring.position.set(s.rgx ?? s.px, s.py, -0.02); ring.rotation.set(s.rx, 0, 0); ring.scale.setScalar(0.4 + 0.6 * s.ring);
        const m = ring.material as THREE.MeshBasicMaterial; m.color.copy(cTeal).lerp(cAmber, s.ringOut); m.opacity = s.ring;
        (ringFill.material as THREE.MeshBasicMaterial).color.copy(m.color); (ringFill.material as THREE.MeshBasicMaterial).opacity = 0.07 * s.ring + 0.05 * s.ringOut * (0.5 + 0.5 * Math.sin(time * 9));
      }
    } else if (s.mode === 'wire') {
      cam.fov = 30; cam.position.set(0, 0, 10); look.set(0, 0, 0); cam.lookAt(look);
      const tx = s.wire === 1 ? [-1.95, 0, 1.95] : [0, 0, 0], to = s.wire === 1 ? [0.7, 0, 0.7] : [0, 0, 0];
      const t = 1 - Math.exp(-d * 5), sc = Math.min(1, aspect / 1.3), sway = Math.sin(time * 0.5) * 0.42 + s.mx * 0.3, up = 1 - s.drop;
      // the real phone drops in and lands in the middle; the wireframes are the rest of the fleet
      phone.position.set(0, 0.5 + up * 5.6, 0.05); phone.rotation.set(0.14 + s.my * 0.1 + up * 3.4, sway + up * 4.2, 0.04 + up); phone.scale.setScalar(1.55 * sc);
      wires.forEach((w, i) => { w.x = lerp(w.x, tx[i], t); w.o = lerp(w.o, to[i] * s.drop, t); w.g.position.set(w.x * sc, 0.5, 0); w.g.rotation.set(0.14 + s.my * 0.1, sway * (i === 0 ? -1 : 1) + (i - 1) * 0.25, 0.04); w.g.scale.setScalar(1.55 * sc); w.m.opacity = w.o; });
      const rm = wRing.material as THREE.MeshBasicMaterial; rm.opacity = lerp(rm.opacity, s.wire === 2 ? 0.7 * s.drop : 0, t); wRing.position.set(0, 0.5, 0); wRing.rotation.set(1.15, 0, time * 0.2); wRing.scale.setScalar(sc);
    }
    cam.updateProjectionMatrix();
    renderer!.render(scene, cam);
  }
  function resize(w: number, h: number) { W = w; H = h; aspect = w / h; renderer!.setSize(w, h, false); cam.aspect = aspect; cam.updateProjectionMatrix(); }
  function hit(x: number, y: number) {
    if (x < 0) return false; ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1); ray.setFromCamera(ndc, cam); return ray.intersectObject(phoneBody, false).length > 0;
  }
  return { ok: true, render, resize, dirty() { ver++; if (document.fonts.status === 'loaded') { drawMat(matCv.getContext('2d')!); matTex.needsUpdate = true; } }, hit, viewW: () => 2 * 10 * Math.tan((15 * Math.PI) / 180) * aspect, screenCanvas: () => scr };
}
