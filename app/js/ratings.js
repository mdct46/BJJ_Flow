// Skill ratings (My Game). Shared by the Home and My Game pages.
import { SUB_GLOSSARY, EDGE_GLOSSARY, CHAINS, GLOSSARY_SECTIONS, TYPE_COLOR, canonicalSubName } from './data.js';
import * as store from './store.js';

const STORE_KEY = 'skill-ratings';

export const LEVELS = [
  {key:'unknown', label:'Don’t know', color:'var(--lvl0)', text:'var(--ink)'},
  {key:'learning', label:'Learning', color:'var(--lvl1)', text:'var(--bg)'},
  {key:'confident', label:'Confident', color:'var(--lvl2)', text:'var(--ink)'},
  {key:'mastered', label:'Mastered', color:'var(--lvl3)', text:'var(--bg)'},
];

export const SKILL_TYPE_COLOR = { submission:'var(--sub)', pass:TYPE_COLOR.pass, sweep:TYPE_COLOR.sweep, escape:TYPE_COLOR.escape, transition:TYPE_COLOR.transition };
export const SKILL_TYPE_NOUN = { submission:'Submission', pass:'Pass', sweep:'Sweep', escape:'Escape', transition:'Transition' };

// Unified skill list, built from the same data the Glossary uses.
function buildAllSkills(){
  const list = [];
  SUB_GLOSSARY.forEach(e=>{
    list.push({ key:`submission|${e.name}`, type:'submission', name:e.name, positions:e.positions.slice(), variants:e.variants });
  });
  ['pass','sweep','escape','transition'].forEach(type=>{
    EDGE_GLOSSARY[type].forEach(e=>{
      const positions = [];
      e.routes.forEach(r=>{
        if(!positions.includes(r.from)) positions.push(r.from);
        if(!positions.includes(r.to)) positions.push(r.to);
      });
      list.push({ key:`${type}|${e.name}`, type, name:e.name, positions });
    });
  });
  return list;
}
export const ALL_SKILLS = buildAllSkills();

let RATINGS = {};

export async function loadRatings(){
  try { RATINGS = (await store.get(STORE_KEY, {})) || {}; }
  catch(err){ console.error('Could not load ratings', err); RATINGS = {}; }
}

async function saveRatings(){
  try { await store.set(STORE_KEY, RATINGS); }
  catch(err){ console.error('Could not save ratings', err); }
}

export function getLevel(key){ return RATINGS[key] ?? 0; }

export function cycleLevel(key){
  const next = (getLevel(key) + 1) % LEVELS.length;
  RATINGS[key] = next;
  saveRatings();
  return next;
}

export function levelCounts(){
  return LEVELS.map((_,i)=>ALL_SKILLS.filter(s=>getLevel(s.key)===i).length);
}

export function categoryScore(type){
  const skills = ALL_SKILLS.filter(s=>s.type===type);
  if(skills.length===0) return 0;
  const sum = skills.reduce((acc,s)=>acc+getLevel(s.key),0);
  return sum / (skills.length * (LEVELS.length-1)); // 0..1
}

export function computePracticeNext(limit=6){
  const candidates = ALL_SKILLS.filter(s=>getLevel(s.key) <= 1);

  const scored = candidates.map(s=>{
    let score = 0;
    let reason = null;

    // Chain adjacency: is this submission the next step after one already confident/mastered?
    if(s.type==='submission'){
      for(const chain of CHAINS){
        const idx = chain.steps.findIndex(st=>canonicalSubName(st.sub)===s.name);
        if(idx>0){
          const predName = canonicalSubName(chain.steps[idx-1].sub);
          if(getLevel(`submission|${predName}`)>=2){
            score += 3;
            reason = `Natural follow-up to ${predName}`;
          }
        }
      }
    }

    // Position adjacency: shares a position with something already confident/mastered
    const sharedPositions = new Set();
    s.positions.forEach(pos=>{
      ALL_SKILLS.forEach(other=>{
        if(other.key===s.key) return;
        if(getLevel(other.key)>=2 && other.positions.includes(pos)) sharedPositions.add(pos);
      });
    });
    score += sharedPositions.size;
    if(!reason && sharedPositions.size>0) reason = `Connects to ${[...sharedPositions][0]}`;
    if(!reason) reason = getLevel(s.key)===1 ? 'Already in progress' : 'New skill area';

    return { skill:s, score, status:getLevel(s.key), reason };
  });

  scored.sort((a,b)=> (b.score-a.score) || (b.status-a.status) || a.skill.name.localeCompare(b.skill.name));
  return scored.slice(0, limit);
}

// Radar chart of the five skill categories, as an SVG string.
export function radarSvg(){
  const cats = GLOSSARY_SECTIONS;
  const cx=170, cy=175, maxR=118;
  const n = cats.length;
  const angleFor = i => -Math.PI/2 + i*(2*Math.PI/n);
  const pt = (i, r) => [cx + r*Math.cos(angleFor(i)), cy + r*Math.sin(angleFor(i))];
  const parts = [];

  [0.25,0.5,0.75,1].forEach(frac=>{
    const pts = cats.map((_,i)=>pt(i, maxR*frac).join(',')).join(' ');
    parts.push(`<polygon points="${pts}" fill="none" stroke="#333D44" stroke-width="1"/>`);
  });
  cats.forEach((c,i)=>{
    const [x,y] = pt(i, maxR);
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#333D44" stroke-width="1"/>`);
    const [lx,ly] = pt(i, maxR+22);
    parts.push(`<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-family="Oswald, sans-serif" font-size="11" font-weight="600" fill="${c.color}" style="text-transform:uppercase;letter-spacing:0.03em;">${c.title}</text>`);
  });
  const dataPts = cats.map((c,i)=>pt(i, maxR*categoryScore(c.key)));
  parts.push(`<polygon points="${dataPts.map(p=>p.join(',')).join(' ')}" fill="rgba(201,162,39,0.22)" stroke="var(--gold)" stroke-width="2"/>`);
  dataPts.forEach(([x,y])=>parts.push(`<circle cx="${x}" cy="${y}" r="3.5" fill="var(--gold)"/>`));

  return `<svg class="radar" viewBox="0 0 340 340" width="340" height="340">${parts.join('')}</svg>`;
}
