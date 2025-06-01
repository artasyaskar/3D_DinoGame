import { scene, renderer, camera } from './utils/Constants';
import { animate } from './systems/PhysicsSystem';
import { updateScore } from './systems/ScoreSystem';
import { initInput, setGameOver } from './systems/InputSystem';
import { playBackgroundMusic } from './systems/SoundSystem';
import { getDino } from './entities/Dinosaur';

let lastTime = 0;
let gameActive = true;

export default class App {
  constructor() {
    this.container = document.body;
    
    // Check if canvas already exists
    if (!document.querySelector('canvas')) {
      this.container.appendChild(renderer.domElement);
    }
    
    initInput();
    this.animate = this.animate.bind(this);
    playBackgroundMusic();
    
    // Add stats for debugging
    this.stats = new Stats();
    this.stats.showPanel(0);
    document.body.appendChild(this.stats.dom);
  }

  start() {
    requestAnimationFrame(this.animate);
  }

  animate(time) {
    this.stats.begin();
    
    requestAnimationFrame(this.animate);
    
    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;
    
    if (gameActive) {
      animate(deltaTime);
      updateScore(1 * deltaTime);
      
      // Simple camera follow
      if (getDino()) {
        camera.position.x = getDino().position.x;
        camera.position.z = getDino().position.z + 8;
      }
    }
    
    renderer.render(scene, camera);
    this.stats.end();
  }
}
