// Shared rendering helpers used across pages.
import { getSteps, SUB_STEPS, byName } from './data.js';

export const esc = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function stepsList(steps){
  return `<ol>${steps.map(s=>`<li>${s}</li>`).join('')}</ol>`;
}

// Position names become links to that position on the map.
export function positionLinks(names){
  return names.map(n=>{
    const p = byName[n];
    return p ? `<a class="pos-link" href="#/map/${p.id}">${esc(n)}</a>` : esc(n);
  }).join(', ');
}

// Detail body for a submission: base steps, any variants with their own steps, then positions.
export function subDetailHtml(entry, positionsLabel){
  const steps = getSteps(entry.name);
  const stepsHtml = steps ? stepsList(steps) : `<div>Steps coming soon.</div>`;
  const variantsHtml = (entry.variants||[]).map(v=>`
    <div class="gloss-variant">
      <div class="gloss-route">Variant: ${esc(v.name)} <span class="gloss-variant-pos">(${esc(v.positions.join(', '))})</span></div>
      ${stepsList(SUB_STEPS[v.name])}
    </div>`).join('');
  return `${stepsHtml}${variantsHtml}<div class="gloss-positions">${positionsLabel}: <b>${positionLinks(entry.positions)}</b></div>`;
}

// Search predicate shared by the Glossary and My Game: name first, then positions or route endpoints.
export function matchesQuery(entry, q){
  if(!q) return true;
  q = q.toLowerCase();
  if(entry.name.toLowerCase().includes(q)) return true;
  if(entry.positions && entry.positions.some(p=>p.toLowerCase().includes(q))) return true;
  if(entry.routes && entry.routes.some(r=>r.from.toLowerCase().includes(q) || r.to.toLowerCase().includes(q))) return true;
  return false;
}

// Accordion behavior: clicking a toggle opens the element right after it.
export function toggleAccordion(toggle){
  const wrap = toggle.nextElementSibling;
  const isOpen = wrap.classList.toggle('open');
  toggle.classList.toggle('open', isOpen);
}

export const ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="4" rx="1"/><rect x="2.5" y="17.5" width="6" height="4" rx="1"/><rect x="15.5" y="17.5" width="6" height="4" rx="1"/><path d="M11 6.5C8 9.5 6 13 5.5 17.5"/><path d="M13 6.5c3 3 5 6.5 5.5 11"/><path d="M8.5 19.5h7"/></svg>`,
  notes: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5h10l4 4V21.5H6z"/><path d="M15.5 2.5v4.5H20"/><path d="M9 11h7M9 14.5h7M9 18h4"/><path d="M3.5 5v15"/></svg>`,
  game: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5 21.5 9.4 17.9 20.5H6.1L2.5 9.4z"/><path d="M12 7.5l5 3.6-1.9 5.9H8.9L7 11.1z" fill="currentColor" fill-opacity=".25"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`,
};
