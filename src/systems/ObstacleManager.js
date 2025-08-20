import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

// Simple endless-runner obstacle and coin system
export class ObstacleManager {
  constructor(scene, assetLoader, sounds, particles) {
    this.scene = scene;
    this.loader = assetLoader;
    this.sounds = sounds;
    this.particles = particles;

    this.speed = 8;

    this.cactusProto = null;
    this.coinProto = null;
    this.birdProto = null; // optional flying obstacle
    this.birdGltf = null;

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
    this._birdNext = 8 + Math.random()*2; // 8-10s between natural spawns
  }

  _scheduleNextGap(wasDouble = false) {
    // Compute next required world-distance (in units) before another spawn is allowed.
    // Keeps on-screen reaction time consistent across speeds (Chrome Dino style).
    const d = this.difficulty;
    // Reaction-time window scales with difficulty
    const reactMin = THREE.MathUtils.lerp(1.20, 1.00, d);
    const reactMax = THREE.MathUtils.lerp(1.45, 1.20, d);
    const reactT = THREE.MathUtils.lerp(reactMin, reactMax, Math.random());
    // A small absolute gap baseline in world units
    const baseGap = THREE.MathUtils.lerp(8.5, 6.8, d);
    let gap = baseGap + Math.max(0, this.speed) * reactT;
    if (wasDouble) gap += 2.5; // extra forgiveness after doubles
    // Clamp
    const minGap = 10.0;
    const maxGap = 26.0;
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

  _makeCoinFallback() {
    const geo = new THREE.CylinderGeometry(0.25, 0.25, 0.06, 20);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd34d });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.z = Math.PI / 2;
    mesh.castShadow = false; mesh.receiveShadow = false;
    return mesh;
  }

  async prepare({ cactusUrl, coinUrl, birdUrl }) {
    const cactusGltf = await this.loader.loadGLB(cactusUrl);
    const coinGltf = await this.loader.loadGLB(coinUrl);
    this.cactusProto = cactusGltf.scene;
    this.coinProto = coinGltf.scene;
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
    }

    // Normalize scales and center/ground prototypes
    const normalize = (obj, targetHeight) => {
      obj.traverse((c)=>{ 
        if (c.isMesh){ 
          c.castShadow = false; c.receiveShadow = false; 
          const oldMat = c.material;
          const basic = new THREE.MeshBasicMaterial({ color: 0xffffff });
          if (oldMat) {
            if (oldMat.map) basic.map = oldMat.map;
            if (oldMat.alphaMap) { basic.alphaMap = oldMat.alphaMap; basic.transparent = true; }
            if (oldMat.transparent) { basic.transparent = true; basic.opacity = oldMat.opacity; }
            if (oldMat.side !== undefined) basic.side = oldMat.side;
          }
          c.material = basic;
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
    if (this.birdProto) normalize(this.birdProto, 1.6 * gs);
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
    const obj = (this.cactusProto ? this.cactusProto.clone(true) : this._makeCactusFallback());
    const wrapper = new THREE.Group();
    wrapper.add(obj);

    // Keep native size from normalization (no extra scaling)

    // Ensure base sits on ground y=0
    const box = new THREE.Box3().setFromObject(wrapper);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size); box.getCenter(center);
    obj.position.y += (size.y/2) - center.y;

    // Spawn a bit farther so approach timing feels fairer like Chrome Dino
    wrapper.position.set(15 + Math.random()*9, 0, (Math.random()*2-1)*this.zSpread);

    this.group.add(wrapper);
    return { object: wrapper, collider: new THREE.Box3().setFromObject(wrapper) };
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
    if (typeof window !== 'undefined') console.log('[ObstacleManager] spawn bird @', wrapper.position.toArray());
    return { object: wrapper, collider: new THREE.Box3().setFromObject(wrapper), type: 'bird' };
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
    const z = (Math.random() * 2 - 1) * this.zSpread;
    const created = [];
    const d = this.difficulty;
  
    // 10% chance to spawn a single power-up coin instead of a line
    if (Math.random() < 0.1) {
      const coin = (this.coinProto ? this.coinProto.clone(true) : this._makeCoinFallback());
      coin.scale.setScalar(1.5); // Make it bigger
      const mat = coin.children[0]?.material;
      if (mat) mat.color.set(0xffd700); // Make it gold
  
      const wrap = new THREE.Group();
      wrap.add(coin);
  
      const baseY = 1.2 + Math.random() * 1.4;
      wrap.position.set(baseX, baseY, z);
      this.group.add(wrap);
      created.push({
        object: wrap,
        collider: new THREE.Box3().setFromObject(wrap),
        spin: Math.random() * Math.PI * 2,
        isPowerUp: true,
      });
      return created;
    }
  
    // Choose pattern based on difficulty for regular coins
    const patterns = ["line", "stair", "arc"];
    let pattern = "line";
    if (d > 0.65) pattern = patterns[Math.floor(Math.random() * patterns.length)];
    else if (d > 0.35) pattern = Math.random() < 0.5 ? "stair" : "line";
  
    const count = 4 + Math.floor(Math.random() * 3); // 4-6 coins
    const baseY = 1.2 + Math.random() * 1.4;
    for (let i = 0; i < count; i++) {
      const coin = (this.coinProto ? this.coinProto.clone(true) : this._makeCoinFallback());
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
        y = baseY + i * 0.35; // staircase up
      } else if (pattern === "arc") {
        const t = (i / Math.max(1, count - 1));
        const mid = 0.5 - Math.abs(t - 0.5);
        y = baseY + mid * 1.1; // arc peak middle
      }
      coin.position.y += y + (size.y / 2) - center.y;
  
      wrap.position.set(baseX + i * 1.5, 0, z);
      this.group.add(wrap);
      created.push({
        object: wrap,
        collider: new THREE.Box3().setFromObject(wrap),
        spin: Math.random() * Math.PI * 2
      });
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
    const baseInterval = THREE.MathUtils.lerp(1.45, 0.85, this.difficulty);
    const speedT = THREE.MathUtils.smoothstep(this.speed, 6, 12); // match new Game speed range
    const interval = Math.max(0.85, baseInterval - (1 - speedT) * 0.06) + Math.max(0, this._postDoubleCooldown);
    // Enforce both time interval AND world-distance spacing before spawning
    if (this.spawnTimer >= interval && this.distSinceLast >= this._nextGapWorld) {
      this.spawnTimer = 0;
      // Choose spawn with obstacle bias increasing with difficulty
      const obstacleBias = THREE.MathUtils.lerp(0.5, 0.78, this.difficulty);
      if (Math.random() < obstacleBias) {
        // Decide between cactus and bird even at very low difficulties so birds appear early
        const useBird = (Math.random() < THREE.MathUtils.lerp(0.22, 0.62, this.difficulty));
        const first = useBird ? this._spawnBird() : this._spawnCactus();
        this.active.push(first);
        // Guard: avoid immediate stacking too close
        const dblChance = THREE.MathUtils.lerp(0.04, 0.14, this.difficulty);
        let didDouble = false;
        if (Math.random() < dblChance) {
          const second = useBird && Math.random() < 0.5 ? this._spawnBird() : this._spawnCactus();
          // ensure second is at least 4.6 units ahead of first
          if (second.object.position.x - first.object.position.x < 4.6) {
            second.object.position.x = first.object.position.x + 4.6 + Math.random()*1.6;
          }
          this.active.push(second);
          // Cooldown after a double
          this._postDoubleCooldown = THREE.MathUtils.lerp(0.60, 1.10, this.difficulty);
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
      this._birdNext = 6 + Math.random()*3; // 6-9s between birds
      this._birdGuaranteeT = 0; // satisfied
    }

    // Hard guarantee fallback: ensure a bird eventually appears
    if (this._birdGuaranteeT > 6.0) {
      this.spawnBirdPublic();
      this._birdGuaranteeT = 0;
      this._birdTimer = 0;
      this._birdNext = 6 + Math.random()*3;
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

        // Spawn trail particles
        if (this.particles && Math.random() < 0.5) {
          const pos = o.object.position;
          this.particles.spawnBirdTrail(pos.x, pos.y, pos.z, 1);
        }
      }
      o.collider.setFromObject(o.object);
      if (o.object.position.x < -12) {
        this.group.remove(o.object);
        this.active.splice(i,1);
      }
    }

    for (let i = this.coins.length-1; i>=0; i--) {
      const c = this.coins[i];
      c.object.position.x += dx;
      c.object.rotation.y += dt * 4; // spin coin
      c.collider.setFromObject(c.object);
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
      if (o.collider.intersectsBox(pb)) return true;
    }
    return false;
  }

  collectCoins(playerBox) {
    let regularCoins = 0;
    let powerUpCoins = 0;
    const positions = [];
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (c.collider.intersectsBox(playerBox)) {
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
}
