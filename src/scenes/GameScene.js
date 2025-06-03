import { scene, camera, renderer } from '../utils/Constants';
import { getModel, playSound } from '../utils/Loader';
import { getDino, updateDinoPhysics } from './entities/Dinosaur';
import { obstacleManager } from './entities/ObstacleManager';

// This file sets up lights, ground, and adds the dinosaur & obstacles to `scene`
export function initGameScene() {
  // Add ground
  // (Ground.js module already adds ground mesh to `scene` on import)
  const dino = getDino();
  scene.add(dino);

  // Add light
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 10, 7.5);
  light.castShadow = true;
  scene.add(light);

  // Initialize obstacles
  obstacleManager.init(scene, camera);

  // Any other setup (fog, skybox) can go here
}

export function updateGameScene(delta) {
  updateDinoPhysics(delta);
  obstacleManager.update(delta);
}
