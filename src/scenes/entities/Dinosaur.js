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
  
  // Add fallback if model fails to load
  try {
    loader.load('/assets/models/characters/dino.glb', (gltf) => {
      dino = gltf.scene;
      dino.position.set(0, 0, 0);
      dino.scale.set(0.5, 0.5, 0.5);
      
      // Add debug bounding box
      const bbox = new THREE.BoxHelper(dino, 0xffff00);
      scene.add(bbox);
      
      scene.add(dino);
      if (callback) callback();
    }, undefined, (error) => {
      console.error('Error loading Dino model:', error);
      createFallbackDino();
      if (callback) callback();
    });
  } catch (e) {
    console.error('GLTFLoader exception:', e);
    createFallbackDino();
    if (callback) callback();
  }
}

function createFallbackDino() {
  // Create a simple cube as fallback
  const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  dino = new THREE.Mesh(geometry, material);
  dino.position.set(0, 0.5, 0);
  scene.add(dino);
}

// ... rest of the file remains the same ...
