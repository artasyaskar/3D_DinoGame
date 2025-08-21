import { Game } from './core/Game.js';

// Bootstraps the game and wires basic UI events
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const resumeBtn = document.getElementById('resume-btn');
const shareBtn = document.getElementById('share-btn');
const muteBtn = document.getElementById('mute-btn');
const startScreen = document.getElementById('start-screen');
const loadingScreen = document.getElementById('loading-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const pauseScreen = document.getElementById('pause-screen');
const helpersBtn = document.getElementById('helpers-btn');
// Share menu elements (fallback UI)
const shareMenu = document.getElementById('share-menu');
const shareCloseBtn = document.getElementById('share-close-btn');
const shareLinks = {
  whatsapp: document.getElementById('share-whatsapp'),
  telegram: document.getElementById('share-telegram'),
  facebook: document.getElementById('share-facebook'),
  twitter: document.getElementById('share-twitter'),
  linkedin: document.getElementById('share-linkedin'),
  reddit: document.getElementById('share-reddit')
};
const copyLinkBtn = document.getElementById('share-copy');

const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const highScoreEls = Array.from(document.querySelectorAll('#high-score, #final-high-score'));
const diffFill = document.getElementById('diff-fill');
const flashEl = document.getElementById('flash');

let game;
// Tap/double-tap detection and jump strengths
let _lastKeyTap = 0;
let _lastPointerTap = 0;
let _lastTouchTap = 0;
const BOOST_WINDOW = 260;      // ms window for double taps
const JUMP_SINGLE = 1.35;      // strong jump
const JUMP_DOUBLE = 1.75;      // strongest jump

function hide(el){ el.classList.add('hidden'); }
function show(el){ el.classList.remove('hidden'); }

// Animated overlays: add/remove .visible with transition, manage .hidden after
function showOverlay(el){
  if (!el) return;
  el.classList.remove('hidden');
  // next frame to allow transition
  requestAnimationFrame(()=> el.classList.add('visible'));
}
function hideOverlay(el){
  if (!el) return;
  el.classList.remove('visible');
  const onEnd = (e)=>{
    if (e && e.target !== el) return;
    el.classList.add('hidden');
    el.removeEventListener('transitionend', onEnd);
  };
  el.addEventListener('transitionend', onEnd);
}

function flash(alpha = 0.25, ms = 150) {
  if (!flashEl) return;
  flashEl.style.setProperty('--flash-alpha', String(alpha));
  flashEl.classList.add('show');
  setTimeout(()=> flashEl.classList.remove('show'), ms);
}

async function init() {
  game = new Game({
    container: document.getElementById('game-container'),
    onScore: (score) => {
      scoreEl.textContent = Math.floor(score).toString();
      // Update difficulty bar (0..1)
      if (diffFill && game?.getDifficulty) {
        const d = Math.max(0, Math.min(1, game.getDifficulty()));
        diffFill.style.width = Math.round(d * 100) + '%';
      }
    },
    onGameOver: (score) => {
      finalScoreEl.textContent = Math.floor(score).toString();
      showOverlay(gameoverScreen);
      flash(0.35, 220);
    },
    onPause: () => { showOverlay(pauseScreen); },
    onResume: () => { hideOverlay(pauseScreen); },
    onHighScore: (hs) => { highScoreEls.forEach(el => el && (el.textContent = String(hs))); },
    onCoin: (points) => {
      // Create a floating "+points" near the score HUD
      const root = document.getElementById('game-container');
      const pop = document.createElement('div');
      pop.className = 'pop';
      pop.textContent = `+${points}`;
      root.appendChild(pop);
      const r = scoreEl.getBoundingClientRect();
      const pr = root.getBoundingClientRect();
      pop.style.left = Math.round(r.left - pr.left + r.width + 8) + 'px';
      pop.style.top  = Math.round(r.top - pr.top - 4) + 'px';
      requestAnimationFrame(()=> pop.classList.add('show'));
      setTimeout(()=> { pop.classList.remove('show'); pop.addEventListener('transitionend', ()=> pop.remove(), { once:true }); }, 400);
      // Small screen flash for feedback
      flash(0.15, 120);
    }
  });

  await game.init();
  // Ensure initial size is correct
  game.onResize();

  window.addEventListener('resize', () => game.onResize());
  // Also observe container size changes (mobile browser UI collapsing/expanding)
  const containerEl = document.getElementById('game-container');
  if (window.ResizeObserver && containerEl) {
    const ro = new ResizeObserver(() => game.onResize());
    ro.observe(containerEl);
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      if (e.repeat) return; // ignore auto-repeat
      const now = performance.now();
      const boosted = (now - _lastKeyTap) <= BOOST_WINDOW;
      _lastKeyTap = now;
      game?.jump(boosted ? JUMP_DOUBLE : JUMP_SINGLE);
      game?.setJumpHeld(true);
    } else if (e.code === 'KeyP') {
      if (game?.isPaused) game.resume(); else game.pause();
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      game?.player.setDuck(true);
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      game?.player.setDuck(false);
    } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      game?.setJumpHeld(false);
    }
  });

  // Simple mobile/desktop pointer: tap/click anywhere in container to jump
  const container = document.getElementById('game-container');
  const onPointerDown = (e) => {
    if (e && e.pointerType === 'touch') return; // touch has its own handlers
    if (!game || !game.isRunning || game.isPaused) return;
    const now = performance.now();
    const boosted = (now - _lastPointerTap) <= BOOST_WINDOW;
    _lastPointerTap = now;
    game.jump(boosted ? JUMP_DOUBLE : JUMP_SINGLE);
    game.setJumpHeld(true);
  };
  const onPointerUp = (e) => { if (e && e.pointerType === 'touch') return; game?.setJumpHeld(false); };
  container.addEventListener('pointerdown', onPointerDown, { passive: true });
  container.addEventListener('pointerup', onPointerUp, { passive: true });
  container.addEventListener('pointercancel', onPointerUp, { passive: true });

  // Swipe gestures: swipe down to duck (hold while swiping), swipe up to jump
  let _swipeStart = null;
  const SWIPE_MIN = 24; // px threshold for swipe detection
  const TAP_MOVE_MAX = 16; // px movement to still consider a tap
  const TAP_TIME_MAX = 280; // ms
  container.addEventListener('touchstart', (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    _swipeStart = { x: t.clientX, y: t.clientY, time: performance.now() };
  }, { passive: true });
  container.addEventListener('touchmove', (e) => {
    if (!game || !game.isRunning) return;
    if (!_swipeStart || !e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dy = t.clientY - _swipeStart.y;
    // If swiping down beyond threshold, engage duck
    if (dy > SWIPE_MIN) {
      game.player?.setDuck(true);
    }
  }, { passive: true });
  const endSwipe = (e) => {
    if (!game || !game.isRunning) { _swipeStart = null; return; }
    const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    if (_swipeStart && t) {
      const dx = t.clientX - _swipeStart.x;
      const dy = t.clientY - _swipeStart.y;
      const dist2 = dx*dx + dy*dy;
      const dt = performance.now() - _swipeStart.time;
      const isTap = dist2 <= (TAP_MOVE_MAX*TAP_MOVE_MAX) && dt <= TAP_TIME_MAX;
      if (isTap) {
        // Single tap -> strong jump; double tap within window -> strongest
        const now = performance.now();
        const boosted = (now - _lastTouchTap) <= BOOST_WINDOW;
        _lastTouchTap = now;
        game.jump(boosted ? JUMP_DOUBLE : JUMP_SINGLE);
      } else if (dy < -SWIPE_MIN) {
        // Swipe up -> strong jump
        const now = performance.now();
        const boosted = (now - _lastTouchTap) <= BOOST_WINDOW;
        _lastTouchTap = now;
        game.jump(boosted ? JUMP_DOUBLE : JUMP_SINGLE);
      }
    }
    // Always release duck on touch end
    game.player?.setDuck(false);
    _swipeStart = null;
  };
  container.addEventListener('touchend', endSwipe, { passive: true });
  container.addEventListener('touchcancel', endSwipe, { passive: true });

  // Handle orientation changes explicitly
  window.addEventListener('orientationchange', () => setTimeout(() => game.onResize(), 50));

  // HUD Helpers toggle
  helpersBtn?.addEventListener('click', () => game?.toggleHelpers());
}

startBtn.addEventListener('click', async () => {
  hideOverlay(startScreen);
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const minDim = Math.min(window.innerWidth || 0, window.innerHeight || 0);
  const isNarrow = minDim > 0 ? minDim <= 820 : false;
  const showLoader = !!loadingScreen && (isTouch || isNarrow);
  if (showLoader) showOverlay(loadingScreen);
  try {
    if (!game) await init();
  } finally {
    if (showLoader) hideOverlay(loadingScreen);
  }
  await game.start();
});

restartBtn.addEventListener('click', async () => {
  hideOverlay(gameoverScreen);
  await game.restart();
});

shareBtn.addEventListener('click', async () => {
  const score = finalScoreEl.textContent;
  const shareUrl = 'https://3-d-dino-game.vercel.app/';
  const text = `I scored ${score} in 3D Dino Game! Can you beat my score?`;
  const title = '3D Dino Game';

  // Prefer native share sheet when available
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url: shareUrl });
      return;
    } catch (err) {
      // If user cancels, just return silently; otherwise, fall through to fallback UI
      if (err && err.name === 'AbortError') return;
    }
  }

  // Fallback: populate platform links and show our mini share menu
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(shareUrl);

  if (shareLinks.whatsapp) shareLinks.whatsapp.href = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
  if (shareLinks.telegram) shareLinks.telegram.href = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
  if (shareLinks.facebook) shareLinks.facebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  if (shareLinks.twitter) shareLinks.twitter.href = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  if (shareLinks.linkedin) shareLinks.linkedin.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  if (shareLinks.reddit) shareLinks.reddit.href = `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`;

  if (copyLinkBtn) {
    copyLinkBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copyLinkBtn.textContent = 'Copied!';
        setTimeout(() => (copyLinkBtn.textContent = 'Copy Link'), 1200);
      } catch {
        alert('Copy failed. You can manually copy: ' + shareUrl);
      }
    };
  }

  if (shareMenu) {
    shareMenu.classList.remove('hidden');
    // Close on outside click
    const onOutside = (e) => {
      if (!shareMenu.contains(e.target)) {
        shareMenu.classList.add('hidden');
        document.removeEventListener('mousedown', onOutside);
        document.removeEventListener('touchstart', onOutside);
      }
    };
    setTimeout(() => {
      document.addEventListener('mousedown', onOutside, { passive: true });
      document.addEventListener('touchstart', onOutside, { passive: true });
    }, 0);
  }
});

resumeBtn.addEventListener('click', () => {
  game.resume();
});

muteBtn.addEventListener('click', async () => {
  // Ensure game exists so we don't call on undefined
  if (!game) {
    await init();
  }
  const muted = game?.toggleMute?.();
  if (typeof muted === 'boolean') {
    muteBtn.textContent = muted ? 'Unmute' : 'Mute';
  }
});

// Close button for share menu
shareCloseBtn?.addEventListener('click', () => {
  shareMenu?.classList.add('hidden');
});
