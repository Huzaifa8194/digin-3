const paths:Record<string,string>={shield:'m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-5 10 3 3 7-7',code:'m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',lock:'M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3m-4 4v3',network:'M12 3v9M4 20v-8h16v8M1 20h6m10 0h6',scan:'M3 8V3h5m8 0h5v5m0 8v5h-5m-8 0H3v-5M2 12h20',fingerprint:'M5 13c0-12 14-12 14 0m-10 0c0-5 6-5 6 0v7m-3-8v10M5 16v4m14-4v4M8 14v9',people:'m2 9 10-6 10 6-10 6L2 9Zm4 3v6c4 4 8 4 12 0v-6'};
const icon=(name:string,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.shield}"/></svg>`;
const card=(cls:string,body:string)=>`<article class="spot-card ${cls}"><div class="spot-glow"></div>${body}</article>`;
const square=(name:string)=>`<span class="square-icon">${icon(name)}</span>`;
const radar=`<div class="radar"><i></i><i></i><i></i>${icon('shield')}<span class="radar-point p1"></span><span class="radar-point p2"></span><span class="radar-point p3"></span></div>`;
const chart=(label:string,index:number)=>`<div><span><i></i>${label}</span><div class="tiny-bars">${Array.from({length:14},(_,n)=>`<b style="height:${8+((n*17+index*11)%28)}px"></b>`).join('')}</div></div>`;
const monitor=`<div class="monitor-illustration" aria-label="Illustrative security overview, not live data"><div class="monitor-top"><span class="monitor-logo">${icon('shield')} Defense overview</span><span class="demo-badge">Illustrative view</span></div><div class="monitor-overview">${radar}<div class="monitor-events">${['Network activity','Endpoint protection','Access management'].map(chart).join('')}</div></div><div class="monitor-bottom"><span>Detect. Understand. Respond.</span>${icon('lock')}</div></div>`;
const codeWindow=`<div class="code-window" aria-hidden="true"><div><i></i><i></i><i></i><span>built-for-you.ts</span></div><code><span>const</span> yourNextChapter = {<br>&nbsp; ambition: <em>"Unlimited"</em>,<br>&nbsp; approach: <em>"Tailored"</em>,<br>&nbsp; security: <em>"Built in"</em><br>};</code><small>✓ Ready for what’s next</small></div>`;
const network=`<div class="network-art" aria-hidden="true"><span>Devices</span><i></i><b>${icon('shield')}</b><i></i><span>Network</span></div>`;
const privacy=`<div class="privacy-art" aria-hidden="true">${icon('fingerprint')}<span>${icon('lock')}</span></div>`;
const link=(label:string,href:string)=>`<a class="bento-link" href="${href}">${label} ↗</a>`;
function replace(id:string,body:string){
 const copy=document.querySelector<HTMLElement>(`#${id} .copy`)!;
 copy.classList.add('chapter-composition');copy.innerHTML=body;
}
const heading=(label:string,title:string,description:string)=>`<div class="composition-heading"><p class="kicker">${label}</p><h2>${title}</h2><p class="description">${description}</p></div>`;
export function mountReferenceComponents(){
 replace('test',heading('Penetration testing & security audits','Penetration testing<br>& security audits.','Find security gaps in your systems and prioritize what to fix.')+`<div class="security-bento">`+
 card('bento-monitor',`<div class="bento-card-title">${square('scan')}<span>Security coverage</span></div>${monitor}<div class="bento-bottom"><h3>Threat detection & prevention</h3><p>Real-time observation and preventive measures help identify potential threats.</p>${link('Explore threat protection','#watch')}</div>`)+
 card('bento-privacy',`${privacy}<div><h3>Data encryption<br>& privacy</h3><p>Protect business information with encryption and managed access.</p>${link('Protect your data','#protect')}</div>`)+
 card('bento-network',`${square('network')}<h3>Network defense & firewalls</h3><p>Strengthen network boundaries and protect connected devices.</p>${network}${link('Request an assessment','mailto:info@digiinn360.com?subject=Security%20assessment')}`)+`</div>`);
 const services=[{label:'Web',title:'Website solutions',description:'Tailored website development for your business.',features:['Customer-facing websites','Business web applications','Workflows shaped around your team'],symbol:'code'}, {label:'Mobile',title:'Mobile applications',description:'Mobile software developed around your requirements.',features:['Customer and team experiences','Mobile-first workflows','An application built around your brief'],symbol:'network'}, {label:'Desktop',title:'Desktop applications',description:'Desktop solutions customized for your organization.',features:['Purpose-built business tools','Focused team workflows','Software around your requirements'],symbol:'shield'}];
 replace('build',heading('Software development','Software built around<br>your workflow','Build for the web, mobile, or desktop with your users in mind.')+`<div class="reference-showcase"><div class="spatial-art"><div class="spatial-ring"></div><div class="spatial-ring second"></div><div class="spatial-core">${icon('code')}</div><span>Built around your business</span></div><div class="showcase-copy"><div class="switcher" role="group" aria-label="Select development service">${services.map((s,i)=>`<button type="button" data-service="${i}" aria-pressed="${i===0}">${s.label}</button>`).join('')}</div><div class="service-content" aria-live="polite"></div></div></div>`);
 const selectService=(index:number)=>{const data=services[index];document.querySelector('#build .service-content')!.innerHTML=`<h3>${data.title}</h3><p>${data.description}</p><ul>${data.features.map(f=>`<li>✓ ${f}</li>`).join('')}</ul>${link('Discuss a development project','mailto:info@digiinn360.com?subject=Software%20project')}`;document.querySelector('#build .spatial-core')!.innerHTML=icon(data.symbol);document.querySelectorAll<HTMLButtonElement>('[data-service]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));window.dispatchEvent(new Event('resize'));};
 document.querySelectorAll<HTMLButtonElement>('[data-service]').forEach(b=>b.addEventListener('click',()=>selectService(Number(b.dataset.service))));selectService(0);
 replace('protect',heading('Endpoint, network & data security','Protect your devices,<br>networks &amp; data','Protect the devices, networks, and sensitive information your business relies on.')+`<div class="protection-composition">${card('protection-privacy',`${privacy}<h3>Secure information management</h3><p>Encryption helps keep sensitive business information protected.</p>${link('Discuss data protection','mailto:info@digiinn360.com?subject=Data%20protection')}`)}${card('protection-network',`${square('network')}<h3>Network defense & firewalls</h3>${network}<div class="protection-layers">${['Endpoint security','Network defense & firewalls','Encryption & privacy'].map((x,i)=>`<details ${i===0?'open':''}><summary>${x}</summary><p>${['Defend connected devices against malware, ransomware and unauthorized access.','Support network protection with firewalls and intrusion prevention.','Combine encryption with access controls for business data.'][i]}</p></details>`).join('')}</div>`)}</div>`);
 replace('watch',heading('Threat detection & monitoring','24/7 monitoring<br>and support','Spot suspicious activity early and get support when you need to respond.')+`<div class="monitoring-composition">${card('monitoring-main',`<div class="bento-card-title">${square('scan')}<span>Real-time threat monitoring</span></div>${monitor}<div class="monitoring-legend"><span>Network</span><span>Devices</span><span>Access</span></div>`)}<div class="monitoring-workflow">${[{t:'Detect',d:'Observe network traffic, user behavior and system activity.'},{t:'Understand',d:'Identify patterns that may indicate a security threat.'},{t:'Respond',d:'Get assistance with breach response and security concerns.'}].map((x,i)=>`<button type="button" data-monitor="${i}" aria-pressed="${i===0}"><span>${icon(['scan','shield','network'][i])}</span><strong>${x.t}</strong><span>${x.d}</span></button>`).join('')}</div><p class="monitor-explanation" aria-live="polite">Observe network traffic, user behavior and system activity.</p>${link('Explore monitoring support','mailto:info@digiinn360.com?subject=Monitoring%20support')}</div>`);
 document.querySelectorAll<HTMLButtonElement>('[data-monitor]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-monitor]').forEach(other=>other.setAttribute('aria-pressed',String(other===b)));document.querySelector('.monitor-explanation')!.textContent=b.lastElementChild!.textContent;document.querySelector('#watch .monitor-illustration')!.setAttribute('data-view',b.dataset.monitor!);}));
 const work=[{title:'Cybersecurity awareness',category:'Training & awareness',description:'Help your team recognize risks and reduce human error.',tags:['Security awareness','Everyday risks','Team learning'],icon:'people'},{title:'Software development training',category:'Software development training',description:'Give your technical team practice building and maintaining software.',tags:['Developer training','Software skills','Practical learning'],icon:'code'},{title:'Tailored training programs',category:'Security best practices',description:'Build everyday security habits around the risks your team faces.',tags:['Team programs','Best practices','Your requirements'],icon:'shield'}];
 replace('people',heading('Technical training & security awareness','Software development<br>& cybersecurity training','Develop technical skills and prepare your people for future security challenges.')+`<div class="capability-carousel"><div class="circle-stage" aria-hidden="true">${work.map((w,i)=>`<div class="capability-disc" data-disc="${i}">${icon(w.icon)}<img src="https://images.unsplash.com/${["photo-1522071820081-009f0129c71c","photo-1498050108023-c5249f4df085","photo-1558494949-ef010cbdcc31"][i]}?auto=format&fit=crop&w=700&q=85" alt="" loading="lazy"><span>${w.category}</span></div>`).join('')}</div><div class="capability-copy" aria-live="polite"></div></div><div class="carousel-nav"><button type="button" data-carousel="-1" aria-label="Previous training area">←</button><button type="button" data-carousel="1" aria-label="Next training area">→</button><span>Explore our capabilities</span></div>`);
 let active=0;const showWork=()=>{const w=work[active];document.querySelector('.capability-copy')!.innerHTML=`<span class="counter">0${active+1} / 03</span><p class="kicker">${w.category}</p><h3>${w.title}</h3><p>${w.description}</p><div class="tags">${w.tags.map(t=>`<span>${t}</span>`).join('')}</div>${link('Discuss a training program','mailto:info@digiinn360.com?subject=Team%20training')}`;document.querySelectorAll<HTMLElement>('[data-disc]').forEach((d,i)=>d.dataset.active=String(i===active));window.dispatchEvent(new Event('resize'));};document.querySelectorAll<HTMLButtonElement>('[data-carousel]').forEach(b=>b.addEventListener('click',()=>{active=(active+Number(b.dataset.carousel)+work.length)%work.length;showWork();}));showWork();
 mountTeam(document.querySelector('#faq')!);
 const contact=document.querySelector<HTMLElement>('#connect .copy')!;contact.classList.add('chapter-composition','contact-composition');contact.querySelector('.panel-icon')?.remove();const contactIntro=document.createElement('div');contactIntro.className='contact-intro';[...contact.children].filter(e=>!e.matches('form,address')).forEach(e=>contactIntro.append(e));const form=contact.querySelector('form')!;contact.prepend(contactIntro);contactIntro.append(contact.querySelector('address')!);form.classList.add('contact-form-surface');
 document.querySelectorAll<HTMLElement>('.chapter-composition .spot-card').forEach(card=>card.addEventListener('pointermove',event=>{
  if(event.pointerType==='touch')return;
  const bounds=card.getBoundingClientRect();
  card.style.setProperty('--pointer-x',`${event.clientX-bounds.left}px`);
  card.style.setProperty('--pointer-y',`${event.clientY-bounds.top}px`);
 }));
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
