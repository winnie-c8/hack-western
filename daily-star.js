// ---------- Daily Star ----------
(() => {
  const $ = id => document.getElementById(id);
  const state = () => window.getState();
  const ROUNDS_PER_DAY = 7;

  const games = [
    { id: 'clock', name: 'Stop the clock', description: 'A hidden timer is running. Stop it when you think exactly 5 seconds have passed.' },
    { id: 'middle', name: 'Find the middle', description: 'Tap the exact midpoint between the two dots.' },
    { id: 'fill', name: 'Fill percentage', description: 'Estimate what percentage of the shape is filled.' },
    { id: 'color', name: 'Color match', description: 'Remember the color, then recreate it with the red, green, and blue sliders.' },
    { id: 'line', name: 'Line length', description: 'Memorize the line, then draw one of the same length.' },
    { id: 'recall', name: 'Flash recall', description: 'Remember the dots that flash in the grid, then tap their spots.' },
    { id: 'upright', name: 'Make it upright', description: 'Rotate the tilted shape until it looks level.' },
    { id: 'speed', name: 'Speed guess', description: 'Watch the car cross the screen and estimate its speed.' },
    { id: 'shades', name: 'Shade ranking', description: 'Arrange the five gray squares from lightest to darkest.' },
    { id: 'pitch', name: 'Pitch match', description: 'Listen to the tone, then slide to match its pitch.' },
  ];
  const gameById = Object.fromEntries(games.map(game => [game.id, game]));

  let run = null;
  let pitchContext = null;
  let countdownInterval = null;

  // The Daily Star follows the device's local date, same as daily missions in game.js
  function localDay() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function untilLocalMidnight() {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    return Math.max(0, midnight - Date.now());
  }

  function countdownText() {
    const seconds = Math.ceil(untilLocalMidnight() / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds % 60).padStart(2, '0')}s`;
  }

  function resetCountdownMessage() {
    return `The Daily Star resets in ${countdownText()} (midnight local time).`;
  }

  function updateCountdown() {
    if (ensureState().dailyStar.date !== localDay() || !ensureState().dailyStar.completed) {
      const note = $('introNote');
      if (note.dataset.dailyLocked === 'true') {
        note.dataset.dailyLocked = 'false';
        note.textContent = '⭐ The Daily Star is ready to twinkle again!';
        note.classList.remove('show');
        void note.offsetWidth;
        note.classList.add('show');
      }
      const modalCountdown = $('starCountdown');
      if (modalCountdown) modalCountdown.textContent = 'A new Daily Star is ready!';
      clearInterval(countdownInterval);
      countdownInterval = null;
      return;
    }
    const message = countdownText();
    const note = $('introNote');
    if (note.dataset.dailyLocked === 'true') {
      note.textContent = `Sorry, the daily star has twinkled already. Check back in ${message} (midnight local time).`;
    }
    const modalCountdown = $('starCountdown');
    if (modalCountdown) modalCountdown.textContent = resetCountdownMessage();
  }

  function showAlreadyPlayed() {
    const note = $('introNote');
    note.dataset.dailyLocked = 'true';
    note.classList.remove('show');
    void note.offsetWidth;
    note.classList.add('show');
    updateCountdown();
    if (!countdownInterval) countdownInterval = setInterval(updateCountdown, 1000);
  }

  function ensureState() {
    const s = state();
    if (!s.dailyStar) s.dailyStar = { date: null, games: [], completed: false, score: null, rounds: [] };
    return s;
  }

  function randomGames() {
    const ids = games.map(game => game.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids.slice(0, ROUNDS_PER_DAY);
  }

  function startDailyStar({ fromMenu = false } = {}) {
    const s = ensureState();
    if (s.dailyStar.date === localDay() && s.dailyStar.completed) {
      if (fromMenu) {
        showAlreadyPlayed();
        return;
      }
      $('dailyStarModal').classList.remove('hidden');
      renderCompletedChallenge(s.dailyStar);
      if (!countdownInterval) countdownInterval = setInterval(updateCountdown, 1000);
      return;
    }
    $('dailyStarModal').classList.remove('hidden');
    if (!run || run.day !== localDay()) {
      const savedRun = s.dailyStar.date === localDay() &&
        Array.isArray(s.dailyStar.games) && s.dailyStar.games.length === ROUNDS_PER_DAY &&
        new Set(s.dailyStar.games).size === ROUNDS_PER_DAY &&
        s.dailyStar.games.every(id => gameById[id]);
      const ids = savedRun ? s.dailyStar.games : randomGames();
      const scores = savedRun && Array.isArray(s.dailyStar.rounds) &&
        s.dailyStar.rounds.length <= ROUNDS_PER_DAY &&
        s.dailyStar.rounds.every(score => Number.isFinite(score) && score >= 0 && score <= 100)
        ? s.dailyStar.rounds.slice() : [];
      run = { day: localDay(), ids, index: scores.length, scores };
      if (!savedRun) {
        s.dailyStar = { date: run.day, games: ids, completed: false, score: null, rounds: [] };
        window.saveGame();
      }
      if (run.index === ROUNDS_PER_DAY) finishChallenge();
      else renderRound();
    }
  }

  function renderCompletedChallenge(result) {
    $('starRoundProgress').textContent = 'You have already played today. Come back tomorrow for a new set of games!';
    $('starRoundMount').innerHTML = `<div class="star-result">
      <div class="result-score">${Number(result.score).toFixed(1)}<small> / 10</small></div>
      <p>Accuracy: ${Math.round(result.score * 10)}%</p>
      <p>You completed all seven games today. Come back tomorrow for a new challenge!</p>
      <p id="starCountdown">${resetCountdownMessage()}</p>
    </div>`;
    $('starNext').classList.add('hidden');
  }

  function renderRound() {
    if (!run) return;
    const id = run.ids[run.index];
    const game = gameById[id];
    $('starRoundProgress').textContent = `Round ${run.index + 1} of ${ROUNDS_PER_DAY} · ${run.scores.length} completed`;
    $('starRoundMount').innerHTML = `<h3>${game.name}</h3><p>${game.description}</p><div id="starWork" class="star-work"></div><p id="starFeedback" class="star-feedback" aria-live="polite"></p>`;
    $('starNext').classList.add('hidden');
    renderMiniGame(id);
  }

  function scoreRound(score, detail) {
    if (!run || run.scores.length !== run.index) return;
    const value = Math.max(0, Math.min(100, score));
    run.scores.push(value);
    const s = ensureState();
    s.dailyStar.rounds = run.scores.slice();
    window.saveGame();
    $('starFeedback').textContent = `${detail} Accuracy: ${Math.round(value)}%.`;
    const next = $('starNext');
    next.textContent = run.index + 1 === ROUNDS_PER_DAY ? 'See my score' : 'Next round';
    next.classList.remove('hidden');
  }

  function addSubmitButton(work, text = 'Check my answer') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary';
    button.textContent = text;
    work.append(button);
    return button;
  }

  function renderMiniGame(id) {
    const work = $('starWork');
    if (id === 'clock') {
      work.innerHTML = '<p>Start the hidden clock, then stop it when you think five seconds have passed.</p><button id="clockButton" class="primary" type="button">Start hidden timer</button><p id="clockStatus" class="muted" aria-live="polite"></p>';
      let startedAt = null;
      let finished = false;
      $('clockButton').onclick = () => {
        const button = $('clockButton');
        if (startedAt === null) {
          startedAt = performance.now();
          button.textContent = 'Stop the clock';
          $('clockStatus').textContent = 'The clock is running — trust your sense of time.';
          setTimeout(() => {
            if (finished || run?.ids[run.index] !== 'clock') return;
            finished = true;
            button.disabled = true;
            scoreRound(0, 'The timer ran past 10 seconds.');
          }, 10000);
          return;
        }
        finished = true;
        const elapsed = performance.now() - startedAt;
        const accuracy = Math.max(0, 100 - Math.abs(elapsed - 5000) / 5000 * 100);
        button.disabled = true;
        $('clockStatus').textContent = `You stopped at ${(elapsed / 1000).toFixed(2)} seconds.`;
        scoreRound(accuracy, `You stopped at ${(elapsed / 1000).toFixed(2)} seconds; the target was 5.00.`);
      };
      return;
    }

    if (id === 'middle') {
      const left = 8 + Math.random() * 22;
      const right = 70 + Math.random() * 22;
      const midpoint = (left + right) / 2;
      work.innerHTML = `<p>Tap the track where the exact midpoint should be.</p><button id="midTrack" class="mid-track" type="button" aria-label="Tap to choose the midpoint"><span class="mid-dot" style="left:${left}%"></span><span class="mid-dot" style="left:${right}%"></span><span id="midGuess" class="mid-guess hidden"></span></button>`;
      $('midTrack').onclick = event => {
        const rect = event.currentTarget.getBoundingClientRect();
        const guess = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100));
        const marker = $('midGuess');
        marker.style.left = `${guess}%`;
        marker.classList.remove('hidden');
        if (!$('midSubmit')) {
          const button = addSubmitButton(work);
          button.id = 'midSubmit';
          button.onclick = () => {
            $('midTrack').disabled = true;
            button.disabled = true;
            const accuracy = Math.max(0, 100 - Math.abs(guess - midpoint) * 2);
            scoreRound(accuracy, `Your point was ${Math.round(Math.abs(guess - midpoint))} units from the midpoint.`);
          };
        }
      };
      return;
    }

    if (id === 'fill') {
      const actual = 15 + Math.floor(Math.random() * 71);
      work.innerHTML = `<div class="fill-shape" role="img" aria-label="A shape partly filled"><div class="fill-level" style="width:${actual}%"></div></div><label for="fillGuess">Your estimate: <output id="fillValue">50%</output></label><input id="fillGuess" type="range" min="0" max="100" value="50"><button id="fillSubmit" class="primary" type="button">Check my estimate</button>`;
      $('fillGuess').oninput = event => { $('fillValue').value = `${event.target.value}%`; };
      $('fillSubmit').onclick = () => {
        const guess = Number($('fillGuess').value);
        $('fillSubmit').disabled = true;
        scoreRound(100 - Math.abs(guess - actual) * 2, `The shape was ${actual}% filled; your estimate was ${guess}%.`);
      };
      return;
    }

    if (id === 'color') {
      const target = Array.from({ length: 3 }, () => Math.floor(Math.random() * 256));
      work.innerHTML = `<p id="colorWait">Look closely — the color disappears in two seconds.</p><div id="targetColor" class="color-swatch" role="img" aria-label="Color to remember"></div><div id="colorControls" class="color-controls hidden"><label>Red <output id="redValue">128</output><input data-channel="0" type="range" min="0" max="255" value="128"></label><label>Green <output id="greenValue">128</output><input data-channel="1" type="range" min="0" max="255" value="128"></label><label>Blue <output id="blueValue">128</output><input data-channel="2" type="range" min="0" max="255" value="128"></label><div id="colorGuess" class="color-swatch" aria-label="Your color"></div><button id="colorSubmit" class="primary" type="button">Compare colors</button></div>`;
      const swatch = $('targetColor');
      swatch.style.backgroundColor = `rgb(${target.join(',')})`;
      const guess = [128, 128, 128];
      const updateGuess = () => { $('colorGuess').style.backgroundColor = `rgb(${guess.join(',')})`; };
      updateGuess();
      $('colorControls').querySelectorAll('input').forEach(input => {
        input.oninput = event => {
          const channel = Number(event.target.dataset.channel);
          guess[channel] = Number(event.target.value);
          $(`${['red', 'green', 'blue'][channel]}Value`).value = event.target.value;
          updateGuess();
        };
      });
      setTimeout(() => {
        if (run?.ids[run.index] !== 'color' || run.scores.length > run.index) return;
        swatch.classList.add('color-hidden');
        $('colorWait').textContent = 'Recreate the color from memory.';
        $('colorControls').classList.remove('hidden');
      }, 2000);
      $('colorSubmit').onclick = () => {
        $('colorSubmit').disabled = true;
        const distance = Math.sqrt(target.reduce((sum, channel, index) => sum + (channel - guess[index]) ** 2, 0));
        const accuracy = 100 * (1 - distance / Math.sqrt(3 * 255 ** 2));
        scoreRound(accuracy, `The target was RGB ${target.join(', ')}.`);
      };
      return;
    }

    if (id === 'line') {
      work.innerHTML = '<p id="lineWait">Memorize the line length. It disappears in a moment.</p><canvas id="lineCanvas" class="draw-canvas" width="320" height="120" aria-label="Draw a line"></canvas><div class="line-actions"><button id="lineClear" class="secondary-btn" type="button" disabled>Clear</button><button id="lineSubmit" class="primary" type="button" disabled>Check my line</button></div>';
      const canvas = $('lineCanvas');
      const ctx = canvas.getContext('2d');
      const targetLength = 55 + Math.random() * 190;
      const draw = line => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff7e6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (line) {
          ctx.strokeStyle = '#4a98a6';
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(line.x1, line.y1);
          ctx.lineTo(line.x2, line.y2);
          ctx.stroke();
        }
      };
      const targetLine = { x1: 160 - targetLength / 2, y1: 60, x2: 160 + targetLength / 2, y2: 60 };
      draw(targetLine);
      let drawing = false, start = null, drawn = null, ready = false;
      const point = event => {
        const rect = canvas.getBoundingClientRect();
        return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
      };
      canvas.onpointerdown = event => {
        if (!ready) return;
        drawing = true;
        start = point(event);
        drawn = { x1: start.x, y1: start.y, x2: start.x, y2: start.y };
        canvas.setPointerCapture(event.pointerId);
      };
      canvas.onpointermove = event => {
        if (!drawing) return;
        const end = point(event);
        drawn = { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
        draw(drawn);
      };
      canvas.onpointerup = () => {
        if (!drawing) return;
        drawing = false;
        $('lineClear').disabled = false;
        $('lineSubmit').disabled = false;
      };
      $('lineClear').onclick = () => { drawn = null; draw(null); $('lineSubmit').disabled = true; };
      $('lineSubmit').onclick = () => {
        if (!drawn) return;
        const length = Math.hypot(drawn.x2 - drawn.x1, drawn.y2 - drawn.y1);
        $('lineSubmit').disabled = true;
        $('lineClear').disabled = true;
        scoreRound(Math.max(0, 100 - Math.abs(length - targetLength) / targetLength * 100),
          `Your line was ${Math.round(length)} units; the target was ${Math.round(targetLength)}.`);
      };
      setTimeout(() => {
        if (run?.ids[run.index] !== 'line' || run.scores.length > run.index) return;
        ready = true;
        draw(null);
        $('lineWait').textContent = 'Draw a line of the same length.';
      }, 1200);
      return;
    }

    if (id === 'recall') {
      const targets = new Set();
      while (targets.size < 5) targets.add(Math.floor(Math.random() * 25));
      work.innerHTML = '<p id="recallWait">Remember the five dots.</p><div id="recallGrid" class="recall-grid flash"></div><button id="recallSubmit" class="primary hidden" type="button">Check my recall</button>';
      const grid = $('recallGrid');
      const selections = new Set();
      for (let i = 0; i < 25; i++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'recall-cell';
        cell.setAttribute('aria-label', `Grid position ${i + 1}`);
        if (targets.has(i)) cell.classList.add('target');
        cell.onclick = () => {
          if (grid.classList.contains('flash')) return;
          if (selections.has(i)) { selections.delete(i); cell.classList.remove('selected'); }
          else { selections.add(i); cell.classList.add('selected'); }
        };
        grid.append(cell);
      }
      setTimeout(() => {
        if (run?.ids[run.index] !== 'recall' || run.scores.length > run.index) return;
        grid.classList.remove('flash');
        grid.querySelectorAll('.target').forEach(cell => cell.classList.remove('target'));
        $('recallWait').textContent = 'Tap the five places where you saw dots.';
        $('recallSubmit').classList.remove('hidden');
      }, 1000);
      $('recallSubmit').onclick = () => {
        const hits = [...selections].filter(index => targets.has(index)).length;
        const misses = selections.size - hits;
        const accuracy = Math.max(0, (hits - misses) / targets.size * 100);
        $('recallSubmit').disabled = true;
        grid.querySelectorAll('button').forEach(cell => { cell.disabled = true; });
        scoreRound(accuracy, `You found ${hits} of 5 dots with ${misses} extra pick${misses === 1 ? '' : 's'}.`);
      };
      return;
    }

    if (id === 'upright') {
      let angle = Math.floor(Math.random() * 61) - 30;
      if (angle === 0) angle = 18;
      work.innerHTML = `<div class="upright-stage"><div id="tiltedShape" class="tilted-shape" style="transform:rotate(${angle}deg)"></div></div><label for="uprightSlider">Rotate: <output id="uprightValue">0°</output></label><input id="uprightSlider" type="range" min="-45" max="45" value="0"><button id="uprightSubmit" class="primary" type="button">Check angle</button>`;
      $('uprightSlider').oninput = event => {
        const adjustment = Number(event.target.value);
        $('uprightValue').value = `${adjustment}°`;
        $('tiltedShape').style.transform = `rotate(${angle + adjustment}deg)`;
      };
      $('uprightSubmit').onclick = () => {
        const error = Math.abs(angle + Number($('uprightSlider').value));
        $('uprightSubmit').disabled = true;
        scoreRound(Math.max(0, 100 - error / 45 * 100), `The shape was ${Math.round(error)}° from level.`);
      };
      return;
    }

    if (id === 'speed') {
      const speed = 80 + Math.floor(Math.random() * 121);
      const distance = 220;
      const duration = distance / speed * 1000;
      work.innerHTML = `<p id="speedStatus">Start the car and watch it cross the track.</p><div class="speed-track"><span id="speedCar" aria-hidden="true">🚗</span></div><button id="speedStart" class="primary" type="button">Go!</button><div id="speedControls" class="hidden"><label for="speedGuess">Your estimate: <output id="speedValue">120</output> units/second</label><input id="speedGuess" type="range" min="20" max="250" value="120"><button id="speedSubmit" class="primary" type="button" disabled>Check my estimate</button></div>`;
      $('speedGuess').oninput = event => { $('speedValue').value = event.target.value; };
      $('speedStart').onclick = () => {
        $('speedStart').disabled = true;
        const car = $('speedCar');
        car.style.setProperty('--race-time', `${duration}ms`);
        car.classList.add('racing');
        car.addEventListener('animationend', () => {
          $('speedStatus').textContent = 'How fast was it moving?';
          $('speedControls').classList.remove('hidden');
          $('speedSubmit').disabled = false;
        }, { once: true });
      };
      $('speedSubmit').onclick = () => {
        const guess = Number($('speedGuess').value);
        $('speedSubmit').disabled = true;
        scoreRound(Math.max(0, 100 * (1 - Math.abs(guess - speed) / speed)),
          `The car moved at ${speed} units per second; your estimate was ${guess}.`);
      };
      return;
    }

    if (id === 'shades') {
      const shades = [40, 85, 130, 175, 220];
      for (let i = shades.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shades[i], shades[j]] = [shades[j], shades[i]];
      }
      const list = document.createElement('ol');
      list.id = 'shadeOrder';
      list.className = 'shade-order';
      const render = () => {
        list.replaceChildren(...shades.map((shade, index) => {
          const row = document.createElement('li');
          const swatch = document.createElement('span');
          swatch.className = 'shade-swatch';
          swatch.style.backgroundColor = `rgb(${shade},${shade},${shade})`;
          swatch.setAttribute('aria-label', `Gray shade ${shade}`);
          const label = document.createElement('span');
          label.textContent = `Position ${index + 1}`;
          const up = document.createElement('button');
          up.type = 'button'; up.className = 'secondary-btn'; up.textContent = '↑';
          up.setAttribute('aria-label', `Move shade at position ${index + 1} up`);
          up.disabled = index === 0;
          up.onclick = () => { [shades[index - 1], shades[index]] = [shades[index], shades[index - 1]]; render(); };
          const down = document.createElement('button');
          down.type = 'button'; down.className = 'secondary-btn'; down.textContent = '↓';
          down.setAttribute('aria-label', `Move shade at position ${index + 1} down`);
          down.disabled = index === shades.length - 1;
          down.onclick = () => { [shades[index + 1], shades[index]] = [shades[index], shades[index + 1]]; render(); };
          row.append(swatch, label, up, down);
          return row;
        }));
      };
      work.append(list);
      render();
      const button = addSubmitButton(work);
      button.onclick = () => {
        let errors = 0;
        for (let i = 0; i < shades.length; i++) {
          for (let j = i + 1; j < shades.length; j++) if (shades[i] < shades[j]) errors++;
        }
        button.disabled = true;
        scoreRound(100 * (1 - errors / 10), 'The squares are ranked from lightest to darkest.');
      };
      return;
    }

    if (id === 'pitch') {
      const target = Math.round(220 + Math.random() * 660);
      work.innerHTML = '<p id="pitchStatus">Play the tone, then match it by ear. You can listen again if needed.</p><button id="pitchPlay" class="secondary-btn" type="button">▶ Play tone</button><label for="pitchGuess">Your pitch: <output id="pitchValue">440</output> Hz</label><input id="pitchGuess" type="range" min="220" max="880" value="440"><button id="pitchSubmit" class="primary" type="button">Check my pitch</button>';
      $('pitchGuess').oninput = event => { $('pitchValue').value = event.target.value; };
      $('pitchPlay').onclick = async () => {
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextClass) throw new Error('This browser does not support audio playback.');
          if (!pitchContext) pitchContext = new AudioContextClass();
          if (pitchContext.state === 'suspended') await pitchContext.resume();
          const oscillator = pitchContext.createOscillator();
          const gain = pitchContext.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = target;
          gain.gain.setValueAtTime(0.0001, pitchContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.15, pitchContext.currentTime + 0.04);
          gain.gain.setTargetAtTime(0.0001, pitchContext.currentTime + 0.45, 0.08);
          oscillator.connect(gain).connect(pitchContext.destination);
          oscillator.start();
          oscillator.stop(pitchContext.currentTime + 0.8);
          $('pitchStatus').textContent = 'Listen to the tone, then adjust the slider to match.';
        } catch (error) {
          $('pitchStatus').textContent = `Audio could not play: ${error.message}`;
        }
      };
      $('pitchSubmit').onclick = () => {
        const guess = Number($('pitchGuess').value);
        const accuracy = 100 * (1 - Math.abs(Math.log(guess / target)) / Math.log(4));
        $('pitchSubmit').disabled = true;
        scoreRound(accuracy, `The note was ${target} Hz; your estimate was ${guess} Hz.`);
      };
    }
  }

  function finishChallenge() {
    const s = ensureState();
    const rawScore = run.scores.reduce((sum, value) => sum + value, 0) / ROUNDS_PER_DAY / 10;
    const score = Math.round(rawScore * 10) / 10;
    s.dailyStar = {
      date: run.day,
      games: run.ids,
      completed: true,
      score,
      rounds: run.scores.slice(),
    };
    window.saveGame();
    $('starRoundProgress').textContent = 'Challenge complete!';
    $('starRoundMount').innerHTML = `<div class="star-result">
      <div class="result-score">${score.toFixed(1)}<small> / 10</small></div>
      <p>Accuracy: ${Math.round(score * 10)}%</p>
      <p>You completed all seven games today. Come back tomorrow for a new challenge!</p>
    </div>`;
    $('starNext').classList.add('hidden');
    run = null;
  }

  $('closeDailyStar').addEventListener('click', () => $('dailyStarModal').classList.add('hidden'));
  $('starNext').addEventListener('click', () => {
    if (!run) return;
    run.index++;
    if (run.index >= ROUNDS_PER_DAY) finishChallenge();
    else renderRound();
  });

  window.getGameDay = localDay;
  window.startDailyStar = startDailyStar;
})();
