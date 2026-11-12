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

const servicePreviews = [...document.querySelectorAll<HTMLLIElement>('#service-previews > li')];
const previewPicker = document.querySelector('.service-preview-picker');
const previousPreview = previewPicker?.firstElementChild;
const nextPreview = previewPicker?.lastElementChild;
const previewDots = previewPicker?.querySelectorAll('.service-preview-dots button');
let firstPreview = 0;

function showServicePreviews(index: number) {
  const total = servicePreviews.length;
  firstPreview = (index + total) % total;
  servicePreviews.forEach((preview, position) => {
    const slot = (position - firstPreview + total + 1) % total;
    preview.hidden = slot > 3;
    preview.dataset.slot = String(slot);
    const link = preview.querySelector('a')!;
    link.tabIndex = slot === 1 || slot === 2 ? 0 : -1;
  });
  previewDots?.forEach((dot, position) => {
    dot.setAttribute('aria-current', String(position === firstPreview));
  });
}

if (servicePreviews.length) {
  showServicePreviews(0);
  previousPreview?.addEventListener('click', () => showServicePreviews(firstPreview - 1));
  nextPreview?.addEventListener('click', () => showServicePreviews(firstPreview + 1));
  previewDots?.forEach((dot, index) => dot.addEventListener('click', () => showServicePreviews(index)));
  servicePreviews.forEach(preview => preview.addEventListener('click', event => {
    const slot = Number(preview.dataset.slot);
    if (slot === 0 || slot === 3) {
      event.preventDefault();
      showServicePreviews(firstPreview + (slot === 0 ? -1 : 1));
    }
  }));
}
