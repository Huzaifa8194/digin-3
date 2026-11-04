export function mountScrollFeedback() {
 const panel=document.createElement('aside');
 panel.className='chapter-scroll-feedback';panel.hidden=true;panel.setAttribute('aria-label','Scroll progress');
 panel.innerHTML='<div class="scroll-feedback-status"><span>Scroll ↓</span><span class="scroll-feedback-percent">0%</span></div><div class="scroll-feedback-track" role="progressbar" aria-label="Scroll to next section" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>';
 document.body.append(panel);
 const percent=panel.querySelector<HTMLElement>('.scroll-feedback-percent')!;
 const track=panel.querySelector<HTMLElement>('[role="progressbar"]')!;
 const fill=track.firstElementChild as HTMLElement;
 return {
  update(section:HTMLElement|undefined,_index:number,_count:number,progress:number,moving:boolean,visible:boolean){
   panel.hidden=!visible||!section;
   const value=Math.round(Math.min(1,Math.max(0,progress))*100);
   percent.textContent=value+'%';track.setAttribute('aria-valuenow',String(value));
   track.setAttribute('aria-label',moving?'Section transition progress':'Scroll to next section');
   fill.style.width=value+'%';
  },
  destroy(){panel.remove();}
 };
}