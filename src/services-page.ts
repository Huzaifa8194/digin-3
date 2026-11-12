import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import './standalone-page';
import './services-page.css';

const diagrams = [
  { label: 'Perimeter' },
  { label: 'Controls' },
  { label: 'Signals' },
  { label: 'Network' },
  { label: 'Data' },
];

const tau = 2 * Math.PI;

// SimplexNoise is reused directly from the installed MIT-licensed Three.js package.
const noise = new SimplexNoise();
const strands = Array.from({ length: 66 }, (_, row) => {
  const latitude = (row / 65 - .5) * Math.PI;
  return Array.from({ length: 137 }, (_, column) => {
    const longitude = column / 136 * tau;
    const x = Math.cos(latitude) * Math.cos(longitude);
    const y = Math.sin(latitude);
    const z = Math.cos(latitude) * Math.sin(longitude);
    return { x, y, z, texture: noise.noise3d(x * 2.2, y * 2.2, z * 2.2) };
  });
});

function drawSculpture(
  ctx: CanvasRenderingContext2D, diagram: number, time = 0, pointerX = 0, pointerY = 0,
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  const scale = Math.min(width * .39, height * .37);
  const centerX = width * .52;
  const centerY = height * .50;
  const angle = time * .00019 + diagram * .83 + pointerX * .34;
  const pitch = .46 + pointerY * .23;
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const glow = ctx.createRadialGradient(centerX, centerY, scale * .12, centerX, centerY, scale * 1.48);
  glow.addColorStop(0, '#82233375');
  glow.addColorStop(.63, '#39142550');
  glow.addColorStop(1, '#11152200');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const bands = Array.from({ length: 9 }, () => new Path2D());
  const palette = ['#532b44', '#77334d', '#a7495e', '#c94e61', '#f4646e', '#fd867c', '#ffab91', '#ffe1c7', '#fff3e0'];
  strands.forEach((strand, row) => {
    let lastX = 0;
    let lastY = 0;
    strand.forEach(({ x, y, z, texture }, column) => {
      const ripple = Math.sin(y * (9 + diagram) + z * 4 - time * .0008);
      const radius = .89 + texture * .22 + ripple * .135;
      const spinX = (x * cosAngle - z * sinAngle) * radius;
      const spinZ = (x * sinAngle + z * cosAngle) * radius;
      const spinY = y * radius;
      const depth = spinZ * cosPitch + spinY * sinPitch;
      const screenY = spinY * cosPitch - spinZ * sinPitch;
      const perspective = 2.8 / (2.8 - depth);
      const px = centerX + (spinX - screenY * .18) * scale * perspective;
      const py = centerY + screenY * scale * perspective;
      const tone = Math.max(0, Math.min(8, Math.floor((depth + .9) * 4.2 - x * .85 + 1)));
      if (column && (row % 3 !== 0 || depth > -.4)) {
        bands[tone].moveTo(lastX, lastY);
        bands[tone].lineTo(px, py);
      }
      lastX = px;
      lastY = py;
    });
  });
  bands.forEach((band, index) => {
    ctx.strokeStyle = palette[index];
    ctx.globalAlpha = .38 + index * .073;
    ctx.lineWidth = Math.max(.65, scale / 225);
    ctx.stroke(band);
  });
  ctx.globalAlpha = 1;
}


function fitCanvas(canvas: HTMLCanvasElement) {
  const scale = Math.min(devicePixelRatio || 1, 2);
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
}

const hero = document.querySelector<HTMLCanvasElement>('[data-service-art="hero"]');
const heroContext = hero?.getContext('2d');
const label = document.querySelector<HTMLElement>('[data-art-label]');
const previewLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-service-preview]'));
const directoryLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.services-directory a'));
const chapters = Array.from(document.querySelectorAll<HTMLElement>('.services-chapter'));

if (hero && heroContext) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let selection = 0;
  let frame = 0;
  let visible = false;
  let pointerX = 0;
  let pointerY = 0;
  let easedX = 0;
  let easedY = 0;
  const stage = hero.closest('.services-hero');

  stage?.addEventListener('pointermove', event => {
    const pointer = event as PointerEvent;
    if (pointer.pointerType !== 'mouse') return;
    const bounds = stage.getBoundingClientRect();
    pointerX = (pointer.clientX - bounds.left) / bounds.width * 2 - 1;
    pointerY = (pointer.clientY - bounds.top) / bounds.height * 2 - 1;
  });
  stage?.addEventListener('pointerleave', () => {
    pointerX = 0;
    pointerY = 0;
  });

  function select(index: number) {
    selection = index;
    previewLinks.forEach((link, linkIndex) => link.classList.toggle('is-previewed', linkIndex === index));
    if (label) label.textContent = `0${index + 1} / ${diagrams[index].label}`;
    drawSculpture(heroContext!, selection);
  }

  function animate(time: number) {
    easedX += (pointerX - easedX) * .045;
    easedY += (pointerY - easedY) * .045;
    drawSculpture(heroContext!, selection, time, easedX, easedY);
    frame = requestAnimationFrame(animate);
  }

  function syncMotion() {
    cancelAnimationFrame(frame);
    if (visible && !reducedMotion.matches) frame = requestAnimationFrame(animate);
    else drawSculpture(heroContext!, selection);
  }

  new ResizeObserver(() => {
    fitCanvas(hero);
    drawSculpture(heroContext, selection);
  }).observe(hero);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncMotion();
  }).observe(hero);
  reducedMotion.addEventListener('change', syncMotion);
  previewLinks.forEach((link, index) => {
    link.addEventListener('pointerenter', () => select(index));
    link.addEventListener('focus', () => select(index));
    link.addEventListener('click', () => select(index));
  });
  select(0);
}

const chapterMotion = matchMedia('(prefers-reduced-motion: reduce)');
const chapterArtwork = new Map<HTMLCanvasElement, { context: CanvasRenderingContext2D; diagram: number }>();
const visibleArtwork = new Set<HTMLCanvasElement>();
let chapterFrame = 0;
let lastDraw = 0;

function drawChapter(canvas: HTMLCanvasElement, time = 0) {
  const artwork = chapterArtwork.get(canvas);
  if (artwork) drawSculpture(artwork.context, artwork.diagram, time);
}

function animateChapters(time: number) {
  if (time - lastDraw >= 32) {
    visibleArtwork.forEach(canvas => drawChapter(canvas, time));
    lastDraw = time;
  }
  chapterFrame = requestAnimationFrame(animateChapters);
}

function syncChapterMotion() {
  cancelAnimationFrame(chapterFrame);
  if (chapterMotion.matches) visibleArtwork.forEach(canvas => drawChapter(canvas));
  else if (visibleArtwork.size) chapterFrame = requestAnimationFrame(animateChapters);
}

const chapterResize = new ResizeObserver(entries => {
  entries.forEach(({ target }) => {
    const canvas = target as HTMLCanvasElement;
    fitCanvas(canvas);
    drawChapter(canvas);
  });
});
const artworkObserver = new IntersectionObserver(entries => {
  entries.forEach(({ target, isIntersecting }) => {
    const canvas = target as HTMLCanvasElement;
    if (isIntersecting) visibleArtwork.add(canvas);
    else visibleArtwork.delete(canvas);
  });
  syncChapterMotion();
});
document.querySelectorAll<HTMLCanvasElement>('.services-chapter-art canvas').forEach(canvas => {
  const context = canvas.getContext('2d');
  if (!context) return;
  chapterArtwork.set(canvas, { context, diagram: Number(canvas.dataset.serviceArt) });
  chapterResize.observe(canvas);
  artworkObserver.observe(canvas);
});
chapterMotion.addEventListener('change', syncChapterMotion);

function syncServicesHeader() {
  document.body.classList.toggle('services-header-compact', window.scrollY > 72);
}

window.addEventListener('scroll', syncServicesHeader, { passive: true });
window.addEventListener('pageshow', syncServicesHeader);
syncServicesHeader();

function markCurrentChapter(id: string) {
  directoryLinks.forEach(link => {
    if (link.hash === '#' + id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

const chapterObserver = new IntersectionObserver(entries => {
  const entered = entries.find(entry => entry.isIntersecting);
  if (entered) markCurrentChapter(entered.target.id);
}, { rootMargin: '-26% 0px -58% 0px' });
chapters.forEach(chapter => chapterObserver.observe(chapter));
