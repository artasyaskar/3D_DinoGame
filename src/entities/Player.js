import * as THREE from 'three';

export class Player {
  constructor(scene, assetLoader, sounds, particles) {
    this.scene = scene;
    this.loader = assetLoader;
    this.sounds = sounds;
    this.particles = particles;
    this._colliderScale = 1.0; // Scale factor for collider size (1.0 = exact fit)

    this.object = new THREE.Group();
    this.object.position.set(-5, 0, 0); // place on left side like Chrome Dino
    this.scene.add(this.object);

    this.mixer = null;
    this.actions = {};
    this.currentAction = null;
    this._hasJumpAnim = false; // whether a proper jump clip exists
    this._airbornePause = false; // when true, pause run/walk while in air

    // Movement
    this.velY = 0;
    this.gravity = -26;
    // Slightly higher default jump to better match Chrome Dino feel
    this.jumpStrength = 15.6;
    this._diff = 0; // 0..1 difficulty input from Game
    this._jumpMul = 1; // scales jumpStrength slightly with difficulty
    this._gravMul = 1; // reduces gravity magnitude slightly with difficulty
    this.isOnGround = true;
    // Jump feel helpers
    this.coyoteTimeMax = 0.14; // seconds
    this.coyoteTimer = 0;
    this.jumpBufferMax = 0.14; // seconds
    this.jumpBufferTimer = 0;
    this.jumpBuffered = false;
    this._wasGrounded = true;
    this.jumpHeld = false; // input: whether jump key is currently held

    // Collider
    this.collider = new THREE.Box3();
    this.colliderHelper = null; // for debug if needed
    this._colliderOffset = new THREE.Vector3(0, 0, 0); // Fine-tune collider position

    // Shadow receiver/caster toggle later
    this._shadowMesh = null;

    this.ducking = false;
    this._baseModelScale = new THREE.Vector3(1, 1, 1);
    // Movement speed proxy from Game (used to scale run animation speed)
    this._moveSpeed = 6;
  }

  setJumpHeld(held) {
    this.jumpHeld = !!held;
  }

  async load(url) {
    const gltf = await this.loader.loadGLB(url);
    const model = gltf.scene;

    // Normalize scale and position; disable shadows and force unlit material
    model.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = false;
        c.receiveShadow = false;
        if (c.material) {
          const oldMat = c.material;
          const newMat = new THREE.MeshBasicMaterial();

          if (oldMat.map) newMat.map = oldMat.map;
          if (oldMat.color) newMat.color.copy(oldMat.color);
          if (oldMat.vertexColors) newMat.vertexColors = true;
          
          if (oldMat.transparent) newMat.transparent = true;
          if (oldMat.alphaMap) newMat.alphaMap = oldMat.alphaMap;
          if (oldMat.opacity < 1.0) newMat.opacity = oldMat.opacity;

          if (c.isSkinnedMesh) newMat.skinning = true;

          c.material = newMat;
        }
      }
    });

    // Compute initial bounds to decide scale
    let box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Target player height in world units (reduce size for better scale vs obstacles)
    const targetHeight = 0.45;
    if (size.y > 0) {
      const scale = targetHeight / size.y;
      model.scale.multiplyScalar(scale);
      // On small portrait screens, shrink aggressively so the dino fully fits
      const w = (typeof window !== 'undefined') ? window.innerWidth : 1024;
      const h = (typeof window !== 'undefined') ? window.innerHeight : 768;
      const aspect = w / Math.max(1, h);
      const minDim = Math.min(w, h);
      const portrait = h >= w;
      if (portrait && minDim <= 820) {
        // Tiered multiplier: ultra-small phones get more shrink
        let mul = 0.82; // default extra shrink
        if (minDim <= 480 || aspect < 0.55) mul = 0.68; // very small/narrow screens
        else if (minDim <= 720) mul = 0.75;
        model.scale.multiplyScalar(mul);
      } else if (!portrait && h <= 360) {
        // Extremely short landscape screens: apply a small shrink
        model.scale.multiplyScalar(0.92);
      }
      // Desktop-only enlargement set by Game via this.globalScale (defaults to 1)
      const gs = (typeof this.globalScale === 'number' && isFinite(this.globalScale)) ? this.globalScale : 1.0;
      if (gs !== 1.0) model.scale.multiplyScalar(gs);
      this._baseModelScale = model.scale.clone();
    }

    // Recompute bounds after scaling and ground the model (feet at y=0)
    box = new THREE.Box3().setFromObject(model);
    box.getSize(size);
    box.getCenter(center);
    model.position.y += (size.y / 2) - center.y;

    // Flip model so the head appears on the LEFT side on screen
    // (face -X direction instead of +X)
    model.rotation.y = -Math.PI / 2;

    this.object.add(model);

    // Create a soft blob shadow using a small canvas radial gradient
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(canvas);
    shadowTex.wrapS = shadowTex.wrapT = THREE.ClampToEdgeWrapping;
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
    const shadowGeo = new THREE.PlaneGeometry(1.2, 0.6);
    this._shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this._shadowMesh.rotation.x = -Math.PI/2;
    this._shadowMesh.position.set(-0.05, 0.001, 0); // slight offset so it's visible under feet
    this._shadowBaseScale = new THREE.Vector2(1.4, 0.9);
    this.object.add(this._shadowMesh);
    // Hide blob shadow decal to avoid any perceived darkening
    this._shadowMesh.visible = false;

    // Animations (if animation clips are present)
    if (gltf.animations?.length) {
      this.mixer = new THREE.AnimationMixer(model);
      for (const clip of gltf.animations) {
        const name = clip.name.toLowerCase();
        this.actions[name] = this.mixer.clipAction(clip);
      }
      // Choose sensible defaults
      const runAction = this._findAction(['run', 'walk', 'idle']) || this._firstAction();
      this._play(runAction, 0.25);
      // Apply current move-speed to mixer timeScale so dino visibly speeds up with game
      this._applyMixerSpeed();
      // Detect whether a proper jump animation exists
      this._hasJumpAnim = !!this._findAction(['jump']);
    }

    this._recalcCollider();
  }

  // External hook from Game: provide current world/game speed and update animation pace
  setMoveSpeed(v) {
    if (!isFinite(v)) return;
    this._moveSpeed = v;
    this._applyMixerSpeed();
  }

  _applyMixerSpeed() {
    if (!this.mixer) return;
    // If we're intentionally pausing animation mid-air, keep mixer halted
    if (this._airbornePause) { this.mixer.timeScale = 0; return; }
    // Map 6..12 game speed to ~1.0..1.7 animation speed; clamp to safe range
    const animSpeed = THREE.MathUtils.clamp(
      THREE.MathUtils.mapLinear(this._moveSpeed ?? 6, 6, 12, 1.0, 1.7),
      0.6,
      2.0
    );
    this.mixer.timeScale = animSpeed;
  }

  _firstAction() {
    const keys = Object.keys(this.actions);
    return keys.length ? this.actions[keys[0]] : null;
  }

  _findAction(names) {
    for (const n of names) {
      const key = Object.keys(this.actions).find(k => k.includes(n));
      if (key) return this.actions[key];
    }
    return null;
  }

  _play(action, fade = 0.2) {
    if (!action) return;
    if (this.currentAction === action) return;
    if (this.currentAction) this.currentAction.fadeOut(fade);
    this.currentAction = action;
    this.currentAction.reset().fadeIn(fade).play();
  }

  reset() {
    this.object.position.set(-5, 0, 0);
    this.velY = 0;
    this.isOnGround = true;
  }

  // Allow external multiplier for boosted jump (e.g., double-tap)
  jump(mult = 1) {
    const m = Math.max(1, mult || 1);
    // If we can jump now, do it immediately for snappy input
    if (this.isOnGround || this.coyoteTimer > 0) {
      this.jumpBuffered = false;
      this._pendingJumpMul = 1;
      this.velY = this.jumpStrength * this._jumpMul * m;
      this.isOnGround = false;
      this.coyoteTimer = 0;
      this.sounds.playJump();
      // Freeze current running pose mid-air: do NOT switch to jump clip
      if (this.mixer) { this._airbornePause = true; this.mixer.timeScale = 0; }
    } else {
      // Otherwise, buffer the jump to execute at next opportunity
      this.jumpBuffered = true;
      this.jumpBufferTimer = this.jumpBufferMax;
      this._pendingJumpMul = m;
    }

    // Spawn jump dust particles for feedback, but only if near ground
    if (this.particles && this.object.position.y < 0.5) {
      const pos = this.object.position;
      this.particles.spawnDustAt(pos.x, pos.z, 5);
    }
  }

  setDifficulty(d) {
    // Clamp and store
    this._diff = Math.max(0, Math.min(1, d || 0));
    // Make jumps only slightly tighter at higher speeds (keep height playable):
    this._jumpMul = 1 - 0.06 * this._diff; // up to ~6% lower apex
    this._gravMul = 1 + 0.08 * this._diff; // up to ~8% stronger gravity
  }

  stumble() {
    const stumbleAction = this._findAction(['stumble', 'hit']);
    if (stumbleAction) {
      this._play(stumbleAction, 0.1);
      setTimeout(() => {
        const idleAction = this._findAction(['run', 'walk', 'idle']) || this._firstAction();
        this._play(idleAction, 0.2);
      }, 1000);
    } else {
      console.log("No stumble animation found for the player.");
    }
  }

  update(dt) {
    // Animate
    if (this.mixer) this.mixer.update(dt);

    // Timers for jump feel
    if (this.jumpBuffered) this.jumpBufferTimer -= dt; if (this.jumpBufferTimer <= 0) { this.jumpBuffered = false; }
    if (!this.isOnGround) this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);

    // Vertical physics with variable jump height (Chrome Dino-like)
    // Adjust gravity depending on ascent/descend and whether jump is held
    let g = this.gravity * this._gravMul;
    if (this.velY > 0) {
      // Ascending: if not holding jump, increase gravity to cut jump short
      // When holding, reduce gravity more to allow a higher apex
      g *= (this.jumpHeld ? 0.88 : 1.85);
    } else if (this.velY < 0) {
      // Falling: slightly stronger gravity for snappier landings
      g *= 1.25;
    }
    this.velY += g * dt;
    this.object.position.y += this.velY * dt;
    if (this.object.position.y <= 0) {
      this.object.position.y = 0;
      this.velY = 0;
      if (!this.isOnGround) {
        this.isOnGround = true;
        // Reset coyote timer when we land
        this.coyoteTimer = this.coyoteTimeMax;
        // Return to run/walk/idle
        const act = this._findAction(['run', 'walk', 'idle']) || this._firstAction();
        this._play(act, 0.15);
        // Resume run speed if we paused during airborne
        if (this._airbornePause) {
          this._airbornePause = false;
          this._applyMixerSpeed();
        }
      }
    }
    // Detect leaving ground to start coyote window
    if (this._wasGrounded && !this.isOnGround) {
      this.coyoteTimer = this.coyoteTimeMax;
    }
    this._wasGrounded = this.isOnGround;

    // Robust enforcement: pause in air, resume on ground
    if (this.mixer) {
      if (!this.isOnGround) {
        this.mixer.timeScale = 0; // freeze feet while airborne
      } else {
        // If something left the mixer paused, resume to the proper speed
        if (this.mixer.timeScale === 0) {
          this._airbornePause = false;
          this._applyMixerSpeed();
        }
      }
    }

    // Execute buffered jump if eligible
    if (this.jumpBuffered && (this.isOnGround || this.coyoteTimer > 0)) {
      this.jumpBuffered = false;
      const mul = (this._pendingJumpMul || 1);
      this._pendingJumpMul = 1;
      this.velY = this.jumpStrength * this._jumpMul * mul;
      this.isOnGround = false;
      this.sounds.playJump();
      // Freeze current running pose mid-air for buffered jumps as well
      if (this.mixer) { this._airbornePause = true; this.mixer.timeScale = 0; }
    }

    // Always look forward
    this.object.rotation.y = 0;

    // Update collider
    this._recalcCollider();
    // No collider modification for ducking
  }

  _recalcCollider() {
    this.collider.setFromObject(this.object);
    
    // Get current collider size and center
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    this.collider.getSize(size);
    this.collider.getCenter(center);
    
    // Apply custom scaling to make the collider more accurate for the dino
    const scaledSize = size.clone().multiplyScalar(this._colliderScale);
    
    // Apply offset to position the collider better (e.g., move it slightly forward/back)
    center.add(this._colliderOffset);
    
    // Set new collider bounds with adjusted size and position
    this.collider.setFromCenterAndSize(center, scaledSize);
  }

  getCollider() {
    return this.collider.clone();
  }

  setDuck(isDucking) {
    if (this.ducking === isDucking) return;
    this.ducking = isDucking;

    // Animation handling
    const idleAction = this._findAction(['run', 'walk', 'idle']) || this._firstAction();
    const duckAction = this._findAction(['duck', 'crouch']);

    if (isDucking) {
      if (duckAction) {
        this._play(duckAction, 0.1);
      }
    } else {
      // Transition back to idle/run
      if (duckAction && this.currentAction === duckAction) {
        this._play(idleAction, 0.2);
      }
    }
  }
}
