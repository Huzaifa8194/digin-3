// Partners: onboarding as one full turn (the ring draws 000° → 360° as the four stages scroll by),
// "ways to partner" rows that preselect the type in the form, and the application form with the
// shared secure channel strip.
import '../site-dark';
import '../dk-rows.css';
import '../dk-form.css';
import './partners.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { bootDark } from '../site-dark';
import { onPage, prefersReducedMotion } from '../engine';
import { mountChannel } from '../channel';
import { startFloods } from '../flood';
import { submitLead } from '../lead-api';

const STAGES = [
  { deg: 90, name: 'Apply' },
  { deg: 180, name: 'Review' },
  { deg: 270, name: 'Enable' },
  { deg: 360, name: 'Launch' },
];
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function startRing() {
  onPage(() => {
    const turn = document.querySelector<HTMLElement>('[data-turn]');
    const arc = document.querySelector<SVGCircleElement>('[data-ring-arc]');
    const dot = document.querySelector<SVGCircleElement>('[data-ring-dot]');
    const degEl = document.querySelector<HTMLElement>('[data-ring-deg]');
    const nameEl = document.querySelector<HTMLElement>('[data-ring-name]');
    const stages = [...document.querySelectorAll<HTMLElement>('[data-stage]')];
    const ticks = [...document.querySelectorAll<SVGLineElement>('[data-tick]')];
    if (!turn || !arc || !dot || !degEl || !nameEl) return;

    let shown = -1;
    const render = (deg: number) => {
      arc.style.strokeDashoffset = String(360 - deg);
      const a = ((deg - 90) * Math.PI) / 180;
      dot.setAttribute('cx', String(100 + 86 * Math.cos(a)));
      dot.setAttribute('cy', String(100 + 86 * Math.sin(a)));
      degEl.textContent = `${String(Math.round(deg)).padStart(3, '0')}°`;
      const reached = STAGES.filter((s) => deg >= s.deg - 0.5).length - 1;
      if (reached !== shown) {
        shown = reached;
        nameEl.textContent = reached >= 0 ? STAGES[reached].name : 'Start';
        stages.forEach((el, i) => el.classList.toggle('is-done', i <= reached));
        ticks.forEach((t) => t.classList.toggle('is-done', Number(t.dataset.tick) <= reached));
      }
    };

    if (prefersReducedMotion()) { render(360); return; }

    // The scroll owns the angle; at rest the sweep dot keeps drifting a few degrees ahead (idle state).
    const state = { deg: 0, idle: 0 };
    let base = 0;
    const draw = () => render(Math.min(360, base + state.idle));
    ScrollTrigger.create({
      trigger: turn, start: 'top 65%', end: 'bottom 70%', scrub: 0.6, invalidateOnRefresh: true,
      onUpdate: (st) => { base = st.progress * 360; draw(); },
    });
    const idle = gsap.to(state, { idle: 6, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1, onUpdate: draw, paused: true });
    ScrollTrigger.create({ trigger: turn, start: 'top bottom', end: 'bottom top', onToggle: (st) => (st.isActive ? idle.play() : idle.pause()) });
    draw();
  });
}

function startForm() {
  const form = document.querySelector<HTMLFormElement>('#partner-form');
  const channel = document.querySelector<HTMLElement>('[data-channel]');
  if (!form) return;
  if (channel) mountChannel(channel, form);
  const status = form.querySelector<HTMLElement>('[data-form-status]')!;
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const val = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? '';
  const type = () => form.querySelector<HTMLInputElement>('input[name="partner_type"]:checked')?.value ?? '';
  const products = () => [...form.querySelectorAll<HTMLInputElement>('input[name="product"]:checked')].map((i) => i.value).join(', ');

  const control = (key: string) =>
    key === 'partner_type' ? form.querySelector<HTMLInputElement>('input[name="partner_type"]') : (form.elements.namedItem(key) as HTMLInputElement | null);
  const showError = (key: string, text: string) => {
    const el = form.querySelector<HTMLElement>(`[data-error-for="${key}"]`) ?? form.querySelector<HTMLElement>('[data-error-for="message"]');
    if (el) { el.textContent = text; el.hidden = false; }
    control(key)?.setAttribute('aria-invalid', 'true');
  };
  const clearErrors = () => {
    form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((el) => { el.hidden = true; });
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  };
  const setStatus = (text: string, kind: 'ok' | 'info' | 'busy') => { status.textContent = text; status.dataset.kind = kind; status.hidden = !text; };

  // Rows in "Four ways to partner" preselect the type.
  document.querySelectorAll<HTMLAnchorElement>('[data-pick]').forEach((row) => row.addEventListener('click', () => {
    const radio = form.querySelector<HTMLInputElement>(`input[name="partner_type"][value="${row.dataset.pick}"]`);
    if (radio) radio.checked = true;
  }));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();
    const missing: [string, string][] = [];
    if (!type()) missing.push(['partner_type', 'Choose how you would like to partner.']);
    if (!val('company')) missing.push(['company', 'Tell us your company name.']);
    if (!val('name')) missing.push(['name', 'Tell us your name.']);
    if (!EMAIL.test(val('email'))) missing.push(['email', 'Enter an email address we can reply to, like name@company.com.']);
    if (missing.length) { missing.forEach(([k, t]) => showError(k, t)); control(missing[0][0])?.focus(); return; }

    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    setStatus('Sending…', 'busy');
    const result = await submitLead({
      kind: 'partner', partner_type: type(), company: val('company'), company_website: val('company_website') || undefined,
      name: val('name'), email: val('email'), phone: val('phone') || undefined, country: val('country') || undefined,
      product: products() || undefined, message: val('message') || undefined, website: val('website'),
    });
    submit.disabled = false;
    form.removeAttribute('aria-busy');
    if (result.ok) {
      const replyTo = val('email');
      form.reset();
      setStatus(`Thank you. Your application reached our partner team, and we will reply to ${replyTo}.`, 'ok');
      return;
    }
    if ('errors' in result) {
      setStatus('', 'info');
      const keys = Object.keys(result.errors);
      keys.forEach((k) => showError(k, result.errors[k][0]));
      control(keys[0])?.focus();
      return;
    }
    const body = [
      'Hello Digiinn360,', '', 'We would like to become a partner.', '',
      `Partner type: ${form.querySelector<HTMLInputElement>('input[name="partner_type"]:checked')?.nextElementSibling?.textContent ?? ''}`,
      `Company: ${val('company')}`, `Website: ${val('company_website')}`, `Country: ${val('country')}`,
      `Products: ${products()}`, '', val('message'), '', `Name: ${val('name')}`, `Email: ${val('email')}`, `Phone: ${val('phone')}`,
    ].join('\n');
    setStatus(`${result.message ?? 'We could not send this from the page.'} Your email app will open with the application drafted. If nothing opens, write to procurement@digiinn360.com.`, 'info');
    location.href = `mailto:procurement@digiinn360.com?subject=${encodeURIComponent('Partner application: ' + val('company'))}&body=${encodeURIComponent(body)}`;
  });
}

bootDark(() => {
  startRing();
  startFloods();
  startForm();
});
