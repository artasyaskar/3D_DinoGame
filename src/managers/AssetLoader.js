import * as THREE from 'three';

export class AssetLoader {
  constructor(gltfLoader) {
    this.gltfLoader = gltfLoader;
    this.cache = new Map();
  }

  async loadGLB(url) {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }
    const gltf = await new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        resolve,
        undefined,
        (e) => {
          console.error('GLB load error for', url, e);
          const msg = (e && (e.message || e.status || e.type)) ? String(e.message || e.status || e.type) : 'unknown error';
          reject(new Error(`Failed to load GLB: ${url} (${msg})`));
        }
      );
    });
    // Cache full GLTF (scene + animations)
    this.cache.set(url, gltf);
    return gltf;
  }

  static computeBox(object3d) {
    const box = new THREE.Box3().setFromObject(object3d);
    return box;
  }
}
