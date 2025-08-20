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
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      game?.jump();
    } else if (e.code === 'KeyP') {
      if (game?.isPaused) game.resume(); else game.pause();
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      game?.player.setDuck(true);
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      game?.player.setDuck(false);
    }
  });

  // Simple mobile/desktop pointer: tap/click anywhere in container to jump
  const container = document.getElementById('game-container');
  const onTap = () => {
    if (!game || !game.isRunning || game.isPaused) return;
    game.jump();
  };
  container.addEventListener('pointerdown', onTap, { passive: true });
  container.addEventListener('touchend', onTap, { passive: true });

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
