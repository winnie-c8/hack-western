// ===== Future Me Island — MVP =====
const TILE = 40, COLS = 20, ROWS = 14;
// Coins reward the HABIT, not the amount. Dollars track real savings.
const REWARDS = { dailyLog: 10, firstThisWeek: 50, weekStreak: 150 };

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
  personalGoals: [], streak: 0, lastStreakDay: null, missionsDay: today(), missionsDone: [],
  player: { x: 5, y: 10 }, weeks: [], lastDepositDay: null,
  accounts: ['High-interest savings', 'TFSA', 'RRSP', 'FHSA (first home)'],
});
let S;
let hadLocalSave = false; // a brand-new local island must never overwrite the cloud copy
try {
  const raw = localStorage.getItem('fmi');
  hadLocalSave = !!raw;
  S = Object.assign(defaultState(), JSON.parse(raw) || {});
} catch { S = defaultState(); }
// stamp=false for automatic housekeeping (e.g. daily reset) so it doesn't count as "newer" than the cloud
const saveLocal = () => { try { localStorage.setItem('fmi', JSON.stringify(S)); } catch {} };
const save = (stamp = true) => {
  if (stamp) S.updatedAt = Date.now();
  saveLocal();
  window.cloudSave?.(S); // set by cloud.js once signed in
};
function migrateLegacyGoals() {
  if (!Array.isArray(S.personalGoals)) S.personalGoals = [];
  if (!Array.isArray(S.goals)) return;
  if (!S.personalGoals.length) {
    S.personalGoals = S.goals
      .filter(g => g && Number(g.target) > 0)
      .map(g => ({
        name: String(g.name || 'Savings goal'),
        target: Number(g.target),
        saved: Number(g.saved) || 0,
        completed: !!g.rewarded,
        starred: false,
      }));
  }
  delete S.goals;
  save(false);
}
migrateLegacyGoals();

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
for (let y = 4; y < ROWS; y++) for (const x of [9, 10]) {
  if (map[y][x] === 2) map[y][x] = 4; else if (map[y][x] === 0) map[y][x] = 3;
}
const VILLAGER = { x: 13, y: 5 };
// The shop is a real building on the island (Figma Desktop-2): 2×2 tiles, door faces south.
const SHOP_BLD = { x: 9, y: 2, w: 2, h: 2 };
const inShop = (x, y) => x >= SHOP_BLD.x && x < SHOP_BLD.x + SHOP_BLD.w && y >= SHOP_BLD.y && y < SHOP_BLD.y + SHOP_BLD.h;
// Town projects are built on your island: each one gets a 2×2 plot (finished ones + the one under construction).
const PLOTS = [[4, 4], [14, 8], [5, 8], [12, 2], [15, 4], [6, 2]];
let townBuilds = []; // [{ town, name, f (0..1 progress), x, y }]
window.setTownBuilds = list => {
  townBuilds = list.slice(0, PLOTS.length).map((b, i) => ({ ...b, x: PLOTS[i][0], y: PLOTS[i][1] }));
};
const inPlot = (x, y) => townBuilds.some(b => x >= b.x && x < b.x + 2 && y >= b.y && y < b.y + 2);
const walkable = (x, y) => map[y]?.[x] > 0 && !inShop(x, y) && !inPlot(x, y) && !(x === VILLAGER.x && y === VILLAGER.y)
  && !S.placed.some(p => p.x === x && p.y === y && p.id !== 'flower');

// ---------- Pixel-art rendering (cozy palette from the Figma mood board) ----------
const PX = 4; // one art pixel = 4 screen px → 10×10 art pixels per tile
const PAL = {
  deep: '#5aaebd', water: '#6cc3c8', ripple: '#a6e2dc', foam: '#d4f3ea', caustic: '#7fd0d3',
  waterShadow: '#468fa3',                       // hard shadow cast onto water by land/dock
  sand: '#f3dcaa', sandDot: '#e5c48d', bank: '#c9a46e', bankDark: '#9c7a4b',
  grass: '#a5ca8c', grass2: '#97bf7f', grass3: '#bcdba2', grassDark: '#6f9c5c',
  path: '#f1c38f', pathDot: '#e0a873', pathEdge: '#d99a63',
  stone: '#e3d8c3', stoneDark: '#a99c84',
  lily: '#7dbf6a', lilyDark: '#4f8f48', lilyHi: '#a8db8c',
  plank: '#caa070', plank2: '#b98b5c', plankHi: '#ddb886', plankLine: '#7e5636', post: '#5f3f2a', postHi: '#8d6440',
  outline: '#3e2f22',
  shadow: 'rgba(28, 52, 44, .38)',             // hard, flat shadow (no blur)
  flowers: ['#f6c1d2', '#ffffff', '#c7b6ef', '#f7d774', '#9fb8f0'],
};
const hash = (x, y, i = 0) => {
  let n = (x * 374761393 + y * 668265263 + i * 1274126177) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const tileAtMap = (x, y) => map[y]?.[x] ?? 0;
const isWet = (x, y) => { const v = tileAtMap(x, y); return v === 0 || v === 3; };
const isLand = (x, y) => !isWet(x, y);
const SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]];

const bg = document.createElement('canvas');
bg.width = COLS * TILE; bg.height = ROWS * TILE;
(function paintBackground() {
  const g = bg.getContext('2d');
  const dot = (tx, ty, px, py, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(tx * TILE + px * PX, ty * TILE + py * PX, w * PX, h * PX); };
  const R = (x, y, i, n) => Math.floor(hash(x, y, i) * n);
  // pixels along one edge of a tile (side: 0 top, 1 right, 2 bottom, 3 left)
  const edge = (x, y, side, c, density, seed, inset = 0) => {
    for (let i = 0; i < 10; i++) if (hash(x, y, seed + i) < density) {
      const [px, py] = [[i, inset], [9 - inset, i], [i, 9 - inset], [inset, i]][side];
      dot(x, y, px, py, c);
    }
  };
  const flower = (x, y, px, py, c) => {
    dot(x, y, px - 1, py, c); dot(x, y, px + 1, py, c); dot(x, y, px, py - 1, c); dot(x, y, px, py + 1, c);
    dot(x, y, px, py, '#f7d774'); dot(x, y, px + 1, py + 1, PAL.grassDark); // stem shadow
  };
  const pebble = (x, y, px, py) => { dot(x, y, px, py, PAL.stone, 2, 1); dot(x, y, px, py + 1, PAL.stoneDark, 2, 1); };

  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const v = map[y][x];

    // ---- water (also under the dock) ----
    if (v === 0 || v === 3) {
      const shore = SIDES.some(([a, b]) => isLand(x + a, y + b));
      dot(x, y, 0, 0, shore ? PAL.water : PAL.deep, 10, 10);
      // caustic light lines on the riverbed
      for (let i = 0; i < 3; i++) dot(x, y, R(x, y, 200 + i, 8), R(x, y, 210 + i, 10), PAL.caustic, 2 + R(x, y, 220 + i, 2), 1);
      SIDES.forEach(([a, b], s) => { if (isLand(x + a, y + b)) edge(x, y, s, PAL.foam, .75, 10 + s * 10); });
      // hard shadow cast by the land/dock above and to the left (light comes from top-left)
      if (isLand(x, y - 1)) { dot(x, y, 0, 0, PAL.waterShadow, 10, 2); edge(x, y, 0, PAL.foam, .7, 230, 2); }
      if (tileAtMap(x - 1, y) === 3 && v === 0) dot(x, y, 0, 0, PAL.waterShadow, 2, 10);
      // lily pads out in open water
      if (v === 0 && !shore && hash(x, y, 240) < .09) {
        const px = 2 + R(x, y, 241, 4), py = 2 + R(x, y, 242, 5);
        dot(x, y, px + 1, py + 1, PAL.waterShadow, 4, 3);                 // shadow
        dot(x, y, px, py, PAL.lily, 4, 3); dot(x, y, px + 1, py - 1, PAL.lily, 2, 1); dot(x, y, px + 1, py + 3, PAL.lily, 2, 1);
        dot(x, y, px + 3, py + 1, PAL.deep);                               // notch
        dot(x, y, px, py + 2, PAL.lilyDark, 3, 1); dot(x, y, px + 1, py, PAL.lilyHi);
        if (hash(x, y, 243) < .35) { dot(x, y, px + 1, py + 1, '#f6c1d2'); dot(x, y, px + 2, py + 1, '#ffffff'); }
      }
    }

    // ---- sand ----
    if (v === 1) {
      dot(x, y, 0, 0, PAL.sand, 10, 10);
      for (let i = 0; i < 6; i++) dot(x, y, R(x, y, i, 10), R(x, y, i + 9, 10), PAL.sandDot);
      if (hash(x, y, 300) < .15) pebble(x, y, 1 + R(x, y, 301, 7), 1 + R(x, y, 302, 6));
      SIDES.forEach(([a, b], s) => { if (tileAtMap(x + a, y + b) === 2) edge(x, y, s, PAL.grass, .55, 40 + s * 10); });
    }

    // ---- grass ----
    if (v === 2) {
      dot(x, y, 0, 0, PAL.grass, 10, 10);
      for (let i = 0; i < 4; i++) dot(x, y, R(x, y, i + 20, 9), R(x, y, i + 30, 9), PAL.grass2, 2, 2);
      for (let i = 0; i < 3; i++) dot(x, y, R(x, y, i + 35, 10), R(x, y, i + 38, 10), PAL.grass3);
      for (let i = 0; i < 3; i++) { // "v" tufts with a lit tip
        const px = 1 + R(x, y, i + 40, 8), py = 1 + R(x, y, i + 50, 8);
        dot(x, y, px - 1, py - 1, PAL.grassDark); dot(x, y, px + 1, py - 1, PAL.grassDark); dot(x, y, px, py, PAL.grassDark);
        dot(x, y, px - 1, py - 2, PAL.grass3);
      }
      if (hash(x, y, 60) < .2) flower(x, y, 2 + R(x, y, 61, 6), 2 + R(x, y, 62, 6), PAL.flowers[R(x, y, 63, PAL.flowers.length)]);
      if (hash(x, y, 64) < .08) flower(x, y, 2 + R(x, y, 65, 6), 2 + R(x, y, 66, 6), PAL.flowers[R(x, y, 67, PAL.flowers.length)]);
      if (hash(x, y, 68) < .05) pebble(x, y, 1 + R(x, y, 69, 7), 1 + R(x, y, 70, 7));
      // grass ledge: a darker lip where grass sits above sand or path
      const below = tileAtMap(x, y + 1);
      if (below === 1 || below === 4) { dot(x, y, 0, 9, PAL.grassDark, 10, 1); edge(x, y, 2, PAL.grass2, .5, 71, 1); }
    }

    // ---- dirt path ----
    if (v === 4) {
      dot(x, y, 0, 0, PAL.path, 10, 10);
      for (let i = 0; i < 5; i++) dot(x, y, R(x, y, i + 70, 10), R(x, y, i + 80, 10), PAL.pathDot);
      if (hash(x, y, 85) < .35) pebble(x, y, 1 + R(x, y, 86, 7), 1 + R(x, y, 87, 7));
      SIDES.forEach(([a, b], s) => {
        if (tileAtMap(x + a, y + b) === 2) { edge(x, y, s, PAL.pathEdge, .9, 95 + s * 10, 1); edge(x, y, s, PAL.grass, .6, 90 + s * 10); }
      });
    }

    // ---- earth bank: land that drops into water gets a visible dirt edge ----
    if ((v === 1 || v === 2 || v === 4) && isWet(x, y + 1) && tileAtMap(x, y + 1) !== 3) {
      dot(x, y, 0, 7, PAL.bank, 10, 2); dot(x, y, 0, 9, PAL.bankDark, 10, 1);
      for (let i = 0; i < 3; i++) dot(x, y, R(x, y, 120 + i, 10), 7, PAL.bankDark);
    }

    // ---- dock: planks with highlights, nails and posts ----
    if (v === 3) {
      for (let r = 0; r < 5; r++) {
        dot(x, y, 0, r * 2, r % 2 ? PAL.plank2 : PAL.plank, 10, 2);
        dot(x, y, 0, r * 2, PAL.plankHi, 10, 1);
        dot(x, y, 0, r * 2 + 1, PAL.plankLine, 10, 1);
        dot(x, y, 1 + R(x, y, r + 100, 8), r * 2, PAL.plank2);
        if (hash(x, y, r + 110) < .4) dot(x, y, R(x, y, r + 111, 10), r * 2 + 1, PAL.plank2); // board seam
      }
      const left = tileAtMap(x - 1, y) !== 3, right = tileAtMap(x + 1, y) !== 3;
      if (left) { dot(x, y, 0, 0, PAL.post, 1, 10); dot(x, y, 0, 0, PAL.postHi, 1, 1); }
      if (right) { dot(x, y, 9, 0, PAL.post, 1, 10); dot(x, y, 9, 0, PAL.postHi, 1, 1); }
    }
  }
})();

// Sprites as pixel strings (each char = one art pixel; '.' = transparent)
function playerRows(dir, step) {
  const hair = ['..HHHHHH..', '.HHhHHHHH.', 'HHhHHHHHHH'];
  const face = {
    down: ['HHSSSSSSHH', 'HSSESSESSH', 'HSCSSSSCSH'],
    up: ['HHHHHHHHHH', 'HHHHHHHHHH', '.HHHHHHHH.'],
    right: ['HHHSSSSSSH', 'HHSSSESSES', 'HHSSSSSSCS'],
  }[dir === 'left' ? 'right' : dir];
  const body = ['.sSSSSSSs.', '..BWBBBB..', '.SBBBBBBS.', '..BbBBbB..', '..PPPPPP..'];
  const legs = step ? '..F....F..' : '..FF..FF..';
  return [...hair, ...face, ...body, legs];
}
const PLAYER_PAL = { H: '#6b4a3a', h: '#8a634f', S: '#ffe0c2', s: '#f0c8a4', E: '#3d2b22', C: '#f4a6a6', B: '#f2a0a8', b: '#d9838d', W: '#ffd3d8', P: '#7b8fb8', F: '#5a4636' };
const FOX = [
  '.O......O.', '.OK....KO.', '.OOOOOOOO.', 'OOEOOOOEOO', 'OWWWNNWWWO', '.WWWWWWWW.',
  '..GGGGGG..', '.OGgGGgGO.', '..GGWWGG..', '..OO..OO..', '..DD..DD..',
];
const FOX_PAL = { O: '#e8935a', K: '#f6c1a0', W: '#fff4e6', E: '#3d2b22', N: '#3d2b22', G: '#8fb87a', g: '#6f9a63', D: '#7a4a30' };

const cv = document.getElementById('game'), ctx = cv.getContext('2d');
let selectedItem = null, hover = null, t = 0;

// Pixel sprite with a 1-pixel dark outline (like the reference art)
function drawSprite(rows, pal, cx, bottom, flip = false) {
  const w = rows[0].length, left = Math.round(cx - w * PX / 2), top = Math.round(bottom - rows.length * PX);
  const paint = (color, ox, oy) => rows.forEach((r, j) => { for (let i = 0; i < w; i++) {
    const c = r[flip ? w - 1 - i : i];
    if (c !== '.') { ctx.fillStyle = color || pal[c]; ctx.fillRect(left + i * PX + ox, top + j * PX + oy, PX, PX); }
  } });
  for (const [ox, oy] of [[-PX, 0], [PX, 0], [0, -PX], [0, PX]]) paint(PAL.outline, ox, oy);
  paint(null, 0, 0);
}
// Hard, flat shadow pushed down-right (light from the top-left)
function shadow(cx, bottom, w = 6) {
  ctx.fillStyle = PAL.shadow;
  const x = cx - w * PX / 2 + PX;
  ctx.fillRect(x + PX, bottom - 2 * PX, (w - 2) * PX, PX);
  ctx.fillRect(x, bottom - PX, w * PX, 2 * PX);
  ctx.fillRect(x + PX, bottom + PX, (w - 2) * PX, PX);
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
// single-colour silhouette of an icon (for outlines and cast shadows)
const silCache = {};
function silhouette(id, color) {
  const k = id + color;
  if (silCache[k]) return silCache[k];
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const g = c.getContext('2d');
  g.drawImage(icon(id), 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, 16, 16);
  return silCache[k] = c;
}
const iconURL = id => icon(id).toDataURL();
const BIG = new Set(['tree', 'palm', 'house', 'castle', 'fountain', 'garden', 'fence', 'lamppost', 'christmas-tree', 'mountain']);
function drawItem(id, x, y, alpha = 1) {
  const size = BIG.has(id) ? 56 : 36, cx = x * TILE + TILE / 2, bottom = y * TILE + TILE - 2;
  const left = cx - size / 2, top = bottom - size, o = Math.max(2, Math.round(size / 16));
  if (alpha === 1) {
    // cast shadow: the item's silhouette squashed onto the ground, falling down-right
    ctx.save();
    ctx.setTransform(1, 0, -0.7, -0.3, cx, bottom);
    ctx.drawImage(silhouette(id, '#1c342c'), -size / 2, -size, size, size);
    ctx.restore();
    ctx.globalAlpha = 1;
    // dark pixel outline
    const sil = silhouette(id, PAL.outline);
    for (const [ox, oy] of [[-o, 0], [o, 0], [0, -o], [0, o]]) ctx.drawImage(sil, left + ox, top + oy, size, size);
  }
  ctx.globalAlpha = alpha;
  ctx.drawImage(icon(id), left, top, size, size);
  ctx.globalAlpha = 1;
}

// Town: a separate little island pinned to the bottom-right corner of the screen (its own canvas).
// Clicking it opens the Town window.
function paintTownIsle() {
  const g = document.getElementById('townIsle').getContext('2d');
  const r = (ax, ay, w, h, c) => { g.fillStyle = c; g.fillRect(ax * PX, ay * PX, w * PX, h * PX); };
  // foam ring → earth bank → sand → grass, with stepped (pixel-rounded) corners
  r(3, 1, 24, 18, PAL.foam); r(1, 3, 28, 14, PAL.foam);
  r(4, 2, 22, 16, PAL.sand); r(2, 4, 26, 12, PAL.sand);
  r(4, 15, 22, 2, PAL.bank); r(5, 17, 20, 1, PAL.bankDark); r(2, 14, 26, 1, PAL.bank); r(3, 15, 1, 1, PAL.bankDark);
  r(6, 4, 18, 10, PAL.grass); r(4, 6, 22, 7, PAL.grass);
  r(6, 13, 18, 1, PAL.grassDark);
  r(8, 12, 2, 1, PAL.grassDark); r(20, 5, 1, 2, PAL.grassDark); r(5, 9, 1, 1, PAL.flowers[0]); r(22, 11, 1, 1, PAL.flowers[2]);
  r(12, 13, 2, 1, PAL.stone);
  // two little houses with outlines + hard shadows
  const house = (hx, roof, roofDark) => {
    r(hx + 1, 5, 7, 8, PAL.shadow);                                   // shadow down-right
    r(hx - 1, 3, 8, 1, PAL.outline); r(hx - 2, 4, 1, 3, PAL.outline); r(hx + 7, 4, 1, 3, PAL.outline);
    r(hx, 3, 6, 1, roofDark); r(hx - 1, 4, 8, 3, roof); r(hx - 1, 6, 8, 1, roofDark);
    r(hx, 4, 1, 1, '#fff7e6');
    r(hx - 1, 7, 1, 5, PAL.outline); r(hx + 6, 7, 1, 5, PAL.outline); r(hx - 1, 12, 8, 1, PAL.outline);
    r(hx, 7, 6, 5, '#fff7e6'); r(hx, 11, 6, 1, '#e5c48d');
    r(hx + 2, 9, 2, 3, '#8d6440'); r(hx + 4, 8, 1, 1, '#a6e2dc');
  };
  house(7, '#e07a6a', '#c4605a');
  house(16, '#7fa7d9', '#5f86b8');
  // flag
  r(26, 3, 1, 9, PAL.shadow); r(25, 2, 1, 9, PAL.post); r(26, 2, 3, 2, '#f2c26b'); r(26, 3, 3, 1, '#d9a548');
}

function drawShop() {
  const X0 = SHOP_BLD.x * TILE, Y0 = SHOP_BLD.y * TILE;
  const r = (ax, ay, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(X0 + ax * PX, Y0 + ay * PX, w * PX, h * PX); };
  // hard cast shadow (down-right)
  r(21, -3, 3, 25, PAL.shadow); r(1, 20, 20, 2, PAL.shadow);
  // outline
  r(-1, 6, 22, 15, PAL.outline);
  // walls with plank lines + highlight
  r(0, 6, 20, 14, '#caa070');
  for (let y = 8; y < 20; y += 3) { r(0, y, 20, 1, '#b98b5c'); r(0, y + 1, 20, 1, '#d6af80'); }
  r(0, 6, 1, 14, '#ddb886'); r(19, 6, 1, 14, '#a97d50');
  r(0, 19, 20, 1, '#8d6440');
  // windows with flower boxes
  for (const wx of [2, 14]) {
    r(wx, 9, 4, 4, '#8d6440'); r(wx + 1, 10, 2, 2, '#a6e2dc'); r(wx + 1, 10, 1, 1, '#d4f3ea');
    r(wx - 1, 13, 6, 1, '#7e5636');
    r(wx, 12, 1, 1, '#f6c1d2'); r(wx + 2, 12, 1, 1, '#ffffff'); r(wx + 3, 12, 1, 1, '#f7d774'); r(wx + 1, 12, 1, 1, PAL.grassDark);
  }
  // door
  r(8, 12, 4, 8, '#5f3f2a'); r(9, 13, 2, 7, '#7e5636'); r(9, 13, 1, 7, '#8d6440'); r(10, 16, 1, 1, '#f2c26b');
  // awning stripes over the door
  for (let i = 0; i < 6; i++) r(7 + i, 10, 1, 2, i % 2 ? '#fff7e6' : '#e07a6a');
  r(7, 12, 6, 1, PAL.shadow);
  // roof with shingles + outline
  r(2, -7, 16, 1, PAL.outline); r(0, -6, 2, 1, PAL.outline); r(18, -6, 2, 1, PAL.outline); r(-2, -5, 2, 11, PAL.outline); r(20, -5, 2, 11, PAL.outline);
  r(3, -6, 14, 1, '#c4605a'); r(1, -5, 18, 1, '#e07a6a');
  for (let y = -4; y < 6; y++) {
    r(-1, y, 22, 1, y % 2 ? '#d46c5f' : '#e07a6a');
    for (let x = (y & 1) * 2; x < 21; x += 4) r(-1 + x, y, 1, 1, '#b85550'); // shingle seams
  }
  r(-1, -4, 22, 1, '#ec9a8a');            // ridge highlight
  r(-1, 5, 22, 1, '#8d4a44');
  // sign
  r(6, -2, 10, 6, PAL.shadow);
  r(5, -3, 10, 6, '#7e5636'); r(6, -2, 8, 4, '#fff7e6');
  ctx.fillStyle = PAL.outline; ctx.font = '13px "VCR OSD Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('SHOP', X0 + 10 * PX, Y0 + 0 * PX + 1);
}

// A town project, drawn in stages as its progress f (0..1) grows:
// stakes → material piles → foundation → scaffolding → walls → windows/door → roof → scaffolding comes down → decorations
const ROOFS = [['#e07a6a', '#c4605a'], ['#7fa7d9', '#5f86b8'], ['#9cc98a', '#6f9a63'], ['#f2c26b', '#c9973f'], ['#c7a6e0', '#9a7cbf']];
function drawBuild(b) {
  const f = b.f, X0 = b.x * TILE, Y0 = b.y * TILE;
  const r = (ax, ay, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(X0 + ax * PX, Y0 + ay * PX, w * PX, h * PX); };
  const [roof, roofDark] = ROOFS[[...b.name].reduce((t, c) => t + c.charCodeAt(0), 0) % ROOFS.length];
  const wood = '#caa070', woodDark = '#8d6440', woodLine = '#b98b5c', stone = '#ddd3bf', stoneDark = '#a39880', pole = '#b98b5c';
  const wallH = f >= .62 ? 11 : f >= .55 ? 8 : f >= .45 ? 4 : 0;   // wall rows above the foundation
  const roofOn = f >= .85, raftersOn = f >= .78;

  // hard shadow (down-right), grows with the building
  if (roofOn) r(21, -2, 3, 19, PAL.shadow);
  else if (wallH) r(21, 17 - wallH, 2, wallH, PAL.shadow);

  // 1. clearing: stakes and string marking out the plot
  if (f < .15) {
    r(2, 10, 16, 8, 'rgba(140,100,55,.28)');
    r(1, 9, 18, 1, '#efe3c2'); r(1, 18, 18, 1, '#efe3c2'); r(1, 9, 1, 10, '#efe3c2'); r(18, 9, 1, 10, '#efe3c2');
    for (const [sx, sy] of [[0, 8], [18, 8], [0, 17], [18, 17]]) { r(sx, sy, 2, 3, woodDark); r(sx, sy, 2, 1, wood); }
  }
  // 2. foundation slab
  if (f >= .15) {
    r(-1, 16, 22, 4, PAL.outline); r(0, 16, 20, 3, stoneDark); r(0, 16, 20, 1, stone);
    for (const x of [1, 6, 11, 16]) r(x, 17, 3, 1, stone);
  }
  // 3. walls rising in steps, then windows and a door frame
  if (wallH) {
    const top = 16 - wallH;
    r(-1, top, 1, wallH, PAL.outline); r(20, top, 1, wallH, PAL.outline);
    r(0, top, 20, wallH, wood);
    for (let y = top + 2; y < 16; y += 3) r(0, y, 20, 1, woodLine);
    r(0, top, 1, wallH, '#ddb886');
    if (wallH < 11) r(0, top, 20, 1, '#e8cba0'); // unfinished top edge
  }
  if (f >= .62) { r(8, 10, 4, 6, woodDark); r(9, 11, 2, 5, f >= 1 ? '#6e4a31' : '#3e2f22'); }
  if (f >= .7) for (const wx of [2, 14]) { r(wx, 7, 4, 4, woodDark); r(wx + 1, 8, 2, 2, '#a6e2dc'); r(wx + 1, 8, 1, 1, '#d4f3ea'); }
  // 4. roof: bare rafters first, then shingles
  if (raftersOn && !roofOn) { r(-1, 4, 22, 1, woodDark); for (let x = 0; x < 20; x += 3) r(x, 0, 1, 5, pole); r(-1, 0, 22, 1, woodDark); }
  if (roofOn) {
    r(2, -5, 16, 1, PAL.outline); r(-2, -4, 1, 9, PAL.outline); r(21, -4, 1, 9, PAL.outline); r(0, -4, 2, 1, PAL.outline); r(18, -4, 2, 1, PAL.outline);
    r(2, -4, 16, 1, roofDark);
    for (let y = -3; y < 5; y++) {
      r(-1, y, 22, 1, (y & 1) ? roofDark : roof);
      for (let x = (y & 1) * 2; x < 21; x += 4) r(-1 + x, y, 1, 1, roofDark);
    }
    r(-1, -3, 22, 1, '#fff7e6'); r(-1, -3, 22, 1, roof); r(-1, 4, 22, 1, PAL.outline);
  }
  // 5. scaffolding (poles, platforms, ladder) — comes down at the end
  if (f >= .25 && f < .92) {
    r(-3, 1, 1, 16, pole); r(22, 1, 1, 16, pole);
    if (f >= .32) {
      r(-4, 6, 28, 1, woodDark); r(-4, 11, 28, 1, woodDark);
      for (let i = 0; i < 5; i++) { r(-3 + i, 1 + i, 1, 1, pole); r(22 - i, 1 + i, 1, 1, pole); } // cross braces
    }
    if (f >= .38) { r(16, 6, 1, 11, pole); r(18, 6, 1, 11, pole); for (let y = 7; y < 17; y += 2) r(16, y, 3, 1, pole); }
  }
  // 6. material piles in front (planks, bricks) until the very end
  if (f >= .05 && f < .95) {
    r(0, 21, 6, 1, PAL.shadow); r(-1, 19, 6, 2, woodDark); r(-1, 19, 6, 1, wood); r(0, 18, 5, 1, wood); r(0, 18, 5, 1, '#ddb886');
  }
  if (f >= .1 && f < .95) {
    r(16, 21, 6, 1, PAL.shadow); r(15, 19, 6, 2, '#c4605a'); r(16, 18, 4, 1, '#e07a6a');
    r(17, 19, 1, 1, '#8d4a44'); r(19, 20, 1, 1, '#8d4a44');
  }
  // 7. finished: decorations
  if (f >= 1) {
    r(10, 16, 1, 1, '#f2c26b');                                                     // door knob
    for (const wx of [2, 14]) { r(wx - 1, 11, 6, 1, '#7e5636'); r(wx, 10, 1, 1, '#f6c1d2'); r(wx + 2, 10, 1, 1, '#ffffff'); r(wx + 3, 10, 1, 1, '#f7d774'); }
    r(17, -10, 1, 6, PAL.post); r(18, -10, 3, 2, roof); r(18, -9, 3, 1, roofDark);    // flag
    r(-3, 15, 4, 4, PAL.grassDark); r(-2, 15, 2, 1, PAL.grass3);                      // bushes
    r(19, 15, 4, 4, PAL.grassDark); r(20, 15, 2, 1, PAL.grass3);
    r(-4, 9, 1, 8, PAL.post); r(-5, 8, 3, 2, '#f2c26b');                              // lantern
    r(8, 20, 4, 1, stone); r(9, 21, 2, 1, stone);                                     // stepping stones
  }
}

function drawBubble(text, cx, bottom) {
  ctx.font = '16px "VCR OSD Mono", monospace';
  const w = Math.ceil(ctx.measureText(text).width / PX) * PX + 6 * PX, h = 6 * PX;
  const x = Math.round(cx - w / 2), y = bottom - h;
  ctx.fillStyle = PAL.shadow; ctx.fillRect(x + 2 * PX, y + PX, w - 2 * PX, h);  // hard drop shadow
  ctx.fillStyle = PAL.outline; ctx.fillRect(x + PX, y, w - 2 * PX, h); ctx.fillRect(x, y + PX, w, h - 2 * PX);
  ctx.fillStyle = '#fff7e6'; ctx.fillRect(x + PX, y + PX, w - 2 * PX, h - 2 * PX);
  ctx.fillStyle = PAL.outline; ctx.fillRect(cx - PX, y + h, 2 * PX, PX);
  ctx.fillStyle = PAL.outline; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
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
      ctx.fillRect(x * TILE + Math.floor(hash(x, y, phase + 1) * 6) * PX, y * TILE + (2 + Math.floor(hash(x, y, phase + 2) * 7)) * PX, 3 * PX, PX);
    }
  }

  // depth-sorted entities
  const step = P.moving && Math.floor(t / 8) % 2;
  const ents = [
    ...S.placed.map(p => ({ y: p.y, draw: () => drawItem(p.id, p.x, p.y) })),
    { y: SHOP_BLD.y + SHOP_BLD.h - 1 + .5, draw: drawShop },
    ...townBuilds.map(b => ({ y: b.y + 1.5, draw: () => drawBuild(b) })),
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
  else if (nearShop()) drawBubble('Space to enter shop', (SHOP_BLD.x + 1) * TILE, (SHOP_BLD.y + 2) * TILE + 2 * PX);
  else {
    const b = townBuilds.find(b => P.x >= b.x - 1 && P.x <= b.x + 2 && P.y >= b.y - 1 && P.y <= b.y + 2);
    if (b) drawBubble(b.f >= 1 ? `${b.name} ✓` : `${b.name} · ${Math.floor(b.f * 100)}%`, (b.x + 1) * TILE, b.y * TILE - 7 * PX);
  }

  // placement preview: ghost item + pixel corner brackets
  if (selectedItem && hover) {
    drawItem(selectedItem, hover.x, hover.y, .6);
    ctx.fillStyle = canPlace(hover.x, hover.y) ? '#fff7e6' : '#e0705c';
    const X = hover.x * TILE, Y = hover.y * TILE, L = 3 * PX;
    [[X, Y], [X + TILE - L, Y], [X, Y + TILE - PX], [X + TILE - L, Y + TILE - PX]].forEach(([a, b]) => ctx.fillRect(a, b, L, PX));
    [[X, Y], [X + TILE - PX, Y], [X, Y + TILE - L], [X + TILE - PX, Y + TILE - L]].forEach(([a, b]) => ctx.fillRect(a, b, PX, L));
  }
};

// ---------- Sea: the same animated water, filling the whole screen behind the island ----------
const sea = document.getElementById('sea'), seaCtx = sea.getContext('2d');
let seaBase = null, seaOff = { x: 0, y: 0 }, seaTiles = [];
function sizeSea() {
  const r = cv.getBoundingClientRect(), k = r.width / cv.width || 1; // screen px per game px
  sea.width = Math.ceil(innerWidth / k); sea.height = Math.ceil(innerHeight / k);
  seaOff = { x: r.left / k, y: r.top / k };                          // where the island canvas sits, in game px
  seaBase = document.createElement('canvas'); seaBase.width = sea.width; seaBase.height = sea.height;
  const g = seaBase.getContext('2d');
  g.fillStyle = PAL.deep; g.fillRect(0, 0, sea.width, sea.height);
  seaTiles = [];
  const x0 = Math.floor(-seaOff.x / TILE), x1 = Math.ceil((sea.width - seaOff.x) / TILE);
  const y0 = Math.floor(-seaOff.y / TILE), y1 = Math.ceil((sea.height - seaOff.y) / TILE);
  for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
    if (tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS) continue;       // the island canvas covers these
    seaTiles.push([tx, ty]);
    const X = seaOff.x + tx * TILE, Y = seaOff.y + ty * TILE;
    g.fillStyle = PAL.caustic;
    for (let i = 0; i < 3; i++) g.fillRect(X + Math.floor(hash(tx, ty, 200 + i) * 8) * PX, Y + Math.floor(hash(tx, ty, 210 + i) * 10) * PX, (2 + Math.floor(hash(tx, ty, 220 + i) * 2)) * PX, PX);
    if (hash(tx, ty, 240) < .06) { // the odd lily pad out at sea
      const px = X + (2 + Math.floor(hash(tx, ty, 241) * 4)) * PX, py = Y + (2 + Math.floor(hash(tx, ty, 242) * 5)) * PX;
      g.fillStyle = PAL.waterShadow; g.fillRect(px + PX, py + PX, 4 * PX, 3 * PX);
      g.fillStyle = PAL.lily; g.fillRect(px, py, 4 * PX, 3 * PX);
      g.fillStyle = PAL.lilyDark; g.fillRect(px, py + 2 * PX, 3 * PX, PX);
      g.fillStyle = PAL.deep; g.fillRect(px + 3 * PX, py + PX, PX, PX);
    }
  }
}
function drawSea() {
  if (!seaBase) return;
  seaCtx.imageSmoothingEnabled = false;
  seaCtx.drawImage(seaBase, 0, 0);
  seaCtx.fillStyle = PAL.ripple;
  for (const [tx, ty] of seaTiles) {
    const phase = Math.floor(t / 40 + hash(tx, ty, 7) * 8);
    if (hash(tx, ty, phase) < .3)
      seaCtx.fillRect(seaOff.x + tx * TILE + Math.floor(hash(tx, ty, phase + 1) * 6) * PX, seaOff.y + ty * TILE + (2 + Math.floor(hash(tx, ty, phase + 2) * 7)) * PX, 3 * PX, PX);
  }
}
addEventListener('resize', sizeSea);
sizeSea();

// ---------- Player movement (arrow keys) ----------
const P = { x: S.player.x, y: S.player.y, rx: S.player.x, ry: S.player.y, dir: 'down', moving: false };
const keys = {};
// WASD works exactly like the arrow keys
const WASD = { w: 'ArrowUp', a: 'ArrowLeft', s: 'ArrowDown', d: 'ArrowRight' };
const moveKey = k => k.startsWith('Arrow') ? k : WASD[k.toLowerCase()];
const typing = () => ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);
addEventListener('keydown', e => {
  if (document.body.classList.contains('intro-open')) return;
  if (anyOpen()) { if (e.key === 'Escape' && !window.closeTownDetail?.()) closePanels(); return; }
  if (typing()) return;
  const dirKey = moveKey(e.key);
  if (dirKey) { keys[dirKey] = true; e.preventDefault(); }
  if (e.key === ' ') { e.preventDefault(); if (nearVillager()) openChat(); else if (nearShop()) openPanel('shop'); }
  if (e.key === 'Escape') { selectedItem = null; renderInventory(); }
});
addEventListener('keyup', e => { const k = moveKey(e.key); if (k) keys[k] = false; });

function update() {
  const arrived = Math.abs(P.rx - P.x) < .01 && Math.abs(P.ry - P.y) < .01;
  if (arrived) {
    P.rx = P.x; P.ry = P.y;
    let dx = 0, dy = 0;
    if (keys.ArrowLeft) { dx = -1; P.dir = 'left'; } else if (keys.ArrowRight) { dx = 1; P.dir = 'right'; }
    else if (keys.ArrowUp) { dy = -1; P.dir = 'up'; } else if (keys.ArrowDown) { dy = 1; P.dir = 'down'; }
    P.moving = !!(dx || dy);
    if (P.moving && walkable(P.x + dx, P.y + dy)) {
      P.x += dx; P.y += dy; S.player = { x: P.x, y: P.y }; saveLocal();
      publishTutorialPosition();
    } // walking: browser only, no cloud write
  } else {
    P.rx += Math.sign(P.x - P.rx) * Math.min(.2, Math.abs(P.x - P.rx));
    P.ry += Math.sign(P.y - P.ry) * Math.min(.2, Math.abs(P.y - P.ry));
  }
}
const nearVillager = () => Math.abs(P.x - VILLAGER.x) + Math.abs(P.y - VILLAGER.y) <= 1;
const nearShop = () => P.y === SHOP_BLD.y + SHOP_BLD.h && P.x >= SHOP_BLD.x && P.x < SHOP_BLD.x + SHOP_BLD.w;
function publishTutorialPosition() {
  window.dispatchEvent(new CustomEvent('fmi:player-position', {
    detail: {
      maple: { x: VILLAGER.x, y: VILLAGER.y, tile: TILE },
      shop: { x: SHOP_BLD.x + SHOP_BLD.w / 2 - .5, y: SHOP_BLD.y + SHOP_BLD.h - .5, tile: TILE },
      nearMaple: nearVillager(),
      nearShop: nearShop(),
    },
  }));
}
window.addEventListener('fmi:tutorial-start', () => {
  closePanels();
  publishTutorialPosition();
});
(function loop() { update(); draw(); drawSea(); requestAnimationFrame(loop); })();

// ---------- Placing items ----------
const tileAt = e => { const r = cv.getBoundingClientRect(); return { x: Math.floor((e.clientX - r.left) * (cv.width / r.width) / TILE), y: Math.floor((e.clientY - r.top) * (cv.height / r.height) / TILE) }; };
const canPlace = (x, y) => map[y]?.[x] > 0 && !inShop(x, y) && !inPlot(x, y) && !S.placed.some(p => p.x === x && p.y === y) && !(x === P.x && y === P.y) && !(x === VILLAGER.x && y === VILLAGER.y);
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
  $('coins').textContent = S.coins.toLocaleString();
  $('saved').textContent = `$${S.saved.toLocaleString()}`;
  $('streak').textContent = S.streak;
  $('shopCoins').textContent = `🪙 ${S.coins.toLocaleString()}`;
}
// ---------- Pop-up windows ----------
// "side" panels (daily) sit on the right and don't block walking; the rest are centred pop-ups
const anyOpen = () => !!document.querySelector('.modal:not(.hidden):not(.side)');
function closePanels() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.querySelectorAll('[data-open]').forEach(b => b.classList.remove('active'));
  document.activeElement?.blur?.();
  window.dispatchEvent(new Event('fmi:panels-closed'));
}
function openPanel(name) {
  const el = $('panel-' + name), side = el.classList.contains('side');
  const wasOpen = !el.classList.contains('hidden');
  closePanels();
  if (side && wasOpen) return; // clicking the same button again closes it
  el.classList.remove('hidden');
  document.querySelector(`[data-open="${name}"]`)?.classList.add('active');
  window.dispatchEvent(new CustomEvent('fmi:panel-opened', { detail: { name } }));
  if (!side) {
    Object.keys(keys).forEach(k => keys[k] = false); // don't keep walking behind a pop-up
    el.querySelector('.close')?.focus();
  }
}
document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openPanel(b.dataset.open));
paintTownIsle();
// "?" button: controls popover
$('helpBtn').onclick = e => { e.stopPropagation(); $('helpPop').classList.toggle('hidden'); $('helpBtn').classList.toggle('active'); };
addEventListener('click', e => { if (!e.target.closest('#helpPop')) { $('helpPop').classList.add('hidden'); $('helpBtn').classList.remove('active'); } });
document.querySelectorAll('[data-close]').forEach(b => b.onclick = closePanels);
document.querySelectorAll('.modal').forEach(m => m.addEventListener('mousedown', e => { if (e.target === m) closePanels(); }));

// ---------- Bank ----------
// consecutive weeks (ending this week) with at least one deposit
function weekStreak() { let n = 0; const d = new Date(); while (S.weeks.includes(weekKey(d))) { n++; d.setDate(d.getDate() - 7); } return n; }

// Log real-life saving. Coins come only from consistency.
function logSaving(amt, type) {
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
  const coins = rewards.reduce((t, r) => t + r[1], 0);
  S.coins += coins;
  S.history.unshift({ amt, type, date: today(), coins });
  save(); renderAll();
  toast(coins ? `+${coins} 🪙 · ${rewards.map(r => r[0]).join(' · ')}` : `$${amt} added to your progress. Coins come from showing up — see you tomorrow!`);
  if (coins) window.onHabit?.(rewards.map(r => r[0].toLowerCase()).join(' · '), coins);
  completeMission('deposit');
}
// ---------- Savings accounts (the "Where did it go?" dropdown) ----------
let lastAcct = null;
function renderAccounts() {
  const sel = $('depType'), cur = lastAcct ?? sel.value;
  sel.innerHTML = S.accounts.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('')
    + '<option value="__config">⚙ Configure accounts…</option>';
  sel.value = S.accounts.includes(cur) ? cur : S.accounts[0];
  lastAcct = sel.value;
  $('acctList').innerHTML = S.accounts.map((a, i) => `<li><span>${esc(a)}</span>
    <button type="button" data-rm="${i}" aria-label="Remove ${esc(a)}" ${S.accounts.length < 2 ? 'disabled title="Keep at least one account"' : ''}>✕</button></li>`).join('');
  $('acctList').querySelectorAll('[data-rm]').forEach(b => b.onclick = () => {
    S.accounts.splice(+b.dataset.rm, 1); save(); renderAccounts();
  });
}
$('depType').onchange = () => {
  const sel = $('depType');
  if (sel.value === '__config') { sel.value = lastAcct; $('acctEditor').classList.remove('hidden'); $('acctName').focus(); }
  else lastAcct = sel.value;
};
$('acctAdd').onclick = () => {
  const n = $('acctName').value.trim();
  if (!n) return toast('Type an account name first');
  if (S.accounts.includes(n)) return toast('You already have that account');
  S.accounts.push(n); lastAcct = n; $('acctName').value = '';
  save(); renderAccounts();
};
$('acctName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('acctAdd').click(); } });
$('acctDone').onclick = () => $('acctEditor').classList.add('hidden');

document.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
  const inp = $('depAmount');
  inp.value = (Math.floor(+inp.value) || 0) + +b.dataset.add;
});
$('depositBtn').onclick = () => {
  const amt = Math.floor(+$('depAmount').value);
  if (!(amt > 0)) return toast('Enter an amount');
  logSaving(amt, $('depType').value);
  $('depAmount').value = '';
  closePanels();
};
function renderRules() {
  const ws = weekStreak();
  $('rules').innerHTML = `
    <li><span>${S.lastDepositDay === today() ? '✅' : '⬜'} Save anything today</span><b>+${REWARDS.dailyLog}🪙</b></li>
    <li><span>${S.weeks.includes(weekKey()) ? '✅' : '⬜'} First deposit this week</span><b>+${REWARDS.firstThisWeek}🪙</b></li>
    <li><span>${ws >= 3 ? '✅' : '⬜'} 3+ weeks in a row (now ${ws})</span><b>+${REWARDS.weekStreak}🪙/wk</b></li>`;
}
function renderHistory() {
  const mode = $('histSort').value, grouped = mode === 'type';
  const key = h => h.type || 'Savings';
  let rows = S.history.map((h, i) => ({ ...h, i }));          // S.history is newest-first
  if (mode === 'old') rows.reverse();
  if (grouped) rows.sort((a, b) => key(a).localeCompare(key(b)) || a.i - b.i);
  let last = null;
  $('history').innerHTML = rows.map(h => {
    let head = '';
    if (grouped && key(h) !== last) {
      last = key(h);
      const total = rows.filter(r => key(r) === last).reduce((t, r) => t + r.amt, 0);
      head = `<li class="group"><span>🏦 ${esc(last)}</span><b>$${total.toLocaleString()}</b></li>`;
    }
    return head + `<li>
      <span class="date">${h.date}</span>
      <span><span class="amt">$${h.amt}</span> → ${esc(h.type || 'Savings')}</span>
      <span class="coins">+${h.coins ?? 0} 🪙</span></li>`;
  }).join('') || '<li><span class="empty">No savings logged yet. Open the bank to log your first!</span></li>';
}
$('histSort').onchange = renderHistory;

// ---------- Shop / Inventory ----------
function renderShop() {
  const category = $('shopCategory').value;
  const items = SHOP.filter(item => category === 'all' || item.category === category);
  $('shop').innerHTML = items.map(s => `<button class="item ${S.coins < s.price ? 'locked' : ''}" data-id="${s.id}">
      <img src="${iconURL(s.id)}" alt=""><span class="name">${s.name}</span><span class="price">🪙 ${s.price}</span>
      ${S.coins < s.price ? `<span class="need">need ${s.price - S.coins} more</span>` : ''}</button>`).join('');
  $('shop').querySelectorAll('.item').forEach(el => el.onclick = () => {
    const s = SHOP.find(i => i.id === el.dataset.id);
    if (S.coins < s.price) return toast(`Need ${s.price - S.coins} more 🪙 — keep your saving streak going!`);
    S.coins -= s.price; S.inventory[s.id] = (S.inventory[s.id] || 0) + 1;
    save(); renderAll(); toast(`Bought ${s.name}! It's in your bag at the bottom.`);
  });
}
$('shopCategory').onchange = renderShop;
function renderInventory() {
  const ids = Object.keys(S.inventory);
  $('inventory').innerHTML = ids.map(id => { const s = SHOP.find(i => i.id === id); return `<button class="item ${selectedItem === id ? 'selected' : ''}" data-id="${id}" title="${s.name}" aria-label="${s.name}, ${S.inventory[id]} in bag"><img src="${iconURL(s.id)}" alt=""><span class="count">×${S.inventory[id]}</span></button>`; }).join('') || '<span class="empty">Empty. Visit the shop!</span>';
  $('inventory').querySelectorAll('.item').forEach(el => el.onclick = () => {
    selectedItem = selectedItem === el.dataset.id ? null : el.dataset.id;
    renderInventory(); if (selectedItem) toast(`Click a spot on your island to place the ${SHOP.find(i => i.id === selectedItem).name}`);
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
  const isDone = m => S.missionsDone.includes(m.id);
  const order = [...MISSIONS].sort((a, b) => isDone(a) - isDone(b)); // completed tasks sink to the bottom
  $('missions').innerHTML = order.map(m => {
    const done = isDone(m);
    return `<li class="mission ${done ? 'done' : ''}" data-id="${m.id}" role="checkbox" aria-checked="${done}" tabindex="${done ? -1 : 0}">
      <i class="box" aria-hidden="true"></i><span class="text">${m.text}</span><b>+${m.reward}🪙</b></li>`;
  }).join('');
  $('missions').querySelectorAll('li:not(.done)').forEach(li => {
    li.onclick = () => tickMission(li);
    li.onkeydown = e => { if (e.key === 'Enter') tickMission(li); };
  });
  $('streakInfo').innerHTML = `🔥 Current streak: <b>${S.streak} day${S.streak === 1 ? '' : 's'}</b>. ${S.lastStreakDay === today() ? 'Streak secured for today!' : 'Complete a mission to keep it going!'}`;
}

// Ticking a task: tasks that need a real action take you there; the rest tick off with a strike-through.
function tickMission(li) {
  const id = li.dataset.id, m = MISSIONS.find(x => x.id === id);
  if (li.classList.contains('striking')) return;
  if (m.auto) {
    if (id === 'deposit') { toast('Log any amount in the bank to tick this off'); return openPanel('bank'); }
    if (id === 'goal') { toast('Add savings to a goal to tick this off'); return openPanel('goals'); }
    if (id === 'chat') return toast('Walk up to Maple 🦊 and press Space to ask a question');
  }
  li.classList.add('striking');
  setTimeout(() => completeMission(id), 600); // let the strike animation play, then it drops to the bottom
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
  closePanels(); Object.keys(keys).forEach(k => keys[k] = false);
  $('chat').classList.remove('hidden');
  window.dispatchEvent(new Event('fmi:maple-chat-opened'));
  if (!$('chatLog').children.length) addMsg(`Hey there! I'm Maple 🦊. You've saved $${S.saved} so far — future you is cheering! Ask me about TFSAs, budgeting, FHSAs...`, 'bot');
  $('chatInput').focus();
}
function closeChat() { closePanels(); }
$('closeChat').onclick = closeChat;
$('chatForm').onsubmit = async e => {
  e.preventDefault();
  const q = $('chatInput').value.trim(); if (!q) return;
  $('chatInput').value = ''; addMsg(q, 'me');
  addMsg(await askVillager(q), 'bot');
  completeMission('chat');
};
$('chatInput').addEventListener('keydown', e => { if (e.key === 'Escape') closeChat(); });

function renderAll() {
  renderAccounts(); renderStats(); renderHistory(); renderRules(); renderShop(); renderInventory();
  window.renderPersonalGoals?.();
  renderMissions();
}
renderAll();

if (document.body.classList.contains('intro-open')) {
  new MutationObserver((_, obs) => {
    if (!document.body.classList.contains('intro-open')) {
      obs.disconnect();
      if (!document.body.classList.contains('tutorial-open')) openPanel('bank');
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
} else openPanel('bank');

// Called by cloud.js when the cloud copy is newer than this browser's copy.
window.loadCloudState = data => {
  S = Object.assign(defaultState(), data);
  migrateLegacyGoals();
  try { localStorage.setItem('fmi', JSON.stringify(S)); } catch {}
  Object.assign(P, { x: S.player.x, y: S.player.y, rx: S.player.x, ry: S.player.y, moving: false });
  publishTutorialPosition();
  rollDay(); renderAll();
};
window.getState = () => S;
window.hasLocalSave = () => hadLocalSave;
window.saveGame = () => save();
window.toast = toast;
