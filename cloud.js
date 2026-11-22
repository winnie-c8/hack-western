// Cloud save: anonymous sign-in + one Firestore doc per player (users/{uid}).
// localStorage stays the instant/offline copy; Firestore is the backup.
//
// Sync devices (no login): a device can share its island under a secret 12-character sync code
// (islands/{CODE}). Every device that knows the code reads/writes that doc instead of users/{uid},
// and changes show up live on the others. The code is remembered in localStorage ('fmi-sync'),
// so each device only links once. Anyone with the code can open the island, so it's kept private.
//
// Devices of a synced island: pubs/{PUB}/devices/{uid} = { code, label, at }, where PUB = sha256(code) in hex.
// PUB is the island's public id (towns use it so your phone + laptop count as one person, and either can
// edit your notes). Registering needs the code itself (checked in firestore.rules), so a public PUB
// can't be claimed by someone else. Watching that list tells each device when another one joins or unlinks.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

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
// What goes to the cloud: the whole island except where you're standing (each device keeps its own spot,
// so walking never needs a cloud write and a synced device doesn't pull your character around)
const snapshotOf = state => { const { player, ...rest } = JSON.parse(JSON.stringify(state)); return rest; };

// ---------- devices of a synced island ----------
const DEVICES_KEY = 'fmi-sync-devices'; // { uid: label } as last seen, to spot changes made while this device was closed
const pubOf = async code => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code)))]
  .map(b => b.toString(16).padStart(2, '0')).join('');
function deviceLabel() {
  const ua = navigator.userAgent;
  const kind = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad'
    : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Android phone' : 'Android tablet')
    : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows computer' : /CrOS/.test(ua) ? 'Chromebook' : /Linux/.test(ua) ? 'Linux computer' : 'device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\/|FxiOS/.test(ua) ? 'Firefox'
    : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  return browser ? `${kind} · ${browser}` : kind;
}
let syncPub = null, devices = {}, stopDevices = null;
const loadSeen = () => { try { return JSON.parse(localStorage.getItem(DEVICES_KEY) || 'null'); } catch { return null; } };
const saveSeen = list => { try { list ? localStorage.setItem(DEVICES_KEY, JSON.stringify(list)) : localStorage.removeItem(DEVICES_KEY); } catch {} };
// register this device under the island, then watch the island's device list
async function joinDevices(code) {
  const user = auth.currentUser;
  if (!user) return;
  const pub = await pubOf(code);
  await setDoc(doc(db, 'pubs', pub, 'devices', user.uid), { code, label: deviceLabel(), at: serverTimestamp() });
  syncPub = pub; // only once registered: towns may now act as this island
  stopDevices?.();
  stopDevices = onSnapshot(collection(db, 'pubs', pub, 'devices'), snap => {
    devices = Object.fromEntries(snap.docs.map(d => [d.id, d.data().label || 'device']));
    const seen = loadSeen(), me = auth.currentUser?.uid;
    if (seen) { // tell the player about devices that joined or stopped syncing (also while this one was closed)
      const added = Object.keys(devices).filter(id => id !== me && !(id in seen)).map(id => devices[id]);
      const removed = Object.keys(seen).filter(id => id !== me && !(id in devices)).map(id => seen[id]);
      if (added.length || removed.length) window.onSyncDevicesChanged?.({ added, removed, others: Object.keys(devices).filter(id => id !== me).length });
    }
    saveSeen(devices);
    window.onSyncDevicesList?.();
  }, e => console.warn('[cloud] device list stopped', e));
}
function leaveDevices() {
  stopDevices?.(); stopDevices = null; syncPub = null; devices = {}; saveSeen(null);
}

let timer = null;
function makeSaver(ref) {
  return state => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      setDoc(ref, snapshotOf(state)).catch(e => console.warn('[cloud] save failed', e));
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
      await setDoc(ref, snapshotOf(local));
      console.log('[cloud] uploaded local island');
    }
    useDoc(ref, !!syncCode);
    if (syncCode) await joinDevices(syncCode).catch(e => console.warn('[cloud] device register failed', e));
  } catch (e) {
    console.warn('[cloud] offline or blocked, using local save only', e);
  }
  markReady(user);
});

// ---------- what the Sync devices window (game.js) calls ----------
window.sync = {
  code: () => syncCode,
  pub: () => syncPub,                         // the island's public id (null when not synced)
  devices: () => ({ me: auth.currentUser?.uid, list: devices }), // { uid: label } of every synced device
  // share this device's island under a new code
  async create() {
    if (!(await ready)) throw new Error('offline');
    const code = newSyncCode(), ref = doc(db, 'islands', code), state = window.getState();
    state.updatedAt = Date.now();
    await setDoc(ref, snapshotOf(state));
    rememberSync(code); useDoc(ref, true);
    saveSeen({}); await joinDevices(code);
    window.onIslandLoaded?.(); // towns: start counting this island's devices as one person
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
    saveSeen(null);                // the devices already there aren't news to this one
    await joinDevices(code);       // registered before towns re-check membership (they need the island id)
    window.loadCloudState(snap.data());
    useDoc(ref, true);
    return true;
  },
  // a quick look at the island behind a code (for "You're syncing to …"); null if there's no such island
  async peek(input) {
    const code = cleanSync(input);
    if (code.length !== SYNC_LEN || !(await ready)) return null;
    const snap = await getDoc(doc(db, 'islands', code));
    if (!snap.exists()) return null;
    const d = snap.data();
    return { islandName: (d.islandName || '').trim(), name: (d.name || '').trim(), saved: d.saved || 0, streak: d.streak || 0, coins: d.coins || 0 };
  },
  // stop syncing on this device only; it keeps its current island as its own private save again
  async unlink() {
    const pub = syncPub, user = await ready;
    rememberSync(null); leaveDevices();
    if (!user) return;
    // the other devices see this one disappear from the list and say so
    if (pub) await deleteDoc(doc(db, 'pubs', pub, 'devices', user.uid)).catch(e => console.warn('[cloud] device unregister failed', e));
    const ref = doc(db, 'users', user.uid);
    await setDoc(ref, snapshotOf(window.getState())).catch(e => console.warn('[cloud] save failed', e));
    useDoc(ref, false);
  },
};

signInAnonymously(auth).catch(e => { console.warn('[cloud] sign-in failed', e); markReady(null); });
