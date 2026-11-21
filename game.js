// ===== Future Me Island — MVP =====
const TILE = 40, COLS = 20, ROWS = 14;
// Coins reward the HABIT, not the amount. Dollars only fill your Wish Jars.
const REWARDS = { dailyLog: 10, firstThisWeek: 50, weekStreak: 150, jarFilled: 300 };

const SHOP = [
  { id: 'flower', emoji: '🌷', name: 'Tulip', price: 30 },
  { id: 'tree', emoji: '🌳', name: 'Oak Tree', price: 80 },
  { id: 'palm', emoji: '🌴', name: 'Palm Tree', price: 100 },
  { id: 'bench', emoji: '🪑', name: 'Chair', price: 120 },
  { id: 'lamp', emoji: '🏮', name: 'Lantern', price: 150 },
  { id: 'fountain', emoji: '⛲', name: 'Fountain', price: 400 },
  { id: 'tent', emoji: '⛺', name: 'Tent', price: 250 },
  { id: 'house', emoji: '🏡', name: 'Dream Home', price: 2000 },
  { id: 'car', emoji: '🚗', name: 'First Car', price: 1200 },
  { id: 'plane', emoji: '✈️', name: 'Travel Fund', price: 800 },
  { id: 'grad', emoji: '🎓', name: 'Diploma', price: 600 },
  { id: 'castle', emoji: '🏰', name: 'Castle', price: 5000 },
];

const MISSIONS = [
  { id: 'deposit', text: 'Make a deposit (any amount)', reward: 20, auto: true },
  { id: 'goal', text: 'Log progress on a goal', reward: 15, auto: true },
  { id: 'chat', text: 'Ask Maple a money question', reward: 10, auto: true },
  { id: 'skip', text: 'Skip one impulse buy today', reward: 15 },
  { id: 'learn', text: 'Read one personal-finance tip', reward: 10 },
];

// ---------- State (localStorage) ----------
const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => fmt(new Date());
// Monday of the week containing d (local time)
const weekKey = (d = new Date()) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return fmt(x); };
const defaultState = () => ({
  coins: 100, saved: 0, history: [], inventory: {}, placed: [],
  goals: [], streak: 0, lastStreakDay: null, missionsDay: today(), missionsDone: [],
  player: { x: 9, y: 8 }, weeks: [], lastDepositDay: null,
});
let S;
let hadLocalSave = false; // a brand-new local island must never overwrite the cloud copy
try {
  const raw = localStorage.getItem('fmi');
  hadLocalSave = !!raw;
  S = Object.assign(defaultState(), JSON.parse(raw) || {});
} catch { S = defaultState(); }
// stamp=false for automatic housekeeping (e.g. daily reset) so it doesn't count as "newer" than the cloud
const save = (stamp = true) => {
  if (stamp) S.updatedAt = Date.now();
  try { localStorage.setItem('fmi', JSON.stringify(S)); } catch {}
  window.cloudSave?.(S); // set by cloud.js once signed in
};

// reset daily missions on a new day; break streak if a day was missed
function rollDay() {
  if (S.missionsDay !== today()) { S.missionsDay = today(); S.missionsDone = []; }
  if (S.lastStreakDay) {
    const gap = (new Date(today()) - new Date(S.lastStreakDay)) / 86400000;
    if (gap > 1) S.streak = 0;
  }
  save(false);
}
rollDay();

// ---------- Map ----------
// 0 water, 1 sand, 2 grass, 3 wooden dock, 4 dirt path
const map = [];
for (let y = 0; y < ROWS; y++) {
  map.push([]);
  for (let x = 0; x < COLS; x++) {
    const dx = (x - COLS / 2 + .5) / (COLS / 2), dy = (y - ROWS / 2 + .5) / (ROWS / 2);
    const d = dx * dx + dy * dy + Math.sin(x * 1.3 + y) * 0.06;
    map[y].push(d > 0.95 ? 0 : d > 0.7 ? 1 : 2);
  }
}
// dirt path running south from the plaza, ending in a little dock
for (let y = 8; y < ROWS; y++) for (const x of [9, 10]) {
  if (map[y][x] === 2) map[y][x] = 4; else if (map[y][x] === 0) map[y][x] = 3;
}
const VILLAGER = { x: 13, y: 5 };
const walkable = (x, y) => map[y]?.[x] > 0 && !(x === VILLAGER.x && y === VILLAGER.y)
  && !S.placed.some(p => p.x === x && p.y === y && p.id !== 'flower');

// ---------- Pixel-art rendering (cozy palette from the Figma mood board) ----------
const PX = 4; // one art pixel = 4 screen px → 10×10 art pixels per tile
const PAL = {
  deep: '#5aaebd', water: '#6cc3c8', ripple: '#a6e2dc', foam: '#d4f3ea',
  sand: '#f3dcaa', sandDot: '#e5c48d',
  grass: '#a5ca8c', grass2: '#9bc284', tuft: '#7fae6e',
  path: '#f1c38f', pathDot: '#e0a873',
  plank: '#caa070', plank2: '#b98b5c', plankLine: '#8d6440', post: '#6e4a31',
  flowers: ['#f6c1d2', '#ffffff', '#c7b6ef', '#f7d774'],
};
const hash = (x, y, i = 0) => {
  let n = (x * 374761393 + y * 668265263 + i * 1274126177) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const tileAtMap = (x, y) => map[y]?.[x] ?? 0;
const isWet = (x, y) => { const v = tileAtMap(x, y); return v === 0 || v === 3; };
const SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]];

const bg = document.createElement('canvas');
bg.width = COLS * TILE; bg.height = ROWS * TILE;
(function paintBackground() {
  const g = bg.getContext('2d');
  const dot = (tx, ty, px, py, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(tx * TILE + px * PX, ty * TILE + py * PX, w * PX, h * PX); };
  // pixels along one edge of a tile (side: 0 top, 1 right, 2 bottom, 3 left)
  const edge = (x, y, side, c, density, seed) => {
    for (let i = 0; i < 10; i++) if (hash(x, y, seed + i) < density) {
      const [px, py] = [[i, 0], [9, i], [i, 9], [0, i]][side];
      dot(x, y, px, py, c);
    }
  };
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const v = map[y][x];
    if (v === 0 || v === 3) {
      const shore = SIDES.some(([a, b]) => !isWet(x + a, y + b));
      dot(x, y, 0, 0, shore ? PAL.water : PAL.deep, 10, 10);
      SIDES.forEach(([a, b], s) => { if (!isWet(x + a, y + b)) edge(x, y, s, PAL.foam, .75, 10 + s * 10); });
    }
    if (v === 1) {
      dot(x, y, 0, 0, PAL.sand, 10, 10);
      for (let i = 0; i < 5; i++) dot(x, y, Math.floor(hash(x, y, i) * 10), Math.floor(hash(x, y, i + 9) * 10), PAL.sandDot);
      SIDES.forEach(([a, b], s) => { if (tileAtMap(x + a, y + b) === 2) edge(x, y, s, PAL.grass, .55, 40 + s * 10); });
    }
    if (v === 2) {
      dot(x, y, 0, 0, PAL.grass, 10, 10);
      for (let i = 0; i < 3; i++) dot(x, y, Math.floor(hash(x, y, i + 20) * 8), Math.floor(hash(x, y, i + 30) * 8), PAL.grass2, 2, 2);
      for (let i = 0; i < 2; i++) { // little "v" tufts
        const px = 1 + Math.floor(hash(x, y, i + 40) * 8), py = 1 + Math.floor(hash(x, y, i + 50) * 8);
        dot(x, y, px - 1, py - 1, PAL.tuft); dot(x, y, px + 1, py - 1, PAL.tuft); dot(x, y, px, py, PAL.tuft);
      }
      if (hash(x, y, 60) < .14) { // tiny flower
        const px = 2 + Math.floor(hash(x, y, 61) * 6), py = 2 + Math.floor(hash(x, y, 62) * 6);
        const c = PAL.flowers[Math.floor(hash(x, y, 63) * PAL.flowers.length)];
        dot(x, y, px - 1, py, c); dot(x, y, px + 1, py, c); dot(x, y, px, py - 1, c); dot(x, y, px, py + 1, c);
        dot(x, y, px, py, '#f7d774');
      }
    }
    if (v === 4) {
      dot(x, y, 0, 0, PAL.path, 10, 10);
      for (let i = 0; i < 4; i++) dot(x, y, Math.floor(hash(x, y, i + 70) * 10), Math.floor(hash(x, y, i + 80) * 10), PAL.pathDot);
      SIDES.forEach(([a, b], s) => { if (tileAtMap(x + a, y + b) === 2) edge(x, y, s, PAL.grass, .6, 90 + s * 10); });
    }
    if (v === 3) { // dock planks (horizontal boards) + posts
      for (let r = 0; r < 5; r++) {
        dot(x, y, 0, r * 2, r % 2 ? PAL.plank2 : PAL.plank, 10, 2);
        dot(x, y, 0, r * 2 + 1, PAL.plankLine, 10, 1);
        if (hash(x, y, r + 100) < .5) dot(x, y, Math.floor(hash(x, y, r + 110) * 9), r * 2, PAL.plank2, 1, 1);
      }
      const left = tileAtMap(x - 1, y) !== 3, right = tileAtMap(x + 1, y) !== 3;
      if (left) dot(x, y, 0, 0, PAL.post, 1, 10);
      if (right) dot(x, y, 9, 0, PAL.post, 1, 10);
    }
  }
})();

// Sprites as pixel strings (each char = one art pixel; '.' = transparent)
function playerRows(dir, step) {
  const hair = ['..HHHHHH..', '.HHHHHHHH.', 'HHHHHHHHHH'];
  const face = {
    down: ['HHSSSSSSHH', 'HSSESSESSH', 'HSCSSSSCSH'],
    up: ['HHHHHHHHHH', 'HHHHHHHHHH', '.HHHHHHHH.'],
    right: ['HHHSSSSSSH', 'HHSSSESSES', 'HHSSSSSSCS'],
  }[dir === 'left' ? 'right' : dir];
  const body = ['.SSSSSSSS.', '..BBBBBB..', '.SBBBBBBS.', '..BbBBbB..', '..PPPPPP..'];
  const legs = step ? '..F....F..' : '..FF..FF..';
  return [...hair, ...face, ...body, legs];
}
const PLAYER_PAL = { H: '#6b4a3a', S: '#ffe0c2', E: '#3d2b22', C: '#f4a6a6', B: '#f2a0a8', b: '#d9838d', P: '#7b8fb8', F: '#5a4636' };
const FOX = [
  '.O......O.', '.OO....OO.', '.OOOOOOOO.', 'OOEOOOOEOO', 'OWWWNNWWWO', '.WWWWWWWW.',
  '..GGGGGG..', '.OGGGGGGO.', '..GGWWGG..', '..OO..OO..', '..DD..DD..',
];
const FOX_PAL = { O: '#e8935a', W: '#fff4e6', E: '#3d2b22', N: '#3d2b22', G: '#8fb87a', D: '#7a4a30' };

const cv = document.getElementById('game'), ctx = cv.getContext('2d');
let selectedItem = null, hover = null, t = 0;

function drawSprite(rows, pal, cx, bottom, flip = false) {
  const w = rows[0].length, left = Math.round(cx - w * PX / 2), top = Math.round(bottom - rows.length * PX);
  rows.forEach((r, j) => { for (let i = 0; i < w; i++) {
    const c = r[flip ? w - 1 - i : i];
    if (c !== '.') { ctx.fillStyle = pal[c]; ctx.fillRect(left + i * PX, top + j * PX, PX, PX); }
  } });
}
function shadow(cx, bottom, w = 6) {
  ctx.fillStyle = 'rgba(60, 90, 50, .25)';
  ctx.fillRect(cx - w * PX / 2, bottom - PX, w * PX, PX);
  ctx.fillRect(cx - (w - 2) * PX / 2, bottom, (w - 2) * PX, PX);
}

// Shop items: emoji rendered at 16×16, alpha-snapped, then scaled up crisp → pixel-art look
const iconCache = {};
function icon(id) {
  if (iconCache[id]) return iconCache[id];
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '14px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",serif';
  g.fillText(SHOP.find(s => s.id === id).emoji, 8, 9);
  const img = g.getImageData(0, 0, 16, 16);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 110 ? 255 : 0;
  g.putImageData(img, 0, 0);
  return iconCache[id] = c;
}
const iconURL = id => icon(id).toDataURL();
const BIG = new Set(['tree', 'palm', 'house', 'castle', 'fountain']);
function drawItem(id, x, y, alpha = 1) {
  const size = BIG.has(id) ? 56 : 36, cx = x * TILE + TILE / 2, bottom = y * TILE + TILE - 2;
  if (alpha === 1) shadow(cx, bottom - 2, BIG.has(id) ? 10 : 6);
  ctx.globalAlpha = alpha;
  ctx.drawImage(icon(id), cx - size / 2, bottom - size, size, size);
  ctx.globalAlpha = 1;
}

function drawBubble(text, cx, bottom) {
  ctx.font = '16px "VCR OSD Mono", monospace';
  const w = Math.ceil(ctx.measureText(text).width / PX) * PX + 6 * PX, h = 6 * PX;
  const x = Math.round(cx - w / 2), y = bottom - h;
  ctx.fillStyle = '#8d6440'; ctx.fillRect(x + PX, y, w - 2 * PX, h); ctx.fillRect(x, y + PX, w, h - 2 * PX);
  ctx.fillStyle = '#fff7e6'; ctx.fillRect(x + PX, y + PX, w - 2 * PX, h - 2 * PX);
  ctx.fillStyle = '#8d6440'; ctx.fillRect(cx - PX, y + h, 2 * PX, PX);
  ctx.fillStyle = '#5a4636'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, y + h / 2 + 1);
}

const draw = () => {
  t++;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bg, 0, 0);
  // gentle water shimmer
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (map[y][x] !== 0) continue;
    const phase = Math.floor(t / 40 + hash(x, y, 7) * 8);
    if (hash(x, y, phase) < .3) {
      ctx.fillStyle = PAL.ripple;
      ctx.fillRect(x * TILE + Math.floor(hash(x, y, phase + 1) * 6) * PX, y * TILE + Math.floor(hash(x, y, phase + 2) * 9) * PX, 3 * PX, PX);
    }
  }

  // depth-sorted entities
  const step = P.moving && Math.floor(t / 8) % 2;
  const ents = [
    ...S.placed.map(p => ({ y: p.y, draw: () => drawItem(p.id, p.x, p.y) })),
    { y: VILLAGER.y, draw: () => {
      const cx = VILLAGER.x * TILE + TILE / 2, bottom = VILLAGER.y * TILE + TILE - 2;
      shadow(cx, bottom); drawSprite(FOX, FOX_PAL, cx, bottom - (Math.floor(t / 30) % 2) * PX / 2);
    } },
    { y: P.ry + .01, draw: () => {
      const cx = P.rx * TILE + TILE / 2, bottom = P.ry * TILE + TILE - 2;
      shadow(cx, bottom); drawSprite(playerRows(P.dir, step), PLAYER_PAL, cx, bottom - (step ? PX : 0), P.dir === 'left');
    } },
  ].sort((a, b) => a.y - b.y);
  ents.forEach(e => e.draw());

  if (nearVillager()) drawBubble('Space to chat', VILLAGER.x * TILE + TILE / 2, VILLAGER.y * TILE - 14 * PX);

  // placement preview: ghost item + pixel corner brackets
  if (selectedItem && hover) {
    drawItem(selectedItem, hover.x, hover.y, .6);
    ctx.fillStyle = canPlace(hover.x, hover.y) ? '#fff7e6' : '#e0705c';
    const X = hover.x * TILE, Y = hover.y * TILE, L = 3 * PX;
    [[X, Y], [X + TILE - L, Y], [X, Y + TILE - PX], [X + TILE - L, Y + TILE - PX]].forEach(([a, b]) => ctx.fillRect(a, b, L, PX));
    [[X, Y], [X + TILE - PX, Y], [X, Y + TILE - L], [X + TILE - PX, Y + TILE - L]].forEach(([a, b]) => ctx.fillRect(a, b, PX, L));
  }
};

// ---------- Player movement (arrow keys) ----------
const P = { x: S.player.x, y: S.player.y, rx: S.player.x, ry: S.player.y, dir: 'down', moving: false };
const keys = {};
const typing = () => ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);
addEventListener('keydown', e => {
  if (typing() || document.body.classList.contains('intro-open')) return;
  if (e.key.startsWith('Arrow')) { keys[e.key] = true; e.preventDefault(); }
  if (e.key === ' ') { e.preventDefault(); if (nearVillager()) openChat(); }
  if (e.key === 'Escape') { selectedItem = null; renderInventory(); closeChat(); }
});
addEventListener('keyup', e => { keys[e.key] = false; });

function update() {
  const arrived = Math.abs(P.rx - P.x) < .01 && Math.abs(P.ry - P.y) < .01;
  if (arrived) {
    P.rx = P.x; P.ry = P.y;
    let dx = 0, dy = 0;
    if (keys.ArrowLeft) { dx = -1; P.dir = 'left'; } else if (keys.ArrowRight) { dx = 1; P.dir = 'right'; }
    else if (keys.ArrowUp) { dy = -1; P.dir = 'up'; } else if (keys.ArrowDown) { dy = 1; P.dir = 'down'; }
    P.moving = !!(dx || dy);
    if (P.moving && walkable(P.x + dx, P.y + dy)) { P.x += dx; P.y += dy; S.player = { x: P.x, y: P.y }; save(); }
  } else {
    P.rx += Math.sign(P.x - P.rx) * Math.min(.2, Math.abs(P.x - P.rx));
    P.ry += Math.sign(P.y - P.ry) * Math.min(.2, Math.abs(P.y - P.ry));
  }
}
const nearVillager = () => Math.abs(P.x - VILLAGER.x) + Math.abs(P.y - VILLAGER.y) <= 1;
(function loop() { update(); draw(); requestAnimationFrame(loop); })();

// ---------- Placing items ----------
const tileAt = e => { const r = cv.getBoundingClientRect(); return { x: Math.floor((e.clientX - r.left) * (cv.width / r.width) / TILE), y: Math.floor((e.clientY - r.top) * (cv.height / r.height) / TILE) }; };
const canPlace = (x, y) => map[y]?.[x] > 0 && !S.placed.some(p => p.x === x && p.y === y) && !(x === P.x && y === P.y) && !(x === VILLAGER.x && y === VILLAGER.y);
cv.addEventListener('mousemove', e => hover = tileAt(e));
cv.addEventListener('mouseleave', () => hover = null);
cv.addEventListener('click', e => {
  const { x, y } = tileAt(e);
  if (e.shiftKey) { // pick up
    const i = S.placed.findIndex(p => p.x === x && p.y === y);
    if (i >= 0) { const [p] = S.placed.splice(i, 1); S.inventory[p.id] = (S.inventory[p.id] || 0) + 1; save(); renderInventory(); toast('Picked up!'); }
    return;
  }
  if (!selectedItem) return;
  if (!canPlace(x, y)) return toast("Can't place there");
  S.placed.push({ id: selectedItem, x, y });
  if (--S.inventory[selectedItem] <= 0) { delete S.inventory[selectedItem]; selectedItem = null; }
  save(); renderInventory();
});

// ---------- UI helpers ----------
const $ = id => document.getElementById(id);
function toast(msg) { const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2000); }
function renderStats() {
  $('coins').textContent = `🪙 ${S.coins.toLocaleString()}`;
  $('saved').textContent = `💰 $${S.saved.toLocaleString()} saved`;
  $('streak').textContent = `🔥 ${S.streak}-day streak`;
}
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tabs button, .panel').forEach(el => el.classList.remove('active'));
  b.classList.add('active'); $('tab-' + b.dataset.tab).classList.add('active');
});

// ---------- Bank ----------
// consecutive weeks (ending this week) with at least one deposit
function weekStreak() { let n = 0; const d = new Date(); while (S.weeks.includes(weekKey(d))) { n++; d.setDate(d.getDate() - 7); } return n; }

// Log real-life saving. Amount fills Wish Jars; coins come only from consistency.
function logSaving(amt, type, jarIdx) {
  const rewards = [];
  if (S.lastDepositDay !== today()) { S.lastDepositDay = today(); rewards.push(['Saved today', REWARDS.dailyLog]); }
  const wk = weekKey();
  if (!S.weeks.includes(wk)) {
    S.weeks.push(wk);
    rewards.push(['First deposit this week', REWARDS.firstThisWeek]);
    const ws = weekStreak();
    if (ws >= 3) rewards.push([`${ws} weeks in a row`, REWARDS.weekStreak]);
  }
  S.saved += amt;
  const g = S.goals[jarIdx];
  if (g) {
    g.saved += amt; g.log.push({ date: today(), amt });
    if (!g.rewarded && g.saved >= g.target) { g.rewarded = true; rewards.push([`Wish Jar "${g.name}" filled`, REWARDS.jarFilled]); }
  }
  const coins = rewards.reduce((t, r) => t + r[1], 0);
  S.coins += coins;
  S.history.unshift({ amt, type, date: today(), jar: g?.name, coins });
  save(); renderAll();
  toast(coins ? `+${coins} 🪙 · ${rewards.map(r => r[0]).join(' · ')}` : `$${amt} added to your progress. Coins come from showing up — see you tomorrow!`);
  // share the habit (never the amount or jar name) with the town
  if (coins) window.onHabit?.(rewards.map(r => r[0].startsWith('Wish Jar') ? 'filled a Wish Jar' : r[0].toLowerCase()).join(' · '), coins);
  completeMission('deposit');
  if (g) completeMission('goal');
}
$('depositBtn').onclick = () => {
  const amt = Math.floor(+$('depAmount').value);
  if (!(amt > 0)) return toast('Enter an amount');
  logSaving(amt, $('depType').value, $('depJar').value === '' ? -1 : +$('depJar').value);
};
function renderRules() {
  const ws = weekStreak();
  $('rules').innerHTML = `
    <li>${S.lastDepositDay === today() ? '✅' : '⬜'} Save anything today <b>+${REWARDS.dailyLog}🪙</b></li>
    <li>${S.weeks.includes(weekKey()) ? '✅' : '⬜'} First deposit this week <b>+${REWARDS.firstThisWeek}🪙</b></li>
    <li>${ws >= 3 ? '✅' : '⬜'} 3+ weeks in a row <b>+${REWARDS.weekStreak}🪙/week</b> <span class="muted">(now: ${ws} wk)</span></li>
    <li>🫙 Fill a Wish Jar <b>+${REWARDS.jarFilled}🪙</b></li>`;
}
function renderHistory() {
  $('history').innerHTML = S.history.slice(0, 20).map(h => `<li>${h.date} · <b>$${h.amt}</b> → ${h.type}${h.jar ? ' · 🫙 ' + esc(h.jar) : ''} <span class="muted">(+${h.coins ?? 0}🪙)</span></li>`).join('') || '<li class="muted">No deposits yet</li>';
}

// ---------- Shop / Inventory ----------
function renderShop() {
  $('shop').innerHTML = SHOP.map(s => `<div class="item ${S.coins < s.price ? 'locked' : ''}" data-id="${s.id}"><img class="emoji" src="${iconURL(s.id)}" alt="">${s.name}<br><b>${s.price}🪙</b></div>`).join('');
  $('shop').querySelectorAll('.item').forEach(el => el.onclick = () => {
    const s = SHOP.find(i => i.id === el.dataset.id);
    if (S.coins < s.price) return toast(`Need ${s.price - S.coins} more 🪙 — keep your saving streak going!`);
    S.coins -= s.price; S.inventory[s.id] = (S.inventory[s.id] || 0) + 1;
    save(); renderAll(); toast(`Bought ${s.name}! Select it below to place.`);
  });
}
function renderInventory() {
  const ids = Object.keys(S.inventory);
  $('inventory').innerHTML = ids.map(id => { const s = SHOP.find(i => i.id === id); return `<div class="item ${selectedItem === id ? 'selected' : ''}" data-id="${id}"><img class="emoji" src="${iconURL(s.id)}" alt="">${s.name} ×${S.inventory[id]}</div>`; }).join('') || '<p class="muted">Nothing yet — buy something!</p>';
  $('inventory').querySelectorAll('.item').forEach(el => el.onclick = () => {
    selectedItem = selectedItem === el.dataset.id ? null : el.dataset.id;
    renderInventory(); if (selectedItem) toast('Click a tile on the island to place');
  });
}

// ---------- Goals ----------
$('addGoal').onclick = () => {
  const name = $('goalName').value.trim(), target = +$('goalTarget').value;
  if (!name || !(target > 0)) return toast('Add a name and target');
  S.goals.push({ name, target, saved: 0, log: [] });
  $('goalName').value = $('goalTarget').value = '';
  save(); renderGoals();
};
function renderGoals() {
  $('goals').innerHTML = S.goals.map((g, i) => {
    const pct = Math.min(100, g.saved / g.target * 100), loggedToday = g.log.some(l => l.date === today());
    return `<div class="goal"><b>${esc(g.name)}</b> ${pct >= 100 ? '🎉' : ''}
      <div class="bar"><div style="width:${pct}%"></div></div>
      <small>$${g.saved} / $${g.target} · ${loggedToday ? '✅ logged today' : '⏳ not logged today'}</small>
      <div class="goal-row"><input type="number" min="1" placeholder="Today's $" id="gi${i}"><button data-i="${i}">Log</button></div></div>`;
  }).join('') || '<p class="muted">What does your dream life look like? Add a Wish Jar!</p>';
  const cur = $('depJar').value;
  $('depJar').innerHTML = '<option value="">General savings</option>' + S.goals.map((g, i) => `<option value="${i}">🫙 ${esc(g.name)}</option>`).join('');
  $('depJar').value = cur;
  $('goals').querySelectorAll('button').forEach(b => b.onclick = () => {
    const amt = Math.floor(+$('gi' + b.dataset.i).value);
    if (!(amt > 0)) return toast('Enter an amount');
    logSaving(amt, 'Savings', +b.dataset.i);
  });
}
const esc = s => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

// ---------- Daily missions & streak ----------
function completeMission(id) {
  rollDay();
  if (S.missionsDone.includes(id)) return;
  const m = MISSIONS.find(m => m.id === id);
  S.missionsDone.push(id);
  // first mission of the day extends the streak; bonus scales with streak (capped)
  let bonus = 0;
  if (S.lastStreakDay !== today()) {
    S.streak += 1; S.lastStreakDay = today();
    bonus = Math.min(S.streak, 30) * 5;
    setTimeout(() => toast(`🔥 ${S.streak}-day streak! +${bonus} bonus 🪙`), 2100);
  }
  S.coins += m.reward + bonus;
  save(); renderAll();
  window.onHabit?.(bonus ? `kept a ${S.streak}-day streak` : 'finished a daily mission', m.reward + bonus);
}
function renderMissions() {
  $('missions').innerHTML = MISSIONS.map(m => {
    const done = S.missionsDone.includes(m.id);
    return `<li class="mission ${done ? 'done' : ''}"><span>${m.text} <b>+${m.reward}🪙</b></span>${done ? '✅' : m.auto ? '<span class="muted">auto</span>' : `<button data-id="${m.id}">Done</button>`}</li>`;
  }).join('');
  $('missions').querySelectorAll('button').forEach(b => b.onclick = () => completeMission(b.dataset.id));
  $('streakInfo').innerHTML = `🔥 Current streak: <b>${S.streak} day${S.streak === 1 ? '' : 's'}</b>. ${S.lastStreakDay === today() ? 'Streak secured for today!' : 'Complete a mission to keep it going!'}`;
}

// ---------- Villager chatbot (stub — wire to an LLM later) ----------
const TIPS = [
  "Pay yourself first! Move savings out on payday before you spend.",
  "A TFSA lets your investments grow tax-free in Canada. 🍁",
  "An FHSA can help you save up to $40,000 tax-free for your first home!",
  "Try the 50/30/20 rule: needs, wants, savings.",
  "Small amounts add up — $5 a day is over $1,800 a year!",
  "An emergency fund of 3–6 months of expenses = peace of mind.",
];
async function askVillager(question) {
  // TODO: replace with a real API call, e.g.
  // const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ question, state: S }) });
  // return (await res.json()).reply;
  const q = question.toLowerCase();
  if (q.includes('tfsa')) return TIPS[1];
  if (q.includes('fhsa') || q.includes('home') || q.includes('house')) return TIPS[2];
  if (q.includes('budget')) return TIPS[3];
  if (q.includes('emergency')) return TIPS[5];
  if (q.includes('streak')) return `You're on a ${S.streak}-day streak! Do any daily mission to keep it alive.`;
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}
function addMsg(text, who) { const d = document.createElement('div'); d.className = 'msg ' + who; d.textContent = text; $('chatLog').append(d); $('chatLog').scrollTop = 1e9; }
function openChat() {
  $('chat').classList.remove('hidden');
  if (!$('chatLog').children.length) addMsg(`Hey there! I'm Maple 🦊. You've saved $${S.saved} so far — future you is cheering! Ask me about TFSAs, budgeting, FHSAs...`, 'bot');
  $('chatInput').focus();
}
function closeChat() { $('chat').classList.add('hidden'); $('chatInput').blur(); }
$('closeChat').onclick = closeChat;
$('chatForm').onsubmit = async e => {
  e.preventDefault();
  const q = $('chatInput').value.trim(); if (!q) return;
  $('chatInput').value = ''; addMsg(q, 'me');
  addMsg(await askVillager(q), 'bot');
  completeMission('chat');
};
$('chatInput').addEventListener('keydown', e => { if (e.key === 'Escape') closeChat(); });

function renderAll() { renderStats(); renderHistory(); renderRules(); renderShop(); renderInventory(); renderGoals(); renderMissions(); }
renderAll();

// Called by cloud.js when the cloud copy is newer than this browser's copy.
window.loadCloudState = data => {
  S = Object.assign(defaultState(), data);
  try { localStorage.setItem('fmi', JSON.stringify(S)); } catch {}
  Object.assign(P, { x: S.player.x, y: S.player.y, rx: S.player.x, ry: S.player.y, moving: false });
  rollDay(); renderAll();
};
window.getState = () => S;
window.hasLocalSave = () => hadLocalSave;
window.saveGame = () => save();
window.toast = toast;
