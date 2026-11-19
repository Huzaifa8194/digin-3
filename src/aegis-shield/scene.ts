// The objects on the desk, built procedurally. 1 unit = 1 cm.
// The Mi713 is 11.4 (x) × 4.3 (y) × 10.6 (z) with its ports facing +z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const CYAN = new THREE.Color('#35d0f0');
export const ALARM = new THREE.Color('#ff4d3d');

const W = 11.4, D = 10.6, BASE_H = 3.6, R = 1.05;

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function shieldShape(scale = 1): THREE.Shape {
  const s = new THREE.Shape();
  const k = scale;
  s.moveTo(0, 1.0 * k);
  s.quadraticCurveTo(0.42 * k, 0.8 * k, 0.86 * k, 0.86 * k);
  s.bezierCurveTo(0.88 * k, 0.05 * k, 0.62 * k, -0.62 * k, 0, -1.02 * k);
  s.bezierCurveTo(-0.62 * k, -0.62 * k, -0.88 * k, 0.05 * k, -0.86 * k, 0.86 * k);
  s.quadraticCurveTo(-0.42 * k, 0.8 * k, 0, 1.0 * k);
  return s;
}

export function drawShieldPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, k: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - 1.0 * k);
  ctx.quadraticCurveTo(cx + 0.42 * k, cy - 0.8 * k, cx + 0.86 * k, cy - 0.86 * k);
  ctx.bezierCurveTo(cx + 0.88 * k, cy - 0.05 * k, cx + 0.62 * k, cy + 0.62 * k, cx, cy + 1.02 * k);
  ctx.bezierCurveTo(cx - 0.62 * k, cy + 0.62 * k, cx - 0.88 * k, cy - 0.05 * k, cx - 0.86 * k, cy - 0.86 * k);
  ctx.quadraticCurveTo(cx - 0.42 * k, cy - 0.8 * k, cx, cy - 1.0 * k);
  ctx.closePath();
}

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, color = true) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  draw(c);
  const t = new THREE.CanvasTexture(cv);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------------------------------------------------------------- Mi713
export type Appliance = {
  root: THREE.Group;
  lid: THREE.Group;
  parts: Record<string, THREE.Object3D>;
  anchors: Record<string, THREE.Vector3>;
  fan: THREE.Group;
  led: THREE.MeshBasicMaterial;
  shield: THREE.Group;
  beam: THREE.Mesh;
  shieldLight: THREE.PointLight;
  hdmiPort: THREE.Vector3;
  rj45Port: THREE.Vector3;
};

export function buildAppliance(): Appliance {
  const root = new THREE.Group();

  const shell = new THREE.MeshPhysicalMaterial({ color: '#2c2f34', metalness: 0.85, roughness: 0.32, clearcoat: 0.3, clearcoatRoughness: 0.4 });
  const gloss = new THREE.MeshPhysicalMaterial({ color: '#0a0b0d', metalness: 0.2, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const hole = new THREE.MeshStandardMaterial({ color: '#030304', roughness: 0.9 });
  const steel = new THREE.MeshStandardMaterial({ color: '#9aa3ad', metalness: 0.9, roughness: 0.3 });
  const copper = new THREE.MeshStandardMaterial({ color: '#b4744a', metalness: 0.95, roughness: 0.28 });
  const black = new THREE.MeshStandardMaterial({ color: '#111316', metalness: 0.3, roughness: 0.6 });

  // Tray: rounded ring extruded up, plus a floor.
  const ring = roundedRect(W, D, R);
  ring.holes.push(roundedRect(W - 0.5, D - 0.5, R - 0.25) as unknown as THREE.Path);
  const trayGeo = new THREE.ExtrudeGeometry(ring, { depth: BASE_H, bevelEnabled: false, curveSegments: 10 });
  trayGeo.rotateX(-Math.PI / 2);
  const tray = new THREE.Mesh(trayGeo, shell);
  root.add(tray);
  const floorGeo = new THREE.ExtrudeGeometry(roundedRect(W, D, R), { depth: 0.3, bevelEnabled: false, curveSegments: 10 });
  floorGeo.rotateX(-Math.PI / 2);
  root.add(new THREE.Mesh(floorGeo, shell));

  // Front ports on the +z face.
  const fz = D / 2 + 0.005;
  const port = (x: number, y: number, w: number, h: number, mat: THREE.Material = hole) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), mat);
    m.position.set(x, y, fz);
    root.add(m);
    return m;
  };
  const pwr = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 24), black);
  pwr.rotation.x = Math.PI / 2; pwr.position.set(-4.85, 1.75, fz); root.add(pwr);
  const ledMat = new THREE.MeshBasicMaterial({ color: CYAN, toneMapped: false });
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), ledMat);
  led.position.set(-4.85, 1.0, fz + 0.04); root.add(led);
  const jack = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 20), hole);
  jack.rotation.x = Math.PI / 2; jack.position.set(-4.05, 2.1, fz); root.add(jack);
  port(-3.0, 1.55, 1.4, 0.5);                       // HDMI
  port(-1.35, 1.65, 1.3, 1.1);                      // RJ45
  const usbBlue = new THREE.MeshStandardMaterial({ color: '#1e6fd6', roughness: 0.4, emissive: '#0b2a5a', emissiveIntensity: 0.6 });
  port(0.25, 2.15, 1.3, 0.48); port(0.25, 1.35, 1.3, 0.48);
  port(0.25, 2.15, 1.0, 0.16, usbBlue).position.z += 0.02;
  port(0.25, 1.35, 1.0, 0.16, usbBlue).position.z += 0.02;
  port(1.75, 1.55, 0.9, 0.32);                      // USB-C
  port(3.15, 1.55, 1.4, 0.5);                       // HDMI 2
  // Vent slit above the ports.
  port(-0.3, 3.05, 7.6, 0.32);

  // Side mesh grille on +x.
  const grilleTex = canvasTex(512, 200, (c) => {
    c.fillStyle = '#2c2f34'; c.fillRect(0, 0, 512, 200);
    c.fillStyle = '#050506';
    for (let y = 8; y < 200; y += 12) for (let x = 8 + ((y / 12) % 2) * 6; x < 512; x += 12) { c.beginPath(); c.arc(x, y, 3.6, 0, Math.PI * 2); c.fill(); }
  });
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 2.6), new THREE.MeshStandardMaterial({ map: grilleTex, metalness: 0.7, roughness: 0.45 }));
  grille.rotation.y = Math.PI / 2; grille.position.set(W / 2 + 0.01, 1.85, 0.2); root.add(grille);

  // ------------------------------------------------ inside
  const pcbTex = canvasTex(1024, 1024, (c) => {
    c.fillStyle = '#0b1512'; c.fillRect(0, 0, 1024, 1024);
    c.strokeStyle = 'rgba(80,210,180,.18)'; c.lineWidth = 2;
    const rnd = mulberry(7);
    for (let i = 0; i < 140; i++) {
      let x = rnd() * 1024, y = rnd() * 1024;
      c.beginPath(); c.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        if (rnd() > 0.5) x += (rnd() - 0.5) * 300; else y += (rnd() - 0.5) * 300;
        c.lineTo(x, y);
      }
      c.stroke();
      c.fillStyle = 'rgba(200,170,90,.5)'; c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = 'rgba(233,238,243,.35)'; c.font = '600 22px monospace';
    c.fillText('AEGIS-MB713  REV C', 60, 980);
  });
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(W - 0.8, 0.12, D - 0.8), new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.55, metalness: 0.2 }));
  pcb.position.y = 0.42; root.add(pcb);

  const parts: Record<string, THREE.Object3D> = {};
  const anchors: Record<string, THREE.Vector3> = {};

  // Blower fan, back left.
  const fanG = new THREE.Group(); fanG.position.set(-2.55, 0.5, -1.9);
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 1.2, 40, 1, true), black);
  housing.position.y = 0.6; fanG.add(housing);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.1, 24), black); hub.position.y = 0.6; fanG.add(hub);
  const fan = new THREE.Group(); fan.position.y = 0.6;
  for (let i = 0; i < 13; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.95, 0.06), black);
    const a = (i / 13) * Math.PI * 2;
    b.position.set(Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35);
    b.rotation.y = -a + 0.5;
    fan.add(b);
  }
  fanG.add(fan);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), new THREE.MeshStandardMaterial({ color: '#1a1d21', metalness: 0.6, roughness: 0.3 }));
  badge.rotation.x = -Math.PI / 2; badge.position.y = 1.16; fanG.add(badge);
  root.add(fanG); parts.fan = fanG; anchors.fan = new THREE.Vector3(-2.55, 2.2, -1.9);

  // Heatsink fins, back right.
  const fins = new THREE.Group(); fins.position.set(2.7, 0.5, -3.55);
  for (let i = 0; i < 26; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.7, 1.9), steel);
    f.position.set(-2.1 + i * 0.17, 0.85, 0); fins.add(f);
  }
  root.add(fins); parts.fins = fins;

  // CPU plate and heat pipes.
  const cpuG = new THREE.Group(); cpuG.position.set(1.0, 0.5, 0.15);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.3, 2.8), copper); plate.position.y = 0.15; cpuG.add(plate);
  for (const dx of [-0.6, 0.6]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.0, 12), copper);
    pipe.rotation.x = Math.PI / 2; pipe.position.set(dx + 0.9, 0.38, -2.2); cpuG.add(pipe);
  }
  root.add(cpuG); parts.cpu = cpuG; anchors.cpu = new THREE.Vector3(1.0, 1.2, 0.15);

  // SO-DIMMs, front left.
  const ramG = new THREE.Group();
  const ramPcb = new THREE.MeshStandardMaterial({ color: '#0f2a1f', roughness: 0.5 });
  for (const z of [1.75, 3.35]) {
    const stick = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 1.25), ramPcb);
    stick.position.set(-2.55, 0.62 + (z > 2 ? 0.5 : 0), z); ramG.add(stick);
    for (let i = 0; i < 4; i++) {
      const chip = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.7), black);
      chip.position.set(-4.2 + i * 1.1, 0.7 + (z > 2 ? 0.5 : 0), z); ramG.add(chip);
    }
  }
  root.add(ramG); parts.ram = ramG; anchors.ram = new THREE.Vector3(-2.55, 1.4, 2.55);

  // NVMe, front right.
  const nvmeTex = canvasTex(512, 128, (c) => {
    c.fillStyle = '#0d0f12'; c.fillRect(0, 0, 512, 128);
    c.fillStyle = '#e9eef3'; c.font = '700 34px sans-serif'; c.fillText('NVMe  M.2 2280', 24, 56);
    c.fillStyle = '#35d0f0'; c.font = '500 22px monospace'; c.fillText('PCIe 4.0 x4', 24, 98);
  });
  const nvme = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 1.1), [black, black, new THREE.MeshStandardMaterial({ map: nvmeTex, roughness: 0.5 }), black, black, black]);
  nvme.position.set(2.65, 0.6, 3.6); root.add(nvme); parts.nvme = nvme; anchors.nvme = new THREE.Vector3(2.65, 0.9, 3.6);

  // NIC magnetics behind the RJ45.
  const nic = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.3, 1.6), new THREE.MeshStandardMaterial({ color: '#c9ccd1', metalness: 0.8, roughness: 0.35 }));
  nic.position.set(-1.35, 1.15, 4.35); root.add(nic); parts.net = nic; anchors.net = new THREE.Vector3(-1.35, 2.0, 4.6);

  // Lid with a soft bevel and the AEGIS mark.
  const lid = new THREE.Group();
  const lidGeo = new THREE.ExtrudeGeometry(roundedRect(W - 0.24, D - 0.24, R - 0.12), { depth: 0.46, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 4, curveSegments: 12 });
  lidGeo.rotateX(-Math.PI / 2);
  const lidMesh = new THREE.Mesh(lidGeo, gloss);
  lidMesh.position.y = 0.12; lid.add(lidMesh);
  const markTex = canvasTex(1024, 1024, (c) => {
    c.clearRect(0, 0, 1024, 1024);
    c.strokeStyle = 'rgba(233,238,243,.85)'; c.lineWidth = 7;
    drawShieldPath(c, 512, 440, 120); c.stroke();
    drawShieldPath(c, 512, 440, 78); c.fillStyle = 'rgba(53,208,240,.9)'; c.fill();
    c.fillStyle = 'rgba(233,238,243,.9)'; c.textAlign = 'center';
    c.font = '800 64px Archivo, sans-serif'; c.fillText('AEGIS-SHIELD', 512, 650);
    c.fillStyle = 'rgba(233,238,243,.45)'; c.font = '500 32px "JetBrains Mono", monospace'; c.fillText('Mi713', 512, 705);
  });
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: markTex, transparent: true, toneMapped: false, opacity: 0.92 }));
  mark.rotation.x = -Math.PI / 2; mark.position.y = 0.71; lid.add(mark);
  lid.position.y = BASE_H;
  root.add(lid);

  // The shield that rises out of the CPU.
  const shield = new THREE.Group();
  shield.position.set(1.0, 1.0, 0.15);
  const ringShape = shieldShape(1);
  ringShape.holes.push(shieldShape(0.8) as unknown as THREE.Path);
  const edge = new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 }),
    new THREE.MeshStandardMaterial({ color: '#0a2830', emissive: CYAN, emissiveIntensity: 2.2, metalness: 0.4, roughness: 0.3, toneMapped: false }));
  edge.position.z = -0.08; shield.add(edge);
  const core = new THREE.Mesh(new THREE.ExtrudeGeometry(shieldShape(0.62), { depth: 0.1, bevelEnabled: false }),
    new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.35, toneMapped: false, side: THREE.DoubleSide }));
  core.position.z = -0.05; shield.add(core);
  const glowTex = canvasTex(256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(53,208,240,.9)'); g.addColorStop(0.35, 'rgba(53,208,240,.25)'); g.addColorStop(1, 'rgba(53,208,240,0)');
    c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  });
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.set(5.5, 5.5, 1); shield.add(glow);
  shield.scale.setScalar(0.001);
  root.add(shield);

  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.5, 1, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  beam.position.set(1.0, 0.8, 0.15);
  root.add(beam);

  const shieldLight = new THREE.PointLight(CYAN, 0, 30, 1.6);
  shieldLight.position.set(1.0, 3, 0.15);
  root.add(shieldLight);

  return {
    root, lid, parts, anchors, fan, led: ledMat, shield, beam, shieldLight,
    hdmiPort: new THREE.Vector3(-3.0, 1.55, D / 2 + 0.1),
    rj45Port: new THREE.Vector3(-1.35, 1.65, D / 2 + 0.1),
  };
}

// ---------------------------------------------------------------- monitor
export type Monitor = { root: THREE.Group; screen: THREE.Mesh; port: THREE.Vector3; glow: THREE.Mesh };

export function buildMonitor(screenTex: THREE.Texture): Monitor {
  const root = new THREE.Group();
  const body = new THREE.MeshPhysicalMaterial({ color: '#141619', metalness: 0.6, roughness: 0.38, clearcoat: 0.4 });
  const SW = 48, SH = 27;
  const base = new THREE.Mesh(new RoundedBoxGeometry(20, 0.7, 11, 3, 0.3), body);
  base.position.set(0, 0.35, -1.5); root.add(base);
  const neck = new THREE.Mesh(new RoundedBoxGeometry(3.4, 20, 1.6, 3, 0.4), body);
  neck.position.set(0, 10.5, -3.2); root.add(neck);
  const shell = new THREE.Mesh(new RoundedBoxGeometry(SW + 1.4, SH + 1.6, 1.8, 4, 0.5), body);
  shell.position.set(0, 26, -1.2); root.add(shell);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.set(0, 26.25, -0.29); root.add(screen);
  // A soft spill of screen light onto the desk.
  const spillTex = canvasTex(256, 128, (c) => {
    const g = c.createRadialGradient(128, 0, 0, 128, 0, 128);
    g.addColorStop(0, 'rgba(120,200,230,.55)'); g.addColorStop(1, 'rgba(120,200,230,0)');
    c.fillStyle = g; c.fillRect(0, 0, 256, 128);
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(70, 34), new THREE.MeshBasicMaterial({ map: spillTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.05, 16); root.add(glow);
  return { root, screen, port: new THREE.Vector3(0, 16, -2.3), glow };
}

// ---------------------------------------------------------------- cables
export type Cable = { mesh: THREE.Mesh; plug: THREE.Mesh; curve: THREE.CatmullRomCurve3; total: number; set: (p: number) => void };

export function buildCable(points: THREE.Vector3[], color: string, radius = 0.32, reverse = false): Cable {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const seg = 260, radial = 10;
  const geo = new THREE.TubeGeometry(curve, seg, radius, radial, false);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15 });
  const mesh = new THREE.Mesh(geo, mat);
  const total = geo.index!.count;
  const plug = new THREE.Mesh(new THREE.BoxGeometry(radius * 4.2, radius * 2.6, radius * 6), new THREE.MeshStandardMaterial({ color: '#1b1e22', metalness: 0.7, roughness: 0.35 }));
  const tmp = new THREE.Vector3(), tan = new THREE.Vector3();
  const set = (p: number) => {
    const q = THREE.MathUtils.clamp(p, 0, 1);
    const per = radial * 6;
    const n = Math.floor(seg * q) * per;
    if (reverse) geo.setDrawRange(total - n, n); else geo.setDrawRange(0, n);
    mesh.visible = q > 0.001;
    plug.visible = q > 0.001;
    const t = reverse ? 1 - q : q;
    curve.getPointAt(t, tmp); curve.getTangentAt(t, tan);
    plug.position.copy(tmp);
    plug.lookAt(tmp.clone().add(tan));
  };
  set(0);
  return { mesh, plug, curve, total, set };
}

// ---------------------------------------------------------------- desk, sonar
export function buildDesk() {
  const g = new THREE.Group();
  const fade = canvasTex(256, 256, (c) => {
    const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.32, '#fff'); gr.addColorStop(0.62, '#555'); gr.addColorStop(1, '#000');
    c.fillStyle = gr; c.fillRect(0, 0, 256, 256);
  }, false);
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ color: '#06080b', roughness: 0.62, metalness: 0.25, alphaMap: fade, transparent: true }));
  desk.position.z = -10;
  desk.rotation.x = -Math.PI / 2; g.add(desk);
  const shadowTex = canvasTex(256, 256, (c) => {
    const gr = c.createRadialGradient(128, 128, 20, 128, 128, 128);
    gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(0.6, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 256, 256);
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(20, 19), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; g.add(shadow);
  return g;
}

export function buildSonar(count = 5) {
  const g = new THREE.Group();
  const pts = roundedRect(W + 0.6, D + 0.6, R + 0.3).getPoints(24).map((p) => new THREE.Vector3(p.x, 0, -p.y));
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const rings: { line: THREE.LineLoop; mat: THREE.LineBasicMaterial }[] = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const line = new THREE.LineLoop(geo, mat);
    line.position.y = 0.04;
    g.add(line); rings.push({ line, mat });
  }
  const update = (time: number, amt: number) => {
    rings.forEach((r, i) => {
      const t = ((time * 0.22 + i / count) % 1);
      const s = 1 + t * 9;
      r.line.scale.set(s, 1, s);
      r.mat.opacity = amt * (1 - t) * (1 - t) * 0.85;
    });
  };
  return { group: g, update };
}

function mulberry(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
