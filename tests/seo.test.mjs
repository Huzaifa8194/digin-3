// SEO checks against the production build. Run `npm run build` first, then `npm run test:seo`.
// Mirrors the on-page checks of the claude-seo skill (AgriciDaniel/claude-seo, MIT).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const ORIGIN = (process.env.SITE_ORIGIN || 'https://www.digiinn360.com').replace(/\/$/, '');
const PAGES = ['/', '/services/', '/products/', '/about/', '/partners/', '/contact/', '/shadowad/', '/sysbastion/', '/aegis-shield/', '/appsiege/', '/darkintel360/', '/aeronexus/'];
const NOINDEX = ['/design1/', '/design2/', '/design3/', '/design3/specs/', '/design4/', '/design5/', '/404.html'];

const read = (route) => readFileSync(join(DIST, route.endsWith('/') ? route + 'index.html' : route), 'utf8');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const meta = (html, attr, name) => decode((html.match(new RegExp(`<meta\\s+${attr}="${name}"\\s+content="([^"]*)"`, 'i')) || [])[1] || '');
const fileFor = (url) => { const p = url.replace(ORIGIN, ''); return join(DIST, p.endsWith('/') ? p + 'index.html' : p); };
const strip = (s) => s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

test('dist exists', () => assert.ok(existsSync(join(DIST, 'index.html')), 'run npm run build first'));

const titles = new Set();
const descriptions = new Set();
for (const route of PAGES) {
  test(`on-page SEO ${route}`, () => {
    const html = read(route);
    const title = decode((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '');
    const desc = meta(html, 'name', 'description');
    assert.ok(title.length >= 30 && title.length <= 60, `title length ${title.length}: ${title}`);
    assert.ok(desc.length >= 120 && desc.length <= 160, `description length ${desc.length}: ${desc}`);
    assert.ok(!titles.has(title), 'duplicate title'); titles.add(title);
    assert.ok(!descriptions.has(desc), 'duplicate description'); descriptions.add(desc);
    assert.ok(!desc.toLowerCase().startsWith(title.split(/[:|]/)[0].trim().toLowerCase() + ' ' + title.split(/[:|]/)[1]?.trim().toLowerCase()), 'description restates title');

    const canonicals = [...html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/gi)].map((m) => m[1]);
    assert.deepEqual(canonicals, [ORIGIN + route], 'one self-referencing canonical');
    assert.equal(meta(html, 'property', 'og:url'), ORIGIN + route);
    assert.match(meta(html, 'name', 'robots'), /^index, follow/);
    assert.match(html, /<html lang="en"/);

    const body = html.split(/<body[^>]*>/i)[1] || '';
    assert.equal((body.match(/<h1[\s>]/gi) || []).length, 1, 'exactly one h1');
    assert.ok(strip(body).split(' ').length >= 250, 'enough server-rendered text');
    for (const img of body.match(/<img\b[^>]*>/gi) || []) assert.match(img, /\balt=/, `img without alt: ${img.slice(0, 120)}`);

    for (const tag of ['og:title', 'og:description', 'og:image', 'og:image:alt', 'og:image:width', 'og:image:height']) assert.ok(meta(html, 'property', tag), `missing ${tag}`);
    for (const tag of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) assert.ok(meta(html, 'name', tag), `missing ${tag}`);
    const ogImage = meta(html, 'property', 'og:image');
    assert.ok(ogImage.startsWith(ORIGIN + '/'), 'absolute og:image');
    assert.ok(existsSync(fileFor(ogImage)), `og:image file missing: ${ogImage}`);
    assert.ok(!/digin-3\.vercel\.app/.test(html), 'preview origin leaked');
  });

  test(`structured data ${route}`, () => {
    const html = read(route);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    assert.equal(blocks.length, 1, 'one JSON-LD block');
    const doc = JSON.parse(blocks[0][1]);
    assert.equal(doc['@context'], 'https://schema.org');
    const nodes = doc['@graph'];
    const ids = new Set(nodes.map((n) => n['@id']).filter(Boolean));
    const types = nodes.map((n) => n['@type']);
    for (const t of ['Organization', 'WebSite']) assert.ok(types.includes(t), `missing ${t}`);
    assert.ok(nodes.some((n) => n['@id'] === `${ORIGIN}${route}#webpage`), 'WebPage node');
    if (route !== '/') {
      const crumbs = nodes.find((n) => n['@type'] === 'BreadcrumbList');
      assert.ok(crumbs, 'BreadcrumbList');
      assert.equal(crumbs.itemListElement.at(-1).item, ORIGIN + route);
    }
    for (const bad of ['HowTo', 'SpecialAnnouncement', 'CourseInfo', 'ClaimReview', 'VehicleListing']) assert.ok(!types.includes(bad), `deprecated ${bad}`);
    // every same-page reference resolves; cross-page references point at pages that exist
    const walk = (v) => {
      if (Array.isArray(v)) return v.forEach(walk);
      if (v && typeof v === 'object') {
        const keys = Object.keys(v);
        if (keys.length === 1 && keys[0] === '@id') {
          const id = v['@id'];
          assert.ok(id.startsWith(ORIGIN + '/'), `absolute @id ${id}`);
          if (!ids.has(id)) assert.ok(existsSync(fileFor(id.split('#')[0])), `dangling @id ${id}`);
        }
        Object.values(v).forEach(walk);
      } else if (typeof v === 'string' && /^\//.test(v)) assert.fail(`relative URL in JSON-LD: ${v}`);
    };
    walk(nodes);
    const video = nodes.find((n) => n['@type'] === 'VideoObject');
    if (video) for (const k of ['name', 'description', 'thumbnailUrl', 'uploadDate', 'contentUrl']) assert.ok(video[k], `VideoObject.${k}`);
  });
}

for (const route of NOINDEX) {
  test(`noindex ${route}`, () => {
    if (!existsSync(join(DIST, route.endsWith('/') ? route + 'index.html' : route))) return;
    assert.match(read(route), /<meta name="robots" content="noindex/);
  });
}

test('sitemap, robots, llms.txt', () => {
  const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs.sort(), PAGES.map((p) => ORIGIN + p).sort());
  for (const m of sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) assert.ok(!Number.isNaN(Date.parse(m[1])), `lastmod ${m[1]}`);
  for (const m of sitemap.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)) assert.ok(existsSync(fileFor(m[1])), `sitemap image missing ${m[1]}`);
  const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
  assert.match(robots, new RegExp(`Sitemap: ${ORIGIN}/sitemap.xml`));
  assert.doesNotMatch(robots, /Disallow: \/\s*$/m);
  assert.ok(readFileSync(join(DIST, 'llms.txt'), 'utf8').startsWith('# Digiinn360'));
  const manifest = JSON.parse(readFileSync(join(DIST, 'site.webmanifest'), 'utf8'));
  for (const icon of manifest.icons) assert.ok(existsSync(join(DIST, icon.src)), `manifest icon ${icon.src}`);
});
