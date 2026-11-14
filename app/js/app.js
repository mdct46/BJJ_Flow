// App shell: navigation, hash routing and service worker registration.
import { loadRatings } from './ratings.js';
import { ICONS } from './ui.js';
import * as home from './views/home.js';
import * as map from './views/map.js';
import * as glossary from './views/glossary.js';
import * as notes from './views/notes.js';
import * as game from './views/game.js';
import * as settings from './views/settings.js';

// Route name -> page module. Each module exports mount(el, route) and optionally unmount().
const ROUTES = { home, map, glossary, notes, game, settings };
const TITLES = { home:'Home', map:'Map', glossary:'Glossary', notes:'Flow Notes', game:'My Game', settings:'Settings' };

// Main nav. `match` lists the routes that light up each tab.
const NAV = [
  { href:'#/home',  label:'Home',       icon:'home',  match:['home'] },
  { href:'#/map',   label:'Map',        icon:'map',   match:['map','glossary'] },
  { href:'#/notes', label:'Flow Notes', icon:'notes', match:['notes'] },
  { href:'#/game',  label:'My Game',    icon:'game',  match:['game'] },
];

// "#/map/mount" -> {name:'map', param:'mount', query:{}}; "#/glossary?q=arm" -> {name:'glossary', query:{q:'arm'}}
function parseHash(){
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, qs = ''] = raw.split('?');
  const [name, param] = path.split('/').map(s=>decodeURIComponent(s || ''));
  return {
    name: ROUTES[name] ? name : 'home',
    param: param || null,
    query: Object.fromEntries(new URLSearchParams(qs)),
  };
}

function renderNav(active){
  const html = NAV.map(n=>`
    <a href="${n.href}" class="${n.match.includes(active)?'active':''}">${ICONS[n.icon]}<span>${n.label}</span></a>`).join('');
  document.getElementById('topNav').innerHTML = html;
  document.getElementById('bottomNav').innerHTML = html;
  document.getElementById('settingsLink').classList.toggle('active', active==='settings');
}

let current = null;

function render(){
  const route = parseHash();
  if(current && current.unmount) current.unmount();
  const view = document.getElementById('view');
  view.innerHTML = '';
  view.dataset.route = route.name;
  current = ROUTES[route.name];
  current.mount(view, route);
  renderNav(route.name);
  document.title = `${TITLES[route.name]} · BJJ Flow`;
}

async function start(){
  document.getElementById('settingsLink').innerHTML = ICONS.settings;
  await loadRatings();
  if(!location.hash) history.replaceState(null, '', '#/home');
  window.addEventListener('hashchange', render);
  render();
}

start();

if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Service worker registration failed', err));
  });
}
