// ===== Future Me Island — MVP =====
const TILE = 40, COLS = 20, ROWS = 14;
const COINS_PER_DOLLAR = 10;

const SHOP = [
  { id: 'flower', emoji: '🌷', name: 'Tulip', price: 50 },
  { id: 'tree', emoji: '🌳', name: 'Oak Tree', price: 150 },
  { id: 'palm', emoji: '🌴', name: 'Palm Tree', price: 200 },
  { id: 'bench', emoji: '🪑', name: 'Chair', price: 250 },
  { id: 'lamp', emoji: '🏮', name: 'Lantern', price: 300 },
  { id: 'fountain', emoji: '⛲', name: 'Fountain', price: 800 },
  { id: 'tent', emoji: '⛺', name: 'Tent', price: 500 },
  { id: 'house', emoji: '🏡', name: 'Dream Home', price: 5000 },
  { id: 'car', emoji: '🚗', name: 'First Car', price: 3000 },
  { id: 'plane', emoji: '✈️', name: 'Travel Fund', price: 2000 },
  { id: 'grad', emoji: '🎓', name: 'Diploma', price: 1500 },
  { id: 'castle', emoji: '🏰', name: 'Castle', price: 20000 },
];

const MISSIONS = [
  { id: 'deposit', text: 'Make a deposit (any amount)', reward: 20, auto: true },
  { id: 'goal', text: 'Log progress on a goal', reward: 15, auto: true },
  { id: 'chat', text: 'Ask Maple a money question', reward: 10, auto: true },
  { id: 'skip', text: 'Skip one impulse buy today', reward: 15 },
  { id: 'learn', text: 'Read one personal-finance tip', reward: 10 },
];

// ---------- State (localStorage) ----------
const today = () => new Date().toISOString().slice(0, 10);
const defaultState = () => ({
  coins: 100, saved: 0, history: [], inventory: {}, placed: [],
  goals: [], streak: 0, lastStreakDay: null, missionsDay: today(), missionsDone: [],
  player: { x: 9, y: 8 },
});
let S;
try { S = Object.assign(defaultState(), JSON.parse(localStorage.getItem('fmi')) || {}); } catch { S = defaultState(); }
const save = () => { try { localStorage.setItem('fmi', JSON.stringify(S)); } catch {} };

// reset daily missions on a new day; break streak if a day was missed
function rollDay() {
  if (S.missionsDay !== today()) { S.missionsDay = today(); S.missionsDone = []; }
  if (S.lastStreakDay) {
    const gap = (new Date(today()) - new Date(S.lastStreakDay)) / 86400000;
    if (gap > 1) S.streak = 0;
  }
  save();
}
rollDay();

// ---------- Map ----------
// 0 water, 1 sand, 2 grass
const map = [];
for (let y = 0; y < ROWS; y++) {
  map.push([]);
  for (let x = 0; x < COLS; x++) {
    const dx = (x - COLS / 2 + .5) / (COLS / 2), dy = (y - ROWS / 2 + .5) / (ROWS / 2);
    const d = dx * dx + dy * dy + Math.sin(x * 1.3 + y) * 0.06;
    map[y].push(d > 0.95 ? 0 : d > 0.7 ? 1 : 2);
  }
}
const VILLAGER = { x: 13, y: 5 };
const walkable = (x, y) => map[y]?.[x] > 0 && !(x === VILLAGER.x && y === VILLAGER.y)
  && !S.placed.some(p => p.x === x && p.y === y && p.id !== 'flower');

// ---------- Rendering ----------
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
let selectedItem = null, hover = null, t = 0;
const draw = () => {
  t++;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const v = map[y][x];
    ctx.fillStyle = v === 0 ? ((x + y + (t >> 5)) % 2 ? '#4fb3d9' : '#5bbde0') : v === 1 ? '#f3e1a8' : ((x + y) % 2 ? '#8fd16a' : '#86c860');
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '30px serif';
  const things = [...S.placed.map(p => ({ ...p, emoji: SHOP.find(s => s.id === p.id).emoji })),
    { x: VILLAGER.x, y: VILLAGER.y, emoji: '🦊' }].sort((a, b) => a.y - b.y);
  things.forEach(p => ctx.fillText(p.emoji, p.x * TILE + 20, p.y * TILE + 22));

  // villager prompt bubble
  if (nearVillager()) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(VILLAGER.x * TILE - 30, VILLAGER.y * TILE - 34, 100, 26, 12); ctx.fill();
    ctx.fillStyle = '#4a3b2a'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('Space to chat', VILLAGER.x * TILE + 20, VILLAGER.y * TILE - 21);
  }

  // player
  const px = P.rx * TILE + 20, py = P.ry * TILE + 20 + Math.sin(t / 6) * (P.moving ? 2 : 0);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(px, py + 16, 13, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#ff8fab'; ctx.beginPath(); ctx.roundRect(px - 11, py - 2, 22, 18, 6); ctx.fill(); // body
  ctx.fillStyle = '#ffdcb5'; ctx.beginPath(); ctx.arc(px, py - 9, 12, 0, 7); ctx.fill(); // head
  ctx.fillStyle = '#6b3e26'; ctx.beginPath(); ctx.arc(px, py - 13, 12, Math.PI, 0); ctx.fill(); // hair
  ctx.fillStyle = '#333'; const ex = P.dir === 'left' ? -3 : P.dir === 'right' ? 3 : 0;
  if (P.dir !== 'up') { ctx.fillRect(px - 5 + ex, py - 9, 3, 4); ctx.fillRect(px + 2 + ex, py - 9, 3, 4); }

  // placement preview
  if (selectedItem && hover) {
    ctx.globalAlpha = .5; ctx.font = '30px serif';
    ctx.fillText(SHOP.find(s => s.id === selectedItem).emoji, hover.x * TILE + 20, hover.y * TILE + 22);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = canPlace(hover.x, hover.y) ? '#fff' : '#e74c3c'; ctx.lineWidth = 3;
    ctx.strokeRect(hover.x * TILE + 2, hover.y * TILE + 2, TILE - 4, TILE - 4);
  }
};

// ---------- Player movement (arrow keys) ----------
const P = { x: S.player.x, y: S.player.y, rx: S.player.x, ry: S.player.y, dir: 'down', moving: false };
const keys = {};
const typing = () => ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);
addEventListener('keydown', e => {
  if (typing()) return;
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
$('depositBtn').onclick = () => {
  const amt = Math.floor(+$('depAmount').value);
  if (!(amt > 0)) return toast('Enter an amount');
  const coins = amt * COINS_PER_DOLLAR;
  S.saved += amt; S.coins += coins;
  S.history.unshift({ amt, type: $('depType').value, date: today() });
  save(); renderAll(); toast(`+${coins} 🪙 — Future you says thanks!`);
  completeMission('deposit');
};
function renderHistory() {
  $('history').innerHTML = S.history.slice(0, 20).map(h => `<li>${h.date} · <b>$${h.amt}</b> → ${h.type} <span class="muted">(+${h.amt * COINS_PER_DOLLAR}🪙)</span></li>`).join('') || '<li class="muted">No deposits yet</li>';
}

// ---------- Shop / Inventory ----------
function renderShop() {
  $('shop').innerHTML = SHOP.map(s => `<div class="item ${S.coins < s.price ? 'locked' : ''}" data-id="${s.id}"><span class="emoji">${s.emoji}</span>${s.name}<br><b>${s.price}🪙</b></div>`).join('');
  $('shop').querySelectorAll('.item').forEach(el => el.onclick = () => {
    const s = SHOP.find(i => i.id === el.dataset.id);
    if (S.coins < s.price) return toast(`Save $${Math.ceil((s.price - S.coins) / COINS_PER_DOLLAR)} more to unlock!`);
    S.coins -= s.price; S.inventory[s.id] = (S.inventory[s.id] || 0) + 1;
    save(); renderAll(); toast(`Bought ${s.name}! Select it below to place.`);
  });
}
function renderInventory() {
  const ids = Object.keys(S.inventory);
  $('inventory').innerHTML = ids.map(id => { const s = SHOP.find(i => i.id === id); return `<div class="item ${selectedItem === id ? 'selected' : ''}" data-id="${id}"><span class="emoji">${s.emoji}</span>${s.name} ×${S.inventory[id]}</div>`; }).join('') || '<p class="muted">Nothing yet — buy something!</p>';
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
  }).join('') || '<p class="muted">What does your dream life look like? Add a goal!</p>';
  $('goals').querySelectorAll('button').forEach(b => b.onclick = () => {
    const g = S.goals[b.dataset.i], amt = Math.floor(+$('gi' + b.dataset.i).value);
    if (!(amt > 0)) return toast('Enter an amount');
    g.saved += amt; g.log.push({ date: today(), amt });
    save(); renderGoals(); toast(g.saved >= g.target ? `🎉 Goal "${g.name}" reached!` : 'Progress logged!');
    completeMission('goal');
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

function renderAll() { renderStats(); renderHistory(); renderShop(); renderInventory(); renderGoals(); renderMissions(); }
renderAll();
