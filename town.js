// Towns, step 1: create a town, join one by code, see who's in it (live).
// Firestore: towns/{CODE} = { name, code, createdBy, createdAt, members: { uid: { name, joinedAt } } }
// The player's town code is kept on their island as S.townId.
import { auth, db, ready } from './cloud.js';
import {
  doc, collection, query, orderBy, limit, onSnapshot, runTransaction, updateDoc, deleteField, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Step 2: shared project. Habits earn points; every GOAL points the project grows a stage.
// towns/{CODE}.project = { stage, progress, goal }   towns/{CODE}/feed/{id} = { uid, name, text, points, createdAt }
const STAGE_GOAL = 500;
const MAX_POINTS = 300; // per contribution, must match the Firestore rules
const defaultProject = () => ({ stage: 0, progress: 0, goal: STAGE_GOAL });

const $ = id => document.getElementById(id);
const S = () => window.getState();
const show = (el, on) => $(el).classList.toggle('hidden', !on);
const status = msg => { $('townStatus').textContent = msg; };

// No 0/O/1/I so codes are easy to read aloud
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

const playerName = () => (S().name || '').trim() || 'Islander';
let unsub = null;

function setTownId(id) {
  S().townId = id;
  window.saveGame();
}

let unsubFeed = null;

function watchTown(code) {
  unsub?.(); unsubFeed?.();
  unsub = unsubFeed = null;
  if (!code) { renderNoTown(); return; }
  const feedQ = query(collection(db, 'towns', code, 'feed'), orderBy('createdAt', 'desc'), limit(20));
  unsubFeed = onSnapshot(feedQ, snap => renderFeed(snap.docs.map(d => d.data())),
    err => console.warn('[town] feed failed', err));
  unsub = onSnapshot(doc(db, 'towns', code), snap => {
    const me = auth.currentUser?.uid;
    if (!snap.exists() || !snap.data().members?.[me]) {
      // town deleted or we were removed
      setTownId(null);
      watchTown(null);
      return;
    }
    renderTown(snap.data());
  }, err => {
    console.warn('[town] listen failed', err);
    status('Could not load your town. Check your connection.');
  });
}

function renderNoTown() {
  status('You are not in a town yet.');
  show('townNone', true); show('townHas', false);
}

function renderTown(t) {
  const me = auth.currentUser?.uid;
  const members = Object.entries(t.members || {})
    .sort(([, a], [, b]) => (a.joinedAt?.seconds || 0) - (b.joinedAt?.seconds || 0));
  status(`${members.length} islander${members.length === 1 ? '' : 's'} in town`);
  $('townTitle').textContent = '🏘️ ' + t.name;
  $('townCodeShow').textContent = t.code;
  $('townMembers').replaceChildren(...members.map(([uid, m]) => {
    const li = document.createElement('li');
    li.textContent = (uid === t.createdBy ? '👑 ' : '🏝️ ') + m.name + (uid === me ? ' (you)' : '');
    return li;
  }));
  const p = t.project || defaultProject();
  $('projectTitle').textContent = `Town Project · Stage ${p.stage + 1}`;
  $('projectFill').style.width = Math.min(100, (p.progress / p.goal) * 100) + '%';
  $('projectText').textContent = `${p.progress} / ${p.goal} 🔨 to the next stage`;
  show('townNone', false); show('townHas', true);
}

function ago(ts) {
  if (!ts) return 'just now';
  const s = Math.floor(Date.now() / 1000 - ts.seconds);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function renderFeed(items) {
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'muted'; li.textContent = 'No news yet. Save something to get things started!';
    return $('townFeed').replaceChildren(li);
  }
  $('townFeed').replaceChildren(...items.map(f => {
    const li = document.createElement('li');
    li.textContent = f.stageUp
      ? `🎉 ${f.name} pushed the project to stage ${f.stageUp + 1}! · ${ago(f.createdAt)}`
      : `${f.name} ${f.text} +${f.points} 🔨 · ${ago(f.createdAt)}`;
    return li;
  }));
}

// Called by game.js whenever the player earns coins for a habit.
async function contribute(text, coins) {
  const code = S().townId, user = auth.currentUser;
  if (!code || !user) return;
  const points = Math.min(MAX_POINTS, Math.max(1, Math.round(coins)));
  const townRef = doc(db, 'towns', code);
  try {
    const stageUp = await runTransaction(db, async tx => {
      const snap = await tx.get(townRef);
      if (!snap.exists()) return null;
      const p = { ...defaultProject(), ...snap.data().project };
      p.progress += points;
      let up = null;
      // one stage per action; leftover is clamped so it can't skip stages (matches the rules)
      if (p.progress >= p.goal) { p.progress = Math.min(p.progress - p.goal, p.goal - 1); p.stage += 1; up = p.stage; }
      tx.update(townRef, { project: p });
      tx.set(doc(collection(townRef, 'feed')), {
        uid: user.uid, name: playerName(), text, points, createdAt: serverTimestamp(),
        ...(up ? { stageUp: up } : {}),
      });
      return up;
    });
    if (stageUp) window.toast(`🎉 Your town reached stage ${stageUp + 1}!`);
  } catch (e) {
    console.warn('[town] contribute failed', e);
  }
}
window.onHabit = contribute;

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
          name, code, createdBy: uid, createdAt: serverTimestamp(), project: defaultProject(),
          members: { [uid]: { name: playerName(), joinedAt: serverTimestamp() } },
        });
        return true;
      });
      if (ok) {
        setTownId(code); watchTown(code);
        $('townName').value = '';
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
    setTownId(code); watchTown(code);
    $('townCode').value = '';
    window.toast(`Welcome to ${name}!`);
  } catch (e) {
    console.warn('[town] join failed', e);
    window.toast('Could not join town (' + e.code + ')');
  }
}

async function leaveTown() {
  const code = S().townId;
  if (!code || !confirm('Leave this town?')) return;
  try {
    await updateDoc(doc(db, 'towns', code), { [`members.${auth.currentUser.uid}`]: deleteField() });
  } catch (e) {
    console.warn('[town] leave failed', e);
  }
  setTownId(null); watchTown(null);
}

// Keep your name in sync on your island and in your town's member list
let nameTimer;
$('playerName').addEventListener('input', () => {
  S().name = $('playerName').value.slice(0, 20);
  window.saveGame();
  clearTimeout(nameTimer);
  nameTimer = setTimeout(() => {
    const code = S().townId;
    if (code) updateDoc(doc(db, 'towns', code), { [`members.${auth.currentUser.uid}.name`]: playerName() })
      .catch(e => console.warn('[town] rename failed', e));
  }, 800);
});

$('createTown').onclick = createTown;
$('joinTown').onclick = joinTown;
$('leaveTown').onclick = leaveTown;
$('copyCode').onclick = () => {
  navigator.clipboard?.writeText($('townCodeShow').textContent)
    .then(() => window.toast('Code copied!'), () => window.toast('Copy failed, select it instead.'));
};

ready.then(user => {
  if (!user) return status('Offline: towns need an internet connection.');
  $('playerName').value = S().name || '';
  watchTown(S().townId);
});
