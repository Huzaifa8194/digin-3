export function mountHeroProductFeature() {
  const hero = document.querySelector<HTMLElement>('#home')!;
  const header = document.querySelector<HTMLElement>('body > header')!;

  function updateHeader() {
    document.body.classList.toggle('hero-header-scrolled', hero.getBoundingClientRect().bottom <= header.offsetHeight);
  }

  window.addEventListener('scroll', updateHeader, { passive: true });
  new ResizeObserver(updateHeader).observe(hero);
  updateHeader();

  const feature = hero.querySelector<HTMLElement>('.hero-product-feature')!;
  const picker = feature.querySelector<HTMLElement>('.hero-feature-picker')!;
  const cards = [...feature.querySelectorAll<HTMLElement>('.hero-product-card')];
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
    const midpoint = Math.floor(cards.length / 2);
    cards.forEach((card, cardIndex) => {
      const slot = (cardIndex - selected + cards.length + midpoint) % cards.length - midpoint;
      card.dataset.slot = String(slot);
    });
    hero.dataset.product = product;
    name.textContent = title;
    summary.textContent = button.dataset.summary!;
    link.href = `/${product}/`;
    link.setAttribute('aria-label', `Explore ${title}`);
  }

  function scheduleRotation() {
    window.clearTimeout(timer);
    const focused = document.activeElement;
    const reading = feature.contains(focused) && focused !== rotation;
    const hovered = canHover.matches && (picker.matches(':hover') || link.matches(':hover'));
    const motionActive = playing && !reducedMotion.matches && inView && !document.hidden;
    const rotating = motionActive && !reading && !hovered;
    status.setAttribute('aria-live', rotating ? 'off' : 'polite');
    hero.toggleAttribute('data-moving', motionActive);
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
    rotation.setAttribute('aria-label', `${action} product animation`);
    scheduleRotation();
  }

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
      if (index !== selected) showProduct(index);
      scheduleRotation();
    });
  });
  rotation.addEventListener('click', () => setPlaying(!playing));
  [picker, link].forEach(control => {
    control.addEventListener('pointerenter', scheduleRotation);
    control.addEventListener('pointerleave', scheduleRotation);
  });
  feature.addEventListener('focusin', scheduleRotation);
  feature.addEventListener('focusout', () => queueMicrotask(scheduleRotation));
  document.addEventListener('visibilitychange', scheduleRotation);
  reducedMotion.addEventListener('change', event => {
    if (event.matches) setPlaying(false);
  });
  const visibility = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    scheduleRotation();
  }, { threshold: .25 });
  visibility.observe(feature);
  picker.hidden = false;
  setPlaying(playing);
}
