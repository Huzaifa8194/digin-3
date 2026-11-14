document.querySelector<HTMLFormElement>('#inquiry')!.addEventListener('submit',event=>{
 event.preventDefault();
 const interest=document.querySelector<HTMLSelectElement>('#interest')!.value;
 const brief=document.querySelector<HTMLTextAreaElement>('#brief')!.value.trim();
 const field=document.querySelector<HTMLTextAreaElement>('#brief')!;
 const error=document.querySelector<HTMLElement>('[data-brief-error]');
 if(!brief){if(error){error.hidden=false;field.setAttribute('aria-invalid','true');}field.focus();return;}
 if(error){error.hidden=true;field.removeAttribute('aria-invalid');}
 location.href=`mailto:info@digiinn360.com?subject=${encodeURIComponent(interest+' inquiry')}&body=${encodeURIComponent('Hello Digiinn360,\n\nI would like to discuss: '+interest+'\n\n'+brief+'\n\nCompany / name:\nContact details:')}`;
});
