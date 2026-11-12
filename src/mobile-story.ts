import { createChapterScroll } from './chapter-scroll';
import { mountSecurityOrbit } from './security-orbit';

const chapterIds = ['home', 'test', 'protect', 'watch', 'build', 'people'] as const;

export function mountMobileStory() {
  const root = document.documentElement;
  const header = document.querySelector('body > header')!;
  const chapters = chapterIds.map(id => document.getElementById(id)!);
  const contact = document.getElementById('connect')!;
  const host = document.querySelector<HTMLElement>('#scene')!;
  const orbit = document.querySelector<HTMLTemplateElement>('#mobile-orbit')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  root.classList.add('mobile-story');
  chapters[0].append(orbit.content.cloneNode(true));
  mountSecurityOrbit();

  const story = document.createElement('div');
  story.className = 'mobile-guided-story';
  chapters[0].before(story);
  story.append(...chapters);

  const particleChapters = [...chapters, contact];
  let headerHeight = 0;
  let offsets: number[] = [];
  let frame = 0;

  function updateScene() {
    frame = 0;
    host.classList.toggle('scene-in-story', story.getBoundingClientRect().bottom > headerHeight + 12);
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(updateScene);
  }

  const scroller = createChapterScroll({
    reduced,
    onUpdate: schedule,
    mobile: { chapters, end: contact, headerHeight: () => headerHeight },
  });

  function measure() {
    headerHeight = header.getBoundingClientRect().height;
    root.style.setProperty('--mobile-header-height', `${headerHeight}px`);
    offsets = particleChapters.map((section, index) =>
      index === 0 ? 0 : section.getBoundingClientRect().top + scrollY - headerHeight);
    scroller.refresh();
    schedule();
  }

  const geometry = new ResizeObserver(measure);
  geometry.observe(header);
  geometry.observe(story);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  measure();

  void import('./particle-story').then(({ mountParticleStory }) => {
    mountParticleStory(particleChapters, () => offsets, () => scrollY / Math.max(1, offsets[offsets.length - 1]), reduced, true);
  });
}
