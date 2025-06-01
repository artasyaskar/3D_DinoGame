import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { loadDino } from '../entities/Dinosaur';
import { createGround } from '../entities/Ground';

let loadedCount = 0;
const totalAssets = 1;

function onAssetLoad() {
  loadedCount++;
  if (loadedCount === totalAssets) {
    window.dispatchEvent(new Event('assetsLoaded'));
  }
}

export function preloadAssets() {
  createGround(); // Create ground synchronously
  loadDino(onAssetLoad);
}
