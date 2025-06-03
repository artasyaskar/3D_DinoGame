import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { scene } from '../../utils/Constants';
import { playSound } from '../../systems/SoundSystem';

let dino = null;
let velocityY = 0;
let jumping = false;
const gravity = -0.02;
const jumpForce = 0.4;

export function loadDino(callback) {
  const loader = new GLTFLoader();
  loader.load(
    window.ASSET_PATHS?.models?.dino || '/assets/models/characters/dino.glb',
    (gltf) => {
      dino = gltf.scene;
      dino.position.set(0, 0, 0);
      dino.scale.set(0.5, 0.5, 0.5);
      scene.add(dino);
      callback();
    },
    undefined,
    (error) => {
      console.warn('GLTF model not found, creating fallback dinosaur');
      createFallbackDino();
      callback();
    }
  );
}

export function createFallbackDino() {
  const group = new THREE.Group();
  const bodyGeometry = new THREE.BoxGeometry(0.5, 0.8, 1.2);
  const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.6);
  const legGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
  const tailGeometry = new THREE.CylinderGeometry(0.1, 0.3, 0.8, 8);

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x008000, roughness: 0.7, metalness: 0.1 });
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0x006400, roughness: 0.6, metalness: 0.2 });
  const limbMaterial = new THREE.MeshStandardMaterial({ color: 0x008000, roughness: 0.8 });

  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.set(0, 0.8, 0);
  group.add(body);

  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.set(0, 1.2, -0.8);
  group.add(head);

  const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(0.15, 0.1, -0.2);
  head.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(-0.15, 0.1, -0.2);
  head.add(rightEye);

  const frontLeftLeg = new THREE.Mesh(legGeometry, limbMaterial);
  frontLeftLeg.position.set(0.25, -0.7, -0.4);
  group.add(frontLeftLeg);
  const frontRightLeg = new THREE.Mesh(legGeometry, limbMaterial);
  frontRightLeg.position.set(-0.25, -0.7, -0.4);
  group.add(frontRightLeg);
  const backLeftLeg = new THREE.Mesh(legGeometry, limbMaterial);
  backLeftLeg.position.set(0.25, -0.7, 0.4);
  group.add(backLeftLeg);
  const backRightLeg = new THREE.Mesh(legGeometry, limbMaterial);
  backRightLeg.position.set(-0.25, -0.7, 0.4);
  group.add(backRightLeg);

  const tail = new THREE.Mesh(tailGeometry, limbMaterial);
  tail.position.set(0, 0.1, 1);
  tail.rotation.x = Math.PI / 2;
  group.add(tail);

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  scene.add(group);
  dino = group;
  return group;
}

export function getDino() {
  return dino;
}

export function updateDinoPhysics(deltaTime) {
  if (jumping && dino) {
    dino.position.y += velocityY * deltaTime * 60; // Fixed typo here
    velocityY += gravity * deltaTime * 60;
    if (dino.position.y <= 0.2) {
      dino.position.y = 0.2;
      velocityY = 0;
      jumping = false;
    }
  }
}

export function jump() {
  if (!jumping && dino) {
    velocityY = jumpForce;
    jumping = true;
    playSound && playSound('jump');
  }
}

export function isJumping() {
  return jumping;
}