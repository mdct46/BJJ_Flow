// Session detail: the full write-up of one training session.
// Route: #/notes/<id>
import { esc } from '../ui.js';
import { getSession, deleteSession, TYPE_LABEL, formatDate, rollStats } from '../sessions.js';
import { beltBadge, positionChip, skillChip, outcomeText } from './notes-ui.js';

export function mount(el, route){
  const s = getSession(route.param);
  if(!s){
    el.innerHTML = `<div class="page"><div class="page-inner">
      <div class="card"><div class="empty-state">That session couldn’t be found. It may have been deleted.<br><br><a class="btn secondary" href="#/notes">Back to Flow Notes</a></div></div>
    </div></div>`;
    return;
  }

  const { rolls, wins, losses } = rollStats(s);
  const worked = s.positions.length || s.techniques.length;

  const rollsHtml = s.rolls.map((r,i)=>`
    <div class="roll-view">
      <div class="roll-view-head">
        <span class="roll-num">Roll ${i+1}</span>
        <b>${r.partner ? esc(r.partner) : 'Partner not noted'}</b>
        ${beltBadge(r.belt)}
      </div>
      ${r.outcomes.length ? `<ul class="outcome-list">${r.outcomes.map(o=>`
        <li class="${o.result}"><span class="outcome-mark">${o.result==='win' ? '✓ Subbed' : '✗ Tapped'}</span> ${esc(outcomeText(o))}</li>`).join('')}</ul>` : ''}
      ${r.positions.length ? `<div class="chip-row small"><span class="chip-label">Where it went</span>${r.positions.map(id=>positionChip(id, true)).join('')}</div>` : ''}
      ${r.notes ? `<p class="note-text">${esc(r.notes)}</p>` : ''}
    </div>`).join('');

  el.innerHTML = `
    <div class="page"><div class="page-inner">
      <a class="back-link" href="#/notes">‹ Flow Notes</a>
      <div class="page-head">
        <div>
          <div class="home-date">${formatDate(s.date, { weekday:'long', month:'long', day:'numeric', year:'numeric' })}</div>
          <h2 class="page-title">${TYPE_LABEL[s.type] || 'Session'}${s.duration ? ` <span class="title-meta">${s.duration} min</span>` : ''}</h2>
        </div>
        <a class="btn" href="#/notes/${encodeURIComponent(s.id)}/edit">Edit</a>
      </div>

      ${rolls ? `<div class="stat-row">
        <div class="stat-box"><b>${rolls}</b><span>roll${rolls===1?'':'s'}</span></div>
        <div class="stat-box win"><b>${wins}</b><span>subs</span></div>
        <div class="stat-box loss"><b>${losses}</b><span>tapped</span></div>
      </div>` : ''}

      ${worked ? `<section class="card">
        <div class="card-head"><h3>Worked on</h3></div>
        ${s.positions.length ? `<div class="chip-row">${s.positions.map(id=>positionChip(id, true)).join('')}</div>` : ''}
        ${s.techniques.length ? `<div class="chip-row">${s.techniques.map(k=>skillChip(k, true)).join('')}</div>` : ''}
      </section>` : ''}

      ${s.notes ? `<section class="card">
        <div class="card-head"><h3>Notes</h3></div>
        <p class="note-text">${esc(s.notes)}</p>
      </section>` : ''}

      ${s.rolls.length ? `<section class="card">
        <div class="card-head"><h3>Rolls</h3></div>
        ${rollsHtml}
      </section>` : ''}

      ${!worked && !s.notes && !s.rolls.length ? `<div class="card"><div class="empty-state">Nothing recorded beyond the date. Tap Edit to add details.</div></div>` : ''}

      <div class="danger-zone">
        <button class="btn danger" id="deleteBtn">Delete session</button>
      </div>
    </div></div>`;

  el.querySelector('#deleteBtn').addEventListener('click', async ()=>{
    if(!confirm('Delete this session? This can’t be undone.')) return;
    await deleteSession(s.id);
    location.hash = '#/notes';
  });
}
