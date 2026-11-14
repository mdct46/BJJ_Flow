// Home page: the front door. Today, quick logging, recent training and what to work on.
// Route: #/home
import { POSITIONS, EDGES, TECHNIQUE_COUNT } from '../data.js';
import { esc } from '../ui.js';
import { LEVELS, ALL_SKILLS, SKILL_TYPE_COLOR, SKILL_TYPE_NOUN, levelCounts, computePracticeNext } from '../ratings.js';

export function mount(el){
  const dateStr = new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'});
  const counts = levelCounts();
  const total = ALL_SKILLS.length;
  const solid = counts[2] + counts[3];
  const picks = computePracticeNext(3);

  const levelBar = LEVELS.map((lvl,i)=> counts[i]
    ? `<span style="flex:${counts[i]};background:${lvl.color}" title="${lvl.label}: ${counts[i]}"></span>` : '').join('');
  const levelKey = LEVELS.map((lvl,i)=>`
    <span class="levelbar-key"><i style="background:${lvl.color}"></i>${lvl.label} <b>${counts[i]}</b></span>`).join('');

  const practiceHtml = picks.map(p=>`
    <a class="practice-item" href="#/glossary?q=${encodeURIComponent(p.skill.name)}">
      <span class="ptag" style="background:${SKILL_TYPE_COLOR[p.skill.type]}">${SKILL_TYPE_NOUN[p.skill.type]}</span>
      <span class="pname">${esc(p.skill.name)}<span class="preason">${esc(p.reason)}</span></span>
      <span class="arrow">›</span>
    </a>`).join('');

  el.innerHTML = `
    <div class="page"><div class="page-inner home">
      <div class="home-date">${dateStr}</div>
      <h2 class="home-greet">Ready to roll?</h2>

      <a class="cta" href="#/notes">
        <span class="cta-plus">+</span>
        <span>
          <span class="cta-title">Log today’s training</span>
          <span class="cta-sub">What you worked on, who you rolled with, subs given and taken</span>
        </span>
      </a>

      <div class="home-grid">
        <section class="card">
          <div class="card-head"><h3>Training log</h3><a href="#/notes">View all</a></div>
          <div class="empty-state">No sessions logged yet. Your recent training will show up here.</div>
        </section>

        <section class="card">
          <div class="card-head"><h3>Practice next</h3><a href="#/game">My Game</a></div>
          <div class="practice-list">${practiceHtml}</div>
        </section>

        <section class="card">
          <div class="card-head"><h3>My Game</h3><a href="#/game">Rate skills</a></div>
          <div class="stat"><b>${solid}</b> of ${total} skills at Confident or better</div>
          <div class="levelbar">${levelBar}</div>
          <div class="levelbar-keys">${levelKey}</div>
        </section>

        <section class="card tiles">
          <a class="tile" href="#/map">
            <span class="tile-title">Explore the map</span>
            <span class="tile-sub">${POSITIONS.length} positions, ${EDGES.length} connections</span>
          </a>
          <a class="tile" href="#/glossary">
            <span class="tile-title">Technique glossary</span>
            <span class="tile-sub">${TECHNIQUE_COUNT} techniques with basics</span>
          </a>
        </section>
      </div>
    </div></div>`;
}
