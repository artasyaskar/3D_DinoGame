import * as THREE from 'three';
import { scene } from '../utils/Constants';

export function createGround() {
  // Create a more interesting ground
  const groundGeometry = new THREE.PlaneGeometry(30, 100);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x8c8c8c,
    roughness: 0.8,
    metalness: 0.2
  });
  
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.position.z = -20;
  ground.receiveShadow = true;
  
  // Add ground texture if available
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('/assets/textures/ground_diffuse.jpg', 
    (texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(10, 50);
      groundMaterial.map = texture;
      groundMaterial.needsUpdate = true;
    },
    undefined, 
    (err) => {
      console.error('Error loading ground texture:', err);
    }
  );
  
  scene.add(ground);
  
  // Add some decorative rocks
  for (let i = 0; i < 20; i++) {
    const rockGeometry = new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.3, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(
      -10 + Math.random() * 20,
      0.2,
      -30 + Math.random() * 60
    );
    rock.castShadow = true;
    scene.add(rock);
  }
}
