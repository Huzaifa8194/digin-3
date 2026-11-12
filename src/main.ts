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
