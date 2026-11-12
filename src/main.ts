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
const [previousPreview, nextPreview] = previewPicker?.querySelectorAll('button') ?? [];
const previewStatus = previewPicker?.querySelector('[role="status"]');
const previewStarts = [0, 2, 3];
let previewPage = 0;

function browseServicePreviews(direction: number) {
  previewPage = (previewPage + direction + previewStarts.length) % previewStarts.length;
  const start = previewStarts[previewPage];
  servicePreviews.forEach((preview, index) => {
    preview.hidden = index < start || index >= start + 2;
  });
  if (previewStatus) previewStatus.textContent = `${start + 1}–${start + 2} of ${servicePreviews.length}`;
}

previousPreview?.addEventListener('click', () => browseServicePreviews(-1));
nextPreview?.addEventListener('click', () => browseServicePreviews(1));
