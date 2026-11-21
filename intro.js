// ===== Future Me Island — entrance screen =====
(() => {
  const intro = document.getElementById('intro');
  if (!intro) return;
  document.body.classList.add('intro-open');

  // Split the title into letters so they can drop in one by one
  const title = intro.querySelector('.intro-title');
  let i = 0;
  title.innerHTML = title.dataset.text.split(' ').map(word =>
    `<span class="word">${[...word].map(c => `<span class="ch" style="--i:${i++}" aria-hidden="true">${c}</span>`).join('')}</span>`
  ).join(' ');
  intro.style.setProperty('--letters', i);

  // ---------- Pixel scene behind the sign (320×180 art pixels, scaled up) ----------
  const cv = document.getElementById('introScene');
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height, HORIZON = 104;
  const C = {
    sky: ['#cdeee9', '#d9f2ea', '#e6f6ea', '#f3f6e4'],
    sun: '#f2c26b', sunGlow: '#f8dc9c',
    cloud: '#fff7e6', cloudShade: '#e8eedd',
    water: '#6cc3c8', deep: '#5aaebd', ripple: '#a6e2dc', foam: '#d4f3ea',
    sand: '#f3dcaa', sandDot: '#e5c48d', grass: '#a5ca8c', grass2: '#9bc284', tuft: '#7fae6e',
    trunk: '#b98b5c', trunkDark: '#8d6440', leaf: '#6f9a63', leafLight: '#a5ca8c',
    wall: '#fff7e6', roof: '#f2a0a8', roofDark: '#d9848d', door: '#8d6440',
  };
  const rect = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const ellipse = (c, cx, cy, rx, ry) => {
    g.fillStyle = c;
    for (let y = -ry; y <= ry; y++) {
      const hw = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2));
      g.fillRect(Math.round(cx - hw), cy + y, hw * 2, 1);
    }
  };
  const disc = (c, cx, cy, r) => ellipse(c, cx, cy, r, r);
  const cloud = (x, y) => {
    rect(C.cloud, x + 6, y, 16, 4); rect(C.cloud, x, y + 4, 30, 5); rect(C.cloud, x + 14, y - 3, 10, 3);
    rect(C.cloudShade, x + 2, y + 8, 26, 2);
  };
  const clouds = [{ x: 30, y: 26, s: 4 }, { x: 150, y: 14, s: 2.5 }, { x: 230, y: 50, s: 3.2 }, { x: 290, y: 30, s: 2 }];
  const ripples = Array.from({ length: 22 }, (_, k) => ({ x: (k * 53) % W, y: HORIZON + 6 + ((k * 29) % (H - HORIZON - 10)), w: 4 + (k % 3) * 2, s: 2 + (k % 4) }));

  function drawScene(t) {
    // sky in soft stepped bands
    C.sky.forEach((c, k) => rect(c, 0, k * (HORIZON / 4), W, HORIZON / 4 + 1));
    // sun with a pulsing glow
    disc(C.sunGlow, 252, 40, 18 + Math.round(Math.sin(t * 2) + 1));
    disc(C.sun, 252, 40, 14);
    clouds.forEach(c => cloud(((c.x + t * c.s) % (W + 40)) - 40, c.y));
    // sea
    rect(C.water, 0, HORIZON, W, H - HORIZON);
    rect(C.deep, 0, HORIZON + 50, W, H - HORIZON - 50);
    rect(C.foam, 0, HORIZON, W, 1);
    ripples.forEach(r => rect(C.ripple, (r.x + t * r.s) % (W + 10) - 10, r.y, r.w, 1));
    // island, with foam that laps in and out
    const lap = Math.round(Math.sin(t * 2.4) * 1.5);
    ellipse(C.foam, 160, 128, 78 + lap, 18 + Math.max(0, lap));
    ellipse(C.sand, 160, 126, 72, 15);
    [[112, 132], [140, 136], [196, 134], [214, 128], [176, 138]].forEach(([x, y]) => rect(C.sandDot, x, y, 2, 1));
    ellipse(C.grass, 160, 122, 58, 10);
    ellipse(C.grass2, 160, 124, 50, 6);
    [[124, 120], [150, 117], [204, 121], [186, 126], [134, 126]].forEach(([x, y]) => { rect(C.tuft, x, y, 1, 2); rect(C.tuft, x + 2, y - 1, 1, 3); });
    // little house
    rect(C.wall, 172, 104, 22, 14);
    rect(C.roofDark, 169, 102, 28, 3);
    for (let k = 0; k < 8; k++) rect(C.roof, 170 + k, 101 - k, 26 - k * 2, 1);
    rect(C.door, 180, 110, 6, 8);
    rect(C.ripple, 188, 107, 4, 4);
    // palm tree that sways a little
    const sway = Math.round(Math.sin(t * 1.6) * 1.5);
    for (let k = 0; k < 22; k++) rect(k % 4 === 0 ? C.trunkDark : C.trunk, 134 + Math.round(k * k / 90) + (k > 14 ? sway : 0), 120 - k, 3, 1);
    const tx = 140 + sway, ty = 97;
    [[-14, 2], [-9, -3], [0, -6], [9, -3], [14, 2]].forEach(([dx, dy]) => {
      for (let k = 0; k <= 8; k++) rect(k % 3 ? C.leaf : C.leafLight, tx + dx * k / 8, ty + dy * k / 8 + (k * k) / 24, 3, 2);
    });
    rect(C.trunkDark, tx - 1, ty + 1, 3, 3);
  }

  let raf, start = performance.now();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frame = now => { drawScene(reduce ? 0 : (now - start) / 1000); if (!reduce) raf = requestAnimationFrame(frame); };
  raf = requestAnimationFrame(frame);

  // ---------- Buttons ----------
  const note = document.getElementById('introNote');
  const enterBtn = document.getElementById('enterWorld');

  // Hide (not delete) the intro, so the title sign / home button can bring it back
  const finish = () => {
    if (!intro.classList.contains('leaving')) return;
    cancelAnimationFrame(raf);
    intro.hidden = true;
    intro.classList.remove('leaving');
    enterBtn.classList.remove('picked');
    document.getElementById('dailyStar').classList.remove('wiggle');
    document.body.classList.remove('intro-open');
    document.activeElement?.blur?.();
    window.onEnterWorld?.();
  };
  intro.addEventListener('animationend', ev => { if (ev.target === intro) finish(); });

  enterBtn.addEventListener('click', e => {
    if (intro.classList.contains('leaving')) return;
    e.currentTarget.classList.add('picked');
    intro.classList.add('leaving');
    if (reduce) setTimeout(finish, 300);
  });

  // Go back to the entrance screen (title sign + "home" menu button). Unhiding it
  // restarts all the CSS animations, so the sign drops in again.
  window.showIntro = () => {
    if (!intro.hidden) return;
    document.querySelectorAll('.intro-btn').forEach(b => b.classList.remove('picked', 'wiggle'));
    note.textContent = ''; note.classList.remove('show');
    document.body.classList.add('intro-open');
    intro.hidden = false;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
    enterBtn.focus({ preventScroll: true });
  };
  document.getElementById('mainMenuBtn')?.addEventListener('click', () => window.showIntro());

  // Daily Star: if window.startDailyStar exists it runs, otherwise show a "coming soon" note.
  document.getElementById('dailyStar').addEventListener('click', e => {
    if (typeof window.startDailyStar === 'function') return window.startDailyStar({ fromMenu: true });
    note.innerHTML = pi('star') + ' The Daily Star is twinkling soon! Check back tomorrow.';
    note.classList.remove('show'); void note.offsetWidth; note.classList.add('show');
    e.currentTarget.classList.remove('wiggle'); void e.currentTarget.offsetWidth; e.currentTarget.classList.add('wiggle');
  });
})();
