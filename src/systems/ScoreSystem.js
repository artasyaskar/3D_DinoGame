export class ScoreSystem {
  constructor() {
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('dinoHighScore')) || 0;
    this.scoreDisplay = document.getElementById('score-display');
    
    // Initialize score display
    this.updateScoreDisplay();
    console.log('Score system initialized');
  }
  
  // Update the score with the given delta
  updateScore(delta = 1) {
    try {
      this.score += delta;
      this.updateScoreDisplay();
      
      // Update high score if current score is higher
      if (this.score > this.highScore) {
        this.updateHighScore();
      }
    } catch (error) {
      console.error('Error updating score:', error);
    }
  }
  
  // Update the score display element
  updateScoreDisplay() {
    if (this.scoreDisplay) {
      this.scoreDisplay.innerText = `Score: ${Math.floor(this.score)}`;
    }
  }
  
  // Update the high score if needed
  updateHighScore() {
    this.highScore = Math.floor(this.score);
    try {
      localStorage.setItem('dinoHighScore', this.highScore);
      console.log('New high score:', this.highScore);
    } catch (error) {
      console.warn('Could not save high score to localStorage:', error);
    }
  }
  
  // Reset the score to zero
  resetScore() {
    this.score = 0;
    this.updateScoreDisplay();
  }
  
  // Get the current score (floor to integer)
  getCurrentScore() {
    return Math.floor(this.score);
  }
  
  // Get the high score
  getHighScore() {
    return this.highScore;
  }
}
