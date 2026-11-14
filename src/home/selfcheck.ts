// "We ran the first test on this page": four facts read live from the visitor's own browser when the
// strip scrolls in. Nothing is invented and nothing leaves the page; if a fact is unflattering it still shows.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onPage, prefersReducedMotion } from '../engine';

type Tone = 'ok' | 'info' | 'risk';
type Result = { text: string; note: string; tone: Tone };

function read(): Record<string, Result> {
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const transport: Result = location.protocol === 'https:'
    ? { text: 'Encrypted', note: 'HTTPS, end to end', tone: 'ok' }
    : local ? { text: 'Local preview', note: 'not a public connection', tone: 'info' }
      : { text: 'Not encrypted', note: 'plain HTTP', tone: 'risk' };

  let cookies = 0;
  try { cookies = document.cookie ? document.cookie.split(';').length : 0; } catch { /* blocked */ }

  const hosts = new Set<string>();
  for (const entry of performance.getEntriesByType('resource')) {
    try { const h = new URL(entry.name).hostname; if (h && h !== location.hostname) hosts.add(h); } catch { /* not a URL */ }
  }
  const list = [...hosts];
  const fontsOnly = list.length > 0 && list.every((h) => /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(h));

  let keys: string[] = [];
  try { keys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)]; } catch { /* blocked */ }
  const introOnly = keys.length > 0 && keys.every((k) => k === 'dg-seen');

  return {
    transport,
    cookies: { text: cookies ? String(cookies) : 'None', note: cookies ? 'set by this page' : 'nothing follows you', tone: cookies ? 'info' : 'ok' },
    third: { text: list.length ? String(list.length) : 'None', note: !list.length ? 'everything came from this site' : fontsOnly ? 'web fonts only' : list.slice(0, 2).join(', '), tone: !list.length || fontsOnly ? 'ok' : 'info' },
    storage: { text: keys.length ? String(keys.length) : 'None', note: !keys.length ? 'nothing saved' : introOnly ? 'remembers you saw the intro' : 'site preferences', tone: 'ok' },
  };
}

export function startSelfCheck() {
  onPage(() => {
    const host = document.querySelector<HTMLElement>('[data-selfcheck]');
    if (!host) return;
    const reduced = prefersReducedMotion();
    const show = () => {
      const results = read();
      host.querySelectorAll<HTMLElement>('[data-check]').forEach((row, i) => {
        const r = results[row.dataset.check || ''];
        const dd = row.querySelector('dd');
        if (!r || !dd) return;
        setTimeout(() => {
          dd.innerHTML = '<strong></strong><span></span>';
          dd.firstElementChild!.textContent = r.text;
          dd.lastElementChild!.textContent = r.note;
          row.classList.add('is-done', `is-${r.tone}`);
        }, reduced ? 0 : 350 + i * 220);
      });
    };
    ScrollTrigger.create({ trigger: host, start: 'top 88%', once: true, onEnter: show });
  });
}
