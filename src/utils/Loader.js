import * as THREE from 'three';
import { loadDino } from '../scenes/entities/Dinosaur';
import { createGround } from '../scenes/entities/Ground';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Create loaders
const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

// Define asset paths (Vite serves public/assets/* at /assets/*)
const assetPaths = {
  models: {
    dino: '/assets/models/characters/dino.glb',
    rock: '/assets/models/obstacles/rock.glb',
    bird: '/assets/models/obstacles/bird.glb',
    cactus: '/assets/models/obstacles/cactus.glb'
  },
  textures: {
    dino: '/assets/textures/dino_diffuse.png',
    ground: '/assets/textures/ground_diffuse.jpg',
    groundNormal: '/assets/textures/ground_normal.jpg'
  },
  sounds: {
    jump: '/assets/sounds/effects/jump.ogg',
    hit: '/assets/sounds/effects/crash.ogg',
    background: '/assets/sounds/music/background.mp3'
  }
};

// Store paths globally
window.ASSET_PATHS = assetPaths;
console.log('Asset paths:', assetPaths);

export { gltfLoader, textureLoader, assetPaths };

export function preloadAssets() {
  try {
    loadDino(() => {
      console.log('Dinosaur loaded successfully');
    });
    createGround();
    window.dispatchEvent(new Event('assetsLoaded'));
    console.log('Assets loaded event dispatched');
  } catch (error) {
    console.error('Error during asset preloading:', error);
    window.dispatchEvent(new Event('assetsLoaded'));
  }
}