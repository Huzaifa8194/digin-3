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

const productVideos = document.querySelectorAll<HTMLVideoElement>('.story-product-video video');
const reduceVideoMotion = matchMedia('(prefers-reduced-motion: reduce)');
const visibleProductVideos = new Set<HTMLVideoElement>();

function updateProductVideo(video: HTMLVideoElement) {
  if (visibleProductVideos.has(video) && !document.hidden && !reduceVideoMotion.matches) {
    void video.play().catch(() => { /* Keep the poster if autoplay is blocked. */ });
  } else {
    video.pause();
  }
}

const productVideoObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const video = entry.target as HTMLVideoElement;
    if (entry.intersectionRatio >= 0.3) {
      visibleProductVideos.add(video);
    } else {
      visibleProductVideos.delete(video);
    }
    updateProductVideo(video);
  }
}, { threshold: 0.3 });

productVideos.forEach(video => productVideoObserver.observe(video));
reduceVideoMotion.addEventListener('change', () => productVideos.forEach(updateProductVideo));
document.addEventListener('visibilitychange', () => productVideos.forEach(updateProductVideo));
