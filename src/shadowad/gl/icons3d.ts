// The six fleet subjects as clean, bevelled "clay icon" models: smooth geometry, crisp edges, no noise.
// Two shared materials do all the work: a frosted-glass body and shadowAD-amber light parts.
// Everything is generated here (a few KB of code), so there is nothing to download or decode.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type IconKind = 'reticle' | 'terminal' | 'tree' | 'controls' | 'shield' | 'report';
export const ICON_KINDS: IconKind[] = ['controls', 'terminal', 'tree', 'reticle', 'shield', 'report'];

const BEVEL = (depth: number, bevel: number, curve = 96): THREE.ExtrudeGeometryOptions =>
  ({ depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 12, curveSegments: curve });

function roundRect(w: number, h: number, r: number, x = 0, y = 0) {
  const s = new THREE.Shape();
  const l = x - w / 2, b = y - h / 2;
  s.moveTo(l + r, b); s.lineTo(l + w - r, b); s.quadraticCurveTo(l + w, b, l + w, b + r);
  s.lineTo(l + w, b + h - r); s.quadraticCurveTo(l + w, b + h, l + w - r, b + h);
  s.lineTo(l + r, b + h); s.quadraticCurveTo(l, b + h, l, b + h - r);
  s.lineTo(l, b + r); s.quadraticCurveTo(l, b, l + r, b);
  return s;
}
const centerZ = (g: THREE.BufferGeometry, depth: number, bevel: number) => { g.translate(0, 0, -(depth / 2)); void bevel; return g; };
const tube = (pts: [number, number, number][], r: number, closed = false, seg = 64) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed, 'centripetal'), seg, r, 32, closed);
const capsule = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
  const len = a.distanceTo(b);
  const g = new THREE.CapsuleGeometry(r, len, 12, 32);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
};
/** a polyline of round-capped straight segments: crisp corners, like a stroked icon */
const stroke = (pts: [number, number, number][], r: number) => {
  const v = pts.map((p) => new THREE.Vector3(...p));
  const gs: THREE.BufferGeometry[] = [];
  for (let k = 0; k < v.length - 1; k++) gs.push(capsule(v[k], v[k + 1], r));
  return merge(gs);
};
const sphere = (p: THREE.Vector3, r: number) => { const g = new THREE.SphereGeometry(r, 72, 48); g.translate(p.x, p.y, p.z); return g; };
const strip = (g: THREE.BufferGeometry) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') n.deleteAttribute(k); if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((n.attributes.position.count) * 2), 2)); return n; };
const merge = (gs: THREE.BufferGeometry[]) => mergeGeometries(gs.map(strip))!;

/** Returns [glass parts, amber parts] for one subject, authored about 2 units tall. */
function parts(kind: IconKind): [THREE.BufferGeometry, THREE.BufferGeometry] {
  switch (kind) {
    case 'reticle': {
      const ring = new THREE.TorusGeometry(0.66, 0.12, 64, 256);
      const inner = new THREE.TorusGeometry(0.34, 0.045, 40, 192);
      const arms = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([x, y]) => { const g = new RoundedBoxGeometry(x ? 0.46 : 0.1, y ? 0.46 : 0.1, 0.12, 6, 0.045); g.translate(x * 0.76, y * 0.76, 0); return g; });
      return [merge([ring, inner, ...arms]), merge([sphere(new THREE.Vector3(0, 0, 0), 0.1)])];
    }
    case 'terminal': {
      // the war room: a console window with a live prompt
      const body = centerZ(new THREE.ExtrudeGeometry(roundRect(1.9, 1.38, 0.14), BEVEL(0.16, 0.05)), 0.16, 0.05);
      const bar = new RoundedBoxGeometry(1.62, 0.03, 0.04, 2, 0.012); bar.translate(0, 0.38, 0.14);
      const dots = [-0.72, -0.6, -0.48].map((x) => sphere(new THREE.Vector3(x, 0.53, 0.13), 0.04));
      const glyph = [
        stroke([[-0.5, 0.14, 0.16], [-0.24, -0.08, 0.16], [-0.5, -0.3, 0.16]], 0.055),
        capsule(new THREE.Vector3(-0.08, -0.3, 0.16), new THREE.Vector3(0.36, -0.3, 0.16), 0.055),
      ];
      return [merge([body, bar]), merge([...dots, ...glyph])];
    }
    case 'tree': {
      const root = new THREE.Vector3(0, 0.66, 0);
      const mid = [new THREE.Vector3(-0.5, 0.02, 0), new THREE.Vector3(0.5, 0.02, 0)];
      const leaves = [new THREE.Vector3(-0.78, -0.64, 0), new THREE.Vector3(-0.24, -0.64, 0), new THREE.Vector3(0.24, -0.64, 0), new THREE.Vector3(0.78, -0.64, 0)];
      const glass: THREE.BufferGeometry[] = [];
      mid.forEach((m, i) => {
        glass.push(sphere(m, 0.17), capsule(root, m, 0.045));
        leaves.slice(i * 2, i * 2 + 2).forEach((l) => glass.push(sphere(l, 0.14), capsule(m, l, 0.038)));
      });
      // the domain's root glows: everything below hangs off it
      return [merge(glass), merge([sphere(root, 0.22)])];
    }
    case 'controls': {
      // the control plane: a panel of sliders, each set to a rule of the engagement
      const body = centerZ(new THREE.ExtrudeGeometry(roundRect(1.62, 1.34, 0.18), BEVEL(0.2, 0.06)), 0.2, 0.06);
      const xs = [-0.5, -0.17, 0.17, 0.5], at = [0.22, -0.16, 0.32, -0.26];
      const tracks = xs.map((x) => capsule(new THREE.Vector3(x, -0.42, 0.15), new THREE.Vector3(x, 0.42, 0.15), 0.035));
      const knobs = xs.map((x, k) => { const g = new RoundedBoxGeometry(0.26, 0.15, 0.13, 6, 0.05); g.translate(x, at[k], 0.2); return g; });
      return [merge([body, ...tracks]), merge(knobs)];
    }
    case 'shield': {
      const sh = (w: number, h: number) => {
        const s = new THREE.Shape();
        s.moveTo(0, h / 2);
        s.bezierCurveTo(w * 0.22, h * 0.47, w * 0.38, h * 0.43, w / 2, h * 0.42);
        s.lineTo(w / 2, h * 0.02);
        s.bezierCurveTo(w * 0.48, -h * 0.26, w * 0.22, -h * 0.42, 0, -h / 2);
        s.bezierCurveTo(-w * 0.22, -h * 0.42, -w * 0.48, -h * 0.26, -w / 2, h * 0.02);
        s.lineTo(-w / 2, h * 0.42);
        s.bezierCurveTo(-w * 0.38, h * 0.43, -w * 0.22, h * 0.47, 0, h / 2);
        return s;
      };
      const body = centerZ(new THREE.ExtrudeGeometry(sh(1.5, 1.86), BEVEL(0.18, 0.07, 128)), 0.18, 0.07);
      // a monitoring trace across the face: detection, watching for the next attempt
      const pulse = stroke([[-0.46, 0.04, 0.17], [-0.2, 0.04, 0.17], [-0.08, 0.34, 0.17], [0.06, -0.26, 0.17], [0.18, 0.14, 0.17], [0.26, 0.04, 0.17], [0.46, 0.04, 0.17]], 0.05);
      return [body, merge([pulse])];
    }
    case 'report': {
      const s = new THREE.Shape();
      const w = 1.24, h = 1.62, r = 0.1, fold = 0.34;
      s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      s.lineTo(w / 2, h / 2 - fold); s.lineTo(w / 2 - fold, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      const page = centerZ(new THREE.ExtrudeGeometry(s, BEVEL(0.09, 0.04)), 0.09, 0.04);
      const ear = new THREE.Shape(); ear.moveTo(w / 2 - fold, h / 2); ear.lineTo(w / 2 - fold, h / 2 - fold + 0.04); ear.quadraticCurveTo(w / 2 - fold, h / 2 - fold, w / 2 - fold + 0.04, h / 2 - fold); ear.lineTo(w / 2, h / 2 - fold);
      const earG = new THREE.ExtrudeGeometry(ear, BEVEL(0.03, 0.015)); earG.translate(0, 0, 0.06);
      const lines = [[0.36, 0.56], [0.16, 0.76], [-0.04, 0.76], [-0.24, 0.5]].map(([y, len]) => { const g = new RoundedBoxGeometry(len, 0.075, 0.05, 6, 0.035); g.translate(-0.38 + len / 2, y, 0.08); return g; });
      // a check mark in a round badge at the foot: signed off
      const badge = new THREE.CylinderGeometry(0.17, 0.17, 0.06, 96); badge.rotateX(Math.PI / 2); badge.translate(0.3, -0.52, 0.08);
      const tick = stroke([[0.21, -0.52, 0.13], [0.27, -0.59, 0.13], [0.4, -0.44, 0.13]], 0.026);
      const glass = merge([page, earG, tick]);
      return [glass, merge([...lines, badge])];
    }
  }
}

export function buildIcon(kind: IconKind, glass: THREE.Material, amber: THREE.Material) {
  const [g, a] = parts(kind);
  for (const geo of [g, a]) geo.computeVertexNormals();
  const group = new THREE.Group();
  group.add(new THREE.Mesh(g, glass), new THREE.Mesh(a, amber));
  group.scale.setScalar(1.45);
  return group;
}
