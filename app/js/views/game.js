// My Game page: self-ratings, radar chart and the Practice next list.
// Route: #/game
import { GLOSSARY_SECTIONS, SWEEP_STEPS } from '../data.js';
import { esc, stepsList, subDetailHtml, positionLinks, matchesQuery, toggleAccordion } from '../ui.js';
import { LEVELS, ALL_SKILLS, SKILL_TYPE_COLOR, SKILL_TYPE_NOUN, getLevel, cycleLevel, levelCounts, computePracticeNext, radarSvg } from '../ratings.js';

let root = null;

export function mount(el){
  root = el;
  el.innerHTML = `
    <div class="page game-page">
      <div class="game-top">
        <div class="radar-wrap" id="radarWrap"></div>
        <div class="level-legend" id="levelLegend"></div>
      </div>
      <div class="practice-next" id="practiceNext"></div>
      <div class="toolbar sticky">
        <input type="search" id="gameSearch" class="search" placeholder="Search your skills…" autocomplete="off">
      </div>
      <div class="page-inner" id="gameBody"></div>
    </div>`;

  el.querySelector('#gameSearch').addEventListener('input', ()=> renderList());

  el.querySelector('#gameBody').addEventListener('click', ev=>{
    const levelBtn = ev.target.closest('.level-btn');
    if(levelBtn){
      cycleLevel(levelBtn.dataset.key);
      refresh();
      return;
    }
    if(ev.target.closest('a')) return;
    const toggle = ev.target.closest('.gloss-toggle');
    if(toggle) toggleAccordion(toggle);
  });
  el.querySelector('#gameBody').addEventListener('keydown', ev=>{
    if((ev.key==='Enter' || ev.key===' ') && ev.target.classList.contains('gloss-toggle')){
      ev.preventDefault();
      toggleAccordion(ev.target);
    }
  });

  el.querySelector('#practiceNext').addEventListener('click', ev=>{
    const item = ev.target.closest('.practice-item');
    if(!item) return;
    cycleLevel(item.dataset.key);
    refresh();
  });

  refresh();
}

export function unmount(){ root = null; }

// Re-render everything, keeping open accordions open.
function refresh(){
  const openKeys = new Set([...root.querySelectorAll('.gloss-toggle.open')].map(t=>t.dataset.key));
  root.querySelector('#radarWrap').innerHTML = radarSvg();
  renderLegend();
  renderPracticeNext();
  renderList(openKeys);
}

function renderLegend(){
  const counts = levelCounts();
  root.querySelector('#levelLegend').innerHTML = LEVELS.map((lvl,i)=>`
    <div class="level-legend-item">
      <span class="level-legend-dot" style="background:${lvl.color}"></span>
      ${lvl.label}
      <span class="level-legend-count">${counts[i]}</span>
    </div>`).join('');
}

function renderPracticeNext(){
  const picks = computePracticeNext(6);
  const items = picks.map(p=>`
    <div class="practice-item" data-key="${esc(p.skill.key)}">
      <span class="ptag" style="background:${SKILL_TYPE_COLOR[p.skill.type]}">${SKILL_TYPE_NOUN[p.skill.type]}</span>
      <span class="pname">${esc(p.skill.name)}<span class="preason">${esc(p.reason)}</span></span>
      <span class="plevel">${LEVELS[p.status].label}</span>
    </div>`).join('');
  root.querySelector('#practiceNext').innerHTML = `
    <div class="practice-next-title">Practice next <span class="hint">tap to raise a level</span></div>
    <div class="practice-list">${items || '<div class="empty-state">Everything’s rated Confident or Mastered. Nothing urgent to flag.</div>'}</div>`;
}

function skillEntry(s, open){
  const lvl = LEVELS[getLevel(s.key)];
  let detail;
  if(s.type==='submission') detail = subDetailHtml(s, 'Positions');
  else {
    const steps = s.type==='sweep' ? SWEEP_STEPS[s.name] : null;
    detail = `${steps ? stepsList(steps) : ''}<div class="gloss-positions">Positions: <b>${positionLinks(s.positions)}</b></div>`;
  }
  return `<div class="gloss-item">
    <div class="gloss-toggle${open?' open':''}" data-key="${esc(s.key)}" tabindex="0" role="button">
      <span class="chev">▸</span>
      <span class="gloss-name">${esc(s.name)}</span>
      <button class="level-btn" data-key="${esc(s.key)}" style="background:${lvl.color};color:${lvl.text}">${lvl.label}</button>
    </div>
    <div class="gloss-steps-wrap${open?' open':''}">
      <div class="gloss-detail">${detail}</div>
    </div>
  </div>`;
}

function renderList(openKeys = new Set()){
  const query = root.querySelector('#gameSearch').value.trim();
  let html = '';
  GLOSSARY_SECTIONS.forEach(section=>{
    const skills = ALL_SKILLS
      .filter(s=>s.type===section.key && matchesQuery(s, query))
      .sort((a,b)=>a.name.localeCompare(b.name));
    if(skills.length===0) return;
    html += `<div class="glossary-section">
      <div class="glossary-section-title" style="color:${section.color}">
        ${section.title} <span class="glossary-section-count">(${skills.length})</span>
      </div>
      ${skills.map(s=>skillEntry(s, openKeys.has(s.key))).join('')}
    </div>`;
  });
  root.querySelector('#gameBody').innerHTML = html || `<div class="empty-state">No matches for “${esc(query)}”.</div>`;
}
