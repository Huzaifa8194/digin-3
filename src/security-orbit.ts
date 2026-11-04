const areas = [
  { name:'Applications', icon:'code', text:'The websites and applications your customers and teams use every day.', lane:0 },
  { name:'Networks', icon:'network', text:'The connections between your systems, services, and people.', lane:0 },
  { name:'Data', icon:'data', text:'The business information that needs appropriate access and protection.', lane:0 },
  { name:'Endpoints', icon:'device', text:'Laptops, phones, and other devices that connect to your environment.', lane:1 },
  { name:'Identity & access', icon:'key', text:'Who can reach your systems, and what they are allowed to do.', lane:1 },
  { name:'Security testing', icon:'search', text:'Penetration testing and audits help you understand where weaknesses exist.', lane:1 },
  { name:'Encryption', icon:'lock', text:'Protecting information as it is stored and shared.', lane:1 },
  { name:'Threat detection', icon:'radar', text:'Recognizing activity that needs closer investigation.', lane:2 },
  { name:'Monitoring', icon:'pulse', text:'Keeping changes and potential threats visible over time.', lane:2 },
  { name:'Network defense', icon:'shield', text:'Strengthening the boundaries around your connected infrastructure.', lane:2 },
  { name:'Team awareness', icon:'people', text:'Helping people recognize digital risks and make informed decisions.', lane:2 },
  { name:'Development', icon:'layers', text:'Building the software your business needs, with security in the conversation.', lane:2 },
];
const paths:Record<string,string>={
 code:'m8 7-5 5 5 5m8-10 5 5-5 5m-3-12-2 14',
 network:'M12 8V3m-7 13v-4h14v4M12 12V8M3 16h4v5H3zm7 0h4v5h-4zm7 0h4v5h-4zM9 3h6v5H9z',
 data:'M20 6c0 2-16 2-16 0s16-4 16 0ZM4 6v12c0 4 16 4 16 0V6M4 12c0 3 16 3 16 0',
 device:'M4 3h16v13H4zM2 20h20M9 16v4m6-4v4',
 key:'M14 10a5 5 0 1 0-4 4l3 3h3v3h4v-4l-6-6Z',
 search:'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6m-16-11 3 3 5-6',
 lock:'M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3m-4 4v3',
 radar:'M21 12a9 9 0 1 1-9-9m5 9a5 5 0 1 1-5-5m0 5 8-8',
 pulse:'M2 12h5l3-8 4 16 3-8h5',
 shield:'m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-5 10 3 3 7-7',
 people:'M9 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM1 21v-4c0-5 10-5 10 0v4m2 0v-4c0-5 10-5 10 0v4',
 layers:'m12 2 10 6-10 6L2 8l10-6Zm-10 12 10 6 10-6M2 18l10 6 10-6',
};

export function mountSecurityOrbit(){
 const map=document.querySelector<HTMLElement>('#security-orbit-map');
 if(!map)return;
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const title=document.querySelector<HTMLElement>('#orbit-detail-title')!;
 const description=document.querySelector<HTMLElement>('#orbit-detail-text')!;
 const updateMotion=()=>map.classList.toggle('orbit-paused',preference.matches);
 preference.addEventListener('change',updateMotion);
 const buttons:HTMLButtonElement[]=[];
 for(let lane=0;lane<3;lane++){
  const track=document.createElement('div');track.className=`orbit-track orbit-track-${lane}`;
  const members=areas.filter(area=>area.lane===lane);
  members.forEach((area,index)=>{
   const slot=document.createElement('div');slot.className='orbit-slot';
   slot.style.setProperty('--angle',`${index*360/members.length+lane*23}deg`);
   const button=document.createElement('button');button.type='button';button.className='orbit-node';
   button.setAttribute('aria-controls','orbit-detail');button.setAttribute('aria-pressed','false');
   button.innerHTML=`<span class="orbit-node-icon"><svg viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[area.icon]}"/></svg></span><span>${area.name}</span>`;
   button.addEventListener('click',()=>{
    buttons.forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
    title.textContent=area.name;description.textContent=area.text;
   });
   buttons.push(button);slot.append(button);track.append(slot);
  });
  map.append(track);
 }
 const selected=buttons.find(button=>button.textContent==='Security testing');
 selected?.click();updateMotion();
 // Offscreen motion does not need to run; hover/focus also pauses the lanes.
 const observer=new IntersectionObserver(entries=>{
  map.classList.toggle('orbit-offscreen',!entries[0].isIntersecting);
 },{rootMargin:'100px'});
 observer.observe(map);
}
