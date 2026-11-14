// Flow Notes page: training log. Placeholder until step 2 (session and roll logging).
// Route: #/notes
export function mount(el){
  el.innerHTML = `
    <div class="page"><div class="page-inner">
      <h2 class="page-title">Flow Notes</h2>
      <div class="card">
        <div class="empty-state left">
          <p><b>Your training log lives here.</b> This page is next on the build list.</p>
          <p>Each session will capture:</p>
          <ul>
            <li>Date, session type and length</li>
            <li>Positions and techniques you worked on, picked from the map</li>
            <li>Every roll: partner, subs you hit, subs you got caught with, and from where</li>
            <li>Quick notes on what clicked and what didn’t</li>
          </ul>
          <p>Logged results will feed the map and suggest updates to your My Game ratings.</p>
        </div>
      </div>
    </div></div>`;
}
