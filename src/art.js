// Procedural canvas art for cards, tiles, mats and dice.
import { cardInfo, diceLabel, TYPE_STYLE, MAX_AMMO } from './data.js';
import { ART_URLS } from './art.gen.js';

const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
export function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function wrap(ctx, text, x, y, maxW, lh) {
  for (const para of text.split('\n')) {
    if (!para) { y += lh * 0.6; continue; }
    let line = '';
    for (const w of para.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; }
      else line = t;
    }
    ctx.fillText(line, x, y); y += lh;
  }
  return y;
}
// deterministic pseudo-random so art is stable between rebuilds
function rng(seed) { let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---- painted art (generated with Meshy, embedded). preloadArt() must finish before any canvas is drawn.
const ART = {};
export function preloadArt() {
  return Promise.all(Object.entries(ART_URLS).map(([k, url]) => new Promise(res => {
    const im = new Image(); im.onload = () => { ART[k] = im; res(); }; im.onerror = () => res(); im.src = url;
  })));
}
function drawCover(ctx, im, x, y, w, h, focusY = 0.5) {   // fill a box with an image, cropping to keep its aspect
  const s = Math.max(w / im.width, h / im.height), sw = w / s, sh = h / s;
  ctx.drawImage(im, (im.width - sw) / 2, (im.height - sh) * focusY, sw, sh, x, y, w, h);
}
const artKey = face => face.replace(':', '-');

const cardCache = {};
export function cardCanvas(face) {
  if (cardCache[face]) return cardCache[face];
  if (ART[artKey(face)]) return cardCache[face] = paintedCard(face, ART[artKey(face)]);
  const c = cardInfo(face), col = (TYPE_STYLE[c.type] || TYPE_STYLE.gear).col, R = rng(face);
  const [cv, ctx] = mkCanvas(500, 700);
  ctx.fillStyle = '#16181c'; rr(ctx, 0, 0, 500, 700, 28); ctx.fill();
  ctx.fillStyle = '#efe7d6'; rr(ctx, 14, 14, 472, 672, 20); ctx.fill();
  ctx.fillStyle = col; rr(ctx, 14, 14, 472, 84, [20, 20, 0, 0]); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let fs = 40; do { ctx.font = `bold ${fs}px "Trebuchet MS",sans-serif`; fs -= 2; } while (ctx.measureText(c.title).width > 440);
  ctx.fillText(c.title, 250, 58);
  const g = ctx.createLinearGradient(0, 110, 0, 360); g.addColorStop(0, col); g.addColorStop(1, '#101317');
  ctx.fillStyle = g; rr(ctx, 34, 110, 432, 250, 14); ctx.fill();
  ctx.globalAlpha = .12; ctx.fillStyle = '#fff';
  for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(34 + R() * 432, 110 + R() * 250, R() * 3 + 1, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.font = `150px ${EMOJI}`; ctx.fillText(c.icon, 250, 240);
  const dl = diceLabel(c);
  if (dl) {
    ctx.fillStyle = '#000a'; rr(ctx, 286, 122, 168, 44, 10); ctx.fill();
    ctx.fillStyle = '#ffd27a'; ctx.font = 'bold 23px "Segoe UI",sans-serif'; ctx.fillText('🎲 ' + dl, 370, 145);
  }
  ctx.fillStyle = '#2a2d33'; ctx.fillRect(34, 372, 432, 38);
  ctx.fillStyle = '#f3d9a4'; ctx.font = 'bold 21px "Segoe UI",sans-serif'; ctx.fillText(c.typeLabel.toUpperCase(), 250, 392);
  ctx.fillStyle = '#1d1f23'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  let size = 27, y;
  // shrink text until it fits above the flavor line
  for (;;) {
    ctx.save(); ctx.globalAlpha = 0; ctx.font = `${size}px "Segoe UI",sans-serif`;
    y = wrap(ctx, c.text, 46, 452, 410, size * 1.3); ctx.restore();
    if (y < 630 || size <= 18) break; size -= 1;
  }
  ctx.font = `${size}px "Segoe UI",sans-serif`; y = wrap(ctx, c.text, 46, 452, 410, size * 1.3);
  ctx.fillStyle = '#6b6252'; ctx.font = 'italic 22px Georgia,serif'; ctx.textAlign = 'center';
  ctx.fillText(c.flavor, 250, Math.max(y + 14, 658));
  return cardCache[face] = cv;
}

// Card with full-bleed painted art on top, title over the art, rules panel below.
function paintedCard(face, im) {
  const c = cardInfo(face), col = (TYPE_STYLE[c.type] || TYPE_STYLE.gear).col;
  const [cv, ctx] = mkCanvas(500, 700);
  ctx.fillStyle = '#0d0f12'; rr(ctx, 0, 0, 500, 700, 28); ctx.fill();
  // art
  ctx.save(); rr(ctx, 14, 14, 472, 400, [20, 20, 0, 0]); ctx.clip();
  drawCover(ctx, im, 14, 14, 472, 400, c.type === 'survivor' ? 0.1 : 0.5);
  let g = ctx.createLinearGradient(0, 14, 0, 130); g.addColorStop(0, '#000000d0'); g.addColorStop(1, '#00000000');
  ctx.fillStyle = g; ctx.fillRect(14, 14, 472, 116);
  g = ctx.createLinearGradient(0, 330, 0, 414); g.addColorStop(0, '#00000000'); g.addColorStop(1, '#00000099');
  ctx.fillStyle = g; ctx.fillRect(14, 330, 472, 84);
  ctx.restore();
  // title
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let fs = 42; do { ctx.font = `bold ${fs}px "Trebuchet MS",sans-serif`; fs -= 2; } while (ctx.measureText(c.title).width > 440);
  ctx.shadowColor = '#000'; ctx.shadowBlur = 10; ctx.fillStyle = '#fff'; ctx.fillText(c.title, 250, 58); ctx.shadowBlur = 0;
  // dice badge
  const dl = diceLabel(c);
  if (dl) {
    ctx.fillStyle = '#000000b8'; rr(ctx, 290, 360, 180, 44, 10); ctx.fill();
    ctx.strokeStyle = '#ffd27a88'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffd27a'; ctx.font = 'bold 23px "Segoe UI",sans-serif'; ctx.fillText('🎲 ' + dl, 380, 383);
  }
  // type ribbon
  ctx.fillStyle = col; ctx.fillRect(14, 414, 472, 40);
  ctx.fillStyle = '#ffffff22'; ctx.fillRect(14, 414, 472, 3);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 21px "Segoe UI",sans-serif'; ctx.fillText(c.typeLabel.toUpperCase(), 250, 435);
  // rules panel
  g = ctx.createLinearGradient(0, 454, 0, 686); g.addColorStop(0, '#f1e9d8'); g.addColorStop(1, '#ddd2bb');
  ctx.fillStyle = g; rr(ctx, 14, 454, 472, 232, [0, 0, 20, 20]); ctx.fill();
  ctx.fillStyle = '#1d1f23'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  let size = 26, y;
  for (;;) {
    ctx.save(); ctx.globalAlpha = 0; ctx.font = `${size}px "Segoe UI",sans-serif`;
    y = wrap(ctx, c.text, 38, 494, 424, size * 1.28); ctx.restore();
    if (y < 640 || size <= 17) break; size -= 1;
  }
  ctx.font = `${size}px "Segoe UI",sans-serif`; y = wrap(ctx, c.text, 38, 494, 424, size * 1.28);
  ctx.fillStyle = '#6b6252'; ctx.font = 'italic 21px Georgia,serif'; ctx.textAlign = 'center';
  ctx.fillText(c.flavor, 250, Math.max(y + 10, 664));
  // thin colored rim
  ctx.strokeStyle = col; ctx.lineWidth = 4; rr(ctx, 12, 12, 476, 676, 21); ctx.stroke();
  return cv;
}

const backCache = {};
export function backCanvas(kind) {
  if (backCache[kind]) return backCache[kind];
  const [cv, ctx] = mkCanvas(500, 700);
  const threat = kind === 'threat';
  ctx.fillStyle = '#16181c'; rr(ctx, 0, 0, 500, 700, 28); ctx.fill();
  const g = ctx.createRadialGradient(250, 350, 40, 250, 350, 420);
  g.addColorStop(0, threat ? '#9b2323' : '#2f7a8c'); g.addColorStop(1, threat ? '#2a0707' : '#0c2a33');
  ctx.fillStyle = g; rr(ctx, 14, 14, 472, 672, 20); ctx.fill();
  ctx.strokeStyle = '#ffffff30'; ctx.lineWidth = 3; rr(ctx, 34, 34, 432, 632, 14); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `170px ${EMOJI}`; ctx.fillText(threat ? '☣️' : '❄️', 250, 310);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 58px "Trebuchet MS",sans-serif'; ctx.fillText(threat ? 'THREAT' : 'SUPPLY', 250, 500);
  ctx.fillStyle = '#ffffffa0'; ctx.font = '22px "Segoe UI",sans-serif'; ctx.fillText('KESSEL RIDGE STATION', 250, 560);
  return backCache[kind] = cv;
}

const tileCache = {};
let snowImg = null;
export function setSnowImage(im) { snowImg = im; for (const k of Object.keys(tileCache)) if (!ART['l-' + k]) delete tileCache[k]; }
export function tileCanvas(l) {
  if (tileCache[l.id]) return tileCache[l.id];
  if (ART['l-' + l.id]) return tileCache[l.id] = paintedTile(l, ART['l-' + l.id]);
  const [cv, ctx] = mkCanvas(640, 440), R = rng(l.id);
  if (l.out) {
    const g = ctx.createLinearGradient(0, 0, 0, 440); g.addColorStop(0, '#f4f8fc'); g.addColorStop(1, '#c9d8e6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 440);
    if (snowImg) {   // real snow photo, washed out so the text stays readable
      ctx.globalAlpha = 0.55; ctx.drawImage(snowImg, (R() * 300) | 0, (R() * 300) | 0, 640, 440, 0, 0, 640, 440); ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff55'; ctx.fillRect(0, 0, 640, 440);
    }
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 160; i++) { ctx.beginPath(); ctx.arc(R() * 640, R() * 440, R() * 2.5, 0, 7); ctx.fill(); }
  } else {
    ctx.fillStyle = '#d8d0bf'; ctx.fillRect(0, 0, 640, 440);
    ctx.strokeStyle = '#00000014'; ctx.lineWidth = 2;
    for (let x = 0; x < 640; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 440); ctx.stroke(); }
    for (let y = 0; y < 440; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke(); }
  }
  ctx.fillStyle = l.out ? '#4f7fa3' : '#3a4657'; ctx.fillRect(0, 0, 640, 78);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 44px "Trebuchet MS",sans-serif'; ctx.textBaseline = 'middle';
  ctx.fillText(l.name, 22, 41);
  ctx.textAlign = 'right'; ctx.font = 'bold 20px "Segoe UI",sans-serif'; ctx.fillStyle = l.out ? '#dff1ff' : '#c9d3e0';
  ctx.fillText(l.out ? 'OUTDOOR ❄' : 'INDOOR', 620, 41);
  ctx.textAlign = 'center'; ctx.font = `92px ${EMOJI}`; ctx.fillStyle = '#000';
  ctx.fillText(l.icon, 90, 165);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#1f242b'; ctx.font = '26px "Segoe UI",sans-serif';
  wrap(ctx, l.text, 180, 130, 440, 33);
  ctx.font = 'bold 18px "Segoe UI",sans-serif'; ctx.fillStyle = '#5a5245';
  ctx.fillText('CRATES', 24, 418);
  for (let i = 0; i < l.crates; i++) { ctx.strokeStyle = '#8a6d2a'; ctx.lineWidth = 3; ctx.strokeRect(104 + i * 34, 398, 26, 26); }
  ctx.strokeStyle = l.out ? '#6d93b3' : '#2f3947'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, 630, 430);
  return tileCache[l.id] = cv;
}

// Location tile: painted scene fills the tile, name bar on top, ability panel at the bottom.
function paintedTile(l, im) {
  const [cv, ctx] = mkCanvas(640, 440);
  drawCover(ctx, im, 0, 0, 640, 440, 0.5);
  let g = ctx.createLinearGradient(0, 0, 0, 110); g.addColorStop(0, '#000000d8'); g.addColorStop(1, '#00000000');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 110);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.fillStyle = '#fff'; ctx.font = 'bold 46px "Trebuchet MS",sans-serif';
  ctx.fillText(l.name, 22, 44); ctx.shadowBlur = 0;
  // indoor / outdoor pill
  const tag = l.out ? 'OUTDOOR ❄' : 'INDOOR';
  ctx.font = 'bold 19px "Segoe UI",sans-serif'; const tw = ctx.measureText(tag).width + 24;
  ctx.fillStyle = l.out ? '#3d7fb5e6' : '#4b5563e6'; rr(ctx, 618 - tw, 26, tw, 34, 17); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(tag, 618 - tw / 2, 44);
  // ability panel
  ctx.fillStyle = '#0b0f14d0'; rr(ctx, 12, 282, 616, 146, 14); ctx.fill();
  ctx.strokeStyle = l.out ? '#8fc9ff66' : '#ffb34755'; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#f2f4f7';
  let size = 25;
  for (;;) {
    ctx.save(); ctx.globalAlpha = 0; ctx.font = `${size}px "Segoe UI",sans-serif`;
    const y = wrap(ctx, l.text, 28, 318, 584, size * 1.25); ctx.restore();
    if (y < 392 || size <= 17) break; size -= 1;
  }
  ctx.font = `${size}px "Segoe UI",sans-serif`; wrap(ctx, l.text, 28, 318, 584, size * 1.25);
  ctx.font = 'bold 16px "Segoe UI",sans-serif'; ctx.fillStyle = '#c9b98f'; ctx.fillText(`CRATES ${l.crates}`, 520, 416);
  ctx.strokeStyle = l.out ? '#8fb6d6' : '#3a4657'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, 632, 432);
  return cv;
}

export function woodCanvas() {
  const [cv, ctx] = mkCanvas(1024, 1024), R = rng('wood');
  ctx.fillStyle = '#6b4526'; ctx.fillRect(0, 0, 1024, 1024);
  for (let p = 0; p < 8; p++) {
    const y0 = p * 128;
    ctx.fillStyle = p % 2 ? '#734b2a' : '#65401f'; ctx.fillRect(0, y0, 1024, 126);
    for (let i = 0; i < 70; i++) {
      ctx.strokeStyle = `rgba(${40 + R() * 30},${20 + R() * 15},8,${0.15 + R() * 0.25})`;
      ctx.lineWidth = R() * 2 + 0.5; ctx.beginPath();
      const y = y0 + R() * 126; ctx.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 64) ctx.lineTo(x, y + Math.sin(x / 90 + i) * 3);
      ctx.stroke();
    }
    ctx.fillStyle = '#2a1708'; ctx.fillRect(0, y0 + 126, 1024, 2);
  }
  return cv;
}

export function matCanvas() {
  const [cv, ctx] = mkCanvas(2300, 1650);
  const g = ctx.createRadialGradient(1150, 800, 200, 1150, 800, 1400); g.addColorStop(0, '#2b3542'); g.addColorStop(1, '#141a22');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 2300, 1650);
  ctx.strokeStyle = '#ffffff0c'; ctx.lineWidth = 2;
  for (let x = 0; x < 2300; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1650); ctx.stroke(); }
  for (let y = 0; y < 1650; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(2300, y); ctx.stroke(); }
  ctx.strokeStyle = '#7fa6c814'; ctx.lineWidth = 4;
  for (let r = 1; r < 14; r++) { ctx.beginPath(); ctx.ellipse(1900, 300, r * 90, r * 60, 0.3, 0, 7); ctx.stroke(); }
  ctx.fillStyle = '#ffffff22'; ctx.font = 'bold 70px "Trebuchet MS",sans-serif'; ctx.textAlign = 'right';
  ctx.fillText('KESSEL RIDGE STATION', 2250, 1610);
  ctx.strokeStyle = '#ffffff40'; ctx.lineWidth = 8; ctx.strokeRect(20, 20, 2260, 1610);
  return cv;
}

export const TRACKS = [
  { key:'health', label:'HEALTH', col:'#c0392b', max:5 },
  { key:'warmth', label:'WARMTH', col:'#e67e22', max:5 },
  { key:'ammo',   label:'AMMO',   col:'#b08d3c', max:MAX_AMMO },
  { key:'noise',  label:'NOISE',  col:'#8e44ad', max:5 },
];
export function playerMatCanvas() {
  const [cv, ctx] = mkCanvas(1600, 800);
  ctx.fillStyle = '#20262e'; rr(ctx, 0, 0, 1600, 800, 40); ctx.fill();
  ctx.strokeStyle = '#ffb34755'; ctx.lineWidth = 6; rr(ctx, 14, 14, 1572, 772, 32); ctx.stroke();
  ctx.strokeStyle = '#ffffff22'; ctx.setLineDash([16, 12]); ctx.lineWidth = 4; rr(ctx, 60, 80, 460, 640, 22); ctx.stroke(); ctx.setLineDash([]);
  ctx.textBaseline = 'middle';
  TRACKS.forEach((t, i) => {
    const y = 140 + i * 160;
    ctx.fillStyle = t.col; ctx.font = 'bold 40px "Trebuchet MS",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(t.label, 580, y - 52);
    for (let k = 0; k <= 6; k++) {
      const x = 620 + k * 130;
      ctx.globalAlpha = k > t.max ? 0.15 : 1;
      ctx.fillStyle = k === 0 ? '#111' : t.col + '55'; rr(ctx, x - 52, y - 30, 104, 90, 14); ctx.fill();
      ctx.strokeStyle = t.col; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#ffffffcc'; ctx.font = 'bold 38px "Segoe UI",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(k, x, y + 15);
      ctx.globalAlpha = 1;
    }
  });
  return cv;
}

export function stormCanvas(len) {
  const [cv, ctx] = mkCanvas(1900, 170);
  ctx.fillStyle = '#10161d'; rr(ctx, 0, 0, 1900, 170, 26); ctx.fill();
  ctx.fillStyle = '#9cc4e4'; ctx.font = 'bold 34px "Trebuchet MS",sans-serif'; ctx.textBaseline = 'middle';
  ctx.fillText('STORM', 24, 85);
  const w = 1700 / len;
  for (let i = 0; i < len; i++) {
    const x = 180 + i * w, t = i / (len - 1);
    ctx.fillStyle = `rgb(${60 + t * 140},${110 - t * 70},${170 - t * 120})`;
    rr(ctx, x, 20, w - 14, 130, 16); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 44px "Segoe UI",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(i + 1, x + (w - 14) / 2, 85); ctx.textAlign = 'left';
  }
  return cv;
}
export const stormSpaceU = (i, len) => (180 + i * (1700 / len) + (1700 / len - 14) / 2) / 1900;

export function footprintCanvas() {
  const [cv, ctx] = mkCanvas(256, 64);
  ctx.fillStyle = '#e9f1f8'; ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#b9cad9';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(20 + i * 64, i % 2 ? 22 : 42, 11, 7, 0, 0, 7); ctx.fill(); }
  return cv;
}

export function dieFace(n) {
  const [cv, ctx] = mkCanvas(128, 128);
  ctx.fillStyle = '#f3efe6'; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = n === 6 ? '#b3261e' : '#1b1b1b';
  const P = { 1:[[64,64]], 2:[[34,34],[94,94]], 3:[[30,30],[64,64],[98,98]], 4:[[34,34],[94,34],[34,94],[94,94]],
              5:[[32,32],[96,32],[64,64],[32,96],[96,96]], 6:[[34,28],[94,28],[34,64],[94,64],[34,100],[94,100]] }[n];
  for (const [x, y] of P) { ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill(); }
  return cv;
}

// Floating label above a tile: name + status chips.
export function badgeCanvas(name, items, alert) {
  const [cv, ctx] = mkCanvas(640, 190);
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 34px "Segoe UI",sans-serif';
  const chipW = items.map(it => { ctx.font = 'bold 40px "Segoe UI",sans-serif'; return 64 + ctx.measureText(String(it.text)).width + 22; });
  const rowW = chipW.reduce((a, b) => a + b + 10, -10);
  ctx.font = 'bold 34px "Segoe UI",sans-serif';
  const w = Math.min(636, Math.max(ctx.measureText(name).width + 40, rowW + 24));
  const x0 = (640 - w) / 2, h = items.length ? 184 : 66;
  ctx.fillStyle = alert ? '#3a0f0fe8' : '#0f141be0'; rr(ctx, x0, 2, w, h, 22); ctx.fill();
  ctx.strokeStyle = alert ? '#ff5a4a' : '#ffffff40'; ctx.lineWidth = alert ? 6 : 3; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(name, 320, 36);
  const f = Math.min(1, 612 / rowW);     // squeeze the chip row if it is too wide
  ctx.save(); ctx.translate(320, 0); ctx.scale(f, 1); ctx.translate(-320, 0);
  let x = (640 - rowW) / 2;
  items.forEach((it, i) => {
    ctx.fillStyle = it.col + '33'; rr(ctx, x, 76, chipW[i], 92, 16); ctx.fill();
    ctx.strokeStyle = it.col; ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = `48px ${EMOJI}`; ctx.fillText(it.icon, x + 10, 124);
    ctx.fillStyle = it.col; ctx.font = 'bold 40px "Segoe UI",sans-serif'; ctx.fillText(String(it.text), x + 66, 124);
    x += chipW[i] + 10;
  });
  ctx.restore();
  return cv;
}

export function tokenCanvas(icon, bg, label) {
  const [cv, ctx] = mkCanvas(256, 256);
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(128, 128, 124, 0, 7); ctx.fill();
  ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(128, 128, 108, 0, 7); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `110px ${EMOJI}`; ctx.fillText(icon, 128, 112);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 30px "Segoe UI",sans-serif'; ctx.fillText(label, 128, 200);
  return cv;
}
