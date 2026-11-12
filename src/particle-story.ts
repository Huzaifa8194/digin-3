import * as THREE from 'three';

export function mountParticleStory(
  chapters: readonly HTMLElement[],
  getChapterOffsets: () => readonly number[],
  getProgress: () => number,
  reduced: MediaQueryList,
  touchLayout = false,
) {
  const host = document.querySelector<HTMLDivElement>('#scene')!;
  try {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0xffffff, 1);
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
  camera.position.z = 7;
  const mobile = touchLayout || innerWidth <= 700;
  const count = mobile ? 2400 : 5200;
  const positions = new Float32Array(count * 3);
  const scattered = new Float32Array(count * 3);
  const sphere = new Float32Array(count * 3);
  const software = new Float32Array(count * 3);
  const buildOffsets = new Float32Array(count * 3);
  const guardOffsets = new Float32Array(count * 3);
  const ring = new Float32Array(count * 3);
  const audit = new Float32Array(count * 3);
  const shield = new Float32Array(count * 3);
  const orbit = new Float32Array(count * 3);
  const network = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const shieldOutline = [[-1.45,1.2],[0,1.65],[1.45,1.2],[1.25,-.35],[0,-1.7],[-1.25,-.35]];
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
    const edge=i%6, a=shieldOutline[edge], b=shieldOutline[(edge+1)%6], along=random();
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
   const shade=new THREE.Color(0x347eb8).lerp(new THREE.Color(0x7ab6df),random()); colors[j]=shade.r; colors[j+1]=shade.g; colors[j+2]=shade.b;
  }
  // A magnifier isolates an open circuit on a board with two incoming test paths.
  const auditPaths = [
   new THREE.Path().moveTo(-1.7,-.94).lineTo(-1.7,.92).lineTo(-1.42,1.2)
    .lineTo(1.47,1.2).lineTo(1.72,.95).lineTo(1.72,-.94)
    .lineTo(1.47,-1.19).lineTo(-1.45,-1.19).closePath(),
   new THREE.Path().moveTo(-1.4,.66).lineTo(-1.07,.66).lineTo(-.77,.18).lineTo(.03,.18),
   new THREE.Path().moveTo(-1.4,-.57).lineTo(-1.07,-.57).lineTo(-.77,.18),
   new THREE.Path().moveTo(.53,.18).lineTo(1.17,.18).lineTo(1.39,.53),
   new THREE.Path().moveTo(-1.4,.9).lineTo(-.83,.9).lineTo(-.62,.7),
   new THREE.Path().moveTo(-1.41,-.87).lineTo(-.7,-.87).lineTo(-.45,-.62),
   new THREE.Path().absarc(-1.4,.66,.07,0,Math.PI*2,false),
   new THREE.Path().absarc(-1.4,-.57,.07,0,Math.PI*2,false),
   new THREE.Path().absarc(1.39,.53,.07,0,Math.PI*2,false),
   new THREE.Path().absarc(.28,.18,.73,0,Math.PI*2,false),
   new THREE.Path().moveTo(.79,-.34).lineTo(1.35,-.92).lineTo(1.24,-1.02)
    .lineTo(.68,-.44).closePath(),
  ];
  const auditLengths = auditPaths.map(path => path.getLength());
  const auditLength = auditLengths.reduce((total,length) => total+length,0);
  let auditIndex = 0;
  let pathLengthSoFar = 0;
  auditPaths.forEach((path,pathIndex) => {
   const start = auditIndex;
   pathLengthSoFar += auditLengths[pathIndex];
   const end = Math.round(count*pathLengthSoFar/auditLength);
   const samples = path.getSpacedPoints(end-start);
   const isLens = pathIndex >= auditPaths.length-2;
   for(;auditIndex<end;auditIndex++){
    const sample = samples[auditIndex-start];
    const j = auditIndex*3;
    audit[j] = sample.x+(random()-.5)*.035;
    audit[j+1] = sample.y+(random()-.5)*.035;
    audit[j+2] = (isLens?.23:-.08)+(random()-.5)*.16;
   }
  });
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
  // The open contacts turn green and a bridge grows across them during retest.
  const faultColor = new THREE.Color(0xd60027);
  const passColor = new THREE.Color(0x08784f);
  const contactMaterial = new THREE.MeshBasicMaterial({
   color:faultColor,transparent:true,opacity:0,depthWrite:false,
  });
  const contactGeometry = new THREE.PlaneGeometry(.105,.105);
  for(const x of [.03,.53]){
   const contact = new THREE.Mesh(contactGeometry,contactMaterial);
   contact.position.set(x,.18,.18);
   contact.rotation.z = Math.PI/4;
   inspection.add(contact);
  }
  const bridgeMaterial = new THREE.MeshBasicMaterial({
   color:passColor,transparent:true,opacity:0,depthWrite:false,
  });
  const bridge = new THREE.Mesh(new THREE.PlaneGeometry(.5,.055),bridgeMaterial);
  bridge.position.set(.03,.18,.17);
  inspection.add(bridge);
  const sweepMaterial=new THREE.MeshBasicMaterial({color:0xd60027,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false});
  const sweep=new THREE.Mesh(new THREE.CircleGeometry(1.75,40,0,.45),sweepMaterial);
  monitoring.add(sweep);
  const crossMaterial=new THREE.LineBasicMaterial({color:0x555c66,transparent:true,opacity:0});
  const cross=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
   new THREE.Vector3(-1.9,0,0),new THREE.Vector3(1.9,0,0),
   new THREE.Vector3(0,-1.9,0),new THREE.Vector3(0,1.9,0)
  ]),crossMaterial);
  monitoring.add(cross);
  const signals:THREE.Mesh[]=[];
  for(const [x,y] of [[.9,.65],[-1.05,.35],[.4,-1.25]]){
   const signal=new THREE.Mesh(new THREE.RingGeometry(.055,.085,24),new THREE.MeshBasicMaterial({color:0xd60027,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
   signal.position.set(x,y,.06);monitoring.add(signal);signals.push(signal);
  }
  const pointer={x:0,y:0};
  const pointerTarget={x:0,y:0};
  const poses=[scattered,software,audit,shield,orbit,network,ring];
  const poseByChapter: Record<string,number> = {
   home:0, build:1, test:2, protect:3, watch:4, people:5, connect:6,
  };
  const chapterPoses = chapters.map(chapter => poseByChapter[chapter.id]);
  const smooth=(value:number)=>value*value*(3-2*value);
  // Per-chapter art direction: x, y, depth, scale, tilt. Alternate the visual
  // across the reading plane, then approach the camera between chapters.
  const shots = [
   [1.8,0,0,1,0],[-1.85,-.1,-.6,.85,-.25],
   [1.9,.1,.6,1.08,.08],[-1.8,-.2,-.5,.92,-.15],
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
  const auditProducts = document.querySelector<HTMLElement>('#test .story-products')!;
  let auditCenter = .5;
  let auditSpace = 0;
  function resize() {
   const width = document.documentElement.clientWidth;
   const height = innerHeight;
   renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
   renderer.setSize(width,height,false);
   lastScroll = -1;
   camera.aspect = width/height;
   camera.updateProjectionMatrix();

   const left = Math.max(width*.55,auditProducts.getBoundingClientRect().right+24);
   const right = width*.95;
   auditSpace = Math.max(0,(right-left)/width);
   auditCenter = (left+right)/width-1;
  }
  let time=0, previous=0, lastScroll=-1;
  window.addEventListener('resize',resize); resize();
  function frame(now:number){
   requestAnimationFrame(frame);
   const delta=Math.min((now-previous)/1000,.05);previous=now;
   if(document.hidden)return;
   const scroll=scrollY;
   const frozen=reduced.matches;
   if (touchLayout && !host.classList.contains("scene-in-story")) return;
   if (frozen && lastScroll===scroll) return;
   if(!frozen)time+=delta;
   if(!frozen){
    pointer.x=THREE.MathUtils.damp(pointer.x,pointerTarget.x,5,delta);
    pointer.y=THREE.MathUtils.damp(pointer.y,pointerTarget.y,5,delta);
   }
   // Map the interpolated scroll position to real chapter positions, not equal bins.
   const offsets = getChapterOffsets();
   let chapter=0;
   while(chapter<chapters.length-2 && scroll>=offsets[chapter+1])chapter++;
   const next=Math.min(chapter+1,chapters.length-1);
   const chapterPose=chapterPoses[chapter], nextPose=chapterPoses[next];
   const distance=Math.max(1,offsets[next]-offsets[chapter]);
   const local=THREE.MathUtils.clamp((scroll-offsets[chapter])/distance,0,1);
   // Hold each composition for reading; move mostly through the chapter handoff.
   const blend=touchLayout && frozen ? Number(local >= .95) : smooth(THREE.MathUtils.clamp((local-.38)/.57,0,1));
   // Assembly and shield closure happen during the reading beat. Reverse
   // scrolling disassembles them; there is no looping explosion behind the copy.
   const settle=1-smooth(THREE.MathUtils.clamp(local/.3,0,1));
   const actionOffset=(pose:number,index:number,incoming:boolean)=>{
    const opening=reduced.matches?0:(incoming?1:settle);
    return pose===1 ? buildOffsets[index]*opening : pose===3 ? guardOffsets[index]*opening : 0;
   };
   for(let i=0;i<positions.length;i++)positions[i]=THREE.MathUtils.lerp(
    poses[chapterPose][i]+actionOffset(chapterPose,i,false),
    poses[nextPose][i]+actionOffset(nextPose,i,true),blend);
   geometry.attributes.position.needsUpdate=true;
   const shot=shots[chapterPose], target=shots[nextPose];
   const interpolate=(axis:number)=>THREE.MathUtils.lerp(shot[axis],target[axis],blend);
   const isMobile=touchLayout || innerWidth<=700;
   // Anchor visuals in the outer reading gutters rather than close to the copy.
   const halfWidth=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*7.4*camera.aspect;
   const side=(index:number)=>Math.sign(shots[index][0]);
   const weight=(index:number)=>(chapterPose===index?1-blend:0)+(nextPose===index?blend:0);
   const auditWeight=weight(2), radarWeight=weight(4);
   const fitAuditInGutter=document.documentElement.clientWidth>=1000;
   const gutter=(index:number)=>index===2 && fitAuditInGutter ? auditCenter : .5;
   const x=THREE.MathUtils.lerp(side(chapterPose)*gutter(chapterPose),side(nextPose)*gutter(nextPose),blend)*halfWidth;
   // Leave clearance for the corners when the board tilts.
   const auditScale=fitAuditInGutter ? Math.min(.88,halfWidth*auditSpace/2.35) : .55;
   const baseScale=(index:number)=>index===2 ? auditScale : .95;
   const shapeScale=THREE.MathUtils.lerp(baseScale(chapterPose),baseScale(nextPose),blend);
   const pointerInfluence=THREE.MathUtils.lerp(1,.2,auditWeight);
   const pointerX=frozen ? 0 : pointer.x*pointerInfluence;
   const pointerY=frozen ? 0 : pointer.y*pointerInfluence;
   points.position.set((isMobile?0:x)+pointerX*.1,(isMobile?-1.9:interpolate(1))-pointerY*.08,-.4);
   points.scale.setScalar((isMobile?.65:Math.min(shapeScale,halfWidth*.38/1.8))*interpolate(3));
   const particleOpacity=chapter===0?THREE.MathUtils.lerp(.62,.95,blend):.95;
   material.opacity=particleOpacity*(1-.8*Math.sin(blend*Math.PI));
   inspection.visible=monitoring.visible=true;
   // Keep application layers and the protective boundary readable from the front.
   const yaw=[.3,-.4,.14,.05,.4,.15,0];
   // One continuous, bounded idle angle. Changing chapters must never switch
   // between accumulated rotation and a near-zero wobble (the previous snap).
   const idleAmplitude=[.12,.035,.02,.035,.015,.08,0];
   const idle=Math.sin(time*.25)*THREE.MathUtils.lerp(idleAmplitude[chapterPose],idleAmplitude[nextPose],blend);
   const wordmarkWeight=nextPose===6?blend:0;
   points.rotation.y=THREE.MathUtils.lerp(yaw[chapterPose],yaw[nextPose],blend)+(frozen?0:idle+pointerX*(1-wordmarkWeight));
   points.rotation.x=(frozen?.1:pointerY+interpolate(4))*(1-wordmarkWeight);
   points.rotation.z=THREE.MathUtils.lerp(getProgress()*-.3,-.025,auditWeight)*(1-wordmarkWeight);
   const repair = chapterPose===2 ? smooth(THREE.MathUtils.clamp((local-.17)/.18,0,1)) : 0;
   contactMaterial.color.copy(faultColor).lerp(passColor,repair);
   contactMaterial.opacity=auditWeight;
   bridge.scale.x=repair;
   bridge.position.x=.03+.25*repair;
   bridgeMaterial.opacity=auditWeight*repair;
   sweepMaterial.opacity=radarWeight*.22;
   crossMaterial.opacity=radarWeight*.4;
   const sweepAngle=frozen?local*Math.PI*2:time*.35+local*Math.PI*2;
   sweep.rotation.z=sweepAngle;
   signals.forEach(signal=>{
    const angle=Math.atan2(signal.position.y,signal.position.x);
    const age=((sweepAngle-angle)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
    (signal.material as THREE.MeshBasicMaterial).opacity=radarWeight*(reduced.matches?.9:.3+.7*Math.exp(-age*1.5));
   });
   renderer.render(scene,camera);lastScroll=scroll;
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
}
