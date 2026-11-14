// One Three.js renderer, many views. Each view is a scene + camera drawn into the screen rect of a
// DOM element (scissor), so the page can hold a dozen 3D moments with a single WebGL context.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const MODULES = [
  { id: 'shadowad', name: 'ShadowAD', cat: 'Hybrid identity', color: '#b6f23a' },
  { id: 'sysbastion', name: 'SysBastion', cat: 'Endpoint hardening', color: '#3d6bff' },
  { id: 'aegis-shield', name: 'AEGIS-SHIELD', cat: 'Threat hunting', color: '#ff7a1a' },
  { id: 'mobile-pentest', name: 'Mobile App Pentest', cat: 'App assessment', color: '#ff5fa2' },
  { id: 'darkintel360', name: 'DarkIntel360', cat: 'Threat intelligence', color: '#8b5cff' },
];

export type View = {
  el: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update?: (t: number, dt: number, rect: DOMRect) => void;
};

let renderer: THREE.WebGLRenderer;
let env: THREE.Texture;
const views: View[] = [];

export function createStage(canvas: HTMLCanvasElement) {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps the module colours saturated
  renderer.toneMappingExposure = 1.0;
  const pmrem = new THREE.PMREMGenerator(renderer);
  env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const size = () => { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.5 : 1.75)); renderer.setSize(innerWidth, innerHeight, false); };
  size();
  addEventListener('resize', size);
  return {
    add(v: View) { v.scene.environment = env; v.scene.environmentIntensity = 0.45; views.push(v); return v; },
    render(t: number, dt: number) {
      renderer.setScissorTest(false);
      renderer.clear();
      renderer.setScissorTest(true);
      const H = innerHeight;
      for (const v of views) {
        const r = v.el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > H || r.width < 2 || r.height < 2) continue;
        v.update?.(t, dt, r);
        v.camera.aspect = r.width / r.height;
        v.camera.updateProjectionMatrix();
        const y = H - r.bottom;
        renderer.setViewport(r.left, y, r.width, r.height);
        renderer.setScissor(r.left, y, r.width, r.height);
        renderer.render(v.scene, v.camera);
      }
    },
  };
}

export function baseScene(fov = 30, z = 7) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
  camera.position.set(0, 0.6, z);
  camera.lookAt(0, 0, 0);
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8); rim.position.set(-4, 2, -3); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  return { scene, camera };
}

function emblemTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = '#f6f4ef'; x.fillRect(0, 0, 512, 512);
  x.translate(256, 268); x.scale(1.45, 1.45);
  x.beginPath();
  x.moveTo(-100, -105); x.quadraticCurveTo(0, -132, 100, -105);
  x.quadraticCurveTo(102, -40, 100, -10); x.quadraticCurveTo(95, 85, 0, 140);
  x.quadraticCurveTo(-95, 85, -100, -10); x.quadraticCurveTo(-102, -40, -100, -105); x.closePath();
  x.fillStyle = '#e8102a'; x.fill();
  x.strokeStyle = '#fff'; x.lineWidth = 26; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(-48, 2); x.lineTo(-10, 40); x.lineTo(55, -38); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export type Device = { group: THREE.Group; parts: THREE.Mesh[]; restY: number[]; ring: THREE.Mesh; layerMats: THREE.MeshPhysicalMaterial[]; explode: (p: number) => void; focus: (i: number | null, k: number) => void };

/** The device: graphite services base, five coloured product modules, white cap with a red 360° ring. */
export function makeDevice(): Device {
  const group = new THREE.Group();
  const W = 1.7, gap = 0.03;
  const plastic = (color: string, rough = 0.32) => new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const heights = [0.36, 0.24, 0.24, 0.24, 0.24, 0.24, 0.46];
  const mats = [plastic('#1d1e22', 0.5), ...MODULES.map((m) => plastic(m.color)), plastic('#f6f4ef', 0.25)];
  const parts: THREE.Mesh[] = [];
  const restY: number[] = [];
  let y = -1.05;
  heights.forEach((h, i) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(W, h, W, 5, Math.min(0.11, h * 0.42)), mats[i]);
    y += h / 2; m.position.y = y; restY.push(y); y += h / 2 + gap;
    group.add(m); parts.push(m);
  });
  const cap = parts[parts.length - 1];
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.045, 20, 120), new THREE.MeshStandardMaterial({ color: '#ff2b3a', emissive: '#ff1a2e', emissiveIntensity: 2.4, roughness: 0.3 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.235; cap.add(ring);
  const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.5, 64), new THREE.MeshStandardMaterial({ map: emblemTexture(), roughness: 0.4 }));
  emblem.rotation.x = -Math.PI / 2; emblem.position.y = 0.232; cap.add(emblem);
  // a front status light per module
  parts.slice(1, 6).forEach((p, i) => {
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.02), new THREE.MeshStandardMaterial({ color: '#fff', emissive: MODULES[i].color, emissiveIntensity: 1.4 }));
    led.position.set(-0.5, 0, W / 2 + 0.005); p.add(led);
  });
  const layerMats = mats.slice(1, 6) as THREE.MeshPhysicalMaterial[];
  return {
    group, parts, restY, ring, layerMats,
    explode(p: number) {
      parts.forEach((m, i) => {
        const c = i - (parts.length - 1) / 2;
        m.position.y = restY[i] + p * c * 0.62;
        m.rotation.y = p * c * 0.22;
        m.position.x = p * Math.sin(i * 1.7) * 0.18;
      });
    },
    focus(i, k) {
      layerMats.forEach((m, j) => { m.emissive.set(MODULES[j].color); m.emissiveIntensity = i === j ? 0.35 * k : 0; });
      parts.slice(1, 6).forEach((m, j) => { m.position.z = i === j ? 0.5 * k : 0; });
    },
  };
}

/** Five service objects, one per service, for the "built in" grid. */
export function makeServiceObject(kind: number): THREE.Object3D {
  const g = new THREE.Group();
  const mat = (c: string, e = 0) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.25, clearcoat: 1, emissive: c, emissiveIntensity: e });
  if (kind === 0) { // offensive: a lens over a cracked block
    const lens = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.11, 24, 80), mat('#ff2b3a'));
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.8, 24), mat('#ff2b3a'));
    handle.position.set(0.62, -0.62, 0); handle.rotation.z = Math.PI / 4;
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.5, 48), new THREE.MeshPhysicalMaterial({ color: '#cfe8ff', transmission: 0.9, roughness: 0.05, thickness: 0.3, transparent: true, opacity: 0.6 }));
    g.add(lens, handle, glass);
  } else if (kind === 1) { // GRC: stacked policy plates with a check
    for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.12, 0.9, 4, 0.05), mat(['#b6f23a', '#f6f4ef', '#3d6bff'][i])); p.position.y = i * 0.22 - 0.22; p.rotation.y = i * 0.18; g.add(p); }
    const check = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 16, 3, Math.PI * 0.9), mat('#0c0c0f'));
    check.position.y = 0.4; g.add(check);
  } else if (kind === 2) { // monitoring: a core with orbiting sensors
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 2), mat('#ff7a1a', 0.2)));
    [0, 1, 2].forEach((i) => {
      const o = new THREE.Group(); o.rotation.set(i * 1.1, i * 0.7, 0);
      o.add(new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.012, 8, 120), mat('#f6f4ef')));
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 20), mat('#ff5fa2', 0.6)); s.position.x = 0.85; o.add(s);
      o.userData.spin = 0.6 + i * 0.35; g.add(o);
    });
  } else if (kind === 3) { // network: a wall of bricks
    const brick = new RoundedBoxGeometry(0.36, 0.2, 0.3, 3, 0.04);
    const colors = ['#3d6bff', '#8b5cff', '#f6f4ef'];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const b = new THREE.Mesh(brick, mat(colors[(r + c) % 3])); b.position.set((c - 1.5) * 0.38 + (r % 2) * 0.19, (r - 1.5) * 0.22, 0); g.add(b);
    }
  } else { // data: a padlock
    const body = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.8, 0.4, 5, 0.12), mat('#8b5cff'));
    body.position.y = -0.25;
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 20, 60, Math.PI), mat('#f6f4ef'));
    shackle.position.y = 0.15;
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 20), mat('#0c0c0f')); hole.rotation.x = Math.PI / 2; hole.position.set(0, -0.25, 0.21);
    g.add(body, shackle, hole);
  }
  return g;
}

export { THREE };
