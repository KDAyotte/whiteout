// Glue: screen panels + prompts <-> rules engine <-> 3D scene.
import { LOC, ADJ, CARDS, SURVIVORS, DIFFICULTY, cardInfo, diceLabel, MAX_HEALTH, MAX_WARMTH, MAX_AMMO, MAX_NOISE, HAND_LIMIT } from './data.js';
import { cardCanvas, backCanvas, tileCanvas, preloadArt } from './art.js';
import { createScene } from './scene.js';
import { Game } from './game.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const urlCache = new Map();
const urlOf = cv => { if (!urlCache.has(cv)) urlCache.set(cv, cv.toDataURL()); return urlCache.get(cv); };
const faceUrl = face => urlOf(cardCanvas(face));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const reader = $('#reader'), modal = $('#modal'), dialog = modal.querySelector('.dialog');
const anyOverlay = () => reader.classList.contains('open') || modal.classList.contains('open');

// ------------------------------------------------------------ scene
let scene = null;   // created in boot(), once the painted art has loaded
function makeScene() {
  scene = createScene($('#gl'), {
    onPick: ud => openReader(ud),
    onDblPick: ud => { if (ud.kind === 'tile') { closeReader(); scene.focusLoc(ud.loc.id); } },
  });
  scene.setKeysEnabled(() => !anyOverlay());
  scene.onHover(onHover);
}

// ------------------------------------------------------------ io for the engine
const io = {
  sync: () => render(),
  log: () => renderLog(),
  pause: ms => sleep(ms),
  async roll(n, { hit, label, bad, bite }) {
    const values = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));
    showToast(`<b>${esc(label)}</b> <span style="color:var(--mute)">(${hit}+ ${bad ? 'wounds you' : 'hits'})</span><div class="dice">${values.map(() => '<div class="d">…</div>').join('')}</div>`, 0);
    await scene.rollDice(values, { bad });
    const hits = values.filter(v => v >= hit).length;
    showToast(`<b>${esc(label)}</b><div class="dice">${values.map(v => `<div class="d ${v >= hit ? 'hit' : bite && v === 1 ? 'one' : ''}">${v}</div>`).join('')}</div>
      ${bad ? (hits ? `<span style="color:var(--bad)">${hits} wound${hits > 1 ? 's' : ''}</span>` : '<span style="color:var(--good)">No wounds</span>')
            : `${hits ? `<span style="color:var(--good)">${hits} hit${hits > 1 ? 's' : ''}</span>` : 'Miss'}`}`, 2600);
    await sleep(700);
    return values;
  },
  show({ face, cards, title, note }) {
    const faces = face ? [face] : cards.map(c => 's:' + c.id);
    return openModal(`<h2>${esc(title)}</h2>${note ? `<div class="note">${esc(note)}</div>` : ''}
      <div class="cards static">${faces.map(f => `<img src="${faceUrl(f)}" style="width:${face ? 300 : 220}px">`).join('')}</div>
      <div class="row"><button class="primary" data-r="ok">Continue</button></div>`, (r) => r === 'ok', true);
  },
  choose({ title, cards, pick, confirm, cancel }) {
    const sel = new Set();
    return openModal(`<h2>${esc(title)}</h2><div class="note">Choose ${pick}.</div>
      <div class="cards">${cards.map(c => `<img src="${faceUrl('s:' + c.id)}" data-uid="${c.uid}" title="${esc(CARDS[c.id].title)}" style="width:${cards.length > 4 ? 150 : 200}px">`).join('')}</div>
      <div class="row">${cancel ? '<button data-r="cancel">Cancel</button>' : ''}<button class="primary" data-r="ok" disabled>${esc(confirm)}</button></div>`,
      (r) => r === 'cancel' ? null : r === 'ok' ? [...sel] : undefined, !cancel,
      (root) => root.querySelectorAll('img[data-uid]').forEach(img => img.onclick = () => {
        const u = +img.dataset.uid;
        if (sel.has(u)) sel.delete(u); else if (sel.size < pick) sel.add(u); else if (pick === 1) { sel.clear(); sel.add(u); root.querySelectorAll('img.sel').forEach(i => i.classList.remove('sel')); }
        img.classList.toggle('sel', sel.has(u));
        root.querySelector('[data-r=ok]').disabled = sel.size !== pick;
      }));
  },
  forecast(top) {
    let order = [...top];
    const draw = (root) => {
      root.querySelector('.cards').innerHTML = order.map((c, i) => `<div><div class="note">${i ? 'Then' : 'Next'}</div><img src="${faceUrl('t:' + c.id)}"></div>`).join('');
    };
    return openModal(`<h2>Forecast</h2><div class="note">The next Threat cards, in order. Swap them if you like.</div>
      <div class="cards static"></div><div class="row"><button data-r="swap">⇄ Swap order</button><button class="primary" data-r="ok">Done</button></div>`,
      (r, root) => { if (r === 'swap') { order.reverse(); draw(root); return undefined; } return order; }, true, draw);
  },
  over(o) {
    render();
    setTimeout(() => openModal(`<p class="big">${o.won ? '🚁' : '💀'}</p><h2>${o.won ? 'You escaped!' : 'Game over'}</h2>
      <div class="note">${esc(o.why)}</div><div class="note">Rounds survived: ${o.round} · Zombies destroyed: ${o.kills}</div>
      <div class="row"><button data-r="look">Look at the table</button><button class="primary" data-r="new">New game</button></div>`,
      r => r, true).then(r => { if (r === 'new') startScreen(); }), 900);
  },
};
const game = new Game(io);

// ------------------------------------------------------------ modal helper
let modalResolve = null;
function openModal(html, onBtn, noEsc, init) {
  closeReader();
  dialog.innerHTML = html; modal.classList.add('open'); modal.dataset.noesc = noEsc ? '1' : '';
  if (init) init(dialog);
  return new Promise(res => {
    modalResolve = (r) => { modal.classList.remove('open'); modalResolve = null; res(r); };
    dialog.onclick = e => {
      const b = e.target.closest('button[data-r]'); if (!b) return;
      const v = onBtn(b.dataset.r, dialog);
      if (v !== undefined) modalResolve(v);
    };
  });
}

// ------------------------------------------------------------ toast
let toastTimer = 0;
function showToast(html, ms) {
  const t = $('#toast'); t.innerHTML = html; t.style.display = 'block';
  clearTimeout(toastTimer); if (ms) toastTimer = setTimeout(() => t.style.display = 'none', ms);
}

// ------------------------------------------------------------ reader (click to read)
function infoFor(ud) {
  const G = game.G;
  if (ud.kind === 'card') {
    const c = cardInfo(ud.face), dl = diceLabel(c);
    return { img: faceUrl(ud.face), html: `<h2>${esc(c.title)}</h2><div class="type">${esc(c.typeLabel)}${dl ? ' · ' + dl : ''}</div>${esc(c.text).replace(/\n/g, '<br>')}<div class="flavor">${esc(c.flavor)}</div>` };
  }
  if (ud.kind === 'tile') {
    const l = ud.loc;
    const zs = G ? G.zombies.filter(z => z.loc === l.id).length : 0;
    return { img: urlOf(tileCanvas(l)), wide: true, html: `<h2>${l.icon} ${esc(l.name)}</h2><div class="type">${l.out ? 'Outdoor · entering costs 1 Warmth' : 'Indoor'}</div>${esc(l.text).replace(/\n/g, '<br>')}
      <p><b>Crates left:</b> ${G ? G.crates[l.id] : l.crates} &nbsp; <b>Zombies here:</b> ${zs}${G && G.loc === l.id ? ' &nbsp; <b style="color:var(--acc)">You are here</b>' : ''}</p>
      <p><b>Connects to:</b><br>${ADJ[l.id].map(o => `${LOC[o].out ? '❄' : '▫'} ${esc(LOC[o].name)}`).join('<br>')}</p>` };
  }
  if (ud.kind === 'deck') return { img: urlOf(backCanvas(ud.deck)), html: `<h2>${esc(ud.label)}</h2><div class="type">${ud.count ?? 0} cards left</div>Face-down deck.` };
}
function openReader(ud) {
  if (modal.classList.contains('open')) return;
  const i = infoFor(ud); if (!i) return;
  const btns = [];
  const G = game.G;
  if (G && ud.kind === 'tile') {
    const opt = game.options().find(o => o.key === 'move:' + ud.loc.id);
    if (opt) btns.push(`<button class="primary" data-a="move" ${opt.enabled ? '' : 'disabled'}>Move here${opt.sub ? ' (' + esc(opt.sub) + ')' : ''}</button>`);
    for (const s of game.options().filter(o => o.target === ud.loc.id && o.key.startsWith('fight:')))
      btns.push(`<button class="primary" data-a="shoot" data-k="${s.key}" ${s.enabled ? '' : 'disabled'} title="${esc(s.reason || '')}">🔫 ${esc(s.sub.split(' · ')[0])}: ${esc(s.sub.split(' · ').slice(1, 3).join(' · '))}</button>`);
    btns.push('<button data-a="fly">Fly camera here</button>');
  }
  if (G && ud.uid && G.hand.some(c => c.uid === ud.uid)) {
    if (CARDS[G.hand.find(c => c.uid === ud.uid).id].use) btns.push(`<button class="primary" data-a="use" ${game.canUse(ud.uid) ? '' : 'disabled'}>Use (free)</button>`);
    btns.push(`<button data-a="discard" ${game.busy || G.phase !== 'player' ? 'disabled' : ''}>Discard</button>`);
  }
  btns.push('<button data-a="close">Close (Esc)</button>');
  reader.querySelector('img').src = i.img; reader.querySelector('img').style.maxWidth = i.wide ? '60vw' : '52vw';
  const txt = reader.querySelector('.txt');
  txt.innerHTML = i.html + `<div class="btns">${btns.join('')}</div>`;
  txt.onclick = e => {
    const b = e.target.closest('button[data-a]'), a = b?.dataset.a; if (!a) return;
    closeReader();
    if (a === 'shoot') { const o = game.options().find(o => o.key === b.dataset.k); if (o) game.run(o); }
    if (a === 'move') { const o = game.options().find(o => o.key === 'move:' + ud.loc.id); if (o) game.run(o); }
    if (a === 'fly') scene.focusLoc(ud.loc.id);
    if (a === 'use') game.useCard(ud.uid);
    if (a === 'discard') game.manualDiscard(ud.uid);
  };
  reader.classList.add('open'); $('#preview').style.display = 'none';
}
function closeReader() { reader.classList.remove('open'); }
reader.addEventListener('click', e => { if (e.target === reader) closeReader(); });

function onHover(ud) {
  const p = $('#preview');
  if (!ud || anyOverlay()) { p.style.display = 'none'; return; }
  const i = infoFor(ud); p.querySelector('img').src = i.img; p.style.width = i.wide ? '320px' : '240px'; p.style.display = 'block';
}

// ------------------------------------------------------------ panels
function pips(n, max, col) { return `<div class="pips">${Array.from({ length: max }, (_, i) => `<div class="pip" style="${i < n ? `background:${col}` : ''}"></div>`).join('')}</div>`; }
function render() {
  const G = game.G; if (!G) return;
  scene.sync(G);
  const S = SURVIVORS[G.survivor];
  $('#sName').textContent = S.title; $('#sRole').textContent = S.role + ' · ' + DIFFICULTY[G.difficulty].label;
  $('#meters').innerHTML = `
    <span>Health ${G.health}</span>${pips(G.health, MAX_HEALTH, '#c0392b')}
    <span>Warmth ${G.warmth}</span>${pips(G.warmth, MAX_WARMTH, '#e67e22')}
    <span>Ammo ${G.ammo}</span>${pips(G.ammo, MAX_AMMO, '#b08d3c')}
    <span>Noise ${G.noise}</span>${pips(G.noise, MAX_NOISE, '#8e44ad')}`;
  $('#stormTxt').innerHTML = `❄ Round ${G.round} · Storm ${G.storm} of ${G.stormMax}${G.storm >= G.stormMax ? ' · <b style="color:var(--bad)">FINAL ROUND</b>' : ''}`;
  const has = id => G.hand.some(c => c.id === id);
  const hasParts = has('parts') || (G.survivor === 'jonas' && has('scrap'));
  const ck = (ok, txt) => `<div class="${ok ? 'done' : 'todo'}">${ok ? '✔' : '○'} ${txt}</div>`;
  $('#goals').innerHTML = `<span class="hint">details (M) ›</span><b>Helicopter route</b>
    ${ck(G.power, G.power ? 'Power restored' : `Restore Power <small>(Generator Shed: Fuel ${has('fuel') ? '✓' : '✗'} + Parts ${hasParts ? '✓' : '✗'})</small>`)}
    ${ck(G.antenna, G.antenna ? 'Antenna repaired' : `Repair Antenna <small>(Radio Tower: Toolkit ${has('toolkit') ? '✓' : '✗'})</small>`)}
    ${ck(!!G.evacRound, `Call Evac <small>(Command Room)</small>`)}
    ${ck(G.evacRound && G.round >= G.evacRound, G.evacRound ? `Board at Helipad <small>(lands round ${G.evacRound})</small>` : 'Board at Helipad')}
    <b>Snowcat route</b> <small>(Garage)</small>
    ${ck(has('keys'), 'Snowcat Keys')}${ck(has('fuel'), 'Fuel Can')}${ck(hasParts, 'Spare Parts')}`;
  renderActions(); renderHand(); renderLog();
}
function renderLog() {
  const G = game.G; if (!G) return;
  const el = $('#log');
  el.innerHTML = G.log.slice(-60).map(l => `<div class="${l.kind}">${esc(l.msg)}</div>`).join('');
  el.scrollTop = el.scrollHeight;
}
function renderActions() {
  const G = game.G, el = $('#actions');
  const opts = game.options();
  const here = LOC[G.loc], z = G.zombies.filter(q => q.loc === G.loc).length;
  const btn = o => `<button class="opt ${o.group === 'move' ? 'move' : ''}" data-k="${o.key}" ${o.enabled ? '' : 'disabled'} title="${esc(o.reason || '')}">
      <span class="l">${o.icon ? o.icon + ' ' : ''}${esc(o.label)}${o.cost > 1 ? ` <small>(${o.cost} Actions)</small>` : ''}</span><span class="s">${esc(o.reason && !o.enabled ? o.reason : o.sub || '')}</span></button>`;
  const group = g => opts.filter(o => o.group === g);
  const busy = G.phase !== 'player' || game.busy;
  el.innerHTML = `
    <div class="here">${here.icon} ${esc(here.name)}<small>${here.out ? 'Outdoor' : 'Indoor'} · ${z ? `<span style="color:var(--bad)">${z} zombie${z > 1 ? 's' : ''} here</span>` : 'no zombies here'} · ${G.crates[G.loc]} crate(s)</small></div>
    <div class="apips">${Array.from({ length: Math.max(4, G.actions) }, (_, i) => `<div class="apip ${i < G.actions ? 'on' : ''}"></div>`).join('')} <span>${G.actions} Action${G.actions === 1 ? '' : 's'} left</span></div>
    ${G.over ? '<div class="note">The game is over.</div>' : G.phase === 'threat' ? '<div style="color:var(--bad)">☣ Threat phase…</div>' : ''}
    ${group('tile').length ? '<h3>THIS ROOM</h3>' + group('tile').map(btn).join('') : ''}
    <h3>SEARCH & FIGHT</h3>${[...group('act'), ...group('fight')].map(btn).join('')}
    <h3>MOVE TO</h3>${group('move').map(btn).join('')}
    <button id="endround" class="primary" ${busy || G.over ? 'disabled' : ''}>End round ▶${G.actions ? ` <small>(${G.actions} unused)</small>` : ''}</button>`;
  el.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => { const o = opts.find(o => o.key === b.dataset.k); if (o) game.run(o); });
  $('#endround').onclick = () => game.endRound();
}
function renderHand() {
  const G = game.G;
  $('#handCards').innerHTML = G.hand.length ? G.hand.map(c => `<img src="${faceUrl('s:' + c.id)}" data-uid="${c.uid}" title="${esc(CARDS[c.id].title)}">`).join('')
    : '<div class="empty">Empty</div>';
  $('#hand .lbl').textContent = `BACKPACK ${G.hand.length}/${HAND_LIMIT}`;
  $('#handCards').querySelectorAll('img').forEach(img => img.onclick = () => {
    const c = G.hand.find(x => x.uid === +img.dataset.uid); openReader({ kind: 'card', face: 's:' + c.id, uid: c.uid });
  });
}

// ------------------------------------------------------------ missions screen
function missionsModal() {
  const G = game.G; if (!G || modal.classList.contains('open')) return;
  const jonas = G.survivor === 'jonas';
  const has = id => G.hand.some(c => c.id === id);
  const hasParts = has('parts') || (jonas && has('scrap'));
  const d = game.dist(G.loc);
  const zAt = l => G.zombies.filter(z => z.loc === l).length;
  const need = (ok, txt) => `<li class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} ${txt}</li>`;
  const step = (n, title, loc, needs, cost, effect, done) => {
    const ready = !done && needs.every(x => x.ok);
    const L = LOC[loc], z = zAt(loc);
    return `<div class="mstep ${done ? 'done' : ready ? 'ready' : ''}">
      <img src="${urlOf(tileCanvas(L))}">
      <div class="mtxt">
        <div class="mhead"><b>${n ? n + '. ' : ''}${esc(title)}</b><span class="chip">${done ? 'DONE' : ready ? 'READY' : 'NOT YET'}</span></div>
        <div class="msub">${L.icon} ${esc(L.name)} · ${L.out ? 'Outdoor ❄' : 'Indoor'} · ${d[loc] === 0 ? '<b style="color:var(--acc)">you are here</b>' : `${d[loc]} move${d[loc] > 1 ? 's' : ''} away`}${z ? ` · <span style="color:var(--bad)">${z} zombie${z > 1 ? 's' : ''} there</span>` : ''}</div>
        <ul>${needs.map(x => need(x.ok, x.txt)).join('')}${z && !done ? need(false, 'Room must be clear of zombies') : ''}</ul>
        <div class="msub">Costs ${cost} Action${cost > 1 ? 's' : ''} → ${esc(effect)}</div>
      </div>
      <button data-r="fly:${loc}">Show on board</button></div>`;
  };
  const count = (pile, id) => pile.filter(c => c.id === id).length;
  const where = (id, extra = '') => {
    const inDeck = count(G.supply, id), inDisc = count(G.supplyDiscard, id);
    return `<tr><td>${CARDS[id].icon} ${esc(CARDS[id].title)}</td><td>${has(id) ? '<b style="color:var(--good)">In your backpack</b>' : '—'}</td>
      <td>${inDeck} in Supply deck${inDisc ? `, ${inDisc} in discard` : ''}</td><td>${extra}</td></tr>`;
  };
  const landed = G.evacRound && G.round >= G.evacRound;
  openModal(`<h2>Missions</h2>
    <div class="note">Round ${G.round} · Storm ${G.storm} of ${G.stormMax}: <b>${G.stormMax - G.storm + 1} round(s) left</b> before the storm buries the station.</div>
    <div class="mroute"><h3>🚁 Route 1: Helicopter evac (4 steps, in order)</h3>
      ${step(1, 'Restore Power', 'gen', [{ ok: has('fuel'), txt: 'Fuel Can (spent)' }, { ok: hasParts, txt: `Spare Parts (spent)${jonas ? ', or Scrap Metal' : ''}` }], 1, 'Power ON. Lights Flicker threats stop spawning zombies.', G.power)}
      ${step(2, 'Repair the Antenna', 'radio', [{ ok: G.power, txt: 'Power is ON' }, { ok: has('toolkit'), txt: 'Toolkit (you keep it)' }], jonas ? 2 - 1 : 2, 'Antenna fixed. The radio works.', G.antenna)}
      ${step(3, 'Call Evac', 'command', [{ ok: G.antenna, txt: 'Antenna repaired' }], 1, 'The helicopter lands 3 rounds later.', !!G.evacRound)}
      ${step(4, 'Board the helicopter', 'heli', [{ ok: !!landed, txt: G.evacRound ? `Helicopter has landed (round ${G.evacRound})` : 'Helicopter has landed (call it first)' }], 1, 'YOU WIN.', false)}
    </div>
    <div class="mroute"><h3>🚜 Route 2: Snowcat (1 step, needs 3 items)</h3>
      ${step(0, 'Escape by Snowcat', 'garage', [{ ok: has('keys'), txt: 'Snowcat Keys' }, { ok: has('fuel'), txt: 'Fuel Can (spent)' }, { ok: hasParts, txt: `Spare Parts (spent)${jonas ? ', or Scrap Metal' : ''}` }], jonas ? 1 : 2, 'YOU WIN.', false)}
    </div>
    <div class="mroute"><h3>🔍 Where to find mission items</h3>
      <table class="mtable"><tr><th>Item</th><th>You</th><th>Cards left</th><th>Other ways</th></tr>
      ${where('fuel', `Fuel Depot: Siphon (${2 - G.fuelTaken} left)`)}
      ${where('parts', `Workshop: Tinker (discard any 2 cards)${jonas ? '; Scrap Metal works for you' : ''}`)}
      ${where('toolkit')}${where('keys')}
      ${jonas ? where('scrap', 'Counts as Spare Parts for Jonas') : ''}</table>
      <div class="msub" style="margin-top:6px">Search a room with crates (📦) to draw from the Supply deck. Storage draws 2; the Virology Lab draws 2, keep 1.</div>
    </div>
    <div class="row" style="margin-top:14px"><button class="primary" data-r="close">Close</button></div>`,
    r => r, false).then(r => { if (r && r.startsWith('fly:')) scene.focusLoc(r.slice(4)); });
}

// ------------------------------------------------------------ start screen / menu
async function startScreen() {
  let surv = 'mara', diff = 'normal';
  const saved = Game.hasSave();
  const r = await openModal(`<h2>WHITEOUT: Kessel Ridge Station</h2>
    <div class="note">A blizzard has cut off the station. The dead are walking. Get out: by helicopter or by snowcat.</div>
    <div class="cards">${Object.keys(SURVIVORS).map(id => `<img src="${faceUrl('v:' + id)}" data-s="${id}" class="${id === surv ? 'sel' : ''}">`).join('')}</div>
    <div class="diff">${Object.entries(DIFFICULTY).map(([k, d]) => `<button data-d="${k}" class="${k === diff ? 'sel' : ''}">${d.label} · ${d.zombies.length} zombies · Storm ${d.storm}</button>`).join('')}</div>
    <div class="row">${saved ? `<button data-r="continue">Continue saved game (round ${saved.round})</button>` : ''}<button data-r="rules">Quick rules</button><button class="primary" data-r="start">Start</button></div>`,
    r => r, true, root => {
      root.querySelectorAll('img[data-s]').forEach(img => img.onclick = () => { surv = img.dataset.s; root.querySelectorAll('img[data-s]').forEach(i => i.classList.toggle('sel', i === img)); });
      root.querySelectorAll('button[data-d]').forEach(b => b.onclick = () => { diff = b.dataset.d; root.querySelectorAll('button[data-d]').forEach(x => x.classList.toggle('sel', x === b)); });
    });
  if (r === 'continue') { game.load(); return; }
  if (r === 'rules') { await quickRules(); return startScreen(); }
  game.newGame(surv, diff);
  scene.setView('overview');
}
function quickRules() {
  return openModal(`<h2>Quick rules</h2><div style="text-align:left;max-width:680px;line-height:1.55;font-size:14.5px">
    <p><b>Win</b> by escaping: <b>Helicopter</b> (Restore Power → Repair Antenna → Call Evac → board at the Helipad when it lands) or <b>Snowcat</b> (at the Garage with Keys + Fuel Can + Spare Parts).<br>
    <b>Lose</b> if your Health hits 0 or the Storm track runs out.</p>
    <p><b>Each round you get 4 Actions:</b> Move to a connected tile · Search (take a crate, draw a card, +1 Noise) · Fight (roll dice for your weapon) · Use the room. Consumable cards (Med Kit, Ammo…) are free to use.</p>
    <p><b>Outdoors</b> (❄ tiles) entering costs 1 Warmth, and ending the round outside costs 1 more. At 0 Warmth the cold wounds you instead.<br>
    <b>Leaving</b> a tile with zombies: each one bites on 5+. You can't Search or use a room while zombies are there.<br>
    <b>Melee</b> is quiet but each 1 you roll is a wound. <b>Guns</b> use Ammo and are loud.</p>
    <p><b>Threat phase</b> (after you End round): a Threat card is resolved → zombies within <b>Noise</b> steps of you move 1 step closer (none at Noise 0) → each zombie on your tile bites on 4+ → outdoor cold → Noise −2, Storm +1.</p>
    <p>Backpack holds 5 cards. Your game is saved automatically in this browser.</p></div>
    <div class="row"><button class="primary" data-r="ok">Got it</button></div>`, r => r, false);
}
$('#menuBtn').onclick = async () => {
  if (modal.classList.contains('open')) return;
  const q = scene.getQuality();
  const r = await openModal(`<h2>Menu</h2><div class="row" style="flex-direction:column;align-items:center">
    <div class="note" style="margin:6px 0 0">Graphics quality</div>
    <div class="diff">${[['low', 'Low · fastest'], ['medium', 'Medium · soft shadows'], ['high', 'High · + ambient occlusion']].map(([k, l]) => `<button data-r="q:${k}" class="${k === q ? 'sel' : ''}">${l}</button>`).join('')}</div>
    <button data-r="rules">Quick rules</button><button data-r="new">New game (abandon this one)</button><button class="primary" data-r="close">Back to the game</button>
    <div class="note" style="font-size:11px;margin-top:10px">Textures &amp; lighting: Poly Haven (CC0)</div></div>`, r => r, false);
  if (r && r.startsWith('q:')) scene.setQuality(r.slice(2));
  if (r === 'rules') quickRules();
  if (r === 'new') { game.clearSave(); startScreen(); }
};

// ------------------------------------------------------------ keys & buttons
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => scene.setView(b.dataset.view));
$('#help').onclick = () => $('#help').classList.toggle('min');
$('#missionsBtn').onclick = () => missionsModal();
$('#goals').onclick = () => missionsModal();
$('#labelsBtn').onclick = () => toggleLabels();
$('#panelsBtn').onclick = () => togglePanels();
function togglePanels() {
  const show = $('#actions').style.display === 'none';
  for (const id of ['#status', '#actions', '#hand']) $(id).style.display = show ? '' : 'none';
  const b = $('#panelsBtn'); b.classList.toggle('on', show);
  b.textContent = show ? '▤ Panels' : '▤ Show panels';
}
function toggleLabels() { const on = !scene.labelsOn(); scene.setLabels(on); $('#labelsBtn').classList.toggle('on', on); }
addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (reader.classList.contains('open')) closeReader(); else if (modal.classList.contains('open') && !modal.dataset.noesc && modalResolve) modalResolve(null); return; }
  if (anyOverlay()) return;
  if (e.key === 'm' || e.key === 'M') { missionsModal(); return; }
  if (e.key === 'l' || e.key === 'L') { toggleLabels(); return; }
  if (e.key === 'h' || e.key === 'H') { togglePanels(); return; }
  const v = { '1': 'overview', '2': 'top', '3': 'player', '4': 'survivor' }[e.key];
  if (v) scene.setView(v);
});

preloadArt().then(() => {
  makeScene();
  startScreen();
  window.__whiteout = { game, scene };
});
