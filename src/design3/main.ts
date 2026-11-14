// /design3: the product page. One renderer, many 3D views (see three.ts), each tied to a DOM slot.
import './design3.css';
import '../inquiry';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { boot, isTouch, prefersReducedMotion } from '../engine';

boot(() => {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-stage-canvas]');
  if (!canvas) return;
  const reduced = prefersReducedMotion();
  requestAnimationFrame(() => { setTimeout(() => { void start(canvas, reduced); }, 60); });
});

async function start(canvas: HTMLCanvasElement, reduced: boolean) {
  const { THREE, createStage, baseScene, makeDevice, makeServiceObject, MODULES } = await import('./three');
  const stage = createStage(canvas);
  const slot = (name: string) => document.querySelector<HTMLElement>(`[data-view="${name}"]`)!;
  const pointer = { x: 0, y: 0 };
  if (!isTouch()) addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; }, { passive: true });
  const project = (obj: InstanceType<typeof THREE.Object3D>, offset: InstanceType<typeof THREE.Vector3>, cam: InstanceType<typeof THREE.PerspectiveCamera>, rect: DOMRect, origin: DOMRect) => {
    const v = offset.clone(); obj.localToWorld(v); v.project(cam);
    return { x: rect.left - origin.left + ((v.x + 1) / 2) * rect.width, y: rect.top - origin.top + ((1 - v.y) / 2) * rect.height };
  };

  // ---- hero: the device floats and turns, leaning toward the pointer ----
  {
    const { scene, camera } = baseScene(30, 6.2);
    const d = makeDevice(); scene.add(d.group); d.group.rotation.x = 0.2;
    stage.add({ el: slot('hero'), scene, camera, update: (t) => {
      d.group.rotation.y = t * 0.45 + pointer.x * 0.8;
      d.group.rotation.x = 0.2 + pointer.y * 0.3;
      d.group.position.y = Math.sin(t * 1.2) * 0.08;
      (d.ring.material as InstanceType<typeof THREE.MeshStandardMaterial>).emissiveIntensity = 2 + Math.sin(t * 3) * 0.8;
    } });
  }

  // ---- exploded view: scroll pulls the modules apart, labels follow the layers ----
  {
    const el = slot('explode');
    const section = document.querySelector<HTMLElement>('[data-explode]')!;
    const stageEl = section.querySelector<HTMLElement>('.d3-explode__stage')!;
    const labels = [...section.querySelectorAll<HTMLElement>('[data-label]')];
    const list = section.querySelector<HTMLElement>('[data-labels]')!;
    const { scene, camera } = baseScene(32, 9.5);
    const d = makeDevice(); scene.add(d.group);
    const prog = { p: 0 };
    ScrollTrigger.create({ trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.6, onUpdate: (s) => { prog.p = s.progress; } });
    const off = new THREE.Vector3(1.0, 0, 0);
    stage.add({ el, scene, camera, update: (t, _dt, rect) => {
      const p = Math.min(1, prog.p * 1.4);
      const e = p * p * (3 - 2 * p);
      d.explode(e);
      d.group.rotation.y = -0.55 + e * 0.5 + (reduced ? 0 : Math.sin(t * 0.4) * 0.05);
      d.group.rotation.x = 0.22;
      list.classList.toggle('is-on', e > 0.35);
      const origin = stageEl.getBoundingClientRect();
      labels.forEach((li, i) => {
        const pos = project(d.parts[i], off, camera, rect, origin);
        li.style.transform = `translate(${(pos.x + 56).toFixed(0)}px, ${(pos.y - 14).toFixed(0)}px)`;
      });
    } });
  }

  // ---- colours: pick a module, the field and the device follow ----
  {
    const section = document.querySelector<HTMLElement>('[data-colours]')!;
    const swatches = [...section.querySelectorAll<HTMLButtonElement>('[data-swatch]')];
    const panels = [...section.querySelectorAll<HTMLElement>('[data-colour]')];
    const inks = ['#0c0c0f', '#ffffff', '#0c0c0f', '#0c0c0f', '#ffffff'];
    const { scene, camera } = baseScene(30, 8.5);
    const d = makeDevice(); scene.add(d.group); d.group.rotation.x = 0.25;
    const f = { k: 0, i: 0, spin: 0 };
    const pick = (i: number) => {
      f.i = i;
      swatches.forEach((b, j) => b.setAttribute('aria-checked', String(i === j)));
      panels.forEach((p, j) => { p.hidden = i !== j; });
      section.style.setProperty('--f', MODULES[i].color);
      section.style.setProperty('--i', inks[i]);
      gsap.fromTo(f, { k: 0 }, { k: 1, duration: 0.9, ease: 'back.out(1.6)' });
      gsap.to(f, { spin: f.spin + Math.PI * 2, duration: 1.2, ease: 'expo.out' });
    };
    swatches.forEach((b, i) => b.addEventListener('click', () => pick(i)));
    section.addEventListener('keydown', (e) => {
      const cur = swatches.findIndex((b) => b.getAttribute('aria-checked') === 'true');
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); pick((cur + 1) % 5); swatches[(cur + 1) % 5].focus(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); pick((cur + 4) % 5); swatches[(cur + 4) % 5].focus(); }
    });
    pick(0);
    stage.add({ el: slot('colours'), scene, camera, update: (t) => {
      d.focus(f.i, f.k);
      d.group.rotation.y = f.spin + t * 0.25 + pointer.x * 0.5;
      d.group.position.y = Math.sin(t * 1.1) * 0.07;
    } });
  }

  // ---- built in: five service objects ----
  for (let i = 0; i < 5; i++) {
    const card = document.querySelector<HTMLElement>(`[data-card="${i}"]`)!;
    const { scene, camera } = baseScene(30, 4.2);
    camera.position.set(0, 0.3, 4.2); camera.lookAt(0, 0, 0);
    const obj = makeServiceObject(i); scene.add(obj);
    let hover = 0, spin = 0;
    card.addEventListener('pointerenter', () => gsap.to({ v: hover }, { v: 1, duration: 0.4, onUpdate() { hover = this.targets()[0].v; } }));
    card.addEventListener('pointerleave', () => gsap.to({ v: hover }, { v: 0, duration: 0.6, onUpdate() { hover = this.targets()[0].v; } }));
    stage.add({ el: slot(`service-${i}`), scene, camera, update: (t, dt) => {
      spin += dt * (0.5 + hover * 2.5);
      obj.rotation.y = spin; obj.rotation.x = Math.sin(t * 0.7 + i) * 0.2;
      obj.children.forEach((c) => { if (c.userData.spin) c.rotation.z += dt * c.userData.spin; });
      obj.scale.setScalar(1 + hover * 0.1);
    } });
  }

  // ---- 360°: drag to turn, hotspots ride the layers ----
  {
    const el = slot('turn');
    const section = el.closest<HTMLElement>('.d3-turn')!;
    const hots = [...section.querySelectorAll<HTMLButtonElement>('[data-hot]')];
    const panels = [...section.querySelectorAll<HTMLElement>('[data-hp]')];
    const deg = section.querySelector<HTMLElement>('[data-deg]');
    const { scene, camera } = baseScene(30, 8.6);
    const d = makeDevice(); scene.add(d.group); d.group.rotation.x = 0.28;
    const spin = { yaw: 0.6, v: 0, drag: false, x: 0, focus: -1, k: 0 };
    el.addEventListener('pointerdown', (e) => { spin.drag = true; spin.x = e.clientX; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => { if (!spin.drag) return; spin.v = (e.clientX - spin.x) * 0.01; spin.x = e.clientX; });
    el.addEventListener('pointerup', () => { spin.drag = false; });
    hots.forEach((b) => b.addEventListener('click', () => {
      const n = +b.dataset.hot!;
      hots.forEach((h) => h.setAttribute('aria-pressed', String(h === b)));
      panels.forEach((p) => { p.hidden = +p.dataset.hp! !== n; });
      const part = +b.dataset.part!;
      spin.focus = part >= 1 && part <= 5 ? part - 1 : -1;
      gsap.fromTo(spin, { k: 0 }, { k: 1, duration: 0.8, ease: 'back.out(1.6)' });
      gsap.to(spin, { yaw: spin.yaw + Math.PI * 0.5, duration: 1, ease: 'expo.out' });
    }));
    hots[0].click();
    const corners = [new THREE.Vector3(1.0, 0, 0.9), new THREE.Vector3(-1.0, 0, 0.9)];
    stage.add({ el, scene, camera, update: (_t, dt, rect) => {
      if (!spin.drag) { spin.v *= 0.94; if (!reduced) spin.yaw += dt * 0.15; }
      spin.yaw += spin.v;
      d.group.rotation.y = spin.yaw;
      d.focus(spin.focus, spin.k);
      const a = ((Math.round((spin.yaw * 180) / Math.PI) % 360) + 360) % 360;
      if (deg) deg.textContent = `${String(a).padStart(3, '0')}°`;
      const origin = section.getBoundingClientRect();
      hots.forEach((b, k) => {
        const pos = project(d.parts[+b.dataset.part!], corners[k % 2], camera, rect, origin);
        b.style.left = `${pos.x.toFixed(0)}px`; b.style.top = `${pos.y.toFixed(0)}px`;
      });
    } });
  }

  // ---- get: a burst of mini devices in the five colours ----
  {
    const { scene, camera } = baseScene(40, 12);
    camera.position.set(0, 0, 12); camera.lookAt(0, 0, 0);
    const count = innerWidth < 760 ? 40 : 90;
    const { RoundedBoxGeometry } = await import('three/examples/jsm/geometries/RoundedBoxGeometry.js');
    const mesh = new THREE.InstancedMesh(new RoundedBoxGeometry(0.5, 0.5, 0.5, 3, 0.1), new THREE.MeshPhysicalMaterial({ roughness: 0.3, clearcoat: 1 }), count);
    const dummy = new THREE.Object3D();
    const seeds = Array.from({ length: count }, (_, i) => ({ x: (Math.random() - 0.5) * 22, y: (Math.random() - 0.5) * 14, z: (Math.random() - 0.5) * 6, s: 0.5 + Math.random() * 1.2, r: Math.random() * 6, v: 0.25 + Math.random() * 0.6, c: i % 5 }));
    seeds.forEach((s, i) => mesh.setColorAt(i, new THREE.Color(MODULES[s.c].color)));
    scene.add(mesh);
    stage.add({ el: slot('burst'), scene, camera, update: (t) => {
      seeds.forEach((s, i) => {
        const y = ((s.y + 7 + t * s.v) % 14) - 7;
        dummy.position.set(s.x + Math.sin(t * 0.5 + s.r) * 0.4 + pointer.x * s.z * 0.4, y, s.z);
        dummy.rotation.set(t * s.v + s.r, t * 0.7 * s.v + s.r, 0);
        dummy.scale.setScalar(s.s);
        dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    } });
  }

  let t = 0;
  gsap.ticker.add((_time, dms) => { const dt = Math.min(0.05, dms / 1000); if (!reduced) t += dt; stage.render(t, reduced ? 0 : dt); });
  ScrollTrigger.refresh();
}
