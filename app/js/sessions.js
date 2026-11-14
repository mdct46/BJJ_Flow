// Training log (Flow Notes): session records, drafts and summaries.
//
// A session record:
// {
//   id, createdAt, updatedAt,             ISO timestamps
//   date: 'YYYY-MM-DD',                   local training date
//   type: 'class' | 'open-mat' | 'drilling' | 'private' | 'competition',
//   duration: minutes | null,
//   positions: [positionId],              what you worked on (POSITIONS ids)
//   techniques: [skillKey],               what you worked on ('submission|Armbar', 'sweep|Butterfly sweep', ...)
//   notes: string,
//   rolls: [{
//     id, partner: string, belt: BELT key | null, notes: string,
//     positions: [positionId],            where the roll went / where you got stuck
//     outcomes: [{ id, result: 'win' | 'loss', skill: 'submission|<name>' | null, other: string, position: positionId | null }]
//   }]
// }
// Position ids and skill keys match the map and My Game, so later features
// (map stats, rating suggestions) can read the log directly.
import * as store from './store.js';

const COLLECTION = 'sessions';
const DRAFT_KEY = 'session-draft';

export const SESSION_TYPES = [
  { key:'class', label:'Class' },
  { key:'open-mat', label:'Open mat' },
  { key:'drilling', label:'Drilling' },
  { key:'private', label:'Private' },
  { key:'competition', label:'Competition' },
];
export const TYPE_LABEL = Object.fromEntries(SESSION_TYPES.map(t=>[t.key, t.label]));

export const DURATIONS = [45, 60, 90, 120];

export const BELTS = [
  { key:'white', label:'White', color:'#E8E4DA', text:'#14181B' },
  { key:'blue', label:'Blue', color:'#2F6FB5', text:'#ECE7DC' },
  { key:'purple', label:'Purple', color:'#7B4FA0', text:'#ECE7DC' },
  { key:'brown', label:'Brown', color:'#7A5230', text:'#ECE7DC' },
  { key:'black', label:'Black', color:'#0B0D0E', text:'#ECE7DC' },
];
export const BELT_BY_KEY = Object.fromEntries(BELTS.map(b=>[b.key, b]));

let SESSIONS = [];

export function newId(){
  if(self.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function parseISODate(iso){
  const [y,m,d] = iso.split('-').map(Number);
  return new Date(y, m-1, d);
}

export function formatDate(iso, opts = { weekday:'short', month:'short', day:'numeric' }){
  return parseISODate(iso).toLocaleDateString(undefined, opts);
}

export function blankSession(){
  const now = new Date().toISOString();
  return { id:newId(), createdAt:now, updatedAt:now, date:todayISO(), type:'class', duration:null,
           positions:[], techniques:[], notes:'', rolls:[] };
}

export function blankRoll(){
  return { id:newId(), partner:'', belt:null, notes:'', positions:[], outcomes:[] };
}

export function blankOutcome(result){
  return { id:newId(), result, skill:null, other:'', position:null };
}

function sortSessions(){
  SESSIONS.sort((a,b)=> b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export async function loadSessions(){
  try { SESSIONS = await store.getAll(COLLECTION); }
  catch(err){ console.error('Could not load sessions', err); SESSIONS = []; }
  sortSessions();
}

export function allSessions(){ return SESSIONS; }
export function getSession(id){ return SESSIONS.find(s=>s.id===id) || null; }

// Build the stored record field by field: drops editor-only flags and empty rows
// (an "I subbed" with nothing picked, a roll with nothing filled in).
function clean(s){
  return {
    id: s.id,
    createdAt: s.createdAt,
    updatedAt: new Date().toISOString(),
    date: s.date,
    type: s.type,
    duration: s.duration || null,
    positions: [...s.positions],
    techniques: [...s.techniques],
    notes: (s.notes || '').trim(),
    rolls: s.rolls.map(r=>({
      id: r.id,
      partner: (r.partner || '').trim(),
      belt: r.belt || null,
      notes: (r.notes || '').trim(),
      positions: [...r.positions],
      outcomes: r.outcomes
        .filter(o=>o.skill || (o.other || '').trim())
        .map(o=>({ id:o.id, result:o.result, skill:o.skill || null, other:(o.other || '').trim(), position:o.position || null })),
    })).filter(r=>r.partner || r.belt || r.notes || r.positions.length || r.outcomes.length),
  };
}

export async function saveSession(session){
  const record = clean(session);
  await store.put(COLLECTION, record);
  const i = SESSIONS.findIndex(s=>s.id===record.id);
  if(i>=0) SESSIONS[i] = record; else SESSIONS.push(record);
  sortSessions();
  return record;
}

export async function deleteSession(id){
  await store.remove(COLLECTION, id);
  SESSIONS = SESSIONS.filter(s=>s.id!==id);
}

/* ---------- drafts (new sessions only) ---------- */

export async function loadDraft(){ return store.get(DRAFT_KEY, null); }
export async function saveDraft(session){ return store.set(DRAFT_KEY, session); }
export async function clearDraft(){ return store.del(DRAFT_KEY); }

/* ---------- summaries ---------- */

export function rollStats(session){
  let wins = 0, losses = 0;
  session.rolls.forEach(r=>r.outcomes.forEach(o=>{ if(o.result==='win') wins++; else losses++; }));
  return { rolls: session.rolls.length, wins, losses };
}

export function summaryLine(session){
  const { rolls, wins, losses } = rollStats(session);
  const parts = [];
  if(rolls) parts.push(`${rolls} roll${rolls===1?'':'s'}`);
  if(wins) parts.push(`${wins} sub${wins===1?'':'s'}`);
  if(losses) parts.push(`${losses} tapped`);
  return parts.join(' · ');
}

function startOfWeek(d){
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - offset);
  return x;
}

export function periodCounts(){
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let week = 0, month = 0;
  SESSIONS.forEach(s=>{
    const d = parseISODate(s.date);
    if(d >= weekStart && d <= now) week++;
    if(d >= monthStart && d <= now) month++;
  });
  return { week, month, total: SESSIONS.length };
}

// Past partners, most recent first, with the belt you last logged for them.
export function knownPartners(){
  const seen = new Map();
  SESSIONS.forEach(s=>s.rolls.forEach(r=>{
    const name = r.partner.trim();
    if(!name) return;
    const k = name.toLowerCase();
    if(!seen.has(k)) seen.set(k, { name, belt: r.belt });
    else if(!seen.get(k).belt && r.belt) seen.get(k).belt = r.belt;
  }));
  return [...seen.values()];
}
