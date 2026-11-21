// ===== Future Me Island — MVP =====
// The island is a 40×28-tile world; the view (camera) follows the player around it.
const TILE = 40, COLS = 40, ROWS = 28;
// Coins reward the HABIT, not the amount. Dollars only fill your Wish Jars.
const REWARDS = { dailyLog: 10, firstThisWeek: 50, weekStreak: 150, jarFilled: 300 };

const SHOP = [
  { id: 'flower', name: 'Tulip', price: 30 },
  { id: 'tree', name: 'Oak Tree', price: 80 },
  { id: 'palm', name: 'Palm Tree', price: 100 },
  { id: 'bench', name: 'Chair', price: 120 },
  { id: 'lamp', name: 'Lantern', price: 150 },
  { id: 'fountain', name: 'Fountain', price: 400 },
  { id: 'tent', name: 'Tent', price: 250 },
  { id: 'house', name: 'Dream Home', price: 2000 },
  { id: 'car', name: 'First Car', price: 1200 },
  { id: 'plane', name: 'Travel Fund', price: 800 },
  { id: 'grad', name: 'Diploma', price: 600 },
  { id: 'castle', name: 'Castle', price: 5000 },
  { id: 'sunflower', name: 'Sunflower', price: 40 },
  { id: 'mushroom', name: 'Mushroom', price: 35 },
  { id: 'rock', name: 'Boulder', price: 50 },
  { id: 'log', name: 'Log Seat', price: 60 },
  { id: 'potted', name: 'Potted Plant', price: 70 },
  { id: 'basket', name: 'Picnic Basket', price: 80 },
  { id: 'blossom', name: 'Cherry Blossom', price: 90 },
  { id: 'pine', name: 'Pine Tree', price: 90 },
  { id: 'mailbox', name: 'Mailbox', price: 100 },
  { id: 'umbrella', name: 'Beach Umbrella', price: 180 },
  { id: 'canoe', name: 'Canoe', price: 350 },
  { id: 'playground', name: 'Slide', price: 450 },
  { id: 'hut', name: 'Cozy Hut', price: 700 },
  { id: 'ferris', name: 'Ferris Wheel', price: 3000 },
].sort((a, b) => a.price - b.price);
// Path styles: buy once in the shop, then pave/unpave anywhere in edit mode
const PATH_KITS = [
  { id: 'dirt', name: 'Dirt Path', price: 0 },
  { id: 'wood', name: 'Boardwalk', price: 120 },
  { id: 'stone', name: 'Cobblestone', price: 150 },
  { id: 'brick', name: 'Red Brick', price: 220 },
];
// small things you can walk over
const WALK_OVER = new Set(['flower', 'sunflower', 'mushroom']);

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
  goals: [], personalGoals: [], streak: 0, lastStreakDay: null, missionsDay: today(), missionsDone: [],
  player: { x: 19, y: 15 }, weeks: [], lastDepositDay: null, worldV: 3,
  accounts: ['High-interest savings', 'TFSA', 'RRSP', 'FHSA (first home)'],
  paths: {},            // "x,y" -> path style, or 'none' where a default road was removed
  pathKits: ['dirt'],   // path styles you own (bought in the shop)
  layout: {},           // where you moved the shop / Maple: { shop: {x,y}, fox: {x,y} }
  buildPos: {},         // where you moved each town building: { key: {x,y} }
  visionBoard: { selections: null, unlocked: 0 },
  dailyStar: { date: null, games: [], completed: false, score: null, reward: 0, rounds: [] },
});
let S;
let hadLocalSave = false; // a brand-new local island must never overwrite the cloud copy
try {
  const raw = localStorage.getItem('fmi');
  hadLocalSave = !!raw;
  const saved = JSON.parse(raw) || {};
  S = Object.assign(defaultState(), saved);
  if (raw) S.worldV = saved.worldV || 0; // an old save has no worldV: don't let the default hide that
} catch { S = defaultState(); }
// Islands saved before the bigger world (20×14) shift by (+10, +7) so everything keeps its place.
// (Runs once the map exists — see migrateWorld() after the map is built.)
const onLand = (x, y) => (map[y]?.[x] ?? 0) > 0;
function migrateWorld() {
  const shift = () => {
    S.placed = (S.placed || []).map(p => ({ ...p, x: p.x + 10, y: p.y + 7 }));
    S.player = { x: (S.player?.x ?? 9) + 10, y: (S.player?.y ?? 8) + 7 };
  };
  if ((S.worldV || 0) < 2) shift();
  // repair: an earlier bug marked some old saves as v2 without moving them (player left out at sea)
  else if (S.worldV === 2 && !onLand(S.player.x, S.player.y) && onLand(S.player.x + 10, S.player.y + 7)) shift();
  // safety net: never start the player in the water
  if (!onLand(S.player.x, S.player.y)) S.player = { x: 19, y: 15 };
  S.worldV = 3;
}
// stamp=false for automatic housekeeping (e.g. daily reset) so it doesn't count as "newer" than the cloud
const saveLocal = () => { try { localStorage.setItem('fmi', JSON.stringify(S)); } catch {} };
const save = (stamp = true) => {
  if (stamp) S.updatedAt = Date.now();
  saveLocal();
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
    const dx = (x - COLS / 2 + .5) / 17.5, dy = (y - ROWS / 2 + .5) / 12;
    const d = dx * dx + dy * dy + .07 * Math.sin(x * .9 + y * .4) + .05 * Math.sin(y * 1.3 - x * .5) + .03 * Math.sin(x * 2.1 + y * 1.7);
    map[y].push(d > 0.95 ? 0 : d > 0.78 ? 1 : 2);
  }
}
// a cove in the north-east with a sandy rim
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
  const e = ((x - 30.5) / 2.6) ** 2 + ((y - 9.5) / 1.8) ** 2;
  if (e < 1) map[y][x] = 0; else if (e < 1.6 && map[y][x] === 2) map[y][x] = 1;
}
const terrain = map.map(r => r.slice()); // the ground before any paths (what "unpave" restores)
// paths: shop door → south dock, plus an east–west road through the middle
for (let y = 11; y < ROWS; y++) for (const x of [19, 20]) {
  if (map[y][x] === 2) map[y][x] = 4; else if (map[y][x] === 0 && y > 20) map[y][x] = 3;
}
for (let x = 8; x < 33; x++) if (map[15][x] === 2) map[15][x] = 4;
const roadMap = map.map(r => r.slice());                                // the island's starting roads
const pathType = map.map(r => r.map(v => (v === 4 ? 'dirt' : null)));  // style of each path tile
const canPave = (x, y) => terrain[y]?.[x] === 1 || terrain[y]?.[x] === 2; // paths go on grass and sand
function applyPath(x, y, type) {                                        // type null = unpave
  if (type) { map[y][x] = 4; pathType[y][x] = type; } else { map[y][x] = terrain[y][x]; pathType[y][x] = null; }
}
function applySavedPaths() {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { map[y][x] = roadMap[y][x]; pathType[y][x] = roadMap[y][x] === 4 ? 'dirt' : null; }
  for (const [k, type] of Object.entries(S.paths || {})) {
    const [x, y] = k.split(',').map(Number);
    if (canPave(x, y)) applyPath(x, y, type === 'none' ? null : type);
  }
}
applySavedPaths();
migrateWorld(); save(false); // the map exists now, so old saves can be moved onto it
const VILLAGER = { x: 23, y: 12 };
// The shop is a real building on the island (Figma Desktop-2): 2×2 tiles, door faces south.
const SHOP_BLD = { x: 19, y: 9, w: 2, h: 2 };
const inShop = (x, y) => x >= SHOP_BLD.x && x < SHOP_BLD.x + SHOP_BLD.w && y >= SHOP_BLD.y && y < SHOP_BLD.y + SHOP_BLD.h;
// you can move the shop and Maple in edit mode; their spots are saved on your island
function applyLayout() {
  Object.assign(SHOP_BLD, S.layout?.shop || { x: 19, y: 9 });
  Object.assign(VILLAGER, S.layout?.fox || { x: 23, y: 12 });
}
applyLayout();
// Town projects are built on your island: each one gets a 2×2 plot (finished ones + the one under construction).
const PLOTS = [[14, 11], [24, 16], [15, 17], [22, 9], [25, 11], [16, 9], [10, 12], [28, 12], [10, 17], [27, 18], [13, 6], [26, 6]];
let townBuilds = []; // [{ town, name, f (0..1 progress), x, y }]
// edit mode state (declared up here because the very first frame reads it)
let editMode = false, held = null; // held = { kind: 'item'|'shop'|'fox'|'build', ... } while dragging
let editTool = 'move', painting = false; // edit tools: 'move', 'pave:<style>', 'unpave'
let dragClient = null;                   // mouse position (screen) while dragging, even over the bag
addEventListener('pointermove', e => { if (held) dragClient = { x: e.clientX, y: e.clientY }; });
let lastBuildList = [];
// footprint helpers (used for moving buildings and picking plots)
const fpTiles = (x, y, w, h) => { const a = []; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) a.push([x + i, y + j]); return a; };
const solidLand = (x, y) => [1, 2, 4].includes(map[y]?.[x]);
function blockedBy(x, y, ignore) { // is something already on this tile? (ignore = the thing being moved)
  if (ignore !== 'shop' && inShop(x, y)) return true;
  if (townBuilds.some(b => b.key !== ignore && x >= b.x && x < b.x + 2 && y >= b.y && y < b.y + 2)) return true;
  if (ignore !== 'fox' && x === VILLAGER.x && y === VILLAGER.y) return true;
  return S.placed.some(p => p.x === x && p.y === y) || (x === P.x && y === P.y);
}
const areaFree = (x, y, w, h, ignore) => fpTiles(x, y, w, h).every(([a, b]) => solidLand(a, b) && !blockedBy(a, b, ignore));
// Town buildings: a spot you moved them to, otherwise the next free plot
window.setTownBuilds = list => {
  lastBuildList = list;
  const taken = [], out = [];
  const overlaps = (x, y) => taken.some(([a, b]) => Math.abs(a - x) < 2 && Math.abs(b - y) < 2);
  const spotOk = (x, y) => !overlaps(x, y) && fpTiles(x, y, 2, 2).every(([a, b]) =>
    solidLand(a, b) && !inShop(a, b) && !(a === VILLAGER.x && b === VILLAGER.y));
  for (const b of list) {
    const p = S.buildPos?.[b.key];
    if (p && spotOk(p.x, p.y)) { taken.push([p.x, p.y]); out.push({ ...b, x: p.x, y: p.y }); }
  }
  for (const b of list) {
    if (out.some(o => o.key === b.key)) continue;
    const slot = PLOTS.find(([x, y]) => spotOk(x, y) && !S.placed.some(p => p.x >= x && p.x < x + 2 && p.y >= y && p.y < y + 2));
    if (!slot) continue;
    taken.push(slot); out.push({ ...b, x: slot[0], y: slot[1] });
  }
  townBuilds = out;
};
const nearBuild = () => townBuilds.find(b => P.x >= b.x - 1 && P.x <= b.x + 2 && P.y >= b.y - 1 && P.y <= b.y + 2);
const inPlot = (x, y) => townBuilds.some(b => x >= b.x && x < b.x + 2 && y >= b.y && y < b.y + 2);
const walkable = (x, y) => map[y]?.[x] > 0 && !inShop(x, y) && !inPlot(x, y) && !(x === VILLAGER.x && y === VILLAGER.y)
  && !S.placed.some(p => p.x === x && p.y === y && !WALK_OVER.has(p.id));

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
const pathPainter = { swatch: null };
const paintTile = (() => {
  let g = bg.getContext('2d');
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

  // one path tile in a given style; `edges` adds the curb/grass fringe where it meets grass
  const PATH_EDGE = { dirt: PAL.pathEdge, stone: '#9d9584', brick: '#a85a47', wood: '#7e5636' };
  function drawPath(x, y, type, edges) {
    if (type === 'stone') {
      dot(x, y, 0, 0, '#b3ab9b', 10, 10);                                  // mortar
      const cols = ['#d8d1c2', '#cfc7b6', '#e0dacd'];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const px = c * 3 + (r % 2), py = r * 3 + 1;
        dot(x, y, px, py, cols[R(x, y, 130 + r * 3 + c, 3)], 2, 2);
        dot(x, y, px, py, '#ece7dc'); dot(x, y, px + 1, py + 1, '#9d9584');
      }
    } else if (type === 'brick') {
      dot(x, y, 0, 0, '#e2bf9f', 10, 10);                                  // mortar
      const cols = ['#c9735f', '#b8644f', '#d4826c'];
      for (let r = 0; r < 4; r++) for (let bx = -(r % 2) * 2; bx < 10; bx += 5) {
        const a = Math.max(bx, 0), w = Math.min(bx + 4, 10) - a, py = r * 3;
        if (w <= 0) continue;
        dot(x, y, a, py, cols[R(x, y, 150 + r * 4 + bx + 2, 3)], w, Math.min(2, 10 - py));
        dot(x, y, a, py, '#df9a84', w, 1);
      }
    } else if (type === 'wood') {
      for (let c = 0; c < 5; c++) {
        dot(x, y, c * 2, 0, c % 2 ? PAL.plank2 : PAL.plank, 2, 10);
        dot(x, y, c * 2 + 1, 0, '#a97d50', 1, 10);
        dot(x, y, c * 2, 1, PAL.plankLine); dot(x, y, c * 2, 8, PAL.plankLine);
        if (hash(x, y, 160 + c) < .4) dot(x, y, c * 2, 3 + R(x, y, 170 + c, 4), PAL.plankHi, 1, 2);
      }
    } else {                                                               // dirt
      dot(x, y, 0, 0, PAL.path, 10, 10);
      for (let i = 0; i < 5; i++) dot(x, y, R(x, y, i + 70, 10), R(x, y, i + 80, 10), PAL.pathDot);
      if (hash(x, y, 85) < .35) pebble(x, y, 1 + R(x, y, 86, 7), 1 + R(x, y, 87, 7));
    }
    if (edges) SIDES.forEach(([a, b], s) => {
      if (tileAtMap(x + a, y + b) === 2) { edge(x, y, s, PATH_EDGE[type] || PAL.pathEdge, .9, 95 + s * 10, 1); edge(x, y, s, PAL.grass, .6, 90 + s * 10); }
    });
  }
  // a 40×40 picture of a path style, for the shop and the edit toolbar
  pathPainter.swatch = type => {
    const c = document.createElement('canvas'); c.width = c.height = TILE;
    const keep = g; g = c.getContext('2d'); drawPath(0, 0, type, false); g = keep;
    return c.toDataURL();
  };

  return function paintTile(x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
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

    // ---- paths (dirt, boardwalk, cobblestone, brick) ----
    if (v === 4) drawPath(x, y, pathType[y][x] || 'dirt', true);

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
  };
})();
const paintAll = () => { for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) paintTile(x, y); };
paintAll();
// paving changes how neighbours look too (grass fringe, ledges), so repaint the 3×3 around a tile
const repaintAround = (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) paintTile(x + i, y + j); };
const swatchCache = {};
const swatchURL = type => swatchCache[type] ||= pathPainter.swatch(type);

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

const cv = document.getElementById('game');
let ctx = cv.getContext('2d'); // `let` so the future preview can borrow the renderer for its own canvas
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

// Shop items: hand-made 16×16 pixel sprites from icons.js, scaled up crisp
const iconCache = {};
function icon(id) {
  return iconCache[id] || (iconCache[id] = pixelSprite(id));
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
const urlCache = {};
const iconURL = id => urlCache[id] || (urlCache[id] = pixelSprite(id, true).toDataURL()); // outlined for the shop/bag
const BIG = new Set(['tree', 'palm', 'house', 'castle', 'fountain', 'pine', 'hut', 'ferris']);
function drawItem(id, x, y, alpha = 1) {
  const size = BIG.has(id) ? 56 : 36, cx = x * TILE + TILE / 2, bottom = y * TILE + TILE - 2;
  const left = cx - size / 2, top = bottom - size, o = Math.max(2, Math.round(size / 16));
  if (alpha === 1) {
    // cast shadow: the item's silhouette squashed onto the ground, falling down-right
    ctx.save();
    ctx.translate(cx, bottom); ctx.transform(1, 0, -0.7, -0.3, 0, 0);
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

function drawShop(sx = SHOP_BLD.x, sy = SHOP_BLD.y) {
  const X0 = sx * TILE, Y0 = sy * TILE;
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

function brackets(x, y, w, h, color) {
  ctx.fillStyle = color;
  const X = x * TILE, Y = y * TILE, W = w * TILE, H = h * TILE, L = 3 * PX;
  [[X, Y], [X + W - L, Y], [X, Y + H - PX], [X + W - L, Y + H - PX]].forEach(([a, b]) => ctx.fillRect(a, b, L, PX));
  [[X, Y], [X + W - PX, Y], [X, Y + H - L], [X + W - PX, Y + H - L]].forEach(([a, b]) => ctx.fillRect(a, b, PX, L));
}
// what can be grabbed in edit mode at this tile → its footprint
function movableAt(x, y) {
  if (inShop(x, y)) return { kind: 'shop', x: SHOP_BLD.x, y: SHOP_BLD.y, w: 2, h: 2 };
  const b = townBuilds.find(b => x >= b.x && x < b.x + 2 && y >= b.y && y < b.y + 2);
  if (b) return { kind: 'build', b, x: b.x, y: b.y, w: 2, h: 2 };
  if (x === VILLAGER.x && y === VILLAGER.y) return { kind: 'fox', x, y, w: 1, h: 1 };
  if (S.placed.some(p => p.x === x && p.y === y)) return { kind: 'item', x, y, w: 1, h: 1 };
  return null;
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
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PAL.deep; ctx.fillRect(0, 0, cv.width, cv.height);
  followCam();
  const ox = Math.round(cam.x), oy = Math.round(cam.y);
  ctx.setTransform(1, 0, 0, 1, -ox, -oy);          // everything below is drawn in world coordinates
  if (lastMouse) hover = tileAt(lastMouse);        // the world scrolls under a still mouse
  ctx.drawImage(bg, 0, 0);
  // only the tiles on screen: open sea past the world's edge + gentle water shimmer
  const tx0 = Math.floor(ox / TILE), tx1 = Math.ceil((ox + cv.width) / TILE);
  const ty0 = Math.floor(oy / TILE), ty1 = Math.ceil((oy + cv.height) / TILE);
  for (let y = ty0; y < ty1; y++) for (let x = tx0; x < tx1; x++) {
    const outside = x < 0 || y < 0 || x >= COLS || y >= ROWS;
    if (!outside && map[y][x] !== 0) continue;
    if (outside) {
      ctx.fillStyle = PAL.caustic;
      for (let i = 0; i < 3; i++) ctx.fillRect(x * TILE + Math.floor(hash(x, y, 200 + i) * 8) * PX, y * TILE + Math.floor(hash(x, y, 210 + i) * 10) * PX, 2 * PX, PX);
    }
    const phase = Math.floor(t / 40 + hash(x, y, 7) * 8);
    if (hash(x, y, phase) < .3) {
      ctx.fillStyle = PAL.ripple;
      ctx.fillRect(x * TILE + Math.floor(hash(x, y, phase + 1) * 6) * PX, y * TILE + (2 + Math.floor(hash(x, y, phase + 2) * 7)) * PX, 3 * PX, PX);
    }
  }
  // edit mode: faint grid over the land
  if (editMode) {
    ctx.fillStyle = 'rgba(255, 247, 230, .22)';
    for (let y = Math.max(0, ty0); y < Math.min(ROWS, ty1); y++) for (let x = Math.max(0, tx0); x < Math.min(COLS, tx1); x++)
      if (map[y][x] > 0) { ctx.fillRect(x * TILE, y * TILE, TILE, 1); ctx.fillRect(x * TILE, y * TILE, 1, TILE); }
  }

  // depth-sorted entities
  const step = P.moving && Math.floor(t / 8) % 2;
  const ents = [
    ...S.placed.map(p => ({ y: p.y, draw: () => drawItem(p.id, p.x, p.y) })),
    ...(held?.kind === 'shop' ? [] : [{ y: SHOP_BLD.y + SHOP_BLD.h - 1 + .5, draw: () => drawShop() }]),
    ...townBuilds.filter(b => !(held?.kind === 'build' && held.key === b.key)).map(b => ({ y: b.y + 1.5, draw: () => drawBuild(b) })),
    ...(held?.kind === 'fox' ? [] : [{ y: VILLAGER.y, draw: () => {
      const cx = VILLAGER.x * TILE + TILE / 2, bottom = VILLAGER.y * TILE + TILE - 2;
      shadow(cx, bottom); drawSprite(FOX, FOX_PAL, cx, bottom - (Math.floor(t / 30) % 2) * PX / 2);
    } }]),
    { y: P.ry + .01, draw: () => {
      const cx = P.rx * TILE + TILE / 2, bottom = P.ry * TILE + TILE - 2;
      shadow(cx, bottom); drawSprite(playerRows(P.dir, step), PLAYER_PAL, cx, bottom - (step ? PX : 0), P.dir === 'left');
    } },
  ].sort((a, b) => a.y - b.y);
  ents.forEach(e => e.draw());

  if (nearVillager()) drawBubble('Space to chat', VILLAGER.x * TILE + TILE / 2, VILLAGER.y * TILE - 14 * PX);
  else if (nearShop()) drawBubble('Space to enter shop', (SHOP_BLD.x + 1) * TILE, (SHOP_BLD.y + 2) * TILE + 2 * PX);
  else {
    const b = nearBuild();
    if (b) drawBubble(`${b.f >= 1 ? `${b.name} ✓` : `${b.name} · ${Math.floor(b.f * 100)}%`} · Space for info`, (b.x + 1) * TILE, b.y * TILE - 7 * PX);
  }

  // edit mode: outline whatever is under the mouse / where paving will go
  if (editMode && !held && hover && editTool === 'move') {
    const m = movableAt(hover.x, hover.y);
    if (m) brackets(m.x, m.y, m.w, m.h, '#f2c26b');
  }
  if (editMode && editTool !== 'move' && hover) brackets(hover.x, hover.y, 1, 1, canPave(hover.x, hover.y) ? '#fff7e6' : '#e0705c');
  // a building or Maple being dragged: see-through preview + green/red footprint
  if (held && held.kind !== 'item' && hover) {
    const ox = hover.x - held.off.dx, oy = hover.y - held.off.dy, w = held.kind === 'fox' ? 1 : 2;
    const ok = areaFree(ox, oy, w, w, held.kind === 'build' ? held.key : held.kind);
    brackets(ox, oy, w, w, ok ? '#fff7e6' : '#e0705c'); // the faint copy itself is drawn below
  }
  // placement preview (from the bag, or an item being dragged): ghost item + pixel corner brackets
  const ghost = (held?.kind === 'item' && held.id) || selectedItem;
  if (ghost && hover) {
    if (!held) drawItem(ghost, hover.x, hover.y, .6); // while dragging, the copy is drawn below (with the mouse)
    ctx.fillStyle = canPlace(hover.x, hover.y) ? '#fff7e6' : '#e0705c';
    const X = hover.x * TILE, Y = hover.y * TILE, L = 3 * PX;
    [[X, Y], [X + TILE - L, Y], [X, Y + TILE - PX], [X + TILE - L, Y + TILE - PX]].forEach(([a, b]) => ctx.fillRect(a, b, L, PX));
    [[X, Y], [X + TILE - PX, Y], [X, Y + TILE - L], [X + TILE - PX, Y + TILE - L]].forEach(([a, b]) => ctx.fillRect(a, b, PX, L));
  }
  // while dragging: a faint copy that follows the mouse, jumping tile to tile (works over the bag too)
  if (held && dragClient) {
    const r = cv.getBoundingClientRect();
    const tx = Math.floor(((dragClient.x - r.left) * (cv.width / r.width) + ox) / TILE);
    const ty = Math.floor(((dragClient.y - r.top) * (cv.height / r.height) + oy) / TILE);
    ctx.globalAlpha = .5;
    if (held.kind === 'item') drawItem(held.id, tx, ty, .5);
    else if (held.kind === 'fox') drawSprite(FOX, FOX_PAL, tx * TILE + TILE / 2, ty * TILE + TILE - 2);
    else {
      const fx = tx - held.off.dx, fy = ty - held.off.dy; // keep the tile you grabbed under the mouse
      if (held.kind === 'shop') drawShop(fx, fy); else drawBuild({ ...held.b, x: fx, y: fy });
    }
    ctx.globalAlpha = 1;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

// ---------- Camera: the view follows the player around the island (Stardew / Animal Crossing style) ----------
const VIEW_ROWS = 14;                 // about this many tiles fit top-to-bottom; the width follows the window
const cam = { x: 0, y: 0 };
let lastMouse = null;
function sizeView() {
  const k = Math.max(1, innerHeight / (VIEW_ROWS * TILE)); // screen px per game px
  cv.width = Math.ceil(innerWidth / k); cv.height = Math.ceil(innerHeight / k);
}
function followCam(snap = false) {
  const W = COLS * TILE, H = ROWS * TILE;
  const clamp = (v, view, world) => world <= view ? (world - view) / 2 : Math.max(0, Math.min(world - view, v));
  const gx = clamp(P.rx * TILE + TILE / 2 - cv.width / 2, cv.width, W);
  const gy = clamp(P.ry * TILE + TILE / 2 - cv.height / 2, cv.height, H);
  if (snap) { cam.x = gx; cam.y = gy; } else { cam.x += (gx - cam.x) * .12; cam.y += (gy - cam.y) * .12; }
}
sizeView();
addEventListener('resize', () => { sizeView(); followCam(true); });

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
  if (e.key === ' ') { e.preventDefault(); if (nearVillager()) openChat(); else if (nearShop()) openPanel('shop'); else if (nearBuild()) window.openBuildInfo?.(nearBuild()); }
  if (e.key === 'Escape') { if (editMode) setEdit(false); selectedItem = null; renderInventory(); }
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
    if (P.moving && walkable(P.x + dx, P.y + dy)) { P.x += dx; P.y += dy; S.player = { x: P.x, y: P.y }; saveLocal(); } // walking: browser only, no cloud write
  } else {
    P.rx += Math.sign(P.x - P.rx) * Math.min(.2, Math.abs(P.x - P.rx));
    P.ry += Math.sign(P.y - P.ry) * Math.min(.2, Math.abs(P.y - P.ry));
  }
}
const nearVillager = () => Math.abs(P.x - VILLAGER.x) + Math.abs(P.y - VILLAGER.y) <= 1;
const nearShop = () => P.y === SHOP_BLD.y + SHOP_BLD.h && P.x >= SHOP_BLD.x && P.x < SHOP_BLD.x + SHOP_BLD.w;
followCam(true);
(function loop() { update(); draw(); requestAnimationFrame(loop); })();

// ---------- Placing items ----------
const tileAt = e => {
  const r = cv.getBoundingClientRect();
  return {
    x: Math.floor(((e.clientX - r.left) * (cv.width / r.width) + Math.round(cam.x)) / TILE),
    y: Math.floor(((e.clientY - r.top) * (cv.height / r.height) + Math.round(cam.y)) / TILE),
  };
};
const canPlace = (x, y) => map[y]?.[x] > 0 && !inShop(x, y) && !inPlot(x, y) && !S.placed.some(p => p.x === x && p.y === y) && !(x === P.x && y === P.y) && !(x === VILLAGER.x && y === VILLAGER.y);
cv.addEventListener('mousemove', e => { lastMouse = { clientX: e.clientX, clientY: e.clientY }; hover = tileAt(e); });
cv.addEventListener('mouseleave', () => { lastMouse = null; hover = null; });
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

// ---------- Edit mode: drag items around your island, or drop them on the bag to put them away ----------
function setEdit(on) {
  if (!on && held) dropHeld(null);
  painting = false;
  editMode = on;
  if (on) renderEditTools();
  document.body.classList.toggle('editing', on);
  $('editBar').classList.toggle('hidden', !on);
  $('editBtn').classList.toggle('active', on);
  $('editBtn').setAttribute('aria-pressed', on);
}
function dropHeld(e) {
  const h = held; held = null; dragClient = null;
  document.body.classList.remove('holding');
  const over = e && e.target === cv ? tileAt(e) : null;
  if (h.kind !== 'item') {                     // shop, a town building, or Maple
    const w = h.kind === 'fox' ? 1 : 2;
    const ox = over && over.x - h.off.dx, oy = over && over.y - h.off.dy;
    if (over && areaFree(ox, oy, w, w, h.kind === 'build' ? h.key : h.kind)) {
      S.layout ||= {}; S.buildPos ||= {};
      if (h.kind === 'shop') { S.layout.shop = { x: ox, y: oy }; Object.assign(SHOP_BLD, S.layout.shop); }
      else if (h.kind === 'fox') { S.layout.fox = { x: ox, y: oy }; Object.assign(VILLAGER, S.layout.fox); }
      else S.buildPos[h.key] = { x: ox, y: oy };
    } else if (over) toast("Can't put that there. It needs clear land.");
    window.setTownBuilds(lastBuildList);
    return save();
  }
  if (e?.target?.closest?.('.bag')) {
    S.inventory[h.id] = (S.inventory[h.id] || 0) + 1;
    toast(`${SHOP.find(i => i.id === h.id).name} put away in your bag`);
  } else {
    let spot = e && e.target === cv ? tileAt(e) : null;
    if (!spot || !canPlace(spot.x, spot.y)) spot = h.from; // can't go there → back where it was
    S.placed.push({ id: h.id, x: spot.x, y: spot.y });
  }
  save(); renderInventory();
}
$('editBtn').onclick = () => setEdit(!editMode);
$('editDone').onclick = () => setEdit(false);
function paintAt({ x, y }) {
  if (!canPave(x, y)) return;
  const type = editTool === 'unpave' ? null : editTool.slice(5);
  if ((map[y][x] === 4 ? pathType[y][x] : null) === type) return;
  applyPath(x, y, type);
  const key = `${x},${y}`, def = roadMap[y][x] === 4 ? 'dirt' : null;
  S.paths ||= {};
  if (type === def) delete S.paths[key]; else S.paths[key] = type || 'none'; // only store changes
  repaintAround(x, y);
}
cv.addEventListener('pointerdown', e => {
  if (!editMode || selectedItem || e.button !== 0) return;
  const at = tileAt(e);
  if (editTool !== 'move') { painting = true; paintAt(at); e.preventDefault(); return; }
  const m = movableAt(at.x, at.y);
  if (!m) return;
  if (m.kind === 'item') {
    const i = S.placed.findIndex(p => p.x === at.x && p.y === at.y);
    const [p] = S.placed.splice(i, 1);
    held = { kind: 'item', id: p.id, from: { x: at.x, y: at.y } };
  } else {
    held = { kind: m.kind, b: m.b, key: m.b?.key, from: { x: m.x, y: m.y }, off: { dx: at.x - m.x, dy: at.y - m.y } };
  }
  dragClient = { x: e.clientX, y: e.clientY };
  document.body.classList.add('holding');
  e.preventDefault();
});
cv.addEventListener('pointermove', e => { if (painting) paintAt(tileAt(e)); });
addEventListener('pointerup', e => {
  if (painting) { painting = false; save(); }
  if (held) dropHeld(e);
});
function renderEditTools() {
  const tools = [{ id: 'move', label: pi('hand') + ' Move' },
    ...PATH_KITS.filter(k => S.pathKits?.includes(k.id)).map(k => ({ id: 'pave:' + k.id, label: k.name, img: swatchURL(k.id) })),
    { id: 'unpave', label: pi('broom') + ' Unpave' }];
  if (!tools.some(t => t.id === editTool)) editTool = 'move';
  $('editTools').innerHTML = tools.map(t => `<button type="button" class="tool ${editTool === t.id ? 'active' : ''}" data-tool="${t.id}">${t.img ? `<img src="${t.img}" alt="">` : ''}${t.label}</button>`).join('');
  $('editTools').querySelectorAll('[data-tool]').forEach(b => b.onclick = () => { editTool = b.dataset.tool; renderEditTools(); });
  $('editHint').innerHTML = pit(editTool === 'move' ? 'Drag anything to move it: items, the shop, town buildings, Maple. Drop items on the :backpack: bag to put them away.'
    : editTool === 'unpave' ? 'Click or drag over a path to turn it back into grass.'
    : 'Click or drag to pave. Paths go on grass and sand. Buy more styles in the shop.');
  document.body.classList.toggle('paving', editTool !== 'move');
}
function toast(msg) { const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2000); }
function renderStats() {
  $('coins').textContent = S.coins.toLocaleString();
  $('saved').textContent = `$${S.saved.toLocaleString()}`;
  $('streak').textContent = S.streak;
  $('shopCoins').innerHTML = `${pi('coin')} ${S.coins.toLocaleString()}`;
}
// ---------- Pop-up windows ----------
// "side" panels (daily) sit on the right and don't block walking; the rest are centred pop-ups
const anyOpen = () => !!document.querySelector('.modal:not(.hidden):not(.side)');
function closePanels() {
  if (document.querySelector('.required-setup:not(.hidden)')) return false;
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.querySelectorAll('[data-open]').forEach(b => b.classList.remove('active'));
  document.activeElement?.blur?.();
  return true;
}
function openPanel(name) {
  const el = $('panel-' + name), side = el.classList.contains('side');
  const wasOpen = !el.classList.contains('hidden');
  if (!closePanels()) return;
  if (side && wasOpen) return; // clicking the same button again closes it
  el.classList.remove('hidden');
  document.querySelector(`[data-open="${name}"]`)?.classList.add('active');
  if (!side) {
    Object.keys(keys).forEach(k => keys[k] = false); // don't keep walking behind a pop-up
    el.querySelector('.close')?.focus();
  }
  if (name === 'history') { animateChart = true; renderFuture(); } // draw the graph in, line by line
}
document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openPanel(b.dataset.open));
paintTownIsle();
// "?" button: controls popover
$('helpBtn').onclick = e => { e.stopPropagation(); $('helpPop').classList.toggle('hidden'); $('helpBtn').classList.toggle('active'); };
addEventListener('click', e => { if (!e.target.closest('#helpPop')) { $('helpPop').classList.add('hidden'); $('helpBtn').classList.remove('active'); } });
document.querySelectorAll('[data-close]').forEach(b => b.onclick = closePanels);
document.querySelectorAll('.modal').forEach(m => m.addEventListener('mousedown', e => {
  if (e.target === m && !m.classList.contains('required-setup')) closePanels();
}));

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
  toast(coins ? `+${coins} :coin: · ${rewards.map(r => r[0]).join(' · ')}` : `$${amt} added to your progress. Coins come from showing up — see you tomorrow!`);
  // share the habit (never the amount or jar name) with the town
  if (coins) window.onHabit?.(rewards.map(r => r[0].startsWith('Wish Jar') ? 'filled a Wish Jar' : r[0].toLowerCase()).join(' · '), coins);
  completeMission('deposit');
  if (g) completeMission('goal');
}
// ---------- Savings accounts (the "Where did it go?" dropdown) ----------
let lastAcct = null;
function renderAccounts() {
  const sel = $('depType'), cur = lastAcct ?? sel.value;
  sel.innerHTML = S.accounts.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('')
    + '<option value="__config">Configure accounts…</option>';
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

// quick amount tiles: pick one and it fills the amount (click again to un-pick); typing your own un-picks them
const syncTiles = () => document.querySelectorAll('[data-amt]').forEach(t => {
  const on = t.dataset.amt === $('depAmount').value;
  t.classList.toggle('on', on); t.setAttribute('aria-pressed', on);
});
document.querySelectorAll('[data-amt]').forEach(b => b.onclick = () => {
  const inp = $('depAmount');
  inp.value = inp.value === b.dataset.amt ? '' : b.dataset.amt;
  syncTiles();
});
$('depAmount').addEventListener('input', syncTiles);
$('depAmount').addEventListener('keydown', e => { if (e.key === 'Enter') $('depositBtn').click(); });
$('depositBtn').onclick = () => {
  const amt = Math.floor(+$('depAmount').value);
  if (!(amt > 0)) return toast('Enter an amount');
  logSaving(amt, $('depType').value, $('depJar').value === '' ? -1 : +$('depJar').value);
  $('depAmount').value = ''; syncTiles();
  closePanels();
};
function renderRules() {
  const ws = weekStreak();
  $('rules').innerHTML = `
    <li><span>${pi(S.lastDepositDay === today() ? 'check' : 'box')} Save anything today</span><b>+${REWARDS.dailyLog}${pi('coin')}</b></li>
    <li><span>${pi(S.weeks.includes(weekKey()) ? 'check' : 'box')} First deposit this week</span><b>+${REWARDS.firstThisWeek}${pi('coin')}</b></li>
    <li><span>${pi(ws >= 3 ? 'check' : 'box')} 3+ weeks in a row (now ${ws})</span><b>+${REWARDS.weekStreak}${pi('coin')}/wk</b></li>
    <li><span>${pi('jar')} Fill a Wish Jar</span><b>+${REWARDS.jarFilled}${pi('coin')}</b></li>`;
}
function renderHistory() {
  if (typeof renderFuture === 'function' && $('futureStats')) setTimeout(renderFuture);
  const mode = $('histSort').value, grouped = mode === 'type' || mode === 'jar';
  const key = h => mode === 'type' ? (h.type || 'Savings') : (h.jar || 'General savings (no jar)');
  let rows = S.history.map((h, i) => ({ ...h, i }));          // S.history is newest-first
  if (mode === 'old') rows.reverse();
  if (grouped) rows.sort((a, b) => key(a).localeCompare(key(b)) || a.i - b.i);
  let last = null;
  $('history').innerHTML = rows.map(h => {
    let head = '';
    if (grouped && key(h) !== last) {
      last = key(h);
      const total = rows.filter(r => key(r) === last).reduce((t, r) => t + r.amt, 0);
      head = `<li class="group"><span>${pi(mode === 'jar' ? 'jar' : 'bank')} ${esc(last)}</span><b>$${total.toLocaleString()}</b></li>`;
    }
    return head + `<li>
      <span class="date">${h.date}</span>
      <span><span class="amt">$${h.amt}</span> → ${esc(h.type || 'Savings')}${h.jar ? ' · ' + pi('jar') + ' ' + esc(h.jar) : ''}</span>
      <span class="coins">+${h.coins ?? 0} ${pi('coin')}</span></li>`;
  }).join('') || '<li><span class="empty">No savings logged yet. Open the bank to log your first!</span></li>';
}
$('histSort').onchange = renderHistory;

// ---------- Future: your saving rate, projected 1 / 10 / 20 years ahead (plain maths, no AI) ----------
const GROWTH = 0.05;               // "invested" line: 5% a year, compounded monthly (illustrative, not a promise)
const FUTURE_COLORS = { past: '#0f8aa3', save: '#d9701a', invest: '#8a4fd0' }; // validated: CVD-safe on the receipt paper
const MILESTONES = [1, 10, 20];    // marked on the one graph; the preview island shows the one you pick
const SPAN = 20;                   // the graph always looks 20 years ahead
let horizon = 10, rateOverride = null;
let animateChart = false, chartAnim = null; // the graph draws itself in when History opens

function savingStats() {
  const h = S.history || [];
  if (!h.length) return { avg: 0, days: 0, first: null, coinsPerDay: 0 };
  const first = h.map(x => x.date).sort()[0];
  const days = Math.max(1, Math.round((new Date(today()) - new Date(first)) / 864e5) + 1);
  const total = h.reduce((t, x) => t + x.amt, 0), coins = h.reduce((t, x) => t + (x.coins || 0), 0);
  return { avg: total / days, days, first, coinsPerDay: coins / days };
}
// money after `years` if you keep adding `perDay`; with growth = compound monthly at GROWTH a year
function project(start, perDay, years, growth) {
  if (!growth) return start + perDay * 365 * years;
  const m = GROWTH / 12, n = years * 12, f = Math.pow(1 + m, n);
  return start * f + (perDay * 365 / 12) * ((f - 1) / m);
}
const money = v => v >= 1e6 ? `$${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : v >= 1e4 ? `$${Math.round(v / 1e3)}k` : `$${Math.round(v).toLocaleString()}`;
const moneyFull = v => `$${Math.round(v).toLocaleString()}`;
const yrs = y => `${y} yr${y > 1 ? 's' : ''}`;

function renderFuture() {
  const st = savingStats();
  const rate = rateOverride ?? (st.avg > 0 ? +st.avg.toFixed(2) : 5);
  const start = S.saved || 0;
  $('futureStats').innerHTML = `
    <div class="fstat"><b>${st.avg > 0 ? '$' + st.avg.toFixed(2) : '–'}</b><small>your average per day</small></div>
    <div class="fstat"><b>${moneyFull(start)}</b><small>real money saved so far</small></div>
    <div class="fstat"><b>${st.days}</b><small>day${st.days === 1 ? '' : 's'} since your first save</small></div>`;
  if (document.activeElement !== $('rateInput')) $('rateInput').value = rate;
  $('rateNote').textContent = rateOverride != null ? '(what if…)' : st.avg > 0 ? '(your real average)' : '(an example: log savings to use your own)';
  $('rateReset').classList.toggle('hidden', rateOverride == null || !(st.avg > 0));
  drawFutureChart(st, rate, start);
  // small 1 / 10 / 20 yr tabs for the preview island
  $('horizonPick').innerHTML = MILESTONES.map(y => `<button type="button" class="hz ${y === horizon ? 'on' : ''}" data-y="${y}" aria-pressed="${y === horizon}">in ${yrs(y)}</button>`).join('');
  $('horizonPick').querySelectorAll('[data-y]').forEach(b => b.onclick = () => { horizon = +b.dataset.y; renderFuture(); });
  drawPreviewIsland(st, rate, start);
}

// ---- ONE graph, 20 years ahead: past (solid) + keep saving + invested (dashed), with 1 / 10 / 20 yr marked ----
function drawFutureChart(st, rate, start) {
  const W = 640, H = 270, L = 58, R = 120, T = 26, B = 30;
  const now = new Date(today()), firstD = st.first ? new Date(st.first) : now;
  const pastDays = Math.max(0, (now - firstD) / 864e5), futDays = SPAN * 365;
  const x0 = -Math.max(pastDays, futDays * .04), x1 = futDays;        // x = days from today (a sliver of past is always visible)
  const yMax = Math.max(10, project(start, rate, SPAN, true)) * 1.08;
  const sx = d => L + (d - x0) / (x1 - x0) * (W - L - R), sy = v => T + (1 - v / yMax) * (H - T - B);
  const hist = [...(S.history || [])].sort((a, b) => a.date < b.date ? -1 : 1);
  let cum = Math.max(0, start - hist.reduce((t, x) => t + x.amt, 0)); const past = [[x0, cum]];
  for (const h of hist) { const d = (new Date(h.date) - now) / 864e5; past.push([d, cum]); cum += h.amt; past.push([d, cum]); }
  past.push([0, start]);
  const steps = 80, fut = k => Array.from({ length: steps + 1 }, (_, i) => { const y = SPAN * i / steps; return [y * 365, project(start, rate, y, k)]; });
  const save = fut(false), inv = fut(true);
  const path = pts => pts.map(([d, v], i) => `${i ? 'L' : 'M'}${sx(d).toFixed(1)},${sy(v).toFixed(1)}`).join('');
  const step = (() => { const raw = yMax / 4, p = Math.pow(10, Math.floor(Math.log10(raw))); return [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw); })();
  const yt = []; for (let v = 0; v <= yMax; v += step) yt.push(v);
  // milestone markers: a faint guide, a label on top, a dot on each projection (click = show that year's island)
  const marks = MILESTONES.map(y => {
    const x = sx(y * 365), on = y === horizon;
    return `<g class="ms ${on ? 'on' : ''}" data-y="${y}" tabindex="0" role="button" aria-label="Show my island in ${yrs(y)}">
      <line x1="${x}" x2="${x}" y1="${T - 4}" y2="${H - B}" class="msline"/>
      <text x="${x}" y="${T - 10}" class="mslabel" text-anchor="${y === SPAN ? 'end' : 'middle'}">${yrs(y)}</text>
      <circle cx="${x}" cy="${sy(project(start, rate, y, false))}" r="${on ? 6 : 5}" fill="${FUTURE_COLORS.save}" class="end"/>
      <circle cx="${x}" cy="${sy(project(start, rate, y, true))}" r="${on ? 6 : 5}" fill="${FUTURE_COLORS.invest}" class="end"/>
      <rect x="${x - 14}" y="${T - 24}" width="28" height="${H - B - T + 24}" fill="transparent"/>
    </g>`;
  }).join('');
  const endSave = project(start, rate, SPAN, false), endInv = project(start, rate, SPAN, true);
  const svg = $('futureChart');
  cancelAnimationFrame(chartAnim); chartAnim = null;
  svg.parentElement.querySelectorAll('.ms-pop').forEach(p => p.remove());
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = `
    ${yt.map(v => `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" class="grid"/><text x="${L - 8}" y="${sy(v) + 4}" class="tick" text-anchor="end">${money(v)}</text>`).join('')}
    <text x="${sx(0)}" y="${H - 8}" class="tick" text-anchor="middle">today</text>
    <line x1="${sx(0)}" x2="${sx(0)}" y1="${T}" y2="${H - B}" class="today"/>
    <defs><clipPath id="reveal"><rect id="revealRect" x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>
    <g clip-path="url(#reveal)">
      <path d="${path(inv)}" class="ln" stroke="${FUTURE_COLORS.invest}" stroke-dasharray="6 4"/>
      <path d="${path(save)}" class="ln" stroke="${FUTURE_COLORS.save}" stroke-dasharray="6 4"/>
      <path d="${path(past)}" class="ln" stroke="${FUTURE_COLORS.past}"/>
      <text x="${W - R + 10}" y="${sy(endInv) + 4}" class="dl">${money(endInv)} invested</text>
      <text x="${W - R + 10}" y="${Math.max(sy(endSave) + 4, sy(endInv) + 20)}" class="dl">${money(endSave)} saved</text>
    </g>
    <line id="xhair" x1="0" x2="0" y1="${T}" y2="${H - B}" class="xhair" visibility="hidden"/>
    <rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent" id="chartHit"/>
    <g clip-path="url(#reveal)">${marks}</g>`;
  if (animateChart) { animateChart = false; playChartIntro(svg, W, L, R, sx, sy, start, rate); }
  svg.querySelectorAll('.ms').forEach(m => {
    const pick = () => { horizon = +m.dataset.y; renderFuture(); };
    m.onclick = pick; m.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
  });
  // hover: crosshair + tooltip with both projections at that point in time
  const hit = svg.querySelector('#chartHit'), xh = svg.querySelector('#xhair'), tip = $('chartTip');
  hit.onpointermove = e => {
    const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * W / r.width;
    const d = x0 + (px - L) / (W - L - R) * (x1 - x0);
    xh.setAttribute('x1', px); xh.setAttribute('x2', px); xh.setAttribute('visibility', 'visible');
    if (d <= 0) {
      const v = past.filter(([pd]) => pd <= d).at(-1)?.[1] ?? 0;
      tip.innerHTML = `<b>${d > -1 ? 'today' : Math.round(-d) + ' days ago'}</b><span><i style="background:${FUTURE_COLORS.past}"></i>saved ${moneyFull(v)}</span>`;
    } else {
      const y = d / 365;
      tip.innerHTML = `<b>in ${y < 1 ? Math.round(d / 30.4) + ' months' : y.toFixed(1) + ' years'}</b>
        <span><i style="background:${FUTURE_COLORS.save}"></i>keep saving: ${moneyFull(project(start, rate, y, false))}</span>
        <span><i style="background:${FUTURE_COLORS.invest}"></i>+ invested: ${moneyFull(project(start, rate, y, true))}</span>`;
    }
    tip.classList.remove('hidden');
    const wrap = svg.parentElement.getBoundingClientRect();
    tip.style.left = Math.min(e.clientX - wrap.left + 14, wrap.width - tip.offsetWidth - 4) + 'px';
    tip.style.top = (e.clientY - wrap.top - 10) + 'px';
  };
  hit.onpointerleave = () => { xh.setAttribute('visibility', 'hidden'); tip.classList.add('hidden'); };
  $('futureTable').innerHTML = `<tr><th>When</th><th>Keep saving</th><th>+ invested (5%/yr)</th></tr>` +
    MILESTONES.map(y => `<tr><td>in ${yrs(y)}</td><td>${moneyFull(project(start, rate, y, false))}</td><td>${moneyFull(project(start, rate, y, true))}</td></tr>`).join('');
}

// Line draws left→right; at each milestone it pauses and pops up "$X saved in N yrs!", then carries on.
function playChartIntro(svg, W, L, R, sx, sy, start, rate) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // just show the finished graph
  const rect = svg.querySelector('#revealRect'), wrap = svg.parentElement;
  const endX = W - R + 110, stops = MILESTONES.map(y => ({ y, x: sx(y * 365) }));
  const SPEED = (endX - L) / 2600;          // ~2.6s of drawing, plus the pauses
  let x = L, last = performance.now(), pauseUntil = 0;
  rect.setAttribute('width', x);
  const pop = ({ y, x: mx }) => {
    const r = svg.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), k = r.width / W;
    const p = document.createElement('div');
    p.className = 'ms-pop';
    p.innerHTML = `<b>${moneyFull(project(start, rate, y, false))}</b> saved in ${yrs(y)}!`;
    p.style.left = (r.left - wr.left + mx * k) + 'px';
    p.style.top = (r.top - wr.top + sy(project(start, rate, y, false)) * k) + 'px';
    if (y === SPAN) p.classList.add('end');
    wrap.append(p);
    setTimeout(() => p.classList.add('out'), 2200);
    setTimeout(() => p.remove(), 2700);
  };
  const tick = now => {
    const dt = now - last; last = now;
    if (now >= pauseUntil) {
      const nx = Math.min(endX, x + dt * SPEED);
      const hit = stops.find(s => x < s.x && nx >= s.x);
      x = hit ? hit.x : nx;
      if (hit) { pop(hit); pauseUntil = now + 650; }
      rect.setAttribute('width', x);
    }
    if (x < endX) chartAnim = requestAnimationFrame(tick); else { rect.setAttribute('width', W); chartAnim = null; }
  };
  chartAnim = requestAnimationFrame(tick);
}

// ---- preview island: drawn with the real game art onto a copy of your island ----
function drawPreviewIsland(st, rate, start) {
  const X0 = 6, Y0 = 3, TW = 28, TH = 22;                                  // crop around the island
  const perDay = Math.max(st.coinsPerDay || 0, 12);                         // coins at your habit pace (a modest floor)
  let budget = S.coins + perDay * 365 * horizon;
  const DREAM = ['castle', 'ferris', 'house', 'car', 'plane', 'hut', 'grad', 'playground', 'fountain', 'canoe', 'tent', 'umbrella', 'blossom', 'pine', 'palm', 'tree', 'lamp', 'bench', 'sunflower', 'flower'];
  // how many new things the preview shows grows with time, so 1 / 10 / 20 years look clearly different
  const cap = { 1: 6, 10: 18, 20: 32 }[horizon] ?? 18;
  const buys = [];
  for (let round = 0; round < 4 && buys.length < cap; round++)
    for (const id of DREAM) { const it = SHOP.find(s => s.id === id); if (it && it.price <= budget && buys.length < cap) { budget -= it.price; buys.push(it); } }
  // tidy spots: grass right next to a path, near the middle, never side by side; big things first get the best spots
  const taken = new Set(S.placed.map(p => p.x + ',' + p.y));
  const nearPath = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => map[y + b]?.[x + a] === 4);
  const free = [];
  for (let y = Y0 + 2; y < Y0 + TH - 2; y++) for (let x = X0 + 1; x < X0 + TW - 1; x++) {
    if (map[y][x] !== 2 || inShop(x, y) || inPlot(x, y) || taken.has(x + ',' + y) || (x === VILLAGER.x && y === VILLAGER.y)) continue;
    if (y === SHOP_BLD.y + 2 && x >= SHOP_BLD.x && x < SHOP_BLD.x + 2) continue;   // keep the shop door clear
    const score = (nearPath(x, y) ? 0 : 6) + Math.hypot(x - 20, (y - 14) * 1.2) * .5 + hash(x, y, 999);
    free.push([x, y, score]);
  }
  free.sort((a, b) => a[2] - b[2]);
  const spots = [];
  for (const f of free) { if (spots.length >= buys.length) break; if (!spots.some(s => Math.abs(s[0] - f[0]) < 2 && Math.abs(s[1] - f[1]) < 2)) spots.push(f); }
  const future = buys.map((it, i) => spots[i] && { id: it.id, x: spots[i][0], y: spots[i][1] }).filter(Boolean);

  // town projects keep growing: estimate the town's pace as your habit pace × its members
  const townPace = b => perDay * Math.max(1, b.members || 1);              // hammer points per day
  const builds = townBuilds.map(b => b.f >= 1 || !b.goal ? b
    : { ...b, f: Math.min(1, (b.progress + townPace(b) * 365 * horizon) / b.goal) });
  const etaText = b => {
    const days = Math.ceil((b.goal - b.progress) / townPace(b));
    return days < 45 ? `${days} days` : days < 730 ? `${Math.round(days / 30.4)} months` : `${(days / 365).toFixed(1)} years`;
  };
  const inProgress = townBuilds.filter(b => b.f < 1 && b.goal);

  // draw at full size with the real renderer (borrowing the game's ctx), then scale down crisply
  const full = document.createElement('canvas'); full.width = TW * TILE; full.height = TH * TILE;
  const keep = ctx; ctx = full.getContext('2d'); ctx.imageSmoothingEnabled = false;
  try {
    ctx.translate(-X0 * TILE, -Y0 * TILE);
    ctx.drawImage(bg, 0, 0);
    const ents = [
      ...S.placed.map(p => ({ y: p.y, draw: () => drawItem(p.id, p.x, p.y) })),
      { y: SHOP_BLD.y + 1.5, draw: () => drawShop() },
      ...builds.map(b => ({ y: b.y + 1.5, draw: () => drawBuild(b) })),
      { y: VILLAGER.y, draw: () => { const cx = VILLAGER.x * TILE + TILE / 2, bt = VILLAGER.y * TILE + TILE - 2; shadow(cx, bt); drawSprite(FOX, FOX_PAL, cx, bt); } },
      ...future.map(f => ({ y: f.y, draw: () => {
        // gold halo behind "future" things
        const size = BIG.has(f.id) ? 56 : 36, cx = f.x * TILE + TILE / 2, bt = f.y * TILE + TILE - 2, glow = silhouette(f.id, '#ffe68a');
        for (const [dx, dy] of [[-4, 0], [4, 0], [0, -4], [0, 4]]) ctx.drawImage(glow, cx - size / 2 + dx, bt - size + dy, size, size);
        drawItem(f.id, f.x, f.y);
      } })),
    ].sort((a, b) => a.y - b.y);
    ents.forEach(e => e.draw());
    // little four-point sparkles above the new things
    ctx.fillStyle = '#fff8d6';
    for (const f of future) {
      const cx = f.x * TILE + TILE / 2 + (hash(f.x, f.y, 5) - .5) * 20, cy = f.y * TILE - (BIG.has(f.id) ? 30 : 12);
      ctx.fillRect(cx - 2, cy - 8, 4, 16); ctx.fillRect(cx - 8, cy - 2, 16, 4);
    }
  } finally { ctx = keep; }
  const cvp = $('previewIsland'), g = cvp.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(full, 0, 0, cvp.width, cvp.height);
  // warm "golden hour" wash + a soft vignette, so it reads as a dreamy postcard
  const grad = g.createLinearGradient(0, 0, 0, cvp.height);
  grad.addColorStop(0, 'rgba(255, 214, 150, .22)'); grad.addColorStop(.6, 'rgba(255, 214, 150, 0)');
  g.fillStyle = grad; g.fillRect(0, 0, cvp.width, cvp.height);
  const vig = g.createRadialGradient(cvp.width / 2, cvp.height / 2, cvp.height * .35, cvp.width / 2, cvp.height / 2, cvp.width * .7);
  vig.addColorStop(0, 'rgba(30, 50, 60, 0)'); vig.addColorStop(1, 'rgba(30, 50, 60, .35)');
  g.fillStyle = vig; g.fillRect(0, 0, cvp.width, cvp.height);

  $('pvYears').textContent = yrs(horizon);
  const names = future.slice(0, 5).map(f => { const it = SHOP.find(s => s.id === f.id); return `${it.emoji} ${it.name}`; }).join(', ');
  $('pvText').innerHTML = `
    <li>${pi('cash')} Saving <b>$${rate}/day</b> → about <b>${moneyFull(project(start, rate, horizon, false))}</b> in real savings</li>
    <li>${pi('chart')} If you invest it (5%/yr example) → about <b>${moneyFull(project(start, rate, horizon, true))}</b></li>
    <li>${pi('coin')} Your habits earn roughly <b>${Math.round(perDay * 365 * horizon).toLocaleString()} coins</b> for your island</li>
    ${inProgress.map(b => `<li>${pi('crane')} ${esc(b.town)}'s <b>${esc(b.name)}</b>: ${builds.find(x => x.key === b.key)?.f >= 1 ? 'finished' : `${Math.floor(builds.find(x => x.key === b.key).f * 100)}% built`} by then (about ${etaText(b)} to finish at today's pace)</li>`).join('')}
    ${future.length ? `<li>${pi('sparkle')} Enough for ${names}${future.length > 5 ? ` and ${future.length - 5} more` : ''}. New things glow gold.</li>` : ''}`;
}

$('rateInput').addEventListener('input', () => {
  const v = +$('rateInput').value;
  rateOverride = v > 0 ? Math.min(v, 100000) : null;
  renderFuture();
});
$('rateReset').onclick = () => { rateOverride = null; renderFuture(); };

// ---------- Shop / Inventory ----------
function renderShop() {
  const kits = PATH_KITS.filter(k => k.price > 0).map(k => {
    const owned = S.pathKits?.includes(k.id), locked = !owned && S.coins < k.price;
    return `<button class="item path-kit ${owned ? 'owned' : ''} ${locked ? 'locked' : ''}" data-kit="${k.id}">
      <img src="${swatchURL(k.id)}" alt=""><span class="name">${k.name}</span>
      <span class="price">${owned ? 'Owned ✓' : pi('coin') + ' ' + k.price}</span>
      ${locked ? `<span class="need">need ${k.price - S.coins} more</span>` : ''}</button>`;
  }).join('');
  $('shop').innerHTML = `<h3 class="shop-section">${pi('road')} Paths <small>buy a style once, then pave as much as you like in ${pi('pencil')} edit mode</small></h3>${kits}
    <h3 class="shop-section">${pi('tree')} Decorations</h3>` + SHOP.map(s => `<button class="item ${S.coins < s.price ? 'locked' : ''}" data-id="${s.id}">
      <img src="${iconURL(s.id)}" alt=""><span class="name">${s.name}</span><span class="price">${pi('coin')} ${s.price}</span>
      ${S.coins < s.price ? `<span class="need">need ${s.price - S.coins} more</span>` : ''}</button>`).join('');
  $('shop').querySelectorAll('[data-kit]').forEach(el => el.onclick = () => {
    const k = PATH_KITS.find(i => i.id === el.dataset.kit);
    if (S.pathKits?.includes(k.id)) return toast(`You own ${k.name}. Open :pencil: edit mode to pave with it.`);
    if (S.coins < k.price) return toast(`Need ${k.price - S.coins} more :coin: — keep your saving streak going!`);
    S.coins -= k.price; S.pathKits = [...(S.pathKits || ['dirt']), k.id];
    save(); renderAll(); toast(`Bought ${k.name}! Open :pencil: edit mode to start paving.`);
  });
  $('shop').querySelectorAll('[data-id]').forEach(el => el.onclick = () => {
    const s = SHOP.find(i => i.id === el.dataset.id);
    if (S.coins < s.price) return toast(`Need ${s.price - S.coins} more :coin: — keep your saving streak going!`);
    S.coins -= s.price; S.inventory[s.id] = (S.inventory[s.id] || 0) + 1;
    save(); renderAll(); toast(`Bought ${s.name}! It's in your bag at the bottom.`);
  });
}
function renderInventory() {
  const ids = Object.keys(S.inventory);
  $('inventory').innerHTML = ids.map(id => { const s = SHOP.find(i => i.id === id); return `<button class="item ${selectedItem === id ? 'selected' : ''}" data-id="${id}" title="${s.name}" aria-label="${s.name}, ${S.inventory[id]} in bag"><img src="${iconURL(s.id)}" alt=""><span class="count">×${S.inventory[id]}</span></button>`; }).join('') || '<span class="empty">Empty. Visit the shop!</span>';
  $('inventory').querySelectorAll('.item').forEach(el => el.onclick = () => {
    selectedItem = selectedItem === el.dataset.id ? null : el.dataset.id;
    renderInventory(); if (selectedItem) toast(`Click a spot on your island to place the ${SHOP.find(i => i.id === selectedItem).name}`);
  });
}

// ---------- Goals ----------
const JAR_COLORS = ['#6cc3c8', '#f2a0a8', '#f2c26b', '#a5ca8c', '#b49be0', '#f1a36b', '#7fb0e8'];
let draftJar = false; // the "+" card turns into an editable jar
// pixel-art jar: o = outline, L = lid, ' ' = inside (glass or liquid), . = empty
const JAR_ART = [
  '....oooooooo....',
  '...oLLLLLLLLo...',
  '...oLLLLLLLLo...',
  '....oooooooo....',
  '....o      o....',
  '..oo        oo..',
  '.o            o.',
  'o              o',
  'o              o',
  'o              o',
  'o              o',
  'o              o',
  'o              o',
  'o              o',
  'o              o',
  'o              o',
  'o              o',
  '.o            o.',
  '..oooooooooooo..',
];
const shade = (hex, f) => '#' + [1, 3, 5].map(i => Math.round(Math.min(255, parseInt(hex.substr(i, 2), 16) * f)).toString(16).padStart(2, '0')).join('');
const jarCache = {};
function jarPixelURL(pct, color) {
  const liquid = Math.round(14 * Math.min(100, pct) / 100); // inside rows 4..17
  const key = color + liquid;
  if (jarCache[key]) return jarCache[key];
  const c = document.createElement('canvas'); c.width = 16; c.height = JAR_ART.length;
  const g = c.getContext('2d');
  JAR_ART.forEach((row, y) => [...row].forEach((ch, x) => {
    let col = null;
    if (ch === 'o') col = PAL.outline;
    else if (ch === 'L') col = y === 1 ? shade(color, 1.15) : shade(color, .8);
    else if (ch === ' ') {
      const wet = y >= 18 - liquid, edgeR = row[x + 1] !== ' ';
      if (wet) col = y === 18 - liquid ? shade(color, 1.2) : edgeR ? shade(color, .8) : color;
      else col = edgeR ? '#d9eef0' : '#eef8f8';
      if (x === 2 && y >= 8 && y <= 14) col = '#ffffff'; // glass shine
    }
    if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  }));
  return jarCache[key] = c.toDataURL();
}
function addJar() {
  const name = $('goalName').value.trim(), target = +$('goalTarget').value;
  if (!name || !(target > 0)) return toast('Add a name and target');
  S.goals.push({ name, target, saved: 0, log: [], color: JAR_COLORS[S.goals.length % JAR_COLORS.length] });
  draftJar = false;
  save(); renderGoals();
}
function renderGoals() {
  const nextColor = JAR_COLORS[S.goals.length % JAR_COLORS.length];
  $('goals').innerHTML = S.goals.map((g, i) => {
    const pct = Math.min(100, g.saved / g.target * 100), loggedToday = g.log.some(l => l.date === today());
    const color = g.color || JAR_COLORS[i % JAR_COLORS.length];
    return `<div class="jar-card ${pct >= 100 ? 'full' : ''}" style="--jar:${color}">
      <img class="jar-img" src="${jarPixelURL(pct, color)}" alt="">
      <div class="jar-name">${esc(g.name)} ${pct >= 100 ? pi('party') : ''}</div>
      <div class="bar"><div style="width:${pct}%"></div></div>
      <div class="jar-amt">$${g.saved.toLocaleString()} / $${g.target.toLocaleString()} · ${Math.floor(pct)}%</div>
      <span class="muted">${loggedToday ? pi('check') + ' added today' : 'not added today'}</span>
      <button class="primary jar-fill" data-i="${i}">+ Add money</button>
    </div>`;
  }).join('') + (draftJar
    ? `<div class="jar-card draft" style="--jar:${nextColor}">
        <img class="jar-img" src="${jarPixelURL(0, nextColor)}" alt="">
        <label>Dream<input id="goalName" placeholder="e.g. Trip to Japan"></label>
        <label>Target ($)<input id="goalTarget" type="number" min="1" placeholder="3000"></label>
        <div class="goal-row"><button id="cancelJar">Cancel</button><button id="addGoal" class="primary">Create</button></div>
      </div>`
    : `<button class="jar-card jar-add" id="newJarBtn" aria-label="Add a new Wish Jar"><span class="plus">+</span>New jar</button>`);
  if (draftJar) {
    $('goalName').focus();
    $('addGoal').onclick = addJar;
    $('cancelJar').onclick = () => { draftJar = false; renderGoals(); };
    $('goalTarget').onkeydown = $('goalName').onkeydown = e => { if (e.key === 'Enter') addJar(); };
  } else $('newJarBtn').onclick = () => { draftJar = true; renderGoals(); };
  const cur = $('depJar').value;
  $('depJar').innerHTML = '<option value="">General savings</option>' + S.goals.map((g, i) => `<option value="${i}">${esc(g.name)}</option>`).join('');
  $('depJar').value = cur;
  // "Add money" jumps to the bank pop-up with this jar already picked
  $('goals').querySelectorAll('button[data-i]').forEach(b => b.onclick = () => {
    openPanel('bank');
    $('depJar').value = b.dataset.i;
    renderJarPick();
    $('depAmount').focus();
  });
  renderJarPick();
}
// Bank: your Wish Jars as little pixel jars; click one to send this saving into it (click again for "none")
function renderJarPick() {
  const cur = $('depJar').value;
  const none = `<button type="button" class="jar-opt none ${cur === '' ? 'on' : ''}" data-jar="" role="radio" aria-checked="${cur === ''}">
      <span class="none-ico">–</span><span class="jar-opt-name">none</span></button>`;
  const jars = S.goals.map((g, i) => {
    const pct = Math.min(100, g.saved / g.target * 100), color = g.color || JAR_COLORS[i % JAR_COLORS.length], on = cur === String(i);
    return `<button type="button" class="jar-opt ${on ? 'on' : ''}" data-jar="${i}" role="radio" aria-checked="${on}" title="${esc(g.name)} · $${g.saved} / $${g.target}">
      <img src="${jarPixelURL(pct, color)}" alt=""><span class="jar-opt-name">${esc(g.name)}</span></button>`;
  }).join('');
  const add = `<button type="button" class="jar-opt add" data-newjar><span class="none-ico">+</span><span class="jar-opt-name">new jar</span></button>`;
  $('jarPick').innerHTML = none + jars + add;
  $('jarPick').querySelectorAll('[data-jar]').forEach(b => b.onclick = () => {
    $('depJar').value = b.dataset.jar !== '' && b.dataset.jar === cur ? '' : b.dataset.jar;
    renderJarPick();
  });
  $('jarPick').querySelector('[data-newjar]').onclick = () => { openPanel('jars'); draftJar = true; renderGoals(); };
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
    setTimeout(() => toast(`:flame: ${S.streak}-day streak! +${bonus} bonus :coin:`), 2100);
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
      <i class="box" aria-hidden="true"></i><span class="text"><span class="label"><span class="ink">${m.text}</span></span></span><b>+${m.reward}${pi('coin')}</b></li>`;
  }).join('');
  $('missions').querySelectorAll('li:not(.done)').forEach(li => {
    li.onclick = () => tickMission(li);
    li.onkeydown = e => { if (e.key === 'Enter') tickMission(li); };
  });
  $('streakInfo').innerHTML = `${pi('flame')} Current streak: <b>${S.streak} day${S.streak === 1 ? '' : 's'}</b>. ${S.lastStreakDay === today() ? 'Streak secured for today!' : 'Complete a mission to keep it going!'}`;
}

// Ticking a task: tasks that need a real action take you there; the rest tick off with a strike-through.
function tickMission(li) {
  const id = li.dataset.id, m = MISSIONS.find(x => x.id === id);
  if (li.classList.contains('striking')) return;
  if (m.auto) {
    if (id === 'deposit') { toast('Log any amount in the bank to tick this off'); return openPanel('bank'); }
    if (id === 'goal') { toast('Add money to a Wish Jar to tick this off'); return openPanel('jars'); }
    if (id === 'chat') return toast('Walk up to Maple :fox: and press Space to ask a question');
  }
  li.classList.add('striking');
  setTimeout(() => completeMission(id), 600); // let the strike animation play, then it drops to the bottom
}

// ---------- Villager chatbot (stub — wire to an LLM later) ----------
const TIPS = [
  "Pay yourself first! Move savings out on payday before you spend.",
  "A TFSA lets your investments grow tax-free in Canada. :leaf:",
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
function addMsg(text, who) { const d = document.createElement('div'); d.className = 'msg ' + who; d.innerHTML = pit(text); $('chatLog').append(d); $('chatLog').scrollTop = 1e9; }
function openChat() {
  closePanels(); Object.keys(keys).forEach(k => keys[k] = false);
  $('chat').classList.remove('hidden');
  if (!$('chatLog').children.length) addMsg(`Hey there! I'm Maple :fox:. You've saved $${S.saved} so far — future you is cheering! Ask me about TFSAs, budgeting, FHSAs...`, 'bot');
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

function renderAll() { if (editMode) renderEditTools(); renderAccounts(); renderStats(); renderHistory(); renderRules(); renderShop(); renderInventory(); renderGoals(); window.renderPersonalGoals?.(); renderMissions(); }
renderAll();

if (document.body.classList.contains('intro-open')) {
  new MutationObserver((_, obs) => {
    if (!document.body.classList.contains('intro-open')) {
      obs.disconnect();
      if ($('visionSetupModal').classList.contains('hidden')) openPanel('bank');
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
} else openPanel('bank');

// Called by cloud.js when the cloud copy is newer than this browser's copy.
window.loadCloudState = data => {
  S = Object.assign(defaultState(), data);
  if (!data.worldV) S.worldV = 0;
  migrateWorld();
  try { localStorage.setItem('fmi', JSON.stringify(S)); } catch {}
  Object.assign(P, { x: S.player.x, y: S.player.y, rx: S.player.x, ry: S.player.y, moving: false });
  applyLayout(); applySavedPaths(); paintAll(); window.setTownBuilds(lastBuildList);
  followCam(true);
  rollDay(); renderAll(); window.renderVisionBoard?.();
};
window.getState = () => S;
window.hasLocalSave = () => hadLocalSave;
window.saveGame = () => save();
window.toast = toast;

// Header title goes back to the entrance screen
$('homeBtn').addEventListener('click', () => window.showIntro?.());
window.openPanel = openPanel;
