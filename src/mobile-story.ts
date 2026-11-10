const chapterLabels = [
  ['home', 'Overview'],
  ['build', 'Development'],
  ['test', 'Security testing'],
  ['protect', 'Protection'],
  ['watch', 'Monitoring'],
  ['people', 'Training'],
  ['connect', 'Contact'],
] as const;

/** Touch devices keep the browser's scroll physics. The guide only observes position. */
export function mountMobileStory() {
  const root = document.documentElement;
  const header = document.querySelector('body > header')!;
  const chapters = chapterLabels.map(([id, label]) => ({
    id, label, section: document.getElementById(id)!,
  }));

  root.classList.add('mobile-story');
  // The contact chapter is the sticky guide's natural stopping point.
  const story = document.createElement('div');
  story.className = 'mobile-guided-story';
  chapters[0].section.before(story);
  story.append(...chapters.map(({ section }) => section));
  const guide = document.createElement('nav');
  guide.className = 'mobile-chapter-guide';
  guide.setAttribute('aria-label', 'Homepage chapters');
  guide.innerHTML = `
    <details>
      <summary><span class="mobile-chapter-label">Overview</span><span>Jump to chapter</span></summary>
      <ul>${chapters.map(({ id, label }) => `<li><a href="#${id}">${label}</a></li>`).join('')}</ul>
    </details>
    <div class="mobile-chapter-track" aria-hidden="true"><span></span></div>
  `;
  chapters[0].section.after(guide);

  const menu = guide.querySelector('details')!;
  const summary = guide.querySelector('summary')!;
  const label = guide.querySelector('.mobile-chapter-label')!;
  const track = guide.querySelector<HTMLElement>('.mobile-chapter-track > span')!;
  const links = [...guide.querySelectorAll('a')];
  let active = -1;
  let frame = 0;
  let readingTop = 0;

  function update() {
    frame = 0;
    let index = 0;
    for (let i = 1; i < chapters.length; i++) {
      if (chapters[i].section.getBoundingClientRect().top > readingTop + 20) break;
      index = i;
    }
    if (index !== active) {
      links[active]?.removeAttribute('aria-current');
      links[index].setAttribute('aria-current', 'location');
      label.textContent = chapters[index].label;
      active = index;
    }
    const bounds = story.getBoundingClientRect();
    const distance = Math.max(1, bounds.height - innerHeight);
    track.style.transform = `scaleX(${Math.max(0, Math.min(1, -bounds.top / distance))})`;
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function measure() {
    const headerHeight = header.getBoundingClientRect().height;
    readingTop = headerHeight + summary.getBoundingClientRect().height + 2;
    root.style.setProperty('--mobile-header-height', `${headerHeight}px`);
    root.style.setProperty('--mobile-reading-top', `${readingTop}px`);
    schedule();
  }

  for (const [index, link] of links.entries()) {
    const section = chapters[index].section;
    section.tabIndex = -1;
    link.addEventListener('click', () => {
      menu.open = false;
      // Keep keyboard and screen-reader focus with the native fragment destination.
      section.focus({ preventScroll: true });
    });
  }
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      summary.focus();
    }
  });

  const geometry = new ResizeObserver(measure);
  geometry.observe(header);
  geometry.observe(story);
  geometry.observe(summary);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  measure();
}
