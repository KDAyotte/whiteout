// All game content for WHITEOUT (original).

export const LOCS = [
  { id:'dorm',     name:'Dormitory',      x:0,    z:3,    out:false, crates:1, icon:'🛏️', text:'Start here.\nREST: +2 Warmth.' },
  { id:'mess',     name:'Mess Hall',      x:-4.6, z:3,    out:false, crates:2, icon:'🍲', text:'HOT STOVE: +1 Warmth and heal 1 (once per round).' },
  { id:'med',      name:'Med Bay',        x:4.6,  z:3,    out:false, crates:2, icon:'✚',  text:'TREAT WOUNDS: heal 2 (once per round).' },
  { id:'viro',     name:'Virology Lab',   x:-4.6, z:-0.6, out:false, crates:2, icon:'☣️', text:'SEARCH here: draw 2, keep 1.\nThe outbreak started here.' },
  { id:'command',  name:'Command Room',   x:0,    z:-0.6, out:false, crates:1, icon:'🖥️', text:'OBJECTIVE: Call Evac (Antenna repaired). The helicopter lands 3 rounds later.' },
  { id:'storage',  name:'Storage',        x:4.6,  z:-0.6, out:false, crates:3, icon:'📦', text:'SEARCH here: draw 2, keep both. +1 extra Noise.' },
  { id:'workshop', name:'Workshop',       x:9.2,  z:-0.6, out:false, crates:2, icon:'🔧', text:'TINKER: discard 2 cards to take Spare Parts.' },
  { id:'gen',      name:'Generator Shed', x:-9.2, z:-0.6, out:true,  crates:1, icon:'⚡', text:'OBJECTIVE: Restore Power (spend Fuel Can + Spare Parts).' },
  { id:'fuel',     name:'Fuel Depot',     x:-9.2, z:3.8,  out:true,  crates:1, icon:'⛽', text:'SIPHON: take a Fuel Can (2 per game). +2 Noise.' },
  { id:'garage',   name:'Garage',         x:9.2,  z:3.8,  out:true,  crates:2, icon:'🚜', text:'ESCAPE by Snowcat: spend Keys + Fuel Can + Spare Parts, 2 Actions.' },
  { id:'radio',    name:'Radio Tower',    x:-2.3, z:-5.4, out:true,  crates:0, icon:'📡', text:'OBJECTIVE: Repair Antenna (Power ON + Toolkit, 2 Actions).' },
  { id:'weather',  name:'Weather Hut',    x:-8.2, z:-5.4, out:true,  crates:1, icon:'🌡️', text:'FORECAST: look at the top 2 Threat cards and reorder them.' },
  { id:'heli',     name:'Helipad',        x:4.6,  z:-5.4, out:true,  crates:0, icon:'🚁', text:'EVAC POINT: board the helicopter once it has landed.' },
];
export const EDGES = [
  ['dorm','mess'],['dorm','med'],['dorm','command'],['mess','viro'],['viro','command'],
  ['command','storage'],['med','storage'],['storage','workshop'],
  ['mess','fuel'],['viro','gen'],['gen','fuel'],['med','garage'],['workshop','garage'],
  ['command','radio'],['radio','heli'],['workshop','heli'],['gen','weather'],['weather','radio'],
];
export const LOC = Object.fromEntries(LOCS.map(l => [l.id, l]));
export const ADJ = Object.fromEntries(LOCS.map(l => [l.id, []]));
for (const [a, b] of EDGES) { ADJ[a].push(b); ADJ[b].push(a); }

export const TYPE_STYLE = {
  melee:     { label:'Melee Weapon',   col:'#8a3324' },
  gun:       { label:'Gun',            col:'#5d2f78' },
  gear:      { label:'Gear',           col:'#245f82' },
  objective: { label:'Objective Item', col:'#a37b12' },
  junk:      { label:'Junk',           col:'#5d5d5d' },
  event:     { label:'Event',          col:'#b5471b' },
  threat:    { label:'Threat',         col:'#8f1d1d' },
  survivor:  { label:'Survivor',       col:'#2c6a48' },
};

// ---- Supply cards --------------------------------------------------------
// melee/gun: dice, hit (min roll), noise. gear: use effect.
export const CARDS = {
  axe:      { title:'Ice Axe',          type:'melee', icon:'⛏️', dice:2, hit:4, noise:1, text:'FIGHT: roll 2 dice. Each 4+ kills a zombie here.\n+1 Noise. Each 1 rolled = 1 wound.', flavor:'Standard issue. Never meant for this.' },
  crowbar:  { title:'Crowbar',          type:'melee', icon:'🪛', dice:2, hit:5, noise:1, text:'FIGHT: roll 2 dice. Each 5+ kills a zombie here.\n+1 Noise. Each 1 rolled = 1 wound.', flavor:'Opens doors. And other things.' },
  extin:    { title:'Fire Extinguisher',type:'melee', icon:'🧯', dice:3, hit:5, noise:1, text:'FIGHT: roll 3 dice. Each 5+ kills a zombie here.\n+1 Noise. Each 1 rolled = 1 wound.', flavor:'Heavy, red, and surprisingly effective.' },
  pistol:   { title:'Service Pistol',   type:'gun',   icon:'🔫', dice:1, hit:3, noise:2, text:'SHOOT here or into a connected room: spend 1 Ammo, roll 1 die. 3+ kills (4+ into a connected room).\n+2 Noise.', flavor:'Seven rounds and a prayer.' },
  rifle:    { title:'Hunting Rifle',    type:'gun',   icon:'🎯', dice:2, hit:3, noise:2, scoped:true, text:'SHOOT here or into a connected room: spend 1 Ammo, roll 2 dice. Each 3+ kills.\nSCOPED: no penalty at range. +2 Noise.', flavor:'For the wolves. Supposedly.' },
  flare:    { title:'Flare Gun',        type:'gun',   icon:'🎆', dice:2, hit:4, noise:3, text:'SHOOT here or into a connected room: spend 1 Ammo, roll 2 dice. Each 4+ kills (5+ into a connected room).\n+3 Noise.', flavor:'Red sky at night...' },
  ammo:     { title:'Ammo Box',         type:'gear',  icon:'🧰', use:{ ammo:2 },    text:'USE (free): gain 2 Ammo, then discard this card.', flavor:'Rattles reassuringly.' },
  medkit:   { title:'Med Kit',          type:'gear',  icon:'💊', use:{ heal:2 },    text:'USE (free): heal 2, then discard this card.', flavor:'Property of Med Bay. Return after use (ha).' },
  bandage:  { title:'Bandages',         type:'gear',  icon:'🩹', use:{ heal:1 },    text:'USE (free): heal 1, then discard this card.', flavor:'Wrap it tight.' },
  blanket:  { title:'Thermal Blanket',  type:'gear',  icon:'🧣', use:{ warmth:3 },  text:'USE (free): gain 3 Warmth, then discard this card.', flavor:'Crinkly, ugly, priceless.' },
  warmers:  { title:'Hand Warmers',     type:'gear',  icon:'🔥', use:{ warmth:2 },  text:'USE (free): gain 2 Warmth, then discard this card.', flavor:'Shake to activate.' },
  bar:      { title:'Energy Bar',       type:'gear',  icon:'🍫', use:{ actions:1 }, text:'USE (free): gain 1 extra Action this round, then discard this card.', flavor:'Best before: the apocalypse.' },
  fuel:     { title:'Fuel Can',         type:'objective', icon:'⛽', text:'Spent to Restore Power at the Generator Shed or to start the Snowcat.', flavor:'Half full. Hopefully enough.' },
  parts:    { title:'Spare Parts',      type:'objective', icon:'⚙️', text:'Spent to Restore Power or to repair the Snowcat.', flavor:'Labeled "DO NOT TOUCH — K."' },
  toolkit:  { title:'Toolkit',          type:'objective', icon:'🛠️', text:'Needed to Repair the Antenna. You keep it afterward.', flavor:'Everything but the right size wrench.' },
  keys:     { title:'Snowcat Keys',     type:'objective', icon:'🔑', text:'Needed to escape by Snowcat from the Garage.', flavor:'A plastic penguin keyring.' },
  scrap:    { title:'Scrap Metal',      type:'junk',  icon:'🔩', text:'No use on its own. Good for Tinkering at the Workshop.\n(Jonas Kett can use it as Spare Parts.)', flavor:'One person\'s junk...' },
  ambush:   { title:'Ambush!',          type:'event', icon:'🧟', text:'When you draw this, a zombie lurches out: place 1 zombie on your tile. Then discard this card.', flavor:'It was in the walk-in freezer.' },
};
export const SUPPLY_LIST = [
  ['axe',2],['crowbar',2],['extin',1],['pistol',1],['rifle',1],['flare',1],
  ['ammo',3],['medkit',2],['bandage',2],['blanket',2],['warmers',2],['bar',2],
  ['fuel',2],['parts',2],['toolkit',1],['keys',1],['scrap',2],['ambush',2],
];

// ---- Threat cards --------------------------------------------------------
export const THREATS = {
  breach:  { title:'Lab Breach',        icon:'☣️', text:'Spawn 2 zombies in the Virology Lab.', flavor:'The airlock seal gives way with a hiss.' },
  pack:    { title:'Shambling Pack',    icon:'🧟', text:'Spawn 1 zombie in Storage and 1 in the Mess Hall.', flavor:'Footsteps. Lots of them.' },
  frozen:  { title:'The Frozen Rise',   icon:'🧊', text:'Spawn 1 zombie at the Fuel Depot and 1 at the Garage.', flavor:'They were buried in the snow. Not anymore.' },
  hungry:  { title:'Hungry',            icon:'👣', text:'Every zombie moves 1 step toward you, wherever it is.', flavor:'They can smell you now.' },
  gust:    { title:'Whiteout Gust',     icon:'🌨️', text:'The storm surges: advance the Storm track 1 extra space.', flavor:'You can\'t see your own hands.' },
  cold:    { title:'Biting Cold',       icon:'🥶', text:'Lose 1 Warmth (2 if you are Outdoors).', flavor:'The heating coughs and dies.' },
  calm:    { title:'Eerie Calm',        icon:'🌫️', text:'Nothing happens. Your Noise drops to 0.', flavor:'Too quiet.' },
  flicker: { title:'Lights Flicker',    icon:'💡', text:'If the Power is OFF, spawn 1 zombie in the Command Room and 1 in the Dormitory.', flavor:'Something moves in the dark.' },
  drawn:   { title:'Drawn to Noise',    icon:'🔊', text:'Spawn 1 zombie for every 2 Noise (round up) on random tiles next to yours.', flavor:'You were loud. They heard.' },
  lurker:  { title:'Lurker',            icon:'👁️', text:'Spawn 1 zombie on a random tile 2 steps from you.', flavor:'Just out of sight.' },
  groans:  { title:'The Station Groans',icon:'🏚️', text:'Spawn 1 zombie in the Dormitory and 1 in the Med Bay.', flavor:'Old patients. New appetites.' },
};
export const THREAT_LIST = [
  ['breach',2],['pack',2],['frozen',2],['hungry',2],['gust',2],['cold',2],['calm',2],['flicker',1],['drawn',2],['lurker',2],['groans',1],
];

// ---- Survivors -----------------------------------------------------------
export const SURVIVORS = {
  mara:  { title:'Dr. Mara Velez',  role:'Glaciologist',     icon:'🧑‍🔬', ammo:2, start:[],
           text:'Your first Outdoor Move each round costs no Warmth.', flavor:'"I\'ve walked this ridge in worse."' },
  jonas: { title:'Jonas Kett',      role:'Station Mechanic', icon:'👷', ammo:2, start:[],
           text:'Repairing the Antenna or the Snowcat takes 1 Action instead of 2. Scrap Metal counts as Spare Parts.', flavor:'"It\'s not broken. It\'s mine."' },
  priya: { title:'Priya Anand',     role:'Medic',            icon:'🧑‍⚕️', ammo:2, start:[],
           text:'All your healing heals +1. Once per game, when you would drop to 0 Health, go to 1 instead.', flavor:'"Hold still. This will sting."' },
  tuck:  { title:'"Tuck" Hollis',   role:'Security Chief',   icon:'👮', ammo:4, start:['pistol'],
           text:'Start with a Service Pistol and 4 Ammo. Your gun attacks make only +1 Noise.', flavor:'"Stay behind me."' },
};

export const DIFFICULTY = {
  easy:   { label:'Easy',   zombies:['viro','storage'],                             storm:14 },
  normal: { label:'Normal', zombies:['viro','storage','mess'],                      storm:12 },
  hard:   { label:'Hard',   zombies:['viro','viro','storage','mess','garage'],      storm:10 },
};

export const MAX_HEALTH = 5, MAX_WARMTH = 5, MAX_AMMO = 6, MAX_NOISE = 5, HAND_LIMIT = 5, ACTIONS = 4;

// Unified lookup for any card face id (supply 's:', threat 't:', survivor 'v:').
export function cardInfo(face) {
  const [k, id] = face.split(':');
  if (k === 's') { const c = CARDS[id]; return { ...c, typeLabel: TYPE_STYLE[c.type].label }; }
  if (k === 't') { const c = THREATS[id]; return { ...c, type:'threat', typeLabel:'Threat' }; }
  const s = SURVIVORS[id];
  return { title:s.title, icon:s.icon, type:'survivor', typeLabel:'Survivor · ' + s.role,
           text:`${s.role.toUpperCase()}\n${s.text}\n\nHealth 5 · Warmth 5 · Ammo ${s.ammo}`, flavor:s.flavor };
}
export function diceLabel(c) { return c.dice ? `${c.dice} ${c.dice > 1 ? 'dice' : 'die'} · ${c.hit}+` : ''; }
