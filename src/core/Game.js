// Three.js via import map (see index.html)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

import { AssetLoader } from '../managers/AssetLoader.js';
import { SoundManager } from '../managers/SoundManager.js';
import { Player } from '../entities/Player.js';
import { ObstacleManager } from '../systems/ObstacleManager.js';
import { BackgroundSystem } from '../systems/BackgroundSystem.js';
import { SkySystem } from '../systems/SkySystem.js';
import { WeatherSystem } from '../systems/WeatherSystem.js';
import { PostFXSystem } from '../systems/PostFXSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';

export class Game {
  constructor({ container, onScore, onGameOver, onPause, onResume, onHighScore, onCoin }) {
    this.container = container;
    this.onScore = onScore;
    this.onGameOver = onGameOver;
    this.onPause = onPause;
    this.onResume = onResume;
    this.onHighScore = onHighScore;
    this.onCoin = onCoin;

    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    // Darker base background; main backdrop is handled by BackgroundSystem
    this.scene.background = new THREE.Color(0x0f172a);

    const rect0 = container.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect0.width || container.clientWidth));
    const h = Math.max(1, Math.round(rect0.height || container.clientHeight));
    this.unitsHigh = 16; // further reduce to enlarge perceived scale
    this.laneX = 0; // camera lane center for side view
    this._setupOrthoCamera(w / h);

    // Explicitly create canvas + WebGL context first to avoid extensions or
    // other scripts attaching a 2D context which would block WebGL creation.
    const canvas = document.createElement('canvas');
    const ctxOpts = {
      antialias: true,
      alpha: true,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      desynchronized: true,
    };
    let gl = canvas.getContext('webgl2', ctxOpts) ||
             canvas.getContext('webgl', ctxOpts) ||
             canvas.getContext('experimental-webgl', ctxOpts);
    if (!gl) {
      throw new Error('WebGL not supported: failed to acquire WebGL context');
    }
    this.renderer = new THREE.WebGLRenderer({ canvas, context: gl });
    // Slightly lower DPR cap on small/mobile screens to improve performance
    const isSmallScreen = Math.min(window.innerWidth || w, window.innerHeight || h) <= 768;
    const dprCap = isSmallScreen ? 1.25 : 1.75;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    this.renderer.setSize(w, h);
    // Disable all shadow mapping to avoid any darkening
    this.renderer.shadowMap.enabled = false;
    // Ensure textures from /public are displayed with correct gamma/colors
    if (this.renderer.outputColorSpace !== undefined) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    // Use NoToneMapping to avoid midtone compression darkening
    this.renderer.toneMapping = THREE.NoToneMapping;
    if (this.renderer.toneMappingExposure !== undefined) {
      this.renderer.toneMappingExposure = 1.0;
    }
    // Darker clear color to avoid overall washed look
    this.renderer.setClearColor(0x0b1220, 1);
    this.container.appendChild(this.renderer.domElement);

    // Post-processing with zero vignette; start at neutral exposure (WeatherSystem drives it)
    this.postFX = new PostFXSystem(this.renderer, { vignette: 0.0, grain: 0.0, exposure: 1.0 });

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x334455, 1.0);
    this.scene.add(hemi);
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(8, 12, 6);
    dir.castShadow = false; // no shadows
    dir.shadow.camera.near = 0.1;
    dir.shadow.camera.far = 50;
    dir.shadow.mapSize.set(1024, 1024);
    this.scene.add(dir);
    // Soft front fill light that follows the player to ensure subject visibility
    this.fillLight = new THREE.PointLight(0xffffff, 1.0, 30);
    this.fillLight.position.set(2, 3, 3);
    this.scene.add(this.fillLight);

    // Ground (scrolling if a texture is assigned at runtime)
    const groundGeo = new THREE.PlaneGeometry(200, 20, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x6f87ab, roughness: 0.9, metalness: 0.0 });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;
    this.ground.receiveShadow = false; // avoid darkening from large shadows
    this.scene.add(this.ground);

    // Background system encapsulates backdrop, parallax, and floor band
    this.background = new BackgroundSystem(this.scene);
    this.background.init();
    // Sky (clouds + stars)
    this.sky = new SkySystem(this.scene);
    this.sky.init();

    // Optional manual brightness tweak (kept subtle to not fight WeatherSystem)
    this._brightnessLevels = [0.9, 1.0, 1.15];
    this._brightnessIndex = 1; // start neutral
    const applyBrightness = () => {
      const k = this._brightnessLevels[this._brightnessIndex];
      if (this.postFX?.material?.uniforms?.exposure) {
        this.postFX.material.uniforms.exposure.value = k;
      }
      // Keep lights stable
      hemi.intensity = 1.0;
      ambient.intensity = 0.65;
      dir.intensity = 1.4;
      if (this.fillLight) this.fillLight.intensity = 1.0;
    };
    applyBrightness();
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'b') {
        this._brightnessIndex = (this._brightnessIndex + 1) % this._brightnessLevels.length;
        applyBrightness();
      }
    });

    // Systems
    // GLTF loader with DRACO support (in case models are compressed)
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);
    gltfLoader.setMeshoptDecoder(MeshoptDecoder);

    this.loader = new AssetLoader(gltfLoader);
    this.sounds = new SoundManager();
    this.player = null;
    this.obstacles = null;
    this.particles = null;

    // Game state
    this.isRunning = false;
    this.isPaused = false;
    this.gameOver = false;
    this.score = 0;
    this.speed = 8; // movement speed for environment/obstacles
    this.difficultyTimer = 0;
    this.timePlayed = 0;
    this._difficulty = 0; // 0..1
    this.hasStumbled = false;
    this.isStumbling = false;
    this.stumbleCooldown = 0;

    // Camera shake state
    this._shakeTime = 0;
    this._shakeDur = 0;
    this._shakeAmp = 0;
    this._shakePhase = Math.random() * Math.PI * 2;

    // Post-resize auto-fit frames to ensure proper vertical fit on mobile
    this._fitFramesRemaining = 0;

    // Camera defaults (Chrome Dino style side view)
    this._camTargetY = 2.2; // fixed vertical framing
    this._camZ = 10; // z is irrelevant for ortho scale but keeps consistent state
    this._prevGrounded = true;

    // High score
    this.highScoreKey = 'dino.highscore';
    this.highScore = Number(localStorage.getItem(this.highScoreKey) || 0);
    this.onHighScore?.(this.highScore);

    // Helpers state and global key bindings (H helpers, B toggle bg)
    this._helpers = { axes: null, grid: null, boxes: [] };
    this._bgVisible = true;
    // Desktop-only entity scale: make dino and obstacles slightly larger on non-touch desktop
    this._isDesktopWindows = false;
    this._entityScale = (() => {
      try {
        const w = window.innerWidth || 1024;
        const h = window.innerHeight || 768;
        const minDim = Math.min(w, h);
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const ua = (navigator.userAgent || '').toLowerCase();
        const plat = (navigator.platform || '').toLowerCase();
        const isWindows = ua.includes('windows') || plat.startsWith('win');
        // Only enlarge on Windows desktop (non-touch) with reasonably large viewport
        const isDesktopWindows = isWindows && !isTouch && minDim >= 720;
        this._isDesktopWindows = isDesktopWindows;
        return isDesktopWindows ? 2.55 : 1.0; // slightly larger on Windows desktop only
      } catch { return 1.0; }
    })();
    window.addEventListener('keydown', (e) => {
      const key = (e.key || '').toLowerCase();
      if (e.code === 'KeyH' || key === 'h') {
        this.toggleHelpers();
      } else if (e.code === 'KeyB' || key === 'b') {
        this._bgVisible = !this._bgVisible;
        this.background?.setVisible(this._bgVisible);
        console.log('[DEBUG] Background visible =', this._bgVisible);
      } else if (key === '1') {
        this.weather?.setWeather?.('sunny', 0.8);
        console.log('[Weather] sunny');
      } else if (key === '2') {
        this.weather?.setWeather?.('cloudy', 0.8);
        console.log('[Weather] cloudy');
      } else if (key === '3') {
        this.weather?.setWeather?.('rainy', 0.8);
        console.log('[Weather] rainy');
      } else if (key === '4') {
        this.weather?.setWeather?.('foggy', 0.8);
        console.log('[Weather] foggy');
      } else if (key === '5') {
        // Force-spawn a bird for testing visibility
        this.obstacles?.spawnBirdPublic?.();
        console.log('[Spawn] bird');
      }
    });
  }

  _setupOrthoCamera(aspect){
    const unitsHigh = this.unitsHigh; // world units visible vertically
    const halfH = unitsHigh * 0.5;
    const halfW = halfH * aspect;
    this.camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 200);
    // Chrome dino-style side view: camera positioned to show side profile
    // Place camera center so the player sits ~35% from the left (NDC ~ -0.35)
    // When player not yet created, assume player at -5 and compute bias accordingly
    // For orthographic: NDC_x = (player.x - laneX) / halfW -> laneX = player.x + 0.35*halfW
    const assumedPlayerX = -5;
    this.laneX = assumedPlayerX + 0.35 * halfW;
    this.camera.position.set(this.laneX, 2.0, 8);
    this.camera.lookAt(new THREE.Vector3(this.laneX, 1.0, 0));
  }

  _frameToObject(object3d) {
    // Compute bounds and frame camera so the object is fully visible
    const box = new THREE.Box3().setFromObject(object3d);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const center = sphere.center.clone();
    const radius = Math.max(sphere.radius, 0.5);

    if (this.camera.isOrthographicCamera) {
      // For ortho, keep a fixed side distance and center vertically
      const y = Math.max(1.5, center.y + Math.min(1.0, radius * 0.5));
      this.camera.position.set(-2, y, 12);
      this.camera.lookAt(new THREE.Vector3(-2, y - 0.2, 0));
      this.camera.updateProjectionMatrix();
    } else if (this.camera.isPerspectiveCamera) {
      // Distance based on vertical FOV
      const fov = THREE.MathUtils.degToRad(this.camera.fov);
      let dist = (radius / Math.tan(fov * 0.5)) * 1.2;
      dist = Math.max(6.0, dist); // keep a safe minimum distance
      this.camera.position.set(center.x + 0.6, Math.max(2.0, center.y + Math.max(1.2, radius * 0.8)), center.z + dist);
      this.camera.near = 0.1;
      this.camera.far = Math.max(200, dist + radius * 10);
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(center);
    }
  }

  async init() {
      await this.sounds.init({
        bg: '/sounds/bg_music.mp3',
        jump: '/sounds/jump.ogg',
        hit: '/sounds/hit.ogg',
        coin: '/sounds/coin.ogg',
        rain: '/sounds/rain.ogg', // optional; SoundManager handles missing safely
      });

      // Player
      this.player = new Player(this.scene, this.loader, this.sounds, this.particles);
      // Pass desktop-only scale before loading so Player can bake it into base scale
      this.player.globalScale = this._entityScale;
      await this.player.load('/models/dino.glb');
      // After player loads, refine vertical framing to player's center
      try {
        const box = new THREE.Box3().setFromObject(this.player.object);
        const center = box.getCenter(new THREE.Vector3());
        // Keep a comfortable headroom; clamp to sensible range
        this._camTargetY = THREE.MathUtils.clamp(center.y, 1.6, 3.2);
      } catch (e) { /* no-op */ }

      // For orthographic side camera we keep a fixed framing (no auto-zoom)
      if (this.camera.isOrthographicCamera) {
        const box = new THREE.Box3().setFromObject(this.player.object);
        this._playerBoxHelper = new THREE.Box3Helper(box, 0x22c55e);
        this._playerBoxHelper.visible = !!this._helpers?.axes; // tie visibility with helpers
        this.scene.add(this._playerBoxHelper);
        // Apply the fixed projection once
        this.onResize();
      }

      // Particles
      this.particles = new ParticleSystem(this.scene);
      // Obstacle manager
      this.obstacles = new ObstacleManager(this.scene, this.loader, this.sounds, this.particles);
      this.obstacles.globalScale = this._entityScale;
      await this.obstacles.prepare({
        cactusUrl: '/models/cactus.glb',
        coinUrl: '/models/coin.glb',
        birdUrl: '/models/bird.glb', // optional; falls back if missing
      });

      // Particles
      this.particles = new ParticleSystem(this.scene);
      // Weather after background/sky/sounds/post are ready
      this.weather = new WeatherSystem({
        scene: this.scene,
        sky: this.sky,
        background: this.background,
        sounds: this.sounds,
        postFX: this.postFX,
      });
      // Apply initial weather immediately so exposure/fog/tints are set from frame 0
      this.weather.setWeather('sunny', 0.0);
      // init complete
  }

  async start() {
    this.resetState();
    this.sounds.playBgm();
    this.isRunning = true;
    this.loop();
  }

  pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.sounds.pauseBgm();
    this.onPause?.();
  }

  resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.sounds.resumeBgm();
    this.clock.getDelta(); // flush delta to avoid spike
    this.onResume?.();
  }

  async restart() {
    // Clear entities and reset
    this.clearSceneTransient();
    this.player.reset();
    this.obstacles.reset();
    this.resetState();
    this.isRunning = true;
    this.isPaused = false;
    this.gameOver = false;
    this.sounds.playBgm();
    this.clock.getDelta(); // flush delta
    this.loop();
  }

  resetState() {
    this.score = 0;
    this.speed = 8;
    this.difficultyTimer = 0;
    this.timePlayed = 0;
    this._difficulty = 0;
    this.clock.start();
    this._prevGrounded = true;
    this.hasStumbled = false;
    this.isStumbling = false;
    this.stumbleCooldown = 0;
  }

  clearSceneTransient() {
    this.obstacles?.dispose();
  }

  jump(mult = 1) {
    this.player?.jump(mult);
    if (this.particles && this.player.object.position.y < 0.5) {
      const pos = this.player.object.position;
      this.particles.spawnJumpParticles(pos.x, pos.z, 5);
    }
  }
  setJumpHeld(held) { this.player?.setJumpHeld?.(held); }

  onResize() {
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width || this.container.clientWidth));
    const h = Math.max(1, Math.round(rect.height || this.container.clientHeight));
    if (this.camera.isPerspectiveCamera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    } else if (this.camera.isOrthographicCamera) {
      const aspect = w / h;
      let halfH;
      // Track vertical bounds if we have the player
      let _top = null, _bottom = null;
      // If we have the player, compute a frustum that fits ground and head with margins
      if (this.player?.object) {
        const box = new THREE.Box3().setFromObject(this.player.object);
        const headY = box.max.y; // feet are grounded near y=0
        // Slightly larger safety margins for mobile portrait devices
        const topMargin = aspect < 0.6 ? 1.2 : (aspect < 0.8 ? 1.0 : 0.7);   // extra space above head
        const bottomMargin = aspect < 0.6 ? 0.6 : (aspect < 0.8 ? 0.5 : 0.35); // space below ground band
        const top = headY + topMargin;
        const bottom = -bottomMargin;
        _top = top; _bottom = bottom;
        // Compute desired center so ground (y=0) appears ~18% from bottom of screen
        // For ortho, frustum is [centerY - halfH, centerY + halfH]
        // We want 0 to be at bottom + 0.18 * unitsHigh => centerY = halfH - 0.18 * unitsHigh
        // We'll clamp later to ensure head/top remain visible.
        // Frustum height covers full range; customize per platform
        let units = (top - bottom);
        if (this._isDesktopWindows) {
          // On Windows desktop: do not boost for portrait; keep tighter world height
          this.unitsHigh = THREE.MathUtils.clamp(units, 10, 24);
        } else {
          // Mobile and others: apply portrait boosts and generous minimums
          const portraitBoost = aspect < 0.55 ? 1.5 : (aspect < 0.8 ? 1.25 : 1.0);
          units *= portraitBoost;
          // Minimum world height to keep sense of scale
          this.unitsHigh = THREE.MathUtils.clamp(units, 12, 38);
          // Balanced global zoom-out for portrait so dino is small but readable
          let minUnits = 36;
          if (aspect < 1.0) minUnits = Math.max(minUnits, 40);
          if (aspect < 0.75) minUnits = Math.max(minUnits, 46);
          if (aspect < 0.6) minUnits = Math.max(minUnits, 52);
          // Optional override via localStorage: localStorage.setItem('dino.minUnits', '48')
          const lsMin = Number(localStorage.getItem('dino.minUnits'));
          if (!Number.isNaN(lsMin) && lsMin > 0) minUnits = lsMin;
          this.unitsHigh = Math.max(this.unitsHigh, minUnits);
        }
      } else {
        // Fallback: gently zoom out on tall phones
        const add = Math.max(0, Math.min(12, (0.85 - Math.min(0.85, aspect)) * 16));
        this.unitsHigh = 16 + add;
      }
      halfH = this.unitsHigh * 0.5;
      // Apply ground bias center while ensuring top/bottom bounds are respected
      const desiredCenter = halfH - 0.18 * (this.unitsHigh);
      // Ensure head/top still visible when we have bounds
      const minCenter = (_top !== null && _bottom !== null) ? ((_top + _bottom) * 0.5) : desiredCenter;
      this._camTargetY = Math.max(minCenter, desiredCenter);
      const halfW = halfH * aspect;
      this.camera.left = -halfW;
      this.camera.right = halfW;
      this.camera.top = halfH;
      this.camera.bottom = -halfH;
      this.camera.updateProjectionMatrix();
      // Keep the player visible with a left bias (~33% from left)
      const px = this.player?.object?.position?.x ?? -5;
      this.laneX = px + 0.33 * halfW;
    }
    // Update DPR on resize to handle zoom/orientation changes
    const isSmallScreen = Math.min(window.innerWidth || w, window.innerHeight || h) <= 768;
    const dprCap = isSmallScreen ? 1.25 : 1.75;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    this.renderer.setSize(w, h);
    this.postFX?.onResize(w, h);
    // Run a moderate auto-fit after resize to catch mobile UI changes
    this._fitFramesRemaining = 32;
  }

  toggleMute() {
    return this.sounds.toggleMute();
  }

  endGame() {
    this.isRunning = false;
    this.gameOver = true;
    this.sounds.stopBgm();
    this.onGameOver?.(this.score);
    if (this.score > this.highScore) {
      this.highScore = Math.floor(this.score);
      localStorage.setItem(this.highScoreKey, String(this.highScore));
      this.onHighScore?.(this.highScore);
    }
  }

  loop() {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this.loop());
    if (this.isPaused) return;

    const dt = Math.min(0.033, this.clock.getDelta());
    this.timePlayed += dt;

    if (this.isStumbling) {
      this.stumbleCooldown -= dt;
      if (this.stumbleCooldown <= 0) {
        this.isStumbling = false;
      }
    }

    // Continuous difficulty 0..1 and speed curve (ease-out)
    // Increase primarily with time, lightly with score
    const t = this.timePlayed;
    // Even slower difficulty ramp so speed increases gradually
    const dTime = 1.0 - Math.exp(-t * 0.020);
    const dScore = Math.min(1, (this.score / 4000) * 0.12);
    this._difficulty = Math.min(1, dTime * 0.8 + dScore * 0.3);
    // Slightly lower baseline and ceiling for a calmer pace
    const base = 5.8, max = 11.5;
    const easeOut = (x)=> 1 - Math.pow(1 - x, 2);
    let currentSpeed = THREE.MathUtils.lerp(base, max, easeOut(this._difficulty));
    if (this.isStumbling) {
      currentSpeed *= 0.5;
    }
    this.speed = currentSpeed;
    this.obstacles.setSpeed(this.speed);
    this.obstacles.setDifficulty(this._difficulty);
    this.player.setDifficulty?.(this._difficulty);
    this.sounds.setDifficulty?.(this._difficulty);

    // Update systems
    const wasGrounded = this.player.isOnGround;
    this.player.update(dt);
    // Keep a small fill light near the player so they are always visible
    if (this.fillLight && this.player?.object) {
      const p = this.player.object.position;
      const target = new THREE.Vector3(p.x + 2.0, Math.max(2.5, p.y + 2.5), p.z + 3.0);
      this.fillLight.position.lerp(target, Math.min(1, dt * 8));
    }
    if (!wasGrounded && this.player.isOnGround) {
      // Spawn landing dust at player's approximate feet position
      this.particles?.spawnLandParticles(this.player.object.position.x, this.player.object.position.z, 7);
    }
    this.obstacles.update(dt);
    this.particles?.update(dt);

    // Collision checks - immediate game over on hit
    if (this.obstacles.collidesWith(this.player.getCollider())) {
      this.sounds.playHit();
      this.sounds.duck?.(500, 0.18);
      this.triggerShake(0.25, 0.25);
      this.endGame();
      return;
    }

    const coinRes = this.obstacles.collectCoins(this.player.getCollider());
    if (coinRes && (coinRes.regularCoins > 0 || coinRes.powerUpCoins > 0)) {
      this.sounds.playCoin();
      const scoreGained = coinRes.regularCoins * 50 + coinRes.powerUpCoins * 250;
      this.score += scoreGained;
      this.onCoin?.(scoreGained);
      this.triggerShake(0.06, 0.12);

      // Spawn sparkles at each collected coin's position
      if (this.particles && coinRes.positions?.length > 0) {
        for (const pos of coinRes.positions) {
          this.particles.spawnSparkleAt(pos.x, pos.y, pos.z, 8);
        }
      }
    }

    // Score over time (slower, mostly time-based with mild speed influence)
    this.score += dt * (6.0 + this.speed * 0.6);
    this.onScore?.(this.score);

    // Fixed side-on camera (Chrome Dino style)
    if (this.camera.isOrthographicCamera) {
      // Apply camera shake offset
      let offX = 0, offY = 0;
      if (this._shakeTime < this._shakeDur && this._shakeDur > 0) {
        const t = this._shakeTime / this._shakeDur;
        const falloff = 1.0 - Math.min(1.0, t);
        const sx = Math.sin((this._shakePhase + this._shakeTime * 40.0));
        const sy = Math.sin((this._shakePhase * 0.7 + this._shakeTime * 33.0));
        offX = sx * this._shakeAmp * falloff * 0.3;
        offY = sy * this._shakeAmp * falloff * 0.2;
        this._shakeTime += dt;
      }
      this.camera.position.set(this.laneX + offX, this._camTargetY + offY, this._camZ);
      this.camera.lookAt(new THREE.Vector3(this.laneX, this._camTargetY - 0.25, 0));
    }

    // After a resize, for a few frames, ensure the player fits vertically
    if (this._fitFramesRemaining > 0 && this.player?.object && this.camera.isOrthographicCamera) {
      const rect = this.container.getBoundingClientRect();
      const aspect = Math.max(1, Math.round(rect.width || this.container.clientWidth)) / Math.max(1, Math.round(rect.height || this.container.clientHeight));
      const box = new THREE.Box3().setFromObject(this.player.object);
      const headY = box.max.y;
      const topMargin = aspect < 0.6 ? 1.2 : (aspect < 0.8 ? 1.0 : 0.7);
      const bottomMargin = aspect < 0.6 ? 0.6 : (aspect < 0.8 ? 0.5 : 0.35);
      const top = headY + topMargin;
      const bottom = -bottomMargin;
      const mid = (top + bottom) * 0.5;
      const targetUnits = (top - bottom) * (aspect < 0.55 ? 1.5 : (aspect < 0.8 ? 1.25 : 1.0));
      if (this.unitsHigh < targetUnits - 0.01) {
        // Expand quickly to avoid any clipping
        this.unitsHigh = THREE.MathUtils.clamp(THREE.MathUtils.lerp(this.unitsHigh, targetUnits, 0.6), 12, 40);
        const halfH = this.unitsHigh * 0.5;
        const halfW = halfH * aspect;
        this.camera.left = -halfW; this.camera.right = halfW;
        this.camera.top = halfH; this.camera.bottom = -halfH;
        this.camera.updateProjectionMatrix();
      }
      this._camTargetY = mid;
      this._fitFramesRemaining--;
    }

    // Keep player bbox helper synced for accurate diagnostics
    if (this._playerBoxHelper) {
      this._playerBoxHelper.box.setFromObject(this.player.object);
    }

    // Scroll ground texture if present
    if (this._groundTex) {
      this._groundTex.offset.x -= dt * (this.speed * 0.08);
    }
    // Background parallax and band scrolling
    this.background.update(dt, this.speed);
    // Sky and Weather
    this.sky?.update(dt, this.speed);
    this.weather?.update(dt, this.speed);
    // Allow sound manager to recover ducking volume
    this.sounds.update?.(dt);
    // Render (through post-processing)
    if (this.postFX) this.postFX.render(this.scene, this.camera);
    else this.renderer.render(this.scene, this.camera);
  }

  getDifficulty(){ return this._difficulty; }

  stumble() {
    if (this.isStumbling) return;

    this.hasStumbled = true;
    this.isStumbling = true;
    this.stumbleCooldown = 1.5;

    this.sounds.playHit();
    this.triggerShake(0.2, 0.4);
    this.player.stumble?.();
  }

  triggerShake(strength = 0.2, duration = 0.2) {
    this._shakeAmp = Math.max(this._shakeAmp * 0.5, strength);
    this._shakeDur = Math.max(this._shakeDur * 0.5, duration);
    this._shakeTime = 0;
    this._shakePhase = Math.random() * Math.PI * 2;
  }

  _logDebugCam() {
    const box = new THREE.Box3().setFromObject(this.player.object);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    console.log('[DEBUG] unitsHigh=', this.unitsHigh,
      'player size=', size, 'center=', center,
      'cam pos=', this.camera.position, 'lookY=', this._camTargetY);
  }

  toggleHelpers() {
    if (this._helpers.axes) {
      this.scene.remove(this._helpers.axes, this._helpers.grid);
      this._helpers.axes = null; this._helpers.grid = null;
      if (this._playerBoxHelper) this._playerBoxHelper.visible = false;
    } else {
      this._helpers.axes = new THREE.AxesHelper(2);
      this._helpers.grid = new THREE.GridHelper(200, 200, 0x334155, 0x1f2937);
      this._helpers.grid.position.y = 0;
      this.scene.add(this._helpers.axes, this._helpers.grid);
      if (this._playerBoxHelper) this._playerBoxHelper.visible = true;
    }
  }

  fitCameraToPlayer() {
    const box = new THREE.Box3().setFromObject(this.player.object);
    const size = new THREE.Vector3(); box.getSize(size);
    // Slight margin
    this.unitsHigh = Math.max(12, size.y * 4.8);
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const halfH = this.unitsHigh * 0.5;
    const halfW = halfH * aspect;
    if (this.camera.isOrthographicCamera) {
      this.camera.left = -halfW; this.camera.right = halfW;
      this.camera.top = halfH; this.camera.bottom = -halfH;
      this.camera.updateProjectionMatrix();
    }
    this._logDebugCam();
  }

  resetCameraDefaults() {
    this.unitsHigh = 16;
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const halfH = this.unitsHigh * 0.5;
    const halfW = halfH * aspect;
    if (this.camera.isOrthographicCamera) {
      this.camera.left = -halfW; this.camera.right = halfW;
      this.camera.top = halfH; this.camera.bottom = -halfH;
      this.camera.updateProjectionMatrix();
    }
    this._camTargetY = 2.0;
    this._camZ = 8;
    this._logDebugCam();
  }
}
