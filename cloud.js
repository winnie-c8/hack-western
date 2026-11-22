// Cloud save: anonymous sign-in + one Firestore doc per player (users/{uid}).
// localStorage stays the instant/offline copy; Firestore is the backup.
//
// Sync devices (no login): a device can share its island under a secret 12-character sync code
// (islands/{CODE}). Every device that knows the code reads/writes that doc instead of users/{uid},
// and changes show up live on the others. The code is remembered in localStorage ('fmi-sync'),
// so each device only links once. Anyone with the code can open the island, so it's kept private.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const app = initializeApp({
  apiKey: 'AIzaSyDchR1F4U4S0-csMUD0UdgvaVVI-PXlye0',
  authDomain: 'hack-western-ef338.firebaseapp.com',
  projectId: 'hack-western-ef338',
  storageBucket: 'hack-western-ef338.firebasestorage.app',
  messagingSenderId: '316016111125',
  appId: '1:316016111125:web:86df309c07abc0dd00e81c',
});
export const auth = getAuth(app);
export const db = getFirestore(app);

// Resolves with the signed-in user once the island has been synced (or sync failed).
let markReady;
export const ready = new Promise(r => (markReady = r));

// ---------- sync code ----------
const SYNC_KEY = 'fmi-sync';
const SYNC_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 letters/digits, no 0/O/1/I
const SYNC_LEN = 12;                                      // 32^12 ≈ 10^18 codes: can't be guessed
const cleanSync = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const newSyncCode = () => [...crypto.getRandomValues(new Uint8Array(SYNC_LEN))].map(b => SYNC_ALPHABET[b % 32]).join('');
let syncCode = null;
try { syncCode = cleanSync(localStorage.getItem(SYNC_KEY)) || null; } catch {}
const rememberSync = code => { syncCode = code; try { code ? localStorage.setItem(SYNC_KEY, code) : localStorage.removeItem(SYNC_KEY); } catch {} };
const snapshotOf = state => JSON.parse(JSON.stringify(state));

let timer = null;
function makeSaver(ref) {
  return state => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      setDoc(ref, JSON.parse(JSON.stringify(state))).catch(e => console.warn('[cloud] save failed', e));
    }, 1500); // debounce: walking saves every tile
  };
}

// Point saving at a doc; a synced island also listens for changes made on the other devices.
let stopLive = null;
function useDoc(ref, live) {
  clearTimeout(timer);
  window.cloudSave = makeSaver(ref);
  stopLive?.(); stopLive = null;
  if (!live) return;
  stopLive = onSnapshot(ref, snap => {
    if (!snap.exists() || snap.metadata.hasPendingWrites) return; // ignore our own saves
    const data = snap.data();
    if ((data.updatedAt || 0) > (window.getState().updatedAt || 0)) {
      window.loadCloudState(data);
      console.log('[cloud] update from another device');
    }
  }, e => console.warn('[cloud] live sync stopped', e));
}

onAuthStateChanged(auth, async user => {
  if (!user) return;
  console.log('[cloud] signed in as', user.uid);
  const ref = syncCode ? doc(db, 'islands', syncCode) : doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    const local = window.getState();
    const cloudWins = snap.exists() &&
      (!window.hasLocalSave() || (snap.data().updatedAt || 0) > (local.updatedAt || 0));
    if (cloudWins) {
      window.loadCloudState(snap.data());
      console.log('[cloud] loaded island from cloud');
    } else {
      await setDoc(ref, JSON.parse(JSON.stringify(local)));
      console.log('[cloud] uploaded local island');
    }
    useDoc(ref, !!syncCode);
  } catch (e) {
    console.warn('[cloud] offline or blocked, using local save only', e);
  }
  markReady(user);
});

// ---------- what the Sync devices window (game.js) calls ----------
window.sync = {
  code: () => syncCode,
  // share this device's island under a new code
  async create() {
    if (!(await ready)) throw new Error('offline');
    const code = newSyncCode(), ref = doc(db, 'islands', code), state = window.getState();
    state.updatedAt = Date.now();
    await setDoc(ref, snapshotOf(state));
    rememberSync(code); useDoc(ref, true);
    return code;
  },
  // switch this device to the island saved under that code; false if there's no such island
  async join(input) {
    const code = cleanSync(input);
    if (code.length !== SYNC_LEN) return false;
    if (!(await ready)) throw new Error('offline');
    const ref = doc(db, 'islands', code), snap = await getDoc(ref);
    if (!snap.exists()) return false;
    rememberSync(code);
    window.loadCloudState(snap.data());
    useDoc(ref, true);
    return true;
  },
  // stop syncing on this device only; it keeps its current island as its own private save again
  async unlink() {
    rememberSync(null);
    const user = await ready;
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    await setDoc(ref, snapshotOf(window.getState())).catch(e => console.warn('[cloud] save failed', e));
    useDoc(ref, false);
  },
};

signInAnonymously(auth).catch(e => { console.warn('[cloud] sign-in failed', e); markReady(null); });
