import './style.css';
import './component-refresh.css';
import './reference-components.css';
import './chapter-compositions.css';
import './layout-refinement.css';
import './mobile-story.css';
import './hero-product-feature.css';
import './header-navigation.css';
import './home-palette.css';
import './inquiry';
import { mountMobileStory } from './mobile-story';
import { mountReferenceComponents } from './reference-components';
import { mountComponentRefresh } from './component-refresh';
import { mountHeroProductFeature } from './hero-product-feature';

if (location.hash === '#solutions') location.replace('/products/');

const touchLayout = matchMedia('(max-width: 700px), (pointer: coarse) and (hover: none)').matches;

mountHeroProductFeature();
mountComponentRefresh();
mountReferenceComponents();

if (touchLayout) {
  mountMobileStory();
} else {
  void import('./desktop-story');
}

const loopingVideos = document.querySelectorAll<HTMLVideoElement>('.story-product-video video');
const reduceVideoMotion = matchMedia('(prefers-reduced-motion: reduce)');
const visibleLoopingVideos = new Set<HTMLVideoElement>();

function updateLoopingVideo(video: HTMLVideoElement) {
  if (visibleLoopingVideos.has(video) && !document.hidden && !reduceVideoMotion.matches) {
    void video.play().catch(() => { /* Keep the poster if autoplay is blocked. */ });
  } else {
    video.pause();
  }
}

const loopingVideoObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const video = entry.target as HTMLVideoElement;
    if (entry.intersectionRatio >= 0.3) {
      visibleLoopingVideos.add(video);
    } else {
      visibleLoopingVideos.delete(video);
    }
    updateLoopingVideo(video);
  }
}, { threshold: 0.3 });

loopingVideos.forEach(video => {
  if (video.closest('.service-loop')) video.defaultPlaybackRate = video.playbackRate = 0.4;
  loopingVideoObserver.observe(video);
});
reduceVideoMotion.addEventListener('change', () => loopingVideos.forEach(updateLoopingVideo));
document.addEventListener('visibilitychange', () => loopingVideos.forEach(updateLoopingVideo));

const serviceTrack = document.querySelector<HTMLUListElement>('#service-previews');
const previewPicker = document.querySelector('.service-preview-picker');

if (serviceTrack && previewPicker) {
  const track = serviceTrack;
  const cards = [...track.children] as HTMLLIElement[];
  const dots = [...previewPicker.querySelectorAll('.service-preview-dots button')];
  let first = 0;
  let transition: Animation | undefined;
  let dragStart: { x: number; y: number } | undefined;
  let suppressClick = false;

  function arrangeCards() {
    const ordered = cards.map((_, offset) => cards[(first + offset + cards.length - 1) % cards.length]);
    ordered.forEach((card, offset) => {
      track.append(card);
      card.inert = offset !== 1 && offset !== 2;
    });
    dots.forEach((dot, index) => dot.setAttribute('aria-current', String(index === first)));
  }

  function select(index: number) {
    transition?.cancel();
    transition = undefined;
    first = (index + cards.length) % cards.length;
    arrangeCards();
  }

  function step(direction: number) {
    if (transition) return;
    if (reduceVideoMotion.matches) {
      select(first + direction);
      return;
    }
    const [left, right] = track.children;
    const distance = right.getBoundingClientRect().left - left.getBoundingClientRect().left;
    const base = getComputedStyle(track).transform;
    transition = track.animate([
      { transform: base },
      { transform: `translateX(${-distance * direction}px) ${base}` },
    ], { duration: 440, easing: 'cubic-bezier(.22,.76,.2,1)', fill: 'forwards' });
    transition.onfinish = () => select(first + direction);
  }

  arrangeCards();
  previewPicker.firstElementChild?.addEventListener('click', () => step(-1));
  previewPicker.lastElementChild?.addEventListener('click', () => step(1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => select(index)));

  track.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    dragStart = { x: event.clientX, y: event.clientY };
    track.dataset.dragging = '';
  });
  window.addEventListener('pointerup', event => {
    if (!dragStart || !event.isPrimary) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    dragStart = undefined;
    delete track.dataset.dragging;
    if (Math.abs(dx) < 32 || Math.abs(dx) <= Math.abs(dy)) return;
    suppressClick = true;
    step(dx < 0 ? 1 : -1);
  });
  track.addEventListener('pointercancel', () => {
    dragStart = undefined;
    delete track.dataset.dragging;
  });
  track.addEventListener('dragstart', event => event.preventDefault());
  track.addEventListener('click', event => {
    if (suppressClick) {
      suppressClick = false;
      event.preventDefault();
      return;
    }
    const bounds = track.parentElement!.getBoundingClientRect();
    if (event.clientX < bounds.left + bounds.width * .1) step(-1);
    if (event.clientX > bounds.right - bounds.width * .1) step(1);
  });
}
