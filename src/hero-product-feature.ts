export function mountHeroProductFeature() {
  const hero = document.querySelector<HTMLElement>('#home')!;
  const header = document.querySelector<HTMLElement>('body > header')!;
  const feature = hero.querySelector<HTMLElement>('.hero-product-feature')!;
  const cards = feature.querySelectorAll<HTMLButtonElement>('.hero-product-card');
  const name = feature.querySelector<HTMLElement>('#hero-feature-name')!;
  const summary = feature.querySelector<HTMLElement>('#hero-feature-summary')!;
  const link = feature.querySelector<HTMLAnchorElement>('.hero-feature-link')!;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = feature.querySelector<HTMLButtonElement>('[aria-pressed="true"]')!;
  let inView = false;

  function updateHeader() {
    document.body.classList.toggle('hero-header-scrolled', hero.getBoundingClientRect().bottom <= header.offsetHeight);
  }

  function selectProduct(card: HTMLButtonElement) {
    if (selected === card) return;

    selected.setAttribute('aria-pressed', 'false');
    selected = card;
    card.setAttribute('aria-pressed', 'true');
    const product = card.dataset.product!;
    const title = card.getAttribute('aria-label')!;
    hero.dataset.product = product;
    name.textContent = title;
    summary.textContent = card.dataset.summary!;
    link.href = `/${product}/`;
    link.setAttribute('aria-label', `Explore ${title}`);
  }

  function updateMotion() {
    hero.toggleAttribute('data-moving', inView && !reducedMotion.matches && !document.hidden);
  }

  window.addEventListener('scroll', updateHeader, { passive: true });
  new ResizeObserver(updateHeader).observe(hero);
  updateHeader();

  cards.forEach(card => {
    card.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') selectProduct(card);
    });
    card.addEventListener('focus', () => selectProduct(card));
    card.addEventListener('click', () => selectProduct(card));
  });

  document.addEventListener('visibilitychange', updateMotion);
  reducedMotion.addEventListener('change', updateMotion);
  const visibility = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    updateMotion();
  });
  visibility.observe(feature);
}
