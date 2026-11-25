import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { seo } from './tools/seo';
import { ctLinksHTML, docCardsHTML, docColumnHTML, docHeadline, docLab, docLabCopy } from './src/appsiege/doc';

// Public address of the live site. Canonical links, Open Graph tags, the sitemap and
// robots.txt were written for the Vercel preview; the build points them here instead.
const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://www.digiinn360.com').replace(/\/$/, '');
const PREVIEW_ORIGIN = 'https://digin-3.vercel.app';

function productionOrigin(): Plugin {
  let outDir = 'dist';
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(html|xml|txt|json|webmanifest)$/.test(name)) {
        const text = readFileSync(path, 'utf8');
        if (text.includes(PREVIEW_ORIGIN)) writeFileSync(path, text.split(PREVIEW_ORIGIN).join(SITE_ORIGIN));
      }
    }
  };
  return {
    name: 'production-origin',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir; },
    closeBundle() { walk(outDir); },
  };
}

// /appsiege/ builds its readable document from src/appsiege/content.ts. Bake it into the served
// HTML so crawlers and readers without JavaScript get the whole page, not empty containers.
function prerenderAppSiege(): Plugin {
  const fill = (html: string, attr: string, content: string) =>
    html.replace(new RegExp(`(<([a-z0-9]+)[^>]*\\b${attr}\\b[^>]*>)\\s*(</\\2>)`), (_m, open, _tag, close) => open + content + close);
  return {
    name: 'appsiege-prerender',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!/(^|\/)appsiege\/index\.html$/.test(ctx.path)) return html;
        let out = html;
        out = fill(out, 'data-docheadline', docHeadline());
        out = fill(out, 'data-doccolumn', docColumnHTML());
        out = fill(out, 'data-doccards', docCardsHTML());
        out = fill(out, 'data-doclab', docLab());
        out = fill(out, 'data-doclabcopy', docLabCopy());
        out = fill(out, 'data-ctlinks', ctLinksHTML());
        return out;
      },
    },
  };
}

export default defineConfig({
  plugins: [seo(), prerenderAppSiege(), productionOrigin()],
  server: {
    // `npm run dev` + `python manage.py runserver` in backend/: forms reach the real API.
    proxy: { '/api': 'http://127.0.0.1:8765' },
  },
  build: {
    rollupOptions: {
      input: ['index.html', 'services/index.html', 'products/index.html', 'about/index.html', 'contact/index.html', 'partners/index.html', 'sysbastion/index.html', 'design1/index.html', 'design2/index.html', 'design3/index.html', 'design3/specs/index.html', 'design4/index.html', 'design5/index.html', 'darkintel360/index.html', 'aegis-shield/index.html', 'shadowad/index.html', 'appsiege/index.html', 'aeronexus/index.html'],
    },
  },
});
