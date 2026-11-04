import { ScrollFeedback } from './scroll-feedback';
import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Minus, Plus, Pause, Play, RotateCcw } from 'lucide-react';

// Original background supplied in the PrismaHero reference.
const BACKGROUND = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4';
const POSTER = 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=2400&q=85';
const stars = Array.from({ length: 48 }, (_, i) => ({
  x: 3 + ((i * 37.73) % 94), y: 4 + ((i * 23.17) % 89),
  size: i % 9 === 0 ? 2.2 : i % 3 === 0 ? 1.3 : .7,
  opacity: .2 + (i % 6) * .1,
}));

export function PrismaHero() {
  const scene = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const manualZoom = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: scene, offset: ['start start', 'end end'] });
  const targetScale = useTransform([scrollYProgress, manualZoom], ([scroll, manual]) =>
    reducedMotion ? 1 : 1 + Math.min(Number(scroll) / .65, 1) * 2.3 + Number(manual) * .4);
  const scale = useSpring(targetScale, { stiffness: 85, damping: 30, mass: .6 });
  const starScale = useTransform(scale, [1, 4.5], [1, 6]);
  const copyOpacity = useTransform(scrollYProgress, [0, .14, .3], [1, 1, 0]);
  const copyY = useTransform(scrollYProgress, [0, .3], [0, -25]);
  const arrivalOpacity = useTransform(scrollYProgress, [.34, .5], [0, 1]);
  const arrivalVisibility = useTransform(scrollYProgress, value => value > .34 ? 'visible' as const : 'hidden' as const);
  const introVisibility = useTransform(scrollYProgress, value => value < .3 ? 'visible' as const : 'hidden' as const);

  useEffect(() => { manualZoom.set(zoom); }, [zoom, manualZoom]);
  useEffect(() => {
    if (!video.current) return;
    if (paused || reducedMotion) video.current.pause();
    else void video.current.play().catch(() => setPaused(true));
  }, [paused, reducedMotion]);

  return <section className={`cosmic-journey ${reducedMotion ? 'cosmic-still' : ''}`} id="home" ref={scene} aria-label="Digiinn360: explore your digital future">
    <div className="cosmic-viewport">
      <motion.div className="cosmic-background" style={{ scale }}>
        <img className="cosmic-poster" src={POSTER} alt="" aria-hidden="true"/>
        {!videoFailed && <video ref={video} className="cosmic-video" src={BACKGROUND} poster={POSTER} autoPlay={!reducedMotion} muted loop playsInline preload="auto" aria-hidden="true" onError={() => setVideoFailed(true)}/>}
      </motion.div>
      <motion.div className="cosmic-stars" aria-hidden="true" style={{ scale: starScale }}>
        {stars.map((star,i) => <i key={i} style={{left:`${star.x}%`,top:`${star.y}%`,width:star.size,height:star.size,opacity:star.opacity}}/>)}
      </motion.div>
      <div className="cosmic-shade"/>
      <div className="cosmic-topline"><span><i/> Your digital future. Protected.</span><span>Software engineering & cybersecurity</span></div>
      <div className="cosmic-stage">
      <motion.div className="cosmic-intro" style={reducedMotion ? {} : {opacity:copyOpacity,y:copyY,visibility:introVisibility}}>
        <span className="cosmic-label">A world of possibility</span>
        <h1>Go further.<br/>With confidence.</h1>
        <p>Powerful software. Proactive security.<br/>A partner for everything that comes next.</p>
        <a className="cosmic-cta" href="#services">Explore our expertise <span><ArrowUpRight size={18}/></span></a>
      </motion.div>
      {!reducedMotion && <motion.div className="cosmic-arrival" style={{opacity:arrivalOpacity,visibility:arrivalVisibility}}><span>Secure. Build. Evolve.</span><h2>Your next chapter<br/>starts here.</h2><a href="#about">Discover Digiinn360 <ArrowDown size={16}/></a></motion.div>}
      </div>
      <div className="cosmic-floor"><ScrollFeedback sectionRef={scene} next="about" pinned/><div className="cosmic-word" aria-hidden="true">digiinn<span>360</span></div><div className="cosmic-floor-line"><a href="#about" className="cosmic-scroll"><ArrowDown size={14}/><span>{reducedMotion ? 'Discover Digiinn360' : 'Scroll to explore deeper'}</span></a><div className="cosmic-controls" role="group" aria-label="Background controls">
        {!reducedMotion && <><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(0,z-1))} disabled={zoom===0}><Minus size={15}/></button><span aria-live="polite" aria-label="Additional zoom">+{zoom*40}%</span><button aria-label="Zoom into the stars" onClick={()=>setZoom(z=>Math.min(3,z+1))} disabled={zoom===3}><Plus size={15}/></button><button aria-label="Reset manual zoom" onClick={()=>setZoom(0)} disabled={zoom===0}><RotateCcw size={13}/></button></>}
        {!reducedMotion && !videoFailed && <button aria-label={paused?'Play background video':'Pause background video'} aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>{paused?<Play size={13}/>:<Pause size={13}/>}</button>}
      </div></div></div>
      {!reducedMotion && <div className="cosmic-progress" aria-hidden="true"><motion.div style={{scaleX:scrollYProgress}}/></div>}
    </div>
  </section>;
}
