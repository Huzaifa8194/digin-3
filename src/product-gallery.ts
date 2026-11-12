import './catalog-page';
import './product-gallery.css';

const previewWidth = 1280;
const previews = document.querySelectorAll<HTMLElement>('.preview-window');

const fitPreview = (preview: HTMLElement, width: number) => {
  preview.style.setProperty('--preview-scale', String(width / previewWidth));
};

const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    fitPreview(entry.target as HTMLElement, entry.contentRect.width);
  }
});

for (const preview of previews) {
  fitPreview(preview, preview.clientWidth);
  resizeObserver.observe(preview);
}

const gallery = document.querySelector<HTMLElement>('.gallery-intro')!;
const stage = gallery.querySelector<HTMLElement>('.gallery-stage')!;
const links = [...gallery.querySelectorAll<HTMLAnchorElement>('.catalog-index a')];
const cards = [...stage.querySelectorAll<HTMLImageElement>('.gallery-deck-card')];
const stageName = stage.querySelector<HTMLElement>('.gallery-stage-name')!;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let active = 0;
let visible = false;
let previewing = false;
let cycle: number | undefined;

function showProduct(index: number) {
  active = index;
  cards.forEach((card, i) => {
    card.dataset.position = String((i - index + cards.length) % cards.length);
  });
  links.forEach((link, i) => link.classList.toggle('is-previewed', i === index));
  stageName.textContent = cards[index].dataset.name ?? '';
}

function updateCycle() {
  clearInterval(cycle);
  stage.toggleAttribute('data-paused', !visible || document.hidden);
  if (visible && !previewing && !document.hidden && !reducedMotion.matches) {
    cycle = window.setInterval(() => showProduct((active + 1) % cards.length), 4200);
  }
}

links.forEach((link, i) => {
  link.addEventListener('pointerenter', () => showProduct(i));
  link.addEventListener('focus', () => showProduct(i));
});

const index = gallery.querySelector<HTMLElement>('.catalog-index')!;
function updatePreviewing() {
  previewing = index.matches(':hover, :focus-within');
  updateCycle();
}
index.addEventListener('pointerenter', updatePreviewing);
index.addEventListener('pointerleave', updatePreviewing);
index.addEventListener('focusin', updatePreviewing);
index.addEventListener('focusout', () => queueMicrotask(updatePreviewing));
reducedMotion.addEventListener('change', updateCycle);
document.addEventListener('visibilitychange', updateCycle);
new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  updateCycle();
}).observe(stage);
showProduct(0);

function updateGalleryHeader() {
  document.body.classList.toggle('gallery-header-compact', window.scrollY > 72);
}
window.addEventListener('scroll', updateGalleryHeader, { passive: true });
window.addEventListener('pageshow', updateGalleryHeader);
updateGalleryHeader();
