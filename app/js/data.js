// Technique data: positions, connections, chains and step basics.
// This is the content source for every page. Add content here.
const ADV_COLOR = { top:'var(--gold)', bottom:'var(--slate)', neutral:'var(--grey)' };
const ADV_COLOR_HEX = { top:'#C9A227', bottom:'#6E8CA0', neutral:'#7A8590' };
const TYPE_COLOR = { pass:'#3E7CB1', sweep:'#9B6FB0', escape:'#4FA377', transition:'#7A8590' };
const TYPE_NOUN = { pass:'Pass', sweep:'Sweep', escape:'Escape', transition:'Transition' };

const POSITIONS = [
  {id:'standing', name:'Standing', sub:'neutral / feet', adv:'neutral', x:680, y:60, w:150, h:56,
    desc:'Grips and feet. The exchange usually ends here in one of two ways: a takedown, or one player pulling guard.',
    subs:['Guillotine','D\u2019Arce (off sprawl)','Anaconda']},

  {id:'closedguard', name:'Closed Guard', sub:'bottom', adv:'bottom', x:190, y:230, w:165, h:56,
    desc:'Legs locked around the opponent\u2019s waist. A strong defensive base and a real attacking position — the bottom player controls distance and dictates the pace.',
    subs:['Armbar','Triangle choke','Omoplata','Kimura','Guillotine']},

  {id:'butterflyguard', name:'Butterfly Guard', sub:'bottom', adv:'bottom', x:430, y:230, w:165, h:56,
    desc:'Seated, hooks inside the opponent\u2019s legs, off-balancing with the upper body. Built for elevation sweeps at close range rather than submissions.',
    subs:['Guillotine']},

  {id:'openguard', name:'Open Guard', sub:'bottom', adv:'bottom', x:670, y:230, w:165, h:56,
    desc:'Legs unlocked, feet and shins used to control distance and grips. Family of guards (De La Riva, spider, X-guard) built for sweeping and off-balancing.',
    subs:['Triangle choke','Omoplata','Armbar']},

  {id:'halfguard', name:'Half Guard', sub:'bottom', adv:'bottom', x:910, y:230, w:165, h:56,
    desc:'One of the opponent\u2019s legs trapped between yours. A transitional position — can be a launchpad for sweeps or a stop-gap while recovering full guard.',
    subs:['Kimura','Guillotine','D\u2019Arce']},

  {id:'fiftyfifty', name:'50/50 Guard', sub:'neutral / legs', adv:'neutral', x:1160, y:340, w:165, h:56,
    desc:'Both players\u2019 legs interlocked around a single leg each — a leg-entanglement stalemate. Whoever wins the grip fight for the foot usually wins the exchange.',
    subs:['Straight ankle lock','Heel hook','Kneebar']},

  {id:'turtle', name:'Turtle', sub:'bottom / neutral', adv:'neutral', x:1160, y:460, w:150, h:56,
    desc:'Rolled onto knees and elbows, defending. Rarely a destination on purpose — usually a stop on the way somewhere safer, or the way in to the back.',
    subs:['Clock choke (gi)','Guillotine (off sprawl)']},

  {id:'sidecontrol', name:'Side Control', sub:'top', adv:'top', x:190, y:460, w:165, h:56,
    desc:'Perpendicular control, chest to ribs. The classic dominant pin — the top player has weight, the bottom player is working purely to survive and recover guard.',
    subs:['Americana','Kimura','Armbar','Head-arm choke']},

  {id:'northsouth', name:'North-South', sub:'top', adv:'top', x:430, y:460, w:165, h:56,
    desc:'Facing the opposite direction across the body. Heavy and disorienting — a favorite spot to lock in a choke or shift toward the far side.',
    subs:['North-South choke','Kimura']},

  {id:'kneebelly', name:'Knee on Belly', sub:'top', adv:'top', x:670, y:460, w:165, h:56,
    desc:'Mobile pin with one knee driven into the midsection. Uncomfortable by design — meant to provoke a reaction the top player can capitalize on.',
    subs:['Armbar','Guillotine']},

  {id:'mount', name:'Mount', sub:'top', adv:'top', x:280, y:660, w:165, h:56,
    desc:'Seated on the torso, the most dominant position in the sport. Full weight, both hands free to attack — the bottom player\u2019s only job is to survive back to guard.',
    subs:['Armbar','Cross collar choke','Ezekiel choke','Americana']},

  {id:'backcontrol', name:'Back Control', sub:'top', adv:'top', x:560, y:660, w:165, h:56,
    desc:'Hooks or body triangle in, both arms free, opponent facing away. The highest-value position in the game — nearly every path on this map leads here eventually.',
    subs:['Rear naked choke','Bow and arrow choke (gi)','Armbar']},

  {id:'crucifix', name:'Crucifix', sub:'top', adv:'top', x:840, y:660, w:165, h:56,
    desc:'Both of the opponent\u2019s arms trapped and one leg controlled from behind — they can\u2019t defend and can\u2019t move. A back-attack variant reached mainly off a turtling opponent.',
    subs:['Armbar','Rear naked choke (one arm free)']},
];

const EDGES = [
  {from:'standing', to:'closedguard', type:'transition', label:'Guard pull'},
  {from:'standing', to:'openguard', type:'transition', label:'Guard pull'},
  {from:'standing', to:'butterflyguard', type:'transition', label:'Sit to butterfly'},
  {from:'standing', to:'sidecontrol', type:'transition', label:'Takedown'},
  {from:'standing', to:'mount', type:'transition', label:'Takedown to mount'},

  {from:'closedguard', to:'standing', type:'escape', label:'Stand up'},
  {from:'closedguard', to:'mount', type:'sweep', label:'Scissor / hip-bump sweep'},
  {from:'closedguard', to:'halfguard', type:'pass', label:'Guard pass (partial)'},
  {from:'closedguard', to:'sidecontrol', type:'pass', label:'Guard pass'},

  {from:'butterflyguard', to:'standing', type:'escape', label:'Stand up'},
  {from:'butterflyguard', to:'mount', type:'sweep', label:'Butterfly sweep'},
  {from:'butterflyguard', to:'backcontrol', type:'sweep', label:'Hook sweep to back'},
  {from:'butterflyguard', to:'openguard', type:'transition', label:'Guard retention shift'},

  {from:'openguard', to:'standing', type:'escape', label:'Technical stand-up'},
  {from:'openguard', to:'mount', type:'sweep', label:'Flower / X-guard sweep'},
  {from:'openguard', to:'sidecontrol', type:'pass', label:'Toreando / knee-cut pass'},
  {from:'openguard', to:'backcontrol', type:'sweep', label:'Berimbolo'},

  {from:'halfguard', to:'mount', type:'sweep', label:'Old-school sweep'},
  {from:'halfguard', to:'backcontrol', type:'sweep', label:'Waiter sweep'},
  {from:'halfguard', to:'sidecontrol', type:'pass', label:'Half guard pass'},
  {from:'halfguard', to:'closedguard', type:'transition', label:'Recover full guard'},
  {from:'halfguard', to:'fiftyfifty', type:'transition', label:'Leg entanglement'},

  {from:'fiftyfifty', to:'standing', type:'escape', label:'Leg escape to feet'},
  {from:'fiftyfifty', to:'halfguard', type:'transition', label:'Return to half guard'},

  {from:'sidecontrol', to:'mount', type:'pass', label:'Mount from side'},
  {from:'sidecontrol', to:'kneebelly', type:'transition', label:'Step to knee on belly'},
  {from:'sidecontrol', to:'northsouth', type:'transition', label:'Switch to north-south'},
  {from:'sidecontrol', to:'closedguard', type:'escape', label:'Recover guard'},
  {from:'sidecontrol', to:'turtle', type:'escape', label:'Turtle / roll away'},

  {from:'kneebelly', to:'mount', type:'pass', label:'Advance to mount'},
  {from:'kneebelly', to:'sidecontrol', type:'transition', label:'Return to side control'},

  {from:'northsouth', to:'sidecontrol', type:'transition', label:'Return to side control'},
  {from:'northsouth', to:'mount', type:'pass', label:'Advance to mount'},

  {from:'mount', to:'backcontrol', type:'transition', label:'Take the back'},
  {from:'mount', to:'sidecontrol', type:'transition', label:'Base lost, fall to side'},
  {from:'mount', to:'halfguard', type:'escape', label:'Recompose half guard'},
  {from:'mount', to:'closedguard', type:'escape', label:'Upa / elbow escape'},

  {from:'backcontrol', to:'mount', type:'transition', label:'Hooks lost, roll to mount'},
  {from:'backcontrol', to:'standing', type:'escape', label:'Stand-and-turn escape'},

  {from:'turtle', to:'backcontrol', type:'transition', label:'Back taken'},
  {from:'turtle', to:'crucifix', type:'transition', label:'Crucifix taken'},
  {from:'turtle', to:'closedguard', type:'escape', label:'Recover guard'},
  {from:'turtle', to:'standing', type:'escape', label:'Stand up'},

  {from:'crucifix', to:'backcontrol', type:'transition', label:'Shift to hooks / body triangle'},
];

// Submission chains: what to attack next when the first submission is defended,
// all without leaving the same position.
const CHAINS = [
  {position:'closedguard', note:'Classic guard attack sequence', steps:[
    {sub:'Armbar', trigger:'Opponent posts up (hitchhiker grip)'},
    {sub:'Triangle choke', trigger:'Opponent stacks / defends the arm'},
    {sub:'Omoplata', trigger:'Opponent postures out of the triangle'},
  ]},
  {position:'mount', note:'High-mount attack sequence', steps:[
    {sub:'Cross collar choke', trigger:'Opponent defends by turning away'},
    {sub:'Armbar', trigger:'Opponent frames and pushes the hips'},
    {sub:'Americana', trigger:'Opponent pulls the arm back to defend armbar'},
  ]},
  {position:'backcontrol', note:'Back-attack sequence', steps:[
    {sub:'Rear naked choke', trigger:'Opponent hand-fights the choking arm'},
    {sub:'Bow and arrow choke (gi)', trigger:'Opponent controls the choking wrist'},
    {sub:'Armbar', trigger:'Opponent turns into you defending the choke'},
  ]},
  {position:'sidecontrol', note:'Top-pressure attack sequence', steps:[
    {sub:'Kimura', trigger:'Opponent frames the near-side arm'},
    {sub:'Americana', trigger:'Opponent rotates the arm the other way to escape'},
    {sub:'Armbar', trigger:'Opponent straightens the arm to push you off'},
  ]},
  {position:'fiftyfifty', note:'Leg-lock sequence', steps:[
    {sub:'Straight ankle lock', trigger:'Opponent points the toes to defend'},
    {sub:'Heel hook', trigger:'Opponent rotates the leg out'},
    {sub:'Kneebar', trigger:'Opponent pulls the foot away'},
  ]},
];

// Basic mechanics for each submission, position-independent.
const SUB_STEPS = {
  'Armbar': [
    'Isolate one arm and control the wrist with both hands.',
    'Swing a leg over the head so the opponent\u2019s arm is trapped between your thighs.',
    'Squeeze your knees together and pinch the elbow to your chest.',
    'Lift your hips while pulling the wrist down to hyperextend the elbow.'
  ],
  'Triangle choke': [
    'Get one of the opponent\u2019s arms across your body while the other is outside your leg.',
    'Cut a 90-degree angle to that side and swing your top leg over the neck.',
    'Lock your foot behind your own opposite knee, forming a triangle around neck and arm.',
    'Pull the head down and squeeze your knees together to finish the choke.'
  ],
  'Kimura': [
    'Trap one of the opponent\u2019s arms and control the wrist with both hands.',
    'Reach your far arm under and over their forearm, gripping your own wrist (figure-four grip).',
    'Keep the elbow pinned tight to their body.',
    'Rotate the wrist up and behind their back to lock the shoulder.'
  ],
  'Guillotine': [
    'Wrap one arm around the opponent\u2019s neck as they duck their head or shoot in.',
    'Lace your hands together under the chin (gi or arm-in variations change the grip).',
    'Close your guard or drop your hips to prevent them from stepping around.',
    'Pull the elbows in and lift the chest to choke, not just squeeze the arms.'
  ],
  'D\u2019Arce': [
    'From a front headlock, thread one arm under their armpit and around the neck.',
    'Clasp your hands together, trapping the far arm and neck together.',
    'Roll to your back or sprawl your hips away to tighten the choke.',
    'Squeeze the arms together while extending the hips to finish.'
  ],
  'Anaconda': [
    'From a front headlock, wrap one arm under the neck and the other under the near armpit.',
    'Clasp your hands together in a tight gable grip around the neck and arm.',
    'Roll forward over your shoulder, ending up on top of the opponent.',
    'Squeeze the arms together as you roll through to finish the choke.'
  ],
  'Omoplata': [
    'Control one arm and swing your same-side leg over their shoulder from a guard position.',
    'Sit up and rotate so your leg pins the arm against their back like a shoulder lock.',
    'Control the hips or belt so they can\u2019t roll out.',
    'Walk your hands toward their hip and lean forward to crank the shoulder.'
  ],
  'Straight ankle lock': [
    'Control the foot and trap the leg between your legs or under an arm.',
    'Position your hip or forearm behind the Achilles tendon.',
    'Squeeze your legs together and arch back slightly.',
    'Extend your hips while pulling the foot in toward your chest.'
  ],
  'Heel hook': [
    'Control the leg and trap the foot, heel pointing toward you, in your armpit.',
    'Wrap your near arm around the heel and your far arm over the shin.',
    'Keep the knee immobilized against your hip so it can\u2019t rotate freely.',
    'Rotate the heel like turning a key to torque the knee.'
  ],
  'Kneebar': [
    'Control the leg and get both of your legs across their hip, hugging the one leg.',
    'Pull the leg tight against your chest with the knee joint over your hips.',
    'Keep their knee straight, not bent, and their foot controlled at your shoulder.',
    'Extend your hips upward to hyperextend the knee.'
  ],
  'Clock choke (gi)': [
    'From the opponent\u2019s turtle, grab the far collar deep with one hand.',
    'Step or circle around to their back side while keeping the grip tight.',
    'Drive your weight down onto their upper back to flatten them out.',
    'Walk in a circle (like clock hands) while pulling the collar to choke.'
  ],
  'Americana': [
    'Pin the opponent\u2019s wrist to the mat above their shoulder, arm bent at 90 degrees.',
    'Thread your other hand under their elbow and grab your own wrist.',
    'Keep their elbow on the mat as a fixed pivot point.',
    'Trace the arm in an \u201cS\u201d shape along the mat toward their hip to lock the shoulder.'
  ],
  'Head-arm choke': [
    'From side control, trap one of their arms across their own neck.',
    'Wrap your near arm around their head and the trapped arm together.',
    'Clasp your hands or grip your own biceps to close the choke.',
    'Drive your shoulder down and squeeze to finish.'
  ],
  'North-South choke': [
    'From north-south position, slide one arm under their near-side arm and around the neck.',
    'Clasp your hands together behind their neck or lace a gable grip.',
    'Walk your hips up toward their head for a tighter angle.',
    'Squeeze your arms and drive your chest down to finish the choke.'
  ],
  'Cross collar choke': [
    'From mount or guard, grip deep into the far collar with one hand, palm up.',
    'Grip the near collar the same way with the other hand, palm down, crossing your wrists.',
    'Bring your elbows in tight to your body rather than pulling out wide.',
    'Squeeze your hands toward each other and expand your chest to finish.'
  ],
  'Ezekiel choke': [
    'From mount, slide one hand into your own opposite sleeve, forearm across their neck.',
    'Use the other hand to grip your own fist or wrist for support.',
    'Keep your posture heavy so they can\u2019t create space.',
    'Squeeze your forearm across the neck by closing the gap between your hands.'
  ],
  'Rear naked choke': [
    'From back control, slide one arm under the chin across the throat.',
    'Clasp that hand into the crook of your other elbow (or grip your bicep).',
    'Place your free hand behind their head, fingers pointing forward.',
    'Squeeze your elbows together and expand your chest to finish.'
  ],
  'Rear naked choke (one arm free)': [
    'From crucifix, one of their arms is already trapped and unable to defend.',
    'Slide your free arm under the chin across the throat.',
    'Clasp your hands together or grip your own bicep to lock the choke.',
    'Squeeze your elbows in and expand your chest to finish.'
  ],
  'Bow and arrow choke (gi)': [
    'From back control, grab the far collar deep with one hand.',
    'Switch your hips to the side and grab their same-side leg or pant with the other hand.',
    'Pull the leg like drawing a bowstring while extending your body.',
    'Pull the collar across and arch back to finish the choke.'
  ],
};

// Basic mechanics for each sweep, keyed by the edge label used in EDGES.
const SWEEP_STEPS = {
  'Scissor / hip-bump sweep': [
    'From closed guard, open your legs and post one shin across the opponent\u2019s belly while gripping their same-side sleeve and opposite collar.',
    'Hip escape onto your side so your bottom leg is free and your top shin stays braced across their midsection.',
    'Scissor the legs: the bottom leg kicks their base leg out from under them while the top shin pushes their upper body up and back.',
    'Finish the pull with your grips as they fall, following them over into mount.'
  ],
  'Butterfly sweep': [
    'From butterfly guard, sit chest to chest and get a deep hook under one of their thighs.',
    'Control one arm at the wrist and hook or hug behind their same-side tricep or back with the other.',
    'Load their weight onto the hooking leg by pulling with your upper body toward that side.',
    'Elevate hard with the hook, lifting their base leg off the mat, and follow their fall over the top into mount.'
  ],
  'Hook sweep to back': [
    'From butterfly guard, establish the same deep hook as the butterfly sweep, but underhook the far arm instead of just gripping the sleeve.',
    'Off-balance the opponent toward the side away from your hook while keeping that underhook tight so they can\u2019t post or square back up.',
    'As they fall, don\u2019t finish flat on top — ride the rotation instead of stopping in mount.',
    'Continue rolling through the momentum until you land behind them with hooks in for back control.'
  ],
  'Flower / X-guard sweep': [
    'From open guard, control one sleeve and hook your same-side foot behind their same-side knee (basic pendulum / flower sweep setup).',
    'Swing your hips and free leg back and then forward like a pendulum, pulling the sleeve to break their post on that side.',
    'As their base leg is swept out, drive the swinging leg through to elevate and roll them onto their back.',
    'Follow through with the sleeve grip to come up in mount. (X-guard entries — underneath, controlling one leg and hooking behind the far knee — use the same elevate-and-follow-through idea from a lower angle.)'
  ],
  'Berimbolo': [
    'From De La Riva hook, off-balance the opponent forward and down using the hook and your grips so they post their hands to the mat.',
    'As they base out, sit through underneath them and roll backward, staying inverted rather than fighting to stay upright.',
    'Use your hip position to travel under and around their base leg while they\u2019re occupied defending the sweep/roll.',
    'Continue the rotation to come up on the far side of their hips and take the back with hooks in.'
  ],
  'Old-school sweep': [
    'From half guard bottom, underhook the far arm and grip their near-side wrist or sleeve with your other hand.',
    'Drive your head and shoulder into their chest, off-balancing them backward and flattening their posture.',
    'Use the hook from your trapped leg to lift and turn their base (bottom) leg out from under them.',
    'Roll through the opening created, following your underhook and head pressure up into mount.'
  ],
  'Waiter sweep': [
    'From half guard bottom, get a deep underhook on the far side and reach that same hand behind their back or belt, like carrying a tray.',
    'Use your outside-leg hook to lift their base leg, the way a waiter\u2019s hand lifts a tray.',
    'Drive up through the underhook and hook together, rolling them forward over your shoulder.',
    'Follow their rotation all the way around to their back, inserting hooks or a body triangle as you arrive.'
  ],
};

const byId = Object.fromEntries(POSITIONS.map(p=>[p.id,p]));
// A trailing "(gi)" is part of a technique's identity (gi-only), so it is kept.
// Any other trailing parenthetical is a contextual variant of the base technique.
function canonicalSubName(name){
  if(/\(gi\)\s*$/i.test(name)) return name.trim();
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim();
}
function getSteps(name){
  return SUB_STEPS[name] || SUB_STEPS[canonicalSubName(name)] || null;
}

/* ---------- Derived data (built once at load) ---------- */

const byName = Object.fromEntries(POSITIONS.map(p=>[p.name,p]));

function buildSubGlossary(){
  const map = {};
  POSITIONS.forEach(p=>{
    p.subs.forEach(raw=>{
      const canon = canonicalSubName(raw);
      if(!map[canon]) map[canon] = { name: canon, positions: [], variants: [] };
      const entry = map[canon];
      if(!entry.positions.includes(p.name)) entry.positions.push(p.name);
      // Variants with their own step data get shown separately under the base technique.
      if(raw !== canon && SUB_STEPS[raw]){
        let v = entry.variants.find(x=>x.name===raw);
        if(!v){ v = { name: raw, positions: [] }; entry.variants.push(v); }
        if(!v.positions.includes(p.name)) v.positions.push(p.name);
      }
    });
  });
  return Object.values(map).sort((a,b)=>a.name.localeCompare(b.name));
}

function buildEdgeGlossary(type){
  const map = {};
  EDGES.filter(e=>e.type===type).forEach(e=>{
    if(!map[e.label]) map[e.label] = { name: e.label, type, routes: [] };
    map[e.label].routes.push({from: byId[e.from].name, to: byId[e.to].name});
  });
  return Object.values(map).sort((a,b)=>a.name.localeCompare(b.name));
}

const SUB_GLOSSARY = buildSubGlossary();
const EDGE_GLOSSARY = {
  pass: buildEdgeGlossary('pass'),
  sweep: buildEdgeGlossary('sweep'),
  escape: buildEdgeGlossary('escape'),
  transition: buildEdgeGlossary('transition'),
};

const GLOSSARY_SECTIONS = [
  {key:'submission', title:'Submissions', color:'var(--sub)'},
  {key:'pass', title:'Passes', color:'var(--pass)'},
  {key:'sweep', title:'Sweeps', color:'var(--sweep)'},
  {key:'escape', title:'Escapes', color:'var(--escape)'},
  {key:'transition', title:'Transitions', color:'var(--transition)'},
];

const TECHNIQUE_COUNT = SUB_GLOSSARY.length + Object.values(EDGE_GLOSSARY).reduce((n,list)=>n+list.length, 0);

export {
  ADV_COLOR, ADV_COLOR_HEX, TYPE_COLOR, TYPE_NOUN,
  POSITIONS, EDGES, CHAINS, SUB_STEPS, SWEEP_STEPS,
  byId, byName, canonicalSubName, getSteps,
  SUB_GLOSSARY, EDGE_GLOSSARY, GLOSSARY_SECTIONS, TECHNIQUE_COUNT,
};