// First-visit walkthrough for the nested Future Me Island app.
(() => {
  const intro = document.getElementById('intro');
  const panel = document.getElementById('tutorialPanel');
  const openButton = document.getElementById('openTutorial');
  const replayButton = document.getElementById('tutorialAgain');
  const closeButton = document.getElementById('tutorialClose');
  const skipButton = document.getElementById('tutorialSkip');
  const backButton = document.getElementById('tutorialBack');
  const nextButton = document.getElementById('tutorialNext');
  const progress = document.getElementById('tutorialProgress');
  const icon = document.getElementById('tutorialIcon');
  const title = document.getElementById('tutorialTitle');
  const description = document.getElementById('tutorialDescription');
  const prompt = document.getElementById('tutorialPrompt');
  const tip = document.getElementById('tutorialTip');
  const enterButton = document.getElementById('enterWorld');
  const canvas = document.getElementById('game');
  const mapMarker = document.getElementById('tutorialMapMarker');
  const backgroundElements = [
    intro,
    document.getElementById('sea'),
    document.getElementById('stage'),
    ...document.querySelectorAll('.modal'),
    document.getElementById('toast'),
  ].filter(Boolean);
  const requiredElements = [
    intro, panel, openButton, replayButton, closeButton, skipButton, backButton,
    nextButton, progress, icon, title, description, prompt, tip, enterButton,
    canvas, mapMarker,
  ];

  if (requiredElements.some(element => !element)) {
    console.error('[tutorial] Required tutorial elements are missing.');
    return;
  }

  const steps = [
    {
      icon: '🧭',
      title: 'Find Maple',
      description: 'Walk beside the glowing fox.',
      tip: 'Move with the arrow keys or WASD.',
      target: 'maple',
      area: 'map',
      action: 'reach-maple',
    },
    {
      icon: '🦊',
      title: 'Talk to Maple',
      description: 'Stand next to her and press Space to ask a money question.',
      tip: 'Keep account details private.',
      target: 'maple',
      area: 'map',
      action: 'chat',
    },
    {
      icon: '🏦',
      title: 'Open Bank',
      description: 'See where to log savings.',
      tip: 'Coins reward steady habits.',
      target: '[data-open="bank"]',
      panel: 'bank',
      area: 'menu',
      action: 'open-panel',
    },
    {
      icon: '🎯',
      title: 'Open Goals',
      description: 'See your savings goal tracker.',
      tip: '',
      target: '[data-open="goals"]',
      panel: 'goals',
      area: 'menu',
      action: 'open-panel',
    },
    {
      icon: '🔥',
      title: 'Open Daily',
      description: 'Check your missions and streak.',
      tip: '',
      target: '[data-open="daily"]',
      panel: 'daily',
      area: 'menu',
      action: 'open-panel',
    },
    {
      icon: '🛍️',
      title: 'Find the Shop',
      description: 'Walk beside the glowing shop door.',
      tip: 'Move with the arrow keys or WASD.',
      target: 'shop',
      area: 'map',
      action: 'reach-shop',
    },
    {
      icon: '🛍️',
      title: 'Enter the Shop',
      description: 'Stand beside its door and press Space.',
      tip: 'Click a Bag item, then an open tile to place it. Shift-click to pick it up.',
      target: 'shop',
      panel: 'shop',
      area: 'map',
      action: 'open-shop',
    },
  ];
  const seenKey = 'futureMeIsland.hack-western-13.tutorialSeen';
  const completed = steps.map(() => false);
  let stepIndex = 0;
  let returnFocus = null;
  let tutorialOpen = false;
  let previewOpen = false;
  let launchGuidedAfterIntro = false;
  let allowEnterClick = false;
  let nearMaple = false;
  let nearShop = false;
  let mapleLocation = { x: 13, y: 5, tile: 40 };
  let shopLocation = { x: 9.5, y: 3.5, tile: 40 };

  function hasSeenTutorial() {
    try {
      return localStorage.getItem(seenKey) === 'true';
    } catch (error) {
      console.warn('[tutorial] Could not read tutorial status.', error);
      return false;
    }
  }

  function rememberTutorial() {
    try {
      localStorage.setItem(seenKey, 'true');
    } catch (error) {
      console.warn('[tutorial] Could not save tutorial status.', error);
    }
  }

  function setPreviewAppearance(preview) {
    panel.classList.toggle('preview', preview);
    document.body.classList.toggle('tutorial-preview', preview);
    if (preview) {
      document.body.classList.remove('tutorial-guided');
      delete document.body.dataset.tutorialArea;
      delete document.body.dataset.tutorialStep;
      delete document.body.dataset.tutorialComplete;
    }
    backgroundElements.forEach(element => {
      element.toggleAttribute('inert', preview);
      element.toggleAttribute('aria-hidden', preview);
    });
    if (preview) {
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
    } else {
      panel.setAttribute('role', 'region');
      panel.removeAttribute('aria-modal');
    }
  }

  function getCurrentTarget() {
    if (!tutorialOpen || previewOpen || completed[stepIndex]) return null;
    return steps[stepIndex].target;
  }

  function getPrompt(step) {
    if (step.action === 'reach-maple') {
      if (completed[stepIndex]) return 'You found Maple. Continue to the next step.';
      return nearMaple ? 'Maple found! Press Next.' : 'Walk to the glowing fox.';
    }
    if (step.action === 'chat') {
      if (completed[stepIndex]) return 'You talked to Maple. Press Next.';
      return nearMaple ? 'Press Space to talk to Maple.' : 'Walk back beside Maple first.';
    }
    if (step.action === 'reach-shop') {
      if (completed[stepIndex]) return 'You found the Shop. Press Next.';
      return nearShop ? 'Shop found! Press Next.' : 'Walk to the glowing shop door.';
    }
    if (step.action === 'open-shop') {
      if (completed[stepIndex]) return 'You entered the Shop. Press Next.';
      return nearShop ? 'Press Space to enter the Shop.' : 'Walk back beside the shop door first.';
    }
    if (completed[stepIndex]) return 'Done! Press Next.';
    return `Click the highlighted ${step.panel === 'daily' ? 'Daily' : step.panel === 'goals' ? 'Goals' : 'Bank'} button.`;
  }

  function positionMapMarker(target) {
    const location = target === 'maple' ? mapleLocation : shopLocation;
    const rect = canvas.getBoundingClientRect();
    mapMarker.style.left = `${rect.left + (location.x + 0.5) * location.tile * rect.width / canvas.width}px`;
    mapMarker.style.top = `${rect.top + (location.y + 0.5) * location.tile * rect.height / canvas.height}px`;
    mapMarker.dataset.label = target === 'maple'
      ? nearMaple ? 'PRESS SPACE' : 'MAPLE · GO HERE'
      : nearShop ? 'PRESS SPACE' : 'SHOP · GO HERE';
    mapMarker.classList.remove('hidden');
  }

  function syncHighlight() {
    document.querySelectorAll('.tutorial-target').forEach(element => element.classList.remove('tutorial-target'));
    mapMarker.classList.add('hidden');
    if (!tutorialOpen || previewOpen) return;

    const target = getCurrentTarget();
    if (target === 'maple' || target === 'shop') {
      positionMapMarker(target);
      return;
    }
    if (target) document.querySelector(target)?.classList.add('tutorial-target');
  }

  function syncGuidedArea() {
    if (!tutorialOpen || previewOpen) return;
    document.body.dataset.tutorialArea = steps[stepIndex].area;
    document.body.dataset.tutorialStep = String(stepIndex);
    document.body.dataset.tutorialComplete = String(completed[stepIndex]);
  }

  function renderStep() {
    if (previewOpen) {
      progress.textContent = 'Your first visit';
      icon.textContent = '🏝️';
      title.textContent = 'Learn by doing';
      description.textContent = 'Follow one short instruction at a time.';
      prompt.textContent = 'Walk to Maple, try the island tools, then visit the Shop.';
      tip.textContent = '';
      backButton.disabled = true;
      nextButton.disabled = false;
      nextButton.textContent = 'Start tutorial →';
      syncHighlight();
      return;
    }

    const step = steps[stepIndex];
    progress.textContent = `Step ${stepIndex + 1} of ${steps.length}${completed[stepIndex] ? ' · Complete' : ''}`;
    icon.textContent = step.icon;
    title.textContent = step.title;
    description.textContent = step.description;
    prompt.textContent = getPrompt(step);
    tip.textContent = step.tip;
    backButton.disabled = stepIndex === 0;
    nextButton.disabled = !completed[stepIndex];
    nextButton.textContent = stepIndex === steps.length - 1 ? 'Finish guide' : 'Next →';
    syncGuidedArea();
    syncHighlight();
  }

  function startPreview(trigger = null) {
    returnFocus = trigger;
    stepIndex = 0;
    completed.fill(false);
    nearMaple = false;
    nearShop = false;
    tutorialOpen = true;
    previewOpen = true;
    panel.classList.remove('hidden', 'tutorial-chat-paused');
    document.body.classList.add('tutorial-open');
    setPreviewAppearance(true);
    renderStep();
    nextButton.focus({ preventScroll: true });
  }

  function startGuidedTutorial() {
    stepIndex = 0;
    completed.fill(false);
    nearMaple = false;
    nearShop = false;
    tutorialOpen = true;
    previewOpen = false;
    panel.classList.remove('hidden', 'tutorial-chat-paused');
    document.body.classList.add('tutorial-open');
    setPreviewAppearance(false);
    document.body.classList.add('tutorial-guided');
    document.activeElement?.blur?.();
    renderStep();
    window.dispatchEvent(new Event('fmi:tutorial-start'));
  }

  function dismissPreview() {
    tutorialOpen = false;
    previewOpen = false;
    panel.classList.add('hidden');
    document.body.classList.remove('tutorial-open', 'tutorial-guided');
    setPreviewAppearance(false);
    syncHighlight();
    const target = returnFocus?.isConnected ? returnFocus : openButton;
    target.focus({ preventScroll: true });
  }

  function closeTutorial() {
    if (!tutorialOpen) return;
    if (previewOpen) {
      dismissPreview();
      return;
    }
    tutorialOpen = false;
    panel.classList.add('hidden', 'tutorial-chat-paused');
    document.body.classList.remove('tutorial-open', 'tutorial-guided');
    delete document.body.dataset.tutorialArea;
    delete document.body.dataset.tutorialStep;
    delete document.body.dataset.tutorialComplete;
    syncHighlight();
    rememberTutorial();

    const target = returnFocus?.isConnected ? returnFocus : replayButton;
    target.focus({ preventScroll: true });
  }

  function launchGuidedTour() {
    launchGuidedAfterIntro = intro.isConnected;
    if (!intro.isConnected) {
      startGuidedTutorial();
      return;
    }
    allowEnterClick = true;
    enterButton.click();
  }

  function skipPreview() {
    if (!previewOpen) {
      closeTutorial();
      return;
    }
    rememberTutorial();
    tutorialOpen = false;
    previewOpen = false;
    panel.classList.add('hidden');
    document.body.classList.remove('tutorial-open', 'tutorial-guided');
    delete document.body.dataset.tutorialArea;
    delete document.body.dataset.tutorialStep;
    delete document.body.dataset.tutorialComplete;
    setPreviewAppearance(false);
    syncHighlight();
    if (intro.isConnected) {
      allowEnterClick = true;
      enterButton.click();
    } else {
      const target = returnFocus?.isConnected ? returnFocus : replayButton;
      target.focus({ preventScroll: true });
    }
  }

  function markStepComplete(index) {
    if (completed[index]) return;
    completed[index] = true;
    renderStep();
  }

  function nextStep() {
    if (previewOpen) {
      launchGuidedTour();
      return;
    }
    if (!completed[stepIndex]) return;
    if (stepIndex === steps.length - 1) {
      closeTutorial();
      return;
    }
    stepIndex += 1;
    renderStep();
    if (panel.contains(document.activeElement)) document.activeElement.blur();
  }

  window.addEventListener('fmi:player-position', event => {
    const position = event.detail;
    mapleLocation = position.maple;
    shopLocation = position.shop;
    nearMaple = position.nearMaple;
    nearShop = position.nearShop;
    if (!tutorialOpen || previewOpen) return;
    if ((stepIndex === 0 && nearMaple) || (stepIndex === 5 && nearShop)) markStepComplete(stepIndex);
    else if ([0, 1, 5, 6].includes(stepIndex)) renderStep();
  });

  window.addEventListener('fmi:maple-chat-opened', () => {
    if (!tutorialOpen || previewOpen) return;
    if (stepIndex === 1 && nearMaple) markStepComplete(1);
    panel.classList.add('tutorial-chat-paused');
  });

  window.addEventListener('fmi:panel-opened', event => {
    if (!tutorialOpen || previewOpen) return;
    if (steps[stepIndex].panel === event.detail.name) markStepComplete(stepIndex);
    panel.classList.add('tutorial-chat-paused');
  });

  window.addEventListener('fmi:panels-closed', () => {
    if (!tutorialOpen || previewOpen) return;
    panel.classList.remove('tutorial-chat-paused');
    renderStep();
  });

  openButton.addEventListener('click', event => startPreview(event.currentTarget));
  replayButton.addEventListener('click', event => {
    returnFocus = event.currentTarget;
    startGuidedTutorial();
  });
  closeButton.addEventListener('click', () => {
    if (previewOpen) dismissPreview();
    else closeTutorial();
  });
  skipButton.addEventListener('click', skipPreview);
  backButton.addEventListener('click', () => {
    if (stepIndex > 0) {
      stepIndex -= 1;
      renderStep();
      if (panel.contains(document.activeElement)) document.activeElement.blur();
    }
  });
  nextButton.addEventListener('click', nextStep);
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeTutorial();
      return;
    }
    if (event.key === ' ' && event.target instanceof HTMLButtonElement) event.stopPropagation();
  });
  window.addEventListener('resize', () => {
    const target = getCurrentTarget();
    if (target === 'maple' || target === 'shop') positionMapMarker(target);
  });

  const introObserver = new MutationObserver(() => {
    if (launchGuidedAfterIntro && !intro.isConnected) {
      launchGuidedAfterIntro = false;
      startGuidedTutorial();
    }
  });
  introObserver.observe(document.body, { childList: true });
  enterButton.addEventListener('click', event => {
    if (allowEnterClick) {
      allowEnterClick = false;
      return;
    }
    if (!hasSeenTutorial()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!tutorialOpen) startPreview();
    }
  }, true);

  if (!hasSeenTutorial()) {
    if (intro.isConnected) startPreview();
    else startGuidedTutorial();
  }
})();
