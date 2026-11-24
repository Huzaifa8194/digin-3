// The eight shots, baked by tools/bake-appsiege-scenes.mjs into three static textures each:
// final frame, first frame and a time map. The cards play them on the GPU (see work.ts), so
// nothing is uploaded per frame. Loaded once, uploaded once.
import * as THREE from 'three';
import { PERIODS } from '../scenes';

export interface Baked { a: THREE.Texture; b: THREE.Texture; t: THREE.Texture; period: number }

const DIR = '/appsiege/scenes/';
const loader = new THREE.TextureLoader();
const pending: Promise<unknown>[] = [];
function tex(url: string, data = false) {
  let done!: () => void;
  pending.push(new Promise<void>((r) => (done = r)));
  const t = loader.load(url, () => done(), undefined, () => done());
  t.generateMipmaps = !data;
  t.minFilter = data ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
  t.magFilter = data ? THREE.NearestFilter : THREE.LinearFilter;
  t.anisotropy = data ? 1 : 8;
  t.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  return t;
}

export const BAKED: Baked[] = PERIODS.map((period, i) => ({
  a: tex(`${DIR}s${i + 1}-a.webp`), b: tex(`${DIR}s${i + 1}-b.webp`), t: tex(`${DIR}s${i + 1}-t.png`, true), period,
}));

/** Resolves once every baked texture has loaded (or failed), capped at `ms`. */
export const bakedReady = (ms: number) => Promise.race([Promise.all(pending), new Promise((r) => setTimeout(r, ms))]);
