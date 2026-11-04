// Adapted from the Tubelight Navbar interaction published by Ayushmaan Singh on 21st.dev.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Menu, X } from 'lucide-react';
const links = [['About','about'],['Expertise','services'],['Our work','work'],['Team','team']] as const;
export function SiteNavigation() {
  const [active,setActive] = useState('');
  const [open,setOpen] = useState(false);
  const [overHero,setOverHero] = useState(true);
  useEffect(()=>{
    const update=()=>setOverHero((document.getElementById('home')?.getBoundingClientRect().bottom ?? 0)>80);
    update();
    window.addEventListener('scroll',update,{passive:true});
    window.addEventListener('resize',update);
    return ()=>{window.removeEventListener('scroll',update);window.removeEventListener('resize',update);};
  },[]);
  useEffect(()=>{
    const observer = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{if(entry.isIntersecting) setActive(entry.target.id);});
    },{rootMargin:'-15% 0px -60% 0px'});
    links.forEach(([,id])=>{const element=document.getElementById(id);if(element)observer.observe(element);});
    return ()=>observer.disconnect();
  },[]);
  return <header className={`site-header ${overHero?'over-hero':''}`}><a href="#home" className="brand" aria-label="Digiinn360 home"><span className="brand-mark">d<span/></span>digiinn<span className="brand-360">360</span></a><nav className={`tube-nav ${open?'open':''}`} aria-label="Main navigation">{links.map(([label,id])=><a href={`#${id}`} key={id} aria-current={active===id?'location':undefined} onClick={()=>{setActive(id);setOpen(false);}}>{active===id&&<motion.span className="tube-active" layoutId="nav-light" transition={{type:'spring',stiffness:350,damping:30}}><i/></motion.span>}<span>{label}</span></a>)}</nav><a className="header-cta" href="#contact">Start a project <ArrowUpRight size={16}/></a><button className="menu-toggle" aria-label="Toggle navigation" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></header>;
}
