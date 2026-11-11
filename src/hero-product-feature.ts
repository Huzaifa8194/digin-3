export function mountHeroProductFeature() {
  function updateHeader() {
    document.body.classList.toggle('hero-header-scrolled', window.scrollY > 32);
  }

  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  const feature = document.querySelector<HTMLElement>('.hero-product-feature')!;
  const picker = feature.querySelector<HTMLElement>('.hero-feature-picker')!;
  const poster = feature.querySelector<HTMLImageElement>('.hero-feature-poster')!;
  const name = feature.querySelector<HTMLElement>('#hero-feature-name')!;
  const summary = feature.querySelector<HTMLElement>('#hero-feature-summary')!;
  const link = feature.querySelector<HTMLAnchorElement>('.hero-feature-link')!;
  const buttons = [...picker.querySelectorAll<HTMLButtonElement>('button[data-product]')];
  const rotation = picker.querySelector<HTMLButtonElement>('.hero-feature-rotation')!;
  const status = feature.querySelector<HTMLElement>('.hero-feature-status')!;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const canHover = matchMedia('(hover: hover)');
  let selected = 0;
  let playing = !reducedMotion.matches;
  let inView = false;
  let timer: number | undefined;

  function showProduct(index: number) {
    const button = buttons[index];
    const product = button.dataset.product!;
    const title = button.dataset.title ?? button.textContent!;
    buttons[selected].setAttribute('aria-pressed', 'false');
    selected = index;
    button.setAttribute('aria-pressed', 'true');
    feature.dataset.currentProduct = product;
    poster.src = `/product-posters/${product}.svg`;
    name.textContent = title;
    summary.textContent = button.dataset.summary!;
    link.href = `/${product}/`;
    link.setAttribute('aria-label', `Explore ${title}`);
  }

  function scheduleRotation() {
    window.clearTimeout(timer);
    const focused = document.activeElement;
    const reading = feature.contains(focused) && focused !== rotation;
    const hovered = canHover.matches && feature.matches(':hover');
    const rotating = playing && inView && !document.hidden && !reading && !hovered;
    status.setAttribute('aria-live', rotating ? 'off' : 'polite');
    if (rotating) {
      timer = window.setTimeout(() => {
        showProduct((selected + 1) % buttons.length);
        scheduleRotation();
      }, 6500);
    }
  }

  function setPlaying(value: boolean) {
    playing = value;
    const action = playing ? 'Pause' : 'Play';
    rotation.textContent = action;
    rotation.setAttribute('aria-label', `${action} product rotation`);
    scheduleRotation();
  }

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
      if (index !== selected) showProduct(index);
      scheduleRotation();
    });
  });
  rotation.addEventListener('click', () => setPlaying(!playing));
  feature.addEventListener('pointerenter', scheduleRotation);
  feature.addEventListener('pointerleave', scheduleRotation);
  feature.addEventListener('focusin', scheduleRotation);
  feature.addEventListener('focusout', () => queueMicrotask(scheduleRotation));
  document.addEventListener('visibilitychange', scheduleRotation);
  reducedMotion.addEventListener('change', event => {
    if (event.matches) setPlaying(false);
  });
  const visibility = new IntersectionObserver(([entry]) => {
    inView = entry.intersectionRatio >= .5;
    scheduleRotation();
  }, { threshold: .5 });
  visibility.observe(feature);
  picker.hidden = false;
  setPlaying(playing);
}
