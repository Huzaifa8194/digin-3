import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { createChapterScroll } from './chapter-scroll';

gsap.registerPlugin(ScrollTrigger);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduced.matches;
const state = { progress: 0 };
const chapters = [...document.querySelectorAll<HTMLElement>('.chapter')];
// Keep semantic sections and native anchors; only enhance the presentation.
chapters.forEach(chapter => {
 const stage = document.createElement('div'); stage.className = 'chapter-stage';
 while(chapter.firstChild) stage.append(chapter.firstChild);
 chapter.append(stage);
});
document.documentElement.classList.add('story-ready');
let chapterOffsets: number[] = [];
function measureChapters(){ chapterOffsets = chapters.map(el => el.offsetTop); }
function sizeReadingStages(){
 chapters.forEach(chapter=>{
  const stage=chapter.querySelector<HTMLElement>('.chapter-stage')!;
  const copy=chapter.querySelector<HTMLElement>('.copy')!;
  const fits=chapter.id!=='connect' && innerWidth>=1000 && innerHeight>=640 && copy.offsetHeight<=innerHeight-150 && !reduced.matches;
  chapter.classList.toggle('flow-chapter',!fits);
  stage.style.minHeight=fits?`${innerHeight}px`:'auto';
  chapter.style.minHeight=fits?`${innerHeight*2.35}px`:'auto';
 });
 measureChapters();
}
const heroOrbit=document.querySelector<HTMLElement>('.hero-orbit')!;
const heroChapter=document.querySelector<HTMLElement>('#home')!;
function updateHeroHandoff(){
 const distance=Math.max(1,(chapterOffsets[1]??innerHeight)-heroChapter.offsetTop);
 const progress=THREE.MathUtils.clamp((scrollY-heroChapter.offsetTop)/distance,0,1);
 const fade=THREE.MathUtils.smoothstep(progress,.24,.72);
 heroOrbit.style.opacity=String(1-fade);
 heroOrbit.style.filter=reduced.matches?'none':`blur(${fade*8}px)`;
 heroOrbit.style.transform=reduced.matches?'none':`scale(${1+fade*.06})`;
 heroOrbit.inert=fade>.75;
 document.documentElement.classList.toggle('past-hero',progress>.24);
}
window.addEventListener('scroll',updateHeroHandoff,{passive:true});
window.addEventListener('resize',updateHeroHandoff);
updateHeroHandoff();
const animationContext=gsap.matchMedia();
function configureContentMotion(){
 animationContext.revert();
 animationContext.add('(prefers-reduced-motion: no-preference)',()=>{
  chapters.forEach((chapter,index)=>{
   if(chapter.classList.contains('flow-chapter'))return;
   const copy=chapter.querySelector('.copy')!;
   // One reversible owner for every animated property. Separate entrance/exit
   // scrubs competed over opacity and transforms when scrolling upward.
   const timeline=gsap.timeline({scrollTrigger:{trigger:chapter,start:'top 75%',end:'bottom 65%',scrub:true}});
   if(index>0)timeline.fromTo(copy,{autoAlpha:0,y:30,scale:.98},{autoAlpha:1,y:0,scale:1,duration:.7,ease:'sine.out'});
   else timeline.to({}, {duration:.7});
   timeline.to({}, {duration:Math.max(.1,chapter.offsetHeight/innerHeight-1)});
   if(index<chapters.length-1)timeline.to(copy,{autoAlpha:0,y:-30,scale:.98,duration:.4,ease:'sine.in'});
   else timeline.to({}, {duration:.4});
  });
 });
}
sizeReadingStages();
configureContentMotion();
const chapterScroll=createChapterScroll({reduced,onUpdate:()=>ScrollTrigger.update()});
reduced.addEventListener('change',()=>{sizeReadingStages();updateHeroHandoff();configureContentMotion();ScrollTrigger.refresh();chapterScroll.refresh();});
window.addEventListener('resize',()=>{sizeReadingStages();updateHeroHandoff();configureContentMotion();ScrollTrigger.refresh();chapterScroll.refresh();});
document.fonts.ready.then(()=>{
 sizeReadingStages();updateHeroHandoff();configureContentMotion();ScrollTrigger.refresh();
 chapterScroll.refresh();
 const initialTarget=document.getElementById(location.hash.slice(1));
 if(initialTarget && chapterScroll.handles(initialTarget))chapterScroll.goTo(initialTarget);
 else initialTarget?.scrollIntoView({behavior:'instant'});
});
// Tall sticky sections need an explicit destination: browser anchor heuristics
// can otherwise land near the end of a section, after its content has faded.
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(link=>{
 link.addEventListener('click',event=>{
  const target=document.getElementById(link.hash.slice(1));
  if(!target || !chapterScroll.handles(target))return;
  event.preventDefault();
  history.replaceState(null,'',link.hash);
  chapterScroll.goTo(target);
 });
});
measureChapters();
ScrollTrigger.addEventListener('refresh', measureChapters);
gsap.to(state, { progress: 1, ease: 'none', scrollTrigger: { trigger: 'main', start: 'top top', end: 'bottom bottom', scrub: true } });
reduced.addEventListener('change', () => { paused = reduced.matches; });

const host = document.querySelector<HTMLDivElement>('#scene')!;
try {
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
const theme = getComputedStyle(document.body);
const canvasColor = new THREE.Color(theme.getPropertyValue('--canvas').trim());
const inkColor = new THREE.Color(theme.getPropertyValue('--ink').trim());
const highlightColor = new THREE.Color(theme.getPropertyValue('--highlight').trim());
renderer.setClearColor(canvasColor, 1);
host.append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
camera.position.z = 7;
const mobile = innerWidth < 700;
const count = mobile ? 2400 : 5200;
const positions = new Float32Array(count * 3);
const scattered = new Float32Array(count * 3);
const sphere = new Float32Array(count * 3);
const software = new Float32Array(count * 3);
const buildOffsets = new Float32Array(count * 3);
const guardOffsets = new Float32Array(count * 3);
const ring = new Float32Array(count * 3);
const scan = new Float32Array(count * 3);
const shield = new Float32Array(count * 3);
const orbit = new Float32Array(count * 3);
const network = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);
// Deterministic geometry keeps the composition stable through reloads.
let seed = 37;
const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
for(let i=0;i<count;i++){
 const u=random()*Math.PI*2, v=Math.acos(2*random()-1), r=1.65+random()*.08;
 const j=i*3;
 sphere[j]=r*Math.sin(v)*Math.cos(u); sphere[j+1]=r*Math.sin(v)*Math.sin(u); sphere[j+2]=r*Math.cos(v);
 // A loose atmospheric field lets the hero's orbital diagram lead.
 scattered[j]=sphere[j]*1.35+(random()-.5)*2.8;
 scattered[j+1]=sphere[j+1]*1.15+(random()-.5)*2.3;
 scattered[j+2]=sphere[j+2]+(random()-.5)*1.8;
 const radius=1.65+(random()-.5)*.24;
 ring[j]=Math.cos(u)*radius; ring[j+1]=Math.sin(u)*radius; ring[j+2]=(random()-.5)*.22;
 // Each service gets a distinct silhouette, with a shared particle identity.
 // Audit: pull the system into separated octants to inspect its interior.
 scan[j]=sphere[j]*.82+Math.sign(sphere[j])*.25;
 scan[j+1]=sphere[j+1]*.82+Math.sign(sphere[j+1])*.25;
 scan[j+2]=sphere[j+2]*.65+Math.sign(sphere[j+2])*.22;
 // Development: three rectangular modules stack into an application.
 const module=i%3, face=Math.floor(i/3)%6;
 const box=[(random()-.5)*2.5,(random()-.5)*.5,(random()-.5)*1.4];
 const axis=Math.floor(face/2);
 box[axis]=(face%2 ? 1 : -1)*[1.25,.25,.7][axis];
 software[j]=box[0]; software[j+1]=box[1]+(module-1)*.8; software[j+2]=box[2];
 buildOffsets[j]=(module-1)*1.1; buildOffsets[j+1]=(module-1)*.8; buildOffsets[j+2]=.6;
 // Protection: a compact asset surrounded by an unmistakable shield outline.
 if(i%4===0){
  shield[j]=sphere[j]*.34; shield[j+1]=sphere[j+1]*.34; shield[j+2]=sphere[j+2]*.34;
 }else{
  const outline=[[-1.45,1.2],[0,1.65],[1.45,1.2],[1.25,-.35],[0,-1.7],[-1.25,-.35]];
  const edge=i%6, a=outline[edge], b=outline[(edge+1)%6], along=random();
  const thickness=(random()-.5)*.09;
  shield[j]=THREE.MathUtils.lerp(a[0],b[0],along)+thickness;
  shield[j+1]=THREE.MathUtils.lerp(a[1],b[1],along)+thickness;
  shield[j+2]=(random()-.5)*.48;
  guardOffsets[j]=shield[j]>0 ? .8 : -.8;
  guardOffsets[j+1]=.15;
 }
 // Monitoring: a face-on radar field, not an abstract set of orbital paths.
 const radarRadius=[.6,1.15,1.75][i%3]+(random()-.5)*.025;
 orbit[j]=Math.cos(u)*radarRadius; orbit[j+1]=Math.sin(u)*radarRadius; orbit[j+2]=(random()-.5)*.035;
 const cluster=i%6, theta=cluster*Math.PI/3;
 network[j]=Math.cos(theta)*1.3+sphere[j]*.3; network[j+1]=Math.sin(theta)*1.3+sphere[j+1]*.3; network[j+2]=sphere[j+2]*.3;
 const shade=inkColor.clone().lerp(highlightColor, random()); colors[j]=shade.r; colors[j+1]=shade.g; colors[j+2]=shade.b;
}
// Sample the wordmark into the final pose so the same particles assemble
// into both the surrounding ring and its lettering (no text overlay).
const lettering=document.createElement('canvas');
lettering.width=640;lettering.height=180;
const letteringContext=lettering.getContext('2d');
if(letteringContext){
 letteringContext.font='800 100px Arial, sans-serif';
 const fontSize=Math.floor(580/letteringContext.measureText('DigiInn').width*100);
 letteringContext.font=`800 ${fontSize}px Arial, sans-serif`;
 letteringContext.textAlign='center';letteringContext.textBaseline='middle';
 letteringContext.fillStyle='#fff';letteringContext.fillText('DigiInn',320,90);
 const pixels=letteringContext.getImageData(0,0,640,180).data;
 const samples:number[]=[];
 for(let y=0;y<180;y+=2)for(let x=0;x<640;x+=2){
  if(pixels[(y*640+x)*4+3]>160)samples.push(x,y);
 }
 if(samples.length){
  const textCount=Math.floor(count*.64);
  for(let i=0;i<textCount;i++){
   const sample=Math.floor(random()*(samples.length/2))*2;
   const j=i*3;
   ring[j]=(samples[sample]-320)*(2.65/580)+(random()-.5)*.006;
   ring[j+1]=(90-samples[sample+1])*(2.65/580)+(random()-.5)*.006;
   ring[j+2]=(random()-.5)*.025;
  }
 }
}
const geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
const material=new THREE.PointsMaterial({size:mobile?.052:.043,vertexColors:true,transparent:true,opacity:.95,blending:THREE.NormalBlending,depthWrite:false});
const points=new THREE.Points(geometry,material);
points.frustumCulled=false;
scene.add(points);
const inspection = new THREE.Group();
const monitoring = new THREE.Group();
points.add(inspection,monitoring);
const findings:THREE.Mesh[]=[];
for(const [x,y,z] of [[.75,.8,.9],[-.65,-.6,.95],[.8,-.7,.7]]){
 const dot=new THREE.Mesh(new THREE.SphereGeometry(.075,8,8),new THREE.MeshBasicMaterial({color:inkColor,transparent:true,opacity:0,depthWrite:false}));
 dot.position.set(x,y,z); inspection.add(dot); findings.push(dot);
}
const sweepMaterial=new THREE.MeshBasicMaterial({color:inkColor,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});
const sweep=new THREE.Mesh(new THREE.CircleGeometry(1.75,40,0,.45),sweepMaterial);
monitoring.add(sweep);
const crossMaterial=new THREE.LineBasicMaterial({color:inkColor,transparent:true,opacity:0});
const cross=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
 new THREE.Vector3(-1.9,0,0),new THREE.Vector3(1.9,0,0),
 new THREE.Vector3(0,-1.9,0),new THREE.Vector3(0,1.9,0)
]),crossMaterial);
monitoring.add(cross);
const signals:THREE.Mesh[]=[];
for(const [x,y] of [[.9,.65],[-1.05,.35],[.4,-1.25]]){
 const signal=new THREE.Mesh(new THREE.RingGeometry(.055,.085,24),new THREE.MeshBasicMaterial({color:inkColor,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
 signal.position.set(x,y,.06);monitoring.add(signal);signals.push(signal);
}
const pointer={x:0,y:0};
const pointerTarget={x:0,y:0};
const poses=[scattered,software,scan,shield,orbit,network,ring];
const smooth=(value:number)=>value*value*(3-2*value);
// Per-chapter art direction: x, y, depth, scale, tilt. Alternate the visual
// across the reading plane, then approach the camera between chapters.
const shots = [
 [1.8,0,0,1,0],[-1.85,-.1,-.6,.85,-.25],
 [1.9,.1,.6,1.08,.25],[-1.8,-.2,-.5,.92,-.15],
 [1.7,.1,0,1.04,.05],[-1.7,0,-.3,.95,-.2],
 [2.1,0,.4,1.12,.5]
];
window.addEventListener('pointermove',event=>{
 if(event.pointerType==='touch')return;
 pointerTarget.x=(event.clientX/innerWidth-.5)*.45;
 pointerTarget.y=(event.clientY/innerHeight-.5)*.45;
},{passive:true});
const centerPointer=()=>{pointerTarget.x=0;pointerTarget.y=0;};
document.documentElement.addEventListener('pointerleave',centerPointer);
window.addEventListener('blur',centerPointer);
function resize(){const w=innerWidth,h=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();points.position.set(w<700?.35:1.65,w<700?-1.35:0,0);points.scale.setScalar(w<700?.76:1);}
window.addEventListener('resize',resize); resize();
let time=0, previous=0, lastProgress=-1;
function frame(now:number){
 requestAnimationFrame(frame);
 const delta=Math.min((now-previous)/1000,.05);previous=now;
 if(document.hidden)return;
 const p=state.progress;
 const frozen=paused||reduced.matches;
 if(frozen&&lastProgress===p)return;
 if(!frozen)time+=delta;
 if(!frozen){
  pointer.x=THREE.MathUtils.damp(pointer.x,pointerTarget.x,5,delta);
  pointer.y=THREE.MathUtils.damp(pointer.y,pointerTarget.y,5,delta);
 }
 // Map the interpolated scroll position to real chapter positions, not equal bins.
 const scroll=scrollY;
 let chapter=0;
 while(chapter<poses.length-2 && scroll>=chapterOffsets[chapter+1])chapter++;
 const next=Math.min(chapter+1,poses.length-1);
 const distance=Math.max(1,chapterOffsets[next]-chapterOffsets[chapter]);
 const local=THREE.MathUtils.clamp((scroll-chapterOffsets[chapter])/distance,0,1);
 // Hold each composition for reading; move mostly through the chapter handoff.
 const blend=smooth(THREE.MathUtils.clamp((local-.38)/.57,0,1));
 // Assembly and shield closure happen during the reading beat. Reverse
 // scrolling disassembles them; there is no looping explosion behind the copy.
 const settle=1-smooth(THREE.MathUtils.clamp(local/.3,0,1));
 const actionOffset=(pose:number,index:number,incoming:boolean)=>{
  const opening=reduced.matches?0:(incoming?1:settle);
  return pose===1 ? buildOffsets[index]*opening : pose===3 ? guardOffsets[index]*opening : 0;
 };
 for(let i=0;i<positions.length;i++)positions[i]=THREE.MathUtils.lerp(
  poses[chapter][i]+actionOffset(chapter,i,false),
  poses[next][i]+actionOffset(next,i,true),blend);
 geometry.attributes.position.needsUpdate=true;
 const shot=shots[chapter], target=shots[next];
 const interpolate=(axis:number)=>THREE.MathUtils.lerp(shot[axis],target[axis],blend);
 const isMobile=innerWidth<700;
 // Anchor visuals in the outer reading gutters rather than close to the copy.
 const halfWidth=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*7.4*camera.aspect;
 const side=(index:number)=>Math.sign(shots[index][0]);
 const gutter=(_index:number)=>.5;
 const x=THREE.MathUtils.lerp(side(chapter)*gutter(chapter),side(next)*gutter(next),blend)*halfWidth;
 const baseScale=(index:number)=>index===2?.75:.95;
 const shapeScale=THREE.MathUtils.lerp(baseScale(chapter),baseScale(next),blend);
 points.position.set((isMobile?0:x)+(frozen?0:pointer.x*.1),(isMobile?-1.9:interpolate(1))-(frozen?0:pointer.y*.08),-.4);
 points.scale.setScalar((isMobile?.65:Math.min(shapeScale,halfWidth*.38/1.8))*interpolate(3));
 const particleOpacity=chapter===0?THREE.MathUtils.lerp(.62,.95,blend):.95;
 material.opacity=particleOpacity*(1-.8*Math.sin(blend*Math.PI));
 inspection.visible=monitoring.visible=true;
 // Keep application layers and the protective boundary readable from the front.
 const yaw=[.3,-.4,.35,.05,.4,.15,0];
 // One continuous, bounded idle angle. Changing chapters must never switch
 // between accumulated rotation and a near-zero wobble (the previous snap).
 const idleAmplitude=[.12,.035,.08,.035,.015,.08,0];
 const idle=Math.sin(time*.25)*THREE.MathUtils.lerp(idleAmplitude[chapter],idleAmplitude[next],blend);
 const wordmarkWeight=next===6?blend:0;
 points.rotation.y=THREE.MathUtils.lerp(yaw[chapter],yaw[next],blend)+(frozen?0:idle+pointer.x*(1-wordmarkWeight));
 points.rotation.x=(frozen?.1:pointer.y+interpolate(4))*(1-wordmarkWeight);
 points.rotation.z=p*-.3*(1-wordmarkWeight);
 const weight=(index:number)=>(chapter===index?1-blend:0)+(next===index?blend:0);
 const auditWeight=weight(2), radarWeight=weight(4);
 findings.forEach(dot=>{(dot.material as THREE.MeshBasicMaterial).opacity=auditWeight*.95;});
 sweepMaterial.opacity=radarWeight*.22;
 crossMaterial.opacity=radarWeight*.4;
 const sweepAngle=frozen?local*Math.PI*2:time*.35+local*Math.PI*2;
 sweep.rotation.z=sweepAngle;
 signals.forEach(signal=>{
  const angle=Math.atan2(signal.position.y,signal.position.x);
  const age=((sweepAngle-angle)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
  (signal.material as THREE.MeshBasicMaterial).opacity=radarWeight*(reduced.matches?.9:.3+.7*Math.exp(-age*1.5));
 });
 renderer.render(scene,camera);lastProgress=p;
}
requestAnimationFrame(frame);
window.addEventListener('pagehide',()=>{
 renderer.dispose();geometry.dispose();material.dispose();
 for(const group of [inspection,monitoring])group.traverse(object=>{
  if(object instanceof THREE.Mesh||object instanceof THREE.LineSegments){object.geometry.dispose();(object.material as THREE.Material).dispose();}
 });
},{once:true});
}catch(error){
 host.innerHTML='<div class="fallback-orb"></div>';
 console.warn('WebGL unavailable; using the static artwork.',error);
}
