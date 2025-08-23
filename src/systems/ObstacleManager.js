import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

// Simple endless-runner obstacle and coin system
export class ObstacleManager {
  constructor(scene, assetLoader, sounds) {
    this.scene = scene;
    this.loader = assetLoader;
    this.sounds = sounds;

    this.speed = 8;

    this.cactusProto = null;
    this.enemyProto = null;
    this.coinProto = null;
    this.birdProto = null; // optional flying obstacle
    this.birdGltf = null;
    this.enemyGltf = null;

    this.active = [];
    this.coins = [];

    this.spawnTimer = 0;
    this.spawnInterval = 1.45; // slightly longer baseline; reduced with speed
    this.difficulty = 0; // 0..1 scalar from Game
    this._postDoubleCooldown = 0; // extra cooldown after a double obstacle to avoid walls

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Lane center z=0; keep slight random z offset within [-1.2,1.2]
    this.zSpread = 1.2;
    // Spacing control (world-distance based like Chrome Dino)
    this.distSinceLast = 999; // world units traveled since last obstacle group
    this._nextGapWorld = 0;   // required world-distance until next spawn allowed
    // Bird cadence timers
    this._birdGuaranteeT = 0; // hard guarantee backup
    this._birdTimer = 0;      // periodic natural spawns
    this._birdNext = 6 + Math.random()*2; // 6-8s between natural spawns (harder)
    // Pool placeholders (future): keep arrays for potential pooling
    this._dead = [];
  }

  // Helper: build collider entry with cached size/offset
  _buildEntry(wrapper, type) {
    const box = new THREE.Box3().setFromObject(wrapper);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size); box.getCenter(center);
    const offset = center.sub(wrapper.position.clone());
    return { object: wrapper, collider: new THREE.Box3(), type, _colSize: size.clone(), _colOffset: offset.clone() };
  }

  _spawnEnemy() {
    const wrapper = new THREE.Group();
    // Use SkeletonUtils.clone to preserve skinning/animation if present
    const primary = (this.enemyProto ? cloneSkeleton(this.enemyProto) : this._makeEnemyFallback());
    wrapper.add(primary);

    // Slightly larger than cactus by default, with some variation (1.1..1.4)
    const s = 1.1 + Math.random() * 0.3;
    primary.scale.multiplyScalar(s);

    // Ground base to y=0
    let box = new THREE.Box3().setFromObject(wrapper);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size); box.getCenter(center);
    primary.position.y += (size.y/2) - center.y;

    // Spawn position and lane; face toward player (left)
    wrapper.position.set(15 + Math.random()*9, 0, (Math.random()*2-1)*this.zSpread);
    // Apply yaw on the model so its front points to the player (left)
    // Many GLBs use +Z as forward; our side view wants left-facing along -X.
    primary.rotation.y += Math.PI;

    // Setup walk/run animation if available; otherwise slight body bob
    wrapper.userData = wrapper.userData || {};
    const u = {
      t: Math.random() * Math.PI * 2,
      mixer: null,
      baseRot: 0,
      baseY: 0,
    };
    if (this.enemyGltf?.animations?.length) {
      try {
        const mixer = new THREE.AnimationMixer(primary);
        const names = this.enemyGltf.animations.map(c=>c.name.toLowerCase());
        let clip = null;
        const pick = ['run', 'walk', 'jog', 'idle'];
        for (const key of pick) {
          const idx = names.findIndex(n=>n.includes(key));
          if (idx >= 0) { clip = this.enemyGltf.animations[idx]; break; }
        }
        if (!clip) clip = this.enemyGltf.animations[0];
        const action = mixer.clipAction(clip);
        action.clampWhenFinished = false;
        action.loop = THREE.LoopRepeat;
        action.play();
        u.mixer = mixer;
      } catch(_) { /* fallback below */ }
    }
    wrapper.userData.enemy = u;

    // Ensure correct drawing properties
    wrapper.traverse((c)=>{
      if (c.isMesh && c.material) {
        c.material.depthTest = true; c.material.depthWrite = true;
      }
    });
    this.group.add(wrapper);
    return this._buildEntry(wrapper, 'enemy');
  }

  _scheduleNextGap(wasDouble = false) {
    // Compute next required world-distance (in units) before another spawn is allowed.
    // Keeps on-screen reaction time consistent across speeds (Chrome Dino style).
    const d = this.difficulty;
    // Reaction-time window scales with difficulty
    const reactMin = THREE.MathUtils.lerp(1.15, 0.95, d);
    const reactMax = THREE.MathUtils.lerp(1.45, 1.15, d);
    const reactT = THREE.MathUtils.lerp(reactMin, reactMax, Math.random());
    // A small absolute gap baseline in world units
    const baseGap = THREE.MathUtils.lerp(7.8, 6.2, d);
    let gap = baseGap + Math.max(0, this.speed) * reactT;
    if (wasDouble) gap += 2.5; // extra forgiveness after doubles
    // Clamp
    const minGap = 10.0;
    const maxGap = 24.0;
    this._nextGapWorld = THREE.MathUtils.clamp(gap, minGap, maxGap);
  }

  _makeCactusFallback() {
    const geo = new THREE.BoxGeometry(0.6, 1.2, 0.4);
    const mat = new THREE.MeshBasicMaterial({ color: 0x3ddc84 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false; mesh.receiveShadow = false;
    return mesh;
  }

  _makeBirdFallback() {
    const geo = new THREE.BoxGeometry(1.2, 0.45, 0.6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff3366 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false; mesh.receiveShadow = false;
    return mesh;
  }

  _makeEnemyFallback() {
    const geo = new THREE.BoxGeometry(0.7, 1.2, 0.5);
    const mat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false; mesh.receiveShadow = false;
    return mesh;
  }

  _makeCoinFallback() {
    const geo = new THREE.CylinderGeometry(0.25, 0.25, 0.06, 20);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    // Prevent renderer tone mapping from washing out the color
    mat.toneMapped = false;
    const mesh = new THREE.Mesh(geo, mat);
    // Face the camera in side view so coins aren't edge-on slivers
    mesh.rotation.x = Math.PI / 2;
    mesh.castShadow = false; mesh.receiveShadow = false;
    return mesh;
  }

  async prepare({ cactusUrl, coinUrl, birdUrl, enemyUrl }) {
    const cactusGltf = await this.loader.loadGLB(cactusUrl);
    // NOTE: Intentionally avoid using the GLB coin model to prevent
    // unintended large planes/strips from materials in some assets.
    // We will use the built-in fallback coin geometry instead.
    this.cactusProto = cactusGltf.scene;
    this.coinProto = this._makeCoinFallback();
    // Try load bird model (optional)
    if (birdUrl) {
      try {
        const birdGltf = await this.loader.loadGLB(birdUrl);
        this.birdGltf = birdGltf; // keep GLTF to access animations
        this.birdProto = birdGltf.scene;
      } catch (e) {
        console.warn('[ObstacleManager] Bird model failed to load, using fallback (ok).', e);
        this.birdProto = null;
      }
    // Try load enemy model (optional ground obstacle)
    if (enemyUrl) {
      try {
        const enemyGltf = await this.loader.loadGLB(enemyUrl);
        this.enemyGltf = enemyGltf;
        this.enemyProto = enemyGltf.scene;
      } catch (e) {
        console.warn('[ObstacleManager] Enemy model failed to load, skipping.', e);
        this.enemyProto = null;
      }
    }
    }

    // Normalize scales and center/ground prototypes
    const normalize = (obj, targetHeight, opts = {}) => {
      const preserve = !!opts.preserveMaterials;
      const unlit = !!opts.unlit; // convert to MeshBasic keeping textures for consistent look without lights
      obj.traverse((c)=>{ 
        if (c.isMesh){ 
          c.castShadow = false; c.receiveShadow = false; 
          if (!preserve) {
            const oldMat = c.material;
            const basic = new THREE.MeshBasicMaterial({ color: 0xffffff });
            // Preserve textures and transparency
            if (oldMat) {
              if (oldMat.map) {
                basic.map = oldMat.map;
                if (basic.map.encoding !== THREE.sRGBEncoding) basic.map.encoding = THREE.sRGBEncoding;
                basic.map.needsUpdate = true;
              }
              if (oldMat.alphaMap) { basic.alphaMap = oldMat.alphaMap; basic.transparent = true; }
              if (oldMat.transparent) { basic.transparent = true; basic.opacity = oldMat.opacity; }
              if (oldMat.side !== undefined) basic.side = oldMat.side;
            }
            // Critical: allow skinned animation on GLTFs
            if (c.isSkinnedMesh || c.skeleton) basic.skinning = true;
            if (unlit) { basic.toneMapped = false; }
            c.material = basic;
          } else {
            // Ensure skinned flag preserved on existing materials
            if (c.material) {
              c.material.skinning = !!(c.isSkinnedMesh || c.skeleton);
              // Make sure textures are visible fully (unlit look)
              if (c.material.map) { /* keep as-is to preserve original dark look */ }
            }
          }
        }
      });
      let box = new THREE.Box3().setFromObject(obj);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size); box.getCenter(center);
      if (size.y > 0) {
        const s = targetHeight / size.y;
        obj.scale.setScalar(s);
      }
      box = new THREE.Box3().setFromObject(obj);
      box.getSize(size); box.getCenter(center);
      // Ground the model so base sits at y=0
      obj.position.y += (size.y/2) - center.y;
      // Face forward
      obj.rotation.y = 0;
    };

    // Balanced sizes relative to player (~0.6u high)
    // Apply optional desktop-only enlargement via this.globalScale from Game
    const gs = (typeof this.globalScale === 'number' && isFinite(this.globalScale)) ? this.globalScale : 1.0;
    // Cactus and bird scale up on desktop; coins remain the same size
    normalize(this.cactusProto, 2.2 * gs);
    normalize(this.coinProto, 0.9);
    if (this.birdProto) {
      // Match cactus height so visual weight is consistent
      normalize(this.birdProto, 2.2 * gs);
      // Many GLBs have -Z forward; flip so the face looks towards the camera
      this.birdProto.rotation.y = Math.PI;
    }
    if (this.enemyProto) {
      // Use unlit materials with original texture to avoid yellow/washed colors and lighting dependence
      // Make the rat slightly larger than cactus by default
      normalize(this.enemyProto, 2.6 * gs, { unlit: true });
      // Keep prototype at neutral rotation; wrapper decides facing
      this.enemyProto.rotation.y = 0;
    }
  }

  setSpeed(v) { this.speed = v; }
  setDifficulty(d) { this.difficulty = THREE.MathUtils.clamp(d ?? 0, 0, 1); }

  reset() {
    for (const o of this.active) this.group.remove(o.object);
    for (const c of this.coins) this.group.remove(c.object);
    this.active.length = 0;
    this.coins.length = 0;
    // Spawn quickly after a reset so the game feels alive immediately
    this.spawnTimer = this.spawnInterval;
    // Reset spacing trackers
    this.distSinceLast = 999;
    this._nextGapWorld = 0;
    // Reset bird timers
    this._birdGuaranteeT = 0;
    this._birdTimer = 0;
    this._birdNext = 8 + Math.random()*2;
  }

  dispose() { this.reset(); }

  _spawnCactus() {
    const wrapper = new THREE.Group();
    const primary = (this.cactusProto ? this.cactusProto.clone(true) : this._makeCactusFallback());
    wrapper.add(primary);

    // Random size variety (0.85..1.25)
    const s = 0.85 + Math.random() * 0.4;
    primary.scale.multiplyScalar(s);

    // Ground base to y=0
    let box = new THREE.Box3().setFromObject(wrapper);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size); box.getCenter(center);
    primary.position.y += (size.y/2) - center.y;

    // 20% chance of a side-by-side double cactus cluster
    if (Math.random() < 0.2) {
      const other = (this.cactusProto ? this.cactusProto.clone(true) : this._makeCactusFallback());
      const s2 = 0.8 + Math.random() * 0.5;
      other.scale.multiplyScalar(s2);
      // Slight offset on X so it becomes a short cluster to hop
      other.position.x = 1.1 + Math.random()*0.5;
      // Align base
      const b2 = new THREE.Box3().setFromObject(other);
      const sz2 = new THREE.Vector3(); const ct2 = new THREE.Vector3();
      b2.getSize(sz2); b2.getCenter(ct2);
      other.position.y += (sz2.y/2) - ct2.y;
      wrapper.add(other);
    }

    // Spawn position and lane
    wrapper.position.set(15 + Math.random()*9, 0, (Math.random()*2-1)*this.zSpread);
    this.group.add(wrapper);
    return this._buildEntry(wrapper, undefined);
  }

  _spawnBird() {
    // Use SkeletonUtils.clone to preserve skinning/animation bindings
    const obj = (this.birdProto ? cloneSkeleton(this.birdProto) : this._makeBirdFallback());
    const wrapper = new THREE.Group();
    wrapper.add(obj);

    // Ground relative adjustment not required; we'll place at flying height
    // Set spawn x farther and choose a flying height that can conflict with jump timing
    // Heights tuned so a well-timed jump can clear them, or a duck can avoid them.
    // Player is ~0.45 units high. Jump apex is ~1.5 units.
    const yHeights = [
      0.20, // Lower low-flying so ducking feels fair
      0.38, // Slightly lowered mid-range
      0.72, // Slightly lowered high-flying
    ];
    const y = yHeights[Math.floor(Math.random() * yHeights.length)];
    wrapper.position.set(15 + Math.random() * 8, y, (Math.random() * 2 - 1) * this.zSpread);

    // Setup animation mixer if GLTF had animations; otherwise fallback to tilt
    wrapper.userData = wrapper.userData || {};
    const u = {
      t: Math.random() * Math.PI * 2,
      mixer: null,
      baseY: y,
      bobAmp: 0.14 + Math.random() * 0.08, // 0.14..0.22 amplitude
      bobFreq: 0.9 + Math.random() * 0.6,  // 0.9..1.5 frequency
    };
    if (this.birdGltf?.animations?.length) {
      try {
        // Create a mixer on the cloned object
        const mixer = new THREE.AnimationMixer(obj);
        // Prefer a clip that looks like flying/flapping
        const names = this.birdGltf.animations.map(c=>c.name.toLowerCase());
        let clip = null;
        const pick = ['fly', 'flying', 'flap', 'run', 'walk', 'idle'];
        for (const key of pick) {
          const idx = names.findIndex(n=>n.includes(key));
          if (idx >= 0) { clip = this.birdGltf.animations[idx]; break; }
        }
        if (!clip) clip = this.birdGltf.animations[0];
        const action = mixer.clipAction(clip);
        action.clampWhenFinished = false;
        action.loop = THREE.LoopRepeat;
        action.play();
        u.mixer = mixer;
      } catch (e) {
        // ignore, fallback to tilt
      }
    }
    wrapper.userData.bird = u;

    // Ensure bird draws correctly
    wrapper.traverse((c)=>{
      if (c.isMesh) {
        if (c.material) {
          // Keep normal depth so collisions/occlusion look correct
          c.material.depthTest = true;
          c.material.depthWrite = true;
          if (!c.material.map && c.material.color) c.material.color.set(0xff3366);
        }
        c.renderOrder = 2;
      }
    });
    this.group.add(wrapper);
    return this._buildEntry(wrapper, 'bird');
  }

  // Public: force spawn a bird for testing
  spawnBirdPublic() {
    const b = this._spawnBird();
    // place slightly closer so it's visible quickly when testing
    b.object.position.x = 9.0;
    b.object.position.y = 0.25; // low-flying for duck testing
    b.object.position.z = 0.0;
    b.object.scale.setScalar(1.15);
    b.object.renderOrder = 1;
    this.active.push(b);
    this.spawnTimer = 0; // reset cadence
    if (typeof window !== 'undefined') {
      console.log('[ObstacleManager] active obstacles:', this.active.length, 'coins:', this.coins.length);
    }
  }

  _spawnCoinLine() {
    const baseX = 12 + Math.random() * 8;
    // Keep coins on the center lane so walking through them collects reliably
    const z = 0;
    const created = [];
    const d = this.difficulty;
  
    // 10% chance to spawn a single power-up coin instead of a line
    if (Math.random() < 0.1) {
      const coin = (this.coinProto ? this.coinProto.clone(true) : this._makeCoinFallback());
      coin.scale.setScalar(1.5); // Make it bigger
      // Ensure golden color regardless of node structure
      if (coin.material && coin.material.color) {
        if (coin.material.toneMapped !== undefined) coin.material.toneMapped = false;
        coin.material.color.set(0xffd700);
      } else if (coin.traverse) {
        coin.traverse((n)=>{ if (n.isMesh && n.material && n.material.color) { if (n.material.toneMapped !== undefined) n.material.toneMapped = false; n.material.color.set(0xffd700); } });
      }
  
      const wrap = new THREE.Group();
      wrap.add(coin);
  
      // Lower power-up coin height so it's reachable while running or with a small hop
      const baseY = 0.22 + Math.random() * 0.28; // ~0.22..0.50
      wrap.position.set(baseX, baseY, z);
      this.group.add(wrap);
      const entry = this._buildEntry(wrap, 'coin');
      created.push({ ...entry, spin: Math.random() * Math.PI * 2, isPowerUp: true });
      return created;
    }
  
    // Choose pattern based on difficulty for regular coins
    const patterns = ["line", "stair", "arc"];
    let pattern = "line";
    if (d > 0.65) pattern = patterns[Math.floor(Math.random() * patterns.length)];
    else if (d > 0.35) pattern = Math.random() < 0.5 ? "stair" : "line";
  
    const count = 4 + Math.floor(Math.random() * 3); // 4-6 coins
    // Lower default coin line height for easy walking pickup
    const baseY = 0.12 + Math.random() * 0.22; // ~0.12..0.34
    for (let i = 0; i < count; i++) {
      const coin = (this.coinProto ? this.coinProto.clone(true) : this._makeCoinFallback());
      // Ensure golden color regardless of node structure/material cloning
      if (coin.material && coin.material.color) {
        if (coin.material.toneMapped !== undefined) coin.material.toneMapped = false;
        coin.material.color.set(0xffd700);
      } else if (coin.traverse) {
        coin.traverse((n)=>{ if (n.isMesh && n.material && n.material.color) { if (n.material.toneMapped !== undefined) n.material.toneMapped = false; n.material.color.set(0xffd700); } });
      }
      const wrap = new THREE.Group();
      wrap.add(coin);
  
      // Center vertically roughly relative to coin local origin
      const box = new THREE.Box3().setFromObject(wrap);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
  
      let y = baseY;
      if (pattern === "stair") {
        y = baseY + i * 0.14; // very gentle staircase
      } else if (pattern === "arc") {
        const t = (i / Math.max(1, count - 1));
        const mid = 0.5 - Math.abs(t - 0.5);
        y = baseY + mid * 0.28; // very low arc peak
      }
      coin.position.y += y + (size.y / 2) - center.y;
  
      wrap.position.set(baseX + i * 1.5, 0, z);
      this.group.add(wrap);
      const entry = this._buildEntry(wrap, 'coin');
      created.push({ ...entry, spin: Math.random() * Math.PI * 2 });
    }
    return created;
  }

  update(dt) {
    // Spawn cadence scales with difficulty and speed
    this.spawnTimer += dt;
    // Track distance traveled since last obstacle group, in world units
    this.distSinceLast += Math.max(0, this.speed) * dt;
    this._birdGuaranteeT += dt;
    this._birdTimer += dt;
    if (this._postDoubleCooldown > 0) this._postDoubleCooldown -= dt;
    // Longer base intervals; never too short
    // Faster cadence overall as difficulty increases, but keep generous spacing
    const baseInterval = THREE.MathUtils.lerp(1.30, 0.75, this.difficulty);
    const speedT = THREE.MathUtils.smoothstep(this.speed, 6, 13); // match Game speed range (6..13)
    const interval = Math.max(0.75, baseInterval - (1 - speedT) * 0.10) + Math.max(0, this._postDoubleCooldown);
    // Enforce both time interval AND world-distance spacing before spawning
    if (this.spawnTimer >= interval && this.distSinceLast >= this._nextGapWorld) {
      this.spawnTimer = 0;
      // Choose spawn with obstacle bias increasing with difficulty
      const obstacleBias = THREE.MathUtils.lerp(0.56, 0.86, this.difficulty);
      if (Math.random() < obstacleBias) {
        // Decide between flying bird vs ground obstacle
        const useBird = (Math.random() < THREE.MathUtils.lerp(0.22, 0.62, this.difficulty));
        const spawnGround = () => {
          // Randomly choose between cactus and enemy when available
          const hasEnemy = !!this.enemyProto;
          if (hasEnemy && Math.random() < 0.5) return this._spawnEnemy();
          return this._spawnCactus();
        };
        const first = useBird ? this._spawnBird() : spawnGround();
        this.active.push(first);
        // Guard: avoid immediate stacking too close
        const dblChance = THREE.MathUtils.lerp(0.08, 0.22, this.difficulty);
        let didDouble = false;
        if (Math.random() < dblChance) {
          const second = useBird && Math.random() < 0.5 ? this._spawnBird() : spawnGround();
          // ensure second is at least 4.4 units ahead of first (fair window)
          if (second.object.position.x - first.object.position.x < 4.4) {
            second.object.position.x = first.object.position.x + 4.4 + Math.random()*1.6;
          }
          this.active.push(second);
          // Cooldown after a double
          this._postDoubleCooldown = THREE.MathUtils.lerp(0.65, 1.15, this.difficulty);
          didDouble = true;
        }
        // Reset distance accumulator and schedule next gap
        this.distSinceLast = 0;
        this._scheduleNextGap(didDouble);
      } else {
        this.coins.push(...this._spawnCoinLine());
        // Coins shouldn't suppress obstacles for too long; keep spacing logic consistent
        this.distSinceLast = 0;
        this._scheduleNextGap(false);
      }
    }

    // Natural periodic bird spawns (Chrome Dino style)
    if (this._birdTimer >= this._birdNext) {
      const b = this._spawnBird();
      this.active.push(b);
      this._birdTimer = 0;
      this._birdNext = 4 + Math.random()*3; // 4-7s between birds (harder)
      this._birdGuaranteeT = 0; // satisfied
    }

    // Hard guarantee fallback: ensure a bird eventually appears
    if (this._birdGuaranteeT > 4.5) {
      this.spawnBirdPublic();
      this._birdGuaranteeT = 0;
      this._birdTimer = 0;
      this._birdNext = 4 + Math.random()*3;
    }

    // Move all entities towards player (negative X)
    const dx = -this.speed * dt;
    for (let i = this.active.length-1; i>=0; i--) {
      const o = this.active[i];
      o.object.position.x += dx;
      // simple bird flap/tilt or mixer update
      if (o.type === 'bird' && o.object.userData?.bird) {
        const birdData = o.object.userData.bird;
        birdData.t += dt * 4; // time accumulator for bobbing

        // Update animation or fallback to tilt
        if (birdData.mixer) {
          try { birdData.mixer.update(dt); } catch(_){}
        } else {
          const s = Math.sin(birdData.t * 1.7); // slightly faster flap
          o.object.rotation.z = s * 0.1;
        }

        // Vertical bobbing for flight feel
        if (typeof birdData.baseY === 'number') {
          const amp = birdData.bobAmp ?? 0.18;
          const freq = birdData.bobFreq ?? 1.2;
          o.object.position.y = birdData.baseY + Math.sin(birdData.t * freq) * amp;
        }

        // Particle trail removed per user request
      }
      // enemy animation / subtle bob
      if (o.type === 'enemy' && o.object.userData?.enemy) {
        const e = o.object.userData.enemy;
        e.t += dt * 4;
        if (e.mixer) { try { e.mixer.update(dt); } catch(_){} }
        // tiny bob to sell movement if no animation present
        const bob = Math.sin(e.t * 3.2) * 0.03;
        o.object.position.y = bob;
      }
      // Fast collider update using cached size/offset
      if (o._colSize && o._colOffset) {
        const center = o.object.position.clone().add(o._colOffset);
        // Slightly pad bird colliders to make side brushes count as hits
        if (o.type === 'bird') {
          const sz = o._colSize.clone();
          sz.x += 0.20; // width
          sz.y += 0.18; // height
          sz.z += 0.20; // depth
          o.collider.setFromCenterAndSize(center, sz);
        } else {
          o.collider.setFromCenterAndSize(center, o._colSize);
        }
      } else {
        o.collider.setFromObject(o.object);
      }
      if (o.object.position.x < -12) {
        this.group.remove(o.object);
        this.active.splice(i,1);
      }
    }

    for (let i = this.coins.length-1; i>=0; i--) {
      const c = this.coins[i];
      c.object.position.x += dx;
      // Spin only the inner mesh so the wrapper (and its cached collider) stays axis-aligned
      const inner = c.object.children && c.object.children[0];
      if (inner && inner.rotation) inner.rotation.y += dt * 4; else c.object.rotation.y += dt * 4;
      if (c._colSize && c._colOffset) {
        const center = c.object.position.clone().add(c._colOffset);
        // Slightly inflate coin collider to ease collection during run
        const sz = c._colSize.clone();
        sz.x += 0.18; sz.y += 0.18; sz.z += 0.22;
        c.collider.setFromCenterAndSize(center, sz);
      } else {
        c.collider.setFromObject(c.object);
        c.collider.expandByScalar(0.12);
      }
      if (c.object.position.x < -12) {
        this.group.remove(c.object);
        this.coins.splice(i,1);
      }
    }
  }

  collidesWith(playerBox) {
    // In an orthographic side view, small Z offsets still look like overlap.
    // Widen player's collider in Z by lane spread so near-lane obstacles count as hits.
    const pb = playerBox.clone();
    const zTol = (this.zSpread ?? 0) + 0.2; // small extra margin
    pb.min.z -= zTol;
    pb.max.z += zTol;
    
    for (const o of this.active) {
      // For birds, we need to adjust the collision detection to account for their flying height
      if (o.type === 'bird') {
        // Create a copy of the player's hitbox for this check
        const playerHitbox = playerBox.clone();
        
        // Slightly expand the player's hitbox for birds to make it more forgiving
        playerHitbox.expandByScalar(0.15);
        
        // Get the bird's world position and adjust its collision box
        const birdPos = o.object.position.clone();
        const birdSize = o._colSize ? o._colSize.clone() : new THREE.Vector3(1, 1, 1);
        
        // Create a more accurate collision box for the bird
        const birdBox = new THREE.Box3(
          new THREE.Vector3(
            birdPos.x - birdSize.x * 0.5,
            birdPos.y - birdSize.y * 0.5,
            birdPos.z - birdSize.z * 0.5
          ),
          new THREE.Vector3(
            birdPos.x + birdSize.x * 0.5,
            birdPos.y + birdSize.y * 0.5,
            birdPos.z + birdSize.z * 0.5
          )
        );
        
        // Check collision with the player
        if (playerHitbox.intersectsBox(birdBox)) {
          return o;
        }
      } else {
        // For ground obstacles, use the standard collision detection
        // Make obstacle hit detection slightly more sensitive in XY as well
        const pbCopy = pb.clone();
        pbCopy.expandByScalar(0.10);
        if (o.collider.intersectsBox(pbCopy)) {
          return o;
        }
      }
    }
    return null;
  }

  removeObstacle(ob) {
    if (!ob) return;
    const idx = this.active.indexOf(ob);
    if (idx >= 0) {
      this.group.remove(ob.object);
      this.active.splice(idx, 1);
    }
  }

  collectCoins(playerBox) {
    // Expand player's collider along Z like obstacle checks so near-lane coins count
    const pb = playerBox.clone();
    const zTol = (this.zSpread ?? 0) + 0.2;
    pb.min.z -= zTol;
    pb.max.z += zTol;
    // Make coin pickup a bit forgiving in XY as well
    pb.expandByScalar(0.18);

    let regularCoins = 0;
    let powerUpCoins = 0;
    const positions = [];
    // Player center used for proximity-based pickup
    const pCenter = pb.getCenter(new THREE.Vector3());
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      // Coins are thin; use an expanded box to make pickup easy while walking
      const coinBox = c.collider.clone();
      coinBox.expandByScalar(0.35);
      // Either AABB intersects or player is within a small proximity radius
      let hit = coinBox.intersectsBox(pb);
      if (!hit) {
        const cPos = c.object.getWorldPosition(new THREE.Vector3());
        const dx = Math.abs(cPos.x - pCenter.x);
        const dy = Math.abs(cPos.y - pCenter.y);
        const dz = Math.abs(cPos.z - pCenter.z);
        const horiz = Math.hypot(dx, dz);
        // Generous thresholds tuned for side-view running feel
        if (horiz < 0.55 && dy < 0.6) hit = true;
      }
      if (hit) {
        const p = new THREE.Vector3();
        c.object.getWorldPosition(p);
        positions.push(p.clone());
        this.group.remove(c.object);
        this.coins.splice(i, 1);
        if (c.isPowerUp) {
          powerUpCoins++;
        } else {
          regularCoins++;
        }
      }
    }
    return { regularCoins, powerUpCoins, positions };
  }

  // Magnet helper: move coins toward a point and auto-collect when very close.
  attractCoinsTowards(x, y, z, radius, dt) {
    const r2 = radius * radius;
    const collected = [];
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      const p = c.object.position;
      const dx = x - p.x, dy = (y - p.y), dz = z - p.z;
      const dist2 = dx*dx + dy*dy + dz*dz;
      if (dist2 <= r2) {
        // Pull speed increases as coin gets closer
        const dist = Math.max(0.0001, Math.sqrt(dist2));
        const pull = (6 + this.speed * 0.6) * (1 + (radius - dist));
        p.x += (dx / dist) * pull * dt;
        p.y += (dy / dist) * pull * dt;
        p.z += (dz / dist) * pull * dt;
        // Close enough -> collect
        if (dist < 0.35) {
          collected.push(c);
          this.group.remove(c.object);
          this.coins.splice(i, 1);
        } else {
          // Update collider after moving
          c.collider.setFromObject(c.object);
        }
      }
    }
    return collected; // array of coin entries (respect isPowerUp if present)
  }
}
