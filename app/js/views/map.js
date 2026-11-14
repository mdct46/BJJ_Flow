// Map page: SVG node-link diagram plus the position detail panel.
// Route: #/map or #/map/<positionId>
import { POSITIONS, EDGES, CHAINS, SWEEP_STEPS, TYPE_COLOR, TYPE_NOUN, ADV_COLOR_HEX, byId, getSteps } from '../data.js';
import { esc, stepsList, toggleAccordion } from '../ui.js';

const NS = 'http://www.w3.org/2000/svg';
const MOBILE_MQ = window.matchMedia('(max-width: 760px)');

let activeFilter = 'all'; // kept across visits to the page
let root = null;
let selected = null;
let onKeydown = null;

export function mount(el, route){
  root = el;
  el.innerHTML = `
    <div class="map-page">
      <div class="toolbar">
        <div class="seg">
          <a href="#/map" class="active">Map</a>
          <a href="#/glossary">Glossary</a>
        </div>
        <div class="filters" id="filters">
          ${['all','pass','sweep','escape','transition'].map(t=>`
            <button class="filter-btn${t===activeFilter?' active':''}" data-type="${t}">${t==='all'?'All flow':TYPE_NOUN[t]+(t==='pass'?'es':'s')}</button>`).join('')}
        </div>
      </div>
      <div class="legend">
        <div class="legend-item"><span class="swatch dot" style="background:var(--gold)"></span> top control</div>
        <div class="legend-item"><span class="swatch dot" style="background:var(--slate)"></span> bottom / disadvantage</div>
        <div class="legend-item"><span class="swatch dot" style="background:var(--grey)"></span> neutral</div>
        <div class="legend-item"><span class="swatch" style="background:var(--pass)"></span> pass (top advances)</div>
        <div class="legend-item"><span class="swatch" style="background:var(--sweep)"></span> sweep (bottom reverses)</div>
        <div class="legend-item"><span class="swatch" style="background:var(--escape)"></span> escape (return to safety)</div>
        <div class="legend-item"><span class="swatch" style="background:var(--transition)"></span> transition / entry</div>
        <div class="legend-item"><span class="swatch dot" style="background:var(--sub)"></span> submission</div>
      </div>
      <div class="map-view">
        <div class="canvas-wrap" id="canvasWrap">
          <svg id="mapSvg" viewBox="0 0 1360 900" width="1360" height="900"></svg>
        </div>
        <aside class="panel empty" id="panel">
          <div class="panel-empty-text">Tap any position on the map to see how a fight moves through it: the passes and sweeps that lead in, the submissions available, and the escapes back to safety.</div>
        </aside>
      </div>
    </div>`;

  buildSVG();

  el.querySelector('#filters').addEventListener('click', ev=>{
    const btn = ev.target.closest('.filter-btn');
    if(!btn) return;
    el.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.type;
    applyFilter();
  });

  // Mobile bottom sheet: tap empty map space or press Escape to close.
  el.querySelector('#canvasWrap').addEventListener('click', ev=>{
    if(!MOBILE_MQ.matches) return;
    if(ev.target.closest('.node-group') || ev.target.closest('.edge')) return;
    closePanel();
  });
  onKeydown = ev=>{ if(ev.key==='Escape' && MOBILE_MQ.matches) closePanel(); };
  document.addEventListener('keydown', onKeydown);

  if(route.param && byId[route.param]){
    selectNode(route.param);
    scrollToNode(route.param);
  }
}

export function unmount(){
  if(onKeydown) document.removeEventListener('keydown', onKeydown);
  onKeydown = null;
  root = null;
  selected = null;
}

function edgeAnchor(a,b){
  const dx=b.x-a.x, dy=b.y-a.y;
  const dist = Math.sqrt(dx*dx+dy*dy) || 1;
  const ux=dx/dist, uy=dy/dist;
  const sx = a.x + ux*(a.w/2+2), sy = a.y + uy*(a.h/2+2);
  const ex = b.x - ux*(b.w/2+2), ey = b.y - uy*(b.h/2+2);
  const mx=(sx+ex)/2, my=(sy+ey)/2;
  const bend = 22;
  return {sx,sy,ex,ey,cx:mx - uy*bend, cy:my + ux*bend};
}

function svgEl(tag, attrs){
  const node = document.createElementNS(NS, tag);
  Object.entries(attrs||{}).forEach(([k,v])=>node.setAttribute(k,v));
  return node;
}

function buildSVG(){
  const svg = root.querySelector('#mapSvg');
  svg.innerHTML = '';

  const defs = svgEl('defs');
  Object.entries(TYPE_COLOR).forEach(([type,color])=>{
    const marker = svgEl('marker', {id:`arrow-${type}`, viewBox:'0 0 10 10', refX:'8', refY:'5', markerWidth:'7', markerHeight:'7', orient:'auto-start-reverse'});
    marker.appendChild(svgEl('path', {d:'M 0 0 L 10 5 L 0 10 z', fill:color}));
    defs.appendChild(marker);
  });
  svg.appendChild(defs);

  const edgeLayer = svgEl('g'), tickLayer = svgEl('g'), nodeLayer = svgEl('g');
  svg.append(edgeLayer, tickLayer, nodeLayer);

  EDGES.forEach((e,i)=>{
    const {sx,sy,ex,ey,cx,cy} = edgeAnchor(byId[e.from], byId[e.to]);
    const path = svgEl('path', {d:`M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`, class:'edge', stroke:TYPE_COLOR[e.type], 'marker-end':`url(#arrow-${e.type})`});
    path.dataset.type = e.type;
    path.dataset.index = i;

    // belt-stripe ticks along the curve (signature detail)
    const tickCount = 3;
    for(let t=1;t<=tickCount;t++){
      const f = t/(tickCount+1);
      const tx = (1-f)*(1-f)*sx + 2*(1-f)*f*cx + f*f*ex;
      const ty = (1-f)*(1-f)*sy + 2*(1-f)*f*cy + f*f*ey;
      const dxt = 2*(1-f)*(cx-sx) + 2*f*(ex-cx);
      const dyt = 2*(1-f)*(cy-sy) + 2*f*(ey-cy);
      const len = Math.sqrt(dxt*dxt+dyt*dyt) || 1;
      const nx = -dyt/len, ny = dxt/len;
      const tick = svgEl('line', {x1:tx-nx*4, y1:ty-ny*4, x2:tx+nx*4, y2:ty+ny*4, class:'edge-tick', stroke:TYPE_COLOR[e.type]});
      tick.dataset.type = e.type;
      tickLayer.appendChild(tick);
    }

    path.addEventListener('click', ()=> selectNode(e.from));
    edgeLayer.appendChild(path);
  });

  POSITIONS.forEach(p=>{
    const g = svgEl('g', {class:'node-group'});
    g.dataset.id = p.id;
    g.appendChild(svgEl('rect', {x:p.x-p.w/2, y:p.y-p.h/2, width:p.w, height:p.h, rx:4, class:'node-rect', stroke:ADV_COLOR_HEX[p.adv]}));
    const label = svgEl('text', {x:p.x, y:p.y-2, 'text-anchor':'middle', class:'node-label'});
    label.textContent = p.name;
    const sub = svgEl('text', {x:p.x, y:p.y+16, 'text-anchor':'middle', class:'node-sub'});
    sub.textContent = p.sub;
    g.append(label, sub);
    g.addEventListener('click', ()=> selectNode(p.id));
    nodeLayer.appendChild(g);
  });

  applyFilter();
}

function applyFilter(){
  root.querySelectorAll('.edge, .edge-tick').forEach(el=>{
    el.classList.toggle('dimmed', !(activeFilter==='all' || el.dataset.type===activeFilter));
  });
}

function scrollToNode(id){
  const p = byId[id];
  const wrap = root.querySelector('#canvasWrap');
  wrap.scrollLeft = Math.max(0, p.x - wrap.clientWidth/2);
  // On phones the bottom sheet covers the lower part of the map, so park the node near the top.
  wrap.scrollTop = Math.max(0, MOBILE_MQ.matches ? p.y - p.h - 24 : p.y - wrap.clientHeight/3);
}

function selectNode(id){
  selected = id;
  root.querySelectorAll('.node-group').forEach(g=>g.classList.toggle('selected', g.dataset.id===id));
  renderPanel(id);
  const panel = root.querySelector('#panel');
  panel.classList.remove('empty');
  panel.classList.add('open');
  root.querySelector('.map-view').classList.add('panel-open');
  // Keep the URL in step with the selection without triggering a re-render.
  history.replaceState(null, '', `#/map/${id}`);
}

function closePanel(){
  if(!root) return;
  root.querySelector('#panel').classList.remove('open');
  root.querySelector('.map-view').classList.remove('panel-open');
  selected = null;
  root.querySelectorAll('.node-group').forEach(g=>g.classList.remove('selected'));
  history.replaceState(null, '', '#/map');
}

function connRow(e, otherId, direction){
  const other = byId[otherId];
  const title = direction==='out' ? `${TYPE_NOUN[e.type]} → ${other.name}` : `${other.name} → ${TYPE_NOUN[e.type]}`;
  return `<span class="conn-tick" style="background:${TYPE_COLOR[e.type]}"></span>
    <span class="conn-text"><b>${title}</b><span>${esc(e.label)}</span></span>`;
}

function renderPanel(id){
  const p = byId[id];
  const out = EDGES.filter(e=>e.from===id);
  const inn = EDGES.filter(e=>e.to===id);
  const panel = root.querySelector('#panel');
  const advLabel = p.adv==='top' ? 'Top control' : p.adv==='bottom' ? 'Bottom / disadvantage' : 'Neutral';

  const outHtml = out.map(e=>{
    const steps = e.type==='sweep' ? SWEEP_STEPS[e.label] : null;
    if(!steps) return `<div class="conn-item" data-target="${e.to}">${connRow(e, e.to, 'out')}</div>`;
    // Sweeps with basics: tap the row to navigate, tap the chevron to expand the steps in place.
    return `<div class="sub-item">
      <div class="conn-item" data-target="${e.to}" style="justify-content:space-between;">
        <span style="display:flex;align-items:center;gap:8px;">${connRow(e, e.to, 'out')}</span>
        <button class="sub-toggle-chevron sweep-toggle" aria-label="Show steps">▸</button>
      </div>
      <div class="sub-steps-wrap"><div class="sub-steps">${stepsList(steps)}</div></div>
    </div>`;
  }).join('');

  const innHtml = inn.map(e=>`<div class="conn-item" data-target="${e.from}">${connRow(e, e.from, 'in')}</div>`).join('');

  const subsHtml = p.subs.map(s=>{
    const steps = getSteps(s);
    return `<div class="sub-item">
      <button class="sub-toggle"><span class="sub-toggle-chevron">▸</span> ${esc(s)}</button>
      <div class="sub-steps-wrap"><div class="sub-steps">${steps ? stepsList(steps) : 'Steps coming soon.'}</div></div>
    </div>`;
  }).join('');

  const chain = CHAINS.find(c=>c.position===id);
  const chainHtml = !chain ? '' : `
    <div class="panel-section">
      <div class="section-label">Submission chain</div>
      <div class="chain-note">${esc(chain.note)}</div>
      <div class="conn-list">
        ${chain.steps.map((s,i)=>`
          <div class="conn-item" style="cursor:default;">
            <span class="conn-tick" style="background:var(--sub);"></span>
            <span class="conn-text"><b>${i+1}. ${esc(s.sub)}</b><span>${i===0 ? 'Opening attack' : esc(s.trigger)}</span></span>
          </div>`).join('')}
      </div>
    </div>`;

  const none = '<span class="none-mapped">None mapped</span>';
  panel.innerHTML = `
    <div class="panel-header">
      <button class="panel-close" aria-label="Close">&times;</button>
      <span class="panel-adv" style="background:${ADV_COLOR_HEX[p.adv]}">${advLabel}</span>
      <h2 class="panel-title">${esc(p.name)}</h2>
      <div class="panel-desc">${p.desc}</div>
    </div>
    <div class="panel-section">
      <div class="section-label">Submissions from here: tap for basics</div>
      <div class="sub-list">${subsHtml}</div>
    </div>
    ${chainHtml}
    <div class="panel-section">
      <div class="section-label">Ways out (passes, sweeps, escapes)</div>
      <div class="conn-list">${outHtml || none}</div>
    </div>
    <div class="panel-section">
      <div class="section-label">Ways in</div>
      <div class="conn-list">${innHtml || none}</div>
    </div>`;
  panel.scrollTop = 0;

  panel.querySelector('.panel-close').addEventListener('click', closePanel);
  panel.querySelectorAll('.conn-item[data-target]').forEach(row=>{
    row.addEventListener('click', ()=> selectNode(row.dataset.target));
  });
  panel.querySelectorAll('.sub-toggle').forEach(btn=>{
    btn.addEventListener('click', ()=> toggleAccordion(btn));
  });
  panel.querySelectorAll('.sweep-toggle').forEach(btn=>{
    btn.addEventListener('click', ev=>{
      ev.stopPropagation();
      const wrap = btn.closest('.sub-item').querySelector('.sub-steps-wrap');
      btn.classList.toggle('open', wrap.classList.toggle('open'));
    });
  });
}
