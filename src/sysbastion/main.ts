import { boot } from './engine';
import { startJournal } from './motion/journal';
import { startFilm } from './motion/film';
import { startButtons, startClips } from './motion/media';
import { startWire } from './motion/wire';
import { startChrome } from './motion/chrome';

boot(() => {
  startChrome();
  startJournal();
  startFilm();
  startClips();
  startButtons();
  startWire();
});
