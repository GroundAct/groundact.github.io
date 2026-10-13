/* GroundAct / original-figure motion layer v4.2
 * Plain JavaScript. No packages, trackers, network calls, or publishing code.
 * Original artwork is progressively revealed. The architecture invariant bar is a synced HTML layer.
 * Only motivation figures use an optional explanatory view; result data is reused.
 * All schematic trajectories are explanatory, not recorded model rollouts.
 */
(() => {
 'use strict';
 if (window.GroundActMotion) return;
 const $ = (s, root=document) => root.querySelector(s);
 const $$ = (s, root=document) => [...root.querySelectorAll(s)];
 const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));
 const ease = x => {x=clamp(x);return x*x*(3-2*x)};
 const phase = (t,a,b) => ease((t-a)/(b-a));
 const lerp = (a,b,t) => a+(b-a)*t;
 const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const stamp = t => `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
 const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
 const stories=[];let quiet=false;let uid=0;
 const el = (tag,cls,html='') => {const n=document.createElement(tag);if(cls)n.className=cls;n.innerHTML=html;return n};
 function makeStory(title,visual,steps,duration,options={}){
  const root=el('section',`ga-motion ga-frame ${options.className||''}`);root.setAttribute('aria-label',title);
  root.innerHTML=`${options.chapters?`<div class="ga-chapters ${steps.length>4?'ga-six':''}" aria-label="Animation chapters">${steps.map((s,i)=>`<button class="ga-chapter" type="button" data-ga-chapter="${i}"><span>${String(i+1).padStart(2,'0')}</span>${esc(s.short||s.title)}</button>`).join('')}</div>`:''}${visual}`;
  return {root,steps,duration};
 }
 class Story{
  constructor(root,steps,duration,render,options={}){
   this.root=root;this.steps=steps;this.duration=duration;this.renderVisual=render;this.time=reduced.matches?duration:0;this.wanted=false;this.visible=false;this.started=false;this.raf=0;this.previous=0;this.chapter=-1;this.options=options;
   this.showCaption=options.caption!==false;
   root.dataset.caption=this.showCaption?'shown':'omitted';
   const captionMarkup=this.showCaption?'<div class="ga-caption"><span class="ga-caption-number">01</span><div><span class="ga-caption-title"></span><span class="ga-caption-text"></span></div></div>':'';
   this.footer=el('div','ga-story-footer',`${captionMarkup}<div class="ga-controls"><button class="ga-control ga-play" type="button" aria-label="Play animation">&#9654; Play</button><button class="ga-control ga-replay" type="button" aria-label="Replay animation">&#8635;</button><input type="range" min="0" max="${duration}" step="0.02" value="0" aria-label="${esc(options.label||'Animation')} progress"><output class="ga-clock"></output></div><div class="ga-live" role="status" aria-live="polite"></div>`);
   root.append(this.footer);this.playButton=$('.ga-play',this.footer);this.replayButton=$('.ga-replay',this.footer);this.slider=$('input',this.footer);
   this.playButton.addEventListener('click',()=>{if(reduced.matches)return;if(this.time>=this.duration-.02)this.time=0;this.wanted=!this.wanted;if(this.wanted&&quiet)setQuiet(false);this.started=true;this.sync()});
   this.replayButton.addEventListener('click',()=>{if(reduced.matches)return;this.time=0;this.wanted=true;this.started=true;if(quiet)setQuiet(false);this.apply();this.sync()});
   this.slider.addEventListener('input',()=>{this.wanted=false;this.started=true;this.time=Number(this.slider.value);this.apply();this.sync()});
   $$('[data-ga-chapter]',root).forEach(b=>b.addEventListener('click',()=>this.seek(this.steps[Number(b.dataset.gaChapter)].at+.01,false)));
   this.onReduced=()=>{if(reduced.matches){this.wanted=false;this.time=this.duration}this.apply();this.sync()};
   reduced.addEventListener('change',this.onReduced);
   const visibilityThreshold=options.visibilityThreshold||.07;this.io=new IntersectionObserver(entries=>{const entry=entries[entries.length-1];this.visible=entry.isIntersecting&&entry.intersectionRatio>=visibilityThreshold;if(this.visible&&!this.started){this.started=true;this.wanted=!reduced.matches&&options.autoplay!==false}this.sync()},{threshold:[0,visibilityThreshold,Math.min(1,visibilityThreshold+.08)]});this.io.observe(root);
   stories.push(this);this.apply();this.sync();
  }
  seek(t,play=false){this.time=clamp(t,0,this.duration);this.wanted=play&&!reduced.matches;this.started=true;this.apply();this.sync()}
  apply(){
   this.renderVisual(this.time,this.duration);
   let c=0;this.steps.forEach((s,i)=>{if(this.time>=s.at)c=i});
   if(c!==this.chapter){this.chapter=c;const s=this.steps[c];if(this.showCaption){$('.ga-caption-number',this.footer).textContent=String(c+1).padStart(2,'0');$('.ga-caption-title',this.footer).textContent=s.title;$('.ga-caption-text',this.footer).textContent=s.text||'';}$('.ga-live',this.footer).textContent=`${s.title} ${s.text||''}`;$$('[data-ga-chapter]',this.root).forEach((b,i)=>{if(i===c)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')})}
   this.slider.value=String(this.time);$('.ga-clock',this.footer).textContent=`${stamp(this.time)} / ${stamp(this.duration)}`;
  }
  sync(){
   const playing=this.wanted&&this.visible&&!document.hidden&&!quiet&&!reduced.matches&&this.time<this.duration;
   this.root.dataset.playing=String(playing);this.playButton.innerHTML=reduced.matches?'Reduced motion':playing?'&#10074;&#10074; Pause':'&#9654; Play';this.playButton.setAttribute('aria-label',reduced.matches?'Animations reduced; use chapters or timeline':playing?'Pause animation':'Play animation');this.playButton.disabled=reduced.matches;this.replayButton.disabled=reduced.matches;
   if(playing&&!this.raf){this.previous=0;this.raf=requestAnimationFrame(t=>this.tick(t))}
   if(!playing&&this.raf){cancelAnimationFrame(this.raf);this.raf=0}
  }
  tick(now){
   this.raf=0;if(!(this.wanted&&this.visible&&!document.hidden&&!quiet&&!reduced.matches))return this.sync();
   if(this.previous)this.time=Math.min(this.duration,this.time+Math.min(.1,(now-this.previous)/1000));this.previous=now;this.apply();
   if(this.time>=this.duration){this.wanted=false;this.sync()}else this.raf=requestAnimationFrame(t=>this.tick(t));
  }
 }
 function setQuiet(value){quiet=value;stories.forEach(s=>s.sync());const b=$('.ga-motion-global');if(b){b.setAttribute('aria-pressed',String(quiet));$('span',b).textContent=quiet?'Resume new animations':'Pause new animations'}}
 document.addEventListener('visibilitychange',()=>stories.forEach(s=>s.sync()));
 function replaceFigure(figure,newRoot){
  if(!figure||!figure.parentNode)return;
  const wrapper=el('div','ga-figure-replacement');
  wrapper.append(newRoot);
  // Remove the optional original-figure disclosure, not the source asset.
  // Before this enhancement runs, the source figure remains the HTML fallback.
  figure.replaceWith(wrapper);
  return wrapper;
 }
 function gapModule(figure){
  const rows=[['Alpamayo 1.5','causal',28.95,2.15],['SpanVLA','semantic',30.30,3.03],['FSDrive','future + spatial',40.35,7.02],['GroundAct','ours',5.10,3.20]];
  const steps=[{at:0,title:'Condition on correctly grounded reasoning.',text:'The audit asks how often the resulting plan still collides.'},{at:1.2,title:'Grounded reasoning can still leave a transfer gap.',text:'Different grounding interfaces do not automatically ground the plan.'},{at:1.8,title:'Keep grounding consequential through planning.',text:'GroundAct has a smaller gap in the reported audit.'},{at:2.5,title:'Read the ranges, not a guarantee.',text:'Bars show midpoints; whiskers show half-ranges, not confidence intervals.'}];
  const visual=`<div class="ga-surface"><div class="ga-topline"><span class="ga-kicker">The transfer gap</span><span class="ga-pill">Lower is better</span></div><p class="ga-gap-formula"><strong>P(collision | correctly grounded reasoning)</strong><br>Correct reasoning is the starting condition, not the outcome.</p><div aria-label="Reported transfer gap, percent">${rows.map((r,i)=>`<div class="ga-gap-row ${i===3?'ga-ours':''}" data-gap-row="${i}"><div class="ga-gap-label">${r[0]}<small>${r[1]}</small></div><div class="ga-gap-track"><span class="ga-gap-bar" style="width:${r[2]*2}%"></span><i class="ga-gap-whisker" style="left:${(r[2]-r[3])*2}%;width:${r[3]*4}%"></i></div><div class="ga-gap-value">${r[2].toFixed(2)} &plusmn; ${r[3].toFixed(2)}</div></div>`).join('')}</div><div class="ga-gap-axis"><span>0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span></div><p class="ga-gap-axis-title">Transfer gap (%)</p></div>`;
  const {root}=makeStory('Grounding-to-plan transfer gap',visual,steps,3.6,{className:'ga-gap'});replaceFigure(figure,root);
  const bars=$$('.ga-gap-bar',root),whiskers=$$('.ga-gap-whisker',root);
  new Story(root,steps,3.6,t=>{const p=phase(t,.08,.98);bars.forEach((bar,i)=>{bar.style.transform=`scaleX(${p})`;whiskers[i].style.opacity=String(phase(t,.82,1.18))})},{label:'Transfer gap - simultaneous reveal',caption:false});
 }
 function carMarkup(fill='#202020'){
  return `<rect x="-11" y="-6" width="22" height="12" rx="4" fill="${fill}"/><path d="M2 -4H7L9 -2V2L7 4H2Z" fill="#e4e9db"/><path d="M-7 -4H-3V4H-7Z" fill="#98a28b"/>`;
 }
 function placeCar(node,path,fraction){const length=path.getTotalLength(),d=clamp(fraction)*length,p=path.getPointAtLength(d),n=path.getPointAtLength(Math.min(length,d+1)),prev=path.getPointAtLength(Math.max(0,d-1));const angle=Math.atan2(n.y-prev.y,n.x-prev.x)*180/Math.PI;node.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${angle})`)}
 function scenarioModule(figure){
  const steps=[{at:0,title:'One symbolic intent. Two physical situations.',text:'The same left-turn intent does not specify when to slow or accelerate.'},{at:3,title:'A leading vehicle closes the available gap.',text:'The ego vehicle slows as it approaches the lead vehicle.'},{at:8,title:'Cross traffic changes the timing.',text:'The ego vehicle yields, then accelerates after the crossing vehicle clears.'},{at:15,title:'The physical interaction shapes the action.',text:'Compare the timing, not just the language. Schematic, not recorded rollouts.'}];
  const visual=`<div class="ga-surface"><div class="ga-topline"><span class="ga-kicker">Same reasoning, different actions</span><span class="ga-pill">Schematic</span></div><div class="ga-shared-intent"><span>SHARED INTENT</span>Follow the route and turn left ... traffic ahead<br>... adjust speed to maintain clearance.</div><div class="ga-scene-titles"><div>Lead vehicle<span>Slow as the gap closes</span></div><div>Crossing vehicle<span>Yield, then accelerate</span></div></div><svg class="ga-scene-svg" viewBox="0 0 500 235" role="img" aria-label="Two schematic left turns with different speed profiles"><g transform="translate(4,0)"><path class="ga-road" d="M182 160V92Q182 58 142 58H28"/><path class="ga-road-center" d="M182 160V92Q182 58 142 58H28"/><path data-lead-path class="ga-trajectory" d="M182 158V92Q182 58 142 58H28"/><g data-lead-car>${carMarkup()}</g><g transform="translate(74 58) rotate(180)">${carMarkup('#e97824')}</g><text x="68" y="28" class="ga-scene-heading">lead</text><text x="16" y="199" class="ga-scene-heading">speed</text><path d="M56 177V221H219" stroke="#d6ddd0" fill="none"/><path data-lead-speed class="ga-speed-path" d="M61 184C104 184 109 209 154 212S199 215 214 216"/><text x="218" y="233" class="ga-scene-heading">time</text></g><path d="M250 7V223" stroke="#e8ece2"/><g transform="translate(255,0)"><path class="ga-road" d="M180 160V94Q180 58 140 58H27"/><path class="ga-road" d="M27 58H218"/><path class="ga-road-center" d="M180 160V94Q180 58 140 58H27M180 58H218"/><path data-cross-path class="ga-trajectory" d="M180 158V94Q180 58 140 58H27"/><g data-cross-car>${carMarkup()}</g><g data-crossing>${carMarkup('#287bd1')}</g><text x="25" y="28" class="ga-scene-heading">crossing</text><text x="14" y="199" class="ga-scene-heading">speed</text><path d="M54 177V221H219" stroke="#d6ddd0" fill="none"/><path data-cross-speed class="ga-speed-path" d="M59 214C97 220 123 220 140 213S170 183 214 180"/><text x="218" y="233" class="ga-scene-heading">time</text></g></svg><div class="ga-speed-legend"><span><span class="ga-key-ego">Ego</span> &nbsp; <span class="ga-key-lead">Lead vehicle</span> &nbsp; <span class="ga-key-cross">Crossing vehicle</span></span></div></div>`;
  const {root}=makeStory('Same intent, different physical actions',visual,steps.map(s=>({...s,at:s.at/1.8})),10,{className:'ga-scene'});replaceFigure(figure,root);
  const lp=$('[data-lead-path]',root),cp=$('[data-cross-path]',root),ls=$('[data-lead-speed]',root),cs=$('[data-cross-speed]',root),lc=$('[data-lead-car]',root),cc=$('[data-cross-car]',root),cross=$('[data-crossing]',root);
  const lLen=lp.getTotalLength(),cLen=cp.getTotalLength(),sLen1=ls.getTotalLength(),sLen2=cs.getTotalLength();
  new Story(root,steps.map(s=>({...s,at:s.at/1.8})),10,playbackTime=>{
   const t=playbackTime*1.8;
   const a=phase(t,3,9),b=phase(t,8,15);placeCar(lc,lp,.06+.51*(1-Math.pow(1-a,2)));placeCar(cc,cp,.04+.09*phase(t,3,6)+.78*b);cross.setAttribute('transform',`translate(${lerp(26,239,phase(t,4,9))} 58)`);
   [[lp,lLen,.05+.66*a],[cp,cLen,.05+.91*phase(t,7.5,15)],[ls,sLen1,a],[cs,sLen2,phase(t,5,15)]].forEach(([p,length,q])=>{p.style.strokeDasharray=String(length);p.style.strokeDashoffset=String(length*(1-q))});
  },{label:'Paired physical situations',caption:false});
 }

 // Figure coordinates are normalized to the ORIGINAL artwork, not a redrawn diagram.
 const svgNode=(tag,attrs={})=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));return n};
 function tracePaths(group,paths,progress,visible=true){
  if(group.dataset.paths!==JSON.stringify(paths)){
   group.dataset.paths=JSON.stringify(paths);group.replaceChildren();
   paths.forEach((d,i)=>{const g=svgNode('g',{'data-route':i});g.append(svgNode('path',{d,fill:'none',stroke:'#55762a','stroke-width':2.4,'stroke-linecap':'round',class:'ga-trace-line'}),svgNode('circle',{r:4,fill:'#76b900',stroke:'#fff','stroke-width':1.4,class:'ga-trace-dot'}));group.append(g)});
  }
  group.setAttribute('opacity',visible?'1':'0');
  [...group.children].forEach(g=>{const line=g.firstElementChild,dot=g.lastElementChild,L=line.getTotalLength(),p=clamp(progress);line.setAttribute('stroke-dasharray',`${L} ${L}`);line.setAttribute('stroke-dashoffset',String(L*(1-p)));line.setAttribute('opacity',p<1?'.9':'.25');const at=line.getPointAtLength(L*p);dot.setAttribute('cx',at.x);dot.setAttribute('cy',at.y);dot.setAttribute('opacity',p>.002&&p<.998?'1':'0')});
 }
 function roleRibbon(compact=false){
  // Two functional roles; GroundAct spans their interface, not a third serial block.
  if(compact)return `<div class="ga-system-ribbon ga-role-framing ga-system-ribbon-hero" aria-label="System 2 reasons. System 1 acts. GroundAct keeps them physically connected."><p class="ga-role-lead"><span>System 2 reasons.</span> <span>System 1 acts.</span></p><p class="ga-role-hook"><strong>GroundAct</strong> keeps them <em>physically connected.</em></p><p class="ga-role-tagline">The grounded reasoning&ndash;action bridge.</p></div>`;
  return `<div class="ga-system-ribbon ga-role-framing" data-role-layout="spanning-interface" aria-label="System 2 VLM reasoning and System 1 action generation, connected through GroundAct's shared physical references"><div class="ga-role-lane"><div class="ga-role-endpoint" data-system-role="2"><small>SYSTEM 2</small><strong>Reason</strong><span>VLM reasoner</span></div><div class="ga-role-link" aria-hidden="true"><i></i><span>Shared physical references</span><i></i></div><div class="ga-role-endpoint" data-system-role="1"><small>SYSTEM 1</small><strong>Act</strong><span>Action expert</span></div></div><div class="ga-system-bridge"><small>THE GROUNDED REASONING&ndash;ACTION BRIDGE</small><strong>GroundAct</strong><span>Shared entity states. Explicit references. Interaction-driven refinement.</span></div></div>`;
 }
 function systemsModule(){
  const hero=$('.hero .container')||$('.hero');
  if(hero&&!$('.ga-system-ribbon-hero',hero)){
   const block=el('div','ga-systems-intro',roleRibbon(true));hero.append(block);
  }
 }
 function tokenModule(figure){
  const image=$('img',figure);if(!image)throw new Error('Original token comparison image is required.');
  const picture=image.closest('button')||image,src=image.getAttribute('src'),id=`ga-token-reveal-${++uid}`;
  const steps=[
   {at:0,title:'Start with the cameras.',text:'Two interfaces, the same visual input. The original figure unfolds along its arrows.'},
   {at:.8,title:'Encode the scene.',text:'The content path encodes grounded information. GroundAct also builds an addressable continuous state.'},
   {at:1.9,title:'Generate the reasoning tokens.',text:'GroundAct retains the content path and adds a reference token alongside the words.'},
   {at:4.1,title:'A reference points back to the physical state.',text:'The token supplies an address, not a text replacement for the stored state.'},
   {at:5.8,title:'Pass the information into planning.',text:'Content conditions the planner. The referenced continuous state is also preserved for GroundAct\'s explicit refinement path.'},
   {at:8.2,title:'Same original figure. Two different interfaces.',text:'Content-conditioned planning on the left; state-guided refinement on the right.'}
  ];
  // Reveal rectangles follow the existing pixels. Causal/spatial/future are alternative
  // content examples, so they are revealed together, not presented as sequential modules.
  // Encode captions are static mask windows, independent of animated arrow regions.
  const regions=[
   {name:'left-encode',box:[139,102,63,33],at:.55,end:1.35},
   {name:'right-encode',box:[553,97,72,45],at:.55,end:1.35},
   {name:'state-input-arrow',box:[481,156,108,27],at:.7,end:1.4},
   {name:'state-store',box:[444,181,245,73],at:1.4,end:1.95},
   {name:'content-tokens',box:[205,49,205,117],at:1.55,end:2.15},
   {name:'reason-label',box:[754,74,108,18],at:1.55,end:1.9},
   {name:'word-lead',box:[628,96,60,33],at:1.65,end:2.0},
   {name:'word-truck',box:[688,96,69,33],at:2.0,end:2.4},
   {name:'reference-token',box:[756,94,109,35],at:2.5,end:2.95},
   {name:'word-is',box:[865,96,35,33],at:3.0,end:3.35},
   {name:'word-braking',box:[900,96,72,33],at:3.35,end:3.75},
   {name:'pointer',box:[675,130,125,51],at:4.0,end:5.2},
   {name:'left-plan-arrow',box:[294,164,27,34],at:4.9,end:5.65},
   {name:'right-context-arrow',box:[630,131,341,19],at:4.9,end:5.5},
   {name:'right-plan-arrow',box:[793,149,37,46],at:5.05,end:5.85},
   {name:'state-plan-arrow',box:[687,200,72,47],at:5.45,end:6.35},
   {name:'left-planner',box:[259,200,96,42],at:5.85,end:6.35},
   {name:'right-planner',box:[764,200,96,38],at:6.35,end:6.8},
   {name:'left-outcome',box:[88,197,166,51],at:6.8,end:7.35},
   {name:'right-outcome',box:[862,194,119,51],at:7.1,end:7.65}
  ];
  const visual=`<div class="ga-arch-topline"><span>ORIGINAL FIGURE <i></i> FOLLOW THE INFORMATION</span><div><button class="ga-token-original" type="button" aria-pressed="false">Original view</button><button class="ga-token-enlarge" type="button">Enlarge &#8599;</button></div></div><div class="ga-token-jumps" role="group" aria-label="Token comparison stages">${[['Cameras',0],['Encode',1.1],['Reason',3.1],['Reference',4.7],['Plan',6.4]].map(([s,t])=>`<button type="button" data-token-seek="${t}">${s}</button>`).join('')}</div><div class="ga-token-viewport" tabindex="0" aria-label="Original comparison; scroll horizontally on small screens"><div class="ga-token-stage"><svg class="ga-token-svg" viewBox="0 0 1000 263" role="img" aria-label="${esc(image.alt)}"><defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="263"><rect width="1000" height="263" fill="black"/><rect width="1000" height="54" fill="white"/><rect x="17" y="66" width="124" height="99" fill="white"/><rect x="423" y="59" width="132" height="101" fill="white"/><rect data-static-label="content-encode" x="142" y="130" width="56" height="20" fill="white"/><rect data-static-label="reference-encode" x="557" y="123" width="61" height="22" fill="white"/>${regions.map((r,i)=>`<rect data-reveal="${i}" x="${r.box[0]}" y="${r.box[1]}" width="${r.box[2]}" height="${r.box[3]}" fill="white" opacity="0"/>`).join('')}<rect class="ga-token-final-reveal" width="1000" height="263" fill="white" opacity="0"/></mask></defs><rect class="ga-token-backdrop-left" x=".5" y=".5" width="417" height="261" rx="18" fill="#dff3fb" stroke="#92918a"/><rect class="ga-token-backdrop-right" x="422" y=".5" width="565" height="261" rx="18" fill="#f1faef" stroke="#92918a"/><image href="${esc(src)}" width="1000" height="263" preserveAspectRatio="none" mask="url(#${id})"/><g class="ga-token-traces"></g></svg></div></div>`;
  const {root}=makeStory('Original token comparison, arrow-led reveal',visual,steps,10,{className:'ga-token-story'});
  figure.insertBefore(root,picture);const originalStore=el('div','ga-original-asset');originalStore.hidden=true;originalStore.append(picture);root.append(originalStore);
  const masks=$$('[data-reveal]',root),full=$('.ga-token-final-reveal',root),traces=$('.ga-token-traces',root);let original=false;
  const story=new Story(root,steps,10,t=>{
   regions.forEach((r,i)=>masks[i].setAttribute('opacity',String(phase(t,r.at,r.end))));
   full.setAttribute('opacity',original?'1':String(phase(t,8.0,8.5)));
   const groups=[
    {a:.55,b:1.5,p:['M140 116 L198 116','M554 112 L620 112','M492 157 L492 180']},
    {a:4.0,b:5.25,p:['M812 128 C778 162 724 149 677 179']},
    {a:4.95,b:5.9,p:['M307 165 L307 194','M812 141 L812 191']},
    {a:5.4,b:6.4,p:['M687 219 L754 219']}
   ];const current=groups.find(g=>t>=g.a&&t<=g.b);
   tracePaths(traces,current?current.p:[],current?phase(t,current.a,current.b):0,!!current&&!original&&!reduced.matches);
   root.dataset.tokenStage=original?'original':t<.8?'camera':t<1.9?'encode':t<4.1?'reason':t<5.8?'reference':'plan';
   const buttons=$$('[data-token-seek]',root);let selected=0;buttons.forEach((b,i)=>{if(t>=+b.dataset.tokenSeek)selected=i});buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(!original&&i===selected)));
  },{label:'Camera to reasoning to planner',visibilityThreshold:.25,caption:false});
  const setOriginal=value=>{original=value;$('.ga-token-original',root).setAttribute('aria-pressed',String(value));$('.ga-token-original',root).textContent=value?'Walkthrough view':'Original view';if(value)story.wanted=false;story.apply();story.sync()};
  $('.ga-token-original',root).addEventListener('click',()=>setOriginal(!original));
  $$('[data-token-seek]',root).forEach(b=>b.addEventListener('click',()=>{setOriginal(false);story.seek(+b.dataset.tokenSeek,false)}));
  [story.playButton,story.replayButton,story.slider].forEach(b=>b.addEventListener(b===story.slider?'input':'click',()=>{if(original)setOriginal(false)},{capture:true}));
  $('.ga-token-enlarge',root).addEventListener('click',()=>openSourceImage(image));
  function check(){
   if(!image.naturalWidth)return;const valid=Math.abs(image.naturalWidth/image.naturalHeight-1000/263)<.1;
   if(!valid){setOriginal(true);$('.ga-token-viewport',root).hidden=true;originalStore.hidden=false;story.playButton.disabled=true;root.insertAdjacentHTML('beforeend','<p class="ga-arch-note">Source dimensions changed; the original is shown without coordinate-based animation.</p>');return}
   // Sample only a local, same-origin asset. Cross-origin/tainted canvas falls back
   // to the original palette; the full-reveal image is never recolored.
   try{const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);[[50,52,'.ga-token-backdrop-left'],[600,55,'.ga-token-backdrop-right']].forEach(([x,y,selector])=>{const p=ctx.getImageData(Math.floor(x*c.width/1000),Math.floor(y*c.height/263),1,1).data;$(selector,root).setAttribute('fill',`rgb(${p[0]},${p[1]},${p[2]})`)})}catch{}
  }
  image.addEventListener('load',check);image.loading='eager';if(image.complete)check();
 }

 function methodModule(figure){
  const image=$('img',figure);if(!image)throw new Error('Original architecture image is required.');
  const picture=image.closest('button')||image,maskId=`ga-arch-mask-${++uid}`;
  const plannerFeeds=['M776 190 L776 202 L856 202 L856 214','M876 190 L876 202 L856 202 L856 214','M964 190 L964 202 L856 202 L856 214'];
  const steps=[
   {at:0,phase:'prefill',flow:'observe',title:'Prefill / Start from the physical scene.',text:'The physical entity is the referent. Visual, text, and entity tokens enter the reasoner.',focus:[[0,0,345,496]],boxes:[[57,391,329,39]]},
   {at:2.5,phase:'prefill',flow:'aggregate',title:'Prefill / Build an entity-aligned state.',text:'Attention aggregates physical information into the entity-token hidden states. 3D supervision is training-only.',focus:[[0,187,345,309],[45,0,299,50]],boxes:[[99,210,241,71]],edges:['M137 395 L137 350','M247 302 L219 280']},
   {at:6,phase:'prefill',flow:'cached',title:'Prefill / Cache the addressable states.',text:'M_i stays inside the model. This same stored state remains available during decoding and planning.',focus:[[0,185,345,311],[45,0,299,50]],boxes:[[98,211,242,71]]},
   {at:9,phase:'decode',flow:'emit',title:'Decode / Step t: emit an entity reference.',text:'System 2 selects a planning-critical entity. A gate and pointer emit its address alongside the reasoning content.',focus:[[345,0,371,490],[98,211,242,71]],boxes:[[408,106,117,80],[553,151,151,64]],edges:['M392 140 L408 140','M526 140 L542 140 L542 173 L558 173']},
   {at:13.5,phase:'decode',flow:'resolve',title:'Decode / Step t + 1: resolve and read the same M_i.',text:'The next reasoning step consumes the retrieved state. The cached prefill representation is not replaced by the reference token.',focus:[[345,0,371,490],[98,211,242,71]],boxes:[[350,218,361,82]],edges:['M443 270 L624 270']},
   {at:18,phase:'planner',flow:'context',title:'Planner / Connect reasoning to action generation.',text:'The action expert (System 1) keeps full-scene context. GroundAct also supplies the selected physical states to the explicit refinement path.',focus:[[408,304,590,185],[718,0,280,338]],boxes:[[684,341,45,52],[723,344,272,46]],edges:['M687 367 L720 367']},
   {at:21,phase:'planner',flow:'interact',title:'Planner / Three inputs meet at interaction and risk.',text:'Retrieved states, predicted futures, and the evolving ego proposal jointly inform the physical interaction. All three incoming paths are shown.',focus:[[718,0,280,496]],boxes:[[719,62,114,129],[834,62,85,129],[920,62,78,129],[727,213,260,64]],edges:plannerFeeds},
   {at:25,phase:'planner',flow:'correct',title:'Planner / Apply a selective residual.',text:'Proposal-relative interactions condition the correction. The base action and gated residual form the updated proposal.',focus:[[718,0,280,496]],boxes:[[724,294,273,45]],edges:['M856 275 L856 293']},
   {at:28,phase:'planner',flow:'refine',title:'Planner / Re-evaluate as the proposal changes.',text:'k indexes solver refinement, not driving time. The entity state stays fixed while proposal-relative interactions and corrections change.',focus:[[718,0,280,496]],boxes:[[733,391,263,102]],edges:plannerFeeds,iteration:true},
   {at:32,phase:'complete',flow:'complete',title:'Same physical referent. A consequential plan.',text:'The synchronized strip follows entity to state to reference to interaction to action consequence. Replay or choose a phase to inspect it.'}
  ];
  const vector=`<span class="ga-memory-vector" aria-hidden="true">${[12,19,8,16,22,11].map(h=>`<i style="height:${h}px"></i>`).join('')}</span>`;
  const visual=`${roleRibbon()}<p class="ga-system-note">Built at prefill. Referenced in reasoning. Used to refine the plan.</p><div class="ga-arch-topline" hidden style="display:none"><span>ORIGINAL ARCHITECTURE <i></i> SYNCHRONIZED INFORMATION FLOW</span><div><button type="button" class="ga-arch-view" aria-pressed="false">Original view</button><button type="button" class="ga-arch-enlarge">Enlarge &#8599;</button></div></div><div class="ga-arch-mobile-jumps" aria-label="Jump and scroll to phase"><button type="button" data-mobile-phase="prefill">Prefill</button><button type="button" data-mobile-phase="decode">Decode</button><button type="button" data-mobile-phase="planner">Planner</button></div><div class="ga-arch-scroll-hint">The figure, phase headings, and state strip scroll together &#8596;</div><div class="ga-arch-viewport" tabindex="0" role="region" aria-label="Original architecture with phase-aligned state strip"><div class="ga-arch-canvas">
   <div class="ga-inference-phases" role="group" aria-label="Inference phases"><button type="button" data-inference-phase="prefill" data-seek=".2"><span>01</span><strong>Prefill time</strong><small>Observe &rarr; build &rarr; cache</small><i></i></button><button type="button" data-inference-phase="decode" data-seek="9.6"><span>02</span><strong>Decode time</strong><small>Emit at t &rarr; read at t + 1</small><i></i></button><button type="button" data-inference-phase="planner" data-seek="21.2"><span>03</span><strong>Planner</strong><small>Interact &rarr; correct &rarr; repeat</small><i></i></button></div>
   <div class="ga-arch-crop"><svg class="ga-arch-overlay" viewBox="0 0 1000 498" preserveAspectRatio="none" aria-hidden="true"><defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="498"><rect width="1000" height="498" fill="white"/><g data-focus-holes></g></mask></defs><rect class="ga-arch-veil" width="1000" height="498" fill="white" mask="url(#${maskId})" opacity="0"/><g data-active-outlines></g><g class="ga-arch-traces"></g><rect class="ga-iteration-outline" y="408" width="53" height="61" rx="9" fill="none" stroke="#5f7f38" stroke-width="1.4" opacity="0"/></svg></div>
   <div class="ga-state-strip" aria-label="Information state synchronized with inference phase">
    <section class="ga-state-phase" data-state-phase="prefill"><header><span>GROUND</span><em data-status>Observe</em></header><div class="ga-state-visual"><span class="ga-physical-marker" title="The same physical entity">Physical<br>entity</span><b class="ga-state-arrow">&#8594;</b><span class="ga-state-memory" data-memory-stage="prefill">${vector}<strong>M<sub>i</sub></strong></span></div><p data-state-caption>Observe the entity in the scene.</p><div class="ga-state-rail"><i></i></div></section>
    <section class="ga-state-phase" data-state-phase="decode"><header><span>REFERENCE</span><em data-status>Waiting</em></header><div class="ga-state-visual"><span class="ga-address-token" data-reference-stage>&lt;entity_i&gt;</span><b class="ga-state-arrow">&#8594;</b><span class="ga-state-memory" data-memory-stage="decode">${vector}<strong>M<sub>i</sub></strong></span></div><p data-state-caption>Emit an address; read the same cached state.</p><div class="ga-state-rail"><i></i></div></section>
    <section class="ga-state-phase" data-state-phase="planner"><header><span>ACT</span><em data-status>Waiting</em></header><div class="ga-planner-state ga-act-visual"><div class="ga-act-node"><span class="ga-state-memory" data-memory-stage="planner">${vector}<strong>M<sub>i</sub></strong></span><small>Same state</small></div><b class="ga-state-arrow">&#8594;</b><div class="ga-act-node"><svg viewBox="0 0 64 40" aria-hidden="true"><path d="M8 32Q28 30 49 6" fill="none" stroke="#64748b" stroke-width="2.5"/><path d="M12 7L52 31" stroke="#454b54" stroke-width="2.5"/><circle cx="32" cy="20" r="9" fill="#f0f1f3" stroke="#454b54" stroke-dasharray="3 2"/></svg><small>Interaction<br>with ego</small></div><b class="ga-state-arrow">&#8594;</b><div class="ga-act-node"><svg viewBox="0 0 64 40" aria-hidden="true"><path d="M10 34Q30 24 52 6" fill="none" stroke="#9aa5b4" stroke-width="2" stroke-dasharray="4 3"/><path class="ga-act-refined" d="M10 34C14 12 24 6 52 6" fill="none" stroke="#76b900" stroke-width="3"/><path d="M46 2L53 6L46 10" fill="none" stroke="#76b900" stroke-width="2"/></svg><small>Refined plan</small></div></div><p data-state-caption>Interaction &rarr; selective action consequence.</p><div class="ga-state-rail"><i></i></div></section>
   </div><div class="ga-invariant-note"><span class="ga-identity-dot"></span><strong>Same physical referent</strong><span>M<sub>i</sub> is cached. References select it. Proposal-relative interactions change with k.</span><output class="ga-solver-status">Before planning</output></div>
  </div></div><p class="ga-arch-load-note" hidden></p>`;
  const {root}=makeStory('GroundAct architecture and phase-aligned physical-state flow',visual,steps,34,{className:'ga-source-sequence ga-sequence-v3'});
  figure.classList.add('ga-source-architecture');figure.insertBefore(root,picture);const crop=$('.ga-arch-crop',root);crop.prepend(picture);
  const canvas=$('.ga-arch-canvas',root),viewport=$('.ga-arch-viewport',root),overlay=$('.ga-arch-overlay',root),veil=$('.ga-arch-veil',root),holes=$('[data-focus-holes]',root),outlines=$('[data-active-outlines]',root),traces=$('.ga-arch-traces',root),iteration=$('.ga-iteration-outline',root),phaseButtons=$$('[data-inference-phase]',root),viewButton=$('.ga-arch-view',root);
  const macro={prefill:[0,9],decode:[9,18],planner:[18,32]};let originalOnly=false,calibrated=true,previousStep=-1,previousPhase='',story;
  function updateStrip(t,step){
   root.dataset.flowState=step.flow;
   const done=step.phase==='complete';
   $$('.ga-state-phase',root).forEach(n=>{const name=n.dataset.statePhase,[a,b]=macro[name],active=!done&&step.phase===name,p=clamp((t-a)/(b-a));n.dataset.status=active?'active':p>=1?'complete':'pending';$('.ga-state-rail i',n).style.transform=`scaleX(${p})`;if(active)n.setAttribute('aria-current','step');else n.removeAttribute('aria-current')});
   const p=$('[data-state-phase="prefill"]',root),d=$('[data-state-phase="decode"]',root),a=$('[data-state-phase="planner"]',root);
   $('[data-status]',p).textContent=t<2.5?'Observe':t<6?'Build':'Cached';$('[data-state-caption]',p).textContent=t<2.5?'Physical entity observed in the input.':t<6?'Aggregate into an entity-aligned hidden state.':'M_i stays cached for reasoning and planning.';
   $('[data-memory-stage="prefill"]',p).style.opacity=String(.12+.88*phase(t,2.5,6));
   $('[data-status]',d).textContent=t<9?'Waiting':t<13.5?'Emit at t':'Read at t + 1';$('[data-state-caption]',d).textContent=t<9?'An address will select a stored entity state.':t<13.5?'Gate + pointer emit the entity address.':'Resolve the reference; retrieve the same M_i.';
   $('[data-reference-stage]',d).style.opacity=String(.14+.86*phase(t,9.2,11));$('[data-memory-stage="decode"]',d).style.opacity=String(.12+.88*phase(t,13.5,15));
   $('[data-status]',a).textContent=t<18?'Waiting':t<21?'Context':t<25?'Interact':t<28?'Correct':t<32?'Refine':'Complete';
   $('[data-state-caption]',a).textContent=t<18?'Selected state + proposal determine interaction.':t<21?'System 1 retains full-scene context.':t<25?'All three inputs inform interaction and risk.':t<28?'The gated residual changes the proposal.':'Same entity state. Selective plan correction.';
   $('.ga-planner-state',a).style.opacity=String(.18+.82*phase(t,18,21));
   $('.ga-act-refined',a).style.strokeDasharray='70';$('.ga-act-refined',a).style.strokeDashoffset=String(70*(1-phase(t,25,32)));
   const k=t<28?0:Math.min(3,1+Math.floor((t-28)/1.15));$('.ga-solver-status',root).textContent=t<18?'Before planning':t<28?'Proposal k':t<32?`Refinement k + ${k}`:'Proposal refined';
   a.dataset.iteration=String(k);
  }
  function render(t){
   let index=0;steps.forEach((s,i)=>{if(t>=s.at)index=i});const step=steps[index],local=t-step.at;
   root.dataset.inferencePhase=step.phase;root.dataset.sequenceStep=String(index);overlay.style.visibility=originalOnly||!calibrated?'hidden':'visible';
   if(index!==previousStep){previousStep=index;holes.replaceChildren();outlines.replaceChildren();(step.focus||[]).forEach(([x,y,w,h])=>holes.append(svgNode('rect',{x,y,width:w,height:h,rx:7,fill:'black'})));(step.boxes||[]).forEach(([x,y,w,h])=>outlines.append(svgNode('rect',{x,y,width:w,height:h,rx:7,fill:'none',stroke:'#697d4d','stroke-width':1.25,'vector-effect':'non-scaling-stroke'})))}
   const active=step.phase!=='complete';veil.setAttribute('opacity',active?'.53':'0');outlines.setAttribute('opacity',active?String(.85*phase(local,0,.25)):'0');
   const motion=step.edges&&local>.08&&!originalOnly&&calibrated&&!reduced.matches;const progress=clamp(((Math.max(0,local-.08))%1.75)/1.35);
   tracePaths(traces,step.edges||[],progress,!!motion);
   if(step.iteration){iteration.setAttribute('x',String([729,798,875][Math.min(2,Math.floor(local/1.15))]));iteration.setAttribute('opacity','.9')}else iteration.setAttribute('opacity','0');
   phaseButtons.forEach(b=>{const name=b.dataset.inferencePhase,[a,z]=macro[name],on=name===step.phase&&!originalOnly;if(on)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');b.setAttribute('aria-pressed',String(on));$('i',b).style.transform=`scaleX(${clamp((t-a)/(z-a))})`});
   updateStrip(t,step);
   if(step.phase!==previousPhase){previousPhase=step.phase;if(viewport.clientWidth<760&&active&&!originalOnly&&story?.visible)scrollPhase(step.phase)}
  }
  function scrollPhase(name){const target={prefill:0,decode:canvas.clientWidth*.347,planner:canvas.clientWidth-viewport.clientWidth}[name];if(target!==undefined&&viewport.clientWidth<760)viewport.scrollTo({left:Math.max(0,target),behavior:reduced.matches?'auto':'smooth'})}
  function setOriginal(value){originalOnly=value;root.dataset.original=String(value);viewButton.setAttribute('aria-pressed',String(value));viewButton.textContent=value?'Walkthrough view':'Original view';if(story){if(value)story.wanted=false;story.apply();story.sync()}}
  story=new Story(root,steps,34,render,{label:'Synchronized inference and entity-state sequence',visibilityThreshold:.2});root.dataset.original='false';
  viewButton.addEventListener('click',()=>setOriginal(!originalOnly));phaseButtons.forEach((b,i)=>{b.addEventListener('click',()=>{setOriginal(false);story.seek(+b.dataset.seek,false);scrollPhase(b.dataset.inferencePhase)});b.addEventListener('keydown',e=>{if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;e.preventDefault();const n=(i+(e.key==='ArrowRight'?1:2))%3;phaseButtons[n].focus();phaseButtons[n].click()})});
  $$('[data-mobile-phase]',root).forEach(b=>b.addEventListener('click',()=>$(`[data-inference-phase="${b.dataset.mobilePhase}"]`,root).click()));
  [story.playButton,story.replayButton,story.slider].forEach(b=>b.addEventListener(b===story.slider?'input':'click',()=>{if(originalOnly)setOriginal(false)},{capture:true}));
  $('.ga-arch-enlarge',root).addEventListener('click',()=>openSourceImage(image));
  function checkImage(){if(!image.naturalWidth)return;calibrated=Math.abs(image.naturalWidth/image.naturalHeight-1000/562)<.05;const note=$('.ga-arch-load-note',root);note.hidden=calibrated;root.dataset.calibrated=String(calibrated);if(!calibrated){setOriginal(true);story.playButton.disabled=true;note.textContent='Source dimensions changed: original view is shown; the overlay must be recalibrated.'}story.apply()}
  image.addEventListener('load',checkImage);if(image.complete)checkImage();image.addEventListener('error',()=>{const note=$('.ga-arch-load-note',root);note.hidden=false;note.textContent='Original figure unavailable. Use the --source option with your website directory, or open the preview with internet access.'});

 }
 function openSourceImage(image){
  let dialog=$('#ga-original-image-dialog');
  if(!dialog){dialog=el('dialog','ga-source-dialog','<form method="dialog"><button aria-label="Close original figure" autofocus>Close &times;</button></form><img alt=""><p>Original paper figure</p>');dialog.id='ga-original-image-dialog';document.body.append(dialog);dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()})}
  const target=$('img',dialog);target.src=image.currentSrc||image.src;target.alt=image.alt;
  if(typeof dialog.showModal==='function')dialog.showModal();else window.open(target.src,'_blank','noopener');
 }

 function niceMax(value){if(!Number.isFinite(value)||value<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(value)));return ([1,1.5,2,2.5,3,4,5,6,8,10].find(v=>v*p>=value*1.015)||10)*p}
 function resultModule(){
  const panel=$('#results-panel'),scroll=$('.table-scroll',panel||document);if(!panel||!scroll)return;
  let source;try{source=typeof datasets!=='undefined'?datasets:window.GroundActData}catch{source=window.GroundActData}
  if(!source||!Object.keys(source).length)return;
  const root=el('section','ga-motion ga-frame ga-results');root.setAttribute('aria-label','Animated benchmark explorer');
  root.innerHTML=`<div class="ga-chart-inner"><div class="ga-chart-toolbar"><h4 class="ga-chart-title">Explore one metric at a time.</h4><label>Metric <select aria-label="Benchmark metric"></select></label></div><div class="ga-benchmark-chips" aria-label="Metric selection"></div><div class="ga-chart-area" role="img" aria-label="Reported benchmark values"></div><div class="ga-chart-axis"></div><p class="ga-chart-description"></p></div><div class="ga-result-progress" aria-hidden="true"><span></span></div>`;
  scroll.before(root);
  const dataDetails=el('details','ga-data-details','<summary>View exact values &amp; evaluation protocol</summary>');root.after(dataDetails);dataDetails.append(scroll);
  $$('.table-key,.evaluation-details,.table-scroll-hint',panel).forEach(n=>dataDetails.append(n));
  dataDetails.addEventListener('toggle',()=>{if(dataDetails.open&&typeof updateTableScrollHint==='function')updateTableScrollHint()});
  let key=$('[data-table][aria-selected="true"]')?.dataset.table||Object.keys(source)[0];let data=source[key];let shown=-1;let stopAt=null;let story=null;const interval=4.6;
  const select=$('select',root),chips=$('.ga-benchmark-chips',root),area=$('.ga-chart-area',root),axis=$('.ga-chart-axis',root),desc=$('.ga-chart-description',root);
  function metricUnit(header){if(key==='closed')return 'reported value';return /Collision|Off-Road/.test(header)?'%':'m'}
  function stepsFor(){return data.headers.slice(3).map((h,i)=>({at:i*interval,title:h,text:`${data.description}. ${data.higher.includes(i+3)?'Higher':'Lower'} is better; all bars share a zero-based scale.`}))}
  function buildMetric(index){
   shown=index;const col=index+3,label=data.headers[col],values=data.rows.map(r=>Number(r[col])),max=niceMax(Math.max(...values)),higher=data.higher.includes(col),best=higher?Math.max(...values):Math.min(...values),winners=data.rows.filter(r=>Number(r[col])===best).map(r=>r[0]);
   area.setAttribute('aria-label',`${data.description}. ${label}. `+data.rows.map(r=>`${r[0]}: ${Number(r[col]).toFixed(3)}`).join('; '));
   area.innerHTML=data.rows.map(r=>`<div class="ga-chart-row ${r[0]==='GroundAct'?'ga-ours':''} ${Number(r[col])===best?'ga-best':''}"><div class="ga-chart-name">${esc(r[0])}<small>${esc(r[1])} / ${esc(r[2])}</small></div><div class="ga-chart-track"><span class="ga-chart-bar" style="width:${Number(r[col])/max*100}%"></span></div><div class="ga-chart-value">${Number(r[col]).toFixed(3)}</div></div>`).join('');
   const digits=max<1?2:max<10?1:0;axis.innerHTML=[0,.25,.5,.75,1].map(f=>`<span>${(f*max).toFixed(digits)}</span>`).join('');
   desc.innerHTML=`<strong>${esc(label)}</strong> (${esc(metricUnit(label))}). Best reported value: ${esc(winners.join(' / '))}, ${best.toFixed(3)}. Model order matches the source table; scales reset for each metric.`;
   select.value=String(index);$$('[data-metric]',chips).forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.metric)===index)));
  }
  function draw(t){
   const count=data.headers.length-3,index=clamp(Math.floor(t/interval),0,count-1),local=t-index*interval;if(index!==shown)buildMetric(index);
   $$('.ga-chart-bar',area).forEach((bar,i)=>bar.style.transform=`scaleX(${phase(local,.07*i,.85+.07*i)})`);
   $('.ga-result-progress span',root).style.width=`${Math.min(100,(t/(count*interval))*100)}%`;
   if(story&&stopAt!==null&&t>=stopAt){story.wanted=false;stopAt=null}
  }
  function choose(index){if(!story)return;const base=index*interval;if(reduced.matches){story.seek(base+2,false);return}stopAt=base+1.7;story.seek(base,true)}
  function controls(){
   select.innerHTML=data.headers.slice(3).map((h,i)=>`<option value="${i}">${esc(h)}</option>`).join('');
   chips.innerHTML=data.headers.slice(3).map((h,i)=>`<button class="ga-benchmark-chip" type="button" data-metric="${i}" aria-pressed="${i===0}">${esc(h)}</button>`).join('');
   $$('[data-metric]',chips).forEach(b=>b.addEventListener('click',()=>choose(Number(b.dataset.metric))));
  }
  controls();story=new Story(root,stepsFor(),(data.headers.length-3)*interval,draw,{label:'Benchmark metric tour'});
  select.addEventListener('change',()=>choose(Number(select.value)));
  story.playButton.addEventListener('click',()=>{stopAt=null});story.replayButton.addEventListener('click',()=>{stopAt=null});
  document.addEventListener('groundact:panelchange',()=>{
   const next=$('[data-table][aria-selected="true"]')?.dataset.table;if(!next||!source[next]||next===key)return;key=next;data=source[key];shown=-1;stopAt=reduced.matches?null:1.7;controls();story.steps=stepsFor();story.duration=(data.headers.length-3)*interval;story.slider.max=String(story.duration);story.chapter=-1;story.seek(reduced.matches?2:0,!reduced.matches);
  });
  mountRadarModes(source,panel,story);
 }
 // Three suites, shown together. Axis domains always use ALL source models, even
 // when a legend toggle hides a series. Raw source values are retained in tables.
 function mountRadarModes(source,panel,barStory){
  const header=$('.results-header'),tabs=$('.result-tabs');if(!header)return;
  const keys=['closed','normal','safety'].filter(k=>source[k]);if(keys.length!==3)return;
  const names={closed:'Closed-loop',normal:'Normal',safety:'Safety-critical'};
  const subtitles={closed:'AlpaSim / 913 scenes',normal:'PAI-AV / 4,000 samples',safety:'PAI-AV* / 512 samples'};
  const modelNames=[...new Set(keys.flatMap(k=>source[k].rows.map(r=>r[0])))];
  const visible=new Set(modelNames),styleMap=new Map();
  const inks=['#a9a49a','#55534e','#878074','#b49f85','#77766d','#45423e'];
  const dashes=['2 4','7 4','10 3 2 3','3 3','12 4',''];let styleIndex=0;
  modelNames.forEach(name=>{styleMap.set(name,name==='GroundAct'?{ink:'#76b900',dash:'',width:2.8}:{ink:inks[styleIndex%inks.length],dash:dashes[styleIndex%dashes.length],width:1.25});if(name!=='GroundAct')styleIndex++});
  const switcher=el('div','ga-view-switch',`<button type="button" data-plot-view="radar" aria-pressed="true">Radar</button><button type="button" data-plot-view="bar" aria-pressed="false">Bar</button>`);switcher.setAttribute('role','group');switcher.setAttribute('aria-label','Driving performance chart type');header.append(switcher);
  const root=el('section','ga-motion ga-radar-overview');root.setAttribute('aria-label','Three driving benchmark suites shown together');
  const legendHTML=modelNames.map(name=>{const s=styleMap.get(name);return `<button type="button" data-radar-model="${esc(name)}" aria-pressed="true"><svg viewBox="0 0 30 12" aria-hidden="true"><path d="M1 6 H29" fill="none" stroke="${s.ink}" stroke-width="${name==='GroundAct'?3:1.8}" stroke-dasharray="${s.dash}"/></svg>${esc(name)}</button>`}).join('');
  root.innerHTML=`<div class="ga-radar-grid"></div><div class="ga-radar-legend" role="group" aria-label="Show or hide benchmark models">${legendHTML}</div><p class="ga-radar-normalization">Each axis is min-max normalized over <strong>all ${modelNames.length} models</strong> in its suite: 0 = lowest performance, 1 = highest performance among the compared models on that metric. Lower-is-better metrics are inverted.</p><details class="ga-radar-exact"><summary>Exact reported values &amp; normalization</summary><p class="ga-radar-formula">Higher is better: (x - min) / (max - min). Lower is better: (max - x) / (max - min). Constant axes use 0.5. These normalized coordinates are presentation-only, not additional paper metrics.</p><div class="ga-radar-raw-tables"></div></details>`;
  panel.before(root);panel.hidden=true;if(tabs)tabs.hidden=true;
  const grid=$('.ga-radar-grid',root),drawers=[];
  function prettyHeader(h,key){
   let clean=h.replace(/[\u2191\u2193]/g,'').trim();
   if(key==='closed')return {'Progress':['Progress'], 'At-Fault Collision':['At-fault','collision'], 'Off-Road':['Off-road'], 'Wrong Lane':['Wrong lane']}[clean]||[clean];
   clean=clean.replace('Corner Dist.','Corner');const m=clean.match(/^(.*?)\s(\d\.\ds)$/);return m?[m[1],m[2]]:[clean];
  }
  keys.forEach((key,suiteIndex)=>{
   const data=source[key],cols=data.headers.slice(3).map((h,i)=>i+3),n=cols.length,cx=195,cy=162,r=92,labelR=121;
   const min=cols.map(c=>Math.min(...data.rows.map(row=>Number(row[c])))),max=cols.map(c=>Math.max(...data.rows.map(row=>Number(row[c]))));
   const point=(i,value,radius=r)=>{const a=-Math.PI/2+i*Math.PI*2/n;return [cx+Math.cos(a)*radius*value,cy+Math.sin(a)*radius*value]};
   const points=(values,progress=1)=>values.map((v,i)=>point(i,v*progress).map(x=>x.toFixed(2)).join(',')).join(' ');
   const score=(value,j)=>max[j]===min[j] ? 0.5 : clamp(data.higher.includes(cols[j])?(value-min[j])/(max[j]-min[j]):(max[j]-value)/(max[j]-min[j]));
   const card=el('article','ga-radar-card');card.dataset.radarSuite=key;
   card.innerHTML=`<header><span>0${suiteIndex+1}</span><div><h4>${names[key]}</h4><p>${subtitles[key]}</p></div><small>${n} metrics</small></header><div class="ga-radar-direction"><span aria-hidden="true">&#8599;</span> OUTWARD = BETTER</div>`;
   const svg=svgNode('svg',{viewBox:'0 0 390 325',class:'ga-radar-svg',role:'img','aria-label':`${names[key]}, all ${n} metrics; normalized per axis, farther out is better.`});
   [.25,.5,.75,1].forEach(v=>svg.append(svgNode('polygon',{points:points(cols.map(()=>v)),fill:v===1?'#faf9f6':'none',stroke:'#e7e3db','stroke-width':1}))); // reorder fill below rings below
   // The outer fill must be behind the inner rings.
   const polygons=[...svg.children];if(polygons.length)svg.insertBefore(polygons[polygons.length-1],polygons[0]);
   cols.forEach((col,j)=>{
    const [x,y]=point(j,1);svg.append(svgNode('line',{x1:cx,y1:cy,x2:x,y2:y,stroke:'#e2ded5','stroke-width':1}));
    const [lx,ly]=point(j,1,labelR),a=-Math.PI/2+j*Math.PI*2/n,anchor=Math.cos(a)>.35?'start':Math.cos(a)<-.35?'end':'middle',labels=prettyHeader(data.headers[col],key);
    const text=svgNode('text',{x:lx,y:ly-(labels.length-1)*6,'text-anchor':anchor,'dominant-baseline':'middle',fill:'#5f5b53','font-size':11.2,'font-family':'inherit'});
    labels.forEach((line,i)=>{const span=svgNode('tspan',{x:lx,dy:i===0?0:13});span.textContent=line;text.append(span)});svg.append(text);
   });
   [.5,1].forEach(v=>{const txt=svgNode('text',{x:cx+5,y:cy-r*v+11,fill:'#615c52','font-size':10,'paint-order':'stroke',stroke:'#fff','stroke-width':2.5,'stroke-linejoin':'round'});txt.textContent=String(v);svg.append(txt)});
   const seriesLayer=svgNode('g',{'data-radar-series-layer':''});svg.append(seriesLayer);
   const ordered=[...data.rows].sort((a,b)=>(a[0]==='GroundAct'?1:0)-(b[0]==='GroundAct'?1:0));
   ordered.forEach(row=>{
    const name=row[0],s=styleMap.get(name),scores=cols.map((c,j)=>score(Number(row[c]),j)),g=svgNode('g',{'data-series':name}),poly=svgNode('polygon',{points:points(scores,0),fill:name==='GroundAct'?'#76b900':'none','fill-opacity':name==='GroundAct'?.09:0,stroke:s.ink,'stroke-width':s.width,'stroke-dasharray':s.dash,'stroke-linejoin':'round',class:'ga-radar-polygon'});
    const title=svgNode('title');title.textContent=`${name}: `+cols.map(c=>`${data.headers[c]} ${Number(row[c]).toFixed(3)}`).join('; ');poly.append(title);g.append(poly);
    const dots=scores.map((value,j)=>{const circle=svgNode('circle',{cx,cy,r:name==='GroundAct'?3.1:2.1,fill:s.ink,stroke:name==='GroundAct'?'white':s.ink,'stroke-width':.8,tabindex:0,role:'img','aria-label':`${name}, ${data.headers[cols[j]]}: ${Number(row[cols[j]]).toFixed(3)}; normalized ${value.toFixed(3)}`});const tip=svgNode('title');tip.textContent=circle.getAttribute('aria-label');circle.append(tip);g.append(circle);return circle});seriesLayer.append(g);
    drawers.push(p=>{poly.setAttribute('points',points(scores,p));dots.forEach((dot,j)=>{const [x,y]=point(j,scores[j]*p);dot.setAttribute('cx',x);dot.setAttribute('cy',y)})});
   });
   card.append(svg);const foot=el('div','ga-radar-card-note',`<div class="ga-radar-scale-title">PERFORMANCE SCALE</div><div class="ga-radar-scale"><div class="ga-radar-scale-end"><b>0</b><span><strong>Worst</strong><small>At the center</small></span></div><span class="ga-radar-scale-arrow" aria-hidden="true"></span><div class="ga-radar-scale-end ga-radar-scale-best"><b>1</b><span><strong>Best</strong><small>At the outer edge</small></span></div></div><p>Per metric, among the compared models.</p>`);card.append(foot);grid.append(card);
   const raw=el('section','ga-radar-raw-suite');const title=el('h5','',`${names[key]} &middot; ${esc(data.description)}`);raw.append(title);const scroller=el('div','table-scroll');scroller.tabIndex=0;scroller.setAttribute('role','region');scroller.setAttribute('aria-label',`${names[key]} exact benchmark values`);const table=el('table','');const tr=table.createTHead().insertRow();data.headers.forEach(h=>{const th=document.createElement('th');th.scope='col';th.textContent=h;tr.append(th)});const body=table.createTBody();data.rows.forEach(row=>{const tr=body.insertRow();if(row[0]==='GroundAct')tr.className='ours';row.forEach((v,i)=>{const td=tr.insertCell();td.textContent=i>=3?Number(v).toFixed(3):v})});scroller.append(table);raw.append(scroller,el('p','ga-small',esc(data.note||'')));$('.ga-radar-raw-tables',root).append(raw);
  });
  const story=new Story(root,[{at:0,title:'Three suites, all metrics.',text:'All radar plots reveal together. Raw values remain available below.'}],2.3,t=>drawers.forEach(draw=>draw(phase(t,.05,1.05))),{label:'All three radar plots',visibilityThreshold:.1});
  // Avoid lengthy narration for the overview: only its replay/playback row remains.
  $('.ga-caption',root).hidden=true;
  function refresh(){
   $$('[data-series]',root).forEach(g=>g.style.display=visible.has(g.dataset.series)?'':'none');
   $$('[data-radar-model]',root).forEach(b=>b.setAttribute('aria-pressed',String(visible.has(b.dataset.radarModel))));
  }
  $$('[data-radar-model]',root).forEach(b=>{
   b.addEventListener('click',()=>{const name=b.dataset.radarModel;if(visible.has(name)&&visible.size>1)visible.delete(name);else visible.add(name);refresh()});
   const focus=()=>$$('[data-series]',root).forEach(g=>g.style.opacity=g.dataset.series===b.dataset.radarModel?'1':'.15');
   const blur=()=>$$('[data-series]',root).forEach(g=>g.style.opacity='1');b.addEventListener('mouseenter',focus);b.addEventListener('mouseleave',blur);b.addEventListener('focus',focus);b.addEventListener('blur',blur);
  });
  function setMode(mode){
   const radar=mode==='radar';root.hidden=!radar;panel.hidden=radar;if(tabs)tabs.hidden=radar;
   $$('[data-plot-view]',switcher).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plotView===mode)));
   if(radar){barStory.wanted=false;barStory.sync();if(!story.started)story.seek(0,!reduced.matches)}else{story.wanted=false;story.sync();barStory.seek(Math.min(barStory.time,barStory.duration),!reduced.matches)}
   document.documentElement.dataset.performanceView=mode;
  }
  $$('[data-plot-view]',switcher).forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.plotView)));
  document.documentElement.dataset.performanceView='radar';
 }
 function evidenceModule(){
  const grid=$('.evidence-grid');if(!grid)return;const cards=$$('.evidence-card',grid);if(cards.length<3)return;
  const root=el('section','ga-motion ga-support-motion');root.setAttribute('aria-label','Supporting evidence, separate evaluation protocols');grid.before(root);root.append(grid);
  const all=[];
  cards.slice(0,2).forEach((card,index)=>{
   const own=parseFloat($('.evidence-value',card)?.textContent||''),baseline=parseFloat($('.metric-baseline strong',card)?.textContent||'');if(!Number.isFinite(own)||!Number.isFinite(baseline))return;
   const name=index===0?'PETRv2':'Alpamayo 1.5',bars=el('div','ga-mini-bars',`<div class="ga-mini-row"><span>${name}</span><i><b style="width:${baseline}%"></b></i><em>${baseline.toFixed(2)}</em></div><div class="ga-mini-row ga-ours"><span>GroundAct</span><i><b style="width:${own}%"></b></i><em>${own.toFixed(2)}</em></div><div class="ga-mini-axis">0 &mdash; 100 F1 scale</div>`);$('.metric-baseline',card).after(bars);$$('b',bars).forEach(b=>all.push({bar:b,start:index*1.7}));
  });
  const third=cards[2],safe=parseFloat($('.preserved strong',third)?.textContent||''),unsafe=parseFloat($('.adverse strong',third)?.textContent||'');
  if(Number.isFinite(safe)&&Number.isFinite(unsafe)){
   const bars=el('div','ga-mini-bars',`<div class="ga-mini-row ga-ours"><span>Preserved</span><i><b style="width:${safe}%"></b></i><em>${safe}%</em></div><div class="ga-mini-row ga-adverse"><span>Unsafe</span><i><b style="width:${unsafe}%"></b></i><em>${unsafe}%</em></div><div class="ga-mini-axis">Separate rates / same 0&ndash;100% axis</div>`);$('.evidence-pair',third).after(bars);$$('b',bars).forEach(b=>all.push({bar:b,start:3.4}));
   $$('.evidence-pair i',third).forEach(i=>i.hidden=true);
  }
  new Story(root,[{at:0,title:'Spatial referencing.',text:'Geometry-aware entity selection, on its own evaluation protocol.'},{at:1.7,title:'Reasoning-to-action alignment.',text:'Compare predicted-trajectory meta-actions; do not merge this F1 with the referencing F1.'},{at:3.4,title:'Selective consequences.',text:'Preserved and unsafe rates are separate outcomes, not complementary slices of a two-part pie.'}],6,t=>all.forEach(({bar,start})=>bar.style.transform=`scaleX(${phase(t,start,start+1.3)})`),{label:'Supporting evidence',caption:false});
 }
 const errors=[];
 function init(){
  if(document.documentElement.dataset.groundactMotion==='mounted')return;document.documentElement.dataset.groundactMotion='mounted';
  const safe=(name,fn)=>{try{fn()}catch(e){errors.push({component:name,message:String(e)});console.error(`[GroundAct motion: ${name}]`,e)}};
  const figs=$$('#overview .motivation-grid > figure');
  safe('transfer-gap',()=>{if(figs[0])gapModule(figs[0])});safe('paired-scenes',()=>{if(figs[1])scenarioModule(figs[1])});
  // The Principle uses the original static figure; no animation is mounted.
  safe('system-role-framing',systemsModule);
  $$('.ga-source-zoom').forEach(b=>b.addEventListener('click',()=>openSourceImage($('img',b))));
  safe('architecture',()=>{const f=$('#method .architecture-figure');if(f)methodModule(f)});
  safe('benchmark-explorer',resultModule);safe('supporting-evidence',evidenceModule);
  const global=el('button','ga-motion-global','<i aria-hidden="true"></i><span>Pause new animations</span>');global.type='button';global.setAttribute('aria-pressed','false');global.addEventListener('click',()=>setQuiet(!quiet));document.body.append(global);
 }
 window.GroundActMotion={version:'4.4.4',stories,errors,pauseAll:()=>setQuiet(true),resumeAll:()=>setQuiet(false),init};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
