// Inquiry form. Forms marked [data-api] send to the site backend and store the lead;
// if the backend can't be reached they fall back to a drafted email. Older concept
// pages without [data-api] keep the email-draft behaviour only.
import './inquiry.css';
import { submitLead, warmLeadSession } from './lead-api';

const TO = 'info@digiinn360.com';
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const form = document.querySelector<HTMLFormElement>('#inquiry');
if (form) {
  const field = <T extends HTMLElement>(sel: string) => form.querySelector<T>(sel);
  const interest = field<HTMLSelectElement>('#interest')!;
  const brief = field<HTMLTextAreaElement>('#brief')!;
  const name = field<HTMLInputElement>('#inq-name');
  const email = field<HTMLInputElement>('#inq-email');
  const company = field<HTMLInputElement>('#inq-company');
  const honeypot = field<HTMLInputElement>('#inq-website');
  const status = field<HTMLElement>('[data-form-status]');
  const submit = field<HTMLButtonElement>('button[type="submit"]');
  const useApi = form.hasAttribute('data-api') && !!email;
  const controls: Record<string, HTMLInputElement | HTMLTextAreaElement | null> = { name, email, message: brief };

  const showError = (key: string, text: string) => {
    const el = form.querySelector<HTMLElement>(`[data-error-for="${key}"]`);
    const input = controls[key];
    if (el) { el.textContent = text; el.hidden = false; }
    input?.setAttribute('aria-invalid', 'true');
  };
  const clearErrors = () => {
    form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((el) => { el.hidden = true; });
    Object.values(controls).forEach((c) => c?.removeAttribute('aria-invalid'));
  };
  const setStatus = (text: string, kind: 'ok' | 'info' | 'busy') => {
    if (!status) return;
    status.textContent = text;
    status.dataset.kind = kind;
    status.hidden = !text;
  };
  const mailtoDraft = () => {
    const who = [name?.value.trim(), company?.value.trim()].filter(Boolean).join(', ');
    const body = `Hello Digiinn360,\n\nI would like to discuss: ${interest.value}\n\n${brief.value.trim()}\n\nName / company: ${who}\nContact details: ${email?.value.trim() ?? ''}`;
    location.href = `mailto:${TO}?subject=${encodeURIComponent(interest.value + ' inquiry')}&body=${encodeURIComponent(body)}`;
  };

  if (useApi) form.addEventListener('focusin', warmLeadSession, { once: true });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();
    const missing: [string, string][] = [];
    if (useApi && name && !name.value.trim()) missing.push(['name', 'Tell us your name.']);
    if (useApi && email && !EMAIL.test(email.value.trim())) missing.push(['email', 'Enter an email address we can reply to, like name@company.com.']);
    if (!brief.value.trim()) missing.push(['message', 'Add a line about what you need.']);
    if (missing.length) {
      missing.forEach(([k, t]) => showError(k, t));
      (controls[missing[0][0]] ?? brief).focus();
      return;
    }
    if (!useApi) { mailtoDraft(); return; }

    submit?.setAttribute('disabled', '');
    form.setAttribute('aria-busy', 'true');
    setStatus('Sending…', 'busy');
    const result = await submitLead({
      kind: 'inquiry',
      name: name?.value.trim(),
      email: email!.value.trim(),
      company: company?.value.trim(),
      interest: interest.value,
      message: brief.value.trim(),
      website: honeypot?.value ?? '',
    });
    submit?.removeAttribute('disabled');
    form.removeAttribute('aria-busy');

    if (result.ok) {
      const replyTo = email!.value.trim();
      form.reset();
      setStatus(`Thank you. Your inquiry reached our team and we will reply to ${replyTo}.`, 'ok');
      return;
    }
    if ('errors' in result) {
      setStatus('', 'info');
      const keys = Object.keys(result.errors);
      keys.forEach((k) => showError(k in controls ? k : 'message', result.errors[k][0]));
      (controls[keys[0]] ?? brief).focus();
      return;
    }
    setStatus(`${result.message ?? 'We could not send this from the page.'} Your email app will open with the inquiry drafted. If nothing opens, write to ${TO}.`, 'info');
    mailtoDraft();
  });
}
