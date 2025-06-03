import * as THREE from 'three';
import { getModel, playSound } from '../../utils/Loader';

let dinoMesh;
let velocityY = 0;
let isJumping = false;
const jumpForce = 8;
const gravity = 20;

export function getDino() {
  if (!dinoMesh) {
    const model = getModel('dino');
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
      }
    });
    model.scale.set(0.5, 0.5, 0.5);
    model.position.set(0, 1, 0);
    dinoMesh = model;
  }
  return dinoMesh;
}

export function jump() {
  if (!isJumping) {
    velocityY = jumpForce;
    isJumping = true;
    playSound('jump');
  }
}

export function updateDinoPhysics(delta) {
  if (!dinoMesh) return;

  // Apply gravity
  velocityY -= gravity * delta;
  dinoMesh.position.y += velocityY * delta;

  // Collision with ground
  if (dinoMesh.position.y < 1) {
    dinoMesh.position.y = 1;
    velocityY = 0;
    isJumping = false;
  }
}

export function detectCollisionWithObstacle(obstacleMesh) {
  const dinoBox = new THREE.Box3().setFromObject(dinoMesh);
  const obsBox = new THREE.Box3().setFromObject(obstacleMesh);
  return dinoBox.intersectsBox(obsBox);
}
