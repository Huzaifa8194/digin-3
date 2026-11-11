const link=(label:string,href:string)=>`<a class="bento-link" href="${href}">${label} ↗</a>`;
export function mountReferenceComponents(){
 mountTeam(document.querySelector('#faq')!);
 const contact=document.querySelector<HTMLElement>('#connect .copy')!;contact.classList.add('chapter-composition','contact-composition');contact.querySelector('.panel-icon')?.remove();const contactIntro=document.createElement('div');contactIntro.className='contact-intro';[...contact.children].filter(e=>!e.matches('form,address')).forEach(e=>contactIntro.append(e));const form=contact.querySelector('form')!;contact.prepend(contactIntro);contactIntro.append(contact.querySelector('address')!);form.classList.add('contact-form-surface');
}

const teamMembers = [
  ['AIMAN ZULFIQAR', 'Mobile AppSec Automation Engineer', 'aiman-zulfiqar', '50% 20%'],
  ['HAFZA REHMAN', 'Malware Analyst &amp; AppSec Engineer', 'hafza-rehman', '50% 58%'],
  ['M. HUZAIFA IMRAN', 'Secure Full Stack Developer', 'huzaifa-imran', '50% 0%'],
  ['ANSAB FAROOQ', 'Full Stack Penetration Tester &amp; Detection Engineer', 'ansab-farooq', '50% 22%'],
  ['JALIL AHMED', 'Cyber Threat Intelligence Engineer', 'jalil-ahmed', '50% 64%'],
  ['KHALID KHAN', 'Offensive Security &amp; Product Engineer', 'khalid-khan', '50% 0%'],
  ['HAMZA JALIL', 'Endpoint Security Product Engineer', 'hamza-jalil', '50% 38%'],
  ['MUHAMMAD HASEEB', 'Red Team Automation Engineer', 'muhammad-haseeb', '50% 38%'],
  ['ZARLISH RAFID', 'Cybersecurity Business Developer Lead', 'zarlish-rafid', '50% 43%'],
] as const;

const teamRows = [teamMembers.slice(0, 3), teamMembers.slice(3, 6), teamMembers.slice(6)];

export function mountTeam(anchor: Element) {
  const team = document.createElement('section');
  team.id = 'team';
  team.className = 'reference-team';
  team.setAttribute('aria-labelledby', 'team-title');
  team.innerHTML = `
    <div class="team-heading">
      <div><p class="kicker">Expert team</p><h2 id="team-title">Meet our<br>expert team</h2></div>
      <p>Engineers, analysts and business development specialists.</p>
    </div>
    <div class="team-roster">
      ${teamRows.map(row => `
        <div class="team-panels" role="group" aria-label="Team members">
          ${row.map(([name, role, portrait, position], index) => `
            <button type="button" class="team-panel" aria-pressed="${index === 0}">
              <span class="team-portrait-frame">
                <img class="team-portrait" src="/team/${portrait}.webp" alt="" loading="lazy" decoding="async" style="object-position: ${position}">
              </span>
              <span class="team-panel-bottom">
                <strong>${name}</strong>
                <span>${role}</span>
              </span>
              <span class="team-arrow" aria-hidden="true">↗</span>
            </button>
          `).join('')}
        </div>
      `).join('')}
    </div>
    <div class="team-caption">
      <span>Different disciplines. One team.</span>
      ${link('Work with us', 'mailto:info@digiinn360.com')}
    </div>
  `;

  team.querySelectorAll('.team-panels').forEach(row => {
    const panels = row.querySelectorAll<HTMLButtonElement>('.team-panel');
    panels.forEach(panel => {
      const select = () => {
        panels.forEach(other => other.setAttribute('aria-pressed', String(other === panel)));
      };
      panel.addEventListener('click', select);
      panel.addEventListener('focus', select);
    });
  });
  anchor.before(team);
}
