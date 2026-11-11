// DOM adaptations of the user's digiinn360 component project. No new runtime dependencies.
export function mountComponentRefresh() {
 const icons = {
  build:'m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
  test:'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6m-15-11 3 3 4-5',
  protect:'m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-5 10 3 3 7-7',
  watch:'M21 12a9 9 0 1 1-9-9m5 9a5 5 0 1 1-5-5m0 5 8-8',
  people:'m2 9 10-6 10 6-10 6L2 9Zm4 3v6c4 4 8 4 12 0v-6m4-3v10',
  connect:'M3 5h18v14H3zM3 5l9 8 9-8',
 };
 for (const [id,path] of Object.entries(icons)) {
  const copy=document.querySelector(`#${id} .copy`);
  if(!copy || copy.classList.contains('product-chapter-copy'))continue;
  const icon=document.createElement('span');icon.className='panel-icon';icon.setAttribute('aria-hidden','true');
  icon.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
  copy.prepend(icon);
 }
 document.querySelectorAll<HTMLElement>('.solution').forEach((card,index)=>{
  card.classList.add('spot-card');
  const art=document.createElement('div');art.className=`project-art project-art-${index}`;art.setAttribute('aria-hidden','true');
  art.innerHTML=index===0?`<div class="mini-window"><div class="window-bar"><i></i><i></i><i></i><span>Leave management</span></div><div class="leave-preview"><div class="calendar-head">Team calendar <span>Month view</span></div><div class="calendar-grid">${Array.from({length:28},(_,i)=>`<span class="${[8,9,10,17,18].includes(i)?'calendar-leave':''}">${i+1}</span>`).join('')}</div><div class="approval-line"><b>✓</b> A clearer approval workflow</div></div></div>`:`<div class="mini-window"><div class="window-bar"><i></i><i></i><i></i><span>File exchange</span></div><div class="upload-preview"><div class="file-stack"><span>ZIP</span><span>ZIP</span></div><strong>A place for your files</strong><span>Upload · protect · share</span><div class="upload-track"><i></i></div></div></div>`;
  card.prepend(art);
 });
 document.querySelectorAll<HTMLElement>('.spot-card,.copy:not(.hero .copy)').forEach(card=>{
  card.addEventListener('pointermove',event=>{
   if(event.pointerType==='touch')return;
   const bounds=card.getBoundingClientRect();
   card.style.setProperty('--pointer-x',`${event.clientX-bounds.left}px`);
   card.style.setProperty('--pointer-y',`${event.clientY-bounds.top}px`);
  });
 });
 document.querySelectorAll('.faq-items details').forEach(item=>item.addEventListener('toggle',()=>window.dispatchEvent(new Event('resize'))));
}
