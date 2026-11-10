import { mountScrollFeedback } from './scroll-feedback';
import { nestedCanScroll } from './nested-scroll';
import { gsap } from 'gsap';
import { ScrollIntent, normalizeWheel, transitionDuration } from './scroll-policy';

type Stop = { y: number; section: HTMLElement };
type Options = { reduced: MediaQueryList; onUpdate: () => void };

/** One animation owner for wheel, touch, keys, links and browser navigation. */
export function createChapterScroll({ reduced, onUpdate }: Options) {
  const intent = new ScrollIntent();
  const feedback = mountScrollFeedback();
  let transitionProgress = 0;
  let stops: Stop[] = [];
  let active: gsap.core.Tween | null = null;
  let destination = 0;
  let direction = 0;
  let nativeTimer: ReturnType<typeof setTimeout> | undefined;
  let ownScrollUntil = 0;
  let destroyed = false;
  const abort = new AbortController();
  const signal = abort.signal;
  const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const clamp = (value: number) => Math.min(maxScroll(), Math.max(0, value));
  const nearest = (y = scrollY) => stops.reduce((best, stop, i) =>
    Math.abs(stop.y - y) < Math.abs(stops[best].y - y) ? i : best, 0);

  const contact = document.getElementById('connect');
  let boundary = Infinity;
  const enabled = () => !reduced.matches;
  const inGuidedStory = () => scrollY < boundary - 2;
  const setMode = () => {
    document.documentElement.classList.toggle('guided-scroll', enabled() && (active !== null || inGuidedStory()));
  };
  // Team, FAQs and the footer use native scrolling after the contact chapter.
  const controlsInput = () => enabled() && (active !== null || inGuidedStory());

  function updateFeedback() {
    setMode();
    const index = active ? destination : nearest();
    feedback.update(stops[index]?.section,index,stops.length,active ? transitionProgress : intent.progress,active !== null,enabled() && inGuidedStory());
  }


  function refresh() {
    cancel();
    stops = [];
    boundary = contact ? contact.offsetTop + contact.offsetHeight : Infinity;
    const sections = [...document.querySelectorAll<HTMLElement>('main > section')];
    for (const section of sections) {
      const start = section.offsetTop;
      const pinned = section.classList.contains('chapter') && !section.classList.contains('flow-chapter');
      if (pinned) {
        // Land after the assembly beat, inside the fully readable hold.
        stops.push({ y: clamp(start + (section.id === 'home' ? 0 : section.offsetHeight * .32)), section });
      } else {
        stops.push({ y: clamp(start), section });
        // Long cards/forms are read in overlapping viewport steps, never skipped.
        const last = Math.min(start + section.offsetHeight - innerHeight + 40, maxScroll());
        for (let y = start + innerHeight * .72; y < last; y += innerHeight * .72)
          stops.push({ y: clamp(y), section });
        if (last > start + 80) stops.push({ y: clamp(last), section });
      }
      if (section === contact) {
        stops.push({ y: clamp(boundary), section });
        break;
      }
    }
    stops.sort((a, b) => a.y - b.y);
    stops = stops.filter((stop, i) => i === 0 || stop.y - stops[i - 1].y > 24);
    destination = nearest();
    updateFeedback();
  }

  function cancel() {
    active?.kill(); active = null; intent.reset();
    clearTimeout(nativeTimer);
    document.documentElement.classList.remove('scroll-transitioning');
    updateFeedback();
  }

  function move(index: number, force = false) {
    if (!stops.length || destroyed) return;
    index = Math.min(stops.length - 1, Math.max(0, index));
    const target = stops[index];
    const distance = target.y - scrollY;
    active?.kill();
    destination = index; direction = Math.sign(distance);
    if (Math.abs(distance) < 2) { active = null; return; }
    const proxy = { y: scrollY };
    const duration = reduced.matches ? 0 : transitionDuration(distance, innerHeight);
    transitionProgress = 0;
    document.documentElement.classList.add('scroll-transitioning');
    active = gsap.to(proxy, {
      y: target.y, duration, ease: distance < 0 ? 'sine.out' : 'sine.inOut', overwrite: true,
      onUpdate() {
        ownScrollUntil = performance.now() + 100;
        window.scrollTo({ top: proxy.y, behavior: 'instant' });
        transitionProgress = 1 - Math.abs(target.y - proxy.y) / Math.abs(distance);
        updateFeedback();
        onUpdate();
      },
      onComplete() {
        active = null;
        // A quick upward transition can end while trackpad momentum is still
        // arriving. Keep that gesture consumed until the input falls quiet.
        if (distance > 0) intent.reset();
        document.documentElement.classList.remove('scroll-transitioning');
        updateFeedback();
      },
    });
    updateFeedback();
    if (force) intent.reset();
  }

  function request(step: number) {
    if (active) {
      if (step !== direction) {
        // Reverse toward the previous landing point without jumping position.
        move(destination - direction);
      }
      return;
    }
    const index = nearest();
    // After a manual stop, first complete the next stop in the requested direction.
    const next = step > 0 ? stops.findIndex(stop => stop.y > scrollY + 8) :
      stops.reduce((found, stop, i) => stop.y < scrollY - 8 ? i : found, -1);
    move(next >= 0 ? next : index);
  }

  window.addEventListener('wheel', event => {
    if (!controlsInput() || event.ctrlKey || event.metaKey || !event.cancelable ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) || nestedCanScroll(event.target, event.deltaY, true)) return;
    event.preventDefault();
    const now = performance.now();
    const action = intent.feed(normalizeWheel(event.deltaY, event.deltaMode, innerHeight), now);
    if (action) request(action.direction);
    updateFeedback();
  }, { passive: false, capture: true, signal });

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') { cancel(); return; }
    if (!controlsInput() || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
        (event.target instanceof Element && event.target.closest('input,textarea,select,button,a,summary,[contenteditable="true"]'))) return;
    const step = ['ArrowDown', 'PageDown', ' '].includes(event.key) ? (event.shiftKey ? -1 : 1) :
      ['ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0;
    if (step) {
      event.preventDefault();
      if (!event.repeat) request(step);
    }
    else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); move(event.key === 'Home' ? 0 : stops.length - 1, true);
    }
  }, { signal });
  let touch: { x: number; y: number; time: number; delta: number; captured: boolean } | null = null;
  window.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) { touch = null; cancel(); return; }
    const point = event.touches[0];
    touch = { x: point.clientX, y: point.clientY, time: performance.now(), delta: 0, captured: false };
  }, { passive: true, signal });
  window.addEventListener('touchmove', event => {
    if (!controlsInput() || !touch || event.touches.length !== 1) return;
    const point = event.touches[0], delta = touch.y - point.clientY;
    if (nestedCanScroll(event.target, delta, true) || Math.abs(point.clientX - touch.x) > Math.abs(delta)) return;
    if (Math.abs(delta) > 10 && event.cancelable) {
      event.preventDefault(); touch.delta = delta; touch.captured = true;
      feedback.update(stops[nearest()]?.section,nearest(),stops.length,Math.min(1,Math.abs(delta)/24),false,enabled());
    }
  }, { passive: false, capture: true, signal });
  window.addEventListener('touchend', () => {
    if (touch?.captured && Math.abs(touch.delta) >= 24) request(Math.sign(touch.delta));
    touch = null;
  }, { passive: true, signal });
  window.addEventListener('touchcancel', () => { touch = null; }, { signal });

  // Scrollbar drag, middle-click, external scroll, and changing focus stay native.
  window.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || event.button === 1) cancel();
  }, { passive: true, signal });
  window.addEventListener('focusin', () => { if (active) cancel(); }, { signal });
  window.addEventListener('scroll', () => {
    updateFeedback();
    if (active || performance.now() < ownScrollUntil || !enabled() || !inGuidedStory()) return;
    clearTimeout(nativeTimer);
    nativeTimer = setTimeout(() => { destination = nearest(); }, 180);
  }, { passive: true, signal });
  window.addEventListener('blur', cancel, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); }, { signal });
  window.addEventListener('popstate', () => { cancel(); }, { signal });
  window.addEventListener('hashchange', () => {
    cancel(); const target = document.getElementById(location.hash.slice(1));
    if (target) goTo(target);
  }, { signal });
  reduced.addEventListener('change', refresh, { signal });
  function goTo(section: HTMLElement) {
    cancel();
    const index = stops.findIndex(stop => stop.section === section);
    if (enabled() && index >= 0) move(index, true);
    else window.scrollTo({ top: section.offsetTop, behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  refresh();
  return { refresh, goTo, cancel, destroy() {
    cancel(); destroyed = true; abort.abort(); feedback.destroy();
    document.documentElement.classList.remove('guided-scroll');
  } };
}
