// ===== Future Me Island — sky & time of day =====
// The island's atmosphere follows the device's clock on a fixed daily schedule:
//   night      8:00 PM – 5:00 AM
//   sunrise    5:00 AM – 8:00 AM   (slow: night → dawn → pink sunrise → golden morning)
//   morning    8:00 AM – 12:00 PM
//   afternoon 12:00 PM – 5:00 PM
//   sunset     5:00 PM – 8:00 PM   (slow: afternoon → golden hour → sunset → dusk → night)
// Colours blend continuously, second by second, so there are never any jumps.
//
// Preview other times:   ?time=19:10        (fixed clock)
//                        ?timelapse=120     (one whole day every 120 seconds)

(() => {
  const params = new URLSearchParams(location.search);
  const fixed = params.get('time');                 // "HH:MM"
  const lapse = Number(params.get('timelapse')) || 0;
  const t0 = Date.now();

  function now() {
    const d = new Date();
    if (fixed) { const [h, m] = fixed.split(':').map(Number); d.setHours(h || 0, m || 0, 0, 0); return d; }
    if (lapse > 0) {
      const mins = ((Date.now() - t0) / 1000 / lapse) * 1440 + d.getHours() * 60 + d.getMinutes();
      d.setHours(0, 0, 0, 0); return new Date(d.getTime() + (mins % 1440) * 60000);
    }
    return d;
  }

  // ---- moods: 4 sky bands (top → horizon), island tint, how much lights glow, stars ----
  const M = {
    night:   { label: 'starry night', sky: ['#18213d', '#222c52', '#2c3963', '#3b4775'], tint: ['#3a4a8a', .58], glow: 1,   warm: 0, stars: 1,  cloud: '#46507a', sea: ['#2f5476', '#264563'] },
    dawn:    { label: 'dawn',         sky: ['#33406e', '#6e6aa4', '#c98fae', '#f2b0a0'], tint: ['#8a7ab8', .38], glow: .7,  warm: 0.35, stars: .4, cloud: '#c9a6c4', sea: ['#6f8fb0', '#5a7aa0'] },
    sunrise: { label: 'sunrise',      sky: ['#9cc4dc', '#e9c3c0', '#f8c9a8', '#ffdc9c'], tint: ['#f4b08c', .22], glow: .2,  warm: 0.85, stars: 0,  cloud: '#fde3d0', sea: ['#86c4c8', '#6eb0bd'] },
    glowAM:  { label: 'sunrise',      sky: ['#b4dbe4', '#f0d9c0', '#fbe0b0', '#ffe6b0'], tint: ['#f8d29a', .13], glow: .05, warm: .6, stars: 0,  cloud: '#fff0dc', sea: ['#78c2c6', '#64afbb'] },
    morning: { label: 'morning',      sky: ['#bde4e8', '#cfeee9', '#e2f5ea', '#f6f4e0'], tint: ['#fff3dc', .06], glow: 0,   warm: 0.1, stars: 0,  cloud: '#fff7e6', sea: ['#6cc3c8', '#5aaebd'] },
    day:     { label: 'sunny day',    sky: ['#cdeee9', '#d9f2ea', '#e6f6ea', '#f3f6e4'], tint: ['#ffffff', 0],   glow: 0,   warm: 0, stars: 0,  cloud: '#fff7e6', sea: ['#6cc3c8', '#5aaebd'] },
    golden:  { label: 'golden hour',  sky: ['#c3dfde', '#ecdcb8', '#f6d49a', '#f8c27c'], tint: ['#f6c27a', .2],  glow: .1,  warm: 0.8, stars: 0,  cloud: '#fde8c4', sea: ['#7cc0bb', '#64a9b0'] },
    sunset:  { label: 'sunset',       sky: ['#6b74b4', '#c98aa6', '#f29a84', '#f8b268'], tint: ['#ef8f7a', .34], glow: .45, warm: 1, stars: .1, cloud: '#f7b6a8', sea: ['#a58fb0', '#7f7aa6'] },
    dusk:    { label: 'dusk',         sky: ['#272f5c', '#4b4a82', '#86669a', '#c88498'], tint: ['#6a5a9a', .48], glow: .85, warm: 0.25, stars: .6, cloud: '#6e6696', sea: ['#4a5f8c', '#3c4f7a'] },
  };

  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, f) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * f).toString(16).padStart(2, '0')).join(''); };
  const lerp = (a, b, f) => a + (b - a) * f;
  function blend(a, b, f) {
    return {
      sky: a.sky.map((c, i) => mix(c, b.sky[i], f)),
      tint: [mix(a.tint[0], b.tint[0], f), lerp(a.tint[1], b.tint[1], f)],
      glow: lerp(a.glow, b.glow, f), stars: lerp(a.stars, b.stars, f), warm: lerp(a.warm, b.warm, f),
      cloud: mix(a.cloud, b.cloud, f), sea: a.sea.map((c, i) => mix(c, b.sea[i], f)),
      label: f < .5 ? a.label : b.label,
    };
  }

  const fmt = mins => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setMinutes(Math.round(mins)); return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };

  // fixed schedule (minutes after midnight). Moods blend smoothly between each pair of keys.
  const KEYS = [
    [0, 'night'], [300, 'night'],                                      // 12 AM – 5 AM: night
    [345, 'dawn'], [400, 'sunrise'], [440, 'sunrise'], [480, 'glowAM'], // 5 – 8 AM: slow sunrise
    [570, 'morning'], [690, 'day'],                                    // 8 AM – 12 PM: morning
    [1020, 'day'],                                                     // 12 – 5 PM: afternoon
    [1065, 'golden'], [1110, 'sunset'], [1150, 'sunset'], [1185, 'dusk'], [1200, 'night'], // 5 – 8 PM: slow sunset
    [1440, 'night'],                                                   // 8 PM – 12 AM: night
  ];
  const RISE = 330, SET = 1170;          // sun on the horizon at 5:30 AM and 7:30 PM
  const PERIODS = [[0, 'night'], [300, 'sunrise'], [480, 'morning'], [720, 'afternoon'], [1020, 'sunset'], [1200, 'night']];

  function state(date = now()) {
    const m = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60 + date.getMilliseconds() / 60000;
    let i = 0; while (i < KEYS.length - 2 && m >= KEYS[i + 1][0]) i++;
    const [ta, a] = KEYS[i], [tb, b] = KEYS[i + 1];
    const f = Math.min(1, Math.max(0, (m - ta) / (tb - ta)));
    const mood = blend(M[a], M[b], f * f * f * (f * (f * 6 - 15) + 10)); // smootherstep: eases in and out
    let label = 'night'; for (const [at, name] of PERIODS) if (m >= at) label = name;
    // sun: 0 at sunrise → 1 at sunset; moon: same across the night
    const sun = (m - RISE) / (SET - RISE);
    const moon = ((m - SET + 1440) % 1440) / (1440 - (SET - RISE));
    const up = m >= RISE && m < SET;
    // what comes next, for the HUD: sunrise → morning → afternoon → sunset → night → sunrise ...
    const NEXT = [[300, 'sunrise', '5:00 AM'], [480, 'morning', '8:00 AM'], [720, 'afternoon', '12:00 PM'], [1020, 'sunset', '5:00 PM'], [1200, 'night time', '8:00 PM']];
    let nx = NEXT.find(([at]) => at > m);
    const next = nx ? { kind: nx[1], at: nx[0], text: nx[2] } : { kind: 'sunrise', at: 300 + 1440, text: '5:00 AM' };
    const inMin = Math.ceil(next.at - m);
    return {
      ...mood, label, sun, moon, up, minutes: m, next, inMin,
      time: date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      riseText: '5:00 AM', setText: '5:00 PM',
    };
  }

  let cached = null, cachedAt = 0;
  const current = () => { const n = performance.now(); if (!cached || n - cachedAt > (lapse ? 30 : 250)) { cached = state(); cachedAt = n; } return cached; };
  window.SKY = { now, state, current, mix, timelapse: lapse > 0, fixed: !!fixed };

  // ---- the little sky clock in the HUD ----
  function drawArc(cv, s) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, HZ = H - 6;
    s.sky.forEach((c, k) => { g.fillStyle = c; g.fillRect(0, Math.floor(k * HZ / 4), W, Math.ceil(HZ / 4) + 1); });
    g.fillStyle = s.sea[0]; g.fillRect(0, HZ, W, H - HZ);
    g.fillStyle = s.sea[1]; g.fillRect(0, HZ + 3, W, H - HZ - 3);
    if (s.stars > .05) {
      g.fillStyle = `rgba(255,247,230,${s.stars})`;
      [[5, 3], [14, 7], [24, 2], [37, 5], [47, 9], [52, 3], [30, 11], [9, 12]].forEach(([x, y], i) => {
        if ((Math.floor(Date.now() / 600) + i) % 4) g.fillRect(x, y, 1, 1);
      });
    }
    const body = (p, color, glow, r) => {
      const x = Math.round(4 + p * (W - 8)), y = Math.round(HZ - Math.sin(Math.PI * Math.max(0, Math.min(1, p))) * (HZ - 5));
      g.fillStyle = glow; g.fillRect(x - r - 1, y - r, 2 * r + 3, 2 * r + 1); g.fillRect(x - r, y - r - 1, 2 * r + 1, 2 * r + 3);
      g.fillStyle = color; g.fillRect(x - r, y - r + 1, 2 * r + 1, 2 * r - 1); g.fillRect(x - r + 1, y - r, 2 * r - 1, 2 * r + 1);
      return [x, y];
    };
    if (s.up) body(s.sun, '#f2c26b', 'rgba(248,220,156,.7)', 2);
    else { const [x, y] = body(s.moon, '#fff7e6', 'rgba(255,247,230,.25)', 2); g.fillStyle = s.sky[1]; g.fillRect(x + 1, y - 2, 2, 3); }
    g.fillStyle = 'rgba(255,247,230,.5)'; g.fillRect(0, HZ, W, 1);
  }

  function updateClock() {
    const s = state();
    document.body.dataset.sky = s.label.replace(/\s+/g, '-');
    const box = document.getElementById('skyClock');
    if (!box) return;
    drawArc(document.getElementById('skyArc'), s);
    document.getElementById('skyTime').textContent = s.time;
    document.getElementById('skyPhase').textContent = s.label;
    const h = Math.floor(s.inMin / 60), mm = s.inMin % 60;
    const left = h ? `${h}h ${mm}m` : `${mm}m`;
    const icon = { sunrise: 'sunrise', morning: 'sun', afternoon: 'sun', sunset: 'sunset', 'night time': 'moon' }[s.next.kind];
    const nextText = `${s.next.kind} starts at ${s.next.text} · in ${left}`;
    const nextEl = document.getElementById('skyNext');
    if (nextEl.dataset.text !== nextText) { nextEl.dataset.text = nextText; nextEl.innerHTML = `${window.pi ? pi(icon) : ''} ${nextText}`; }
    box.title = 'Sunrise 5–8 AM · Morning 8 AM–12 PM · Afternoon 12–5 PM · Sunset 5–8 PM · Night 8 PM–5 AM';
  }
  const start = () => { updateClock(); setInterval(updateClock, lapse > 0 ? 250 : 15000); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
