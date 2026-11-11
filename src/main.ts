import './style.css';
import './component-refresh.css';
import './reference-components.css';
import './chapter-compositions.css';
import './layout-refinement.css';
import './mobile-story.css';
import './hero-product-feature.css';
import './header-navigation.css';
import { mountMobileStory } from './mobile-story';
import { mountReferenceComponents } from './reference-components';
import { mountComponentRefresh } from './component-refresh';
import { mountHeroProductFeature } from './hero-product-feature';

if (location.hash === '#solutions') location.replace('/products/');

const touchLayout = matchMedia('(pointer: coarse) and (hover: none)').matches;

mountHeroProductFeature();
mountComponentRefresh();
mountReferenceComponents();

document.querySelector<HTMLFormElement>('#inquiry')!.addEventListener('submit',event=>{
 event.preventDefault();
 const interest=document.querySelector<HTMLSelectElement>('#interest')!.value;
 const brief=document.querySelector<HTMLTextAreaElement>('#brief')!.value.trim();
 if(!brief)return;
 location.href=`mailto:info@digiinn360.com?subject=${encodeURIComponent(interest+' inquiry')}&body=${encodeURIComponent('Hello Digiinn360,\n\nI would like to discuss: '+interest+'\n\n'+brief+'\n\nCompany / name:\nContact details:')}`;
});

if (touchLayout) {
  mountMobileStory();
} else {
  void import('./desktop-story');
}
