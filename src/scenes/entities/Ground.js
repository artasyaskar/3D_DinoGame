import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { scene } from '../../utils/Constants';

export function createGround() {
  const textureLoader = new THREE.TextureLoader();
  const gltfLoader = new GLTFLoader();

  // Load ground textures
  const diffuseMap = textureLoader.load(window.ASSET_PATHS?.textures?.ground || '/assets/textures/ground_diffuse.jpg');
  const normalMap = textureLoader.load(window.ASSET_PATHS?.textures?.groundNormal || '/assets/textures/ground_normal.jpg');

  // Set texture properties
  diffuseMap.wrapS = diffuseMap.wrapT = THREE.RepeatWrapping;
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  diffuseMap.repeat.set(8, 16);
  normalMap.repeat.set(8, 16);

  // Create main ground
  const groundGeometry = new THREE.PlaneGeometry(50, 100, 50, 100);
  const groundMaterial = new THREE.MeshStandardMaterial({
    map: diffuseMap,
    normalMap: normalMap,
    roughness: 0.8,
    metalness: 0.2,
    normalScale: new THREE.Vector2(1, 1)
  });

  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.01, -25);
  ground.receiveShadow = true;
  scene.add(ground);

  // Load detailed ground decorations
  gltfLoader.load(window.ASSET_PATHS?.models?.groundDetails || '/assets/models/environment/ground_details.glb',
    (gltf) => {
      const details = gltf.scene;
      details.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      details.position.set(0, 0, -25);
      scene.add(details);
    },
    undefined,
    (error) => console.error('Error loading ground details:', error)
  );

  // Load mountains in the background
  gltfLoader.load(window.ASSET_PATHS?.models?.mountain || '/assets/models/environment/mountain.glb',
    (gltf) => {
      const mountains = gltf.scene;
      mountains.traverse((child) => {
        if (child.isMesh) {
          child.material.side = THREE.DoubleSide;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      mountains.position.set(0, 0, -75);
      mountains.scale.set(2, 2, 2);
      scene.add(mountains);
    },
    undefined,
    (error) => console.error('Error loading mountains:', error)
  );
}
