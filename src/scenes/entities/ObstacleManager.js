import * as THREE from 'three';
import { scene } from '../../utils/Constants';
import { detectCollisionWithObstacle } from './Dinosaur';
import { playSound } from '../../utils/Loader';

export class ObstacleManager {
  constructor() {
    this.obstacles = [];
    this.spawnInterval = 2.0; // seconds
    this.timeSinceLastSpawn = 0;
    this.speed = 10;
  }

  init(scene, camera) {
    // Nothing special for now; keep references if needed
    this.scene = scene;
    this.camera = camera;
  }

  update(delta) {
    this.timeSinceLastSpawn += delta;

    // Spawn new obstacle
    if (this.timeSinceLastSpawn >= this.spawnInterval) {
      this.spawnObstacle();
      this.timeSinceLastSpawn = 0;
    }

    // Move existing obstacles
    this.obstacles.forEach((obs, index) => {
      obs.position.x -= this.speed * delta;
      // If off-screen → remove
      if (obs.position.x < -20) {
        this.scene.remove(obs);
        this.obstacles.splice(index, 1);
      } else {
        // Check collision with dino
        if (detectCollisionWithObstacle(obs)) {
          playSound('collision');
          if (window.gameApp) {
            window.gameApp.showGameOver();
          }
        }
      }
    });
  }

  spawnObstacle() {
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.castShadow = true;
    obstacle.position.set(20, 1, 0);
    this.scene.add(obstacle);
    this.obstacles.push(obstacle);
  }
}

export const obstacleManager = new ObstacleManager();
