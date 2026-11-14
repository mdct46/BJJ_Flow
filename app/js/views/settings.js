// Settings page: backup and restore, storage status, app info.
// Route: #/settings
import * as store from '../store.js';
import { loadRatings } from '../ratings.js';
import { APP_VERSION } from '../version.js';

let root = null;

export function mount(el){
  root = el;
  el.innerHTML = `
    <div class="page"><div class="page-inner">
      <h2 class="page-title">Settings</h2>

      <section class="card">
        <div class="card-head"><h3>Backup</h3></div>
        <p class="muted">Your data is stored on this device only. Export a backup now and then, and before switching phones or clearing your browser.</p>
        <div class="btn-row">
          <button class="btn" id="exportBtn">Export backup</button>
          <label class="btn secondary">Import backup<input type="file" id="importInput" accept="application/json,.json" hidden></label>
        </div>
        <div class="status" id="backupStatus" role="status"></div>
      </section>

      <section class="card">
        <div class="card-head"><h3>Storage</h3></div>
        <div id="storageStatus" class="muted">Checking…</div>
      </section>

      <section class="card">
        <div class="card-head"><h3>About</h3></div>
        <div class="muted">BJJ Flow, version ${APP_VERSION}</div>
      </section>
    </div></div>`;

  el.querySelector('#exportBtn').addEventListener('click', exportBackup);
  el.querySelector('#importInput').addEventListener('change', importBackup);
  renderStorageStatus();
}

export function unmount(){ root = null; }

function setStatus(msg, isError){
  const s = root && root.querySelector('#backupStatus');
  if(!s) return;
  s.textContent = msg;
  s.classList.toggle('error', !!isError);
}

async function exportBackup(){
  try{
    const backup = await store.exportAll();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bjj-flow-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    setStatus('Backup exported.');
  }catch(err){
    setStatus('Export failed: ' + err.message, true);
  }
}

async function importBackup(ev){
  const file = ev.target.files[0];
  ev.target.value = '';
  if(!file) return;
  try{
    const backup = JSON.parse(await file.text());
    if(!confirm('Importing replaces everything currently saved on this device. Continue?')) return;
    await store.importAll(backup);
    await loadRatings();
    setStatus(`Backup from ${backup.exportedAt ? new Date(backup.exportedAt).toLocaleDateString() : 'file'} restored.`);
  }catch(err){
    setStatus(err instanceof SyntaxError ? 'That file isn’t valid JSON.' : err.message, true);
  }
}

async function renderStorageStatus(){
  const target = root.querySelector('#storageStatus');
  if(store.isPersistentFallback()){
    target.textContent = 'This browser is blocking on-device storage (often private browsing). Nothing you enter will be saved.';
    return;
  }
  const status = await store.persistenceStatus();
  if(!root) return;
  if(status === 'persistent'){
    target.textContent = 'Protected: the browser won’t clear your data to free up space.';
  } else if(status === 'best-effort'){
    target.innerHTML = 'Not yet protected: the browser may clear data if the device runs low on space. Installing the app to your home screen usually fixes this.<div style="margin-top:10px"><button class="btn" id="persistBtn">Request protection</button></div>';
    target.querySelector('#persistBtn').addEventListener('click', async ()=>{
      await store.requestPersist();
      renderStorageStatus();
    });
  } else {
    target.textContent = 'This browser doesn’t report storage protection status.';
  }
}
