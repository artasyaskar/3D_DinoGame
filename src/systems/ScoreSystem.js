let score = 0;
let lastTime = 0;

export class ScoreSystem {
  constructor() {
    lastTime = performance.now();
    const scoreboard = document.createElement('div');
    scoreboard.id = 'scoreboard';
    scoreboard.style.cssText = `
      position: absolute;
      top: 10px;
      right: 20px;
      font-family: sans-serif;
      font-size: 20px;
      color: #fff;
      text-shadow: 1px 1px 2px #000;
    `;
    scoreboard.textContent = `Score: 0`;
    document.body.appendChild(scoreboard);
  }

  update(delta) {
    score += delta * 10; // Increase score over time
    const scoreboard = document.getElementById('scoreboard');
    if (scoreboard) {
      scoreboard.textContent = `Score: ${Math.floor(score)}`;
    }
  }
}
