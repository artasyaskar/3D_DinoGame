import * as THREE from 'three';

export class Player {
  constructor(scene, assetLoader, sounds) {
    this.scene = scene;
    this.loader = assetLoader;
    this.sounds = sounds;

    this.object = new THREE.Group();
    this.object.position.set(-5, 0, 0); // place on left side like Chrome Dino
    this.scene.add(this.object);

    this.mixer = null;
    this.actions = {};
    this.currentAction = null;

    // Movement
    this.velY = 0;
    this.gravity = -26;
    this.jumpStrength = 13.6;
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

    // Collider
    this.collider = new THREE.Box3();
    this.colliderHelper = null; // for debug if needed

    // Shadow receiver/caster toggle later
    this._shadowMesh = null;

    this.ducking = false;
    this._baseModelScale = new THREE.Vector3(1, 1, 1);
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
      this._baseModelScale = model.scale.clone();
    }

    // Recompute bounds after scaling and ground the model (feet at y=0)
    box = new THREE.Box3().setFromObject(model);
    box.getSize(size);
    box.getCenter(center);
    model.position.y += (size.y / 2) - center.y;

    // Turn model to face +X (to the right) so we see its side profile
    model.rotation.y = Math.PI / 2;

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
    }

    this._recalcCollider();
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

  jump() {
    // Buffer the jump request; it will be executed in update() when eligible
    this.jumpBuffered = true;
    this.jumpBufferTimer = this.jumpBufferMax;
  }

  setDifficulty(d) {
    // Clamp and store
    this._diff = Math.max(0, Math.min(1, d || 0));
    // Make jumps only slightly tighter at higher speeds (keep height playable):
    this._jumpMul = 1 - 0.06 * this._diff; // up to ~6% lower apex
    this._gravMul = 1 + 0.08 * this._diff; // up to ~8% stronger gravity
  }

  update(dt) {
    // Animate
    if (this.mixer) this.mixer.update(dt);

    // Timers for jump feel
    if (this.jumpBuffered) this.jumpBufferTimer -= dt; if (this.jumpBufferTimer <= 0) { this.jumpBuffered = false; }
    if (!this.isOnGround) this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);

    // Vertical physics
    this.velY += (this.gravity * this._gravMul) * dt;
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
      }
    }
    // Detect leaving ground to start coyote window
    if (this._wasGrounded && !this.isOnGround) {
      this.coyoteTimer = this.coyoteTimeMax;
    }
    this._wasGrounded = this.isOnGround;

    // Execute buffered jump if eligible
    if (this.jumpBuffered && (this.isOnGround || this.coyoteTimer > 0)) {
      this.jumpBuffered = false;
      this.velY = this.jumpStrength * this._jumpMul;
      this.isOnGround = false;
      this.sounds.playJump();
      const jumpAct = this._findAction(['jump']);
      if (jumpAct) this._play(jumpAct, 0.1);
    }

    // Crouch transform
    const model = this.object.children[0];
    if (model) {
        const targetScaleY = this.ducking ? 0.6 : 1.0;
        const currentScaleY = model.scale.y / this._baseModelScale.y;
        const newScaleY = currentScaleY + (targetScaleY - currentScaleY) * (dt * 20);
        model.scale.y = this._baseModelScale.y * newScaleY;
    }

    // Shadow reacts to height: higher jump -> smaller and lighter shadow
    if (this._shadowMesh) {
      const h = Math.max(0, this.object.position.y);
      const k = 1 / (1 + h * 1.2); // shrink with height
      this._shadowMesh.scale.set(this._shadowBaseScale.x * k, this._shadowBaseScale.y * k, 1);
      const mat = this._shadowMesh.material;
      mat.opacity = 0.45 * k + 0.15; // fade when higher
    }

    // Always look forward
    this.object.rotation.y = 0;

    // Update collider
    this._recalcCollider();
    // No collider modification for ducking
  }

  _recalcCollider() {
    this.collider.setFromObject(this.object);
    // Tighten collider slightly for fairness
    const min = this.collider.min.clone();
    const max = this.collider.max.clone();
    const inset = 0.05 * (max.x - min.x);
    this.collider.min.set(min.x + inset, min.y, min.z + inset);
    this.collider.max.set(max.x - inset, max.y, max.z - inset);
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
