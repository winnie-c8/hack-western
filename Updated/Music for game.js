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
    toggle.className = 'menu-btn music-toggle';
    toggle.setAttribute('aria-label', 'Background music');
    toggle.setAttribute('aria-pressed', 'false');
    toggle.title = 'Play background music';
    toggle.textContent = '🔇 Music';
    (document.querySelector('.hud-right') || document.body).append(toggle);
  }

  function updateToggle(playing, unavailable = false) {
    toggle.textContent = unavailable ? 'Music unavailable' : playing ? '🔊 Music' : '🔇 Music';
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