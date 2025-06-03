import { scene, camera, renderer } from './utils/Constants';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { SoundSystem } from './systems/SoundSystem';
import { getDino, updateDinoPhysics, jump } from './scenes/entities/Dinosaur';
import { obstacleManager } from './scenes/entities/ObstacleManager';

export default class App {
  constructor() {
    document.body.appendChild(renderer.domElement);

    this.inputSystem = new InputSystem();
    this.physicsSystem = new PhysicsSystem();
    this.scoreSystem = new ScoreSystem();
    this.soundSystem = new SoundSystem();

    this.isRunning = false;
    this.lastTime = 0;
    this.difficulty = 1;
    this.isPaused = false;

    // Setup input handlers
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        jump();
      } else if (e.code === 'Escape' && this.isRunning) {
        this.togglePause();
      }
    });

    // Setup restart button
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restart());
    }
  }

  start() {
    console.log('Game starting...');
    this.isRunning = true;
    this.gameActive = true;
    this.lastTime = performance.now();
    
    // Start the animation loop with the correct context
    requestAnimationFrame((time) => this.animate(time));
    
    // Start background music if available
    if (this.soundSystem) {
      this.soundSystem.playBackground();
    }
    
    console.log('Game started successfully');
  }

  animate(time) {
    // Use arrow function to maintain 'this' context
    requestAnimationFrame((t) => this.animate(t));
    
    // Skip animation if paused
    if (this.isPaused) return;
    
    // Calculate delta time (time since last frame in seconds)
    const deltaTime = (time - this.lastTime) / 1000;
    this.lastTime = time;
    
    // Update game state
    if (this.gameActive) {
      // Update physics
      this.physicsSystem.update(deltaTime);
      
      // Update dinosaur
      if (getDino()) {
        updateDinoPhysics(deltaTime);
      }
      
      // Update obstacles
      obstacleManager.update(deltaTime);
      
      // Update score
      this.scoreSystem.updateScore(1 * deltaTime * this.difficulty);
      
      // Gradually increase difficulty
      this.difficulty += deltaTime * 0.01;
    }
    
    // Render the scene
    renderer.render(scene, camera);
  }

  // Restart the game
  restart() {
    console.log('Restarting game...');
    
    // Reset game state
    this.isRunning = true;
    this.gameActive = true;
    this.difficulty = 1;
    this.isPaused = false;
    
    // Reset obstacles
    obstacleManager.reset();
    
    // Reset score
    this.scoreSystem.resetScore();
    
    // Hide game over screen
    const gameOverElem = document.getElementById('game-over');
    if (gameOverElem) {
      gameOverElem.style.display = 'none';
    }
    
    // Play background music
    if (this.soundSystem) {
      this.soundSystem.playBackground();
    }
    
    console.log('Game restarted');
  }
  
  // Toggle pause state
  togglePause() {
    this.isPaused = !this.isPaused;
    console.log(this.isPaused ? 'Game paused' : 'Game resumed');
    
    // Pause/resume music
    if (this.soundSystem) {
      if (this.isPaused) {
        this.soundSystem.pauseBackground();
      } else {
        this.soundSystem.playBackground();
      }
    }
  }
  
  // Show game over screen
  showGameOver() {
    console.log('Game over');
    this.gameActive = false;
    
    // Play hit sound
    if (this.soundSystem) {
      this.soundSystem.playHit();
    }
    
    // Stop background music
    if (this.soundSystem) {
      this.soundSystem.pauseBackground();
    }
    
    // Show game over screen
    const gameOverElem = document.getElementById('game-over');
    if (gameOverElem) {
      gameOverElem.style.display = 'flex';
    }
  }
}

// Export functions for global access
window.restartGame = () => {
  if (window.gameApp) {
    window.gameApp.restart();
  }
};

window.showGameOver = () => {
  if (window.gameApp) {
    window.gameApp.showGameOver();
  }
};

window.togglePause = () => {
  if (window.gameApp) {
    window.gameApp.togglePause();
  }
};
