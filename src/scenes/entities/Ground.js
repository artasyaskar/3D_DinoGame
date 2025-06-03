import * as THREE from 'three';
import { scene } from '../../utils/Constants';

export class Ground {
  constructor() {
    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.MeshStandardMaterial({ color: 0x00a000 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }
}

// Auto-instantiate ground
export const ground = new Ground();
