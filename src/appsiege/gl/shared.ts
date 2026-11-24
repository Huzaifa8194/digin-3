import * as THREE from 'three';

export const FONT = '"Geist Mono", ui-monospace, monospace';

/** A dark studio with coloured softboxes, so chrome and glass pick up teal, orange and violet edges. */
export function makeEnvironment(renderer: THREE.WebGLRenderer) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#040607'; g.fillRect(0, 0, 1024, 512);
  const blob = (x: number, y: number, rx: number, ry: number, col: string, a = 1) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, rx);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, Math.PI * 2); g.fill(); g.restore();
  };
  g.globalCompositeOperation = 'lighter';
  blob(140, 150, 260, 150, '#2fd6c4', 0.95);
  blob(520, 110, 200, 60, '#ffffff', 0.9);
  blob(760, 170, 110, 60, '#ff6a2a', 0.4);
  blob(768, 262, 300, 150, '#9fdce4', 0.55);
  blob(900, 330, 220, 140, '#a35cff', 0.85);
  blob(330, 360, 240, 110, '#5dffa0', 0.75);
  blob(40, 420, 200, 90, '#2fd6c4', 0.7);
  blob(620, 420, 300, 60, '#3a7bff', 0.6);
  // thin horizontal strip lights for crisp specular lines
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillRect(0, 238, 1024, 6);
  g.fillStyle = 'rgba(180,255,240,0.6)';
  g.fillRect(0, 300, 1024, 3);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(tex).texture;
  tex.dispose(); pm.dispose();
  return env;
}

/** Chrome with a thin-film sheen: the hero ring and ribbon. */
export function chrome(env: THREE.Texture) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xa9b8c2, metalness: 1, roughness: 0.1, envMap: env, envMapIntensity: 1.6,
    iridescence: 0.85, iridescenceIOR: 1.45, iridescenceThicknessRange: [380, 620], clearcoat: 1, clearcoatRoughness: 0.08,
  });
}

/** Clear glass that refracts what sits behind it. */
export function glass(env: THREE.Texture, thickness = 0.8) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, thickness, ior: 1.45,
    envMap: env, envMapIntensity: 1.4, iridescence: 0.7, iridescenceIOR: 1.5, iridescenceThicknessRange: [200, 700],
    dispersion: 4, clearcoat: 1, clearcoatRoughness: 0.05, attenuationColor: new THREE.Color('#cfe8ff'), attenuationDistance: 3,
  });
}

function rrect(s: THREE.Shape | THREE.Path, x: number, y: number, w: number, h: number, r: number) {
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
export const roundedRectShape = (w: number, h: number, r: number) => rrect(new THREE.Shape(), -w / 2, -h / 2, w, h, r) as THREE.Shape;

/** The AppSiege mark (phone, speaker slot, shield with a lock cut out), centred, about 1.6 tall. */
export function markGeometry(depth = 0.14) {
  const shapes: THREE.Shape[] = [];
  const phone = rrect(new THREE.Shape(), -0.5, -0.82, 1.0, 1.64, 0.24) as THREE.Shape;
  phone.holes.push(rrect(new THREE.Path(), -0.37, -0.69, 0.74, 1.38, 0.13) as THREE.Path);
  shapes.push(phone);
  shapes.push(rrect(new THREE.Shape(), -0.14, 0.5, 0.28, 0.07, 0.035) as THREE.Shape);
  const sh = new THREE.Shape();
  sh.moveTo(0, 0.36);
  sh.bezierCurveTo(0.12, 0.28, 0.24, 0.27, 0.3, 0.27);
  sh.lineTo(0.3, 0.0);
  sh.bezierCurveTo(0.3, -0.2, 0.15, -0.33, 0, -0.42);
  sh.bezierCurveTo(-0.15, -0.33, -0.3, -0.2, -0.3, 0.0);
  sh.lineTo(-0.3, 0.27);
  sh.bezierCurveTo(-0.24, 0.27, -0.12, 0.28, 0, 0.36);
  // lock body and shackle cut out of the shield
  sh.holes.push(rrect(new THREE.Path(), -0.12, -0.2, 0.24, 0.17, 0.03) as THREE.Path);
  const shackle = new THREE.Path();
  shackle.moveTo(-0.085, -0.015); shackle.lineTo(-0.085, 0.05);
  shackle.absarc(0, 0.05, 0.085, Math.PI, 0, true);
  shackle.lineTo(0.085, -0.015); shackle.lineTo(0.05, -0.015); shackle.lineTo(0.05, 0.05);
  shackle.absarc(0, 0.05, 0.05, 0, Math.PI, false);
  shackle.lineTo(-0.05, -0.015); shackle.lineTo(-0.085, -0.015);
  sh.holes.push(shackle);
  shapes.push(sh);
  const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.022, bevelSegments: 4, curveSegments: 24 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

/** Canvas → texture, drawn at device pixel ratio. */
export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, scale = 2) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const g = c.getContext('2d')!;
  g.scale(scale, scale);
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

export const GLSL_NOISE = /* glsl */ `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for(int i=0;i<4;i++){ s += a*vnoise(p); p *= 2.03; a *= .5; } return s; }
`;

export const rand = (() => { let s = 1337; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
