export function mountHeroProductFeature() {
  const feature = document.querySelector<HTMLElement>('.hero-product-feature')!;
  const picker = feature.querySelector<HTMLElement>('.hero-feature-picker')!;
  const poster = feature.querySelector<HTMLImageElement>('.hero-feature-poster')!;
  const name = feature.querySelector<HTMLElement>('#hero-feature-name')!;
  const summary = feature.querySelector<HTMLElement>('#hero-feature-summary')!;
  const link = feature.querySelector<HTMLAnchorElement>('.hero-feature-link')!;
  const buttons = picker.querySelectorAll<HTMLButtonElement>('button[data-product]');

  for (const button of buttons) {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') === 'true') return;
      const product = button.dataset.product!;
      const title = button.textContent!;
      poster.src = `/product-posters/${product}.svg`;
      name.textContent = title;
      summary.textContent = button.dataset.summary!;
      link.href = `/${product}/`;
      link.setAttribute('aria-label', `Explore ${title}`);
      for (const option of buttons) {
        option.setAttribute('aria-pressed', String(option === button));
      }
    });
  }
  picker.hidden = false;
}
