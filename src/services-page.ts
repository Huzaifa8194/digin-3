import './standalone-page';
import './services-page.css';

const diagrams = [
  { label: 'Perimeter', color: '#9edbff' },
  { label: 'Controls', color: '#d1c6ff' },
  { label: 'Signals', color: '#a3f0d9' },
  { label: 'Network', color: '#b3cbff' },
  { label: 'Data', color: '#ffd4ac' },
];

const tau = 2 * Math.PI;

function drawDiagram(ctx: CanvasRenderingContext2D, diagram: number, time = 0) {
  const { width, height } = ctx.canvas;
  const unit = Math.min(width, height) / 270;
  const color = diagrams[diagram].color;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(unit, unit);
  ctx.lineWidth = 1;

  function path(points: number[][], closed = false, opacity = .55) {
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    if (closed) ctx.closePath();
    ctx.stroke();
  }

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.setLineDash([3, 5]);
  path([[-125, 0], [125, 0]], false, .28);
  path([[0, -122], [0, 122]], false, .28);
  ctx.setLineDash([]);

  const angle = time * .00022;
  if (diagram === 0) {
    for (let ring = 1; ring <= 5; ring++) {
      const points = Array.from({ length: 97 }, (_, index) => {
        const a = index * tau / 96;
        const radius = ring * 20 + 5 * Math.cos(a * 5 + angle * 3 + ring / 2);
        return [Math.cos(a) * radius, Math.sin(a) * radius];
      });
      path(points, true, .32 + ring * .10);
    }
    const x = 105 * Math.cos(angle * 2);
    const y = 105 * Math.sin(angle * 2);
    path([[0, 0], [x, y]], false, .9);
    ctx.globalAlpha = .95;
    ctx.shadowColor = color;
    ctx.shadowBlur = 13;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, tau);
    ctx.fill();
  } else if (diagram === 1 || diagram === 4) {
    for (let layer = 0; layer < 6; layer++) {
      const rise = (layer - 2.5) * 24 + 4 * Math.sin(angle * 3 + layer);
      const corners = [[-103, rise], [0, rise - 34], [103, rise], [0, rise + 34]];
      const points = diagram === 1 ? corners : [[-77, rise - 20], [0, rise - 35], [77, rise - 20], [77, rise + 20], [0, rise + 35], [-77, rise + 20]];
      path(points, true, .48 + layer * .08);
      path([points[0], points[2]], false, .28);
    }
  } else if (diagram === 2) {
    for (let band = 0; band < 7; band++) {
      const points = Array.from({ length: 121 }, (_, index) => {
        const x = (index - 60) * 1.95;
        const envelope = 8 + 48 * Math.exp(-Math.pow(x / 46, 2));
        const y = (band - 3) * 16 + envelope * Math.sin(x / 13 + angle * 3 + band / 2);
        return [x, y];
      });
      path(points, false, band === 3 ? .94 : .42);
    }
  } else {
    const points = Array.from({ length: 12 }, (_, index) => {
      const a = angle + index * tau / 12;
      const r = index % 2 === 0 ? 103 : 58;
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
    path(points, true, .9);
    points.forEach(([x, y], index) => {
      path([[x, y], points[(index + 4) % points.length]], false, .42);
      ctx.globalAlpha = .95;
      ctx.beginPath();
      ctx.arc(x, y, index % 2 === 0 ? 3 : 2, 0, tau);
      ctx.fill();
    });
  }

  ctx.restore();
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

  function select(index: number) {
    selection = index;
    previewLinks.forEach((link, linkIndex) => link.classList.toggle('is-previewed', linkIndex === index));
    if (label) label.textContent = `0${index + 1} / ${diagrams[index].label}`;
    drawDiagram(heroContext!, selection);
  }

  function animate(time: number) {
    drawDiagram(heroContext!, selection, time);
    frame = requestAnimationFrame(animate);
  }

  function syncMotion() {
    cancelAnimationFrame(frame);
    if (visible && !reducedMotion.matches) frame = requestAnimationFrame(animate);
    else drawDiagram(heroContext!, selection);
  }

  new ResizeObserver(() => {
    fitCanvas(hero);
    drawDiagram(heroContext, selection);
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

const chapterCanvases = document.querySelectorAll<HTMLCanvasElement>('.services-chapter-art canvas');
const chapterResize = new ResizeObserver(entries => {
  entries.forEach(({ target }) => {
    const canvas = target as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) return;
    fitCanvas(canvas);
    drawDiagram(context, Number(canvas.dataset.serviceArt));
  });
});
chapterCanvases.forEach(canvas => chapterResize.observe(canvas));

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
