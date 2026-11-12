import './catalog-page';
import './about-page.css';

const portraitWall = document.querySelector<HTMLElement>('.about-portrait-wall');
if (portraitWall) {
  // The team roster remains the source for portraits and crops.
  document.querySelectorAll<HTMLImageElement>('#team .team-portrait').forEach(portrait => {
    const image = portrait.cloneNode() as HTMLImageElement;
    image.removeAttribute('class');
    image.loading = 'eager';
    portraitWall.append(image);
  });

  new IntersectionObserver(([entry]) => {
    portraitWall.toggleAttribute('data-paused', !entry.isIntersecting);
  }).observe(portraitWall);
}

function updateHeader() {
  document.body.classList.toggle('about-header-compact', scrollY > 72);
}
window.addEventListener('scroll', updateHeader, { passive: true });
window.addEventListener('pageshow', updateHeader);
updateHeader();
