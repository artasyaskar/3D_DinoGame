let score = 0;
let highScore = localStorage.getItem('dinoHighScore') || 0;

export function updateScore(delta = 1) {
  score += delta;
  document.getElementById('score-display').innerText = `Score: ${Math.floor(score)}`;
}

export function updateHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('dinoHighScore', highScore);
  }
  return highScore;
}

export function resetScore() {
  score = 0;
  updateScore(0);
}

export function getCurrentScore() {
  return Math.floor(score);
}
