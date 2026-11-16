// One set of illustrated props and three signal objects per module world. Same kit as the rest of the
// scene (toon shading, ink outlines), so every world reads as the same universe with its own subject.
import * as THREE from 'three';

export type Kit = {
  toon: (color: string) => THREE.Material;
  inked: (geo: THREE.BufferGeometry, mat: THREE.Material, w?: number) => THREE.Group;
  leak: THREE.Material; // crimson, glows
};
type V3 = [number, number, number];

const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
const at = (o: THREE.Object3D, p: V3, r: V3 = [0, 0, 0], s = 1) => { o.position.set(...p); o.rotation.set(...r); o.scale.setScalar(s); return o; };
const rand = (seed: number) => { let s = seed; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); };

/** Props stand back from the three signal platforms: sides and the far shore. */
export function buildWorld(i: number, k: Kit): { props: THREE.Group; signals: THREE.Group[] } {
  const { toon, inked, leak } = k;
  const props = new THREE.Group(), r = rand(i * 17 + 5);
  const part = (geo: THREE.BufferGeometry, color: string | THREE.Material, p: V3 = [0, 0, 0], w = 0.06) =>
    at(inked(geo, typeof color === 'string' ? toon(color) : color, w), p);
  const ring = (n: number, fn: (x: number, z: number, j: number) => THREE.Object3D) => {
    for (let j = 0; j < n; j++) {
      const side = j % 2 ? 1 : -1, x = side * (13 + r() * 9), z = -8 - r() * 22;
      props.add(fn(x, z, j));
    }
  };
  let signals: THREE.Group[] = [];

  switch (i) {
    case 0: { // Live map: a plain of exposure bars, pins planted on the worst spots
      for (let j = 0; j < 34; j++) {
        const x = (r() - 0.5) * 44, z = -14 - r() * 24, hgt = 0.6 + r() * r() * 7, hot = r() < 0.3;
        if (Math.abs(x) < 5 && z > -18) continue;
        const b = part(box(1.1, hgt, 1.1), hot ? leak : '#b99af5', [x, hgt / 2, z], 0.08);
        props.add(b);
      }
      const pin = (c: string | THREE.Material) => { const g = new THREE.Group(); g.add(part(new THREE.SphereGeometry(0.62, 20, 14), c, [0, 1.25, 0])); const cone = new THREE.ConeGeometry(0.42, 1.2, 16); cone.rotateX(Math.PI); g.add(part(cone, c, [0, 0.45, 0])); g.add(part(new THREE.SphereGeometry(0.22, 12, 8), '#fff', [0, 1.3, 0.5], 0.02)); return g; };
      signals = [pin(leak), pin('#c6f36d'), pin('#b9a0ff')];
      break;
    }
    case 1: { // Forums: message boards like monoliths, speech bubbles drifting off them
      ring(6, (x, z) => {
        const g = new THREE.Group(), hgt = 5 + r() * 4;
        g.add(part(box(3.6, hgt, 0.5), '#3a2f78', [0, hgt / 2, 0], 0.1));
        for (let l = 0; l < 5; l++) g.add(part(box(l % 2 ? 2.2 : 2.8, 0.18, 0.1), '#d9c6f2', [l % 2 ? -0.3 : 0, hgt - 0.9 - l * 0.75, 0.3], 0.02));
        g.add(part(box(0.5, 0.5, 0.1), leak, [1.25, hgt - 0.6, 0.3], 0.02));
        return at(g, [x, 0, z], [0, -x * 0.04, 0]);
      });
      const bubble = (c: string) => { const g = new THREE.Group(); const s = new THREE.SphereGeometry(1, 24, 16); s.scale(1.25, 0.85, 0.6); g.add(part(s, c)); const t = new THREE.ConeGeometry(0.32, 0.7, 10); t.rotateZ(0.6); g.add(part(t, c, [-0.7, -0.75, 0])); for (let d = -1; d <= 1; d++) g.add(part(new THREE.SphereGeometry(0.13, 10, 8), '#2a1145', [d * 0.42, 0, 0.5], 0.01)); return g; };
      for (let j = 0; j < 5; j++) props.add(at(bubble(j % 2 ? '#efe2ff' : '#c9b6ff'), [(r() - 0.5) * 36, 6 + r() * 5, -16 - r() * 14], [0, 0, 0], 0.7 + r() * 0.5));
      signals = [bubble('#f6efe6'), bubble('#ff9cbc'), bubble('#c6f36d')];
      break;
    }
    case 2: { // Data leaks: stacks of crates; one pile has burst open
      ring(7, (x, z) => {
        const g = new THREE.Group(), n = 1 + ((r() * 3) | 0);
        for (let l = 0; l < n; l++) { g.add(part(box(2.2, 2.2, 2.2), l % 2 ? '#c4704f' : '#dc8c55', [(r() - 0.5) * 0.4, 1.1 + l * 2.2, 0], 0.08)); g.add(part(box(2.3, 0.3, 2.3), '#8a3f2a', [0, 1.1 + l * 2.2, 0], 0.03)); }
        return at(g, [x, 0, z], [0, r() * 1.5, 0]);
      });
      for (let j = 0; j < 14; j++) props.add(part(box(0.7, 0.04, 0.9), '#f6efe6', [-9 + r() * 4, 0.1 + r() * 0.4, -20 + r() * 4], 0.01));
      const crate = (open: boolean) => { const g = new THREE.Group(); g.add(part(box(1.6, 1.6, 1.6), '#dc8c55')); g.add(part(box(1.7, 0.22, 1.7), '#8a3f2a', [0, 0.2, 0], 0.02)); g.add(part(box(0.5, 0.5, 0.1), leak, [0.45, 0.45, 0.82], 0.02)); if (open) { const lid = part(box(1.7, 0.16, 1.7), '#c4704f', [0.2, 1.1, -0.4], 0.02); lid.rotation.x = -0.7; g.add(lid); } g.position.y = -0.6; const w = new THREE.Group(); w.add(g); return w; };
      signals = [crate(true), crate(false), crate(false)];
      break;
    }
    case 3: { // Credentials: padlocks and keys stand like monuments
      const key = (c: string, s = 1) => { const g = new THREE.Group(); g.add(part(new THREE.TorusGeometry(0.55, 0.18, 10, 24), c, [0, 1.2, 0])); g.add(part(new THREE.CylinderGeometry(0.14, 0.14, 1.9, 10), c, [0, -0.15, 0])); g.add(part(box(0.5, 0.18, 0.18), c, [0.25, -0.75, 0], 0.03)); g.add(part(box(0.36, 0.18, 0.18), c, [0.18, -0.4, 0], 0.03)); g.scale.setScalar(s); return g; };
      const lock = (open: boolean) => { const g = new THREE.Group(); g.add(part(box(2.4, 2, 1.1), open ? '#ff9cbc' : '#b360d2', [0, 1, 0], 0.1)); const sh = part(new THREE.TorusGeometry(0.75, 0.2, 10, 24, Math.PI), '#e6dcf6', [open ? -0.5 : 0, 2.2, 0], 0.05); if (open) sh.rotation.z = 0.6; g.add(sh); g.add(part(box(0.3, 0.6, 0.12), '#2a1145', [0, 1, 0.58], 0.01)); return g; };
      ring(6, (x, z, j) => at(j % 2 ? lock(j % 4 === 1) : key('#e6a8f4', 2.4), [x, j % 2 ? 0 : 3.2, z], [0, r() * 2, j % 2 ? 0 : 0.2]));
      signals = [key('#c6f36d', 1.15), key('#ff9cbc', 1.15), key('#f6efe6', 1.15)];
      break;
    }
    case 4: { // Botnet data: screens wired to one command tower
      const tower = new THREE.Group();
      tower.add(part(new THREE.CylinderGeometry(0.35, 0.9, 11, 8), '#2f1c5a', [0, 5.5, 0], 0.1));
      for (let l = 0; l < 3; l++) tower.add(part(new THREE.TorusGeometry(1.6 - l * 0.35, 0.08, 6, 30).rotateX(Math.PI / 2), leak, [0, 7 + l * 1.4, 0], 0.02));
      tower.add(part(new THREE.SphereGeometry(0.55, 16, 10), leak, [0, 11.3, 0]));
      props.add(at(tower, [0, 0, -28]));
      const screen = (red: boolean) => { const g = new THREE.Group(); g.add(part(box(2.6, 1.7, 0.2), '#3e2a6e', [0, 2, 0], 0.08)); g.add(part(box(2.2, 1.3, 0.05), red ? leak : '#5f9b3e', [0, 2, 0.13], 0.01)); g.add(part(box(0.25, 1.2, 0.25), '#3e2a6e', [0, 0.6, 0], 0.04)); return g; };
      const wireMat = new THREE.MeshBasicMaterial({ color: '#ff4f86', transparent: true, opacity: 0.55 });
      ring(8, (x, z, j) => {
        const g = new THREE.Group();
        g.add(at(screen(j % 3 !== 0), [0, 0, 0], [0, Math.atan2(-x, 14), 0]));
        // a wire from the screen back to the tower: lay a cylinder along +Z, then turn it to face the tower
        const dx = -x, dz = -28 - z, len = Math.hypot(dx, dz);
        const geo = new THREE.CylinderGeometry(0.04, 0.04, len, 5); geo.rotateX(Math.PI / 2);
        const wire = new THREE.Mesh(geo, wireMat);
        wire.position.set(dx / 2, 0.15, dz / 2); wire.rotation.y = Math.atan2(dx, dz); g.add(wire);
        return at(g, [x, 0, z]);
      });
      const laptop = () => { const g = new THREE.Group(); g.add(part(box(1.8, 0.14, 1.2), '#4a2a78', [0, 0, 0], 0.04)); const sc = new THREE.Group(); sc.add(part(box(1.8, 1.15, 0.1), '#4a2a78', [0, 0.58, 0], 0.04)); sc.add(part(box(1.55, 0.92, 0.03), leak, [0, 0.58, 0.06], 0.01)); sc.position.set(0, 0.07, -0.58); sc.rotation.x = -0.25; g.add(sc); return g; };
      signals = [laptop(), laptop(), laptop()];
      break;
    }
    case 5: { // Phishing: an open sea of buoys, hooks let down on lines from the sky
      ring(7, (x, z) => {
        const g = new THREE.Group();
        for (let l = 0; l < 3; l++) g.add(part(new THREE.CylinderGeometry(0.55, 0.65, 0.5, 14), l % 2 ? '#fff' : leak, [0, 0.25 + l * 0.5, 0], 0.04));
        g.add(part(new THREE.SphereGeometry(0.3, 10, 8), '#fdf6d8', [0, 1.75, 0], 0.03));
        return at(g, [x * 0.8, 0, z], [0.12, 0, 0.08]);
      });
      for (let j = 0; j < 5; j++) {
        const g = new THREE.Group(), x = (r() - 0.5) * 30, z = -12 - r() * 16, y = 4 + r() * 3;
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 30, 4), new THREE.MeshBasicMaterial({ color: '#2a1145' }));
        line.position.set(0, y + 15, 0); g.add(line);
        g.add(part(new THREE.TorusGeometry(0.45, 0.08, 8, 18, Math.PI * 1.3), '#e6dcf6', [0, y - 0.2, 0], 0.03));
        props.add(at(g, [x, 0, z]));
      }
      const lure = (c: string) => { const g = new THREE.Group(); const b = new THREE.SphereGeometry(1, 20, 12); b.scale(1.2, 0.55, 0.45); g.add(part(b, c)); const t = new THREE.ConeGeometry(0.45, 0.8, 4); t.rotateZ(Math.PI / 2); g.add(part(t, c, [-1.45, 0, 0])); g.add(part(new THREE.SphereGeometry(0.12, 8, 6), '#2a1145', [0.75, 0.15, 0.32], 0.01)); g.add(part(new THREE.TorusGeometry(0.28, 0.05, 6, 14, Math.PI * 1.3), '#e6dcf6', [0.4, -0.75, 0], 0.02)); return g; };
      signals = [lure('#ff9cbc'), lure('#c6f36d'), lure('#fdf6d8')];
      break;
    }
    default: { // Websites hacked: a skyline of browser windows, some defaced
      const page = (defaced: boolean, wdt = 4.4, hgt = 3) => {
        const g = new THREE.Group();
        g.add(part(box(wdt, hgt, 0.3), '#f6efe6', [0, 0, 0], 0.08));
        g.add(part(box(wdt, 0.45, 0.32), '#6f2d5a', [0, hgt / 2 - 0.22, 0], 0.02));
        for (let d = 0; d < 3; d++) g.add(part(new THREE.SphereGeometry(0.09, 8, 6), '#fff', [-wdt / 2 + 0.3 + d * 0.28, hgt / 2 - 0.22, 0.18], 0.01));
        g.add(part(box(wdt - 0.5, hgt - 0.9, 0.05), defaced ? leak : '#e98ab0', [0, -0.2, 0.17], 0.01));
        if (defaced) { g.add(part(box(0.25, hgt - 1.3, 0.06), '#2a1145', [0, -0.2, 0.2], 0.01)); g.children[g.children.length - 1].rotation.z = 0.8; g.add(part(box(0.25, hgt - 1.3, 0.06), '#2a1145', [0, -0.2, 0.2], 0.01)); g.children[g.children.length - 1].rotation.z = -0.8; }
        return g;
      };
      ring(8, (x, z, j) => { const hgt = 3 + r() * 4; return at(page(j % 3 === 0, 4 + r() * 2, hgt), [x, hgt / 2 + 0.6, z], [0, Math.atan2(-x, 18), 0]); });
      signals = [page(true, 2.2, 1.6), page(true, 2.2, 1.6), page(true, 2.2, 1.6)];
    }
  }
  return { props, signals };
}
