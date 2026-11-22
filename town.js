// Towns: a gallery of every town you're in, a corkboard newsboard of recent updates,
// and a detail view per town (invite code, project progress, townsfolk, leave).
// Firestore: towns/{CODE} = { name, code, createdBy, createdAt, members: { uid: { name, joinedAt } }, project }
//            towns/{CODE}/feed/{id} = { uid, name, text, points, createdAt, stageUp? }
// The player's town codes are kept on their island as S.townIds (S.townId = first one, for older saves).
import { auth, db, ready } from './cloud.js';
import {
  doc, collection, query, orderBy, limit, where, getDocs, addDoc, deleteDoc, onSnapshot, runTransaction, updateDoc, deleteField, serverTimestamp,
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
// Each device signs in with its own uid, but synced devices share one island. When synced, member entries,
// posts and hearts carry the island's public id (cloud.js: sha256 of the sync code; never the code itself),
// so a player's phone + laptop count as one person and either can edit their notes. The database only lets
// a device use that id after registering with the real code (pubs/{id}/devices, firestore.rules).
const islandKey = () => window.sync?.pub?.() || null;
const memberEntry = () => { const island = islandKey(); return { name: playerName(), joinedAt: serverTimestamp(), ...(island ? { island } : {}) }; };
const withIsland = data => { const island = islandKey(); return island ? { ...data, island } : data; };
// is this post mine? (written on this device, or on another device of my synced island)
const isMine = f => f.uid === auth.currentUser?.uid || (!!f.island && f.island === islandKey());
// who a member "is" for display: their island if known, else their device uid
const personOf = (t, uid) => t?.members?.[uid]?.island || uid;
const joining = new Set(); // towns this device is currently auto-joining

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
    if (!snap.exists()) { // town deleted
      setTowns(myTowns().filter(c => c !== code));
      return syncWatches();
    }
    const mine = snap.data().members?.[me];
    if (!mine) {
      // the town is on this island but this device isn't a member yet: the island was synced from another
      // device, so join from here too (leaving always takes the town off the island first, see syncWatches)
      if (me && !joining.has(code)) {
        joining.add(code);
        updateDoc(doc(db, 'towns', code), { [`members.${me}`]: memberEntry() })
          .catch(e => console.warn('[town] auto-join failed', code, e))
          .finally(() => joining.delete(code));
      }
      return;
    }
    const island = islandKey();
    if ((mine.island || null) !== island) // synced / unsynced since joining: keep the island tag right
      updateDoc(doc(db, 'towns', code), { [`members.${me}.island`]: island || deleteField() }).catch(e => console.warn('[town] island tag failed', e));
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
    const me = auth.currentUser?.uid; // take this device off the member list too
    if (me) updateDoc(doc(db, 'towns', code), { [`members.${me}`]: deleteField() }).catch(e => console.warn('[town] leave failed', code, e));
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
// Poster colours: event types have fixed colours, everyday habit posts get one colour per player
const EVENT_PAPER = { started: '#ffe58a', done: '#bfe6a8', stageUp: '#ffc9a3', empty: '#fff7e6' };
const PLAYER_PAPERS = ['#fde2e4', '#dff1ef', '#ece4f7', '#dbe8fb', '#f6dcef', '#e2f0d6', '#f3e6d6', '#d9f2f7'];
const playerPaper = uid => PLAYER_PAPERS[seed(uid || '?') % PLAYER_PAPERS.length];

function poster({ headline, body, stamp, meta, key, paper }) {
  const h = seed(key || headline);
  const p = el('article', 'poster');
  p.style.setProperty('--tilt', ((h % 9) - 4) * .8 + 'deg');
  p.style.setProperty('--paper', paper || EVENT_PAPER.empty);
  p.append(el('span', 'pin'), el('h4', 'headline', headline));
  if (body) p.append(el('p', 'body', body));
  if (stamp) p.append(el('span', 'stamp', stamp));
  if (meta) p.append(el('p', 'meta', meta));
  return p;
}

function renderBoard(target, codes) {
  if (document.activeElement?.classList.contains('note-edit') && $(target).contains(document.activeElement)) return; // don't wipe a note mid-edit
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
  $(target).replaceChildren(...items.map(f => newsPoster(f, many)));
}
function newsPoster(f, showTown) {
  const p = newsPosterBody(f, showTown);
  if (f.id && f.code) p.append(posterActions(f, p));
  return p;
}
// heart for everyone else's posts; edit / delete on your own notes
function posterActions(f, p) {
  const me = auth.currentUser?.uid, ref = doc(db, 'towns', f.code, 'feed', f.id);
  // keep hearts on the cached feed item, so an instant (optimistic) change survives the next re-render
  const cached = (feeds.get(f.code) || []).find(x => x.id === f.id);
  const hearts = cached ? (cached.hearts ||= {}) : (f.hearts || {});
  const row = el('div', 'poster-actions');
  const heart = el('button', 'heart');
  heart.type = 'button';
  const paint = () => {
    const town = towns.get(f.code), island = islandKey();
    const n = new Set(Object.keys(hearts).map(k => personOf(town, k))).size; // a person's devices count once
    const mine = !!hearts[me] || (!!island && !!hearts[island]);
    heart.className = 'heart' + (mine ? ' on' : '');
    heart.textContent = `${mine ? '♥' : '♡'} ${n || ''}`.trim();
    if (isMine(f)) heart.title = n ? `${n} heart${n === 1 ? '' : 's'}` : 'No hearts yet';
    else heart.setAttribute('aria-label', mine ? 'Remove heart' : 'Heart this');
  };
  paint();
  if (isMine(f)) heart.disabled = true;
  else heart.onclick = () => {
    // update the button right away, then save; put it back if the save fails
    const island = islandKey(), key = island || me; // heart as the island when synced
    const on = !(hearts[me] || (island && hearts[island]));
    const before = { ...hearts };
    const change = { heartBy: key };
    if (on) { hearts[key] = true; change[`hearts.${key}`] = true; }
    else for (const k of [me, island]) if (k && hearts[k]) { delete hearts[k]; change[`hearts.${k}`] = deleteField(); }
    paint();
    updateDoc(ref, change).catch(e => {
      for (const k of Object.keys(hearts)) delete hearts[k]; Object.assign(hearts, before);
      paint();
      console.warn('[town] heart failed', e); window.toast('Could not heart (' + e.code + ')');
    });
  };
  row.append(heart);
  if (f.note && isMine(f)) {
    const edit = el('button', null, ':pencil:'), del = el('button', null, ':trash:');
    edit.type = del.type = 'button';
    edit.setAttribute('aria-label', 'Edit note'); del.setAttribute('aria-label', 'Delete note');
    edit.onclick = () => {
      const body = p.querySelector('.body'), input = el('input', 'note-edit');
      input.value = f.text; input.maxLength = 100;
      const saveEdit = () => {
        input.onblur = null; input.classList.remove('note-edit'); // let the board refresh again
        const text = input.value.trim().slice(0, 100);
        if (!text || text === f.text) return render();
        updateDoc(ref, { text, edited: true }).catch(e => { console.warn('[town] edit failed', e); window.toast('Could not edit (' + e.code + ')'); render(); });
      };
      input.onkeydown = e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { e.stopPropagation(); render(); } };
      input.onblur = saveEdit;
      body.replaceWith(input); input.focus();
    };
    del.onclick = () => {
      if (!confirm('Delete this note?')) return;
      deleteDoc(ref).then(() => window.toast('Note removed'))
        .catch(e => { console.warn('[town] delete failed', e); window.toast('Could not delete (' + e.code + ')'); });
    };
    row.append(edit, del);
  }
  return row;
}
function newsPosterBody(f, showTown) {
  const town = towns.get(f.code)?.name || f.code;
  const meta = (showTown ? town + ' · ' : '') + ago(f.createdAt) + (f.edited ? ' · edited' : '');
  if (f.done) return poster({ key: f.id, paper: EVENT_PAPER.done, headline: ':party: Built!', body: `${town} finished the ${f.project}! ${f.name} placed the last brick.`, meta });
  if (f.started) return poster({ key: f.id, paper: EVENT_PAPER.started, headline: ':crane: New project', body: `${f.name} started building: ${f.project}`, meta });
  if (f.note) return poster({ key: f.id, paper: playerPaper(f.uid), headline: `:letter: ${f.name}`, body: f.text, meta });
  if (f.stageUp) return poster({ key: f.id, paper: EVENT_PAPER.stageUp, headline: `:party: Stage ${f.stageUp + 1}!`, body: `${f.name} helped ${town} reach a new stage.`, meta });
  return poster({ key: f.id, paper: playerPaper(f.uid), headline: f.name, body: f.text + (f.project ? ` (for the ${f.project})` : ''), stamp: `+${f.points} :hammer:`, meta });
}

// ---------- build info (Space next to a building on the island) ----------
window.openBuildInfo = async b => {
  window.openPanel('build');
  const t = towns.get(b.code);
  $('buildTitle').innerHTML = window.pit(`${b.f >= 1 ? ':check:' : ':crane:'} ${b.name}`);
  $('buildSub').textContent = `${t?.name || b.code} · ${b.f >= 1 ? 'Built!' : `${Math.floor(b.f * 100)}% · ${phase(b.f)}`}`;
  $('buildFill').style.width = b.f * 100 + '%';
  $('buildContrib').replaceChildren(el('li', 'muted', 'Loading…'));
  $('buildNews').replaceChildren();
  try {
    const snap = await getDocs(query(collection(db, 'towns', b.code, 'feed'), where('project', '==', b.name)));
    const items = snap.docs.map(d => ({ id: d.id, code: b.code, ...d.data() }))
      .sort((x, y) => (y.createdAt?.seconds ?? 9e9) - (x.createdAt?.seconds ?? 9e9));
    const tasks = items.filter(f => !f.started && f.points > 0);
    const by = new Map(), town = towns.get(b.code);
    for (const f of tasks) {
      const who = f.island || personOf(town, f.uid); // synced devices count as one person
      const c = by.get(who) || { name: f.name, n: 0, pts: 0, uid: f.uid };
      c.n++; c.pts += f.points; by.set(who, c);
    }
    const rows = [...by.entries()].sort((a, c) => c[1].n - a[1].n).map(([uid, c]) => {
      const pct = Math.round(c.n / tasks.length * 100);
      const li = el('li', 'contrib');
      const bar = el('div', 'town-bar'), fill = el('div', 'fill');
      fill.style.width = pct + '%'; fill.style.background = playerPaper(c.uid); bar.append(fill);
      li.append(el('span', null, `${c.name}${uid === personOf(town, auth.currentUser?.uid) ? ' (you)' : ''}`), el('b', null, `${pct}% · ${c.n} task${c.n === 1 ? '' : 's'} · ${c.pts} :hammer:`), bar);
      return li;
    });
    $('buildContrib').replaceChildren(...(rows.length ? rows : [el('li', 'muted', 'No one has helped yet. Save something to add the first brick!')]));
    $('buildNews').replaceChildren(...items.slice(0, 6).map(f => newsPoster(f, false)));
  } catch (e) {
    console.warn('[town] build info failed', e);
    $('buildContrib').replaceChildren(el('li', 'muted', 'Could not load contributions (offline?)'));
  }
};

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
  const seen = new Set(), founder = personOf(t, t.createdBy), myself = personOf(t, me);
  const members = Object.entries(t.members || {})
    .sort(([, a], [, b]) => (a.joinedAt?.seconds || 0) - (b.joinedAt?.seconds || 0))
    .filter(([uid]) => { const p = personOf(t, uid); if (seen.has(p)) return false; seen.add(p); return true; }); // synced devices = one person
  $('townTitle').innerHTML = window.pit(':town: ' + t.name);
  $('townCodeShow').textContent = t.code;
  $('townMembers').replaceChildren(...members.map(([uid, m]) => {
    const p = personOf(t, uid);
    return el('li', null, (p === founder ? ':crown: ' : ':island: ') + m.name + (p === myself ? ' (you)' : '') + (p === founder ? ' · founder' : ''));
  }));

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
    for (const b of t.built || []) list.push({ key: `${code}#${b.number}`, code, town: t.name, name: b.name, f: 1 });
    if (isNamed(t.project)) list.push({ key: `${code}#${t.project.number}`, code, town: t.name, name: t.project.name, f: Math.min(1, t.project.progress / t.project.goal),
      progress: t.project.progress, goal: t.project.goal, members: Object.keys(t.members || {}).length });
  }
  window.setTownBuilds?.(list);
}

function render() {
  const ids = myTowns();
  if (openCode && !towns.has(openCode)) openCode = ids.includes(openCode) ? openCode : null;
  status(ids.length ? `You're in ${ids.length} town${ids.length === 1 ? '' : 's'}. Click one to see more.` : 'You are not in a town yet.');
  renderBoard('townBoard', ids);                 // gallery board: news from all your towns
  const pick = $('noteTown').value;
  $('noteTown').replaceChildren(...ids.filter(c => towns.has(c)).map(c => { const o = el('option', null, towns.get(c).name); o.value = c; return o; }));
  if (ids.includes(pick)) $('noteTown').value = pick;
  show('noteTown', ids.length > 1);
  show('noteForm', ids.length > 0);
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
        ...withIsland({}), uid: user.uid, name: playerName(), text: 'started a new project', points: 0,
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
        ...withIsland({}), uid: user.uid, name: playerName(), text, points: np.progress - p.progress, project: p.name,
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
window.onIslandLoaded = () => syncWatches(); // a synced island arrived (cloud.js -> game.js loadCloudState)

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
          members: { [uid]: memberEntry() },
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
      tx.update(ref, { [`members.${uid}`]: memberEntry() });
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
  openCode = null;
  setTowns(myTowns().filter(c => c !== code));
  syncWatches(); // stops watching and removes this device from the member list
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

// ---------- encouragement notes pinned to the news board ----------
async function postNote(code, input) {
  const text = input.value.trim().slice(0, 100);
  if (!code) return window.toast('Join a town first!');
  if (!text) return window.toast('Write a note first!');
  try {
    await addDoc(collection(db, 'towns', code, 'feed'), {
      ...withIsland({}), uid: auth.currentUser.uid, name: playerName(), text, points: 0, note: true, createdAt: serverTimestamp(),
    });
    input.value = '';
    window.toast(':pin: Note pinned!');
  } catch (e) {
    console.warn('[town] note failed', e);
    window.toast('Could not pin the note (' + e.code + ')');
  }
}
$('noteForm').onsubmit = e => { e.preventDefault(); postNote($('noteTown').value, $('noteText')); };
$('noteFormDetail').onsubmit = e => { e.preventDefault(); postNote(openCode, $('noteTextDetail')); };

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
