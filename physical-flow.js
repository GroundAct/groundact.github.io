/* One physical referent, two visible operations: an address travels; a state is read.
   Solver updates move the whole proposal. They do not advance driving time. */
(() => {
  const root = document.querySelector('[data-flow]');
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const svg = $('[data-flow-canvas]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 26;
  const state = {time:0, playing:false, wanted:false, started:false, visible:false, raf:0, previous:0, chapter:-1};
  const green = '#76b900', black = '#151619', modelSurface = '#f0f0ec';
  const entityStateLabel = address => `M<tspan baseline-shift="sub" font-size="75%" style="font-family:Arial,sans-serif;font-variant-numeric:proportional-nums;letter-spacing:0">${address}</tspan>`;
  const pattern = [.72,.34,.86,.54,.42,.79,.48,.65];
  const base = [40,111,184,250,309,367];
  const refined = [40,106,158,195,218,233];
  const chapters = [
    [0,'Start With The Physical Scene.'],
    [1.6,'Prefill Forms The In-Model Entity States.'],
    [3.8,'The Reasoner Emits An Entity Reference.'],
    [6.5,'The Reference Reads The Preserved State.'],
    [7.6,'The Read State Grounds Subsequent Reasoning.'],
    [10.1,'The Planner Retrieves The Same State.'],
    [14.9,'The Proposal And Forecast Reveal Risk.'],
    [18.8,'The Interaction Changes The Action.']
  ];
  const clamp = n => Math.max(0,Math.min(1,n));
  const ease = n => {n=clamp(n);return n*n*(3-2*n);};
  const p = (t,a,b) => ease((t-a)/(b-a));
  const morph = t => .38*p(t,19,20.25)+.35*p(t,20.5,21.7)+.27*p(t,22,23.4);
  const text = (selector,value) => {const el=$(selector);if(el.textContent!==value)el.textContent=value;};
  let paths={}, layout={}, refs={};
  const vector = (x,y,w,h,fill=green,values=pattern) => values.map((v,i)=>`<rect x="${x+i*w/8}" y="${y+h*(1-v)/2}" width="${w/8-2.3}" height="${h*v}" rx="1.3" fill="${fill}"/>`).join('');
  const truck = `<rect x="-25" y="-16" width="50" height="32" rx="5" fill="${green}"/><path d="M10 -15V15" stroke="#15161955"/><rect x="15" y="-10" width="6" height="20" rx="2" fill="${black}"/><path d="M-17 -18h10m-10 36h10M12 -18h8m-8 36h8" stroke="${black}" stroke-width="3"/><text x="-6" y="6" text-anchor="middle" style="font-size:18px;font-weight:800;fill:#151619">9</text>`;
  const ego = `<rect x="-22" y="-13" width="44" height="26" rx="8" fill="${black}"/><path d="M3 -9h9l4 3v12l-4 3H3z" fill="#d8dbdf"/><path d="M-13 -8h7v16h-7z" fill="#888e97"/>`;
  const badge = `<rect x="-18" y="-18" width="36" height="36" rx="9" fill="${black}" stroke="${green}" stroke-width="2"/><text x="0" y="8" text-anchor="middle" style="font-size:24px;font-weight:750;fill:${green}">9</text>`;
  function build() {
    const actual = $('.flow-stage').clientWidth || 1120;
    const mobile = actual < 720;
    const W = mobile ? Math.max(344,actual) : 1120;
    const photo = mobile ? {x:17,y:102,w:(W-68)/2} : {x:24,y:122,w:278};
    photo.h=photo.w*929/1694;
    const m = mobile ? {x:W/2+6,y:89,w:W/2-24} : {x:386,y:102,w:216};
    const r = mobile ? {x:W/2-126,y:298,w:252} : {x:348,y:320,w:252};
    const plan = mobile ? {x:8,y:486,s:(W-16)/460} : {x:650,y:126,s:1};
    const H = mobile ? plan.y+340*plan.s+25 : 535;
    const point=(x,y)=>({x:plan.x+x*plan.s,y:plan.y+y*plan.s});
    const source={x:photo.x+photo.w*.612,y:photo.y+photo.h*.224-6};
    const source4={x:photo.x+photo.w*.15,y:photo.y+photo.h*.49-5};
    const mem={x:m.x+25,y:m.y+82};
    const memRight={x:m.x+m.w-9,y:mem.y};
    const ref={x:r.x+133,y:r.y+20};
    const hidden={x:r.x+222,y:r.y+20};
    const port=point(84,45);
    const truckPoint=point(324,202);
    const hub={x:mobile?W-13:626,y:mem.y};
    layout={W,H,mobile,photo,m,r,plan,mem,memRight,ref,hidden,source,source4,port,truckPoint,hub};
    const encode=`M${source.x} ${source.y} C${source.x+65} ${source.y-25},${m.x-36} ${mem.y},${mem.x} ${mem.y}`;
    const encode4=`M${source4.x} ${source4.y} C${source4.x+50} ${photo.y-52},${m.x-28} ${m.y+46},${m.x+25} ${m.y+46}`;
    const lookup=mobile?`M${ref.x} ${ref.y-19}V${m.y+178}Q${ref.x} ${mem.y} ${m.x+8} ${mem.y}`:`M${ref.x} ${ref.y-19}V${m.y+184}Q${ref.x} ${m.y+172} ${ref.x-22} ${m.y+172}H${m.x-20}Q${m.x-33} ${m.y+172} ${m.x-33} ${m.y+153}V${mem.y+16}Q${m.x-33} ${mem.y} ${m.x+8} ${mem.y}`;
    const readback=`M${memRight.x} ${memRight.y}H${hub.x}V${hidden.y-32}Q${hub.x} ${hidden.y} ${hidden.x+29} ${hidden.y}H${hidden.x}`;
    const plannerRef=point(34,7);
    const refer=mobile ? `M${ref.x} ${ref.y-20}V${r.y-24}Q${ref.x} ${r.y-39} ${ref.x-15} ${r.y-39}H${r.x-5}Q${r.x-20} ${r.y-39} ${r.x-20} ${r.y-24}V${plannerRef.y-18}Q${r.x-20} ${plannerRef.y} ${plannerRef.x} ${plannerRef.y}` : `M${ref.x} ${ref.y-20}V${r.y-18}Q${ref.x} ${r.y-30} ${ref.x+16} ${r.y-30}H${r.x+r.w+6}Q${r.x+r.w+18} ${r.y-30} ${r.x+r.w+18} ${r.y-46}V${plannerRef.y+16}Q${r.x+r.w+18} ${plannerRef.y} ${plannerRef.x} ${plannerRef.y}`;
    const read=mobile ? `M${memRight.x} ${memRight.y}H${hub.x}V${port.y-30}Q${hub.x} ${port.y} ${hub.x-30} ${port.y}H${port.x}` : `M${memRight.x} ${memRight.y}H${hub.x}Q${hub.x+35} ${mem.y} ${hub.x+47} ${port.y}H${port.x}`;
    const forecast=`M${port.x} ${port.y} C${port.x+70*plan.s} ${port.y-15},${truckPoint.x} ${port.y+30*plan.s},${truckPoint.x} ${truckPoint.y}`;
    const fontScale=mobile?Math.max(1,1/plan.s*.93):1;
    const modelNotch=photo.y+photo.h+70;
    const modelOutline=mobile
      ? `<path d="M${m.x+7} 29H${W-23}Q${W-7} 29 ${W-7} 45V${H-35}Q${W-7} ${H-19} ${W-23} ${H-19}H24Q8 ${H-19} 8 ${H-35}V${modelNotch+16}Q8 ${modelNotch} 24 ${modelNotch}H${m.x-25}Q${m.x-9} ${modelNotch} ${m.x-9} ${modelNotch-16}V45Q${m.x-9} 29 ${m.x+7} 29Z"/>`
      : '<rect x="329" y="31" width="773" height="438" rx="18"/>';
    const modelTag={x:mobile?W-118:971,y:mobile?16:17,w:mobile?103:113,h:mobile?26:28};
    const memoryRow=(addr,y,selected,values)=>`<g data-memory-row="${addr}" ${selected?'data-memory-fixed':''}><rect x="8" y="${y-14}" width="${m.w-16}" height="28" rx="5" fill="${selected?'#fff':'#f3f4f5'}" stroke="${selected?green:'none'}" stroke-width="1.5"/><text data-entity-state-label="${addr}" x="25" y="${y+5}" text-anchor="middle" class="fc-mono" style="font-size:12px;font-weight:650;fill:${selected?black:'#626d7b'}">${entityStateLabel(addr)}</text>${vector(48,y-11,m.w-63,22,selected?green:'#aab2bd',values)}</g>`;
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    svg.innerHTML=`
      <title id="flow-canvas-title">Follow Entity 9 From The Scene To Action Refinement</title>
      <desc id="flow-canvas-desc">Four schematic input frames show a driving scene. A gray car has address 4; the lead truck has address 9. Prefill forms continuous entity states inside the model. The reasoner emits tokens one by one. It emits reference 9, reads the stored state into the next hidden representation, and then continues generating tokens conditioned on that state. The planner retrieves the same preserved state. The predicted truck and ego positions overlap at the same future time. Interaction-driven refinement changes the entire ego proposal, slowing earlier. This is an explanatory schematic.</desc>
      <defs>
        <marker id="fc-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 8 4 0 8" fill="#aeb3bb"/></marker>
        <marker id="fc-green-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 8 4 0 8" fill="${green}"/></marker>
        <marker id="fc-state-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 8 4 0 8" fill="${black}"/></marker>
        <clipPath id="fc-photo-clip"><rect x="${photo.x}" y="${photo.y}" width="${photo.w}" height="${photo.h}" rx="7"/></clipPath>
        <filter id="fc-shadow" x="-80%" y="-80%" width="260%" height="260%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#151619" flood-opacity=".18"/></filter>
      </defs>
      <g data-model-enclosure fill="${modelSurface}" stroke="#c8cbc4" stroke-width="1.25">${modelOutline}</g>
      <g data-model-label transform="translate(${modelTag.x} ${modelTag.y})">
        <rect x="-4" y="-2" width="${modelTag.w+8}" height="${modelTag.h+4}" rx="9" fill="#fff"/>
        <rect width="${modelTag.w}" height="${modelTag.h}" rx="7" fill="#363b37"/>
        <rect x="11" y="8" width="12" height="12" rx="2" fill="none" stroke="#d9ded7" stroke-width="1.2"/>
        <path d="M15 5V8M19 5V8M15 20V23M19 20V23M8 12H11M8 16H11M23 12H26M23 16H26" stroke="#d9ded7" stroke-width="1"/>
        <text x="34" y="18" style="font-size:${mobile?9.5:10.5}px;font-weight:650;letter-spacing:.85px;fill:#fff">IN-MODEL</text>
      </g>
      <g data-wires>
        <path data-route="encode" d="${encode}" class="fc-wire"/>
        <path data-route="encode4" d="${encode4}" class="fc-wire"/>
        <path data-route="lookup" d="${lookup}" class="fc-ref-wire" marker-end="url(#fc-green-arrow)"/>
        <path data-route="readback" d="${readback}" class="fc-state-wire" marker-end="url(#fc-state-arrow)"/>
        <path data-route="refer" d="${refer}" class="fc-ref-wire" marker-end="url(#fc-green-arrow)"/>
        <path data-route="read" d="${read}" class="fc-state-wire" marker-end="url(#fc-state-arrow)"/>
        <path data-route="forecast" d="${forecast}" fill="none" stroke="${green}" stroke-width="1.5" marker-end="url(#fc-green-arrow)"/>
        <circle data-state-junction cx="${hub.x}" cy="${hub.y}" r="3.5" fill="${black}"/>
      </g>
      <g data-scene>
        <text x="${photo.x}" y="${mobile?57:57}" class="fc-label">Driving Scene</text>
        ${[3,2,1].map(i=>`<rect data-scene-layer="${i}" x="${photo.x+i*(mobile?3.5:7)}" y="${photo.y-i*(mobile?3.5:7)}" width="${photo.w}" height="${photo.h}" rx="7" fill="${['','#e0e4e9','#edf0f3','#f5f6f8'][i]}" stroke="#fff" stroke-width="1.5"/>`).join('')}
        <image data-scene-layer="0" href="assets/driving-scene.jpg" x="${photo.x}" y="${photo.y}" width="${photo.w}" height="${photo.h}" clip-path="url(#fc-photo-clip)"/>
        <rect x="${photo.x+photo.w*.06}" y="${photo.y+photo.h*.49}" width="${photo.w*.31}" height="${photo.h*.30}" rx="2" fill="none" stroke="#d7dee8" stroke-width="1.3"/>
        <g data-source-four transform="translate(${source4.x} ${source4.y})"><rect x="-12" y="-12" width="24" height="24" rx="6" fill="#626d7b" stroke="#e2e6eb" stroke-width="1.1"/><text x="0" y="6" text-anchor="middle" style="font-size:17px;font-weight:750;fill:#fff">4</text></g>
        <rect data-source-box x="${photo.x+photo.w*.536}" y="${photo.y+photo.h*.224}" width="${photo.w*.146}" height="${photo.h*.373}" rx="2" fill="none" stroke="${green}" stroke-width="2.5"/>
        <g transform="translate(${source.x} ${source.y})" data-source-badge>${badge}</g>
        <text x="${photo.x}" y="${photo.y+photo.h+24}" class="fc-note">Input Frames</text>
      </g>
      <g transform="translate(${m.x} ${m.y})">
        <text x="0" y="-8" class="fc-label" style="font-size:${mobile?10.3:12}px">Continuous Entity States</text><text x="0" y="9" class="fc-note" style="font-size:${mobile?9.3:11}px">Built During Prefill</text>
        <g data-memory>
          <rect x="0" y="25" width="${m.w}" height="105" rx="9" fill="#fff" stroke="#e2e3e6"/>
          ${memoryRow('4',46,false,[.3,.6,.45,.8,.6,.3,.8,.4])}
          ${memoryRow('9',82,true,pattern)}
          ${memoryRow('23',114,false,[.4,.2,.8,.5,.3,.7,.4,.6])}
        </g>
        <rect data-memory-halo x="6" y="66" width="${m.w-12}" height="32" rx="7" fill="none" stroke="${green}" stroke-width="3"/>
        <g data-preserved><path d="M7 151l3 3 6-7" fill="none" stroke="#808992" stroke-width="1.3"/><text x="23" y="155" class="fc-note" style="font-size:${mobile?9:11}px">Preserved For Both Reads</text></g>
      </g>
      <g transform="translate(${r.x} ${r.y})" data-reasoning>
        <rect x="-4" y="-30" width="87" height="24" fill="${modelSurface}"/><text x="0" y="-14" class="fc-label">Reasoner</text>
        <g data-token="lead"><rect x="0" y="1" width="42" height="36" rx="7" fill="#f3f4f5"/><text x="21" y="24" text-anchor="middle" style="font-size:12px">Lead</text></g>
        <g data-token="truck"><rect x="47" y="1" width="47" height="36" rx="7" fill="#f3f4f5"/><text x="70.5" y="24" text-anchor="middle" style="font-size:12px">truck</text></g>
        <g data-reference data-token="reference"><rect x="99" y="0" width="68" height="39" rx="9" fill="${black}"/><text x="133" y="26" text-anchor="middle" class="fc-mono" style="font-size:20px;font-weight:700;fill:${green}">&lt;|9|&gt;</text></g>
        <path data-reference-injection d="M170 20H187" fill="none" stroke="${green}" stroke-width="1.6" marker-end="url(#fc-green-arrow)"/>
        <g data-reason-read transform="translate(192 2)">
          <rect width="72" height="36" rx="7" fill="${black}"/>
          <text data-entity-state-label="9" x="8" y="23" class="fc-mono" style="font-size:12px;fill:#fff">${entityStateLabel(9)}</text>
          ${vector(31,6,37,24)}
          <rect data-hidden-halo x="-3" y="-3" width="78" height="42" rx="10" fill="none" stroke="${green}" stroke-width="1.5"/>
        </g>
        ${[['is',0,24],['slowing;',30,70],['slow',106,45],['down.',157,49]].map(([word,x,w],i)=>`<g data-token="next-${i}"><rect x="${x}" y="49" width="${w}" height="34" rx="7" fill="#fff" stroke="#d9ded1"/><text x="${x+w/2}" y="71" text-anchor="middle" style="font-size:12px">${word}</text><path d="M${x+5} 81H${x+w-5}" stroke="${green}" stroke-width="2.1" stroke-linecap="round"/></g>`).join('')}
        <path data-hidden-condition d="M222 41V91H12V86" fill="none" stroke="${green}" stroke-width="1.5"/>
        <circle data-hidden-pulse r="3.5" fill="${green}"/>
        <g data-grounded-reasoning><path d="M3 99H204" stroke="#d5d9cf" stroke-width="1"/><text x="103" y="115" text-anchor="middle" style="font-size:10px;font-weight:550;fill:#4d701b">State-Grounded Reasoning</text></g>
        <g data-token-cursor><rect width="2" height="14" rx="1" fill="${black}"/></g>
      </g>
      <g transform="translate(${plan.x} ${plan.y}) scale(${plan.s})" data-plan>
        ${mobile?`<rect x="5" y="${-35-14*fontScale}" width="${75*fontScale}" height="${21*fontScale}" fill="${modelSurface}"/>`:''}
        <text x="10" y="-35" class="fc-label" style="font-size:${13*fontScale}px">Planner</text>
        <g data-planner-reference><rect x="9" y="-5" width="50" height="24" rx="6" fill="#fff" stroke="#d4dbc9"/><text x="34" y="11" text-anchor="middle" class="fc-mono" style="font-size:${12*fontScale}px;fill:#537d13">&lt;|9|&gt;</text><path d="M34 19V24" stroke="${green}" stroke-width="1.4"/></g>
        <g data-plan-input>
          <rect x="9" y="24" width="143" height="43" rx="9" fill="#151619"/>
          <text data-entity-state-label="9" x="24" y="51" style="font-size:${13*fontScale}px;fill:#fff" class="fc-mono">${entityStateLabel(9)}</text>
          ${vector(64,31,73,27)}
        </g>
        <g data-interaction>
          <path d="M330 177L371 133M367 202L371 133" stroke="#d89a27" stroke-width="1.3" fill="none"/>
          <circle cx="371" cy="127" r="19" fill="#fff" stroke="#d89a27" stroke-width="1.7"/>
          <text x="371" y="133" text-anchor="middle" style="font-size:20px;font-weight:600;fill:#b9740c">!</text>
          <text x="339" y="99" text-anchor="middle" class="fc-note" style="font-size:${11*fontScale}px;fill:#b9740c">Same Future Time</text>
        </g>
        <rect x="9" y="160" width="441" height="85" rx="9" fill="#f9faf8" stroke="#d9dcd5" stroke-width="1"/>
        <path d="M22 161H437M22 244H437" stroke="#e2e3e6"/>
        <g data-base-proposal>
          <path d="M40 202H367" stroke="#a9afb8" stroke-width="2" stroke-dasharray="4 6" fill="none"/>
          ${base.slice(1).map(x=>`<circle cx="${x}" cy="202" r="5.5" fill="#fff" stroke="#a9afb8" stroke-width="1.5"/>`).join('')}
        </g>
        <g data-refined-proposal>
          <path data-proposal-path d="M40 202H367" stroke="${green}" stroke-width="3.5" fill="none"/>
          ${base.slice(1).map((x,i)=>`<circle data-action-dot="${i+1}" cx="${x}" cy="202" r="6.8" fill="${green}" stroke="#fff" stroke-width="1.4"/>`).join('')}
        </g>
        <g data-truck-forecast>
          <path d="M324 184H376" fill="none" stroke="${green}" stroke-width="1.6" stroke-dasharray="4 4"/>
          <rect x="351" y="186" width="50" height="32" rx="5" fill="#76b90009" stroke="${green}" stroke-width="1.5" stroke-dasharray="4 3"/>
        </g>
        <g data-future-ego><rect x="345" y="189" width="44" height="26" rx="7" fill="#d89a2720" stroke="#d89a27" stroke-width="1.5"/></g>
        <g data-overlap><circle cx="369" cy="202" r="34" fill="#e9a52216" stroke="#d89a27" stroke-width="1.3"/><circle cx="369" cy="202" r="27" fill="none" stroke="#d89a27" stroke-width="1"/></g>
        <g data-plan-truck transform="translate(324 202)">${truck}</g>
        <g data-ego transform="translate(40 202)">${ego}</g>
        <text x="40" y="268" text-anchor="middle" class="fc-note" style="font-size:${11*fontScale}px">Ego</text>
        <g data-clearance><path d="M252 227H351M252 222V232M351 222V232" fill="none" stroke="${green}" stroke-width="1.5"/><text x="301" y="263" text-anchor="middle" class="fc-note" style="font-size:${11*fontScale}px;fill:#151619">More Clearance</text></g>
        <g data-correction>
          <path data-risk-correction d="M404 127C457 127 458 301 322 302H222" fill="none" stroke="#d89a27" stroke-width="1.5"/>
          <circle cx="200" cy="302" r="20" fill="${black}"/>
          <text x="200" y="309" text-anchor="middle" style="font-size:21px;fill:#fff">Δ</text><text x="228" y="329" class="fc-note" style="font-size:${11*fontScale}px">Refine</text>
          <path data-correct-path d="M180 302C130 302 118 257 111 209" fill="none" stroke="${green}" stroke-width="2" marker-end="url(#fc-green-arrow)"/>
          <circle data-correction-pulse r="6" fill="${green}" stroke="#fff" stroke-width="2"/>
        </g>
        <g data-legend transform="translate(13 95)">
          <path d="M0 0H21" stroke="#a9afb8" stroke-width="2" stroke-dasharray="4 4"/>
          <text x="29" y="4" class="fc-note" style="font-size:${11*fontScale}px">Original</text>
          <path d="M0 23H21" stroke="${green}" stroke-width="3"/>
          <text x="29" y="27" class="fc-note" style="font-size:${11*fontScale}px;fill:#151619">Refined</text>
        </g>
      </g>
      <g data-context>
        ${mobile?`<path d="M${photo.x+photo.w/2} ${photo.y+photo.h+33}V${r.y-50}H10V${plan.y+257*plan.s}H${plan.x+40*plan.s}V${plan.y+217*plan.s}" class="fc-wire" marker-end="url(#fc-arrow)"/><text x="${W/2}" y="${H-10}" text-anchor="middle" class="fc-note">Full Context → Base Proposal</text>`:`<path d="M${photo.x+24} ${photo.y+photo.h+39}V493H${plan.x+40}V${plan.y+240}" class="fc-wire" marker-end="url(#fc-arrow)"/><text x="${photo.x+42}" y="486" class="fc-note">Full Context → Base Proposal</text><path d="M${r.x+165} ${r.y+121}V493" class="fc-wire"/>`}
      </g>
      ${mobile?'':`<g data-route-key transform="translate(800 502)"><path d="M0 0H23" class="fc-ref-wire"/><text x="29" y="4" class="fc-note" style="font-size:10px">Reference</text><path d="M102 0H125" class="fc-state-wire"/><text x="132" y="4" class="fc-note" style="font-size:10px">State Read</text></g>`}
      <g data-packet="address" filter="url(#fc-shadow)">${badge}</g>
      <g data-packet="state" filter="url(#fc-shadow)"><rect x="-45" y="-20" width="90" height="40" rx="8" fill="${black}"/><text data-entity-state-label="9" x="-36" y="5" class="fc-mono" style="font-size:12px;fill:#fff">${entityStateLabel(9)}</text>${vector(-11,-15,50,30)}</g>
      <g data-packet="prefill-four"><rect x="-23" y="-14" width="46" height="28" rx="6" fill="#626d7b"/>${vector(-18,-10,38,20,'#e3e7ed',[.3,.6,.45,.8,.6,.3,.8,.4])}</g>
    `;
    paths=Object.fromEntries([...svg.querySelectorAll('[data-route]')].map(el=>[el.dataset.route,el]));
    refs=Object.fromEntries([...svg.querySelectorAll('[data-action-dot]')].map(el=>[el.dataset.actionDot,el]));
    root.classList.add('is-ready');
    render(state.time);
  }
  function opacity(selector,n) {const el=$(selector);if(el)el.style.opacity=String(Math.max(0,Math.min(1,n)));}
  function travel(type,route,amount,reverse=false) {
    const packet=$(`[data-packet="${type}"]`),path=paths[route];
    if(amount<0||amount>1||!path){packet.style.opacity='0';return;}
    const q=path.getPointAtLength(path.getTotalLength()*(reverse?1-ease(amount):ease(amount)));
    packet.setAttribute('transform',`translate(${q.x} ${q.y})`);
    packet.style.opacity=String(Math.min(1,amount*12,(1-amount)*12));
  }
  function render(t,announce=false) {
    t=state.time=Math.max(0,Math.min(duration,t));
    if(!paths.encode)return;
    const chapter=chapters.reduce((acc,item,i)=>t>=item[0]?i:acc,0);
    const caption=t>=23.4?'Earlier Slowing. More Clearance.':chapters[chapter][1];
    if(chapter!==state.chapter||$('[data-flow-caption]').textContent!==caption){
      state.chapter=chapter;text('[data-flow-step]',String(chapter+1).padStart(2,'0'));text('[data-flow-caption]',caption);
      if(announce)text('[data-flow-live]',caption);
    }
    root.dataset.chapter=chapter;
    root.dataset.time=t.toFixed(2);
    const stored=p(t,2.7,3.6),selected=p(t,5.05,5.25),read=p(t,12.5,13.5),forecast=p(t,13.7,14.9),risk=p(t,15,16.4),change=morph(t);
    opacity('[data-source-box]',.55+.45*p(t,.1,1));
    opacity('[data-source-badge]',.55+.45*p(t,.1,1));
    opacity('[data-memory]',.25+.75*p(t,1.7,3.6));
    opacity('[data-memory-row="4"]',.12+.88*p(t,2.35,2.75));
    opacity('[data-memory-row="9"]',.12+.88*stored);
    opacity('[data-memory-row="23"]',.12+.88*p(t,2.85,3.45));
    opacity('[data-preserved]',p(t,3.4,3.8));
    opacity('[data-state-junction]',stored*.7);
    opacity('[data-memory-halo]',((t>=5.4&&t<=7.7)||(t>=11.2&&t<=13.5))?.5+.5*Math.sin(t*7):0);
    opacity('[data-reasoning]',1);
    opacity('[data-token="lead"]',p(t,3.8,4.0));
    opacity('[data-token="truck"]',p(t,4.25,4.45));
    opacity('[data-reference]',selected);
    opacity('[data-reference-injection]',p(t,7.45,7.7));
    opacity('[data-reason-read]',p(t,7.45,7.75));
    opacity('[data-hidden-halo]',t>=7.5&&t<9.95?(.25+.65*Math.sin((t-7.5)*5)**2):0);
    const emissionTimes=[8.1,8.6,9.1,9.6];
    emissionTimes.forEach((start,i)=>opacity(`[data-token="next-${i}"]`,p(t,start,start+.18)));
    opacity('[data-hidden-condition]',p(t,7.8,8.05));
    opacity('[data-grounded-reasoning]',p(t,9.8,10.05));
    const hiddenPath=$('[data-hidden-condition]'),hiddenPulse=$('[data-hidden-pulse]');
    const nextCenters=[12,65,128.5,181.5];
    const emitting=emissionTimes.findIndex(start=>t>=start-.4&&t<=start+.1);
    if(emitting>=0){
      const x=nextCenters[emitting];
      hiddenPath.setAttribute('d',`M222 41V91H${x}V86`);
      const q=hiddenPath.getPointAtLength(hiddenPath.getTotalLength()*ease((t-(emissionTimes[emitting]-.4))/.5));
      hiddenPulse.setAttribute('cx',q.x);hiddenPulse.setAttribute('cy',q.y);hiddenPulse.style.opacity='1';
    }else{hiddenPulse.style.opacity='0';hiddenPath.setAttribute('d','M222 41V91H12V86');}
    const cursor=$('[data-token-cursor]');
    const cursorPose=t<4.25?[45,12]:t<5.05?[96,12]:t<7.75?[173,12]:t<8.6?[27,59]:t<9.1?[103,59]:t<9.6?[154,59]:[211,59];
    cursor.setAttribute('transform',`translate(${cursorPose[0]} ${cursorPose[1]})`);
    cursor.style.opacity=t>=3.8&&t<9.85?String(.35+.65*Math.sin(t*7)**2):'0';
    root.dataset.reasoningTokens=String((t>=3.8?1:0)+(t>=4.25?1:0)+(t>=5.05?1:0)+emissionTimes.filter(start=>t>=start).length);
    root.dataset.reasonStateRead=String(t>=7.75);
    opacity('[data-plan-input]',.08+.92*read);
    opacity('[data-planner-reference]',p(t,10.8,11.25));
    opacity('[data-plan-truck]',.2+.8*forecast);
    opacity('[data-base-proposal]',.25+.75*p(t,10.2,11.2));
    opacity('[data-truck-forecast]',forecast);
    opacity('[data-future-ego]',risk*(1-p(t,22.4,23.4)));
    opacity('[data-interaction]',risk*(1-p(t,22.4,23.4)));
    opacity('[data-overlap]',risk*(1-change));
    opacity('[data-refined-proposal]',p(t,18.8,19.15));
    opacity('[data-clearance]',p(t,22.8,23.5));
    opacity('[data-correction]',p(t,17.7,18.6));
    opacity('[data-risk-correction]',1-.82*p(t,22.4,23.4));
    opacity('[data-legend]',p(t,18.6,19.2));
    const routeOp={encode:p(t,1.8,2.4)*(.55-.4*p(t,3.6,4.1)),encode4:p(t,1.6,2)*(.38-.28*p(t,2.75,3.4)),lookup:p(t,5.4,6)*(.7-.5*p(t,6.4,7.1)),readback:p(t,6.5,7.4)*(.9-.42*p(t,8,8.8)),refer:p(t,10,11)*.55,read:read*.8,forecast:forecast*.55};
    Object.entries(routeOp).forEach(([k,v])=>paths[k].style.opacity=v);
    travel('address',null,-1);travel('state',null,-1);travel('prefill-four',null,-1);
    const motions=[
      [1.6,2.65,'prefill-four','encode4'],[2,3.6,'state','encode'],[5.45,6.4,'address','lookup'],
      [6.5,7.65,'state','readback'],[10.05,11.25,'address','refer'],[11.28,12.05,'address','read',true],
      [12.08,13.5,'state','read'],[13.6,14.9,'state','forecast']
    ];
    motions.forEach(([a,b,type,route,reverse])=>{if(t>=a&&t<=b)travel(type,route,(t-a)/(b-a),reverse);});
    const xs=base.map((x,i)=>x+(refined[i]-x)*change);
    Object.entries(refs).forEach(([i,el])=>el.setAttribute('cx',xs[Number(i)].toFixed(2)));
    $('[data-proposal-path]').setAttribute('d',`M40 202H${xs.at(-1).toFixed(2)}`);
    const pulse=$('[data-correction-pulse]'), correction=$('[data-correct-path]');
    const wave=t>=19&&t<=23.4?((t-19)%1.45)/1.45:-1;
    if(wave>=0){const q=correction.getPointAtLength(correction.getTotalLength()*wave);pulse.setAttribute('cx',q.x);pulse.setAttribute('cy',q.y);pulse.style.opacity=String(Math.sin(wave*Math.PI));}else pulse.style.opacity='0';
    const halo=$('[data-overlap]');halo.style.transformOrigin='369px 202px';halo.style.transform=`scale(${1+(.06*Math.sin(t*6))*(1-change)})`;
    $('#flow-timeline').value=t;
    $('#flow-timeline').setAttribute('aria-valuetext',`${caption} ${Math.floor(t)} of ${duration} seconds.`);
    text('[data-flow-time]',`0:${String(Math.floor(t)).padStart(2,'0')}`);
  }
  function controls(){text('[data-flow-play-icon]',state.playing?'Ⅱ':'▶');$('[data-flow-play]').setAttribute('aria-label',state.playing?'Pause method animation':state.time>=duration?'Replay method animation':'Play method animation');}
  function stop(){state.playing=false;cancelAnimationFrame(state.raf);state.previous=0;controls();}
  function tick(now){
    if(!state.playing)return;
    const delta=state.previous?Math.min((now-state.previous)/1000,.12):0;state.previous=now;render(state.time+delta);
    if(state.time>=duration){state.wanted=false;stop();return;}state.raf=requestAnimationFrame(tick);
  }
  function play(){
    if(state.time>=duration)render(0,true);
    state.wanted=true;state.started=true;
    if(document.hidden)return;
    if(!state.playing){state.playing=true;state.previous=0;state.raf=requestAnimationFrame(tick);controls();}
  }
  function seek(t){state.wanted=false;state.started=true;stop();render(t,true);controls();}
  $('[data-flow-play]').addEventListener('click',()=>{if(state.playing){state.wanted=false;stop();}else play();});
  $('[data-flow-replay]').addEventListener('click',()=>{render(0,true);play();});
  $('#flow-timeline').addEventListener('input',event=>seek(Number(event.target.value)));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(state.wanted&&state.visible)play();});
  reduced.addEventListener('change',event=>{if(event.matches)seek(duration);});
  state.time=reduced.matches?duration:0;
  build();controls();
  let lastWidth=$('.flow-stage').clientWidth;
  if('ResizeObserver'in window)new ResizeObserver(entries=>{const w=entries[0].contentRect.width;if(Math.abs(w-lastWidth)>1){lastWidth=w;build();}}).observe($('.flow-stage'));
  if('IntersectionObserver'in window){
    new IntersectionObserver(entries=>{
      state.visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.4;
      if(state.visible&&!document.hidden){if(!state.started&&!reduced.matches)play();else if(state.wanted)play();}
      else if(state.playing)stop();
    },{threshold:.4}).observe($('.flow-stage'));
  }
})();
