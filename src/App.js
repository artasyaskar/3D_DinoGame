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

    this.lastTime = 0;
    this.paused = false;
    this.gameOver = false;

    // Bind input events
    window.addEventListener('keydown', (e) => {
      this.inputSystem.onKeyDown(e);
    });
    window.addEventListener('keyup', (e) => {
      this.inputSystem.onKeyUp(e);
    });
  }

  start() {
    // Kick off the render loop
    requestAnimationFrame(this.loop.bind(this));
  }

  loop(time) {
    if (this.paused || this.gameOver) {
      return;
    }

    const delta = (time - this.lastTime) / 1000;
    this.lastTime = time;

    // Update systems
    this.inputSystem.update();
    updateDinoPhysics(delta);
    this.physicsSystem.update(delta);
    obstacleManager.update(delta);
    this.scoreSystem.update(delta);
    this.soundSystem.update(delta);

    // Render the Three.js scene
    renderer.render(scene, camera);

    requestAnimationFrame(this.loop.bind(this));
  }

  togglePause() {
    this.paused = !this.paused;
    if (!this.paused) {
      this.lastTime = performance.now();
      requestAnimationFrame(this.loop.bind(this));
    }
  }

  showGameOver() {
    this.gameOver = true;
    // Show game over UI (you can implement a DOM overlay here)
    alert('Game Over! Refresh to play again.');
  }
}

// Expose these for debugging/UI buttons
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
