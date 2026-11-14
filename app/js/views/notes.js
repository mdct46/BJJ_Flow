// Flow Notes: training log.
// Routes: #/notes (list), #/notes/new, #/notes/<id> (detail), #/notes/<id>/edit
import { allSessions, periodCounts, parseISODate } from '../sessions.js';
import { sessionRow } from './notes-ui.js';
import * as detail from './session-detail.js';
import * as editor from './session-edit.js';

let child = null;

export function mount(el, route){
  if(route.param === 'new') child = editor;
  else if(route.param && route.sub === 'edit') child = editor;
  else if(route.param) child = detail;
  else child = null;

  if(child) return child.mount(el, route);
  renderList(el);
}

export function unmount(){
  if(child && child.unmount) child.unmount();
  child = null;
}

function renderList(el){
  const sessions = allSessions();
  const { week, month, total } = periodCounts();

  // Group by month: "November 2026"
  const groups = [];
  sessions.forEach(s=>{
    const label = parseISODate(s.date).toLocaleDateString(undefined, { month:'long', year:'numeric' });
    if(!groups.length || groups[groups.length-1].label !== label) groups.push({ label, items: [] });
    groups[groups.length-1].items.push(s);
  });

  el.innerHTML = `
    <div class="page"><div class="page-inner">
      <div class="page-head">
        <h2 class="page-title">Flow Notes</h2>
        <a class="btn" href="#/notes/new">+ Log session</a>
      </div>

      <div class="stat-row">
        <div class="stat-box"><b>${week}</b><span>this week</span></div>
        <div class="stat-box"><b>${month}</b><span>this month</span></div>
        <div class="stat-box"><b>${total}</b><span>all time</span></div>
      </div>

      ${groups.length ? groups.map(g=>`
        <div class="session-group">
          <div class="session-group-title">${g.label}</div>
          <div class="session-list">${g.items.map(sessionRow).join('')}</div>
        </div>`).join('') : `
        <div class="card">
          <div class="empty-state">
            No sessions yet. After your next class, tap <b>+ Log session</b> to note what you worked on and how your rolls went.
          </div>
        </div>`}
    </div></div>`;
}
