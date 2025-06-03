import { jump } from '../scenes/entities/Dinosaur';

export class InputSystem {
  constructor() {
    this.keys = {};

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Space or ArrowUp → jump
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        jump();
      }

      // P → pause
      if (e.code === 'KeyP') {
        window.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  update() {
    // Could be extended (e.g., left/right movement)
  }
}
