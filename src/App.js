import { scene, renderer, camera } from './utils/Constants';
import { animate } from './systems/PhysicsSystem';
import { updateScore } from './systems/ScoreSystem';
import { initInput, setGameOver } from './systems/InputSystem';
import { playBackgroundMusic } from './systems/SoundSystem';

let lastTime = 0;
let gameActive = true;

export default class App {
  constructor() {
    this.container = document.body;
    this.container.appendChild(renderer.domElement);
    initInput();
    this.animate = this.animate.bind(this);
    playBackgroundMusic();
  }

  start() {
    requestAnimationFrame(this.animate);
  }

  animate(time) {
    requestAnimationFrame(this.animate);
    
    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;
    
    if (gameActive) {
      animate(deltaTime);
      updateScore(1 * deltaTime);
    }
    
    renderer.render(scene, camera);
  }
}
