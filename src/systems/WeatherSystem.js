import * as THREE from 'three';

// WeatherSystem: day-night, fog, rain with pooling, randomized transitions, and sound hooks.
// Designed to be efficient and mobile-friendly.
export class WeatherSystem {
  constructor({ scene, sky, background, sounds, postFX }) {
    this.scene = scene;
    this.sky = sky; // SkySystem instance
    this.background = background; // BackgroundSystem instance
    this.sounds = sounds; // SoundManager
    this.postFX = postFX; // PostFXSystem

    // Day-night state
    this.dayLength = 90; // seconds for full cycle (shorter so players notice)
    this.phase = 0; // 0..1 (0 day, 0.5 night, 1 day)

    // Fog
    // Darker base fog color for a less washed-out scene
    this.baseFogColor = new THREE.Color(0x5b7aa3);
    this.fog = new THREE.Fog(this.baseFogColor.getHex(), 12, 90);
    this.scene.fog = this.fog;

    // Weather state
    this.types = ['sunny', 'cloudy', 'rainy', 'foggy'];
    this.current = 'sunny';
    this.nextIn = 8 + Math.random() * 12; // earlier first switch so rain/fog show up

    // Rain pool
    this._rainGroup = new THREE.Group();
    this.scene.add(this._rainGroup);
    this._dropPool = []; // inactive
    this._drops = []; // active { mesh, velY }
    this._splashPool = [];
    this._splashes = []; // { mesh, life, maxLife }
    this._dropTex = this._makeDropTex();
    this._splashTex = this._makeSplashTex();
    this.rainIntensity = 0; // 0..1
    this.maxDrops = 650; // stronger visual presence while remaining performant
    this.fogDensity = 0;

    // Tweening state
    this.rainTween = { active: false, start: 0, end: 0, time: 0, duration: 2 };
    this.fogTween = { active: false, start: 0, end: 0, time: 0, duration: 2 };

    // Exposure control (post)
    // Lower exposures so WeatherSystem can darken/brighten subtly
    this.dayExposure = 1.05;
    this.nightExposure = 0.70;
  }

  // Public API
  setWeather(type, transition = 2.0) {
    if (!this.types.includes(type)) type = 'sunny';
    this.current = type;
    // Smooth tweaks based on type
    switch (type) {
      case 'sunny':
        this._tweenFog(0.002, transition);
        this._tweenRain(0.0, transition);
        this.background?.setParallaxOpacity?.(0.8, 0.6);
        break;
      case 'cloudy':
        this._tweenFog(0.006, transition);
        this._tweenRain(0.0, transition);
        this.background?.setParallaxOpacity?.(0.9, 0.75);
        break;
      case 'rainy':
        this._tweenFog(0.01, transition);
        this._tweenRain(0.7, transition);
        this.background?.setParallaxOpacity?.(0.75, 0.6);
        break;
      case 'foggy':
        this._tweenFog(0.02, transition);
        this._tweenRain(0.0, transition);
        this.background?.setParallaxOpacity?.(0.6, 0.45);
        break;
    }
  }

  update(dt, gameSpeed = 1) {
    // Day-night cycle
    this.phase = (this.phase + dt / this.dayLength) % 1.0;
    const dayFactor = this._dayLightFactor(this.phase); // 0 night..1 day

    // Update tweens
    if (this.fogTween.active) {
      this.fogTween.time += dt;
      const t = Math.min(1, this.fogTween.time / this.fogTween.duration);
      this.fogDensity = THREE.MathUtils.lerp(this.fogTween.start, this.fogTween.end, t);
      if (t >= 1) this.fogTween.active = false;
    }
    if (this.rainTween.active) {
        this.rainTween.time += dt;
        const t = Math.min(1, this.rainTween.time / this.rainTween.duration);
        this.rainIntensity = THREE.MathUtils.lerp(this.rainTween.start, this.rainTween.end, t);
        this.sounds?.setRainIntensity?.(this.rainIntensity);
        if (t >= 1) this.rainTween.active = false;
    }

    // Adjust exposure (post) for perceived brightness across cycle
    if (this.postFX?.material?.uniforms?.exposure) {
      const target = THREE.MathUtils.lerp(this.nightExposure, this.dayExposure, dayFactor);
      const cur = this.postFX.material.uniforms.exposure.value || target;
      this.postFX.material.uniforms.exposure.value = cur + (target - cur) * Math.min(1, dt * 1.5);
    }

    // Sky stars visibility
    this.sky?.setDayNightFactor?.(1 - dayFactor);

    // Fog color blend: day sky to deep night blue
    const nightCol = new THREE.Color(0x0b1830);
    this.fog.color.copy(nightCol).lerp(this.baseFogColor, dayFactor);
    // Also tint background plane to match cycle
    const daySky = new THREE.Color(0x8bb3e0);
    const nightSky = new THREE.Color(0x0b1830);
    const tint = nightSky.clone().lerp(daySky, dayFactor);
    this.background?.setSkyTint?.(tint);
    
    // Fog distances scale with weather
    const nearTarget = THREE.MathUtils.lerp(6, 16, 1 - Math.min(1, this.fogDensity * 40));
    const farTarget = THREE.MathUtils.lerp(40, 110, 1 - Math.min(1, this.fogDensity * 40));
    this.fog.near += (nearTarget - this.fog.near) * 0.1;
    this.fog.far += (farTarget - this.fog.far) * 0.1;


    // Randomized weather transitions
    this.nextIn -= dt;
    if (this.nextIn <= 0) {
      this.nextIn = 25 + Math.random() * 35;
      const pick = this.types[Math.floor(Math.random() * this.types.length)];
      this.setWeather(pick, 3.0);
    }

    // Rain simulation
    this._updateRain(dt, gameSpeed);
  }

  // Internal helpers
  _dayLightFactor(phase) {
    // Cosine curve: 1 at 0 (day), 0 at 0.5 (midnight), 1 at 1
    return 0.5 + 0.5 * Math.cos(phase * Math.PI * 2.0);
  }

  _tweenFog(targetDensity, seconds) {
    this.fogTween.start = this.fogDensity;
    this.fogTween.end = targetDensity;
    this.fogTween.time = 0;
    this.fogTween.duration = seconds;
    this.fogTween.active = true;
  }

  _tweenRain(target, seconds) {
    this.rainTween.start = this.rainIntensity;
    this.rainTween.end = target;
    this.rainTween.time = 0;
    this.rainTween.duration = seconds;
    this.rainTween.active = true;
  }

  _ensureDrop() {
    let mesh;
    if (this._dropPool.length) mesh = this._dropPool.pop();
    else {
      const geo = new THREE.PlaneGeometry(0.024, 0.30);
      const mat = new THREE.MeshBasicMaterial({ map: this._dropTex, transparent: true, depthWrite: false, opacity: 0.95 });
      mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
    }
    this._rainGroup.add(mesh);
    return mesh;
  }

  _recycleDrop(mesh) {
    this._rainGroup.remove(mesh);
    this._dropPool.push(mesh);
  }

  _spawnSplashAt(x, z) {
    let m;
    if (this._splashPool.length) m = this._splashPool.pop();
    else {
      const geo = new THREE.PlaneGeometry(0.5, 0.5);
      const mat = new THREE.MeshBasicMaterial({ map: this._splashTex, transparent: true, depthWrite: false, opacity: 0.0 });
      m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
    }
    m.position.set(x, 0.02, z);
    this._rainGroup.add(m);
    this._splashes.push({ mesh: m, life: 0, maxLife: 0.25 });
  }

  _updateRain(dt, speed) {
    const targetCount = Math.floor(this.maxDrops * this.rainIntensity);

    // Spawn to reach target count
    while (this._drops.length < targetCount) {
      const m = this._ensureDrop();
      m.position.set((Math.random() - 0.5) * 18, 10 + Math.random() * 10, (Math.random() - 0.5) * 6);
      this._drops.push({ mesh: m, velY: - (10 + Math.random() * 14) });
    }

    // Update existing and recycle extras
    for (let i = this._drops.length - 1; i >= 0; i--) {
      const d = this._drops[i];
      d.mesh.position.y += d.velY * dt * (1 + speed * 0.04);
      // slightly stronger wind slant
      d.mesh.position.x -= dt * 1.6;
      if (d.mesh.position.y <= 0.02) {
        // splash
        this._spawnSplashAt(d.mesh.position.x, d.mesh.position.z);
        this._recycleDrop(d.mesh);
        this._drops.splice(i, 1);
      }
    }

    // Update splashes
    for (let i = this._splashes.length - 1; i >= 0; i--) {
      const s = this._splashes[i];
      s.life += dt;
      const t = Math.min(1, s.life / s.maxLife);
      const scale = 0.6 + 0.8 * t;
      s.mesh.scale.set(scale, 1, scale);
      s.mesh.material.opacity = 0.4 * (1 - t);
      if (s.life >= s.maxLife) {
        this._rainGroup.remove(s.mesh);
        this._splashPool.push(s.mesh);
        this._splashes.splice(i, 1);
      }
    }
  }

  _makeDropTex() {
    const c = document.createElement('canvas'); c.width = 16; c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.0)');
    g.addColorStop(0.2, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = g; ctx.fillRect(6, 0, 4, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    if (tex.colorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _makeSplashTex() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    if (tex.colorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}
