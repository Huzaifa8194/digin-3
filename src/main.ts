import './style.css';
import './component-refresh.css';
import './reference-components.css';
import './chapter-compositions.css';
import './layout-refinement.css';
import './hero-product-feature.css';
import './header-navigation.css';
import './header-mega-menu';
import './home-palette.css';
import './mobile-story.css';
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

const serviceChoices = [...document.querySelectorAll<HTMLButtonElement>('.service-preview-choices button')];
const servicePanels = serviceChoices.map(choice => document.getElementById(choice.getAttribute('aria-controls')!));
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
let selectedService = 0;

function showService(index: number) {
  if (index === selectedService) return;
  serviceChoices[selectedService].setAttribute('aria-pressed', 'false');
  servicePanels[selectedService]?.setAttribute('hidden', '');
  selectedService = index;
  serviceChoices[index].setAttribute('aria-pressed', 'true');
  servicePanels[index]?.removeAttribute('hidden');
}

serviceChoices.forEach((choice, index) => {
  choice.addEventListener('click', () => showService(index));
  choice.addEventListener('pointerenter', event => {
    if (finePointer.matches && event.pointerType === 'mouse') showService(index);
  });
});
