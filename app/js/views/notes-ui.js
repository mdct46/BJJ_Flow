// Small render helpers shared by the Flow Notes pages and Home.
import { byId } from '../data.js';
import { esc } from '../ui.js';
import { SKILL_TYPE_COLOR } from '../ratings.js';
import { BELT_BY_KEY, TYPE_LABEL, formatDate, summaryLine } from '../sessions.js';

export function skillName(key){ return key.slice(key.indexOf('|')+1); }
export function skillType(key){ return key.slice(0, key.indexOf('|')); }

export function beltBadge(beltKey){
  const b = BELT_BY_KEY[beltKey];
  if(!b) return '';
  return `<span class="belt-badge" style="background:${b.color};color:${b.text}">${b.label}</span>`;
}

// Read-only chips. With link=true they jump to the map / glossary.
export function positionChip(id, link){
  const p = byId[id];
  if(!p) return '';
  return link
    ? `<a class="chip pos" href="#/map/${p.id}">${esc(p.name)}</a>`
    : `<span class="chip pos">${esc(p.name)}</span>`;
}

export function skillChip(key, link){
  const name = skillName(key);
  const color = SKILL_TYPE_COLOR[skillType(key)] || 'var(--grey)';
  const inner = `<i style="background:${color}"></i>${esc(name)}`;
  return link
    ? `<a class="chip skill" href="#/glossary?q=${encodeURIComponent(name)}">${inner}</a>`
    : `<span class="chip skill">${inner}</span>`;
}

export function outcomeText(o){
  const what = o.skill ? skillName(o.skill) : (o.other || 'Submission');
  const where = o.position && byId[o.position] ? ` from ${byId[o.position].name}` : '';
  return `${what}${where}`;
}

// One row in a session list (Flow Notes list and Home).
export function sessionRow(s){
  const summary = summaryLine(s);
  const meta = [TYPE_LABEL[s.type] || 'Session', s.duration ? `${s.duration} min` : null].filter(Boolean).join(' · ');
  const focus = [...s.positions.map(id=>byId[id]?.name).filter(Boolean), ...s.techniques.map(skillName)];
  return `<a class="session-row" href="#/notes/${encodeURIComponent(s.id)}">
    <span class="session-date">
      <b>${formatDate(s.date, {day:'numeric'})}</b>
      <span>${formatDate(s.date, {month:'short'})}</span>
    </span>
    <span class="session-main">
      <span class="session-meta">${esc(meta)} <span class="session-dow">${formatDate(s.date, {weekday:'short'})}</span></span>
      ${focus.length ? `<span class="session-focus">${esc(focus.slice(0,4).join(', '))}${focus.length>4?` +${focus.length-4}`:''}</span>` : ''}
      ${summary ? `<span class="session-summary">${summary}</span>` : ''}
    </span>
    <span class="arrow">›</span>
  </a>`;
}
