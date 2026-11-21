// Towns: a gallery of every town you're in, a corkboard newsboard of recent updates,
// and a detail view per town (invite code, project progress, townsfolk, leave).
// Firestore: towns/{CODE} = { name, code, createdBy, createdAt, members: { uid: { name, joinedAt } }, project }
//            towns/{CODE}/feed/{id} = { uid, name, text, points, createdAt, stageUp? }
// The player's town codes are kept on their island as S.townIds (S.townId = first one, for older saves).
import { auth, db, ready } from './cloud.js';
import {
  doc, collection, query, orderBy, limit, onSnapshot, runTransaction, updateDoc, deleteField, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Shared projects: members name a project and set its goal; saving habits add hammer points.
// One project at a time; when it's built it moves to towns/{CODE}.built and the next can start.
// If you change these numbers, update firestore.rules to match and redeploy it.
const MAX_POINTS = 300;                // per contribution
const MIN_GOAL = 100, MAX_GOAL = 50000; // project goal range

const $ = id => document.getElementById(id);
const S = () => window.getState();
const show = (el, on) => $(el).classList.toggle('hidden', !on);
const status = msg => { $('townStatus').textContent = msg; };
// small DOM helper: never uses innerHTML, because names and news come from other players
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.innerHTML = window.pit(text); return e; }; // pit escapes text + draws :icon: tokens

// No 0/O/1/I so codes are easy to read aloud
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
const playerName = () => (S().name || '').trim() || 'Islander';

// ---------- which towns am I in ----------
function myTowns() {
  const s = S();
  if (!Array.isArray(s.townIds)) s.townIds = s.townId ? [s.townId] : []; // migrate single-town saves
  return s.townIds;
}
function setTowns(ids) {
  S().townIds = ids;
  S().townId = ids[0] || null; // kept for older code / saves
  window.saveGame();
}

// ---------- live data for every town ----------
const towns = new Map();  // code -> town doc
const feeds = new Map();  // code -> recent feed items
const unsubs = new Map(); // code -> [unsubDoc, unsubFeed]
let openCode = null;      // town shown in the detail view (null = gallery)
let showForm = false;     // "start or join" form open in the gallery

function watch(code) {
  const uDoc = onSnapshot(doc(db, 'towns', code), snap => {
    const me = auth.currentUser?.uid;
    if (!snap.exists() || !snap.data().members?.[me]) { // town deleted or we were removed
      setTowns(myTowns().filter(c => c !== code));
      return syncWatches();
    }
    towns.set(code, snap.data());
    render();
  }, err => {
    console.warn('[town] listen failed', code, err);
    status('Could not load a town. Check your connection.');
  });
  const feedQ = query(collection(db, 'towns', code, 'feed'), orderBy('createdAt', 'desc'), limit(12));
  const uFeed = onSnapshot(feedQ, snap => {
    feeds.set(code, snap.docs.map(d => ({ id: d.id, ...d.data() })));
    render();
  }, err => console.warn('[town] feed failed', code, err));
  unsubs.set(code, [uDoc, uFeed]);
}

function syncWatches() {
  const ids = myTowns();
  for (const [code, fns] of unsubs) if (!ids.includes(code)) {
    fns.forEach(f => f()); unsubs.delete(code); towns.delete(code); feeds.delete(code);
  }
  for (const code of ids) if (!unsubs.has(code)) watch(code);
  if (openCode && !ids.includes(openCode)) openCode = null;
  render();
}

// ---------- rendering ----------
function ago(ts) {
  if (!ts) return 'just now';
  const s = Math.floor(Date.now() / 1000 - ts.seconds);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
const seed = str => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;
const PAPERS = ['#fff7e6', '#fde2e4', '#e2f0d6', '#dff1ef', '#fff1c1', '#ece4f7'];

function poster({ headline, body, stamp, meta, key }) {
  const h = seed(key || headline);
  const p = el('article', 'poster');
  p.style.setProperty('--tilt', ((h % 9) - 4) * .8 + 'deg');
  p.style.setProperty('--paper', PAPERS[h % PAPERS.length]);
  p.append(el('span', 'pin'), el('h4', 'headline', headline));
  if (body) p.append(el('p', 'body', body));
  if (stamp) p.append(el('span', 'stamp', stamp));
  if (meta) p.append(el('p', 'meta', meta));
  return p;
}

function renderBoard(target, codes) {
  const items = codes.flatMap(code => (feeds.get(code) || []).map(f => ({ ...f, code })))
    .sort((a, b) => (b.createdAt?.seconds ?? 9e9) - (a.createdAt?.seconds ?? 9e9))
    .slice(0, 8);
  const many = codes.length > 1;
  if (!items.length) {
    return $(target).replaceChildren(poster({
      key: 'empty', headline: codes.length ? 'No news yet!' : 'Welcome!',
      body: codes.length ? 'Start a project, then save something to post the first notice.' : 'Start or join a town and its news gets pinned here.',
    }));
  }
  $(target).replaceChildren(...items.map(f => {
    const town = towns.get(f.code)?.name || f.code;
    const meta = (many ? town + ' · ' : '') + ago(f.createdAt);
    if (f.done) return poster({ key: f.id, headline: ':party: Built!', body: `${town} finished the ${f.project}! ${f.name} placed the last brick.`, meta });
    if (f.started) return poster({ key: f.id, headline: ':crane: New project', body: `${f.name} started building: ${f.project}`, meta });
    if (f.stageUp) return poster({ key: f.id, headline: `:party: Stage ${f.stageUp + 1}!`, body: `${f.name} helped ${town} reach a new stage.`, meta });
    return poster({ key: f.id, headline: f.name, body: f.text + (f.project ? ` (for the ${f.project})` : ''), stamp: `+${f.points} :hammer:`, meta });
  }));
}

// A project is "active" while it's named and not yet built. Older towns may have an unnamed project = none yet.
const isNamed = p => !!(p && p.name && p.goal && p.number && p.startedBy);
const isActive = p => isNamed(p) && p.progress < p.goal;
const phase = f => f >= 1 ? 'Built!' : f >= .9 ? 'Finishing touches' : f >= .78 ? 'Roof going on' : f >= .45 ? 'Walls going up'
  : f >= .25 ? 'Scaffolding up' : f >= .05 ? 'Gathering materials' : 'Clearing the land';

function progressBar(p) {
  const bar = el('div', 'town-bar'), fill = el('div', 'fill');
  fill.style.width = (isNamed(p) ? Math.min(100, (p.progress / p.goal) * 100) : 0) + '%';
  bar.append(fill);
  return bar;
}

function renderGallery(ids) {
  const art = $('townIsle')?.toDataURL(); // the little town island picture from the corner of the screen
  const cards = ids.filter(c => towns.has(c)).map(code => {
    const t = towns.get(code), p = t.project;
    const n = Object.keys(t.members || {}).length, built = (t.built || []).length;
    const card = el('button', 'town-card');
    card.type = 'button';
    card.setAttribute('aria-label', `Open ${t.name}`);
    if (art) { const img = el('img'); img.src = art; img.alt = ''; card.append(img); }
    card.append(el('h4', null, t.name), el('p', 'town-meta', `:people: ${n} · :home: ${built} built`));
    if (isActive(p)) card.append(el('p', 'town-project', `:crane: ${p.name}`), progressBar(p),
      el('p', 'town-meta', `${p.progress} / ${p.goal} :hammer: · ${phase(p.progress / p.goal)}`));
    else card.append(el('p', 'town-project', isNamed(p) ? `:check: ${p.name} built!` : 'No project yet'), progressBar(isNamed(p) ? p : null),
      el('p', 'town-meta', 'Open to start the next project'));
    card.onclick = () => { openCode = code; showForm = false; render(); };
    return card;
  });
  const add = el('button', 'town-card add', showForm ? '✕ Close' : '＋ Start or join a town');
  add.type = 'button';
  add.onclick = () => { showForm = !showForm; render(); if (showForm) $('townName').focus(); };
  $('townCards').replaceChildren(...cards, add);
  show('townNone', showForm || !ids.length);
}

function renderDetail(code) {
  const t = towns.get(code);
  if (!t) return;
  const me = auth.currentUser?.uid;
  const members = Object.entries(t.members || {})
    .sort(([, a], [, b]) => (a.joinedAt?.seconds || 0) - (b.joinedAt?.seconds || 0));
  $('townTitle').innerHTML = window.pit(':town: ' + t.name);
  $('townCodeShow').textContent = t.code;
  $('townMembers').replaceChildren(...members.map(([uid, m]) =>
    el('li', null, (uid === t.createdBy ? ':crown: ' : ':island: ') + m.name + (uid === me ? ' (you)' : '') + (uid === t.createdBy ? ' · founder' : ''))));

  const p = t.project, active = isActive(p);
  show('projActive', isNamed(p));
  show('projNew', !active);
  if (isNamed(p)) {
    const f = Math.min(1, p.progress / p.goal);
    $('projectTitle').innerHTML = window.pit(`${active ? ':crane:' : ':check:'} ${p.name}`);
    $('projectFill').style.width = f * 100 + '%';
    $('projectText').innerHTML = window.pit(active
      ? `${p.progress} / ${p.goal} :hammer: · ${phase(f)} · watch it grow on your island!`
      : 'Built! It now stands on everyone\'s island. :party:');
  }
  $('projIntro').textContent = isNamed(p) ? 'Start the next project' : 'What should your town build first?';
  const built = t.built || [];
  $('builtList').replaceChildren(...(built.length
    ? built.map(b => el('li', null, `:check: ${b.name} · ${b.goal} :hammer:`))
    : [el('li', 'muted', 'Nothing yet. Finish a project to see it here.')]));
}

// Tell the island (game.js) what to draw: finished buildings + the one under construction, for every town.
function pushBuilds() {
  const list = [];
  for (const code of myTowns()) {
    const t = towns.get(code);
    if (!t) continue;
    for (const b of t.built || []) list.push({ town: t.name, name: b.name, f: 1 });
    if (isNamed(t.project)) list.push({ town: t.name, name: t.project.name, f: Math.min(1, t.project.progress / t.project.goal) });
  }
  window.setTownBuilds?.(list);
}

function render() {
  const ids = myTowns();
  if (openCode && !towns.has(openCode)) openCode = ids.includes(openCode) ? openCode : null;
  status(ids.length ? `You're in ${ids.length} town${ids.length === 1 ? '' : 's'}. Click one to see more.` : 'You are not in a town yet.');
  renderBoard('townBoard', ids);                 // gallery board: news from all your towns
  renderGallery(ids);
  show('townDetail', !!openCode);                // the clicked town opens in its own pop-up
  if (openCode) { renderBoard('townDetailBoard', [openCode]); renderDetail(openCode); }
  pushBuilds();
}

// ---------- projects ----------
async function startProject() {
  const code = openCode, name = $('projName').value.trim(), goal = Math.round(+$('projGoal').value);
  if (!code) return;
  if (!name) return window.toast('Give the project a name first!');
  if (!(goal >= MIN_GOAL && goal <= MAX_GOAL)) return window.toast(`Pick a goal between ${MIN_GOAL} and ${MAX_GOAL} :hammer:`);
  const user = auth.currentUser, ref = doc(db, 'towns', code);
  try {
    const result = await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return 'gone';
      const t = snap.data(), o = t.project;
      if (isActive(o)) return 'busy';                       // one project at a time
      const built = [...(t.built || [])];
      if (isNamed(o)) built.push({ name: o.name, goal: o.goal, number: o.number });
      tx.update(ref, {
        project: { name, goal, progress: 0, number: isNamed(o) ? o.number + 1 : 1, startedBy: user.uid },
        built,
      });
      tx.set(doc(collection(ref, 'feed')), {
        uid: user.uid, name: playerName(), text: 'started a new project', points: 0,
        project: name, started: true, createdAt: serverTimestamp(),
      });
      return 'ok';
    });
    if (result === 'busy') return window.toast('Your town is already building something. Finish it first!');
    if (result === 'ok') { $('projName').value = ''; window.toast(`:crane: ${name} is underway!`); }
  } catch (e) {
    console.warn('[town] start project failed', e);
    window.toast('Could not start the project (' + e.code + ')');
  }
}

// ---------- contributing (called by game.js whenever the player earns coins for a habit) ----------
async function contributeTo(code, text, points, user) {
  const townRef = doc(db, 'towns', code);
  try {
    const finished = await runTransaction(db, async tx => {
      const snap = await tx.get(townRef);
      if (!snap.exists()) return null;
      const p = snap.data().project;
      if (!isActive(p)) return null;                        // nothing being built right now
      const np = { ...p, progress: Math.min(p.goal, p.progress + points) };
      const done = np.progress >= np.goal;
      tx.update(townRef, { project: np });
      tx.set(doc(collection(townRef, 'feed')), {
        uid: user.uid, name: playerName(), text, points: np.progress - p.progress, project: p.name,
        createdAt: serverTimestamp(), ...(done ? { done: true } : {}),
      });
      return done ? p.name : null;
    });
    if (finished) window.toast(`:party: ${towns.get(code)?.name || 'Your town'} finished building the ${finished}!`);
  } catch (e) {
    console.warn('[town] contribute failed', code, e);
  }
}
async function contribute(text, coins) {
  const user = auth.currentUser;
  if (!user) return;
  const points = Math.min(MAX_POINTS, Math.max(1, Math.round(coins)));
  for (const code of myTowns()) await contributeTo(code, text, points, user); // your habit helps every town you're in
}
window.onHabit = contribute;

// ---------- create / join / leave ----------
async function createTown() {
  const name = $('townName').value.trim();
  if (!name) return window.toast('Give your town a name first!');
  const uid = auth.currentUser.uid;
  try {
    // retry a few times in the (unlikely) case the code is taken
    for (let i = 0; i < 5; i++) {
      const code = newCode();
      const ref = doc(db, 'towns', code);
      const ok = await runTransaction(db, async tx => {
        if ((await tx.get(ref)).exists()) return false;
        tx.set(ref, {
          name, code, createdBy: uid, createdAt: serverTimestamp(),
          members: { [uid]: { name: playerName(), joinedAt: serverTimestamp() } },
        });
        return true;
      });
      if (ok) {
        setTowns([...myTowns(), code]);
        $('townName').value = ''; showForm = false; openCode = code;
        syncWatches();
        return window.toast(`Founded ${name}! Share code ${code}`);
      }
    }
    window.toast('Could not create a town, try again.');
  } catch (e) {
    console.warn('[town] create failed', e);
    window.toast('Could not create town (' + e.code + ')');
  }
}

async function joinTown() {
  const code = $('townCode').value.trim().toUpperCase();
  if (code.length !== 6) return window.toast('Town codes are 6 characters.');
  if (myTowns().includes(code)) return window.toast("You're already in that town!");
  const uid = auth.currentUser.uid;
  try {
    const ref = doc(db, 'towns', code);
    const name = await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return null;
      tx.update(ref, { [`members.${uid}`]: { name: playerName(), joinedAt: serverTimestamp() } });
      return snap.data().name;
    });
    if (!name) return window.toast('No town with that code.');
    setTowns([...myTowns(), code]);
    $('townCode').value = ''; showForm = false; openCode = code;
    syncWatches();
    window.toast(`Welcome to ${name}!`);
  } catch (e) {
    console.warn('[town] join failed', e);
    window.toast('Could not join town (' + e.code + ')');
  }
}

async function leaveTown() {
  const code = openCode;
  if (!code || !confirm(`Leave ${towns.get(code)?.name || 'this town'}?`)) return;
  try {
    await updateDoc(doc(db, 'towns', code), { [`members.${auth.currentUser.uid}`]: deleteField() });
  } catch (e) {
    console.warn('[town] leave failed', e);
  }
  openCode = null;
  setTowns(myTowns().filter(c => c !== code));
  syncWatches();
}

// Keep your name in sync on your island and in every town's member list
let nameTimer;
$('playerName').addEventListener('input', () => {
  S().name = $('playerName').value.slice(0, 20);
  window.saveGame();
  clearTimeout(nameTimer);
  nameTimer = setTimeout(() => {
    for (const code of myTowns())
      updateDoc(doc(db, 'towns', code), { [`members.${auth.currentUser.uid}.name`]: playerName() })
        .catch(e => console.warn('[town] rename failed', e));
  }, 800);
});

$('createTown').onclick = createTown;
$('projStart').onclick = startProject;
$('projName').addEventListener('keydown', e => { if (e.key === 'Enter') startProject(); });
$('joinTown').onclick = joinTown;
$('leaveTown').onclick = leaveTown;
const closeDetail = () => { openCode = null; render(); };
$('townBack').onclick = closeDetail;
$('townDetail').addEventListener('mousedown', e => { if (e.target === $('townDetail')) closeDetail(); });
window.closeTownDetail = () => { if (!openCode) return false; closeDetail(); return true; }; // Esc closes this first
$('copyCode').onclick = () => {
  navigator.clipboard?.writeText($('townCodeShow').textContent)
    .then(() => window.toast('Code copied!'), () => window.toast('Copy failed, select it instead.'));
};
setInterval(() => { if (!$('panel-town').classList.contains('hidden')) render(); }, 60000); // keep "5m ago" fresh

ready.then(user => {
  if (!user) return status('Offline: towns need an internet connection.');
  $('playerName').value = S().name || '';
  myTowns();
  syncWatches();
});
