export function mountScrollFeedback() {
 const panel=document.createElement('aside');
 panel.className='chapter-scroll-feedback';panel.hidden=true;panel.setAttribute('aria-label','Chapter scrolling');
 panel.innerHTML='<div class="scroll-feedback-top"><span class="scroll-feedback-chapter"></span><button type="button" class="scroll-feedback-next">Continue ↓</button></div><div class="scroll-feedback-status"><span class="scroll-feedback-label">Scroll to continue</span><span class="scroll-feedback-percent">0%</span></div><div class="scroll-feedback-track" role="progressbar" aria-label="Scroll gesture progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div><span class="scroll-feedback-hint">A small scroll advances one step</span>';
 document.body.append(panel);
 const title=panel.querySelector<HTMLElement>('.scroll-feedback-chapter')!;
 const label=panel.querySelector<HTMLElement>('.scroll-feedback-label')!;
 const percent=panel.querySelector<HTMLElement>('.scroll-feedback-percent')!;
 const track=panel.querySelector<HTMLElement>('[role="progressbar"]')!;
 const fill=track.firstElementChild as HTMLElement;
 const hint=panel.querySelector<HTMLElement>('.scroll-feedback-hint')!;
 const next=panel.querySelector<HTMLButtonElement>('button')!;
 const names:Record<string,string>={home:'Home',build:'Software development',test:'Security testing',protect:'Protection',watch:'Monitoring',people:'Training',solutions:'Our work'};
 return {
  onContinue(callback:()=>void){next.addEventListener('click',callback);},
  update(section:HTMLElement|undefined,index:number,count:number,progress:number,moving:boolean,visible:boolean){
   panel.hidden=!visible;if(!section)return;
   const value=Math.round(Math.min(1,Math.max(0,progress))*100);
   title.textContent=String(index+1).padStart(2,'0')+' / '+String(count).padStart(2,'0')+' · '+(names[section.id]??'Explore');
   label.textContent=moving?'Changing section':value===100?'Step complete · scroll again':'Scroll or swipe to continue';
   percent.textContent=value+'%';track.setAttribute('aria-valuenow',String(value));
   track.setAttribute('aria-label',moving?'Section transition progress':'Scroll gesture progress');
   fill.style.width=value+'%';
   hint.textContent=moving?'No more scrolling needed for this step':value===100?'Release, then scroll for the next step':value>0?(100-value)+'% more scroll to advance':'A small scroll advances one step';
   next.disabled=moving;
  },
  destroy(){panel.remove();}
 };
}
