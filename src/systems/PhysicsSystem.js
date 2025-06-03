import { getDino, updateDinoPhysics } from '../scenes/entities/Dinosaur';
import { obstacleManager } from '../scenes/entities/ObstacleManager';

export class PhysicsSystem {
  constructor() {
    this.gravity = 9.8;
    this.isGameOver = false;
  }
  
  // Main update method called by App.js
  update(deltaTime) {
    if (this.isGameOver) return;
    
    try {
      // Physics calculations happen in the respective entities
      // We just coordinate them here
      
      // Check for collisions - this is now handled in ObstacleManager directly
      // Just update the game state based on time passing
      this.updateGamePhysics(deltaTime);
    } catch (error) {
      console.error('Error in physics update:', error);
    }
  }
  
  updateGamePhysics(deltaTime) {
    // Any global physics updates would go here
    // Currently empty as physics is handled by individual entities
  }
  
  setGameOver(status) {
    this.isGameOver = status;
    
    if (status) {
      // Reset the obstacle system when game is over
      obstacleManager.reset();
      
      // Let the world know the game is over
      if (window.showGameOver) {
        window.showGameOver();
      }
    }
  }
  
  reset() {
    this.isGameOver = false;
  }
}
