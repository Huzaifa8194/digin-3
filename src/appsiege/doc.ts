// The readable /appsiege/ document as HTML strings. Used twice:
//  - vite.config.ts bakes it into appsiege/index.html, so crawlers and no-JS readers get
//    the full copy in the served HTML;
//  - main.ts writes the same strings at runtime (a no-op when they are already there).
import { cards, contact, headline, lab, MEDIA } from './content';

const sentence = (s: string) => s.replace(/\n/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())
  .replace(/\bios\b/g, 'iOS').replace(/\bapk\b/g, 'APK').replace(/\bipa\b/g, 'IPA').replace(/\bai\b/g, 'AI');

export const docHeadline = () => headline.lines.map((l) => l[0] + l.slice(1).toLowerCase()).join(' ');

export const docColumnHTML = () => headline.column.map((p) => `<p>${sentence(p)}</p>`).join('');

export const docCardsHTML = () => cards.map((c, k) => `<li class="doc__card" id="card-${c.id}">
  <a class="doc__link" href="#card-${c.id}" data-cardlink="${k}"><span class="doc__tag">${c.tag}</span> ${c.title.join(' ')}</a>
  <p>${c.body}</p>
  <ul class="doc__pts">${c.points.map((p) => `<li>${p}</li>`).join('')}</ul>
  <img class="doc__img" src="${MEDIA + c.poster}" alt="${c.shot.replace(/"/g, '&quot;')}" width="768" height="${c.clip ? 432 : 334}" loading="lazy" decoding="async">
</li>`).join('');

export const docLab = () => lab.title.join(' ').replace(/\/\/|->/g, '').trim();

export const docLabCopy = () => sentence(lab.copy) + '.';

export const ctLinksHTML = () => contact.links.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join('');
