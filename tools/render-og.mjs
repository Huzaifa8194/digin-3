// Renders 1200x630 share images (og.jpg) for the product pages from the live pages themselves.
//   npm run build && npx vite preview --port 5211   then   node tools/render-og.mjs [baseUrl] [outDir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const base = process.argv[2] || 'http://127.0.0.1:5211';
const outDir = process.argv[3] || 'public';
const shots = [
  { path: '/shadowad/', wait: 12000 },
  { path: '/sysbastion/?noloader=1', out: '/sysbastion/', wait: 3000 },
  { path: '/aegis-shield/', wait: 4000 },
  { path: '/darkintel360/', wait: 4000 },
  { path: '/aeronexus/', wait: 4000 },
];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] });
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(base + s.path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(s.wait);
  const dir = join(outDir, (s.out || s.path).replace(/\?.*$/, ''));
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, 'og.jpg'), type: 'jpeg', quality: 86 });
  console.log('wrote', join(dir, 'og.jpg'));
  await page.close();
}
await browser.close();
