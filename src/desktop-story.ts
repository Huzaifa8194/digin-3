import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { createChapterScroll } from './chapter-scroll';
import { mountParticleStory } from './particle-story';

gsap.registerPlugin(ScrollTrigger);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const state = { progress: 0 };
const chapters = [...document.querySelectorAll<HTMLElement>('.chapter')];
// Keep semantic sections and native anchors; only enhance the presentation.
chapters.forEach(chapter => {
 const stage = document.createElement('div'); stage.className = 'chapter-stage';
 while(chapter.firstChild) stage.append(chapter.firstChild);
 chapter.append(stage);
});
document.documentElement.classList.add('story-ready');
let chapterOffsets: number[] = [];
function measureChapters(){ chapterOffsets = chapters.map(el => el.offsetTop); }
function sizeReadingStages(){
 chapters.forEach(chapter=>{
  const stage=chapter.querySelector<HTMLElement>('.chapter-stage')!;
  const copy=chapter.querySelector<HTMLElement>('.copy')!;
  const fits=chapter.id!=='home' && chapter.id!=='connect' && innerWidth>=1000 && innerHeight>=640 && copy.offsetHeight<=innerHeight-150 && !reduced.matches;
  chapter.classList.toggle('flow-chapter',!fits);
  stage.style.minHeight=chapter.id==='home'?'':fits?`${innerHeight}px`:'auto';
  chapter.style.minHeight=fits?`${innerHeight*2.35}px`:'auto';
 });
 measureChapters();
}
const heroChapter=document.querySelector<HTMLElement>('#home')!;
function updateHeroHandoff(){
 const distance=Math.max(1,(chapterOffsets[1]??innerHeight)-heroChapter.offsetTop);
 const progress=THREE.MathUtils.clamp((scrollY-heroChapter.offsetTop)/distance,0,1);
 document.documentElement.classList.toggle('past-hero',progress>.24);
}
window.addEventListener('scroll',updateHeroHandoff,{passive:true});
window.addEventListener('resize',updateHeroHandoff);
updateHeroHandoff();
const animationContext=gsap.matchMedia();
function configureContentMotion(){
 animationContext.revert();
 animationContext.add('(prefers-reduced-motion: no-preference)',()=>{
  chapters.forEach((chapter,index)=>{
   if(chapter.classList.contains('flow-chapter'))return;
   const copy=chapter.querySelector('.copy')!;
   // One reversible owner for every animated property. Separate entrance/exit
   // scrubs competed over opacity and transforms when scrolling upward.
   const timeline=gsap.timeline({scrollTrigger:{trigger:chapter,start:'top 75%',end:'bottom 65%',scrub:true}});
   if(index>0)timeline.fromTo(copy,{autoAlpha:0,y:30,scale:.98},{autoAlpha:1,y:0,scale:1,duration:.7,ease:'sine.out'});
   else timeline.to({}, {duration:.7});
   timeline.to({}, {duration:Math.max(.1,chapter.offsetHeight/innerHeight-1)});
   if(index<chapters.length-1)timeline.to(copy,{autoAlpha:0,y:-30,scale:.98,duration:.4,ease:'sine.in'});
   else timeline.to({}, {duration:.4});
  });
 });
}
sizeReadingStages();
configureContentMotion();
const chapterScroll=createChapterScroll({reduced,onUpdate:()=>ScrollTrigger.update()});
reduced.addEventListener('change',()=>{sizeReadingStages();updateHeroHandoff();configureContentMotion();ScrollTrigger.refresh();chapterScroll.refresh();});
window.addEventListener('resize',()=>{sizeReadingStages();updateHeroHandoff();configureContentMotion();ScrollTrigger.refresh();chapterScroll.refresh();});
document.fonts.ready.then(()=>{
 sizeReadingStages();updateHeroHandoff();configureContentMotion();ScrollTrigger.refresh();
 chapterScroll.refresh();
 const initialTarget=document.getElementById(location.hash.slice(1));
 if(initialTarget && chapterScroll.handles(initialTarget))chapterScroll.goTo(initialTarget);
 else initialTarget?.scrollIntoView({behavior:'instant'});
});
// Tall sticky sections need an explicit destination: browser anchor heuristics
// can otherwise land near the end of a section, after its content has faded.
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(link=>{
 link.addEventListener('click',event=>{
  const target=document.getElementById(link.hash.slice(1));
  if(!target || !chapterScroll.handles(target))return;
  event.preventDefault();
  history.replaceState(null,'',link.hash);
  chapterScroll.goTo(target);
 });
});
measureChapters();
ScrollTrigger.addEventListener('refresh', measureChapters);
gsap.to(state, { progress: 1, ease: 'none', scrollTrigger: { trigger: 'main', start: 'top top', end: 'bottom bottom', scrub: true } });
mountParticleStory(chapters, () => chapterOffsets, () => state.progress, reduced);
