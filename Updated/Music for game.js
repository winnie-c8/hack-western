// The MP3 is stored alongside this script in Updated/audio/.
(() => {
  const musicSrc = new URL('Updated/audio/island-theme.mp3', document.baseURI).href;
  const audio = document.getElementById('backgroundMusic') || new Audio(musicSrc);
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = 0.25;

  if (!audio.isConnected) document.body.append(audio);

  let toggle = document.getElementById('musicToggle');
  if (!(toggle instanceof HTMLButtonElement)) {
    toggle = document.createElement('button');
    toggle.id = 'musicToggle';
    toggle.type = 'button';
    toggle.className = 'help-dot music-dot';
    toggle.setAttribute('aria-label', 'Background music');
    toggle.setAttribute('aria-pressed', 'false');
    toggle.title = 'Play background music';
    (document.querySelector('.dot-stack') || document.querySelector('.hud-right') || document.body).append(toggle);
  }

  // pixel music note: teal notes when playing, grey notes with a red slash when off
  function updateToggle(playing, unavailable = false) {
    toggle.innerHTML = window.pi ? window.pi(playing && !unavailable ? 'music' : 'musicOff') : (playing ? 'on' : 'off');
    toggle.classList.toggle('on', playing && !unavailable);
    toggle.classList.toggle('unavailable', unavailable);
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.title = unavailable
      ? 'Background music could not be played'
      : playing ? 'Mute background music' : 'Play background music';
  }

  async function playMusic() {
    try {
      await audio.play();
      updateToggle(true);
    } catch (error) {
      updateToggle(false, true);
      console.warn('[music] Could not start background music.', error);
    }
  }

  toggle.addEventListener('click', () => {
    if (audio.paused) {
      void playMusic();
    } else {
      audio.pause();
      updateToggle(false);
    }
  });
  audio.addEventListener('error', () => updateToggle(false, true));

  document.getElementById('enterWorld')?.addEventListener('click', () => {
    void playMusic();
  }, { once: true });
})();