import { Game } from './core/Game.js';

// Bootstraps the game and wires basic UI events
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const resumeBtn = document.getElementById('resume-btn');
const muteBtn = document.getElementById('mute-btn');
const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const pauseScreen = document.getElementById('pause-screen');
const helpersBtn = document.getElementById('helpers-btn');

const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const highScoreEls = Array.from(document.querySelectorAll('#high-score, #final-high-score'));
const diffFill = document.getElementById('diff-fill');
const flashEl = document.getElementById('flash');

let game;
// Double-tap detection state
let _lastKeyTap = 0;
let _lastPointerTap = 0;
const BOOST_WINDOW = 280; // ms (slightly longer for reliability)
const BOOST_MULT = 1.35;  // boosted jump height

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
      game?.jump(boosted ? BOOST_MULT : 1);
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
    game.jump(boosted ? BOOST_MULT : 1);
    game.setJumpHeld(true);
  };
  const onPointerUp = (e) => { if (e && e.pointerType === 'touch') return; game?.setJumpHeld(false); };
  container.addEventListener('pointerdown', onPointerDown, { passive: true });
  container.addEventListener('pointerup', onPointerUp, { passive: true });
  container.addEventListener('pointercancel', onPointerUp, { passive: true });

  // Swipe gestures: swipe down to duck (hold while swiping), swipe up to jump
  let _swipeStart = null;
  const SWIPE_MIN = 24; // px threshold
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
    if (_swipeStart) {
      // Evaluate final direction for quick swipe up
      const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
      if (t) {
        const dy = t.clientY - _swipeStart.y;
        if (dy < -SWIPE_MIN) {
          // Swipe up -> jump (supports boosted logic via double tap already)
          const now = performance.now();
          const boosted = (now - _lastPointerTap) <= BOOST_WINDOW;
          _lastPointerTap = now;
          game.jump(boosted ? BOOST_MULT : 1);
        }
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
  if (!game) await init();
  await game.start();
});

restartBtn.addEventListener('click', async () => {
  hideOverlay(gameoverScreen);
  await game.restart();
});

resumeBtn.addEventListener('click', () => {
  game.resume();
});

muteBtn.addEventListener('click', () => {
  const muted = game.toggleMute();
  muteBtn.textContent = muted ? 'Unmute' : 'Mute';
});
