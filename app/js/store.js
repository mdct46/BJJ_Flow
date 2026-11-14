// Storage layer. Every read and write of user data goes through this module.
// Today it is on-device IndexedDB. When accounts arrive, this is the one file
// that gets a server-backed implementation with the same async API.
//
// Two kinds of storage:
//   key/value  get(key) / set(key, value)              small settings-like blobs (ratings, drafts)
//   collections getAll / getOne / put / remove          records with an `id` (training sessions)

const DB_NAME = 'bjj-flow';
const DB_VERSION = 2;
const KV = 'kv';
export const COLLECTIONS = ['sessions'];

let dbPromise = null;
let memoryFallback = null; // used only if IndexedDB is unavailable (some private modes)
let persistRequested = false;

function openDb(){
  if(dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject)=>{
    if(!('indexedDB' in self)) return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = ()=>{
      const db = req.result;
      if(!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
      COLLECTIONS.forEach(name=>{
        if(!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      });
    };
    req.onsuccess = ()=>{
      const db = req.result;
      // If a newer version of the app opens in another tab, let its upgrade go through.
      db.onversionchange = ()=> db.close();
      resolve(db);
    };
    req.onerror = ()=> reject(req.error);
    req.onblocked = ()=> console.warn('Database upgrade waiting on another open tab of BJJ Flow.');
  }).catch(err=>{
    console.warn('Falling back to in-memory storage; data will not persist.', err);
    memoryFallback = { [KV]: new Map(), ...Object.fromEntries(COLLECTIONS.map(c=>[c, new Map()])) };
    return null;
  });
  return dbPromise;
}

function tx(db, storeName, mode, fn){
  return new Promise((resolve, reject)=>{
    const t = db.transaction(storeName, mode);
    const result = fn(t.objectStore(storeName));
    t.oncomplete = ()=> resolve(result && 'result' in result ? result.result : undefined);
    t.onerror = ()=> reject(t.error);
    t.onabort = ()=> reject(t.error);
  });
}

function checkCollection(name){
  if(!COLLECTIONS.includes(name)) throw new Error(`Unknown collection: ${name}`);
}

/* ---------- key/value ---------- */

export async function get(key, fallback = null){
  const db = await openDb();
  if(!db) return memoryFallback[KV].has(key) ? memoryFallback[KV].get(key) : fallback;
  const value = await tx(db, KV, 'readonly', s=>s.get(key));
  return value === undefined ? fallback : value;
}

export async function set(key, value){
  const db = await openDb();
  if(!db){ memoryFallback[KV].set(key, value); return; }
  await tx(db, KV, 'readwrite', s=>s.put(value, key));
  requestPersistOnce();
}

export async function del(key){
  const db = await openDb();
  if(!db){ memoryFallback[KV].delete(key); return; }
  await tx(db, KV, 'readwrite', s=>s.delete(key));
}

/* ---------- collections ---------- */

export async function getAll(collection){
  checkCollection(collection);
  const db = await openDb();
  if(!db) return [...memoryFallback[collection].values()];
  return (await tx(db, collection, 'readonly', s=>s.getAll())) || [];
}

export async function getOne(collection, id){
  checkCollection(collection);
  const db = await openDb();
  if(!db) return memoryFallback[collection].get(id) || null;
  return (await tx(db, collection, 'readonly', s=>s.get(id))) || null;
}

export async function put(collection, record){
  checkCollection(collection);
  if(!record || !record.id) throw new Error('Records need an id.');
  const db = await openDb();
  if(!db){ memoryFallback[collection].set(record.id, record); return record; }
  await tx(db, collection, 'readwrite', s=>s.put(record));
  requestPersistOnce();
  return record;
}

export async function remove(collection, id){
  checkCollection(collection);
  const db = await openDb();
  if(!db){ memoryFallback[collection].delete(id); return; }
  await tx(db, collection, 'readwrite', s=>s.delete(id));
}

/* ---------- backup ---------- */

export async function exportAll(){
  const db = await openDb();
  const data = {};
  const collections = {};
  if(!db){
    memoryFallback[KV].forEach((v,k)=>{ data[k]=v; });
    COLLECTIONS.forEach(c=>{ collections[c] = [...memoryFallback[c].values()]; });
  } else {
    const keys = await tx(db, KV, 'readonly', s=>s.getAllKeys());
    const values = await tx(db, KV, 'readonly', s=>s.getAll());
    keys.forEach((k,i)=>{ data[k] = values[i]; });
    for(const c of COLLECTIONS) collections[c] = await getAll(c);
  }
  return { app: 'bjj-flow', schema: 2, exportedAt: new Date().toISOString(), data, collections };
}

// Replaces everything currently stored with the backup's contents.
// Accepts schema 1 backups (key/value only); collections are then emptied.
export async function importAll(backup){
  if(!backup || backup.app !== 'bjj-flow' || typeof backup.data !== 'object' || backup.data === null){
    throw new Error('This file is not a BJJ Flow backup.');
  }
  const collections = backup.collections || {};
  for(const c of COLLECTIONS){
    const rows = collections[c] || [];
    if(!Array.isArray(rows) || rows.some(r=>!r || !r.id)) throw new Error(`The backup's ${c} data is damaged.`);
  }
  const db = await openDb();
  if(!db){
    memoryFallback[KV].clear();
    Object.entries(backup.data).forEach(([k,v])=>memoryFallback[KV].set(k,v));
    COLLECTIONS.forEach(c=>{
      memoryFallback[c].clear();
      (collections[c]||[]).forEach(r=>memoryFallback[c].set(r.id, r));
    });
    return;
  }
  await new Promise((resolve, reject)=>{
    const t = db.transaction([KV, ...COLLECTIONS], 'readwrite');
    const kv = t.objectStore(KV);
    kv.clear();
    Object.entries(backup.data).forEach(([k,v])=>kv.put(v,k));
    COLLECTIONS.forEach(c=>{
      const s = t.objectStore(c);
      s.clear();
      (collections[c]||[]).forEach(r=>s.put(r));
    });
    t.oncomplete = resolve;
    t.onerror = ()=> reject(t.error);
    t.onabort = ()=> reject(t.error);
  });
}

/* ---------- persistence ---------- */

export function isPersistentFallback(){ return memoryFallback !== null; }

// Ask the browser not to evict our data under storage pressure. Done on first
// write rather than at load so any browser prompt shows up in context.
function requestPersistOnce(){
  if(persistRequested) return;
  persistRequested = true;
  if(navigator.storage && navigator.storage.persist){
    navigator.storage.persisted().then(p=>{ if(!p) navigator.storage.persist(); }).catch(()=>{});
  }
}

export async function persistenceStatus(){
  if(!(navigator.storage && navigator.storage.persisted)) return 'unknown';
  try { return (await navigator.storage.persisted()) ? 'persistent' : 'best-effort'; }
  catch { return 'unknown'; }
}

export async function requestPersist(){
  if(!(navigator.storage && navigator.storage.persist)) return false;
  try { return await navigator.storage.persist(); } catch { return false; }
}
