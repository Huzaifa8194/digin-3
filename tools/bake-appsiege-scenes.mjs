// Bake the eight AppSiege shots (src/appsiege/scenes.ts) into static textures, so the 3D cards can
// play them on the GPU with no per-frame uploads.
//   For each scene:  sN-a.webp  final frame
//                    sN-b.webp  first frame
//                    sN-t.png   time map: grey = the moment (0..1 of the loop) each pixel reaches
//                               its final colour, found by sampling the scene 96 times
// Usage: start the dev server (npx vite --port 5203), then  node tools/bake-appsiege-scenes.mjs [url]
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://127.0.0.1:5203/appsiege/?nogl=1';
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'appsiege', 'scenes');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url);
const result = await page.evaluate(async () => {
  const { SCENES, PERIODS, paint } = await import('/src/appsiege/scenes.ts');
  await document.fonts.load('400 20px "Geist Mono"');
  const W = 1200, H = 800, N = 96, TOL = 36;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const tc = document.createElement('canvas'); tc.width = W; tc.height = H;
  const tg = tc.getContext('2d');
  const files = [];
  for (let k = 0; k < SCENES.length; k++) {
    const P = PERIODS[k];
    paint(g, W, H, SCENES[k], P * 0.9999);
    const A = g.getImageData(0, 0, W, H).data.slice();
    const a = cv.toDataURL('image/webp', 0.93);
    paint(g, W, H, SCENES[k], 0);
    const b = cv.toDataURL('image/webp', 0.93);
    const last = new Int16Array(W * H).fill(-1);
    for (let i = 0; i < N; i++) {
      paint(g, W, H, SCENES[k], (P * i) / N);
      const d = g.getImageData(0, 0, W, H).data;
      for (let p = 0, q = 0; p < last.length; p++, q += 4) {
        if (Math.abs(d[q] - A[q]) + Math.abs(d[q + 1] - A[q + 1]) + Math.abs(d[q + 2] - A[q + 2]) > TOL) last[p] = i;
      }
    }
    const img = tg.createImageData(W, H);
    for (let p = 0, q = 0; p < last.length; p++, q += 4) {
      const v = Math.round(((last[p] + 1) / N) * 255);
      img.data[q] = img.data[q + 1] = img.data[q + 2] = v; img.data[q + 3] = 255;
    }
    tg.putImageData(img, 0, 0);
    files.push({ k: k + 1, a, b, t: tc.toDataURL('image/png') });
  }
  return files;
});
for (const f of result) {
  for (const [suffix, data] of [['a.webp', f.a], ['b.webp', f.b], ['t.png', f.t]]) {
    const buf = Buffer.from(data.split(',')[1], 'base64');
    writeFileSync(join(out, `s${f.k}-${suffix}`), buf);
    console.log(`s${f.k}-${suffix}`, (buf.length / 1024).toFixed(0) + ' KB');
  }
}
await browser.close();
