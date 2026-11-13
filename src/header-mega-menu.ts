const groups = [
  {
    title: 'Security services',
    path: '/services/',
    overview: 'Explore all services',
    columns: [
      { title: 'Assess and govern', links: [
        ['Offensive Security Services', 'Test defenses and prioritize the gaps you find.', '#offensive-security'],
        ['Governance, Risk & Compliance', 'Manage security risk and prepare for audits.', '#grc'],
      ] },
      { title: 'Operate and protect', links: [
        ['Security Operations & Managed Security', 'Monitor threats and respond to incidents.', '#managed-security'],
        ['Network & Infrastructure Security', 'Secure networks, cloud environments, and infrastructure.', '#infrastructure-security'],
        ['Data & Application Security', 'Protect sensitive data and the applications that handle it.', '#data-application-security'],
      ] },
    ],
    feature: ['Need help scoping a security project?', 'Talk through your goals and which services fit.', '/contact/'],
  },
  {
    title: 'Security products',
    path: '/products/',
    overview: 'Explore the product gallery',
    columns: [
      { title: 'Identity and infrastructure', links: [
        ['ShadowAD', 'Assess Active Directory and Microsoft Entra ID security.', '#shadowad'],
        ['SysBastion', 'Explore Windows and Linux hardening controls.', '#sysbastion'],
        ['Mobile App Penetration Testing', 'Review the mobile testing offering for Android and iOS.', '#mobile-pentest'],
      ] },
      { title: 'Detection and intelligence', links: [
        ['AEGIS-SHIELD', 'Investigate and contain suspicious Windows activity.', '#aegis-shield'],
        ['DarkIntel360', 'Track exposed credentials, data leaks, and emerging threats.', '#darkintel360'],
      ] },
    ],
    feature: ['Choosing a security tool?', 'Compare the five offerings and watch their trailers.', '/products/'],
  },
];

const header = document.querySelector('body > header');
const nav = header?.querySelector('.tube-nav');
if (header && nav) {
  const controls: HTMLButtonElement[] = [];
  let active: HTMLButtonElement | undefined;

  function close(restoreFocus = false) {
    if (!active) return;
    const button = active;
    active = undefined;
    button.setAttribute('aria-expanded', 'false');
    document.getElementById(button.getAttribute('aria-controls')!)!.hidden = true;
    if (restoreFocus) button.focus();
  }

  for (const [index, group] of groups.entries()) {
    const link = nav.querySelector<HTMLAnchorElement>(`a[href="${group.path}"]`);
    if (!link) continue;
    const id = `header-panel-${index}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mega-trigger';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', id);
    button.textContent = link.textContent;
    if (link.hasAttribute('aria-current')) button.dataset.current = '';
    const panel = document.createElement('div');
    panel.id = id;
    panel.hidden = true;
    panel.className = 'mega-panel';
    panel.innerHTML = `
      <div class="mega-inner">
        <div class="mega-heading"><strong>${group.title}</strong><a href="${group.path}">${group.overview} ↗</a></div>
        ${group.columns.map(column => `
          <section class="mega-column">
            <h2>${column.title}</h2>
            <ul>${column.links.map(([name, summary, hash]) => `
              <li><a href="${group.path}${hash}"><strong>${name}</strong><span>${summary}</span></a></li>
            `).join('')}</ul>
          </section>
        `).join('')}
        <a class="mega-feature" href="${group.feature[2]}"><strong>${group.feature[0]} ↗</strong><span>${group.feature[1]}</span></a>
      </div>`;
    link.replaceWith(button, panel);
    controls.push(button);
    button.addEventListener('click', () => {
      const opening = active !== button;
      close();
      if (opening) {
        active = button;
        button.setAttribute('aria-expanded', 'true');
        panel.hidden = false;
      }
    });
    panel.addEventListener('click', event => {
      if ((event.target as HTMLElement).closest('a')) close();
    });
  }

  document.addEventListener('pointerdown', event => {
    if (!header.contains(event.target as Node)) close();
  });
  document.addEventListener('focusin', event => {
    if (!active || controls.includes(event.target as HTMLButtonElement)) return;
    const panel = document.getElementById(active.getAttribute('aria-controls')!);
    if (!panel?.contains(event.target as Node)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active) {
      event.preventDefault();
      close(true);
    }
  });
}
