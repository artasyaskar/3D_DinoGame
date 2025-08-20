import * as THREE from 'three';

// SkySystem: lightweight sky enhancements with scrolling cloud layers and night stars.
// - Clouds: two large planes with scrolling textures (looping UVs)
// - Stars: GPU-friendly Points that fade in at night
// - All unlit for consistent brightness and great performance
export class SkySystem {
  constructor(scene) {
    this.scene = scene;
    this.texLoader = new THREE.TextureLoader();

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Cloud layers
    this.cloudFar = null;
    this.cloudNear = null;
    this._cloudTex1 = null;
    this._cloudTex2 = null;

    // Stars
    this.stars = null;
    this._starMat = null;

    // Params
    this.cloudSpeedFar = 0.002; // uv units per second
    this.cloudSpeedNear = 0.004;
    this.enabled = true;
  }

  init() {
    // Clouds geometry and materials
    const farGeo = new THREE.PlaneGeometry(400, 120, 1, 1);
    const nearGeo = new THREE.PlaneGeometry(400, 80, 1, 1);
    const farMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false });
    const nearMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false });
    this.cloudFar = new THREE.Mesh(farGeo, farMat);
    this.cloudNear = new THREE.Mesh(nearGeo, nearMat);
    this.cloudFar.position.set(0, 9, -14);
    this.cloudNear.position.set(0, 7, -10);
    this.cloudFar.renderOrder = -2.5; // behind parallax layers
    this.cloudNear.renderOrder = -1.5;
    this.group.add(this.cloudFar, this.cloudNear);

    // Try load textures; fall back to soft alpha gradient clouds
    this._loadCloud('/textures/environment/clouds_far.png', this.cloudFar, '_cloudTex1', 2);
    this._loadCloud('/textures/environment/clouds_near.png', this.cloudNear, '_cloudTex2', 3);

    // Stars (Points)
    const starCount = 800;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const x = (Math.random() - 0.5) * 300;
      const y = 20 + Math.random() * 80;
      const z = -30 - Math.random() * 50;
      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this._starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, sizeAttenuation: true, depthWrite: false, transparent: true, opacity: 0.0 });
    this.stars = new THREE.Points(starGeo, this._starMat);
    this.stars.renderOrder = -3.0;
    this.group.add(this.stars);
  }

  _loadCloud(url, target, assign, repeatX) {
    this.texLoader.load(url, (tex) => {
      if (tex.colorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(repeatX, 1);
      tex.offset.x = Math.random();
      tex.anisotropy = 8;
      target.material.map = tex;
      target.material.opacity = 0.8;
      target.material.needsUpdate = true;
      this[assign] = tex;
    }, undefined, () => {
      // Fallback: soft alpha cloudy canvas
      const c = document.createElement('canvas');
      c.width = 256; c.height = 128;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(128, 64, 10, 128, 64, 90);
      g.addColorStop(0, 'rgba(255,255,255,0.8)');
      g.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 128);
      const tex = new THREE.CanvasTexture(c);
      target.material.map = tex;
      target.material.opacity = 0.5;
      target.material.needsUpdate = true;
      this[assign] = tex;
    });
  }

  // dayNight is 0..1 (0=day, 0.5=night), we fade stars in at night
  setDayNightFactor(dayNight) {
    if (!this._starMat) return;
    const night = Math.max(0, Math.sin(dayNight * Math.PI)); // near 0 at day, 1 at midnight
    this._starMat.opacity = THREE.MathUtils.lerp(0.0, 0.9, night);
  }

  update(dt, speed = 1.0) {
    if (!this.enabled) return;
    if (this._cloudTex1) this._cloudTex1.offset.x -= dt * this.cloudSpeedFar * (0.5 + speed * 0.05);
    if (this._cloudTex2) this._cloudTex2.offset.x -= dt * this.cloudSpeedNear * (0.5 + speed * 0.05);
  }

  setVisible(v) { this.group.visible = v; }

  dispose() { this.group.removeFromParent(); }
}
