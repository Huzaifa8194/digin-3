// Contact: the inquiry form (src/inquiry.ts, real backend with email fallback), the secure channel
// strip that draws the real anti-bot work, copy buttons and flood rows.
import '../site-dark';
import '../dk-rows.css';
import '../dk-form.css';
import './contact.css';
import '../inquiry';
import { bootDark } from '../site-dark';
import { mountChannel } from '../channel';
import { startCopyButtons, startFloods } from '../flood';

bootDark(() => {
  const form = document.querySelector<HTMLFormElement>('#inquiry');
  const channel = document.querySelector<HTMLElement>('[data-channel]');
  if (form && channel) mountChannel(channel, form);
  startCopyButtons();
  startFloods();
});
