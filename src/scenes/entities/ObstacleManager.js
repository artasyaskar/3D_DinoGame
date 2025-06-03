import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { scene } from '../../utils/Constants';
import { getDino } from './Dinosaur';

export class ObstacleManager {
  constructor() {
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 3; // seconds
    this.obstacleSpeed = 5;
    this.obstacleModels = {};
    this.loader = new GLTFLoader();
    
    // Load obstacle models
    this.loadObstacleModel('cactus', window.ASSET_PATHS?.models?.cactus || '/assets/models/obstacles/cactus.glb');
    this.loadObstacleModel('rock', window.ASSET_PATHS?.models?.rock || '/assets/models/obstacles/rock.glb');
    this.loadObstacleModel('bird', window.ASSET_PATHS?.models?.bird || '/assets/models/obstacles/bird.glb');
  }

  loadObstacleModel(name, path) {
    this.loader.load(path,
      (gltf) => {
        this.obstacleModels[name] = gltf.scene;
        // Set up materials and shadows
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.material.roughness = 0.8;
            child.material.metalness = 0.2;
          }
        });
      },
      undefined,
      (error) => console.error(`Error loading ${name} model:`, error)
    );
  }

  update(deltaTime) {
    this.spawnTimer += deltaTime;
    
    // Spawn new obstacles
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnObstacle();
      this.spawnTimer = 0;
      // Gradually increase difficulty
      this.spawnInterval = Math.max(1.5, this.spawnInterval - 0.01);
      this.obstacleSpeed += 0.1;
    }
    
    // Update existing obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];
      obstacle.position.z += this.obstacleSpeed * deltaTime;
      
      // Remove obstacles that are behind the camera
      if (obstacle.position.z > 10) {
        scene.remove(obstacle);
        this.obstacles.splice(i, 1);
      }
      
      // Check collision with dino
      if (this.checkCollision(obstacle)) {
        this.onCollision();
      }
    }
  }
  
  spawnObstacle() {
    // Choose a random obstacle type
    const types = Object.keys(this.obstacleModels);
    if (types.length === 0) return; // No models loaded yet
    
    const type = types[Math.floor(Math.random() * types.length)];
    const model = this.obstacleModels[type].clone();
    
    // Set random position
    const xPos = (Math.random() - 0.5) * 4; // Random position across the path
    const zPos = -50; // Far enough to be out of view
    let yPos = 0;
    
    // Birds should be higher
    if (type === 'bird') {
      yPos = 1.5 + Math.random() * 1.5; // Random height for birds
    }
    
    model.position.set(xPos, yPos, zPos);
    model.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
    
    // Add collision box
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    model.userData.collider = new THREE.Box3();
    model.userData.type = type;
    
    scene.add(model);
    this.obstacles.push(model);
  }
  
  checkCollision(obstacle) {
    const dino = getDino();
    if (!dino) return false;
    
    // Update obstacle's collision box
    obstacle.userData.collider.setFromObject(obstacle);
    
    // Create dino collision box with some adjustment for better gameplay
    const dinoBox = new THREE.Box3().setFromObject(dino);
    // Make collision box slightly smaller than visual model for more forgiving gameplay
    dinoBox.min.add(new THREE.Vector3(0.1, 0.1, 0.1));
    dinoBox.max.sub(new THREE.Vector3(0.1, 0.1, 0.1));
    
    return dinoBox.intersectsBox(obstacle.userData.collider);
  }
  
  onCollision() {
    // Trigger game over
    if (window.showGameOver) {
      window.showGameOver();
    }
  }
  
  reset() {
    // Remove all obstacles
    this.obstacles.forEach(obstacle => {
      scene.remove(obstacle);
    });
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 3;
    this.obstacleSpeed = 5;
  }
}

// Create global instance
export const obstacleManager = new ObstacleManager();
