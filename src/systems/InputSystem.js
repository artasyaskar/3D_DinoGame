import { jump } from '../scenes/entities/Dinosaur';

export class InputSystem {
  constructor() {
    this.gameOver = false;
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Bind the handlers to this instance
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onTap = this.onTap.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    
    // Initialize event listeners
    this.initInput();
    console.log('Input system initialized');
  }
  
  setGameOver(status) {
    this.gameOver = status;
    console.log('Input system game over status:', status);
  }
  
  isGameOver() {
    return this.gameOver;
  }
  
  initInput() {
    // Remove any existing handlers first (in case of restart)
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('click', this.onTap);
    window.removeEventListener('touchstart', this.onTouchStart);
    
    // Add new handlers
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('click', this.onTap);
    window.addEventListener('touchstart', this.onTouchStart);
    
    console.log('Input event listeners registered');
  }
  
  onKeyDown(e) {
    try {
      // Handle jump
      if ((e.code === 'Space' || e.code === 'ArrowUp') && !this.isGameOver()) {
        e.preventDefault(); // Prevent page scroll
        jump();
        console.log('Jump triggered by keyboard');
      } 
      // Handle restart
      else if (e.code === 'KeyR' && this.isGameOver()) {
        if (window.restartGame) {
          window.restartGame();
          console.log('Game restart triggered by keyboard');
        }
      }
      // Handle pause (Escape key)
      else if (e.code === 'Escape') {
        if (window.gameApp && window.gameApp.togglePause) {
          window.gameApp.togglePause();
          console.log('Game pause toggled by keyboard');
        }
      }
    } catch (error) {
      console.error('Error in keyboard input handler:', error);
    }
  }
  
  onTap(e) {
    try {
      if (!this.isGameOver()) {
        jump();
        console.log('Jump triggered by mouse click');
      } else {
        // Restart the game on tap when game over
        if (window.restartGame) {
          window.restartGame();
          console.log('Game restart triggered by mouse click');
        }
      }
    } catch (error) {
      console.error('Error in tap input handler:', error);
    }
  }
  
  onTouchStart(e) {
    e.preventDefault(); // Prevent scrolling on mobile
    try {
      if (!this.isGameOver()) {
        jump();
        console.log('Jump triggered by touch');
      } else {
        // Restart the game on tap when game over
        if (window.restartGame) {
          window.restartGame();
          console.log('Game restart triggered by touch');
        }
      }
    } catch (error) {
      console.error('Error in touch input handler:', error);
    }
  }
}
