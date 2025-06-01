import { getDino, updateDinoPhysics } from '../entities/Dinosaur';

let gameOver = false;

export function setGameOver(status) {
  gameOver = status;
}

export function animate(deltaTime) {
  updateDinoPhysics(deltaTime);
}
