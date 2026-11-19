// The icons frozen inside each crystal (one per shadowAD specialist), the shadowAD cube mark,
// and the shapes the finale's particles settle into. All built from extruded shapes, tubes and rods.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const EX = (depth: number, bevel = 0.05): THREE.ExtrudeGeometryOptions => ({ depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 24 });
function centered(g: THREE.BufferGeometry, size = 1) {
  g.computeBoundingBox();
  const b = g.boundingBox!, c = new THREE.Vector3(), s = new THREE.Vector3();
  b.getCenter(c); b.getSize(s);
  g.translate(-c.x, -c.y, -c.z);
  const k = size / Math.max(s.x, s.y, s.z);
  g.scale(k, k, k);
  g.computeVertexNormals();
  return g;
}
const clean = (g: THREE.BufferGeometry) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); return n; };
const merge = (gs: THREE.BufferGeometry[]) => mergeGeometries(gs.map(clean))!;

export function shieldShape(w = 1, h = 1.22) {
  const s = new THREE.Shape();
  s.moveTo(0, h / 2);
  s.quadraticCurveTo(w * 0.28, h * 0.42, w / 2, h * 0.44);
  s.lineTo(w / 2, h * 0.05);
  s.quadraticCurveTo(w * 0.46, -h * 0.32, 0, -h / 2);
  s.quadraticCurveTo(-w * 0.46, -h * 0.32, -w / 2, h * 0.05);
  s.lineTo(-w / 2, h * 0.44);
  s.quadraticCurveTo(-w * 0.28, h * 0.42, 0, h / 2);
  return s;
}
export function shield() {
  const outer = shieldShape();
  const inner = shieldShape(0.62, 0.78);
  const hole = new THREE.Path();
  // keyhole cut through the inner boss
  hole.absarc(0, 0.08, 0.09, 0, Math.PI * 2, true);
  const boss = new THREE.Shape(inner.getPoints(48)); boss.holes.push(hole);
  const a = new THREE.ExtrudeGeometry(outer, EX(0.16, 0.05));
  const b = new THREE.ExtrudeGeometry(boss, EX(0.12, 0.03)); b.translate(0, 0, 0.18);
  const slot = new THREE.BoxGeometry(0.07, 0.22, 0.2); slot.translate(0, -0.08, 0.2);
  return centered(merge([a, b, slot]));
}
export function documentPage(lines = 4) {
  const s = new THREE.Shape();
  s.moveTo(-0.38, -0.5); s.lineTo(0.38, -0.5); s.lineTo(0.38, 0.32); s.lineTo(0.2, 0.5); s.lineTo(-0.38, 0.5); s.closePath();
  const page = new THREE.ExtrudeGeometry(s, EX(0.06, 0.02));
  const parts: THREE.BufferGeometry[] = [page];
  const ear = new THREE.Shape(); ear.moveTo(0.2, 0.5); ear.lineTo(0.2, 0.32); ear.lineTo(0.38, 0.32); ear.closePath();
  const eg = new THREE.ExtrudeGeometry(ear, EX(0.04, 0.01)); eg.translate(0, 0, 0.07); parts.push(eg);
  for (let i = 0; i < lines; i++) {
    const w = i === lines - 1 ? 0.32 : 0.56;
    const l = new THREE.BoxGeometry(w, 0.05, 0.05); l.translate(-0.28 + w / 2, 0.16 - i * 0.16, 0.09); parts.push(l);
  }
  return centered(merge(parts));
}
export function prompt() {
  const c = new THREE.Shape();
  c.moveTo(-0.5, 0.42); c.lineTo(-0.28, 0.42); c.lineTo(0.12, 0); c.lineTo(-0.28, -0.42); c.lineTo(-0.5, -0.42); c.lineTo(-0.1, 0); c.closePath();
  const chev = new THREE.ExtrudeGeometry(c, EX(0.22, 0.05));
  const bar = new THREE.BoxGeometry(0.46, 0.13, 0.3); bar.translate(0.38, -0.36, 0.11);
  return centered(merge([chev, bar]));
}
export function wall() {
  const parts: THREE.BufferGeometry[] = [];
  for (let row = 0; row < 4; row++) {
    const n = row % 2 ? 3 : 4;
    for (let k = 0; k < n; k++) {
      const w = row % 2 ? 0.3 : 0.22;
      const b = new THREE.BoxGeometry(w * 0.92, 0.17, 0.24);
      const x = (k - (n - 1) / 2) * w;
      b.translate(x, row * 0.19, 0); parts.push(b);
    }
  }
  // the stopped arrow, nose against the wall
  const a = new THREE.Shape();
  a.moveTo(0, 0.07); a.lineTo(0.3, 0.07); a.lineTo(0.3, 0.16); a.lineTo(0.48, 0); a.lineTo(0.3, -0.16); a.lineTo(0.3, -0.07); a.lineTo(0, -0.07); a.closePath();
  const ag = new THREE.ExtrudeGeometry(a, EX(0.08, 0.02));
  ag.rotateY(Math.PI / 2); ag.translate(0, 0.3, -0.62); parts.push(ag);
  return centered(merge(parts));
}
export function padlock() {
  const body = new THREE.Shape();
  const w = 0.62, h = 0.5, r = 0.08;
  body.moveTo(-w / 2 + r, -h / 2); body.lineTo(w / 2 - r, -h / 2); body.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  body.lineTo(w / 2, h / 2 - r); body.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); body.lineTo(-w / 2 + r, h / 2);
  body.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); body.lineTo(-w / 2, -h / 2 + r); body.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const kh = new THREE.Path(); kh.absarc(0, 0.04, 0.06, 0, Math.PI * 2, true); body.holes.push(kh);
  const bg = new THREE.ExtrudeGeometry(body, EX(0.22, 0.04)); bg.translate(0, 0, -0.11);
  const sh = new THREE.TorusGeometry(0.2, 0.05, 12, 32, Math.PI); sh.translate(0, 0.27, 0);
  const l1 = new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12); l1.translate(-0.2, 0.27, 0);
  const l2 = l1.clone(); l2.translate(0.4, 0, 0);
  return centered(merge([bg, sh, l1, l2]));
}
export function pages() {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const p = documentPage(3 - (i === 2 ? 0 : 1));
    p.rotateZ((i - 1) * 0.22); p.translate((i - 1) * 0.12, (1 - i) * 0.04, i * 0.1);
    parts.push(p);
  }
  return centered(merge(parts));
}

/** The SysBastion mark: three broken rings and a square core. Each piece is its own geometry. */
export function ringPieces() {
  const pieces: { geo: THREE.BufferGeometry; ring: number }[] = [];
  const sector = (r0: number, r1: number, a0: number, a1: number, depth: number) => {
    const s = new THREE.Shape();
    s.absarc(0, 0, r1, a0, a1, false);
    s.absarc(0, 0, r0, a1, a0, true);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3, curveSegments: 40 });
    g.translate(0, 0, -depth / 2);
    return g;
  };
  // outer wall: eight stones
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    pieces.push({ geo: sector(4.15, 5.05, a + 0.035, a + Math.PI / 4 - 0.035, 0.9), ring: 0 });
  }
  // middle ring: five arcs of unequal length, the gaps are the doors
  const mid = [[0.25, 1.55], [1.75, 2.55], [2.75, 4.3], [4.5, 5.2], [5.42, 6.05]];
  mid.forEach(([a0, a1]) => pieces.push({ geo: sector(2.55, 3.25, a0, a1, 0.7), ring: 1 }));
  // inner ring: three arcs
  const inner = [[0.6, 2.4], [2.75, 4.6], [4.95, 5.95]];
  inner.forEach(([a0, a1]) => pieces.push({ geo: sector(1.35, 1.88, a0, a1, 0.6), ring: 2 }));
  // core: the shadowAD cube, held inside every ring of controls
  const core = cubeMark(0.07);
  core.scale(1.55, 1.55, 1.55);
  pieces.push({ geo: core, ring: 3 });
  pieces.forEach((p) => p.geo.computeVertexNormals());
  return pieces;
}

// ---------- shadowAD agent icons: one per specialist frozen in the crystals ----------
const tube = (pts: [number, number, number][], r = 0.05, closed = false) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', 0.1), 48, r, 10, closed);
const rod = (a: THREE.Vector3, b: THREE.Vector3, r = 0.035) => {
  const g = new THREE.CylinderGeometry(r, r, a.distanceTo(b), 10);
  g.translate(0, a.distanceTo(b) / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
};
const ball = (p: THREE.Vector3, r: number) => { const g = new THREE.SphereGeometry(r, 20, 14); g.translate(p.x, p.y, p.z); return g; };

/** recon-advisor: a targeting reticle */
export function reticle() {
  const parts: THREE.BufferGeometry[] = [new THREE.TorusGeometry(0.42, 0.045, 12, 64), new THREE.TorusGeometry(0.2, 0.03, 10, 48), ball(new THREE.Vector3(), 0.06)];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2, d = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
    parts.push(rod(d.clone().multiplyScalar(0.3), d.clone().multiplyScalar(0.58), 0.035));
  }
  return centered(merge(parts));
}
/** ad-attacker: a domain tree, forest root down to members */
export function domainTree() {
  const root = new THREE.Vector3(0, 0.5, 0);
  const mid = [new THREE.Vector3(-0.32, 0.05, 0.05), new THREE.Vector3(0.32, 0.05, -0.05)];
  const leaves = [new THREE.Vector3(-0.5, -0.45, 0.1), new THREE.Vector3(-0.14, -0.45, -0.08), new THREE.Vector3(0.16, -0.45, 0.08), new THREE.Vector3(0.5, -0.45, -0.1)];
  const parts: THREE.BufferGeometry[] = [ball(root, 0.12)];
  mid.forEach((m, i) => { parts.push(ball(m, 0.095), rod(root, m)); leaves.slice(i * 2, i * 2 + 2).forEach((l) => parts.push(ball(l, 0.075), rod(m, l, 0.028))); });
  return centered(merge(parts));
}
/** web-hunter: the endpoint glyph from the Explorer map */
export function codeGlyph() {
  const l = tube([[-0.18, 0.28, 0], [-0.46, 0, 0], [-0.18, -0.28, 0]], 0.055);
  const r = tube([[0.18, 0.28, 0], [0.46, 0, 0], [0.18, -0.28, 0]], 0.055);
  const s = rod(new THREE.Vector3(-0.08, -0.34, 0), new THREE.Vector3(0.08, 0.34, 0), 0.05);
  return centered(merge([l, r, s]));
}
/** network-attacker: a relay between two hosts */
export function relay() {
  const a = new THREE.Vector3(-0.5, -0.1, 0), m = new THREE.Vector3(0, 0.22, 0), b = new THREE.Vector3(0.5, -0.1, 0);
  const parts: THREE.BufferGeometry[] = [ball(a, 0.12), ball(b, 0.12), new THREE.TorusGeometry(0.13, 0.04, 10, 32), rod(a, m, 0.03), rod(m, b, 0.03)];
  parts[2].translate(m.x, m.y, m.z);
  parts.push(tube([[-0.5, -0.36, 0], [0, -0.48, 0], [0.5, -0.36, 0]], 0.025));
  return centered(merge(parts));
}
/** api-security: the braces of a JSON body */
export function braces() {
  const brace = (s: number) => tube([[0.12 * s, 0.5, 0], [0.02 * s, 0.42, 0], [0.02 * s, 0.12, 0], [-0.1 * s, 0, 0], [0.02 * s, -0.12, 0], [0.02 * s, -0.42, 0], [0.12 * s, -0.5, 0]], 0.045);
  const l = brace(1); l.translate(-0.3, 0, 0);
  const r = brace(-1); r.translate(0.3, 0, 0);
  return centered(merge([l, r, ball(new THREE.Vector3(-0.07, 0, 0), 0.04), ball(new THREE.Vector3(0.07, 0, 0), 0.04)]));
}
/** database-attacker: stacked platters */
export function database() {
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 3; k++) { const c = new THREE.CylinderGeometry(0.36, 0.36, 0.2, 40); c.translate(0, k * 0.26 - 0.26, 0); parts.push(c); }
  return centered(merge(parts));
}
/** the shadowAD mark: a cube seen corner-on, drawn as its edges plus the three inner seams */
export function cubeMark(r = 0.04) {
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).multiplyScalar(0.5);
  const c = [v(-1, -1, -1), v(1, -1, -1), v(1, 1, -1), v(-1, 1, -1), v(-1, -1, 1), v(1, -1, 1), v(1, 1, 1), v(-1, 1, 1)];
  const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const g = merge([...e.map(([a, b]) => rod(c[a], c[b], r)), ...c.map((p) => ball(p, r * 1.2))]);
  g.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.atan(1 / Math.SQRT2), Math.PI / 4, 0, 'XYZ')));
  return centered(g);
}
/** the live attack map: hosts joined along a path */
export function attackMap() {
  const n = [new THREE.Vector3(-0.5, -0.25, 0), new THREE.Vector3(-0.12, 0.1, 0.1), new THREE.Vector3(0.25, -0.15, -0.1), new THREE.Vector3(0.5, 0.35, 0), new THREE.Vector3(0.1, 0.45, -0.05)];
  const parts: THREE.BufferGeometry[] = n.map((p, i) => ball(p, i === 3 ? 0.11 : 0.08));
  [[0, 1], [1, 2], [2, 3], [1, 4], [4, 3]].forEach(([a, b]) => parts.push(rod(n[a], n[b], 0.025)));
  return centered(merge(parts));
}

// recon · web & API testing · AD review · credential posture · detection engineering · reporting
export const CRYSTAL_OBJECTS = [reticle, codeGlyph, domainTree, padlock, braces, () => documentPage(5)];
