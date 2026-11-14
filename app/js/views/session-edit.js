// Session editor: log a new session or edit an existing one.
// Routes: #/notes/new, #/notes/<id>/edit
//
// All edits go into `draft`. Text fields update the draft in place without re-rendering
// (so the keyboard and cursor stay put). Structural changes (add a roll, add an outcome,
// toggle a chip) re-render just the section that changed.
import { POSITIONS, SUB_GLOSSARY } from '../data.js';
import { esc } from '../ui.js';
import { ALL_SKILLS, SKILL_TYPE_COLOR } from '../ratings.js';
import {
  SESSION_TYPES, DURATIONS, BELTS, getSession, saveSession, blankSession, blankRoll, blankOutcome,
  loadDraft, saveDraft, clearDraft, knownPartners,
} from '../sessions.js';
import { skillName, skillType } from './notes-ui.js';

let root = null;
let draft = null;
let mode = 'new';
let draftTimer = null;
let mountToken = 0;

const SKILL_BY_KEY = Object.fromEntries(ALL_SKILLS.map(s=>[s.key, s]));

export async function mount(el, route){
  root = el;
  const token = ++mountToken;
  mode = route.param === 'new' ? 'new' : 'edit';
  let restored = false;

  if(mode === 'edit'){
    const existing = getSession(route.param);
    if(!existing){
      el.innerHTML = `<div class="page"><div class="page-inner"><div class="card"><div class="empty-state">That session couldn’t be found.<br><br><a class="btn secondary" href="#/notes">Back to Flow Notes</a></div></div></div></div>`;
      return;
    }
    draft = structuredClone(existing);
  } else {
    el.innerHTML = `<div class="page"><div class="page-inner"><div class="empty-state">Loading…</div></div></div>`;
    const saved = await loadDraft().catch(()=>null);
    if(token !== mountToken) return; // navigated away while loading
    if(saved && hasContent(saved)){ draft = saved; restored = true; }
    else draft = blankSession();
  }

  renderAll(restored);
}

export function unmount(){
  // Flush a pending draft save so nothing typed in the last moment is lost.
  if(draftTimer){ clearTimeout(draftTimer); draftTimer = null; if(mode==='new' && draft) saveDraft(draft); }
  mountToken++;
  root = null;
}

function hasContent(s){
  return !!(s.duration || s.positions.length || s.techniques.length || (s.notes||'').trim() || s.rolls.length);
}

function changed(){
  if(mode !== 'new') return;
  clearTimeout(draftTimer);
  draftTimer = setTimeout(()=>{ draftTimer = null; saveDraft(draft); }, 500);
}

function findRoll(id){ return draft.rolls.find(r=>r.id===id); }
function findOutcome(roll, id){ return roll.outcomes.find(o=>o.id===id); }

/* ---------- rendering ---------- */

function renderAll(restored){
  const partners = knownPartners();
  root.innerHTML = `
    <div class="editor-wrap">
    <div class="page editor-page" id="editorScroll"><div class="page-inner">
      <a class="back-link" href="${mode==='new' ? '#/notes' : `#/notes/${encodeURIComponent(draft.id)}`}">‹ ${mode==='new' ? 'Flow Notes' : 'Back to session'}</a>
      <h2 class="page-title">${mode==='new' ? 'Log session' : 'Edit session'}</h2>

      ${restored ? `<div class="notice" id="restoreNotice">
        Picked up where you left off.
        <button class="link-btn" data-action="discard-draft">Start fresh</button>
      </div>` : ''}

      <section class="card">
        <div class="field">
          <label class="field-label" for="dateInput">Date</label>
          <input type="date" id="dateInput" class="input" data-field="date" value="${esc(draft.date)}" max="9999-12-31">
        </div>
        <div class="field">
          <div class="field-label">Session</div>
          <div class="chip-row" id="typeChips">${typeChips()}</div>
        </div>
        <div class="field">
          <div class="field-label">Length</div>
          <div class="chip-row" id="durationChips">${durationChips()}</div>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h3>Worked on</h3></div>
        <div id="workedOn">${workedOnHtml()}</div>
      </section>

      <section class="card">
        <div class="card-head"><h3>Rolls</h3></div>
        <div id="rolls">${rollsHtml()}</div>
        <button class="btn secondary full" data-action="add-roll">+ Add roll</button>
      </section>

      <section class="card">
        <div class="card-head"><h3>Notes</h3></div>
        <textarea class="input textarea" data-field="notes" rows="4" placeholder="What clicked, what didn’t, what to drill next time…">${esc(draft.notes)}</textarea>
      </section>

      <div class="editor-actions">
        <button class="btn secondary" data-action="cancel">Cancel</button>
        <button class="btn" data-action="save">Save session</button>
      </div>
      <div class="status error" id="saveStatus" role="status"></div>
    </div></div>
    <datalist id="partnerList">${partners.map(p=>`<option value="${esc(p.name)}"></option>`).join('')}</datalist>
    </div>`;

  // Listeners live on this render's own wrapper, so they go away with it.
  const wrap = root.querySelector('.editor-wrap');
  wrap.addEventListener('click', onClick);
  wrap.addEventListener('input', onInput);
  wrap.addEventListener('change', onChange);
}

function typeChips(){
  return SESSION_TYPES.map(t=>`<button class="chip toggle${draft.type===t.key?' on':''}" data-action="type" data-value="${t.key}">${t.label}</button>`).join('');
}

function durationChips(){
  const custom = draft.duration && !DURATIONS.includes(draft.duration);
  return DURATIONS.map(d=>`<button class="chip toggle${draft.duration===d?' on':''}" data-action="duration" data-value="${d}">${d} min</button>`).join('')
    + `<input type="number" class="input mini${custom?' on':''}" data-field="duration" inputmode="numeric" min="1" max="600" placeholder="Other" value="${custom ? draft.duration : ''}" aria-label="Other length in minutes">`;
}

function positionToggles(selected, action, extra = ''){
  return POSITIONS.map(p=>`<button class="chip toggle pos${selected.includes(p.id)?' on':''}" data-action="${action}" data-value="${p.id}"${extra}>${esc(p.name)}</button>`).join('');
}

function techChip(key, removable){
  const color = SKILL_TYPE_COLOR[skillType(key)] || 'var(--grey)';
  return removable
    ? `<button class="chip skill on" data-action="remove-tech" data-value="${esc(key)}"><i style="background:${color}"></i>${esc(skillName(key))}<span class="x">×</span></button>`
    : `<button class="chip skill" data-action="add-tech" data-value="${esc(key)}"><i style="background:${color}"></i>${esc(skillName(key))}<span class="plus">+</span></button>`;
}

// Techniques connected to the positions you picked, not already chosen.
function suggestions(){
  if(!draft.positions.length) return [];
  const names = draft.positions.map(id=>POSITIONS.find(p=>p.id===id)?.name).filter(Boolean);
  const order = { submission:0, sweep:1, pass:2, escape:3, transition:4 };
  return ALL_SKILLS
    .filter(s=>!draft.techniques.includes(s.key) && s.positions.some(p=>names.includes(p)))
    .sort((a,b)=>(order[a.type]-order[b.type]) || a.name.localeCompare(b.name))
    .slice(0, 12)
    .map(s=>s.key);
}

function workedOnHtml(){
  const sugg = suggestions();
  return `
    <div class="field">
      <div class="field-label">Positions</div>
      <div class="chip-row">${positionToggles(draft.positions, 'toggle-pos')}</div>
    </div>
    <div class="field">
      <div class="field-label">Techniques</div>
      ${draft.techniques.length ? `<div class="chip-row">${draft.techniques.map(k=>techChip(k, true)).join('')}</div>` : ''}
      ${sugg.length ? `<div class="sub-label">From those positions</div><div class="chip-row">${sugg.map(k=>techChip(k, false)).join('')}</div>` : ''}
      <div class="search-wrap">
        <input type="search" class="input" id="techSearch" placeholder="Search any technique…" autocomplete="off">
        <div class="search-results" id="techResults"></div>
      </div>
    </div>`;
}

function rollsHtml(){
  if(!draft.rolls.length) return `<div class="empty-state small">No rolls added. Add one for each partner you went with.</div>`;
  return draft.rolls.map((r,i)=>rollHtml(r,i)).join('');
}

function subOptions(o){
  const isOther = !o.skill && (o.other || o._other);
  return `<option value="">Submission…</option>`
    + SUB_GLOSSARY.map(e=>{ const k = `submission|${e.name}`; return `<option value="${esc(k)}"${o.skill===k?' selected':''}>${esc(e.name)}</option>`; }).join('')
    + `<option value="other"${isOther?' selected':''}>Other (type it)</option>`;
}

function posOptions(selected){
  return `<option value="">From position…</option>`
    + POSITIONS.map(p=>`<option value="${p.id}"${selected===p.id?' selected':''}>${esc(p.name)}</option>`).join('');
}

function outcomeHtml(r, o){
  const isOther = !o.skill && (o.other || o._other);
  return `<div class="outcome-row ${o.result}">
    <span class="outcome-tag">${o.result==='win' ? '✓ I subbed' : '✗ Got subbed'}</span>
    <button class="icon-x" data-action="remove-outcome" data-roll="${r.id}" data-outcome="${o.id}" aria-label="Remove">×</button>
    <select class="input" data-field="outcome-skill" data-roll="${r.id}" data-outcome="${o.id}">${subOptions(o)}</select>
    ${isOther ? `<input class="input" data-field="outcome-other" data-roll="${r.id}" data-outcome="${o.id}" placeholder="Which submission?" value="${esc(o.other)}">` : ''}
    <select class="input" data-field="outcome-position" data-roll="${r.id}" data-outcome="${o.id}">${posOptions(o.position)}</select>
  </div>`;
}

function rollHtml(r, i){
  const showPositions = r._showPositions || r.positions.length;
  return `<div class="roll-card" data-roll-card="${r.id}">
    <div class="roll-head">
      <span class="roll-num">Roll ${i+1}</span>
      <button class="link-btn danger" data-action="remove-roll" data-roll="${r.id}">Remove</button>
    </div>
    <input class="input" list="partnerList" data-field="partner" data-roll="${r.id}" placeholder="Partner" value="${esc(r.partner)}" autocomplete="off">
    <div class="chip-row belts">
      ${BELTS.map(b=>`<button class="chip belt${r.belt===b.key?' on':''}" data-action="belt" data-roll="${r.id}" data-value="${b.key}" style="--belt:${b.color};--belt-text:${b.text}">${b.label}</button>`).join('')}
    </div>
    ${r.outcomes.length ? `<div class="outcomes">${r.outcomes.map(o=>outcomeHtml(r,o)).join('')}</div>` : ''}
    <div class="btn-row">
      <button class="btn small win" data-action="add-outcome" data-roll="${r.id}" data-value="win">+ I subbed</button>
      <button class="btn small loss" data-action="add-outcome" data-roll="${r.id}" data-value="loss">+ Got subbed</button>
      ${showPositions ? '' : `<button class="btn small secondary" data-action="show-roll-pos" data-roll="${r.id}">+ Where it went</button>`}
    </div>
    ${showPositions ? `<div class="field">
      <div class="field-label">Where it went</div>
      <div class="chip-row small">${positionToggles(r.positions, 'roll-pos', ` data-roll="${r.id}"`)}</div>
    </div>` : ''}
    <textarea class="input textarea small" data-field="roll-notes" data-roll="${r.id}" rows="2" placeholder="Feedback, what happened…">${esc(r.notes)}</textarea>
  </div>`;
}

// Re-render one section, keeping the page scroll position.
function rerender(id, html){
  const scroller = root.querySelector('#editorScroll');
  const top = scroller.scrollTop;
  root.querySelector(`#${id}`).innerHTML = html;
  scroller.scrollTop = top;
}

function renderTechResults(q){
  const box = root.querySelector('#techResults');
  q = q.trim().toLowerCase();
  if(!q){ box.innerHTML = ''; return; }
  const hits = ALL_SKILLS.filter(s=>!draft.techniques.includes(s.key) && s.name.toLowerCase().includes(q)).slice(0, 8);
  box.innerHTML = hits.length
    ? hits.map(s=>`<button class="search-hit" data-action="add-tech" data-value="${esc(s.key)}"><i style="background:${SKILL_TYPE_COLOR[s.type]}"></i>${esc(s.name)}<span>${s.type}</span></button>`).join('')
    : `<div class="search-none">No match</div>`;
}

/* ---------- events ---------- */

function onClick(ev){
  const el = ev.target.closest('[data-action]');
  if(!el || !root.contains(el)) return;
  const { action, value } = el.dataset;
  const roll = el.dataset.roll ? findRoll(el.dataset.roll) : null;

  switch(action){
    case 'type':
      draft.type = value;
      rerender('typeChips', typeChips());
      break;
    case 'duration': {
      const d = Number(value);
      draft.duration = draft.duration === d ? null : d;
      rerender('durationChips', durationChips());
      break;
    }
    case 'toggle-pos':
      toggleIn(draft.positions, value);
      rerender('workedOn', workedOnHtml());
      break;
    case 'add-tech':
      if(!draft.techniques.includes(value)) draft.techniques.push(value);
      rerender('workedOn', workedOnHtml());
      break;
    case 'remove-tech':
      draft.techniques = draft.techniques.filter(k=>k!==value);
      rerender('workedOn', workedOnHtml());
      break;
    case 'add-roll':
      draft.rolls.push(blankRoll());
      rerender('rolls', rollsHtml());
      { const cards = root.querySelectorAll('.roll-card'); cards[cards.length-1]?.querySelector('[data-field="partner"]')?.focus(); }
      break;
    case 'remove-roll':
      if(roll && (roll.partner || roll.outcomes.length || roll.notes) && !confirm('Remove this roll?')) return;
      draft.rolls = draft.rolls.filter(r=>r!==roll);
      rerender('rolls', rollsHtml());
      break;
    case 'belt':
      roll.belt = roll.belt === value ? null : value;
      rerender('rolls', rollsHtml());
      break;
    case 'add-outcome':
      roll.outcomes.push(blankOutcome(value));
      rerender('rolls', rollsHtml());
      break;
    case 'remove-outcome':
      roll.outcomes = roll.outcomes.filter(o=>o.id!==el.dataset.outcome);
      rerender('rolls', rollsHtml());
      break;
    case 'show-roll-pos':
      roll._showPositions = true;
      rerender('rolls', rollsHtml());
      break;
    case 'roll-pos':
      toggleIn(roll.positions, value);
      rerender('rolls', rollsHtml());
      break;
    case 'discard-draft':
      draft = blankSession();
      clearTimeout(draftTimer); draftTimer = null;
      clearDraft();
      renderAll(false);
      return;
    case 'cancel':
      cancel();
      return;
    case 'save':
      save();
      return;
    default:
      return;
  }
  changed();
}

function onInput(ev){
  const el = ev.target;
  const field = el.dataset.field;
  if(el.id === 'techSearch'){ renderTechResults(el.value); return; }
  if(!field) return;
  const roll = el.dataset.roll ? findRoll(el.dataset.roll) : null;

  switch(field){
    case 'date': draft.date = el.value; break;
    case 'notes': draft.notes = el.value; break;
    case 'duration': {
      const n = parseInt(el.value, 10);
      draft.duration = n > 0 ? n : null;
      root.querySelectorAll('#durationChips .chip').forEach(c=>c.classList.toggle('on', Number(c.dataset.value)===draft.duration));
      el.classList.toggle('on', !!draft.duration && !DURATIONS.includes(draft.duration));
      break;
    }
    case 'partner': roll.partner = el.value; break;
    case 'roll-notes': roll.notes = el.value; break;
    case 'outcome-other': findOutcome(roll, el.dataset.outcome).other = el.value; break;
    default: return;
  }
  changed();
}

function onChange(ev){
  const el = ev.target;
  const field = el.dataset.field;
  if(!field) return;
  const roll = el.dataset.roll ? findRoll(el.dataset.roll) : null;

  if(field === 'outcome-skill'){
    const o = findOutcome(roll, el.dataset.outcome);
    if(el.value === 'other'){ o.skill = null; o._other = true; }
    else { o.skill = el.value || null; o._other = false; o.other = ''; }
    rerender('rolls', rollsHtml());
    if(el.value === 'other') root.querySelector(`[data-field="outcome-other"][data-outcome="${o.id}"]`)?.focus();
  } else if(field === 'outcome-position'){
    findOutcome(roll, el.dataset.outcome).position = el.value || null;
  } else if(field === 'partner'){
    // Fill in the belt you logged last time for this partner.
    const known = knownPartners().find(p=>p.name.toLowerCase() === roll.partner.trim().toLowerCase());
    if(known && known.belt && !roll.belt){ roll.belt = known.belt; rerender('rolls', rollsHtml()); }
  } else return;
  changed();
}

function toggleIn(list, value){
  const i = list.indexOf(value);
  if(i>=0) list.splice(i,1); else list.push(value);
}

async function cancel(){
  if(mode === 'new'){
    if(hasContent(draft) && !confirm('Discard this entry?')) return;
    clearTimeout(draftTimer); draftTimer = null;
    await clearDraft();
    location.hash = '#/notes';
  } else {
    location.hash = `#/notes/${encodeURIComponent(draft.id)}`;
  }
}

async function save(){
  const status = root.querySelector('#saveStatus');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.date || '')){
    status.textContent = 'Pick a date for this session.';
    root.querySelector('#dateInput').focus();
    return;
  }
  try{
    clearTimeout(draftTimer); draftTimer = null;
    const record = await saveSession(draft);
    if(mode === 'new') await clearDraft();
    location.hash = `#/notes/${encodeURIComponent(record.id)}`;
  }catch(err){
    status.textContent = 'Couldn’t save: ' + err.message;
  }
}
