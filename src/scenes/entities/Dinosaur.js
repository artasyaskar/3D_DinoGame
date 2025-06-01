import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { scene } from '../utils/Constants';
import { playSound } from '../systems/SoundSystem';

let dino = null;
let velocityY = 0;
let jumping = false;
const gravity = -0.001;

export function loadDino(callback) {
  const loader = new GLTFLoader();
  loader.load('/assets/models/characters/dino.glb', (gltf) => {
    dino = gltf.scene;
    dino.position.set(0, 0, 0);
    dino.scale.set(0.5, 0.5, 0.5);
    scene.add(dino);
    callback();
  }, undefined, (error) => {
    console.error('Error loading Dino model:', error);
  });
}

export function getDino() {
  return dino;
}

export function updateDinoPhysics(deltaTime) {
  if (!dino || !jumping) return;

  dino.position.y += velocityY;
  velocityY += gravity;

  if (dino.position.y <= 0) {
    dino.position.y = 0;
    velocityY = 0;
    jumping = false;
  }
}

export function jump() {
  if (!jumping) {
    velocityY = 0.08;
    jumping = true;
    playSound('jump');
  }
}

export function isJumping() {
  return jumping;
}
