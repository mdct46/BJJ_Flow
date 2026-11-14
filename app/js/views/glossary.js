// Glossary page: searchable list of every technique.
// Route: #/glossary or #/glossary?q=<search>
import { SUB_GLOSSARY, EDGE_GLOSSARY, GLOSSARY_SECTIONS, SWEEP_STEPS, TYPE_COLOR, TYPE_NOUN, byName } from '../data.js';
import { esc, stepsList, subDetailHtml, matchesQuery, toggleAccordion } from '../ui.js';

let root = null;

export function mount(el, route){
  root = el;
  const initial = route.query.q || '';
  el.innerHTML = `
    <div class="glossary-page">
      <div class="toolbar">
        <div class="seg">
          <a href="#/map">Map</a>
          <a href="#/glossary" class="active">Glossary</a>
        </div>
        <input type="search" id="glossarySearch" class="search" placeholder="Search techniques or positions…" autocomplete="off" value="${esc(initial)}">
      </div>
      <div class="page"><div class="page-inner" id="glossaryBody"></div></div>
    </div>`;

  const input = el.querySelector('#glossarySearch');
  input.addEventListener('input', ()=>{
    const q = input.value.trim();
    history.replaceState(null, '', q ? `#/glossary?q=${encodeURIComponent(q)}` : '#/glossary');
    render(q, false);
  });
  el.querySelector('#glossaryBody').addEventListener('click', ev=>{
    const btn = ev.target.closest('.gloss-toggle');
    if(btn) toggleAccordion(btn);
  });

  // Arriving with a search (e.g. from Home), open the exact match so the steps are right there.
  render(initial, true);
}

export function unmount(){ root = null; }

function renderSubEntry(entry, open){
  return `<div class="gloss-item">
    <button class="gloss-toggle${open?' open':''}">
      <span class="chev">▸</span>
      <span class="gloss-name">${esc(entry.name)}</span>
      <span class="gloss-tag" style="background:var(--sub);">submission</span>
    </button>
    <div class="gloss-steps-wrap${open?' open':''}">
      <div class="gloss-detail">${subDetailHtml(entry, 'Available from')}</div>
    </div>
  </div>`;
}

function routeHtml(r){
  const link = n => byName[n] ? `<a class="pos-link" href="#/map/${byName[n].id}">${esc(n)}</a>` : esc(n);
  return `<div class="gloss-route">${link(r.from)} → ${link(r.to)}</div>`;
}

function renderEdgeEntry(entry, open){
  const steps = entry.type==='sweep' ? SWEEP_STEPS[entry.name] : null;
  return `<div class="gloss-item">
    <button class="gloss-toggle${open?' open':''}">
      <span class="chev">▸</span>
      <span class="gloss-name">${esc(entry.name)}</span>
      <span class="gloss-tag" style="background:${TYPE_COLOR[entry.type]};">${TYPE_NOUN[entry.type]}</span>
    </button>
    <div class="gloss-steps-wrap${open?' open':''}">
      <div class="gloss-detail">${steps ? stepsList(steps) : ''}${entry.routes.map(routeHtml).join('')}</div>
    </div>
  </div>`;
}

function render(query, openExact){
  const body = root.querySelector('#glossaryBody');
  const exact = openExact && query ? query.toLowerCase() : null;
  let html = '';

  GLOSSARY_SECTIONS.forEach(section=>{
    const source = section.key==='submission' ? SUB_GLOSSARY : EDGE_GLOSSARY[section.key];
    const entries = source.filter(e=>matchesQuery(e, query));
    if(entries.length===0) return;
    const renderer = section.key==='submission' ? renderSubEntry : renderEdgeEntry;
    html += `<div class="glossary-section">
      <div class="glossary-section-title" style="color:${section.color}">
        ${section.title} <span class="glossary-section-count">(${entries.length})</span>
      </div>
      ${entries.map(e=>renderer(e, exact && e.name.toLowerCase()===exact)).join('')}
    </div>`;
  });

  body.innerHTML = html || `<div class="empty-state">No matches for “${esc(query)}”.</div>`;
}
