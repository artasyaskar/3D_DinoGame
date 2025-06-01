import { jump } from '../entities/Dinosaur';

let gameOver = false;

export function setGameOver(status) {
  gameOver = status;
}

function isGameOver() {
  return gameOver;
}

export function initInput() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('click', onTap);
  window.addEventListener('touchstart', onTap);
}

function onKeyDown(e) {
  if ((e.code === 'Space' || e.code === 'ArrowUp') && !isGameOver()) {
    jump();
  }
}

function onTap(e) {
  e.preventDefault();
  if (!isGameOver()) {
    jump();
  }
}
