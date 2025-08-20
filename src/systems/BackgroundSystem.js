import * as THREE from 'three';

export class BackgroundSystem {
  constructor(scene) {
    this.scene = scene;
    this.texLoader = new THREE.TextureLoader();

    this.backgroundPlane = null;
    this.floorBand = null;
    this.parallaxFar = null;
    this.parallaxNear = null;

    this._bandTex = null;
    this._bandGradTex = null;
    this._parallax1Tex = null;
    this._parallax2Tex = null;
  }

  init() {
    // Base background plane
    const bgGeo = new THREE.PlaneGeometry(400, 200, 1, 1);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x25466f, depthWrite: false, depthTest: false });
    this.backgroundPlane = new THREE.Mesh(bgGeo, bgMat);
    this.backgroundPlane.position.set(0, 4, -20);
    this.backgroundPlane.renderOrder = -3;
    this.scene.add(this.backgroundPlane);

    // Floor band overlay near camera
    const bandGeo = new THREE.PlaneGeometry(400, 2, 1, 1);
    // Create a vertical alpha gradient (opaque at bottom -> transparent at top)
    const bandCanvas = document.createElement('canvas');
    bandCanvas.width = 4; bandCanvas.height = 256;
    const bctx = bandCanvas.getContext('2d');
    const grd = bctx.createLinearGradient(0, 0, 0, bandCanvas.height);
    grd.addColorStop(0.00, 'rgba(10, 14, 22, 0.45)');
    grd.addColorStop(0.35, 'rgba(14, 18, 28, 0.28)');
    grd.addColorStop(0.70, 'rgba(20, 24, 34, 0.08)');
    grd.addColorStop(1.00, 'rgba(20, 24, 34, 0.00)');
    bctx.fillStyle = grd; bctx.fillRect(0, 0, bandCanvas.width, bandCanvas.height);
    this._bandGradTex = new THREE.CanvasTexture(bandCanvas);
    this._bandGradTex.wrapS = THREE.ClampToEdgeWrapping;
    this._bandGradTex.wrapT = THREE.ClampToEdgeWrapping;
    const bandMat = new THREE.MeshBasicMaterial({ map: this._bandGradTex, transparent: true, depthWrite: false, depthTest: false });
    this.floorBand = new THREE.Mesh(bandGeo, bandMat);
    this.floorBand.position.set(0, 0.02, -5); // push farther back; no depth test so it stays behind
    this.floorBand.receiveShadow = false;
    // Keep created but start hidden to prevent any dark overlay
    this.floorBand.visible = false;
    this.scene.add(this.floorBand);

    // Parallax layers
    const farGeo = new THREE.PlaneGeometry(400, 60, 1, 1);
    const nearGeo = new THREE.PlaneGeometry(400, 40, 1, 1);
    // Parallax layers: soft tint, lower opacity, alphaTest to drop dark fringes, and premultiplied alpha to avoid halos
    const farMat = new THREE.MeshBasicMaterial({
      color: 0xbdd0db,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      depthTest: true,
      alphaTest: 0.02,
      premultipliedAlpha: true
    });
    const nearMat = new THREE.MeshBasicMaterial({
      color: 0xaec4cf,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      depthTest: true,
      alphaTest: 0.02,
      premultipliedAlpha: true
    });
    this.parallaxFar = new THREE.Mesh(farGeo, farMat);
    this.parallaxNear = new THREE.Mesh(nearGeo, nearMat);
    this.parallaxFar.position.set(0, 6, -12);
    this.parallaxNear.position.set(0, 3.8, -8);
    this.parallaxFar.renderOrder = -2;
    this.parallaxNear.renderOrder = -1;
    this.scene.add(this.parallaxFar, this.parallaxNear);

    // Load textures from public
    this._loadSkyFallbacks();
    this._loadParallax('/textures/environment/parallax_far.png', this.parallaxFar, '_parallax1Tex', 2);
    this._loadParallax('/textures/environment/parallax_near.png', this.parallaxNear, '_parallax2Tex', 3);
  }

  _loadSkyFallbacks() {
    const tryLoadBg = (urls, idx = 0) => {
      if (idx >= urls.length) return; // keep solid color
      this.texLoader.load(urls[idx], (tex) => {
        if (tex.colorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
        this.backgroundPlane.material.map = tex;
        this.backgroundPlane.material.color.setHex(0xffffff);
        this.backgroundPlane.material.needsUpdate = true;
      }, undefined, () => tryLoadBg(urls, idx + 1));
    };
    tryLoadBg([
      '/textures/environment/sky.png',
      '/textures/environment/background.png',
      '/textures/environment/skybox.png'
    ]);

    // Gradient fallback if nothing arrives quickly
    setTimeout(() => {
      if (this.backgroundPlane.material.map) return;
      const canvas = document.createElement('canvas');
      canvas.width = 2; canvas.height = 256;
      const ctx = canvas.getContext('2d');
      const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grd.addColorStop(0, '#0e1b2d');
      grd.addColorStop(1, '#2a4365');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const tex = new THREE.CanvasTexture(canvas);
      if (tex.colorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      this.backgroundPlane.material.map = tex;
      this.backgroundPlane.material.color.setHex(0xffffff);
      this.backgroundPlane.material.needsUpdate = true;
    }, 50);
  }

  _loadParallax(url, target, assignTexPropName, repeatX = 6) {
    this.texLoader.load(url, (tex) => {
      if (tex.colorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.MirroredRepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(repeatX, 1);
      tex.offset.x = Math.random();
      tex.anisotropy = 8;
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      target.material.map = tex;
      target.material.needsUpdate = true;
      this[assignTexPropName] = tex;
      console.log('[BackgroundSystem] Loaded', url);
    }, undefined, (err) => {
      console.warn('[BackgroundSystem] Failed to load', url, err);
      target.material.map = null;
      target.material.color.set(0x27466f);
      target.material.opacity = 0.6;
      target.material.needsUpdate = true;
    });
  }

  applyBandFromGroundTexture(_groundTex) {
    // Intentionally keep the gradient band for a clean, professional surface.
    // Do not override with the ground texture to avoid harsh stripes.
    this._bandTex = null;
    if (this.floorBand && this.floorBand.material.map !== this._bandGradTex) {
      this.floorBand.material.map = this._bandGradTex;
      this.floorBand.material.needsUpdate = true;
    }
  }

  update(dt, speed) {
    // Gradient band does not scroll; keep static for stability.
    if (this._parallax1Tex) this._parallax1Tex.offset.x -= dt * 0.02 * (speed * 0.5);
    if (this._parallax2Tex) this._parallax2Tex.offset.x -= dt * 0.04 * (speed * 0.5);
  }

  // Dynamically tint the background plane color (keeps texture if present).
  setSkyTint(color) {
    if (!this.backgroundPlane) return;
    this.backgroundPlane.material.color.set(color);
    this.backgroundPlane.material.needsUpdate = true;
  }

  // Adjust parallax layer opacities smoothly.
  setParallaxOpacity(farOpacity = 0.8, nearOpacity = 0.6) {
    if (this.parallaxFar) {
      this.parallaxFar.material.opacity = farOpacity;
      this.parallaxFar.material.needsUpdate = true;
    }
    if (this.parallaxNear) {
      this.parallaxNear.material.opacity = nearOpacity;
      this.parallaxNear.material.needsUpdate = true;
    }
  }

  dispose() {
    for (const obj of [this.backgroundPlane, this.floorBand, this.parallaxFar, this.parallaxNear]) {
      if (obj) this.scene.remove(obj);
    }
  }

  setVisible(v) {
    if (this.backgroundPlane) this.backgroundPlane.visible = v;
    if (this.floorBand) this.floorBand.visible = v;
    if (this.parallaxFar) this.parallaxFar.visible = v;
    if (this.parallaxNear) this.parallaxNear.visible = v;
  }
}
