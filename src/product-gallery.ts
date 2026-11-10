import './catalog-page';
import './product-gallery.css';

const previewWidth = 1280;
const previews = document.querySelectorAll<HTMLElement>('.preview-window');

const fitPreview = (preview: HTMLElement, width: number) => {
  preview.style.setProperty('--preview-scale', String(width / previewWidth));
};

const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    fitPreview(entry.target as HTMLElement, entry.contentRect.width);
  }
});

for (const preview of previews) {
  fitPreview(preview, preview.clientWidth);
  resizeObserver.observe(preview);
}
