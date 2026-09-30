// Values transcribed from the current integrated sec/4_evaluation.tex.
// C is used where reported; D-only baselines retain their actual generation mode.
const datasets = {
  closed: {
    description: 'AlpaSim · public_2601 · 913 scenes',
    headers: ['Model', 'Model Size', 'Mode', 'Progress ↑', 'At-Fault Collision ↓', 'Off-Road ↓', 'Wrong Lane ↓'],
    rows: [
      ['FSDrive†', '2.1B', 'D', '.604', '.193', '.271', '.210'],
      ['Alpamayo-R1', '10B', 'C', '.682', '.156', '.189', '.295'],
      ['AutoVLA†', '2.1B', 'D', '.706', '.118', '.185', '.211'],
      ['LCDrive', '0.6B', 'D', '.639', '.259', '.263', '.189'],
      ['Alpamayo 1.5', '10B', 'C', '.682', '.166', '.155', '.297'],
      ['SpanVLA†', '3.8B', 'C', '.696', '.156', '.184', '.207'],
      ['GroundAct', '3.9B', 'C', '.752', '.105', '.153', '.207']
    ],
    note: 'Representative generation mode for each model. Progress is higher-is-better; safety metrics are lower-is-better. See the paper for the full evaluation protocol.', higher: [3]
  },
  normal: {
    description: 'PAI-AV Normal · 4,000-sample split',
    headers: ['Model', 'Model Size', 'Mode', 'ADE 2.5s ↓', 'ADE 5.0s ↓', 'ADE 6.4s ↓', 'Collision 2.5s ↓', 'Collision 5.0s ↓', 'Corner Dist. 6.4s ↓'],
    rows: [
      ['FSDrive†', '2.1B', 'D', '0.417', '1.809', '3.112', '2.943', '10.721', '3.231'],
      ['Alpamayo-R1', '10B', 'C', '0.535', '2.263', '3.802', '3.714', '12.472', '3.945'],
      ['AutoVLA†', '2.1B', 'D', '0.555', '1.780', '2.848', '2.557', '9.014', '2.910'],
      ['LCDrive', '0.6B', 'D', '0.332', '1.503', '2.615', '2.292', '9.100', '2.676'],
      ['Alpamayo 1.5', '10B', 'C', '0.575', '2.247', '3.647', '3.952', '12.806', '3.770'],
      ['SpanVLA†', '3.8B', 'C', '0.496', '1.818', '2.844', '2.531', '8.339', '2.931'],
      ['GroundAct', '3.9B', 'C', '0.325', '1.332', '2.210', '2.474', '6.873', '2.278']
    ],
    note: 'ADE and corner distance in meters; collision in percent. Metrics average six candidates per evaluated sample. Continuous results are used where reported; FSDrive, AutoVLA, and LCDrive use their reported discrete results.', higher: []
  },
  safety: {
    description: 'PAI-AV* Safety-Critical · 512-sample split',
    headers: ['Model', 'Model Size', 'Mode', 'ADE 2.5s ↓', 'ADE 5.0s ↓', 'ADE 6.4s ↓', 'Collision 2.5s ↓', 'Collision 5.0s ↓', 'Off-Road 2.5s ↓', 'Off-Road 5.0s ↓', 'Corner Dist. 6.4s ↓'],
    rows: [
      ['FSDrive†', '2.1B', 'D', '0.533', '2.249', '3.823', '3.797', '20.161', '5.712', '28.394', '3.992'],
      ['Alpamayo-R1', '10B', 'C', '1.014', '4.054', '6.521', '7.230', '28.840', '14.388', '38.411', '6.872'],
      ['AutoVLA†', '2.1B', 'D', '0.570', '1.907', '3.027', '1.465', '14.290', '4.297', '17.383', '3.069'],
      ['LCDrive', '0.6B', 'D', '0.384', '1.585', '2.633', '1.074', '12.370', '1.530', '9.668', '2.709'],
      ['Alpamayo 1.5', '10B', 'C', '0.865', '3.384', '5.396', '6.152', '29.460', '10.221', '37.402', '5.665'],
      ['SpanVLA†', '3.8B', 'C', '0.561', '2.213', '3.182', '1.302', '15.625', '2.539', '17.643', '5.195'],
      ['GroundAct', '3.9B', 'C', '0.431', '1.565', '2.501', '0.488', '9.668', '1.042', '8.496', '2.571']
    ],
    note: 'ADE and corner distance in meters; collision and off-road in percent. Continuous results are used where reported; FSDrive, AutoVLA, and LCDrive use their reported discrete results. Selective action-expert correction is active in GroundAct’s continuous generation.', higher: []
  }
};
const tabs = [...document.querySelectorAll('[data-table]')];
function updateTableScrollHint() {
  const viewport = document.querySelector('.table-scroll');
  document.getElementById('table-scroll-hint').hidden = viewport.scrollWidth <= viewport.clientWidth + 1;
}
function showTable(key) {
  const data = datasets[key];
  document.getElementById('table-description').textContent = data.description;
  document.getElementById('table-note').textContent = data.note;
  document.getElementById('results-panel').setAttribute('aria-labelledby', 'tab-' + key);
  const table = document.getElementById('performance-table');
  table.replaceChildren();
  const thead = table.createTHead(), head = thead.insertRow();
  data.headers.slice(0, 3).forEach((label, i) => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = i === 1 ? 'Size' : label; if (i === 1) th.setAttribute('aria-label', 'Model Size'); if(key !== 'closed') th.rowSpan = 2; head.append(th); });
  if(key === 'closed'){
    data.headers.slice(3).forEach(label => { const th = document.createElement('th'); th.scope='col'; th.textContent=label; head.append(th); });
  }else{
    const groups = [{label:'ADE (m) ↓', spans:3}, {label:'Collision (%) ↓', spans:2}, ...(key==='safety'?[{label:'Off-Road (%) ↓', spans:2}]:[]), {label:'Corner Dist. (m) ↓', spans:1}];
    groups.forEach(group => { const th=document.createElement('th'); th.scope='colgroup'; th.colSpan=group.spans; th.textContent=group.label; head.append(th); });
    const horizons=thead.insertRow(); horizons.className='metric-horizons';
    data.headers.slice(3).forEach(label=>{const th=document.createElement('th');th.scope='col';th.textContent=label.match(/\d+\.\d+s/)[0];horizons.append(th);});
  }
  const body = table.createTBody();
  data.rows.forEach(row => {
    const tr = body.insertRow();
    if (row[0] === 'GroundAct') tr.className = 'ours';
    row.forEach((value, i) => {
      const td = tr.insertCell();
      const text = i >= 3 && key === 'closed' ? Number(value).toFixed(3) : value;
      if (i >= 3) {
        const metric = document.createElement('span');
        metric.className = 'metric-value';
        metric.textContent = text;
        td.append(metric);
      } else td.textContent = text;
    });
  });
  tabs.forEach(t => { const active = t.dataset.table === key; t.setAttribute('aria-selected', active); t.tabIndex = active ? 0 : -1; });
  requestAnimationFrame(updateTableScrollHint);
  document.dispatchEvent(new CustomEvent('groundact:panelchange', {detail: document.getElementById('results-panel')}));
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => showTable(tab.dataset.table));
  tab.addEventListener('keydown', e => {
    let next;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { e.preventDefault(); showTable(tabs[next].dataset.table); tabs[next].focus(); }
  });
});
showTable('closed');
if('ResizeObserver' in window) new ResizeObserver(updateTableScrollHint).observe(document.querySelector('.table-scroll'));
const dialog = document.getElementById('figure-dialog');
let figureTrigger;
document.querySelectorAll('.zoomable').forEach(button => button.addEventListener('click', () => {
  figureTrigger = button;
  const img = button.querySelector('img');
  dialog.querySelector('img').src = img.src;
  dialog.querySelector('img').alt = img.alt;
  dialog.querySelector('p').textContent = button.dataset.caption;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
}));
document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); }});
dialog.addEventListener('close', () => { document.body.style.overflow = ''; figureTrigger?.focus({preventScroll: true}); });
document.getElementById('copy-citation').addEventListener('click', async e => {
  const button = e.currentTarget;
  const text = document.getElementById('citation-code').textContent;
  let copied = false;
  try { await navigator.clipboard.writeText(text); copied = true; }
  catch { const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.append(t); t.select(); copied = document.execCommand('copy'); t.remove(); }
  button.textContent = copied ? 'Copied ✓' : 'Select And Copy Below';
  document.getElementById('status-message').textContent = copied ? 'Citation copied to clipboard.' : 'Please select the citation text to copy it.';
  setTimeout(() => button.innerHTML = 'Copy Citation <span aria-hidden="true">⧉</span>', 2200);
});
const sectionObserver = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) document.querySelectorAll('.nav-links a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
}, { rootMargin: '-15% 0px -55% 0px' });
document.querySelectorAll('#overview, #method, #results').forEach(s => sectionObserver.observe(s));
