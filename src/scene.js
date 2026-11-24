// 3D table: builds the scene once, then sync(G) moves pieces to match the game state.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { LOCS, LOC, EDGES, ADJ, CARDS } from './data.js';
import { cardCanvas, backCanvas, tileCanvas, matCanvas, playerMatCanvas, stormCanvas, stormSpaceU,
         footprintCanvas, dieFace, tokenCanvas, badgeCanvas, setSnowImage, TRACKS } from './art.js';
import { ASSETS, MODELS } from './assets.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function createScene(canvas, { onPick, onDblPick }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const MAXANISO = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1a1410');
  const overlay = new THREE.Scene();            // floating labels, drawn on top after post-processing
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.maxPolarAngle = 1.42; controls.minDistance = 3; controls.maxDistance = 55;
  controls.screenSpacePanning = false;

  // ---------- lighting: cabin HDRI for ambient + reflections, a warm hanging lamp, cool window light
  const hemi = new THREE.HemisphereLight('#cfe2ff', '#3a2a1a', 0.9); scene.add(hemi);   // dimmed once the HDRI loads
  const lampLight = new THREE.SpotLight('#ffd6a8', 1400, 0, 0.62, 0.75, 2);
  lampLight.position.set(0, 27, 4); lampLight.target.position.set(0, 0, 1.5);
  lampLight.castShadow = true; lampLight.shadow.mapSize.set(4096, 4096); lampLight.shadow.bias = -0.00015;
  lampLight.shadow.camera.near = 10; lampLight.shadow.camera.far = 45; lampLight.shadow.radius = 4;
  scene.add(lampLight, lampLight.target);
  const windowLight = new THREE.DirectionalLight('#a9cbff', 0.7); windowLight.position.set(-25, 14, -12); scene.add(windowLight);
  const lamp = new THREE.PointLight('#ffb070', 18, 30, 1.6); lamp.position.set(-6, 8, 10); scene.add(lamp);   // brightens when Power is ON

  const pmrem = new THREE.PMREMGenerator(renderer);
  new RGBELoader().load(ASSETS.cabinHdr, hdr => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const env = pmrem.fromEquirectangular(hdr).texture; hdr.dispose();
    scene.environment = env; scene.environmentIntensity = 0.55;
    scene.background = env; scene.backgroundBlurriness = 0.35; scene.backgroundIntensity = 0.3;
    scene.backgroundRotation.y = 1.2; scene.environmentRotation.y = 1.2;
    hemi.intensity = 0.15;
  });

  const tex = (cv, repeat) => {
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAXANISO;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
    return t;
  };
  const loader = new THREE.TextureLoader();
  const img = (url, { srgb = false, repeat = [1, 1] } = {}) => {
    const t = loader.load(url); t.anisotropy = MAXANISO;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const topFaced = (geo, top, side) => new THREE.Mesh(geo, [side, side, top, side, side, side]);
  const std = (o) => new THREE.MeshStandardMaterial(o);

  // ---------- static table: worn wooden tabletop
  const woodTop = std({ map: img(ASSETS.woodDiff, { srgb: true, repeat: [3, 2] }), normalMap: img(ASSETS.woodNor, { repeat: [3, 2] }),
                        roughnessMap: img(ASSETS.woodRough, { repeat: [3, 2] }), roughness: 1, normalScale: new THREE.Vector2(0.8, 0.8) });
  const woodSide = std({ map: img(ASSETS.woodDiff, { srgb: true, repeat: [3, 0.06] }), roughness: 0.7, color: '#c9b39a' });
  const table = topFaced(new THREE.BoxGeometry(56, 1.2, 40), woodTop, woodSide);
  table.position.y = -0.6; table.receiveShadow = true; scene.add(table);
  // leather grain for the printed mats
  const leatherNor = img(ASSETS.leatherNor, { repeat: [7, 5] }), leatherRough = img(ASSETS.leatherRough, { repeat: [7, 5] });
  const mat = topFaced(new THREE.BoxGeometry(23, 0.08, 16.5),
    std({ map: tex(matCanvas()), normalMap: leatherNor, normalScale: new THREE.Vector2(0.5, 0.5), roughnessMap: leatherRough, roughness: 1 }),
    std({ color: '#0e1217', roughness: 0.6 }));
  mat.position.set(0, 0.04, -1.2); mat.receiveShadow = true; scene.add(mat);

  // snow textures for outdoor tiles and paths
  const snowNor = img(ASSETS.snowNor, { repeat: [1, 1] });
  const snowSide = std({ map: img(ASSETS.snowDiff, { srgb: true, repeat: [2, 0.15] }), normalMap: img(ASSETS.snowNor, { repeat: [2, 0.15] }), roughness: 0.8 });
  const snowImage = new Image();

  const pickables = [];
  const BASE_Y = 0.08;
  const footTex = tex(footprintCanvas());
  for (const [a, b] of EDGES) {
    const A = LOC[a], B = LOC[b], out = A.out || B.out;
    const dx = B.x - A.x, dz = B.z - A.z, len = Math.hypot(dx, dz);
    let m;
    if (out) {
      const t = footTex.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(len / 1.4, 1); t.needsUpdate = true;
      const n = snowNor.clone(); n.repeat.set(len / 2, 0.3); n.needsUpdate = true;
      m = std({ map: t, normalMap: n, roughness: 0.85 });
    }
    else m = std({ color: '#59606b', roughness: 0.6, normalMap: leatherNor, normalScale: new THREE.Vector2(0.3, 0.3) });
    const path = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, out ? 0.55 : 0.75), m);
    path.position.set((A.x + B.x) / 2, BASE_Y + 0.015, (A.z + B.z) / 2);
    path.rotation.y = -Math.atan2(dz, dx); path.receiveShadow = true; scene.add(path);
  }

  const TILE = { w: 3.3, h: 2.27, t: 0.14 };
  const TILE_TOP = BASE_Y + TILE.t + 0.03;
  const tiles = {};
  const crateMeshes = {};
  const crateMat = std({ color: '#e0a83a', roughness: 0.5, emissive: '#3a2400' }), crateGeo = new THREE.BoxGeometry(0.28, 0.22, 0.28);
  for (const l of LOCS) {
    const top = std({ map: tex(tileCanvas(l)), roughness: l.out ? 0.75 : 0.85, ...(l.out ? { normalMap: snowNor, normalScale: new THREE.Vector2(0.6, 0.6) } : {}) });
    const m = topFaced(new THREE.BoxGeometry(TILE.w, TILE.t, TILE.h), top, l.out ? snowSide : std({ color: '#7b7466', roughness: 0.9 }));
    m.position.set(l.x, BASE_Y + TILE.t / 2 + 0.03, l.z); m.castShadow = m.receiveShadow = true;
    m.userData = { kind: 'tile', loc: l, hoverMat: top };
    scene.add(m); pickables.push(m); tiles[l.id] = m;
    crateMeshes[l.id] = [];
    for (let i = 0; i < l.crates; i++) {
      const c = new THREE.Mesh(crateGeo, crateMat);
      c.position.set(l.x - TILE.w / 2 + 0.3 + i * 0.36, TILE_TOP + 0.11, l.z - 0.02);   // left edge, above the ability panel
      c.rotation.y = (i - 1) * 0.15; c.castShadow = true; scene.add(c); crateMeshes[l.id].push(c);
    }
  }
  // once the snow photo has loaded, repaint the outdoor tiles with it
  snowImage.onload = () => {
    setSnowImage(snowImage);
    for (const l of LOCS) if (l.out) { const t = tiles[l.id].userData.hoverMat; t.map.dispose(); t.map = tex(tileCanvas(l)); t.needsUpdate = true; }
  };
  snowImage.src = ASSETS.snowDiff;

  // ---------- figures
  function figure(color, zombie) {
    const g = new THREE.Group();
    const mt = std({ color, roughness: 0.55, metalness: 0.05 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.07, 28), std({ color: zombie ? '#1d2318' : '#15181c', roughness: 0.4 }));
    base.position.y = 0.035; g.add(base);
    const body = new THREE.Mesh(new THREE.LatheGeometry(
      [[0, 0], [0.2, 0], [0.19, 0.08], [0.13, 0.3], [0.15, 0.48], [0.09, 0.56], [0, 0.58]].map(([x, y]) => new THREE.Vector2(x, y)), 24), mt);
    body.position.y = 0.07; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 16), mt);
    head.position.set(0, 0.74, zombie ? 0.05 : 0); g.add(head);
    if (zombie) {
      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.26, 4, 8), mt);
        arm.rotation.x = Math.PI / 2 - 0.15; arm.position.set(0.11 * s, 0.55, 0.18); g.add(arm);
      }
      body.rotation.x = 0.12;
    } else {
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.1), std({ color: '#2d3a4a' }));
      pack.position.set(0, 0.48, -0.15); g.add(pack);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.03, 8, 40), std({ color: '#ffb347', emissive: '#ff8a00', emissiveIntensity: 0.8 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; g.add(ring); g.userData.ring = ring;
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.userData.kind = zombie ? 'zombie' : survivorKind;
    if (models[g.userData.kind]) dress(g);
    return g;
  }
  let survivorKind = null;   // which survivor model figure() should use for a non-zombie

  // ---------- painted miniatures (Meshy GLBs). Pieces start as simple shapes and are swapped once loaded.
  const models = {};
  const MODEL_SIZE = { zombie: { h: 1.0 }, mara: { h: 1.0 }, jonas: { h: 1.0 }, priya: { h: 1.0 }, tuck: { h: 1.0 }, snowcat: { len: 1.35 }, helicopter: { len: 2.7 } };
  function normalize(root, size) {
    root.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(root), s = box.getSize(new THREE.Vector3());
    root.scale.multiplyScalar(size.h ? size.h / s.y : size.len / Math.max(s.x, s.z));
    root.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(root); const c = box.getCenter(new THREE.Vector3());
    root.position.x -= c.x; root.position.z -= c.z; root.position.y -= box.min.y;
    root.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      for (const m of [].concat(o.material)) { m.metalness = 0; m.roughness = 0.62; m.envMapIntensity = 0.8; }
    });
    const wrap = new THREE.Group(); wrap.add(root); return wrap;
  }
  function dress(g) {   // replace a figure's simple shapes with its painted model
    const tpl = models[g.userData.kind]; if (!tpl || g.userData.dressed) return;
    const ring = g.userData.ring;
    g.clear(); g.add(tpl.clone());
    if (ring) g.add(ring);
    g.userData.dressed = true;
  }
  const gltf = new GLTFLoader();
  for (const [name, url] of Object.entries(MODELS)) {
    gltf.load(url, res => {
      models[name] = normalize(res.scene, MODEL_SIZE[name]);
      if (name === 'zombie') { for (const f of zombieFigs.values()) dress(f); }
      else if (name === 'snowcat') placeSnowcat();
      else if (name === 'helicopter') { heli.clear(); heli.add(models.helicopter.clone()); heli.userData.rotor = null; }
      else if (survivorFig && survivorFig.userData.kind === name) dress(survivorFig);
    }, undefined, err => console.warn('model failed', name, err));
  }
  function placeSnowcat() {
    const s = models.snowcat.clone(); const l = LOC.garage;
    s.scale.setScalar(0.85); s.position.set(l.x + 1.05, TILE_TOP, l.z - 0.62); s.rotation.y = -0.25; scene.add(s);
  }
  const SURV_COL = { mara: '#ff8a2a', jonas: '#f2c230', priya: '#3fb6c9', tuck: '#4b6fd6' };
  let survivorFig = null, survivorId = null;
  const zombieFigs = new Map();
  // zombie spots: kept in the art area, clear of the ability panel (bottom third) and the crates (left edge)
  const SLOTS = [[0.7, -0.25], [-0.55, -0.45], [0.65, 0.15], [-0.1, -0.55], [1.25, 0.05], [0.3, -0.6], [-0.95, -0.55], [-0.4, 0.12], [0.32, 0.2]];
  const slotPos = (loc, i) => { const l = LOC[loc], [ox, oz] = SLOTS[i % SLOTS.length]; const lift = Math.floor(i / SLOTS.length) * 0.15; return new THREE.Vector3(l.x + ox + lift, TILE_TOP, l.z + oz - lift); };

  // ---------- cards
  const CARD = { w: 1.6, h: 2.24, t: 0.02 };
  const edgeMat = std({ color: '#e8e2d4', roughness: 0.9 });
  function cardMesh(faceCv, backCv) {
    const front = std({ map: tex(faceCv), roughness: 0.55 });
    const back = std({ map: tex(backCv), roughness: 0.55 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(CARD.w, CARD.t, CARD.h), [edgeMat, edgeMat, front, back, edgeMat, edgeMat]);
    m.castShadow = m.receiveShadow = true; m.userData.hoverMat = front;
    return m;
  }
  const supplyBack = backCanvas('supply'), threatBack = backCanvas('threat');
  const backMat = { supply: std({ map: tex(supplyBack), roughness: 0.55 }), threat: std({ map: tex(threatBack), roughness: 0.55 }) };
  const deckGeo = new THREE.BoxGeometry(CARD.w, CARD.t, CARD.h);
  function makeDeck(kind, x, z, label) {
    const grp = new THREE.Group(); grp.position.set(x, 0, z); scene.add(grp);
    const topCard = new THREE.Mesh(deckGeo, [edgeMat, edgeMat, backMat[kind].clone(), backMat[kind], edgeMat, edgeMat]);
    topCard.castShadow = true; topCard.userData = { kind: 'deck', label, deck: kind, hoverMat: topCard.material[2] };
    pickables.push(topCard);
    return { grp, topCard, n: -1 };
  }
  const decks = {
    supply: makeDeck('supply', 13.4, 1.0, 'Supply deck'),
    threat: makeDeck('threat', 13.4, -3.4, 'Threat deck'),
    supplyDiscard: null,
  };
  function setDeckCount(d, n) {
    if (d.n === n) return; d.n = n;
    d.grp.clear();
    const show = Math.min(n, 30);
    for (let i = 0; i < show; i++) {
      const m = i === show - 1 ? d.topCard : new THREE.Mesh(deckGeo, [edgeMat, edgeMat, edgeMat, edgeMat, edgeMat, edgeMat]);
      m.position.set(Math.sin(i * 7.1) * 0.02, BASE_Y + i * (CARD.t + 0.004), Math.cos(i * 3.3) * 0.02);
      m.rotation.y = Math.sin(i * 5.7) * 0.015; m.castShadow = i === show - 1;
      d.grp.add(m);
    }
    d.topCard.userData.count = n;
  }
  // face-up threat discard and supply discard
  let lastThreatMesh = null, lastThreatId = undefined;
  let discardMesh = null, discardKey = undefined;
  const labelSprite = (text, x, z) => {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64; const c = cv.getContext('2d');
    c.font = 'bold 34px "Segoe UI",sans-serif'; c.fillStyle = '#e9e2d0cc'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 256, 32);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.4), new THREE.MeshBasicMaterial({ map: tex(cv), transparent: true }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.01, z); scene.add(m);
  };
  labelSprite('SUPPLY', 13.4, 2.55); labelSprite('DISCARD', 15.6, 2.55); labelSprite('THREAT', 13.4, -1.85); labelSprite('LAST THREAT', 15.6, -1.85);

  // ---------- storm track
  let stormLen = 12, stormMarkerTargetX = 0;
  const stormTop = std({ map: tex(stormCanvas(12)) });
  const storm = topFaced(new THREE.BoxGeometry(11.2, 0.05, 1.0), stormTop, std({ color: '#10161d' }));
  storm.position.set(0, BASE_Y + 0.025, -8.75); storm.receiveShadow = true; scene.add(storm);
  const stormMarker = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 24), std({ color: '#dfefff', roughness: 0.3 }));
  stormMarker.position.set(0, BASE_Y + 0.14, -8.75); stormMarker.castShadow = true; scene.add(stormMarker);
  const stormX = i => -5.6 + stormSpaceU(i, stormLen) * 11.2;

  // ---------- objective tokens
  // big round markers on a stand, tilted toward the player so they read from the table edge
  function token(icon, bg, label, x, z) {
    const top = std({ map: tex(tokenCanvas(icon, bg, label)), roughness: 0.5 });
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.45, 12), std({ color: '#30363e', metalness: 0.4 }));
    post.position.y = 0.22; g.add(post);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.07, 40), [std({ color: '#ddd' }), top, std({ color: '#222' })]);
    m.position.y = 0.55; m.rotation.x = 0.9; m.castShadow = true; g.add(m);
    g.position.set(x, TILE_TOP, z); scene.add(g);
    m.userData.group = g; return m;
  }
  const tokPower = token('⚡', '#444', 'OFF', LOC.gen.x + 1.3, LOC.gen.z - 0.58);
  const tokAntenna = token('📡', '#444', 'BROKEN', LOC.radio.x + 1.3, LOC.radio.z - 0.58);
  const tokEvac = token('🚁', '#444', 'NO CALL', LOC.command.x + 1.3, LOC.command.z - 0.58);

  // floating labels above every tile
  const badges = {};
  let labelsOn = true;
  for (const l of LOCS) {
    const sm = new THREE.SpriteMaterial({ depthTest: false, transparent: true, toneMapped: false });
    const s = new THREE.Sprite(sm); s.renderOrder = 20;
    s.position.set(l.x, TILE_TOP + 1.9, l.z - 0.6); s.scale.set(4.2, 1.25, 1);
    s.userData.key = ''; overlay.add(s); badges[l.id] = s;
  }
  function badgeItems(G, id) {
    const items = [], z = G.zombies.filter(q => q.loc === id).length;
    if (G.loc === id) items.push({ icon: '🧍', text: 'YOU', col: '#ffb347' });
    if (z) items.push({ icon: '🧟', text: z, col: '#ff6b5b' });
    if (G.crates[id]) items.push({ icon: '📦', text: G.crates[id], col: '#ffcf5a' });
    if (id === 'gen') items.push({ icon: '⚡', text: G.power ? 'ON' : 'OFF', col: G.power ? '#7fd18b' : '#9aa6b4' });
    if (id === 'radio') items.push({ icon: '📡', text: G.antenna ? 'FIXED' : 'BROKEN', col: G.antenna ? '#7fd18b' : '#9aa6b4' });
    if (id === 'command') items.push({ icon: '📞', text: G.evacRound ? 'CALLED' : 'NO CALL', col: G.evacRound ? '#7fd18b' : '#9aa6b4' });
    if (id === 'heli' && G.evacRound) items.push({ icon: '🚁', text: G.round >= G.evacRound ? 'LANDED' : `R${G.evacRound}`, col: '#ffd75e' });
    if (id === 'fuel') items.push({ icon: '⛽', text: 2 - G.fuelTaken, col: '#8fc9ff' });
    return items;
  }
  function inRange(G, id) {
    if (!G.zombies.some(q => q.loc === id) || G.ammo < 1) return false;
    if (id !== G.loc && !ADJ[G.loc].includes(id)) return false;
    return G.hand.some(c => CARDS[c.id].type === 'gun');
  }
  function syncBadges(G) {
    for (const l of LOCS) {
      const s = badges[l.id], items = badgeItems(G, l.id), alert = inRange(G, l.id) && G.phase === 'player' && !G.over;
      if (alert) items.push({ icon: '🎯', text: 'IN RANGE', col: '#ff8a7a' });
      const key = l.name + JSON.stringify(items) + alert;
      if (s.userData.key !== key) {
        s.userData.key = key; s.material.map?.dispose();
        s.material.map = tex(badgeCanvas(l.name, items, alert)); s.material.needsUpdate = true;
      }
      s.visible = labelsOn;
    }
  }
  const setToken = (m, icon, bg, label) => { m.material[1].map.dispose(); m.material[1].map = tex(tokenCanvas(icon, bg, label)); m.material[1].needsUpdate = true; };
  const tokState = {};

  // helicopter (simple model) on helipad, shown once landed
  const heli = new THREE.Group();
  {
    const red = std({ color: '#c0392b', roughness: 0.4 }), dark = std({ color: '#222', roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), red); body.scale.set(1.5, 0.9, 0.9); body.position.y = 0.6; heli.add(body);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.4, 12), red); tail.rotation.z = Math.PI / 2; tail.position.set(-1.2, 0.7, 0); heli.add(tail);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), std({ color: '#9fd3ff', roughness: 0.1, metalness: 0.3 })); glass.position.set(0.45, 0.68, 0); heli.add(glass);
    for (const s of [-1, 1]) { const sk = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.05), dark); sk.position.set(0, 0.1, 0.35 * s); heli.add(sk); }
    const rotor = new THREE.Group(); rotor.position.y = 1.05;
    for (const a of [0, Math.PI / 2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.02, 0.1), dark); b.rotation.y = a; rotor.add(b); }
    heli.add(rotor); heli.userData.rotor = rotor;
    heli.position.set(LOC.heli.x + 0.3, TILE_TOP, LOC.heli.z - 0.1); heli.rotation.y = 0.4;
    heli.traverse(o => { if (o.isMesh) o.castShadow = true; });
    heli.visible = false; scene.add(heli);
  }

  // ---------- player mat
  const PM = { cx: -1.5, cz: 10.6, w: 9, h: 4.5 };
  const pmatNor = leatherNor.clone(); pmatNor.repeat.set(3, 1.5); pmatNor.needsUpdate = true;
  const pmat = topFaced(new THREE.BoxGeometry(PM.w, 0.05, PM.h),
    std({ map: tex(playerMatCanvas()), normalMap: pmatNor, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.8 }), std({ color: '#191d23' }));
  pmat.position.set(PM.cx, 0.025, PM.cz); pmat.receiveShadow = true; scene.add(pmat);
  const matXY = (cx, cy) => [PM.cx - PM.w / 2 + cx / 1600 * PM.w, PM.cz - PM.h / 2 + cy / 800 * PM.h];
  let survCard = null;
  const cubes = {};
  const cubeGeo = new THREE.BoxGeometry(0.34, 0.34, 0.34);
  TRACKS.forEach((t, i) => {
    const cube = new THREE.Mesh(cubeGeo, std({ color: t.col, roughness: 0.35 }));
    cube.castShadow = true; cube.userData.row = i; cube.position.set(...[matXY(620, 155 + i * 160)].map(([x, z]) => [x, 0.22, z])[0]);
    scene.add(cube); cubes[t.key] = cube;
  });

  // ---------- hand (backpack) cards
  let handMeshes = [], handKey = '';
  function setHand(hand) {
    const key = hand.map(c => c.uid).join(',');
    if (key === handKey) return; handKey = key;
    for (const m of handMeshes) { scene.remove(m); pickables.splice(pickables.indexOf(m), 1); }
    handMeshes = hand.map((c, i) => {
      const m = cardMesh(cardCanvas('s:' + c.id), supplyBack);
      m.position.set(4.3 + i * 1.8, 0.05 + i * 0.002, 10.6 + (i % 2) * 0.12);
      m.rotation.y = (i - 2) * -0.03;
      m.userData = { ...m.userData, kind: 'card', face: 's:' + c.id, uid: c.uid };
      scene.add(m); pickables.push(m); return m;
    });
  }

  // ---------- dice
  const diceMats = [1, 6, 2, 5, 3, 4].map(n => new THREE.MeshPhysicalMaterial({ map: tex(dieFace(n)), roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15 }));
  const badDiceMats = [1, 6, 2, 5, 3, 4].map(n => new THREE.MeshPhysicalMaterial({ map: tex(dieFace(n)), roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15, color: '#ffc9c9' }));
  const DIE_UP = { 2: [0, 0, 0], 5: [Math.PI, 0, 0], 1: [0, 0, Math.PI / 2], 6: [0, 0, -Math.PI / 2], 3: [-Math.PI / 2, 0, 0], 4: [Math.PI / 2, 0, 0] };
  let dice = [];
  const DICE_AREA = { x: -8.6, z: 10.4 };
  function clearDice() { for (const d of dice) scene.remove(d.mesh); dice = []; }
  function rollDice(values, { bad } = {}) {
    clearDice();
    return new Promise(res => {
      const n = values.length, cols = Math.min(n, 3);
      values.forEach((v, i) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), bad ? badDiceMats : diceMats);
        mesh.castShadow = true;
        const tx = DICE_AREA.x + ((i % cols) - (cols - 1) / 2) * 0.85, tz = DICE_AREA.z + Math.floor(i / cols) * 0.85 - 0.4;
        const yaw = (Math.random() - 0.5) * 0.6;
        const final = new THREE.Euler(...DIE_UP[v]);
        const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiply(new THREE.Quaternion().setFromEuler(final));
        const spin = new THREE.Vector3(Math.random() * 14 + 8, Math.random() * 6, Math.random() * 14 + 8);
        mesh.position.set(tx + 2.5, 3, tz - 2); scene.add(mesh);
        dice.push({ mesh, t: -i * 0.06, from: mesh.position.clone(), to: new THREE.Vector3(tx, 0.275, tz), q1, spin, value: v });
      });
      diceDone = res;
    });
  }
  let diceDone = null;
  function animateDice(dt) {
    if (!dice.length || !diceDone) return;
    let all = true;
    for (const d of dice) {
      d.t += dt / 0.9; const t = Math.max(0, Math.min(d.t, 1));
      if (t < 1) all = false;
      const p = d.from.clone().lerp(d.to, 1 - Math.pow(1 - t, 3));
      p.y = d.to.y + Math.abs(Math.cos(t * Math.PI * 2.5)) * (1 - t) * 2.5;
      d.mesh.position.copy(p);
      if (t < 0.85) d.mesh.rotation.set(d.spin.x * t, d.spin.y * t, d.spin.z * t);
      else d.mesh.quaternion.slerp(d.q1, Math.min(1, (t - 0.85) / 0.15 + 0.2));
      if (t >= 1) d.mesh.quaternion.copy(d.q1);
    }
    if (all) { const r = diceDone; diceDone = null; r(); }
  }

  // ---------- highlights
  const HL = { here: 0x3a2a10, move: 0x0c2c46, hover: 0x2a2418 };
  let hovered = null, highlights = {};
  function applyHL() {
    for (const [id, m] of Object.entries(tiles)) m.userData.hoverMat.emissive.setHex(highlights[id] || 0);
    if (hovered) hovered.userData.hoverMat.emissive.setHex(HL.hover + (highlights[hovered.userData.loc?.id] ? 0x101010 : 0));
  }

  // ---------- sync from game state
  function sync(G) {
    if (!G) return;
    // survivor
    if (survivorId !== G.survivor) {
      if (survivorFig) scene.remove(survivorFig);
      survivorKind = G.survivor;
      survivorFig = figure(SURV_COL[G.survivor], false); survivorId = G.survivor;
      const l = LOC[G.loc]; survivorFig.position.set(l.x, TILE_TOP, l.z - 0.05); scene.add(survivorFig);
      if (survCard) { scene.remove(survCard); pickables.splice(pickables.indexOf(survCard), 1); }
      survCard = cardMesh(cardCanvas('v:' + G.survivor), supplyBack); survCard.scale.set(1.45, 1, 1.45);
      const [x, z] = matXY(290, 400); survCard.position.set(x, 0.06, z);
      survCard.userData = { ...survCard.userData, kind: 'card', face: 'v:' + G.survivor };
      scene.add(survCard); pickables.push(survCard);
    }
    survivorFig.userData.target = new THREE.Vector3(LOC[G.loc].x, TILE_TOP, LOC[G.loc].z - 0.05);
    // zombies
    const live = new Set(G.zombies.map(z => z.uid));
    for (const [uid, fig] of zombieFigs) if (!live.has(uid)) { fig.userData.dying = 0; zombieFigs.delete(uid); dyingFigs.push(fig); }
    const perTile = {};
    for (const z of G.zombies) {
      let fig = zombieFigs.get(z.uid);
      const i = perTile[z.loc] = (perTile[z.loc] ?? -1) + 1;
      const target = slotPos(z.loc, i);
      if (!fig) {
        fig = figure('#6f8a5a', true); zombieFigs.set(z.uid, fig);
        fig.position.copy(target).add(new THREE.Vector3(0, 2.5, 0)); fig.scale.setScalar(0.01); scene.add(fig);
      }
      fig.userData.target = target;
    }
    // crates
    for (const l of LOCS) crateMeshes[l.id].forEach((c, i) => c.visible = i < G.crates[l.id]);
    // tracks
    TRACKS.forEach((t, i) => { const [x, z] = matXY(620 + Math.max(0, G[t.key]) * 130, 155 + i * 160); cubes[t.key].userData.target = new THREE.Vector3(x, 0.22, z); });
    // storm
    if (stormLen !== G.stormMax) { stormLen = G.stormMax; stormTop.map.dispose(); stormTop.map = tex(stormCanvas(stormLen)); stormTop.needsUpdate = true; }
    stormMarkerTargetX = stormX(Math.min(G.storm, G.stormMax) - 1);
    // decks
    setDeckCount(decks.supply, G.supply.length);
    setDeckCount(decks.threat, G.threat.length);
    if (lastThreatId !== G.lastThreat) {
      lastThreatId = G.lastThreat;
      if (lastThreatMesh) { scene.remove(lastThreatMesh); pickables.splice(pickables.indexOf(lastThreatMesh), 1); lastThreatMesh = null; }
      if (G.lastThreat) {
        lastThreatMesh = cardMesh(cardCanvas('t:' + G.lastThreat), threatBack);
        lastThreatMesh.position.set(15.6, BASE_Y + 0.02, -3.4); lastThreatMesh.rotation.y = 0.05;
        lastThreatMesh.userData = { ...lastThreatMesh.userData, kind: 'card', face: 't:' + G.lastThreat };
        scene.add(lastThreatMesh); pickables.push(lastThreatMesh);
      }
    }
    const top = G.supplyDiscard[G.supplyDiscard.length - 1];
    const dk = top ? top.uid : null;
    if (discardKey !== dk) {
      discardKey = dk;
      if (discardMesh) { scene.remove(discardMesh); pickables.splice(pickables.indexOf(discardMesh), 1); discardMesh = null; }
      if (top) {
        discardMesh = cardMesh(cardCanvas('s:' + top.id), supplyBack);
        discardMesh.position.set(15.6, BASE_Y + 0.02, 1.0); discardMesh.rotation.y = -0.04;
        discardMesh.userData = { ...discardMesh.userData, kind: 'card', face: 's:' + top.id };
        scene.add(discardMesh); pickables.push(discardMesh);
      }
    }
    setHand(G.hand);
    // objective tokens
    const ts = `${G.power}|${G.antenna}|${G.evacRound}`;
    if (tokState.k !== ts) {
      tokState.k = ts;
      setToken(tokPower, '⚡', G.power ? '#d4a017' : '#444', G.power ? 'ON' : 'OFF');
      setToken(tokAntenna, '📡', G.antenna ? '#2e8b57' : '#444', G.antenna ? 'FIXED' : 'BROKEN');
      setToken(tokEvac, '🚁', G.evacRound ? '#c0392b' : '#444', G.evacRound ? `ROUND ${G.evacRound}` : 'NO CALL');
      tokPower.material[1].emissive?.setHex(G.power ? 0x332200 : 0);
    }
    heli.visible = !!(G.evacRound && G.round >= G.evacRound);
    syncBadges(G);
    lamp.color.set(G.power ? '#ffd8a0' : '#ffb070'); lamp.intensity = G.power ? 40 : 18;
    // highlights: current tile + legal moves
    highlights = { [G.loc]: HL.here };
    if (G.phase === 'player' && !G.over && G.actions > 0) for (const n of ADJ[G.loc]) highlights[n] = HL.move;
    applyHL();
  }

  // ---------- camera
  const VIEWS = {
    overview: { pos: [0, 21, 21], tgt: [0, 0, 1.5] },
    top:      { pos: [0, 31, 0.6], tgt: [0, 0, 0.5] },
    player:   { pos: [1.0, 8.5, 18.5], tgt: [1.0, 0, 10.2] },
  };
  let fly = null;
  function flyTo(pos, tgt, dur = 0.8) { fly = { t: 0, dur, p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(...pos), t1: new THREE.Vector3(...tgt) }; }
  function focusLoc(id) { const l = LOC[id]; flyTo([l.x, 6.5, l.z + 5.2], [l.x, 0, l.z + 0.2]); }
  // Narrow (portrait) screens see less of the table from side to side, so whole-table views back the camera off.
  function fitPos(v) {
    const f = Math.min(2.3, Math.max(1, 1.45 / camera.aspect));
    return v.pos.map((p, i) => v.tgt[i] + (p - v.tgt[i]) * f);
  }
  function setView(name) {
    if (name === 'survivor') { const p = survivorFig?.userData.target || survivorFig?.position; if (p) flyTo([p.x, 6.5, p.z + 5.2], [p.x, 0, p.z]); return; }
    flyTo(name === 'player' ? VIEWS[name].pos : fitPos(VIEWS[name]), VIEWS[name].tgt);
  }
  camera.position.set(...VIEWS.overview.pos); controls.target.set(...VIEWS.overview.tgt);
  controls.maxDistance = 80;
  controls.addEventListener('start', () => { fly = null; });

  const keys = new Set();
  let keysEnabled = () => true;
  addEventListener('keydown', e => { if (keysEnabled() && !e.ctrlKey && !e.metaKey) keys.add(e.key.toLowerCase()); });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  function keyboardMove(dt) {
    if (!keys.size) return;
    const fwd = new THREE.Vector3().subVectors(controls.target, camera.position); fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
    const dist = camera.position.distanceTo(controls.target);
    const mv = new THREE.Vector3();
    if (keys.has('w') || keys.has('arrowup')) mv.add(fwd);
    if (keys.has('s') || keys.has('arrowdown')) mv.sub(fwd);
    if (keys.has('d') || keys.has('arrowright')) mv.add(right);
    if (keys.has('a') || keys.has('arrowleft')) mv.sub(right);
    if (mv.lengthSq()) { fly = null; mv.normalize().multiplyScalar(dt * Math.max(4, dist * 0.9)); camera.position.add(mv); controls.target.add(mv); }
    let rot = 0; if (keys.has('q')) rot += 1; if (keys.has('e')) rot -= 1;
    if (rot) { fly = null; const off = new THREE.Vector3().subVectors(camera.position, controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot * dt * 1.6); camera.position.copy(controls.target).add(off); }
    if (keys.has('=') || keys.has('+')) { fly = null; if (dist > 3) camera.position.lerp(controls.target, dt * 1.5); }
    if (keys.has('-')) { fly = null; const off = camera.position.clone().sub(controls.target).multiplyScalar(1 + dt * 1.5); if (off.length() < 55) camera.position.copy(controls.target).add(off); }
  }

  // ---------- picking
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  let downAt = null, hoverCb = () => {};
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? hit.object : null;
  }
  function setHover(o) {
    if (hovered === o) return;
    hovered = o; applyHL();
    renderer.domElement.style.cursor = o ? 'pointer' : '';
    hoverCb(o ? o.userData : null);
  }
  const el = renderer.domElement;
  el.addEventListener('pointermove', e => { if (!e.buttons) setHover(pick(e)); });
  el.addEventListener('pointerleave', () => setHover(null));
  // A tap/click picks; a drag, or any gesture that used two fingers (pinch), does not.
  const down = new Set(); let multi = false;
  el.addEventListener('pointerdown', e => { down.add(e.pointerId); if (down.size > 1) multi = true; else { multi = false; downAt = [e.clientX, e.clientY]; } });
  el.addEventListener('pointercancel', e => { down.delete(e.pointerId); downAt = null; });
  el.addEventListener('pointerup', e => {
    down.delete(e.pointerId);
    if (!downAt || e.button !== 0 || multi) { if (!down.size) downAt = null; return; }
    const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]); downAt = null;
    if (moved > (e.pointerType === 'touch' ? 12 : 5)) return;
    const o = pick(e); if (o) onPick(o.userData);
  });
  el.addEventListener('dblclick', e => { const o = pick(e); if (o) onDblPick(o.userData); });

  // ---------- loop
  // ---------- quality levels: low (no shadows), medium (soft shadows), high (+ ambient occlusion)
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, 1, 1);
  gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1, scale: 1.2, samples: 16 });
  composer.addPass(gtao);
  composer.addPass(new OutputPass());
  // Touch devices (phones, tablets) start on Low; the Menu can still raise it.
  const touch = matchMedia('(pointer: coarse)').matches;
  let quality = localStorage.getItem('whiteout-quality') || (touch ? 'low' : 'medium');
  function applyQuality() {
    const pr = { low: touch ? Math.min(devicePixelRatio, 1.5) : 1, medium: Math.min(devicePixelRatio, 1.5), high: Math.min(devicePixelRatio, 2) }[quality];
    renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
    lampLight.castShadow = quality !== 'low';
    const size = quality === 'high' ? 4096 : 2048;
    if (lampLight.shadow.mapSize.x !== size) { lampLight.shadow.mapSize.set(size, size); lampLight.shadow.map?.dispose(); lampLight.shadow.map = null; }
    resize();
  }
  // inset: screen area covered by a panel (phones). The picture shifts by half of it so the table stays centred in what's left.
  let inset = [0, 0];
  function resize() {
    const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h;
    if (inset[0] || inset[1]) camera.setViewOffset(w, h, inset[0] / 2, inset[1] / 2, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); applyQuality();
  const clock = new THREE.Clock();
  const dyingFigs = [];
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const tmp = new THREE.Vector3();
  function moveToward(obj, k, hop) {
    const tg = obj.userData.target; if (!tg) return;
    const d = obj.position.distanceTo(tg);
    if (d < 0.002) { obj.position.copy(tg); return; }
    tmp.copy(obj.position).lerp(tg, k);
    if (hop && d > 0.05) {
      const flat = Math.hypot(tg.x - obj.position.x, tg.z - obj.position.z);
      tmp.y = tg.y + Math.min(0.6, flat * 0.25);
      obj.rotation.y = Math.atan2(tg.x - obj.position.x, tg.z - obj.position.z);
    }
    obj.position.copy(tmp);
  }
  renderer.setAnimationLoop(() => {
    const raw = clock.getDelta(), dt = Math.min(raw, 0.05);
    if (fly) {
      fly.t += raw / fly.dur; const k = ease(Math.min(fly.t, 1));
      camera.position.lerpVectors(fly.p0, fly.p1, k); controls.target.lerpVectors(fly.t0, fly.t1, k);
      if (fly.t >= 1) fly = null;
    }
    keyboardMove(dt);
    controls.update();
    const k = 1 - Math.pow(0.0005, raw);
    if (survivorFig) {
      moveToward(survivorFig, k * 0.9, true);
      survivorFig.userData.ring.material.emissiveIntensity = 0.5 + Math.sin(clock.elapsedTime * 3) * 0.3;
    }
    for (const fig of zombieFigs.values()) {
      moveToward(fig, k * 0.7, true);
      if (fig.scale.x < 1) fig.scale.setScalar(Math.min(1, fig.scale.x + raw * 3));
    }
    for (let i = dyingFigs.length - 1; i >= 0; i--) {
      const f = dyingFigs[i]; f.userData.dying += raw;
      f.rotation.z = Math.min(Math.PI / 2, f.userData.dying * 5); f.position.y -= raw * 0.4;
      if (f.userData.dying > 0.8) { scene.remove(f); dyingFigs.splice(i, 1); }
    }
    for (const c of Object.values(cubes)) moveToward(c, k, false);
    stormMarker.position.x += (stormMarkerTargetX - stormMarker.position.x) * k;
    if (heli.visible && heli.userData.rotor) heli.userData.rotor.rotation.y += raw * 12;
    animateDice(raw);
    if (labelsOn) for (const s of Object.values(badges)) {   // shrink labels as the camera gets close
      const f = Math.min(1, Math.max(0.4, camera.position.distanceTo(s.position) / 20));
      s.scale.set(4.2 * f, 1.25 * f, 1);
    }
    if (quality === 'high') composer.render(); else renderer.render(scene, camera);
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(overlay, camera); renderer.autoClear = true;
  });

  return {
    sync, rollDice, clearDice, setView, focusLoc, flyTo,
    onHover(cb) { hoverCb = cb; },
    setKeysEnabled(fn) { keysEnabled = fn; },
    labelsOn: () => labelsOn,
    setLabels(on) { labelsOn = on; for (const s of Object.values(badges)) s.visible = on; },
    resize,
    setInset(right, bottom) { inset = [right, bottom]; resize(); },
    getQuality: () => quality,
    setQuality(q) { quality = q; localStorage.setItem('whiteout-quality', q); applyQuality(); },
  };
}
