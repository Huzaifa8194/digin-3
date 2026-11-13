// The launch film: custom controls, chapter index, and jump links from every section.
// Plays muted while in view (unless the visitor paused it or prefers reduced motion).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isMobile, onPage, prefersReducedMotion, scrollToTarget } from '../engine';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function startFilm() {
  onPage(() => {
    const video = document.querySelector<HTMLVideoElement>('[data-film]');
    const section = document.getElementById('film');
    if (!video || !section) return;
    const toggle = section.querySelector<HTMLButtonElement>('[data-film-toggle]')!;
    const sound = section.querySelector<HTMLButtonElement>('[data-film-sound]')!;
    const bar = section.querySelector<HTMLElement>('[data-film-progress]')!;
    const time = section.querySelector<HTMLElement>('[data-film-time]')!;
    const chapters = [...section.querySelectorAll<HTMLButtonElement>('[data-seek]')];
    const marks = chapters.map((b) => parseFloat(b.dataset.seek || '0'));
    let userPaused = false;
    let inView = false;
    video.loop = true;

    const play = () => video.play().catch(() => { /* autoplay refused: the poster and play button stay */ });
    const tick = () => {
      const d = video.duration || 58.6;
      const t = video.currentTime;
      bar.style.scale = `${Math.min(1, t / d)} 1`;
      time.textContent = `${fmt(t)} / ${fmt(d)}`;
      let idx = 0;
      marks.forEach((m, i) => { if (t >= m - 0.05) idx = i; });
      chapters.forEach((b, i) => (i === idx ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
    };
    const setSound = (on: boolean) => {
      video.muted = !on;
      sound.setAttribute('aria-pressed', String(on));
      sound.textContent = on ? 'Sound on' : 'Sound off';
    };

    video.addEventListener('play', () => {
      section.classList.add('is-playing');
      toggle.setAttribute('aria-label', 'Pause the film');
      gsap.ticker.add(tick);
    });
    video.addEventListener('pause', () => {
      section.classList.remove('is-playing');
      toggle.setAttribute('aria-label', 'Play the film');
      gsap.ticker.remove(tick);
      tick();
    });
    video.addEventListener('seeked', tick);
    video.addEventListener('loadedmetadata', tick);

    toggle.addEventListener('click', () => {
      if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); }
    });
    sound.addEventListener('click', () => {
      setSound(video.muted);
      if (!video.muted && video.paused) { userPaused = false; play(); }
    });
    chapters.forEach((b, i) => b.addEventListener('click', () => {
      video.currentTime = marks[i];
      userPaused = false;
      play();
    }));

    // Jump links anywhere on the page ("Watch the film", "From the film, 0:24").
    document.querySelectorAll<HTMLElement>('[data-film-jump]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const t = parseFloat(el.dataset.filmJump || '0');
        if (el.closest('.hero')) setSound(true); // an explicit "watch" asks for the full film
        scrollToTarget('#film');
        video.currentTime = t;
        userPaused = false;
        play();
      });
    });

    ScrollTrigger.create({
      trigger: video,
      start: 'top 85%',
      end: 'bottom 10%',
      onToggle: (self) => {
        inView = self.isActive;
        // Phones wait for a tap: a 1080p film autoplaying costs data and scroll frames there.
        if (inView && !userPaused && !prefersReducedMotion() && !isMobile()) play();
        if (!inView && !video.paused) video.pause();
      },
    });
  });
}
