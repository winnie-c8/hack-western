// Cloud save: anonymous sign-in + one Firestore doc per player (users/{uid}).
// localStorage stays the instant/offline copy; Firestore is the backup.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

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

let timer = null;
function makeSaver(ref) {
  return state => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      setDoc(ref, JSON.parse(JSON.stringify(state))).catch(e => console.warn('[cloud] save failed', e));
    }, 1500); // debounce: walking saves every tile
  };
}

onAuthStateChanged(auth, async user => {
  if (!user) return;
  console.log('[cloud] signed in as', user.uid);
  const ref = doc(db, 'users', user.uid);
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
    window.cloudSave = makeSaver(ref);
  } catch (e) {
    console.warn('[cloud] offline or blocked, using local save only', e);
  }
  markReady(user);
});

signInAnonymously(auth).catch(e => { console.warn('[cloud] sign-in failed', e); markReady(null); });
