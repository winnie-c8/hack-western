// ---------- Daily Star: Hot or Cold ----------
// One secret keyword a day, and every keyword unlocks a real way to save money.
// Guess any word: it comes back cold (red), warm (yellow) or hot (bright green). Fewest guesses wins.
(() => {
  const $ = id => document.getElementById(id);
  const DAILY_STAR_VERSION = 9;
  const MAX_GUESS_LENGTH = 40;
  const GIVE_UP_AFTER = 10; // "Reveal the word" appears after this many guesses
  const API = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? 'http://localhost:3001' : 'https://hack-western.onrender.com';

  // word: the secret keyword · also: other ways to type it that count as finding it
  // near: hand-picked closeness for related words (instant, and works without Gemini); anything else asks Gemini
  // tip: the saving fact the keyword unlocks
  // (keep this order: the day → puzzle pick hashes into this list)
  const PUZZLES = [
    { id: 'library-museum-pass', word: 'museum pass', also: ['museum passes', 'museum ticket', 'library pass'],
      near: { 90: ['museum', 'pass', 'gallery pass', 'museum card'], 70: ['library', 'zoo', 'admission', 'ticket', 'exhibit', 'gallery'], 45: ['free', 'borrow', 'card', 'culture', 'attraction', 'membership'] },
      tip: 'Borrow a free museum pass through your public library.' },
    { id: 'tool-library', word: 'tool library', also: ['tool lending', 'tool share', 'tool sharing'],
      near: { 90: ['tools', 'tool', 'lending library', 'borrow tools'], 70: ['drill', 'hammer', 'borrow', 'library', 'ladder', 'lend', 'saw'], 45: ['diy', 'hardware', 'neighbor', 'neighbour', 'share', 'rent', 'repair'] },
      tip: 'Borrow an occasional-use tool from a tool library or neighbourhood lending group.' },
    { id: 'off-peak-laundry', word: 'off-peak', also: ['off peak', 'offpeak', 'time of use'],
      near: { 90: ['peak', 'peak hours', 'night rates', 'time-of-use'], 70: ['laundry', 'electricity', 'hydro', 'hours', 'night', 'evening', 'rates'], 45: ['washing machine', 'dryer', 'energy', 'power', 'bill', 'utility', 'utilities'] },
      tip: 'Run laundry during off-peak hours on a time-of-use electricity plan.' },
    { id: 'buy-nothing', word: 'buy nothing', also: ['buy nothing group', 'buy-nothing'],
      near: { 90: ['freecycle', 'gifting', 'free group', 'swap', 'giveaway', 'clothing swap'], 70: ['free', 'community', 'gift', 'neighbor', 'neighbour', 'facebook group', 'trade', 'donate'], 45: ['share', 'secondhand', 'local', 'give', 'request', 'nothing'] },
      tip: 'Request a needed item from a Buy Nothing group or trade clothes in a swap with friends.' },
    { id: 'generic-prescription', word: 'generic', also: ['generics', 'generic drug', 'generic medication', 'generic medicine', 'generic brand'],
      near: { 90: ['brand name', 'no name', 'store brand', 'prescription', 'no-name'], 70: ['pharmacist', 'pharmacy', 'medication', 'medicine', 'drug', 'drugs', 'pills'], 45: ['doctor', 'health', 'cheaper', 'version', 'brand'] },
      tip: 'Ask your pharmacist whether a generic version of a prescription is available.' },
    { id: 'split-bulk', word: 'bulk', also: ['buy in bulk', 'bulk buy', 'bulk buying', 'buying in bulk'],
      near: { 90: ['costco', 'wholesale', 'split', 'large pack', 'family size'], 70: ['groceries', 'neighbor', 'neighbour', 'share', 'warehouse', 'quantity', 'discount'], 45: ['grocery', 'food', 'store', 'buy', 'divide'] },
      tip: 'Split a bulk grocery purchase with a neighbour to get the discount without the excess.' },
    { id: 'shop-freezer', word: 'freezer', also: ['shop your freezer', 'freezer meal', 'freezer meals'],
      near: { 90: ['frozen', 'fridge', 'freeze', 'ice box', 'deep freeze'], 70: ['leftovers', 'meal plan', 'meal prep', 'groceries', 'food'], 45: ['kitchen', 'cold', 'cook', 'dinner', 'inventory', 'ice'] },
      tip: 'Plan a meal from your freezer before grocery shopping to avoid buying duplicates.' },
    { id: 'repair-cafe', word: 'repair', also: ['repair cafe', 'repairs', 'repair café', 'fix it'],
      near: { 90: ['fix', 'mend', 'fixing', 'repair shop', 'mending'], 70: ['broken', 'sew', 'glue', 'cafe', 'workshop', 'tools'], 45: ['replace', 'community', 'volunteer', 'old', 'reuse'] },
      tip: 'Take a small broken item to a community repair café instead of replacing it.' },
    { id: 'rotate-streaming', word: 'streaming', also: ['streaming service', 'streaming services', 'streaming subscription', 'streaming subscriptions'],
      near: { 90: ['netflix', 'disney', 'disney plus', 'crave', 'prime video', 'subscriptions', 'subscription'], 70: ['tv', 'shows', 'movies', 'cancel', 'resubscribe', 'rotate'], 45: ['cable', 'entertainment', 'monthly', 'membership', 'apps'] },
      tip: 'Keep one streaming service at a time, cancel it, and resubscribe when a show you want arrives.' },
    { id: 'student-discounts', word: 'student discount', also: ['student discounts', 'student deal', 'student deals', 'student pricing'],
      near: { 90: ['student', 'discount', 'unidays', 'student id', 'spc card', 'spc'], 70: ['deal', 'coupon', 'youth', 'school', 'university', 'college', 'promo'], 45: ['spotify', 'sale', 'cheaper', 'campus', 'young'] },
      tip: 'Use student or young-adult discounts on music, software, transit, or phone plans.' },
    { id: 'prepaid-phone', word: 'prepaid', also: ['prepaid plan', 'prepaid phone', 'pre-paid', 'pre paid'],
      near: { 90: ['phone plan', 'budget carrier', 'pay as you go', 'sim', 'sim card'], 70: ['phone', 'carrier', 'cell', 'mobile', 'plan', 'data'], 45: ['bill', 'contract', 'provider', 'monthly', 'switch'] },
      tip: 'Switch to a prepaid or budget phone plan from a smaller carrier.' },
    { id: 'rescue-food', word: 'food rescue', also: ['too good to go', 'food rescue app', 'surprise bag', 'rescue food'],
      near: { 90: ['surprise bag', 'flashfood', 'food waste', 'too good'], 70: ['leftover', 'leftovers', 'bakery', 'waste', 'app', 'rescue', 'expiring'], 45: ['food', 'discount', 'restaurant', 'groceries', 'cheap', 'bag'] },
      tip: 'Use a food-rescue app like Too Good To Go for discounted surprise bags from local shops.' },
    { id: 'fakeaway', word: 'takeout', also: ['takeaway', 'take out', 'take-out', 'fakeaway', 'takeouts'],
      near: { 90: ['delivery', 'uber eats', 'doordash', 'skip the dishes', 'fast food'], 70: ['restaurant', 'order', 'cook at home', 'homemade', 'recipe', 'pizza'], 45: ['food', 'dinner', 'meal', 'cooking', 'burger'] },
      tip: 'Recreate a favourite takeout order at home as a cheaper "fakeaway" meal.' },
    { id: '72-hour-rule', word: 'wait', also: ['waiting', '72 hour rule', '72-hour rule', 'three day rule', 'wait 72 hours'],
      near: { 90: ['pause', 'delay', '72 hours', 'three days', 'patience', 'sleep on it'], 70: ['impulse', 'cooling off', 'later', 'think', 'hold off', 'rule'], 45: ['time', 'days', 'hours', 'cart', 'decide'] },
      tip: 'Wait 72 hours before buying a nonessential item to let impulse purchases fade.' },
    { id: 'checkout-friction', word: 'saved cards', also: ['saved card', 'delete saved cards', 'one click', 'one-click', 'one click checkout'],
      near: { 90: ['autofill', 'saved payment', 'stored card', 'card details', 'saved'], 70: ['checkout', 'credit card', 'delete', 'payment', 'apple pay', 'paypal', 'cards'], 45: ['shopping app', 'online', 'cart', 'account', 'amazon', 'card'] },
      tip: 'Delete saved payment cards and turn off one-click checkout in shopping apps.' },
    { id: 'secondhand-first', word: 'thrift', also: ['thrifting', 'thrift store', 'thrift shop', 'thrift stores'],
      near: { 90: ['secondhand', 'second hand', 'used', 'value village', 'vintage', 'marketplace'], 70: ['goodwill', 'preloved', 'resale', 'consignment', 'kijiji', 'vinted'], 45: ['clothes', 'cheap', 'old', 'store', 'donate'] },
      tip: 'Check secondhand listings or thrift stores before buying an item new.' },
    { id: 'price-history', word: 'price tracker', also: ['price tracking', 'price history', 'price trackers', 'track prices'],
      near: { 90: ['camelcamelcamel', 'price drop', 'price alert', 'tracker', 'tracking'], 70: ['sale', 'deal', 'compare', 'discount', 'honey', 'chart', 'price'], 45: ['amazon', 'shopping', 'cost', 'browser', 'history'] },
      tip: 'Check a price-history tool to see whether a sale is actually a good deal.' },
    { id: 'mute-sales', word: 'unsubscribe', also: ['unsubscribing', 'unsubscribe emails', 'unsub'],
      near: { 90: ['unfollow', 'mute', 'opt out', 'newsletter', 'marketing emails'], 70: ['email', 'emails', 'inbox', 'spam', 'promotions', 'sales'], 45: ['notifications', 'ads', 'social media', 'influencer', 'haul'] },
      tip: 'Unsubscribe from sales emails and unfollow haul content that tempts you to shop.' },
    { id: 'library-apps', word: 'library card', also: ['library cards', 'public library card'],
      near: { 90: ['libby', 'hoopla', 'library', 'public library', 'kanopy'], 70: ['ebook', 'ebooks', 'audiobook', 'audiobooks', 'books', 'borrow', 'card'], 45: ['read', 'reading', 'book', 'free', 'app', 'comics', 'movies'] },
      tip: 'Use Libby or Hoopla with a library card for free ebooks, audiobooks, comics, and movies.' },
    { id: 'free-admission', word: 'free day', also: ['free days', 'free museum day', 'free admission', 'free entry'],
      near: { 90: ['student night', 'discount day', 'matinee', 'free night', 'pay what you can'], 70: ['museum', 'gallery', 'free', 'admission', 'ticket', 'zoo'], 45: ['event', 'culture', 'weekend', 'night', 'show', 'day'] },
      tip: 'Look for museum free days, student nights, or matinee tickets before paying full price.' },
    { id: 'pay-yourself-first', word: 'payday', also: ['pay day', 'pay yourself first', 'pay-day'],
      near: { 90: ['paycheque', 'paycheck', 'salary', 'automatic transfer', 'auto transfer'], 70: ['savings', 'save', 'transfer', 'automatic', 'income', 'wages', 'pay'], 45: ['bank', 'money', 'schedule', 'account', 'deposit'] },
      tip: 'Schedule an automatic savings transfer for payday so you save before you spend.' },
    { id: 'roundup-savings', word: 'round up', also: ['round ups', 'roundup', 'round-up', 'round-ups', 'roundups'],
      near: { 90: ['spare change', 'round', 'change', 'coins', 'moneybox'], 70: ['savings', 'purchase', 'nearest dollar', 'app', 'automatic', 'cents'], 45: ['bank', 'save', 'small', 'account', 'transfer'] },
      tip: 'Use purchase round-ups to move spare change into savings.' },
    { id: 'fun-money-account', word: 'fun money', also: ['fun account', 'fun-money', 'fun money account', 'play money'],
      near: { 90: ['spending money', 'allowance', 'treat money', 'splurge', 'guilt free'], 70: ['budget', 'separate account', 'treat', 'spending', 'fun'], 45: ['account', 'money', 'bank', 'hobby', 'wants'] },
      tip: 'Keep a separate fun-money account for guilt-free spending.' },
    { id: 'negotiate-bill', word: 'negotiate', also: ['negotiation', 'negotiating', 'haggle', 'fee waiver'],
      near: { 90: ['haggle', 'bargain', 'lower rate', 'fee waiver', 'retention'], 70: ['call', 'phone bill', 'internet bill', 'provider', 'discount', 'ask'], 45: ['bill', 'deal', 'cancel', 'price', 'customer service'] },
      tip: 'Call your phone or internet provider to ask for a fee waiver or a lower rate.' },
    { id: 'employer-match', word: 'employer match', also: ['company match', 'employer matching', 'rrsp match', '401k match', 'matching contributions'],
      near: { 90: ['match', 'matching', 'group rrsp', 'pension', '401k'], 70: ['employer', 'retirement', 'contribution', 'workplace', 'benefits', 'rrsp'], 45: ['job', 'salary', 'savings', 'invest', 'free money'] },
      tip: 'Check whether your employer matches contributions to a workplace retirement plan.' },
  ];
  let countdownInterval = null;
  let activeTab = 'play';
  let logbookPage = 0;

  function localDay() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function puzzleForDay(day) {
    // Hash the date so the same daily keyword is picked across reloads and devices.
    let seed = 2166136261;
    for (let index = 0; index < day.length; index++) {
      seed = Math.imul(seed ^ day.charCodeAt(index), 16777619);
    }
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return PUZZLES[(seed >>> 0) % PUZZLES.length];
  }

  function puzzleForCurrentDay(day) {
    const saved = ensureState().dailyStar;
    if (saved.date === day) {
      const savedPuzzle = PUZZLES.find(puzzle => puzzle.id === saved.puzzleId);
      if (savedPuzzle) return savedPuzzle;
    }
    return puzzleForDay(day);
  }

  // guesses: [{ w: the word, s: closeness 0–100 }] in the order you typed them
  function emptyProgress(day = null, puzzleId = null) {
    return { version: DAILY_STAR_VERSION, date: day, puzzleId, guesses: [], won: false, gaveUp: false, completed: false };
  }

  function ensureState() {
    const gameState = window.getState();
    if (!gameState.dailyStar || gameState.dailyStar.version !== DAILY_STAR_VERSION) gameState.dailyStar = emptyProgress();
    return gameState;
  }

  const normalize = value => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const isAnswer = (guess, puzzle) => [puzzle.word, ...puzzle.also].some(a => normalize(a) === normalize(guess));

  function validProgress(p, day, puzzle) {
    return !!p && p.version === DAILY_STAR_VERSION && p.date === day && p.puzzleId === puzzle.id &&
      Array.isArray(p.guesses) && p.guesses.every(g => g && typeof g.w === 'string' && g.w.trim() && g.w.length <= MAX_GUESS_LENGTH &&
        Number.isInteger(g.s) && g.s >= 0 && g.s <= 100) &&
      typeof p.won === 'boolean' && typeof p.gaveUp === 'boolean' && typeof p.completed === 'boolean';
  }

  function progressFor(day, puzzle) {
    const gameState = ensureState();
    if (!validProgress(gameState.dailyStar, day, puzzle)) {
      gameState.dailyStar = emptyProgress(day, puzzle.id);
      window.saveGame();
    }
    return gameState.dailyStar;
  }

  function untilLocalMidnight() {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    return Math.max(0, midnight - Date.now());
  }

  function updateCountdown() {
    const countdown = $('starCountdown');
    if (!countdown) return;
    const seconds = Math.ceil(untilLocalMidnight() / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    countdown.textContent = `A new star word arrives in ${hours}h ${String(minutes).padStart(2, '0')}m.`;
  }

  function startCountdown() {
    if (!countdownInterval) countdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown();
  }

  function setActiveTab(tab) {
    activeTab = tab;
    $('starPlayTab').setAttribute('aria-selected', String(tab === 'play'));
    $('starLogbookTab').setAttribute('aria-selected', String(tab === 'logbook'));
    const mount = $('starRoundMount');
    mount.classList.toggle('is-logbook', tab === 'logbook');
    mount.setAttribute('role', 'tabpanel');
    mount.setAttribute('aria-labelledby', tab === 'logbook' ? 'starLogbookTab' : 'starPlayTab');
    mount.tabIndex = 0;
  }

  function renderLogbook() {
    setActiveTab('logbook');
    const state = window.getState();
    const entries = [...(state.dailyStarLogbook || [])].sort((a, b) => b.date.localeCompare(a.date));
    const pageCount = Math.max(1, Math.ceil(entries.length / 2));
    logbookPage = Math.max(0, Math.min(logbookPage, pageCount - 1));
    const mount = $('starRoundMount');
    mount.replaceChildren();

    const book = document.createElement('section');
    book.className = 'daily-star-book';
    book.setAttribute('aria-label', 'Daily Star saving tips logbook');
    const title = document.createElement('h3');
    title.className = 'daily-star-book-title';
    title.textContent = 'Saving Tips';
    const spread = document.createElement('div');
    spread.className = 'daily-star-book-spread';
    spread.setAttribute('aria-live', 'polite');

    const visibleEntries = entries.slice(logbookPage * 2, logbookPage * 2 + 2);
    if (!visibleEntries.length) {
      const empty = document.createElement('p');
      empty.className = 'daily-star-logbook-empty';
      empty.textContent = 'Find a Daily Star keyword to add your first saving tip.';
      spread.append(empty);
    } else {
      visibleEntries.forEach(entry => {
        const page = document.createElement('article');
        page.className = 'daily-star-logbook-entry';
        const date = document.createElement('time');
        date.className = 'daily-star-logbook-date';
        date.dateTime = entry.date;
        const [year, month, day] = entry.date.split('-');
        date.textContent = `${month}/${day}/${year}`;
        const tip = document.createElement('p');
        tip.className = 'daily-star-logbook-tip';
        tip.textContent = entry.tip;
        const stat = document.createElement('p');
        stat.className = 'daily-star-logbook-accuracy';
        if (Number.isInteger(entry.guesses)) {
          stat.textContent = `${entry.keyword ? `"${entry.keyword}" · ` : ''}${entry.found === false ? 'revealed after' : 'found in'} ${entry.guesses} ${entry.guesses === 1 ? 'guess' : 'guesses'}`;
        } else {
          stat.textContent = entry.accuracyScore == null ? 'Accuracy Score: unavailable' : `Accuracy Score: ${entry.accuracyScore}%`; // older entries
        }
        page.append(date, tip, stat);
        spread.append(page);
      });
      if (visibleEntries.length === 1) {
        const blankPage = document.createElement('div');
        blankPage.className = 'daily-star-logbook-entry daily-star-logbook-blank';
        blankPage.setAttribute('aria-hidden', 'true');
        spread.append(blankPage);
      }
    }

    const controls = document.createElement('div');
    controls.className = 'daily-star-book-controls';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'secondary';
    previous.textContent = '← Previous';
    previous.disabled = logbookPage === 0;
    previous.addEventListener('click', () => { logbookPage--; renderLogbook(); });
    const pageNumber = document.createElement('span');
    pageNumber.textContent = `Page ${logbookPage + 1} of ${pageCount}`;
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'secondary';
    next.textContent = 'Next →';
    next.disabled = logbookPage >= pageCount - 1;
    next.addEventListener('click', () => { logbookPage++; renderLogbook(); });
    controls.append(previous, pageNumber, next);
    book.append(title, spread, controls);
    mount.append(book);
  }

  function recordCompletedRound(progress, puzzle) {
    if (!progress.completed) return;
    grantRewards(progress);
    const state = window.getState();
    state.dailyStarLogbook ||= [];
    if (!state.dailyStarLogbook.some(e => e.date === progress.date && e.puzzleId === puzzle.id)) {
      state.dailyStarLogbook.push({ date: progress.date, puzzleId: puzzle.id, tip: puzzle.tip, keyword: puzzle.word,
        guesses: progress.guesses.length, found: progress.won });
      window.saveGame();
    }
  }

  // ---------- How close is a guess? ----------
  // 1) the keyword itself (or another way to type it) = 100
  // 2) a hand-picked related word, or a word that's part of the keyword
  // 3) otherwise Gemini judges it (server); if that's unreachable, it counts as cold
  const cache = new Map();
  // Each word gets its own score inside its group's range (not just 90 / 70 / 45), and always the same one:
  // a small hash of the word picks the spot, so "books" is always e.g. 71% but "ebooks" might be 63%.
  const RANGES = { 90: [84, 97], 70: [56, 79], 45: [28, 52] }; // hot / warm / lukewarm hand-picked words
  const SHARES_A_WORD = [74, 89];  // e.g. "card" for "library card"
  const COLD = [1, 19];            // anything unrelated (or when Gemini can't be reached)
  function hashWord(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  const spread = (text, [lo, hi]) => lo + hashWord(text) % (hi - lo + 1);
  const coldScore = (guess, puzzle) => spread(`${puzzle.id}|${normalize(guess)}`, COLD);
  function closenessOffline(guess, puzzle) {
    const g = normalize(guess);
    if (isAnswer(guess, puzzle)) return 100;
    for (const [tier, words] of Object.entries(puzzle.near)) {
      if (words.some(w => normalize(w) === g)) return spread(`${puzzle.id}|${g}`, RANGES[tier]);
    }
    const keyParts = normalize(puzzle.word).split(' ');
    if (g.split(' ').some(part => part.length > 2 && keyParts.includes(part))) return spread(`${puzzle.id}|${g}`, SHARES_A_WORD);
    return null;
  }
  async function closeness(guess, puzzle) {
    const offline = closenessOffline(guess, puzzle);
    if (offline !== null) return offline;
    const key = `${puzzle.id}|${normalize(guess)}`;
    if (cache.has(key)) return cache.get(key);
    let score;
    try {
      ({ score } = await postDailyStar('closeness', { guess, keyword: puzzle.word, tip: puzzle.tip }));
    } catch (error) {
      // older server without the hot/cold route: ask the original scorer about the keyword instead
      if (error.status === 404) ({ score } = await postDailyStar('score', { guesses: [guess], expectedAnswer: `the keyword "${puzzle.word}"` }));
      else throw error;
    }
    if (!Number.isInteger(score)) throw new Error('No score');
    score = Math.max(0, Math.min(97, score)); // only the real keyword gets 100
    cache.set(key, score);
    return score;
  }
  async function postDailyStar(path, body) {
    const response = await fetch(`${API}/api/daily-star/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || `Request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return result;
  }

  // red (cold) → yellow (warm) → bright green (hot)
  const heat = s => `hsl(${Math.round(s * 1.2)}, ${s >= 95 ? 70 : 78}%, ${s >= 95 ? 42 : 52}%)`;
  const heatWord = s => s >= 100 ? 'found it!' : s >= 80 ? 'hot' : s >= 60 ? 'warm' : s >= 35 ? 'lukewarm' : 'cold';

  // ---------- Playing: pop-up cards (intro → how it works → the hot/cold board → result) ----------
  let cardToken = 0;
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function button(text, className, onClick) {
    const b = el('button', className, text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  // swap the card in the play area: the old one slides off to the left, the new one pops in from the right
  function showCard(card) {
    if (activeTab !== 'play') return;
    const mount = $('starRoundMount');
    const old = mount.querySelector('.ds-card');
    const token = ++cardToken;
    card.classList.add('ds-card');
    const enter = () => {
      if (token !== cardToken || activeTab !== 'play') return;
      card.classList.add(old ? 'ds-card-enter' : 'ds-card-pop');
      mount.replaceChildren(card);
      (card.querySelector('input:not(:disabled)') || card.querySelector('.primary:not(:disabled)'))?.focus({ preventScroll: true });
    };
    if (!old || reduceMotion()) return enter();
    old.classList.add('ds-card-leave');
    setTimeout(enter, 220);
  }

  function renderRiddle(progress, puzzle) {
    if (progress.completed) return renderResult(progress, puzzle);
    showCard(progress.guesses.length ? boardCard(progress, puzzle) : introCard(progress, puzzle));
  }

  function introCard(progress, puzzle) {
    const card = el('section', 'ds-card-intro');
    card.append(
      el('p', 'ds-card-big', "Today's star word hides a niche way to save money."),
      button('Next →', 'primary ds-card-next', () => showCard(howCard(progress, puzzle))),
    );
    return card;
  }

  function howCard(progress, puzzle) {
    const card = el('section', 'ds-card-how');
    const scale = el('div', 'ds-heat-scale');
    scale.setAttribute('aria-hidden', 'true');
    scale.append(el('span', null, 'far'), el('span', null, 'closer'), el('span', null, 'on the nose'));
    const rules = el('p', 'ds-rules');
    rules.innerHTML = 'Guess the star word. Type any word: <b class="ds-c-red">red</b> means you\'re farther from the word, '
      + '<b class="ds-c-yellow">yellow</b> means you\'re closer, <b class="ds-c-green">green</b> means you\'re on the nose. '
      + 'Keep guessing words until you\'ve finally found the star word.';
    card.append(
      el('p', 'ds-subheading', 'All star words are true facts on niche ways to save money!'),
      rules,
      scale,
      el('p', 'ds-goal', 'Unlimited guesses. Your goal: find it in as FEW guesses as possible.'),
      button("Let's go →", 'primary ds-card-next', () => showCard(boardCard(progress, puzzle))),
    );
    return card;
  }

  // the hot/cold board: counter, guess box, your latest guess, and every guess sorted hottest first
  function boardCard(progress, puzzle) {
    const card = el('section', 'ds-card-board');
    const count = el('p', 'ds-counter');
    const form = el('form', 'ds-guess-form');
    const input = el('input');
    Object.assign(input, { id: 'dailyStarGuess', name: 'guess', type: 'text', maxLength: MAX_GUESS_LENGTH, required: true, autocomplete: 'off', placeholder: 'type a word…' });
    input.setAttribute('aria-label', 'Your guess');
    input.setAttribute('aria-describedby', 'dailyStarFeedback');
    input.autocapitalize = 'none';
    input.spellcheck = false;
    const submit = el('button', 'primary', 'Guess');
    submit.type = 'submit';
    form.append(input, submit);
    const feedback = el('p', 'daily-riddle-feedback');
    feedback.id = 'dailyStarFeedback';
    feedback.setAttribute('aria-live', 'polite');
    const latest = el('div', 'ds-latest');
    const listLabel = el('p', 'ds-list-label', 'all guesses, hottest first');
    const list = el('ol', 'ds-guess-list');
    list.setAttribute('aria-label', 'Your guesses, closest first');
    const giveUp = button('Reveal the word', 'link-btn ds-give-up', () => {
      if (!confirm("Reveal today's word? It still counts as played.")) return;
      progress.gaveUp = true; progress.completed = true; window.saveGame();
      recordCompletedRound(progress, puzzle);
      showCard(resultCard(progress, puzzle));
    });

    const row = (g, fresh = false) => {
      const li = el('li', `ds-guess${fresh ? ' fresh' : ''}`);
      li.style.setProperty('--heat', heat(g.s));
      li.style.setProperty('--fill', `${Math.max(4, g.s)}%`);
      li.append(el('span', 'ds-guess-word', g.w), el('span', 'ds-guess-score', `${g.s}%`));
      li.setAttribute('aria-label', `${g.w}: ${g.s}%, ${heatWord(g.s)}`);
      return li;
    };
    const paint = (fresh = null) => {
      const n = progress.guesses.length;
      count.replaceChildren(el('b', null, String(n)), document.createTextNode(` ${n === 1 ? 'guess' : 'guesses'}`));
      latest.replaceChildren();
      if (fresh) latest.append(el('p', 'ds-latest-label', 'your last guess'), row(fresh, true), el('p', 'ds-heat-word', heatWord(fresh.s)));
      listLabel.hidden = !n;
      list.replaceChildren(...[...progress.guesses].sort((a, b) => b.s - a.s).map(g => row(g)));
      giveUp.hidden = n < GIVE_UP_AFTER;
    };
    paint();

    let busy = false;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      const guess = input.value.trim().replace(/\s+/g, ' ').slice(0, MAX_GUESS_LENGTH);
      if (!guess) { feedback.textContent = 'Type a word first.'; return input.focus(); }
      const same = progress.guesses.find(g => normalize(g.w) === normalize(guess));
      if (same) { feedback.textContent = `You already tried "${same.w}" (${same.s}%).`; input.select(); return; }
      busy = true; submit.disabled = true; feedback.textContent = 'Checking…';
      let s;
      try { s = await closeness(guess, puzzle); }
      catch (error) {
        console.warn('[daily-star] Could not score the guess with Gemini; counting it as cold.', error);
        s = coldScore(guess, puzzle);
      }
      busy = false; submit.disabled = false; feedback.textContent = '';
      const g = { w: guess, s };
      progress.guesses.push(g);
      if (s === 100) { progress.won = true; progress.completed = true; }
      window.saveGame();
      if (progress.completed) {
        recordCompletedRound(progress, puzzle);
        return showCard(resultCard(progress, puzzle));
      }
      input.value = '';
      paint(g);
      input.focus({ preventScroll: true });
    });

    card.append(el('p', 'ds-card-chip', 'Find the star word'), count, el('p', 'ds-goal-mini', 'unlimited guesses · fewest wins'), form, feedback, latest, listLabel, list, giveUp);
    return card;
  }

  // ---------- Rewards: coins for your island, a Daily Star streak, and a Wishing Star every 7 days ----------
  const STREAK_GOAL = 7;            // every 7 days in a row → a Wishing Star in your bag
  const REWARD_ITEM = 'wishing-star';
  const FOUND_COINS = [[3, 30], [7, 20], [15, 15], [Infinity, 10]]; // found in ≤3 / ≤7 / ≤15 / more guesses
  const REVEALED_COINS = 5;         // revealed without finding it: still worth showing up
  const parseDay = day => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtDay = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const dayBefore = day => { const d = parseDay(day); d.setDate(d.getDate() - 1); return fmtDay(d); };

  // once per finished puzzle: coins + streak bonus, and the Wishing Star on every 7th day in a row
  function grantRewards(progress) {
    if (!progress.completed || progress.reward) return progress.reward;
    const state = window.getState();
    const prev = state.starStreak || { count: 0, lastDay: null, best: 0 };
    const count = prev.lastDay === progress.date ? prev.count
      : prev.lastDay === dayBefore(progress.date) ? prev.count + 1 : 1;
    state.starStreak = { count, lastDay: progress.date, best: Math.max(prev.best || 0, count) };
    const coins = progress.won ? FOUND_COINS.find(([max]) => progress.guesses.length <= max)[1] : REVEALED_COINS;
    const bonus = Math.min(20, (count - 1) * 5);
    const item = count % STREAK_GOAL === 0 ? REWARD_ITEM : null;
    state.coins = (state.coins || 0) + coins + bonus;
    if (item) { state.inventory ||= {}; state.inventory[item] = (state.inventory[item] || 0) + 1; }
    progress.reward = { coins, bonus, streak: count, item };
    window.saveGame();
    window.refreshIsland?.();
    return progress.reward;
  }

  // "Share my result" copies one short line, e.g. "i got daily star in 5!"
  function shareText(progress) {
    return progress.won ? `i got daily star in ${progress.guesses.length}!` : 'i played daily star today!';
  }
  async function shareResult(progress) {
    const text = shareText(progress);
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; }
    catch {
      // older browsers / no clipboard permission: copy through a hidden text box
      const box = Object.assign(document.createElement('textarea'), { value: text, readOnly: true });
      box.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.append(box); box.select();
      try { copied = document.execCommand('copy'); } catch {}
      box.remove();
    }
    if (copied) window.toast?.(`Copied text: ${text}`, 2600);
    else window.prompt('Copy your result:', text);
  }

  // the number ticks up from 0, so the coins feel earned
  function countUp(node, to, prefix = '+') {
    if (reduceMotion() || to <= 0) { node.textContent = `${prefix}${to}`; return; }
    const start = performance.now(), dur = 700;
    const tick = now => {
      const f = Math.min(1, (now - start) / dur);
      node.textContent = `${prefix}${Math.round(to * (1 - Math.pow(1 - f, 3)))}`;
      if (f < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function rewardsBlock(progress) {
    const r = grantRewards(progress);
    const box = el('div', 'ds-rewards');
    if (!r) return box;
    const coins = el('p', 'ds-reward-coins');
    const amount = el('b', 'ds-reward-amount', '+0');
    coins.innerHTML = window.pi ? window.pi('coin') : '';
    coins.append(' ', amount, el('span', null, ' coins'));
    box.append(coins);
    setTimeout(() => countUp(amount, r.coins + r.bonus), 250);
    if (r.bonus) box.append(el('p', 'ds-reward-note', `includes +${r.bonus} streak bonus`));
    // streak: 7 pixel stars, lit up to where you are in this week's run
    const lit = ((r.streak - 1) % STREAK_GOAL) + 1;
    const stars = el('div', 'ds-streak-stars');
    stars.setAttribute('role', 'img');
    stars.setAttribute('aria-label', `${lit} of ${STREAK_GOAL} days toward a Wishing Star`);
    for (let i = 0; i < STREAK_GOAL; i++) {
      const s = el('span', `ds-streak-star${i < lit ? ' lit' : ''}`);
      s.style.setProperty('--i', i);
      s.innerHTML = window.pi ? window.pi('star') : '*';
      stars.append(s);
    }
    box.append(el('p', 'ds-streak-title', `${r.streak}-day Daily Star streak`), stars,
      el('p', 'ds-reward-note', r.item
        ? "You earned a Wishing Star! It's in your bag on the island."
        : `${STREAK_GOAL - lit} more day${STREAK_GOAL - lit === 1 ? '' : 's'} in a row for a Wishing Star.`));
    return box;
  }

  function resultCard(progress, puzzle) {
    const card = el('section', 'ds-card-result');
    const n = progress.guesses.length;
    const word = el('p', 'ds-answer-word', puzzle.word);
    word.style.setProperty('--heat', heat(100));
    card.append(
      el('p', 'ds-card-chip', progress.won ? `Found in ${n} ${n === 1 ? 'guess' : 'guesses'}!` : `Revealed after ${n} ${n === 1 ? 'guess' : 'guesses'}`),
      el('h3', 'ds-result-title', progress.won ? 'You found the star word!' : "Today's star word was"),
      word,
      el('p', 'ds-tip-label', 'Your saving tip'),
      el('p', 'ds-card-big daily-riddle-answer', puzzle.tip),
      rewardsBlock(progress),
      button('Share my result', 'primary ds-card-next ds-share', () => shareResult(progress)),
      el('p', 'ds-mode-note', 'Saved to your Logbook. A new star word arrives tomorrow!'),
    );
    return card;
  }

  function renderResult(progress, puzzle) {
    recordCompletedRound(progress, puzzle);
    showCard(resultCard(progress, puzzle));
    updateCountdown();
  }

  function showDailyStarTab() {
    setActiveTab('play');
    const day = localDay();
    const puzzle = puzzleForCurrentDay(day);
    const progress = progressFor(day, puzzle);
    renderRiddle(progress, puzzle);
  }

  // ---------- The ascended sky: the Daily Star lives up in the sky ----------
  // One pixel sky (320×180, scaled up crisp like the intro) shared by the ride up and the Daily Star's
  // background, so arriving is seamless and you stay up there while you play.
  // It follows the real time of day with the same colours as the island and intro (sky.js):
  // soft stepped bands, clouds by day, stars coming out at dusk and twinkling at night.
  const SKY_W = 320, SKY_H = 180, CALM = .02;
  const NIGHT = { sky: ['#18213d', '#222c52', '#2c3963', '#3b4775'], stars: 1, clouds: .08, cloud: '#46507a' }; // if sky.js is missing
  const STAR_COLORS = ['#fff7e6', '#fff3c4', '#cfe3ff', '#f2c26b', '#c7a6e0'];
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let skyStars = null, skyClouds = null;
  const makeStars = () => Array.from({ length: 160 }, () => ({
    x: Math.random() * SKY_W, y: Math.random() * SKY_H, z: 1 + Math.floor(Math.random() * 3),
    c: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)], tw: Math.random() * Math.PI * 2,
  }));
  // same puffy pixel cloud as the intro; k decides when each one shows (more by day, a wisp at night)
  const makeClouds = () => Array.from({ length: 8 }, (_, k) => ({
    x: Math.random() * (SKY_W + 40) - 40, y: Math.random() * SKY_H, z: 1 + (k % 3) * .6, k,
  }));
  function cloud(g, x, y, color, shade) {
    g.fillStyle = color;
    g.fillRect(x + 6, y, 16, 4); g.fillRect(x, y + 4, 30, 5); g.fillRect(x + 14, y - 3, 10, 3);
    g.fillStyle = shade; g.fillRect(x + 2, y + 8, 26, 2);
  }

  // v = how fast we're rising (everything streams down, stars stretch into streaks); at CALM it just drifts
  function paintSky(g, v, dt, now) {
    const mood = window.SKY?.current() || NIGHT;
    const calm = Math.max(0, 1 - (v - CALM) * 6); // 1 when floating, 0 while rushing upward
    // sky in soft stepped bands, top to bottom, like the intro
    mood.sky.forEach((c, k) => { g.fillStyle = c; g.fillRect(0, Math.floor(k * SKY_H / 4), SKY_W, Math.ceil(SKY_H / 4) + 1); });
    // stars: out at dusk, bright at night. While rushing up, faint speed streaks show even by day.
    const starsShow = Math.max(mood.stars, (1 - calm) * .35);
    for (const s of skyStars) {
      s.y += v * s.z * dt * .12;
      if (s.y > SKY_H + 24) { s.y = -Math.random() * 24; s.x = Math.random() * SKY_W; }
      if (starsShow < .02) continue;
      const len = 1 + Math.round(v * s.z * 6), x = Math.round(s.x), y = Math.round(s.y);
      const twinkle = 1 - calm * .35 * (1 + Math.sin(now / 450 + s.tw)) / 2;
      g.globalAlpha = (.45 + s.z * .18) * twinkle * starsShow;
      g.fillStyle = mood.stars > .3 ? s.c : '#ffffff';
      g.fillRect(x, y - len + 1, 1, len);
      if (s.z === 3 && calm > .5) { g.globalAlpha *= calm * .5; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); } // little sparkle
    }
    // clouds: drift sideways when floating, rush past (downward) when rising
    const shade = window.SKY ? SKY.mix(mood.cloud, '#4a3628', .12) : mood.cloud;
    const cover = mood.clouds * skyClouds.length;
    for (const c of skyClouds) {
      c.x += dt * .004 * c.z; c.y += v * c.z * dt * .18;
      if (c.x > SKY_W) c.x = -40;
      if (c.y > SKY_H + 12) { c.y = -14 - Math.random() * 30; c.x = Math.random() * (SKY_W + 40) - 40; }
      const a = Math.max(0, Math.min(1, cover - c.k)) * .9;
      if (a <= 0) continue;
      g.globalAlpha = a;
      cloud(g, Math.round(c.x), Math.round(c.y), mood.cloud, shade);
    }
    g.globalAlpha = 1;
  }

  // the Daily Star's background: the calm sky, gently twinkling and drifting for as long as it's open
  let skyRaf = 0;
  function startSky() {
    const g = $('dailyStarScene').getContext('2d');
    g.imageSmoothingEnabled = false;
    skyStars ||= makeStars(); skyClouds ||= makeClouds();
    cancelAnimationFrame(skyRaf);
    if (reduceMotion()) return paintSky(g, 0, 0, 0);
    let last = 0;
    const loop = now => {
      paintSky(g, CALM, last ? Math.min(50, now - last) : 16, now);
      last = now;
      skyRaf = requestAnimationFrame(loop);
    };
    skyRaf = requestAnimationFrame(loop);
  }
  const stopSky = () => { cancelAnimationFrame(skyRaf); skyRaf = 0; };

  // ---------- The ride up: until today's Daily Star is finished, entering it rises into the sky ----------
  // The island drops away below, stars (or clouds, by day) rush past, then we slow down and float:
  // that's the Daily Star's sky. Click or press a key to skip.
  let ascending = false;
  function ascendToStars() {
    return new Promise(resolve => {
      const DUR = 3000;
      const cv = document.createElement('canvas');
      cv.width = SKY_W; cv.height = SKY_H; cv.className = 'star-ascent'; cv.setAttribute('aria-hidden', 'true');
      document.body.append(cv);
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      // a still of the island scene, to fall away below us
      const island = document.createElement('canvas');
      island.width = SKY_W; island.height = SKY_H;
      if ($('introScene')) island.getContext('2d').drawImage($('introScene'), 0, 0, SKY_W, SKY_H);
      skyStars = makeStars(); skyClouds = makeClouds();
      let start = null, last = 0, done = false;

      const finish = () => {
        if (done) return;
        done = true;
        removeEventListener('keydown', finish, true);
        resolve();                                     // the Daily Star opens in the same sky underneath...
        requestAnimationFrame(() => {                  // ...then the ride's canvas fades away on top of it
          cv.classList.add('done');
          setTimeout(() => cv.remove(), 500);
        });
      };
      cv.addEventListener('click', finish);
      addEventListener('keydown', finish, true);

      const ease = f => f * f * (3 - 2 * f);
      const frame = now => {
        if (done) return;
        start ??= now;
        const t = Math.min(1, (now - start) / DUR), dt = last ? Math.min(50, now - last) : 16;
        last = now;
        // speed: build up to a rush, then slow down until we're floating (matches the Daily Star's sky)
        const v = t < .5 ? CALM + Math.pow(t / .5, 2) : 1 + (CALM - 1) * ease((t - .5) / .5);
        paintSky(g, v, dt, now);
        // the island drops away beneath us and fades
        const drop = Math.round(Math.pow(t, 1.4) * SKY_H * 1.6);
        if (drop < SKY_H) { g.globalAlpha = Math.max(0, 1 - t * 2.2); g.drawImage(island, 0, drop); g.globalAlpha = 1; }
        if (t < 1) requestAnimationFrame(frame); else finish();
      };
      requestAnimationFrame(frame);
    });
  }

  // Ride up every time they open the Daily Star until they've finished today's puzzle
  // (solved it or used every guess). Tomorrow's new puzzle brings the ride back.
  function finishedToday(state) {
    const p = state.dailyStar;
    return !!(p && p.date === localDay() && p.completed);
  }
  function startDailyStar() {
    const state = window.getState?.();
    const ride = state && !finishedToday(state) && $('dailyStarModal').classList.contains('hidden') && !reduceMotion();
    if (!ride) return openDailyStar();
    if (ascending) return;
    ascending = true;
    ascendToStars().then(() => { ascending = false; openDailyStar({ arrived: true }); });
  }

  function openDailyStar({ arrived = false } = {}) {
    setActiveTab('play');
    logbookPage = 0;
    const day = localDay();
    const puzzle = puzzleForCurrentDay(day);
    const progress = progressFor(day, puzzle);
    const modal = $('dailyStarModal');
    const shouldEnter = modal.classList.contains('hidden');
    startSky();
    if (shouldEnter) {
      document.body.classList.add('daily-star-open');
      modal.classList.remove('hidden', 'skyward-visible');
      $('starRoundMount').replaceChildren(); // start fresh: the first card pops in instead of swiping
      // straight off the ride: already up in the sky, so no slide-in
      modal.classList.toggle('arrived', arrived);
    }
    if (progress.completed) renderResult(progress, puzzle);
    else renderRiddle(progress, puzzle);
    if (shouldEnter) {
      if (arrived) modal.classList.add('skyward-visible');
      else requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('skyward-visible')));
    }
    requestAnimationFrame(() => $('dailyStarGuess')?.focus({ preventScroll: true }));
    startCountdown();
  }

  function closeDailyStar() {
    const modal = $('dailyStarModal');
    if (modal.classList.contains('hidden')) return;
    modal.classList.remove('arrived', 'skyward-visible');
    document.body.classList.remove('daily-star-open');
    clearInterval(countdownInterval);
    countdownInterval = null;
    const finishExit = () => {
      if (!modal.classList.contains('skyward-visible')) { modal.classList.add('hidden'); stopSky(); }
    };
    if (reduceMotion()) finishExit();
    else setTimeout(finishExit, 720);
    $('dailyStar').focus({ preventScroll: true });
  }

  $('starPlayTab').addEventListener('click', showDailyStarTab);
  $('starLogbookTab').addEventListener('click', () => {
    logbookPage = 0;
    renderLogbook();
  });
  $('closeDailyStar').addEventListener('click', closeDailyStar);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('dailyStarModal').classList.contains('hidden')) closeDailyStar();
  });
  window.getGameDay = localDay;
  window.startDailyStar = startDailyStar;
})();
