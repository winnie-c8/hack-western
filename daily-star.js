// ---------- Daily Star: Niche Saver ----------
(() => {
  const $ = id => document.getElementById(id);
  const DAILY_STAR_VERSION = 6;
  const MAX_GUESSES = 3;
  const MAX_GUESS_LENGTH = 120;
  const API = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? 'http://localhost:3001' : 'https://hack-western.onrender.com';
  const PUZZLES = [
    {
      id: 'library-museum-pass',
      answer: 'Borrow a free museum pass through your public library.',
      accepted: ['museum pass', 'library pass', 'museum ticket', 'free museum admission'],
      hints: [
        'The savings come from a membership you may already have.',
        'Look beyond books at services offered by your public library.',
        'Some libraries lend passes to local cultural attractions.',
      ],
    },
    {
      id: 'tool-library',
      answer: 'Borrow an occasional-use tool from a tool library or neighborhood lending group.',
      accepted: ['tool library', 'borrow a tool', 'borrow tools', 'library of things', 'tool lending', 'tool share'],
      hints: [
        'You need something briefly, not something to own forever.',
        'Think of a community lending service.',
        'It shares its name with a place full of books, but lends hardware.',
      ],
    },
    {
      id: 'off-peak-laundry',
      answer: 'Run laundry during off-peak hours on a time-of-use electricity plan.',
      accepted: ['off peak', 'off-peak', 'time of use', 'laundry overnight', 'run laundry at night', 'offpeak electricity'],
      hints: [
        'The tip depends on when you use energy, not how much detergent you use.',
        'Check whether your utility charges different rates by time of day.',
        'Try scheduling energy-heavy laundry outside peak hours.',
      ],
    },
    {
      id: 'buy-nothing',
      answer: 'Request a needed item from a Buy Nothing group or trade clothes in a swap with friends.',
      accepted: ['buy nothing', 'freecycle', 'community gifting', 'neighborhood gifting', 'gifting group', 'clothing swap', 'clothes swap', 'clothing exchange', 'swap clothes'],
      hints: [
        'One route is finding a secondhand item without paying.',
        'Look to neighbors or friends sharing things they no longer need.',
        'Try a local Buy Nothing group or organize a clothing swap.',
      ],
    },
    {
      id: 'generic-prescription',
      answer: 'Ask your pharmacist whether a generic version of a prescription is available.',
      accepted: ['generic medication', 'generic medicine', 'generic prescription', 'generic drug', 'generic version'],
      hints: [
        'This is a question to ask a professional, not a change to make on your own.',
        'The item is a prescription, and the alternative has the same active ingredient.',
        'Ask your pharmacist about the non-brand-name option.',
      ],
    },
    {
      id: 'split-bulk',
      answer: 'Split a bulk grocery purchase with a neighbor to get the discount without excess.',
      accepted: ['split bulk', 'bulk purchase with a neighbor', 'bulk buy with a neighbor', 'share a bulk pack', 'split groceries'],
      hints: [
        'The lower unit price can be helpful, but the package may be too large.',
        'Team up with someone nearby and divide the purchase.',
        'Share a bulk-sized grocery item with a neighbor.',
      ],
    },
    {
      id: 'shop-freezer',
      answer: 'Plan a meal from your freezer before grocery shopping to avoid buying duplicates.',
      accepted: ['shop your freezer', 'freezer inventory', 'use the freezer first', 'plan from your freezer', 'freezer before grocery'],
      hints: [
        'Before shopping, take stock of what you already have at home.',
        'Look in the coldest part of your kitchen for forgotten ingredients.',
        'Build a meal around what is already in your freezer.',
      ],
    },
    {
      id: 'repair-cafe',
      answer: 'Take a small broken item to a community repair cafe instead of replacing it.',
      accepted: ['repair cafe', 'fix it clinic', 'community repair', 'repair workshop', 'repair clinic'],
      hints: [
        'The goal is to extend the life of something you already own.',
        'Look for a volunteer event where people help fix everyday items.',
        'It is a cafe in name, but people bring things to be repaired.',
      ],
    },
    {
      id: 'rotate-streaming',
      answer: 'Keep one streaming service at a time, cancel it, and resubscribe when a show you want arrives.',
      accepted: ['rotate streaming subscriptions', 'one streaming service at a time', 'cancel and resubscribe', 'subscription rotation'],
      hints: [
        'Rethink a recurring entertainment bill.',
        'Instead of paying for several services all year, keep only one active.',
        'Rotate streaming subscriptions by canceling and resubscribing when a show arrives.',
      ],
    },
    {
      id: 'student-discounts',
      answer: 'Use eligible student or young-adult discounts on music, software, transit, or phone plans.',
      accepted: ['student discount', 'student discounts', 'young adult discount', 'student transit discount', 'student pricing'],
      hints: [
        'Check whether your age or enrollment status qualifies you for a lower rate.',
        'The deal can apply to recurring services and transportation.',
        'Look for student or young-adult pricing on the services you already use.',
      ],
    },
    {
      id: 'prepaid-phone',
      answer: 'Switch to a prepaid or budget phone plan from a smaller carrier.',
      accepted: ['prepaid phone', 'prepaid plan', 'budget phone plan', 'smaller phone carrier', 'cheap phone carrier'],
      hints: [
        'Review a monthly bill for a service you already use.',
        'A smaller provider may offer the same network coverage for less.',
        'Compare prepaid or budget phone plans before renewing.',
      ],
    },
    {
      id: 'rescue-food',
      answer: 'Use a food-rescue app like Too Good To Go for discounted surprise bags from local shops.',
      accepted: ['too good to go', 'food rescue app', 'rescue food', 'discounted surprise bag', 'leftover bakery food'],
      hints: [
        'The discount helps a local business avoid throwing something away.',
        'The offer is usually a surprise bag of food near closing time.',
        'Try a food-rescue app such as Too Good To Go.',
      ],
    },
    {
      id: 'fakeaway',
      answer: 'Recreate a favorite takeout order at home as a cheaper fakeaway meal.',
      accepted: ['fakeaway', 'recreate takeout', 'takeout at home', 'homemade takeout', 'copycat takeout'],
      hints: [
        'Keep the meal you enjoy but change where it comes from.',
        'Try making a favorite restaurant order in your own kitchen.',
        'Make a homemade fakeaway instead of ordering takeout.',
      ],
    },
    {
      id: '72-hour-rule',
      answer: 'Wait 72 hours before buying a nonessential item to let impulse purchases fade.',
      accepted: ['72 hour rule', 'three day rule', 'wait 72 hours', 'wait three days', 'wait before buying'],
      hints: [
        'Add a pause between wanting something and paying for it.',
        'Put the item in a cart or wishlist, then leave it there for a while.',
        'Wait three days before buying; it is often called the 72-hour rule.',
      ],
    },
    {
      id: 'checkout-friction',
      answer: 'Delete saved payment cards and turn off one-click checkout in shopping apps.',
      accepted: ['delete saved cards', 'remove saved cards', 'disable one click checkout', 'turn off one click checkout', 'remove saved payment'],
      hints: [
        'Make impulse purchases take a few more steps.',
        'Change a setting in shopping apps rather than relying on willpower.',
        'Remove stored cards and disable one-click checkout.',
      ],
    },
    {
      id: 'secondhand-first',
      answer: 'Check secondhand listings or thrift stores before buying an item new.',
      accepted: ['buy secondhand', 'second hand first', 'thrift first', 'used before new', 'buy used first'],
      hints: [
        'A lower-cost version may already exist.',
        'Search resale listings or a local shop before choosing a new item.',
        'Make buying secondhand your first stop.',
      ],
    },
    {
      id: 'price-history',
      answer: 'Check a product price-history tool to see whether a sale is actually a good deal.',
      accepted: ['track prices', 'price history', 'price tracker', 'check price history', 'price history tool'],
      hints: [
        'A discount label does not always mean the price is low.',
        "Look at how the item's cost changed over time.",
        'Use a price-history tracker before trusting a sale.',
      ],
    },
    {
      id: 'mute-sales',
      answer: 'Unsubscribe from sales emails and unfollow haul content that tempts you to shop.',
      accepted: ['mute sales emails', 'unsubscribe from sales emails', 'unfollow haul accounts', 'mute haul content', 'unfollow shopping influencers'],
      hints: [
        'Reduce the reminders that make you want to buy things.',
        'Clean up inbox subscriptions and social feeds.',
        'Mute promotional emails and unfollow haul content.',
      ],
    },
    {
      id: 'library-apps',
      answer: 'Use Libby or Hoopla with a library card for free ebooks, audiobooks, comics, and movies.',
      accepted: ['libby', 'hoopla', 'library app', 'digital library', 'free audiobook app', 'borrow ebooks'],
      hints: [
        'A card you already have may unlock more than physical books.',
        "Check your library's digital catalog on your phone.",
        'Try a library app such as Libby or Hoopla.',
      ],
    },
    {
      id: 'free-admission',
      answer: 'Look for museum free days, student nights, or matinee tickets before paying full price.',
      accepted: ['free museum day', 'free museum days', 'student night', 'museum student night', 'matinee tickets', 'matinee show', 'free admission day'],
      hints: [
        'The same activity can cost less at a different time.',
        'Check event calendars for discounted hours or daytime showings.',
        'Try a museum free day, student night, or matinee.',
      ],
    },
    {
      id: 'pay-yourself-first',
      answer: 'Schedule an automatic savings transfer for payday so you save before spending.',
      accepted: ['pay yourself first', 'automatic savings transfer', 'auto transfer on payday', 'transfer on payday', 'payday savings transfer'],
      hints: [
        'Make saving happen before the rest of your budget gets spent.',
        'Set up a recurring bank transfer tied to your pay schedule.',
        'Pay yourself first with an automatic payday transfer.',
      ],
    },
    {
      id: 'roundup-savings',
      answer: 'Use purchase round-ups to move spare change into savings.',
      accepted: ['round ups', 'round-up savings', 'round up purchases', 'purchase roundups', 'spare change savings'],
      hints: [
        'Small amounts from everyday purchases can add up.',
        'A bank or app can calculate the difference automatically.',
        'Round purchases up and save the spare change.',
      ],
    },
    {
      id: 'fun-money-account',
      answer: 'Keep a separate fun-money account for guilt-free discretionary spending.',
      accepted: ['fun money account', 'separate fun account', 'separate spending account', 'guilt free spending account'],
      hints: [
        'Give optional spending a clear boundary in your budget.',
        'Keep this money apart from bills and long-term savings.',
        'Use a separate fun-money account for guilt-free spending.',
      ],
    },
    {
      id: 'negotiate-bill',
      answer: 'Call your phone or internet provider to ask for a fee waiver or a lower rate.',
      accepted: ['ask for fee waiver', 'fee waiver', 'lower phone bill', 'lower internet bill', 'negotiate phone bill', 'negotiate internet bill', 'ask provider for better rate'],
      hints: [
        'A short conversation can sometimes lower a recurring bill.',
        'Contact the company that provides your phone or internet service.',
        'Ask about a fee waiver or better rate, and mention if you are considering canceling.',
      ],
    },
    {
      id: 'employer-match',
      answer: 'Check whether your employer matches contributions to a workplace retirement plan.',
      accepted: ['employer match', 'retirement match', '401k match', 'workplace match', 'matching contribution', 'employer matching'],
      hints: [
        'Look for a benefit connected to your job.',
        'Some employers add money when you contribute to a long-term savings plan.',
        'Check whether your workplace offers a retirement contribution match.',
      ],
    },
  ];
  let countdownInterval = null;
  let scoringProgress = null;

  function localDay() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function syncSceneBackdrop() {
    const source = $('introScene');
    const backdrop = $('dailyStarScene');
    if (!source || !backdrop) throw new Error('The Daily Star background canvas is missing.');
    const context = backdrop.getContext('2d');
    if (!context) throw new Error('Could not draw the Daily Star background.');
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, backdrop.width, backdrop.height);
    context.drawImage(source, 0, 0, backdrop.width, backdrop.height);
  }

  function puzzleForDay(day) {
    const [year, month, date] = day.split('-').map(Number);
    const ordinal = Math.floor(Date.UTC(year, month - 1, date) / 86400000);
    return PUZZLES[ordinal % PUZZLES.length];
  }

  function puzzleForCurrentDay(day) {
    const savedProgress = ensureState().dailyStar;
    if (savedProgress.date === day) {
      const savedPuzzle = PUZZLES.find(puzzle => puzzle.id === savedProgress.puzzleId);
      if (savedPuzzle) return savedPuzzle;
    }
    return puzzleForDay(day);
  }

  function emptyProgress(day = null, puzzleId = null) {
    return {
      version: DAILY_STAR_VERSION,
      date: day,
      puzzleId,
      guesses: [],
      personalizedHints: [],
      similarityScore: null,
      completed: false,
      won: false,
    };
  }

  function ensureState() {
    const gameState = window.getState();
    if (!gameState.dailyStar || gameState.dailyStar.version !== DAILY_STAR_VERSION) {
      gameState.dailyStar = emptyProgress();
    }
    return gameState;
  }

  function normalize(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function isCorrectGuess(guess, puzzle) {
    const normalized = ` ${normalize(guess)} `;
    return puzzle.accepted.some(answer => normalized.includes(` ${normalize(answer)} `));
  }

  function validProgress(progress, day, puzzle) {
    if (!progress || progress.version !== DAILY_STAR_VERSION || progress.date !== day ||
      progress.puzzleId !== puzzle.id || !Array.isArray(progress.guesses) ||
      progress.guesses.length > MAX_GUESSES || progress.guesses.some(guess =>
        typeof guess !== 'string' || !guess.trim() || guess.length > MAX_GUESS_LENGTH) ||
      !Array.isArray(progress.personalizedHints) || progress.personalizedHints.length > MAX_GUESSES - 1 ||
      progress.personalizedHints.some(hint => hint !== null &&
        (typeof hint !== 'string' || !hint.trim() || hint.length > 200)) ||
      !(progress.similarityScore === null ||
        (Number.isInteger(progress.similarityScore) && progress.similarityScore >= 0 && progress.similarityScore <= 100)) ||
      typeof progress.completed !== 'boolean' || typeof progress.won !== 'boolean') return false;

    const normalizedGuesses = progress.guesses.map(normalize);
    if (new Set(normalizedGuesses).size !== normalizedGuesses.length) return false;
    const correctIndex = progress.guesses.findIndex(guess => isCorrectGuess(guess, puzzle));
    const won = correctIndex >= 0;
    const completed = won || progress.guesses.length === MAX_GUESSES;
    return progress.won === won && progress.completed === completed &&
      (!won || correctIndex === progress.guesses.length - 1);
  }

  function progressFor(day, puzzle) {
    const gameState = ensureState();
    if (!validProgress(gameState.dailyStar, day, puzzle)) {
      if (gameState.dailyStar.date === day && gameState.dailyStar.version === DAILY_STAR_VERSION) {
        console.warn('[daily-star] Saved riddle progress was invalid; starting a fresh riddle.');
      }
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
    countdown.textContent = `A new mystery arrives in ${hours}h ${String(minutes).padStart(2, '0')}m.`;
  }

  function startCountdown() {
    if (!countdownInterval) countdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown();
  }

  function makeCountdown() {
    const countdown = document.createElement('p');
    countdown.id = 'starCountdown';
    countdown.className = 'daily-riddle-countdown';
    return countdown;
  }

  function makeHints(puzzle, revealedCount, personalizedHints) {
    const section = document.createElement('section');
    section.className = 'daily-riddle-section';
    const heading = document.createElement('h3');
    heading.textContent = 'Hints';
    section.append(heading);

    if (!revealedCount) {
      const note = document.createElement('p');
      note.className = 'daily-riddle-note';
      note.textContent = 'A new hint appears after each incorrect guess.';
      section.append(note);
      return section;
    }

    const list = document.createElement('ol');
    list.className = 'daily-riddle-hints';
    puzzle.hints.slice(0, revealedCount).forEach((fallbackHint, index) => {
      const item = document.createElement('li');
      const personalizedHint = index > 0 ? personalizedHints[index - 1] : null;
      item.textContent = personalizedHint
        ? `Based on your guess: ${personalizedHint}`
        : `Hint ${index + 1}: ${fallbackHint}`;
      list.append(item);
    });
    section.append(list);
    return section;
  }

  function makeGuessHistory(progress, puzzle) {
    if (!progress.guesses.length) return null;
    const section = document.createElement('section');
    section.className = 'daily-riddle-section';
    const heading = document.createElement('h3');
    heading.textContent = 'Your guesses';
    const list = document.createElement('ol');
    list.className = 'daily-riddle-guesses';
    progress.guesses.forEach(guess => {
      const item = document.createElement('li');
      const answer = document.createElement('span');
      answer.textContent = guess;
      const status = document.createElement('small');
      status.textContent = isCorrectGuess(guess, puzzle) ? 'Found it!' : 'Not quite';
      item.append(answer, status);
      list.append(item);
    });
    section.append(heading, list);
    return section;
  }

  function renderRiddle(progress, puzzle, feedbackText = '') {
    $('starRoundProgress').textContent = progress.guesses.length
      ? `${MAX_GUESSES - progress.guesses.length} ${MAX_GUESSES - progress.guesses.length === 1 ? 'guess' : 'guesses'} left`
      : 'You have 3 guesses. Start with a hint, then unlock another after each miss.';
    const mount = $('starRoundMount');
    mount.replaceChildren();

    const prompt = document.createElement('p');
    prompt.className = 'daily-riddle-prompt';
    prompt.textContent = "A niche way to save money is hiding in today's mystery. Can you guess the tip?";

    const setup = document.createElement('p');
    setup.className = 'daily-riddle-setup';
    setup.textContent = "Enter a short answer. Get it in 3 guesses or fewer to solve today's Daily Star.";

    const revealedCount = progress.guesses.length + 1;
    mount.append(prompt, setup, makeHints(puzzle, revealedCount, progress.personalizedHints));
    const history = makeGuessHistory(progress, puzzle);
    if (history) mount.append(history);

    const form = document.createElement('form');
    form.className = 'daily-riddle-form';
    const label = document.createElement('label');
    label.htmlFor = 'dailyStarGuess';
    label.textContent = 'Your guess';
    const input = document.createElement('input');
    input.id = 'dailyStarGuess';
    input.name = 'guess';
    input.type = 'text';
    input.maxLength = MAX_GUESS_LENGTH;
    input.required = true;
    input.autocomplete = 'off';
    input.placeholder = 'What is the niche saving trick?';
    input.setAttribute('aria-describedby', 'dailyStarFeedback');
    const feedback = document.createElement('p');
    feedback.id = 'dailyStarFeedback';
    feedback.className = 'daily-riddle-feedback';
    feedback.setAttribute('aria-live', 'polite');
    feedback.textContent = feedbackText || (progress.guesses.length ? `Hint ${progress.guesses.length} unlocked. Take another guess.` : '');
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'primary daily-riddle-submit';
    submit.textContent = 'Lock in guess';
    form.append(label, input, feedback, submit);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const guess = input.value.trim().replace(/\s+/g, ' ');
      if (!guess) {
        feedback.textContent = 'Type a guess first.';
        input.focus();
        return;
      }
      if (progress.guesses.some(previous => normalize(previous) === normalize(guess))) {
        feedback.textContent = 'You already tried that guess. Try a different one.';
        input.focus();
        return;
      }

      progress.guesses.push(guess);
      progress.won = isCorrectGuess(guess, puzzle);
      progress.completed = progress.won || progress.guesses.length === MAX_GUESSES;
      window.saveGame();
      if (progress.completed) {
        renderResult(progress, puzzle);
        return;
      }
      submit.disabled = true;
      input.disabled = true;
      submit.textContent = 'Thinking of a hint...';
      try {
        const hint = await requestPersonalizedHint(guess, puzzle, progress.guesses.length + 1);
        progress.personalizedHints.push(hint);
        window.saveGame();
        renderRiddle(progress, puzzle, `Not quite. Here's a hint based on your guess.`);
      } catch (error) {
        console.error('[daily-star] Could not generate a personalized hint.', error);
        progress.personalizedHints.push(null);
        window.saveGame();
        renderRiddle(progress, puzzle,
          `Not quite. Gemini couldn't make a personalized hint, so here's a standard hint instead.`);
      }
    });
    mount.append(form, makeCountdown());
  }

  function renderResult(progress, puzzle) {
    $('starRoundProgress').textContent = progress.won
      ? `Solved in ${progress.guesses.length} of 3 guesses!`
      : "That was the last guess. Here is today's saving tip.";
    const mount = $('starRoundMount');
    mount.replaceChildren();

    const result = document.createElement('section');
    result.className = 'daily-riddle-result';
    const title = document.createElement('h3');
    title.textContent = progress.won ? 'You found it!' : "Today's niche saver";
    const answer = document.createElement('p');
    answer.className = 'daily-riddle-answer';
    answer.textContent = puzzle.answer;
    const message = document.createElement('p');
    message.textContent = progress.won
      ? `Nice work - you solved the mystery in ${progress.guesses.length} ${progress.guesses.length === 1 ? 'guess' : 'guesses'}.`
      : 'Come back tomorrow for a new money-saving mystery.';
    result.append(title, answer, message);
    const similarity = document.createElement('p');
    similarity.id = 'dailyStarSimilarity';
    similarity.className = 'daily-riddle-feedback';
    similarity.setAttribute('aria-live', 'polite');
    result.append(similarity);
    mount.append(result);

    updateSimilarity(progress, puzzle, similarity);

    const revealedCount = progress.won ? progress.guesses.length : puzzle.hints.length;
    if (revealedCount) mount.append(makeHints(puzzle, revealedCount, progress.personalizedHints));
    const history = makeGuessHistory(progress, puzzle);
    if (history) mount.append(history);
    mount.append(makeCountdown());
    updateCountdown();
  }

  async function postDailyStar(path, body) {
    const response = await fetch(`${API}/api/daily-star/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
    return result;
  }

  async function requestPersonalizedHint(guess, puzzle, guessNumber) {
    const { hint } = await postDailyStar('hint', {
      guess,
      expectedAnswer: puzzle.answer,
      baselineHint: puzzle.hints[guessNumber - 1],
      guessNumber,
    });
    if (typeof hint !== 'string' || !hint.trim()) throw new Error('Gemini returned an empty hint.');
    return hint.trim().slice(0, 200);
  }

  function updateSimilarity(progress, puzzle, element) {
    $('dailyStarSimilarityRetry')?.remove();
    if (progress.similarityScore !== null) {
      element.textContent = `Gemini similarity score: ${progress.similarityScore}%`;
      return;
    }

    element.textContent = 'Comparing your guesses with the answer using Gemini...';
    if (scoringProgress === progress) return;
    scoringProgress = progress;
    postDailyStar('score', { guesses: progress.guesses, expectedAnswer: puzzle.answer })
      .then(({ score }) => {
        if (!Number.isInteger(score) || score < 0 || score > 100) {
          throw new Error('Gemini returned an invalid similarity score.');
        }
        progress.similarityScore = score;
        window.saveGame();
        const current = $('dailyStarSimilarity');
        if (current) current.textContent = `Gemini similarity score: ${score}%`;
      })
      .catch(error => {
        console.error('[daily-star] Could not calculate the similarity score.', error);
        const current = $('dailyStarSimilarity');
        if (!current) return;
        current.textContent = 'Gemini could not calculate your score right now.';
        const retry = document.createElement('button');
        retry.id = 'dailyStarSimilarityRetry';
        retry.type = 'button';
        retry.className = 'primary daily-riddle-submit';
        retry.textContent = 'Try score again';
        retry.addEventListener('click', () => updateSimilarity(progress, puzzle, current));
        current.after(retry);
      })
      .finally(() => { scoringProgress = null; });
  }

  function startDailyStar() {
    const day = localDay();
    const puzzle = puzzleForCurrentDay(day);
    const progress = progressFor(day, puzzle);
    const modal = $('dailyStarModal');
    const shouldEnter = modal.classList.contains('hidden');
    syncSceneBackdrop();
    if (shouldEnter) {
      document.body.classList.add('daily-star-open');
      modal.classList.remove('hidden', 'skyward-visible');
    }
    if (progress.completed) renderResult(progress, puzzle);
    else renderRiddle(progress, puzzle);
    if (shouldEnter) {
      requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('skyward-visible')));
    }
    requestAnimationFrame(() => $('dailyStarGuess')?.focus({ preventScroll: true }));
    startCountdown();
  }

  function closeDailyStar() {
    const modal = $('dailyStarModal');
    if (modal.classList.contains('hidden')) return;
    modal.classList.remove('skyward-visible');
    document.body.classList.remove('daily-star-open');
    clearInterval(countdownInterval);
    countdownInterval = null;
    const finishExit = () => {
      if (!modal.classList.contains('skyward-visible')) modal.classList.add('hidden');
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) finishExit();
    else setTimeout(finishExit, 720);
    $('dailyStar').focus({ preventScroll: true });
  }

  $('closeDailyStar').addEventListener('click', closeDailyStar);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('dailyStarModal').classList.contains('hidden')) closeDailyStar();
  });
  window.getGameDay = localDay;
  window.startDailyStar = startDailyStar;
})();
