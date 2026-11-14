// Storage layer. Every read and write of user data goes through this module.
// Today it is on-device IndexedDB. When accounts arrive, this is the one file
// that gets a server-backed implementation with the same async API.

const DB_NAME = 'bjj-flow';
const DB_VERSION = 1;
const KV = 'kv';

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
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  }).catch(err=>{
    console.warn('Falling back to in-memory storage; data will not persist.', err);
    memoryFallback = new Map();
    return null;
  });
  return dbPromise;
}

function tx(db, mode, fn){
  return new Promise((resolve, reject)=>{
    const t = db.transaction(KV, mode);
    const store = t.objectStore(KV);
    const result = fn(store);
    t.oncomplete = ()=> resolve(result && 'result' in result ? result.result : undefined);
    t.onerror = ()=> reject(t.error);
    t.onabort = ()=> reject(t.error);
  });
}

export async function get(key, fallback = null){
  const db = await openDb();
  if(!db) return memoryFallback.has(key) ? memoryFallback.get(key) : fallback;
  const value = await tx(db, 'readonly', s=>s.get(key));
  return value === undefined ? fallback : value;
}

export async function set(key, value){
  const db = await openDb();
  if(!db){ memoryFallback.set(key, value); return; }
  await tx(db, 'readwrite', s=>s.put(value, key));
  requestPersistOnce();
}

export async function exportAll(){
  const db = await openDb();
  const data = {};
  if(!db){ memoryFallback.forEach((v,k)=>{ data[k]=v; }); }
  else {
    const keys = await tx(db, 'readonly', s=>s.getAllKeys());
    const values = await tx(db, 'readonly', s=>s.getAll());
    keys.forEach((k,i)=>{ data[k] = values[i]; });
  }
  return { app: 'bjj-flow', schema: 1, exportedAt: new Date().toISOString(), data };
}

// Replaces everything currently stored with the backup's contents.
export async function importAll(backup){
  if(!backup || backup.app !== 'bjj-flow' || typeof backup.data !== 'object' || backup.data === null){
    throw new Error('This file is not a BJJ Flow backup.');
  }
  const db = await openDb();
  if(!db){
    memoryFallback.clear();
    Object.entries(backup.data).forEach(([k,v])=>memoryFallback.set(k,v));
    return;
  }
  await tx(db, 'readwrite', s=>{
    s.clear();
    Object.entries(backup.data).forEach(([k,v])=>s.put(v,k));
  });
}

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
