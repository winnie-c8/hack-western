// ===== Maple's tour: a first-visit walkthrough on a practice island =====
// The first time you press "Enter my world!", Maple shows you around a made-up island and town:
// bank → tasks → goals → shop → town → history → character → "any more questions? ask me!".
// Nothing on the practice island is saved. When the tour ends, your own island comes back exactly as it was.
// Replay any time from the ? pop-up ("Redo the tutorial"): your own island is never reset by it. Uses game.js (enterPracticeIsland, openPanel, the 'fmi:*' events)
// and town.js (townDemo), so it loads after game.js.
(() => {
  const $ = id => document.getElementById(id);
  const card = $('tutorial');
  if (!card || !window.enterPracticeIsland) return;

  const DONE_KEY = 'fmi-tutorial-done';
  const TOWN = 'MAPLE8';
  const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const walkKeys = touch ? 'the arrow pad' : 'the arrow keys or WASD';
  const click = touch ? 'Tap' : 'Click';
  // the shop, bank, Maple and town builds open with a click / tap from anywhere; on a keyboard, Space works when you're next to them
  const useIt = touch ? 'tap it' : 'press Space (or click it)';

  // ---------- the practice island: a few weeks into saving, with goals, a streak and some decorations ----------
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
  const day = n => fmt(daysAgo(n));
  function practiceIsland() {
    const history = [
      { amt: 20, type: 'TFSA', date: day(1), goal: 'New laptop', coins: 10 },
      { amt: 5, type: 'High-interest savings', date: day(2), coins: 10 },
      { amt: 15, type: 'High-interest savings', date: day(3), goal: 'Emergency fund', coins: 10 },
      { amt: 40, type: 'TFSA', date: day(6), goal: 'New laptop', coins: 60 },
      { amt: 10, type: 'High-interest savings', date: day(9), coins: 60 },
      { amt: 25, type: 'TFSA', date: day(13), goal: 'New laptop', coins: 60 },
    ];
    return {
      coins: 450, saved: history.reduce((t, h) => t + h.amt, 0), history,
      inventory: { flower: 2 },
      placed: [
        { id: 'palm', x: 24, y: 13 }, { id: 'flower', x: 17, y: 12 }, { id: 'tree', x: 12, y: 13 },
        { id: 'bench', x: 22, y: 13 }, { id: 'sunflower', x: 16, y: 16 }, { id: 'lamp', x: 21, y: 14 },
      ],
      personalGoals: [
        { name: 'New laptop', target: 800, saved: 85, completed: false, starred: true },
        { name: 'Emergency fund', target: 300, saved: 15, completed: false, starred: false },
      ],
      streak: 4, lastStreakDay: day(1), lastDepositDay: day(1), missionsDay: today(), missionsDone: [],
      weeks: [weekKey(daysAgo(7))],    // saved last week but not yet this week, so logging shows the weekly bonus
      player: { x: 20, y: 11 },        // standing just below the bank
    };
  }

  // ---------- the practice town: made-up townsfolk, news, one finished build and one going up ----------
  function practiceTown({ uid, name }) {
    const ago = s => ({ seconds: Math.floor(Date.now() / 1000) - s });
    const H = 3600, D = 86400;
    return {
      towns: [[TOWN, {
        name: 'Maple Bay', code: TOWN, createdBy: 'maya', createdAt: ago(20 * D),
        members: {
          maya: { name: 'Maya', joinedAt: ago(20 * D) }, jordan: { name: 'Jordan', joinedAt: ago(18 * D) },
          sam: { name: 'Sam', joinedAt: ago(9 * D) }, [uid]: { name, joinedAt: ago(60) },
        },
        project: { name: 'Community Centre', goal: 800, progress: 520, number: 2, startedBy: 'jordan' },
        built: [{ name: 'Lighthouse', goal: 500, number: 1 }],
      }]],
      feeds: [[TOWN, [
        { id: 'p1', uid: 'maya', name: 'Maya', text: 'kept a 6-day streak', points: 45, project: 'Community Centre', createdAt: ago(40 * 60) },
        { id: 'p2', uid: 'sam', name: 'Sam', text: 'Over halfway there, team! :party:', points: 0, note: true, createdAt: ago(3 * H) },
        { id: 'p3', uid: 'jordan', name: 'Jordan', text: 'saved today · first deposit this week', points: 60, project: 'Community Centre', createdAt: ago(5 * H) },
        { id: 'p4', uid: 'sam', name: 'Sam', text: 'finished a daily task', points: 15, project: 'Community Centre', createdAt: ago(D) },
        { id: 'p5', uid: 'jordan', name: 'Jordan', text: 'started a new project', points: 0, project: 'Community Centre', started: true, createdAt: ago(4 * D) },
        { id: 'p6', uid: 'maya', name: 'Maya', text: 'saved today', points: 10, project: 'Lighthouse', done: true, createdAt: ago(5 * D) },
      ]]],
    };
  }
  // if town.js isn't running (offline), still show the town's buildings on the practice island
  const practiceBuilds = [
    { key: TOWN + '#1', code: TOWN, town: 'Maple Bay', name: 'Lighthouse', f: 1 },
    { key: TOWN + '#2', code: TOWN, town: 'Maple Bay', name: 'Community Centre', f: 520 / 800, progress: 520, goal: 800, members: 4 },
  ];

  // ---------- what you did during the tour, so Maple can mention it ----------
  let did = {};

  // ---------- the steps ----------
  // say / done: what Maple says (done = once you've done the thing `wait` is waiting for)
  // open: a panel to show (or a function), arrow: point at something on the island
  // target: CSS for what to spotlight (or a function, re-checked every frame), spot: spotlight 'build' / 'fox' on the island instead
  // pos: where the card sits ('top' keeps the bag, the town island and the arrow pad clear), auto: ms before moving on by itself
  const STEPS = [
    {
      title: 'Welcome!',
      say: "Hi, I'm Maple! :fox: Let me show you around. This is a practice island, so try anything you like. Nothing here is saved, and your own island will be waiting when we're done.",
    },
    {
      title: 'The Bank',
      open: () => { openPanel('bank'); $('depGoal').value = '0'; window.renderGoalPick(); },
      target: () => $('depAmount').value ? '#depositBtn' : '[data-amt="5"]', // first the $5 tile, then the log button
      say: () => $('depAmount').value
        ? 'Now press LOG MY SAVINGS.'
        : 'This is the Bank. Whenever you save real money, log it here. Try it: pick $5.',
      wait: type => type === 'saved',
      done: 'Nice! :coin: Coins are rewarded based on consistency (how frequently you save), not how MUCH you save!',
    },
    {
      title: 'Daily tasks',
      open: () => { openPanel('daily'); if (did.saved) tickOffDeposit(); },
      target: () => did.saved ? '#missions li[data-id="deposit"]' : '#missions',
      say: () => did.saved
        ? 'Logging savings just ticked off a task! Do any one task each day to grow your :flame: streak. Every task earns coins, and it helps your town build too.'
        : 'Tasks are small money habits. Do any one each day to grow your :flame: streak. Every task earns coins, and it helps your town build too.',
    },
    {
      title: 'Goals',
      target: () => waiting ? '[data-open="goals"]' : '#personalGoals',
      say: 'Your goals have their own spot. Click Goals to open them.',
      wait: (type, name) => type === 'panel' && name === 'goals',
      done: () => did.saved?.goal
        ? `Goals are what you're saving for. Your $${did.saved.amt} just moved "${did.saved.goal}" forward! Star the ones that matter most, or add your own.`
        : "Goals are what you're saving for, like a laptop or an emergency fund. Pick one when you log savings in the Bank, star the ones that matter most, or add your own.",
    },
    {
      title: 'The Shop',
      pos: 'top', arrow: 'shop',
      say: `Coins buy things for your island. Walk to the Shop with ${walkKeys}, then ${useIt} to go in.`,
      wait: (type, name) => type === 'panel' && name === 'shop', auto: 300,
    },
    {
      title: 'Shopping',
      open: 'shop', target: '#shop',
      say: "You've got practice coins to spend. Buy anything you like!",
      wait: type => type === 'bought', auto: 900,
    },
    {
      title: 'Your bag',
      pos: 'top', target: () => selectedItem ? null : '.bag-items', // once an item is picked, the whole island is fair game
      say: () => `${did.bought ? "It's in your bag! " : 'Things you buy go in your bag. '}${click} an item there, then ${click.toLowerCase()} a spot on your island to place it.${touch ? '' : ' Shift-click picks it back up.'}`,
      wait: type => type === 'placed',
      done: 'Looking good! You can move anything later with :pencil: edit island in the more menu.',
    },
    {
      title: 'Your town',
      pos: 'top', target: '.town-isle',
      say: `See the little island in the corner? That's your Town, where you save together with friends. ${click} it to visit!`,
      wait: (type, name) => type === 'panel' && name === 'town', auto: 300,
    },
    {
      title: 'Maple Bay',
      open: 'town', target: '#townBoard',
      say: () => `Welcome to Maple Bay, a practice town! Whenever someone saves or finishes a task, a notice gets pinned to the Town News.${did.habit ? ' See? Your habits today are up there too!' : ''}`,
    },
    {
      title: 'Cheer them on',
      open: 'town', setup: () => { $('noteText').value = 'Keep it up!'; }, target: '#noteForm',
      say: 'You can pin notes to cheer your town on. Your note is ready: press Pin to post it!',
      wait: type => type === 'pinned',
      done: "Pinned! :pin: Everyone in town can see it. In your real towns you can heart each other's posts too.",
    },
    {
      title: 'Building together',
      // card up top while you walk (keeps the arrow pad clear), then down below once the build info pops up
      pos: () => waiting ? 'top' : 'bottom',
      arrow: 'build', spot: () => waiting ? 'buildPlayer' : null, target: () => waiting ? null : '#buildContrib',
      say: `Every habit adds :hammer: points to your town's project, and it gets built right here on your island! Walk up to the Community Centre with ${walkKeys}, then ${useIt}.`,
      wait: (type, name) => type === 'panel' && name === 'build',
      done: "Here's who's helping build it. Maple Bay builds one thing at a time, and only habits are shared, never dollar amounts.",
    },
    {
      title: 'The more menu',
      // opened a moment later: the click on Next would otherwise close it again straight away
      open: () => setTimeout(() => { if (running) { $('moreMenu').classList.remove('hidden'); $('moreBtn').setAttribute('aria-expanded', 'true'); } }),
      target: () => $('moreMenu').classList.contains('hidden') ? '#moreBtn' : '#moreMenu',
      // little labels pinned beside each menu option
      tips: [['#editBtn', 'move & decorate'], ['.more-item[data-open="history"]', 'savings, past & future'], ['.more-item[data-open="character"]', 'change your look'], ['.more-item[data-open="sync"]', 'same island on every device']],
      say: 'A few more things live in the more menu.',
    },
    {
      title: 'Any more questions?',
      arrow: 'fox', spot: 'fox',
      say: `That's the tour! Any more questions? Come find me any time and ${click.toLowerCase()} me to chat about money, goals or the future. Ready to start your own island?`,
    },
  ];

  // ---------- running the tour ----------
  let running = false, first = false, townShown = false, step = 0, waiting = false;
  const value = v => typeof v === 'function' ? v() : v;

  function shouldRun() {
    try { if (localStorage.getItem(DONE_KEY)) return false; } catch {}
    return !window.getState().tutorialDone;
  }

  function showPracticeTown() {
    if (townShown) return;
    if (window.townDemo) { window.townDemo.start(practiceTown); townShown = true; }
    else window.setTownBuilds?.(practiceBuilds);
  }

  function start() {
    if (running) return;
    first = shouldRun();
    running = true; townShown = false; did = {};
    window.enterPracticeIsland(practiceIsland());
    showPracticeTown();
    $('tutFox').getContext('2d').drawImage($('chatFox'), 0, 0); // Maple's portrait, already drawn for the chat
    card.classList.remove('hidden');
    document.body.classList.add('tut-on');
    go(0);
    spotlight();
    $('tutNext').focus({ preventScroll: true });
  }

  function go(i) {
    step = i;
    const s = STEPS[i];
    waiting = !!s.wait;
    showPracticeTown(); // in case town.js finished loading after the tour started
    window.closeTownDetail?.();
    const alreadyOpen = typeof s.open === 'string' && !$('panel-' + s.open).classList.contains('hidden');
    if (!alreadyOpen) {   // same pop-up as the last step: leave it be rather than closing and reopening it
      closePanels();
      if (typeof s.open === 'function') s.open(); else if (s.open) openPanel(s.open);
    }
    s.setup?.();
    window.setTutorialArrow(s.arrow || null);
    if (s.arrow === 'build' || s.arrow === 'fox') window.tutorialHopTo(s.arrow); // bring it on screen
    render();
  }

  function render() {
    const s = STEPS[step], last = step === STEPS.length - 1;
    card.dataset.pos = value(s.pos) || 'bottom';
    document.body.classList.toggle('tut-bottom', card.dataset.pos === 'bottom');
    $('tutStep').textContent = `${step + 1}/${STEPS.length}`;
    $('tutTitle').textContent = s.title;
    sayLine();
    $('tutBack').classList.toggle('hidden', step === 0 || last);
    $('tutAlt').classList.toggle('hidden', !last);
    $('tutAlt').textContent = 'Ask Maple';
    const next = $('tutNext');
    next.textContent = last ? 'Start my island' : step === 0 ? "Let's go!" : 'Next';
    next.className = waiting ? 'secondary' : 'primary'; // still waiting for you to try it: Next is quieter, but always works
    fit();
  }
  // what Maple says right now (some lines change as you go, e.g. "pick $5" → "now press LOG")
  function sayLine() {
    const s = STEPS[step], html = window.pit(value(s.wait && !waiting && s.done ? s.done : s.say));
    if ($('tutText').innerHTML !== html) { $('tutText').innerHTML = html; fit(); }
  }

  // ---------- spotlight: darken the whole screen except the thing to click (or look at) ----------
  // One hole, cut with a huge box-shadow; it never blocks clicks (pointer-events: none). Follows its target every frame,
  // since pop-ups animate in, lists re-sort and the camera moves.
  const spot = document.createElement('div');
  spot.className = 'tut-spot hidden';
  spot.setAttribute('aria-hidden', 'true');
  document.body.append(spot);
  let spotFor = null, spotFrame = 0;
  function spotlight() {
    cancelAnimationFrame(spotFrame);
    if (!running) return spot.classList.add('hidden');
    spotFrame = requestAnimationFrame(spotlight);
    sayLine();
    placeTips();
    const s = STEPS[step], sel = value(s.target), world = value(s.spot);
    let r = null;
    if (sel) {
      const el = document.querySelector(sel);
      if (el && el !== spotFor) { spotFor = el; el.scrollIntoView?.({ block: 'nearest' }); }
      const b = el?.getBoundingClientRect();
      if (b?.width && b.height) {
        // inside a scrolling pop-up, only the part you can see
        const view = el.closest('.window-body')?.getBoundingClientRect();
        r = view ? { left: Math.max(b.left, view.left), top: Math.max(b.top, view.top), right: Math.min(b.right, view.right), bottom: Math.min(b.bottom, view.bottom) } : b;
        if (r.right <= r.left || r.bottom <= r.top) r = null;
      }
    } else if (world) {
      const w = window.tutorialWorldRect(world);
      if (w) r = { left: w.left, top: w.top, right: w.left + w.width, bottom: w.top + w.height };
    }
    if (!r) return spot.classList.add('hidden');
    const pad = 6;
    Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.right - r.left + pad * 2 + 'px', height: r.bottom - r.top + pad * 2 + 'px' });
    spot.classList.remove('hidden');
  }

  // little paper labels beside menu options (a step's `tips`: [[selector, text], …]), shown while the option is on screen
  const tipBox = document.createElement('div');
  tipBox.setAttribute('aria-hidden', 'true'); // the same words are on the buttons' own labels
  document.body.append(tipBox);
  let tipsFor = null;
  function placeTips() {
    const tips = (running && STEPS[step].tips) || [];
    if (tipsFor !== tips) {
      tipsFor = tips;
      tipBox.replaceChildren(...tips.map(([, text]) => Object.assign(document.createElement('span'), { className: 'tut-tip', textContent: text })));
    }
    tips.forEach(([sel], i) => {
      const tip = tipBox.children[i], b = document.querySelector(sel)?.getBoundingClientRect();
      tip.classList.toggle('hidden', !b?.width);
      // wraps onto two lines when there isn't room beside the menu (phones)
      if (b?.width) Object.assign(tip.style, { left: b.left - 14 + 'px', top: b.top + b.height / 2 + 'px', maxWidth: Math.max(70, b.left - 22) + 'px' });
    });
  }

  // Daily tasks: replay the "deposit" task being crossed off (it was ticked the moment you logged savings)
  function tickOffDeposit() {
    const doneBefore = S.missionsDone;
    S.missionsDone = doneBefore.filter(id => id !== 'deposit');
    renderMissions();                   // show it unticked, at the top
    S.missionsDone = doneBefore;
    setTimeout(() => $('missions').querySelector('[data-id="deposit"]')?.classList.add('striking'), 500);
    setTimeout(() => { if (running) renderMissions(); }, 1300); // then it sinks to the bottom, done
  }

  // pop-ups make room for the card at the bottom of the screen (see body.tut-bottom in style.css)
  const fit = () => document.body.style.setProperty('--tut-h', card.offsetHeight + 'px');
  addEventListener('resize', () => { if (running) fit(); });

  function finish(then) {
    if (!running) return;
    running = false;
    card.classList.add('hidden');
    document.body.classList.remove('tut-on', 'tut-bottom');
    spot.classList.add('hidden'); spotFor = null;
    placeTips(); // (clears them)
    window.setTutorialArrow(null);
    window.closeTownDetail?.();
    window.leavePracticeIsland();  // your real island comes back
    window.townDemo?.stop();       // and your real towns
    try { localStorage.setItem(DONE_KEY, '1'); } catch {}
    const s = window.getState();
    if (!s.tutorialDone) { s.tutorialDone = true; window.saveGame(); }
    if (then === 'chat') openChat();
    else if (first) window.showBankWelcome();
  }

  // ---------- listening for what you do (game.js sends these) ----------
  function heard(type, detail) {
    if (!running) return;
    if (type === 'saved') did.saved = detail;
    if (type === 'saved' || type === 'task') did.habit = true;
    if (type === 'bought') did.bought = detail;
    const s = STEPS[step];
    if (!waiting || !s.wait(type, detail)) return;
    waiting = false;
    if (s.auto) setTimeout(() => { if (running && STEPS[step] === s) go(step + 1); }, s.auto);
    else render();
  }
  ['panel', 'saved', 'task', 'bought', 'placed', 'pinned'].forEach(type => addEventListener('fmi:' + type, e => heard(type, e.detail)));

  // ---------- buttons ----------
  const blur = () => document.activeElement?.blur?.(); // so Space walks/talks in the game instead of pressing the button again
  $('tutNext').onclick = () => { blur(); if (step === STEPS.length - 1) finish(); else go(step + 1); };
  $('tutBack').onclick = () => { blur(); if (step > 0) go(step - 1); };
  $('tutAlt').onclick = () => { blur(); finish('chat'); };
  $('tutSkip').onclick = () => { blur(); finish(); };
  // keys pressed on the card's buttons are for the card, not the game behind it
  card.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') e.stopPropagation(); });
  // "Redo the tutorial" at the bottom of the ? pop-up. Your own island is put back exactly as it was afterwards.
  $('tutorialBtn')?.addEventListener('click', () => {
    $('helpPop').classList.add('hidden'); $('helpBtn').classList.remove('active');
    start();
  });

  window.tutorial = { shouldRun, start };
})();
