// Demo data for Tomo Island: 4 test users (synced islands) in 2 towns, with news posts.
//
//   node scripts/seed-demo.mjs
//
// Each test user is a synced island with a fixed sync code, so on a demo device you open its link
// (or type the code in more → sync devices) and you ARE that user, towns included.
// Dates are relative to today, so re-run this on the morning of the demo to keep streaks alive.
// Re-running overwrites the demo islands and towns (and their news) but touches nothing else.
//
// Uses your Firebase CLI login (run `firebase login` first); writes as the project owner, so it can
// create other people's posts, which the security rules don't let a normal player do.
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { createHash } from 'crypto';
import { execSync } from 'child_process';

const PROJECT = 'hack-western-ef338';
const SITE = 'https://tomoisland.garden/';
const DB = `projects/${PROJECT}/databases/(default)/documents`;

// ---------- dates (relative to today, local time, like the game) ----------
const DAY = 864e5;
const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = n => new Date(Date.now() - n * DAY);
const day = n => fmt(daysAgo(n));
const weekKey = d => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return fmt(x); };
const ago = (n, unit = 'h') => ({ __ts: new Date(Date.now() - n * { m: 6e4, h: 36e5, d: DAY }[unit]) });
const pubOf = code => createHash('sha256').update(code).digest('hex');

// ---------- the test users ----------
// history: [days ago, amount, account, goal?]; coins per entry follow the game's rules (10 a day, +50 first of the week)
function island({ name, islandName, coins, streak, goals, history, placed, inventory = {}, character, towns, extra = {} }) {
  const seenWeeks = new Set();
  const hist = history.sort((a, b) => a[0] - b[0]).map(([n, amt, type, goal]) => {
    const wk = weekKey(daysAgo(n)), first = !seenWeeks.has(wk);
    seenWeeks.add(wk);
    return { amt, type, date: day(n), ...(goal ? { goal } : {}), coins: 10 + (first ? 50 : 0), n };
  });
  const byOld = [...hist].sort((a, b) => b.n - a.n);
  seenWeeks.clear();
  for (const h of byOld) { const wk = weekKey(daysAgo(h.n)); h.coins = 10 + (seenWeeks.has(wk) ? 0 : 50); seenWeeks.add(wk); }
  return {
    name, islandName, coins, streak,
    saved: hist.reduce((t, h) => t + h.amt, 0),
    history: hist.map(({ n, ...h }) => h),                       // newest first, like the game
    personalGoals: goals.map(g => ({ ...g, saved: Math.min(g.target, hist.filter(h => h.goal === g.name).reduce((t, h) => t + h.amt, 0)), completed: false })),
    weeks: [...seenWeeks],
    lastDepositDay: hist[0]?.date || null,
    lastStreakDay: day(1),                                       // streak kept up to yesterday: one task today keeps it going
    missionsDay: day(0), missionsDone: [],
    placed, inventory, character,
    townIds: towns, townId: towns[0] || null,
    tutorialDone: true, worldV: 3, chat: [], mapleNotes: [],
    updatedAt: Date.now(),
    ...extra,
  };
}
const daily = (from, to, amounts, type, goals) => {          // a deposit most days between `from` and `to` days ago
  const out = [];
  for (let n = from, i = 0; n >= to; n--, i++) if (i % 5 !== 3) out.push([n, amounts[i % amounts.length], type, goals[i % goals.length]]);
  return out;
};

const USERS = [
  {
    key: 'maya', code: 'A3DG865HY5NZ', blurb: 'steady saver on a 12-day streak, in both towns',
    state: island({
      name: 'Maya', islandName: "Maya's Island", coins: 820, streak: 12, towns: ['594JH2', '37ETEV'],
      goals: [{ name: 'Emergency fund', target: 1000, starred: true }, { name: 'Trip to Banff', target: 600, starred: false }],
      history: daily(21, 1, [20, 15, 25, 30, 10, 40, 20], 'High-interest savings', ['Emergency fund', 'Trip to Banff', 'Emergency fund']),
      placed: [{ id: 'blossom', x: 16, y: 13 }, { id: 'flower', x: 17, y: 12 }, { id: 'flower', x: 21, y: 13 }, { id: 'bench', x: 22, y: 13 },
        { id: 'lamp', x: 21, y: 14 }, { id: 'tree', x: 12, y: 13 }, { id: 'palm', x: 27, y: 13 }, { id: 'sunflower', x: 16, y: 16 },
        { id: 'tent', x: 10, y: 19 }, { id: 'umbrella', x: 29, y: 18 }],
      inventory: { mushroom: 2 },
      character: { gender: 'girl', hairStyle: 'long', hairColor: 'black', skinColor: 'golden', top: 'hoodie', topColor: 'lavender', bottoms: 'jeans', bottomsColor: 'blue' },
    }),
  },
  {
    key: 'jordan', code: '7BJ7TZUPS4NN', blurb: '$30 away from a goal (concert tickets)',
    state: island({
      name: 'Jordan', islandName: "Jordan's Island", coins: 310, streak: 6, towns: ['594JH2'],
      goals: [{ name: 'Concert tickets', target: 300, starred: true }, { name: 'New phone', target: 900, starred: false }],
      history: [[19, 40, 'TFSA', 'Concert tickets'], [16, 25, 'TFSA', 'Concert tickets'], [13, 50, 'TFSA', 'Concert tickets'], [11, 15, 'High-interest savings', 'New phone'],
        [9, 35, 'TFSA', 'Concert tickets'], [6, 30, 'TFSA', 'Concert tickets'], [5, 20, 'TFSA', 'Concert tickets'], [4, 25, 'TFSA', 'Concert tickets'],
        [3, 20, 'TFSA', 'Concert tickets'], [2, 15, 'TFSA', 'Concert tickets'], [1, 10, 'TFSA', 'Concert tickets']],
      placed: [{ id: 'pine', x: 13, y: 8 }, { id: 'rock', x: 17, y: 13 }, { id: 'flower', x: 21, y: 12 }, { id: 'potted', x: 22, y: 14 }, { id: 'canoe', x: 30, y: 19 }],
      inventory: { flower: 1 },
      character: { gender: 'boy', hairStyle: 'short-curly', hairColor: 'brown', skinColor: 'deep', top: 'tee', topColor: 'teal', bottoms: 'charcoal-pants', bottomsColor: 'charcoal' },
    }),
  },
  {
    key: 'sam', code: 'BCLR5S9XLD5P', blurb: 'brand-new saver, 2 days in, in both towns',
    state: island({
      name: 'Sam', islandName: "Sam's Island", coins: 165, streak: 2, towns: ['594JH2', '37ETEV'],
      goals: [{ name: 'Emergency fund', target: 500, starred: true }],
      history: [[2, 10, 'High-interest savings', 'Emergency fund'], [1, 15, 'High-interest savings', 'Emergency fund']],
      placed: [{ id: 'flower', x: 17, y: 12 }],
      character: { gender: 'nonbinary', hairStyle: 'buzz-cut', hairColor: 'teal', skinColor: 'light', top: 'sweater', topColor: 'yellow', bottoms: 'shorts', bottomsColor: 'green' },
    }),
  },
  {
    key: 'priya', code: 'PZRWMJZEXASK', blurb: 'super saver on a 21-day streak, founder of Cedar Cove',
    state: island({
      name: 'Priya', islandName: "Priya's Island", coins: 1650, streak: 21, towns: ['37ETEV'],
      goals: [{ name: 'First car', target: 5000, starred: true }, { name: 'FHSA', target: 2000, starred: false }],
      history: [...daily(42, 22, [50, 40, 60, 35], 'FHSA (first home)', ['FHSA']), ...daily(21, 1, [60, 45, 80, 50, 70], 'TFSA', ['First car', 'First car', 'FHSA'])],
      placed: [{ id: 'cottage', x: 10, y: 13 }, { id: 'fountain', x: 16, y: 13 }, { id: 'blossom', x: 13, y: 8 }, { id: 'blossom', x: 26, y: 8 },
        { id: 'lamppost', x: 21, y: 14 }, { id: 'lamppost', x: 18, y: 14 }, { id: 'park-bench', x: 22, y: 13 }, { id: 'garden', x: 27, y: 14 },
        { id: 'car', x: 12, y: 19 }, { id: 'pine', x: 30, y: 13 }, { id: 'sunflower', x: 17, y: 12 }, { id: 'flower', x: 21, y: 12 }],
      inventory: { mushroom: 3, flower: 2 },
      character: { gender: 'girl', hairStyle: 'ponytail', hairColor: 'auburn', skinColor: 'tan', top: 'jacket', topColor: 'coral', bottoms: 'skirt', bottomsColor: 'purple' },
      extra: { pathKits: ['dirt', 'stone'], paths: Object.fromEntries([11, 12, 13, 14].flatMap(y => [`19,${y}`, `20,${y}`]).map(k => [k, 'stone'])) },
    }),
  },
];
const U = Object.fromEntries(USERS.map(u => [u.key, { ...u, pub: pubOf(u.code), uid: 'demo-' + u.key }]));

// ---------- the towns ----------
const member = (k, joined) => ({ name: U[k].state.name, joinedAt: ago(joined, 'd'), island: U[k].pub });
const post = (k, fields) => ({ uid: U[k].uid, name: U[k].state.name, island: U[k].pub, points: 0, ...fields });
const hearts = (...ks) => ({ hearts: Object.fromEntries(ks.map(k => [U[k].pub, true])) });
const TOWNS = [
  {
    code: '594JH2', name: 'Maple Bay', founder: 'maya',
    members: { maya: 20, jordan: 18, sam: 3 },
    project: { name: 'Community Garden', goal: 600, progress: 410, number: 2, startedBy: U.jordan.uid },
    built: [{ name: 'Lighthouse', goal: 400, number: 1 }],
    feed: [
      post('jordan', { text: 'saved today', points: 10, project: 'Community Garden', createdAt: ago(35, 'm') }),
      post('maya', { text: 'So close to the garden, team! :leaf:', note: true, createdAt: ago(2), ...hearts('jordan', 'sam') }),
      post('sam', { text: 'saved today · first deposit this week', points: 60, project: 'Community Garden', createdAt: ago(5) }),
      post('maya', { text: 'kept a 12-day streak', points: 80, project: 'Community Garden', createdAt: ago(1, 'd'), ...hearts('jordan') }),
      post('jordan', { text: 'finished a daily task', points: 15, project: 'Community Garden', createdAt: ago(26) }),
      post('sam', { text: 'Just joined, hi everyone!', note: true, createdAt: ago(3, 'd'), ...hearts('maya', 'jordan') }),
      post('maya', { text: 'saved today · first deposit this week', points: 60, project: 'Community Garden', createdAt: ago(4, 'd') }),
      post('jordan', { text: 'started a new project', project: 'Community Garden', started: true, createdAt: ago(6, 'd') }),
      post('maya', { text: 'saved today', points: 10, project: 'Lighthouse', done: true, createdAt: ago(7, 'd'), ...hearts('jordan') }),
    ],
  },
  {
    code: '37ETEV', name: 'Cedar Cove', founder: 'priya',
    members: { priya: 30, maya: 12, sam: 2 },
    project: { name: 'Library', goal: 1000, progress: 760, number: 3, startedBy: U.priya.uid },
    built: [{ name: 'Bakery', goal: 300, number: 1 }, { name: 'Skate Park', goal: 500, number: 2 }],
    feed: [
      post('priya', { text: 'kept a 21-day streak', points: 125, project: 'Library', createdAt: ago(20, 'm'), ...hearts('maya') }),
      post('sam', { text: 'finished a daily task', points: 15, project: 'Library', createdAt: ago(3) }),
      post('maya', { text: "Library by the weekend? Let's go! :star:", note: true, createdAt: ago(6), ...hearts('priya', 'sam') }),
      post('priya', { text: 'saved today · first deposit this week · 3 weeks in a row', points: 210, project: 'Library', createdAt: ago(1, 'd') }),
      post('maya', { text: 'saved today', points: 10, project: 'Library', createdAt: ago(2, 'd') }),
      post('priya', { text: 'started a new project', project: 'Library', started: true, createdAt: ago(5, 'd') }),
      post('priya', { text: 'saved today', points: 10, project: 'Skate Park', done: true, createdAt: ago(6, 'd'), ...hearts('maya') }),
    ],
  },
];

// ---------- Firestore REST (as the project owner, via the Firebase CLI login) ----------
execSync(`firebase projects:list`, { stdio: 'ignore' }); // refreshes the CLI's access token if it expired
const token = JSON.parse(readFileSync(homedir() + '/.config/configstore/firebase-tools.json', 'utf8')).tokens?.access_token;
if (!token) throw new Error('Run `firebase login` first.');
const value = v => {
  if (v === null || v === undefined) return { nullValue: null };
  if (v.__ts) return { timestampValue: v.__ts.toISOString() };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, value(x)])) } };
};
const api = async (path, body, method = 'POST') => {
  const r = await fetch(`https://firestore.googleapis.com/v1/${path}`, {
    method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`);
  return r.json();
};
const put = (path, data) => ({ update: { name: `${DB}/${path}`, fields: value(data).mapValue.fields } });

// clear the old news of the demo towns first, so re-running doesn't pile up duplicates
for (const t of TOWNS) {
  const { documents = [] } = await api(`${DB}/towns/${t.code}/feed?pageSize=300`, null, 'GET').catch(() => ({}));
  if (documents.length) await api(`${DB}:commit`, { writes: documents.map(d => ({ delete: d.name })) });
}

const writes = [
  ...USERS.map(u => put(`islands/${u.code}`, u.state)),
  ...TOWNS.flatMap(t => [
    put(`towns/${t.code}`, {
      name: t.name, code: t.code, createdBy: U[t.founder].uid, createdAt: ago(Math.max(...Object.values(t.members)), 'd'),
      members: Object.fromEntries(Object.entries(t.members).map(([k, d]) => [U[k].uid, member(k, d)])),
      project: t.project, built: t.built,
    }),
    ...t.feed.map((f, i) => put(`towns/${t.code}/feed/demo-${String(i + 1).padStart(2, '0')}`, f)),
  ]),
];
await api(`${DB}:commit`, { writes });

console.log(`Seeded ${USERS.length} test users and ${TOWNS.length} towns (${writes.length} documents).\n`);
for (const u of USERS) {
  const towns = u.state.townIds.map(c => TOWNS.find(t => t.code === c).name).join(' + ');
  console.log(`${u.state.name.padEnd(7)} ${u.code.match(/.{4}/g).join('-')}  ${u.blurb} [${towns}]`);
  console.log(`        ${SITE}#sync=${u.code}`);
}
