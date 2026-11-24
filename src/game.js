// WHITEOUT rules engine. Holds the state (G) and runs every rule.
// It talks to the screen only through `io` (see main.js).
import { LOC, ADJ, CARDS, THREATS, SURVIVORS, DIFFICULTY, SUPPLY_LIST, THREAT_LIST,
         MAX_HEALTH, MAX_WARMTH, MAX_AMMO, MAX_NOISE, HAND_LIMIT, ACTIONS, LOCS } from './data.js';

const SAVE_KEY = 'whiteout-save-v1';
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickRandom = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class Game {
  constructor(io) { this.io = io; this.G = null; this.busy = false; }

  // ------------------------------------------------------------ setup
  newGame(survivor, difficulty) {
    let uid = 1;
    const supply = [];
    for (const [id, n] of SUPPLY_LIST) for (let i = 0; i < n; i++) supply.push({ uid: uid++, id });
    const threat = [];
    for (const [id, n] of THREAT_LIST) for (let i = 0; i < n; i++) threat.push({ uid: uid++, id });
    const S = SURVIVORS[survivor], D = DIFFICULTY[difficulty];
    const G = this.G = {
      survivor, difficulty, stormMax: D.storm, nextUid: uid,
      loc: 'dorm', health: MAX_HEALTH, warmth: MAX_WARMTH, ammo: S.ammo, noise: 0, storm: 1, round: 1,
      actions: ACTIONS, hand: [], supply: shuffle(supply), supplyDiscard: [], threat: shuffle(threat), threatDiscard: [],
      zombies: [], crates: Object.fromEntries(LOCS.map(l => [l.id, l.crates])),
      power: false, antenna: false, evacRound: null, fuelTaken: 0,
      used: {}, freeColdMove: survivor === 'mara', lastStand: survivor === 'priya',
      lastThreat: null, log: [], over: null, phase: 'player', kills: 0,
    };
    for (const id of S.start) { // take starting gear out of the deck
      const i = G.supply.findIndex(c => c.id === id);
      G.hand.push(i >= 0 ? G.supply.splice(i, 1)[0] : { uid: G.nextUid++, id });
    }
    // two starting supply cards, never an Ambush
    while (G.hand.length < S.start.length + 2) {
      const i = G.supply.findIndex(c => c.id !== 'ambush');
      G.hand.push(G.supply.splice(i, 1)[0]);
    }
    for (const l of D.zombies) this.spawn(l, true);
    this.log(`New game: ${S.title} (${D.label}). Escape Kessel Ridge before Storm ${D.storm} runs out.`, 'sys');
    this.save(); this.io.sync();
  }
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.G)); } catch {} }
  static hasSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && !s.over ? s : null; } catch { return null; } }
  load() { this.G = Game.hasSave(); if (this.G) { this.G.phase = 'player'; this.io.sync(); } return !!this.G; }
  clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch {} }

  // ------------------------------------------------------------ helpers
  log(msg, kind = '') { this.G.log.push({ msg, kind, round: this.G.round }); if (this.G.log.length > 200) this.G.log.shift(); this.io.log(msg, kind); }
  zombiesAt(loc) { return this.G.zombies.filter(z => z.loc === loc).length; }
  hasCard(id) { return this.G.hand.find(c => c.id === id); }
  partsCard() { return this.hasCard('parts') || (this.G.survivor === 'jonas' && this.hasCard('scrap')); }
  dist(from) { // BFS distances from a tile
    const d = { [from]: 0 }, q = [from];
    while (q.length) { const a = q.shift(); for (const b of ADJ[a]) if (d[b] === undefined) { d[b] = d[a] + 1; q.push(b); } }
    return d;
  }
  spawn(loc, quiet) {
    this.G.zombies.push({ uid: this.G.nextUid++, loc });
    if (!quiet) this.log(`A zombie appears in the ${LOC[loc].name}.`, 'bad');
  }
  discardCard(uid) {
    const i = this.G.hand.findIndex(c => c.uid === uid); if (i < 0) return null;
    const [c] = this.G.hand.splice(i, 1); this.G.supplyDiscard.push(c); return c;
  }
  addNoise(n) { this.G.noise = clamp(this.G.noise + n, 0, MAX_NOISE); }
  heal(n, src) {
    if (this.G.survivor === 'priya') n += 1;
    const before = this.G.health; this.G.health = clamp(this.G.health + n, 0, MAX_HEALTH);
    this.log(`${src}: healed ${this.G.health - before}.`, 'good');
  }
  warm(n, src) {
    const before = this.G.warmth; this.G.warmth = clamp(this.G.warmth + n, 0, MAX_WARMTH);
    this.log(`${src}: +${this.G.warmth - before} Warmth.`, 'good');
  }
  hurt(n, src) {
    if (n <= 0 || this.G.over) return;
    this.G.health -= n;
    this.log(`${src}: ${n} wound${n > 1 ? 's' : ''}.`, 'bad');
    if (this.G.health <= 0) {
      if (this.G.lastStand) { this.G.lastStand = false; this.G.health = 1; this.log('Priya grits her teeth and stays standing (last stand used).', 'good'); }
      else { this.G.health = 0; this.end(false, `You were overwhelmed (${src}).`); }
    }
  }
  chill(n, src) {
    for (let i = 0; i < n; i++) {
      if (this.G.warmth > 0) { this.G.warmth--; this.log(`${src}: -1 Warmth.`, 'cold'); }
      else this.hurt(1, `${src} (frostbite)`);
    }
  }
  end(won, why) {
    if (this.G.over) return;
    this.G.over = { won, why, round: this.G.round, kills: this.G.kills };
    this.log(won ? `ESCAPED! ${why}` : `GAME OVER. ${why}`, won ? 'good' : 'bad');
    this.clearSave(); this.io.sync(); this.io.over(this.G.over);
  }
  async draw(n, opts = {}) { // draw supply cards, resolving Ambush, then enforce the hand limit
    const drawn = [];
    for (let i = 0; i < n; i++) {
      if (!this.G.supply.length) {
        if (!this.G.supplyDiscard.length) { this.log('The Supply deck is empty.', 'sys'); break; }
        this.G.supply = shuffle(this.G.supplyDiscard.filter(c => c.id !== 'ambush')); this.G.supplyDiscard = [];
        this.log('Supply discard reshuffled into a new deck.', 'sys');
      }
      drawn.push(this.G.supply.shift());
    }
    const ambush = drawn.filter(c => c.id === 'ambush');
    for (const c of ambush) { this.G.supplyDiscard.push(c); this.log('Ambush! A zombie lurches out at you.', 'bad'); this.spawn(this.G.loc, true); }
    let keep = drawn.filter(c => c.id !== 'ambush');
    if (ambush.length) { this.io.sync(); await this.io.show({ face: 's:ambush', title: 'Ambush!' }); }
    if (opts.keep && keep.length > opts.keep) {
      const chosen = await this.io.choose({ title: `Keep ${opts.keep} of these`, cards: keep, pick: opts.keep, confirm: 'Keep' });
      for (const c of keep) if (!chosen.includes(c.uid)) this.G.supplyDiscard.push(c);
      keep = keep.filter(c => chosen.includes(c.uid));
    } else if (keep.length) {
      await this.io.show({ cards: keep, title: keep.length > 1 ? 'You found' : 'You found' });
    }
    for (const c of keep) { this.G.hand.push(c); this.log(`Found: ${CARDS[c.id].title}.`, 'good'); }
    this.io.sync();
    await this.enforceHandLimit();
  }
  async enforceHandLimit() {
    const extra = this.G.hand.length - HAND_LIMIT;
    if (extra <= 0) return;
    const chosen = await this.io.choose({ title: `Backpack full: discard ${extra}`, cards: this.G.hand, pick: extra, confirm: 'Discard' });
    for (const u of chosen) { const c = this.discardCard(u); this.log(`Discarded ${CARDS[c.id].title}.`); }
    this.io.sync();
  }

  // ------------------------------------------------------------ action list
  // Every option the player has right now, enabled or not (with reason).
  options() {
    const G = this.G; if (!G || G.over || G.phase !== 'player') return [];
    const here = G.loc, z = this.zombiesAt(here), A = G.actions, list = [];
    const add = (o) => list.push({ cost: 1, ...o, enabled: !o.reason && A >= (o.cost ?? 1) && !this.busy, reason: o.reason || (A < (o.cost ?? 1) ? 'Not enough Actions' : '') });
    for (const to of ADJ[here]) {
      const out = LOC[to].out;
      const cold = out && !(G.freeColdMove);
      add({ group: 'move', key: 'move:' + to, label: `${LOC[to].name}`, sub: [out ? (cold ? '❄ -1 Warmth' : '❄ free (Mara)') : '', z ? `⚠ ${z} bite roll${z > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · '), run: () => this.move(to) });
    }
    add({ group: 'act', key: 'search', label: 'Search', icon: '🔍', sub: `${G.crates[here]} crate${G.crates[here] === 1 ? '' : 's'} · +${here === 'storage' ? 2 : 1} Noise`,
          reason: !G.crates[here] ? 'No crates left here' : z ? 'Zombies are here' : '', run: () => this.search() });
    const weapons = G.hand.filter(c => ['melee', 'gun'].includes(CARDS[c.id].type));
    const seen = new Set();
    for (const w of weapons) {
      if (seen.has(w.id)) continue; seen.add(w.id);
      const d = CARDS[w.id], gun = d.type === 'gun';
      if (!gun) {
        add({ group: 'fight', key: 'fight:' + w.id + ':' + here, label: `Fight: ${d.title}`, icon: '⚔️', sub: `${d.dice}d · ${d.hit}+ · this room only`,
              reason: !z ? 'No zombies here' : '', run: () => this.fight(w.id, here) });
        continue;
      }
      // guns: this room or any connected room that has zombies
      const targets = [here, ...ADJ[here]].filter(l => this.zombiesAt(l));
      if (!targets.length) {
        add({ group: 'fight', key: 'fight:' + w.id, label: `Shoot: ${d.title}`, icon: '🔫', sub: `${d.dice}d · ${d.hit}+`, reason: 'No zombies in range', run: () => {} });
        continue;
      }
      for (const t of targets) {
        const hit = this.hitNeeded(w.id, t);
        add({ group: 'fight', key: 'fight:' + w.id + ':' + t, target: t, label: `Shoot ${t === here ? 'here' : '→ ' + LOC[t].name}`, icon: '🔫',
              sub: `${d.title} · ${d.dice}d · ${hit}+ · ${this.zombiesAt(t)} zombie(s) · 1 Ammo`,
              reason: G.ammo < 1 ? 'No Ammo' : '', run: () => this.fight(w.id, t) });
      }
    }
    add({ group: 'fight', key: 'fight:fists', label: 'Fight: bare hands', icon: '✊', sub: '1d · 6', reason: !z ? 'No zombies here' : '', run: () => this.fight(null, here) });
    const t = this.tileAction(); if (t) add({ group: 'tile', ...t });
    return list;
  }
  tileAction() {
    const G = this.G, here = G.loc, z = this.zombiesAt(here);
    const blocked = z ? 'Zombies are here' : '';
    const jonas = G.survivor === 'jonas';
    switch (here) {
      case 'dorm': return { key: 'rest', label: 'Rest', icon: '🛏️', sub: '+2 Warmth', reason: blocked || (G.warmth >= MAX_WARMTH ? 'Already warm' : ''), run: () => this.simple(() => this.warm(2, 'Rest')) };
      case 'mess': return { key: 'stove', label: 'Hot stove', icon: '🍲', sub: '+1 Warmth, heal 1', reason: blocked || (G.used.mess ? 'Used this round' : ''), run: () => this.simple(() => { G.used.mess = true; this.warm(1, 'Hot stove'); this.heal(1, 'Hot stove'); }) };
      case 'med': return { key: 'treat', label: 'Treat wounds', icon: '✚', sub: `heal ${G.survivor === 'priya' ? 3 : 2}`, reason: blocked || (G.used.med ? 'Used this round' : G.health >= MAX_HEALTH ? 'Not hurt' : ''), run: () => this.simple(() => { G.used.med = true; this.heal(2, 'Med Bay'); }) };
      case 'fuel': return { key: 'siphon', label: 'Siphon fuel', icon: '⛽', sub: `${2 - G.fuelTaken} left · +2 Noise`, reason: blocked || (G.fuelTaken >= 2 ? 'Tanks are dry' : ''), run: () => this.siphon() };
      case 'weather': return { key: 'forecast', label: 'Forecast', icon: '🌡️', sub: 'reorder top 2 Threats', reason: blocked, run: () => this.forecast() };
      case 'workshop': return { key: 'tinker', label: 'Tinker', icon: '🔧', sub: 'discard 2 → Spare Parts', reason: blocked || (G.hand.length < 2 ? 'Need 2 cards to discard' : !this.findParts() ? 'No Spare Parts left anywhere' : ''), run: () => this.tinker() };
      case 'gen': return { key: 'power', label: 'Restore Power', icon: '⚡', sub: 'spend Fuel Can + Spare Parts', reason: G.power ? 'Power is already ON' : blocked || (!this.hasCard('fuel') ? 'Need a Fuel Can' : !this.partsCard() ? 'Need Spare Parts' : ''), run: () => this.restorePower() };
      case 'radio': return { key: 'antenna', label: 'Repair Antenna', icon: '📡', cost: jonas ? 1 : 2, sub: `${jonas ? 1 : 2} Actions · needs Toolkit`, reason: G.antenna ? 'Already repaired' : blocked || (!G.power ? 'Restore Power first' : !this.hasCard('toolkit') ? 'Need a Toolkit' : ''), run: () => this.repairAntenna() };
      case 'command': return { key: 'evac', label: 'Call Evac', icon: '🖥️', sub: 'helicopter in 3 rounds', reason: G.evacRound ? `Helicopter due round ${G.evacRound}` : blocked || (!G.antenna ? 'Repair the Antenna first' : ''), run: () => this.callEvac() };
      case 'heli': return { key: 'board', label: 'Board helicopter', icon: '🚁', sub: 'escape!', reason: !G.evacRound ? 'No helicopter called' : G.round < G.evacRound ? `Lands in round ${G.evacRound}` : blocked, run: () => this.simple(() => this.end(true, 'You boarded the helicopter and lifted off into the storm.')) };
      case 'garage': return { key: 'snowcat', label: 'Escape by Snowcat', icon: '🚜', cost: jonas ? 1 : 2, sub: `${jonas ? 1 : 2} Actions · Keys + Fuel + Parts`, reason: blocked || (!this.hasCard('keys') ? 'Need Snowcat Keys' : !this.hasCard('fuel') ? 'Need a Fuel Can' : !this.partsCard() ? 'Need Spare Parts' : ''), run: () => this.snowcat() };
    }
    return null;
  }

  // ------------------------------------------------------------ actions
  async act(fn, cost = 1) {
    if (this.busy || this.G.over) return;
    this.busy = true; this.io.sync();
    try { this.G.actions -= cost; await fn(); }
    finally { this.busy = false; if (!this.G.over) this.save(); this.io.sync(); }
  }
  async run(option) { if (option.enabled) await this.act(option.run, option.cost ?? 1); }
  simple(fn) { fn(); }

  async move(to) {
    const G = this.G, from = G.loc, z = this.zombiesAt(from);
    if (z) {
      this.log(`You slip past ${z} zombie${z > 1 ? 's' : ''}: bite roll${z > 1 ? 's' : ''} (5+ wounds).`, 'bad');
      const r = await this.io.roll(z, { hit: 5, label: 'Bite rolls', bad: true });
      this.hurt(r.filter(v => v >= 5).length, 'Bites while leaving');
      if (G.over) return;
    }
    G.loc = to;
    this.log(`Moved to ${LOC[to].name}.`);
    if (LOC[to].out) {
      if (G.freeColdMove) { G.freeColdMove = false; this.log('Mara knows the ridge: no Warmth lost.', 'good'); }
      else this.chill(1, 'Outside in the storm');
    }
  }
  async search() {
    const G = this.G; G.crates[G.loc]--;
    this.addNoise(G.loc === 'storage' ? 2 : 1);
    this.log(`Searched the ${LOC[G.loc].name}.`);
    if (G.loc === 'viro') await this.draw(2, { keep: 1 });
    else if (G.loc === 'storage') await this.draw(2);
    else await this.draw(1);
  }
  hitNeeded(weaponId, target) {
    const d = CARDS[weaponId];
    const ranged = target !== this.G.loc && !d.scoped;
    return Math.min(6, d.hit + (ranged ? 1 : 0));
  }
  async fight(weaponId, target) {
    const G = this.G;
    target = target || G.loc;
    const d = weaponId ? CARDS[weaponId] : { title: 'Bare hands', type: 'melee', dice: 1, hit: 6, noise: 0 };
    const gun = d.type === 'gun';
    const hit = gun ? this.hitNeeded(weaponId, target) : d.hit;
    if (gun) G.ammo--;
    let noise = d.noise; if (gun && G.survivor === 'tuck') noise = 1;
    this.addNoise(noise);
    const where = target === G.loc ? '' : ` into the ${LOC[target].name}`;
    const r = await this.io.roll(d.dice, { hit, label: d.title + (where ? ' →' + where.replace(' into the', '') : ''), bite: !gun });
    const hits = Math.min(r.filter(v => v >= hit).length, this.zombiesAt(target));
    for (let i = 0; i < hits; i++) { const k = G.zombies.findIndex(z => z.loc === target); G.zombies.splice(k, 1); }
    G.kills += hits;
    this.log(`${d.title}${where}: rolled ${r.join(', ')} (${hit}+) → ${hits} kill${hits === 1 ? '' : 's'}.`, hits ? 'good' : '');
    if (!gun) { const ones = r.filter(v => v === 1).length; if (ones) this.hurt(ones, 'Bitten during the struggle'); }
  }
  async siphon() {
    const G = this.G; G.fuelTaken++; this.addNoise(2);
    const c = { uid: G.nextUid++, id: 'fuel' }; G.hand.push(c);
    this.log('Siphoned a Fuel Can (+2 Noise).', 'good');
    this.io.sync(); await this.enforceHandLimit();
  }
  async forecast() {
    const G = this.G;
    if (G.threat.length < 2) this.reshuffleThreats();
    const top = G.threat.slice(0, 2);
    const order = await this.io.forecast(top);
    G.threat.splice(0, 2, ...order);
    this.log('Checked the forecast and reordered the next Threats.');
  }
  findParts() { return this.G.supply.find(c => c.id === 'parts') || this.G.supplyDiscard.find(c => c.id === 'parts'); }
  async tinker() {
    const G = this.G;
    const chosen = await this.io.choose({ title: 'Tinker: discard 2 cards to make Spare Parts', cards: G.hand, pick: 2, confirm: 'Discard & build', cancel: true });
    if (!chosen) { G.actions++; return; }
    for (const u of chosen) this.discardCard(u);
    const p = this.findParts();
    for (const pile of [G.supply, G.supplyDiscard]) { const i = pile.indexOf(p); if (i >= 0) pile.splice(i, 1); }
    G.hand.push(p); this.log('Tinkered together some Spare Parts.', 'good');
  }
  restorePower() {
    const G = this.G;
    this.discardCard(this.hasCard('fuel').uid); this.discardCard(this.partsCard().uid);
    G.power = true; this.log('⚡ POWER RESTORED. The station hums back to life.', 'goal');
  }
  repairAntenna() { this.G.antenna = true; this.log('📡 ANTENNA REPAIRED. The radio crackles.', 'goal'); }
  callEvac() { this.G.evacRound = this.G.round + 3; this.log(`🚁 EVAC CALLED. The helicopter will land in round ${this.G.evacRound}. Get to the Helipad!`, 'goal'); }
  snowcat() {
    this.discardCard(this.hasCard('fuel').uid); this.discardCard(this.partsCard().uid);
    this.end(true, 'The Snowcat roars to life and you plow down the mountain.');
  }
  async useCard(uid) { // free action: consumables
    const G = this.G, c = G.hand.find(x => x.uid === uid); if (!c || this.busy || G.over || G.phase !== 'player') return;
    const u = CARDS[c.id].use; if (!u) return;
    this.discardCard(uid);
    if (u.heal) this.heal(u.heal, CARDS[c.id].title);
    if (u.warmth) this.warm(u.warmth, CARDS[c.id].title);
    if (u.ammo) { G.ammo = clamp(G.ammo + u.ammo, 0, MAX_AMMO); this.log(`${CARDS[c.id].title}: Ammo is now ${G.ammo}.`, 'good'); }
    if (u.actions) { G.actions += u.actions; this.log(`${CARDS[c.id].title}: +1 Action.`, 'good'); }
    this.save(); this.io.sync();
  }
  canUse(uid) {
    const G = this.G, c = G?.hand.find(x => x.uid === uid);
    if (!c || !CARDS[c.id].use || G.over || G.phase !== 'player' || this.busy) return false;
    const u = CARDS[c.id].use;
    if (u.heal && G.health >= MAX_HEALTH) return false;
    if (u.warmth && G.warmth >= MAX_WARMTH) return false;
    if (u.ammo && G.ammo >= MAX_AMMO) return false;
    return true;
  }
  manualDiscard(uid) {
    if (this.busy || this.G.over || this.G.phase !== 'player') return;
    const c = this.discardCard(uid); if (c) { this.log(`Discarded ${CARDS[c.id].title}.`); this.save(); this.io.sync(); }
  }

  // ------------------------------------------------------------ threat phase
  reshuffleThreats() {
    const G = this.G; G.threat.push(...shuffle(G.threatDiscard)); G.threatDiscard = [];
    this.log('Threat deck reshuffled.', 'sys');
  }
  moveZombies(range, label) {
    const G = this.G, d = this.dist(G.loc);
    let moved = 0;
    for (const z of G.zombies) {
      const dz = d[z.loc];
      if (dz === 0 || dz > range) continue;
      const opts = ADJ[z.loc].filter(n => d[n] === dz - 1);
      z.loc = pickRandom(opts); moved++;
    }
    if (moved) this.log(`${label}: ${moved} zombie${moved > 1 ? 's' : ''} shuffle${moved > 1 ? '' : 's'} closer.`, 'bad');
  }
  async endRound() {
    const G = this.G; if (this.busy || G.over || G.phase !== 'player') return;
    this.busy = true; G.phase = 'threat'; this.io.sync();
    try {
      this.log(`— Threat phase, round ${G.round} —`, 'sys');
      // 1. threat card
      if (!G.threat.length) this.reshuffleThreats();
      const card = G.threat.shift(); G.threatDiscard.push(card); G.lastThreat = card.id;
      const before = G.zombies.length;
      this.resolveThreat(card.id);
      this.io.sync();
      await this.io.show({ face: 't:' + card.id, title: 'Threat', note: G.zombies.length > before ? `${G.zombies.length - before} new zombie(s)` : '' });
      if (G.over) return;
      // 2. noise draws them in
      await this.io.pause(250);
      if (G.noise) this.moveZombies(G.noise, `Noise ${G.noise}`);
      else this.log('You kept quiet: the zombies don\'t notice you.', 'good');
      this.io.sync(); await this.io.pause(700);
      // 3. attacks
      const z = this.zombiesAt(G.loc);
      if (z) {
        this.log(`${z} zombie${z > 1 ? 's' : ''} attack${z > 1 ? '' : 's'}! (4+ wounds)`, 'bad');
        const r = await this.io.roll(z, { hit: 4, label: 'Zombie attacks', bad: true });
        const w = r.filter(v => v >= 4).length;
        if (w) this.hurt(w, 'Zombie attack'); else this.log('Every bite misses!', 'good');
        if (G.over) return;
      }
      // 4. cold
      if (LOC[G.loc].out) { this.chill(1, 'Night cold outdoors'); if (G.over) return; }
      // 5. cleanup
      G.noise = Math.max(0, G.noise - 2);
      G.storm += 1;
      if (G.storm > G.stormMax) { this.end(false, 'The storm buried Kessel Ridge. Nobody is coming now.'); return; }
      G.round += 1; G.actions = ACTIONS; G.used = {}; G.freeColdMove = G.survivor === 'mara';
      if (G.evacRound && G.round === G.evacRound) this.log('🚁 The helicopter has LANDED on the Helipad! Board it!', 'goal');
      else if (G.evacRound && G.round < G.evacRound) this.log(`Helicopter lands in ${G.evacRound - G.round} round(s).`, 'goal');
      if (G.storm === G.stormMax) this.log('⚠ Final round: the storm hits its peak at the end of this round.', 'bad');
      this.log(`— Round ${G.round}: ${G.actions} Actions —`, 'sys');
    } finally {
      G.phase = 'player'; this.busy = false;
      if (!G.over) this.save();
      this.io.sync();
    }
  }
  resolveThreat(id) {
    const G = this.G;
    this.log(`Threat: ${THREATS[id].title}.`, 'bad');
    const d = this.dist(G.loc);
    switch (id) {
      case 'breach': this.spawn('viro'); this.spawn('viro'); break;
      case 'pack': this.spawn('storage'); this.spawn('mess'); break;
      case 'frozen': this.spawn('fuel'); this.spawn('garage'); break;
      case 'groans': this.spawn('dorm'); this.spawn('med'); break;
      case 'hungry': this.moveZombies(99, 'Hungry'); break;
      case 'gust': G.storm += 1; this.log('The storm surges: Storm track +1.', 'bad');
        if (G.storm > G.stormMax) this.end(false, 'The storm buried Kessel Ridge. Nobody is coming now.'); break;
      case 'cold': this.chill(LOC[G.loc].out ? 2 : 1, 'Biting cold'); break;
      case 'calm': G.noise = 0; this.log('An eerie calm. Noise drops to 0.', 'good'); break;
      case 'flicker': if (!G.power) { this.spawn('command'); this.spawn('dorm'); } else this.log('The lights hold steady. Power is ON.', 'good'); break;
      case 'drawn': {
        const n = Math.ceil(G.noise / 2);
        if (!n) this.log('You were quiet. Nothing comes.', 'good');
        for (let i = 0; i < n; i++) this.spawn(pickRandom(ADJ[G.loc]));
        break;
      }
      case 'lurker': {
        let ring = Object.keys(d).filter(k => d[k] === 2);
        if (!ring.length) ring = Object.keys(d).filter(k => d[k] > 0);
        this.spawn(pickRandom(ring)); break;
      }
    }
  }
}
