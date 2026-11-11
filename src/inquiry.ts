document.querySelector<HTMLFormElement>('#inquiry')!.addEventListener('submit',event=>{
 event.preventDefault();
 const interest=document.querySelector<HTMLSelectElement>('#interest')!.value;
 const brief=document.querySelector<HTMLTextAreaElement>('#brief')!.value.trim();
 if(!brief)return;
 location.href=`mailto:info@digiinn360.com?subject=${encodeURIComponent(interest+' inquiry')}&body=${encodeURIComponent('Hello Digiinn360,\n\nI would like to discuss: '+interest+'\n\n'+brief+'\n\nCompany / name:\nContact details:')}`;
});
