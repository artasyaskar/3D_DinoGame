import { loadDino } from '../entities/Dinosaur';
import { createGround } from '../entities/Ground';
import { scene } from './Constants';

let assetsLoaded = false;

export function preloadAssets(callback) {
  // Create ground immediately
  createGround();
  
  // Add temporary cube to prevent blank screen
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.y = 0.5;
  scene.add(cube);

  // Load dino model
  loadDino(() => {
    // Remove temporary cube
    scene.remove(cube);
    assetsLoaded = true;
    if (callback) callback();
  });
}

export function areAssetsLoaded() {
  return assetsLoaded;
}
