import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.particles = []; // { mesh, vel, life, maxLife, startSize, endSize }
    this._dustTex = this._makeSoftCircleTexture();
  }

  spawnSparkleAt(x, y = 1.0, z = 0, count = 15) {
    for (let i = 0; i < count; i++) {
      const size = 0.1 + Math.random() * 0.15;
      const geo = new THREE.PlaneGeometry(1, 1);
      const mat = new THREE.MeshBasicMaterial({
        map: this._dustTex,
        transparent: true,
        color: new THREE.Color(0xfbbf24), // gold
        opacity: 0.0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, Math.max(0.05, y), z);
      this.group.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.0;
      const vel = new THREE.Vector3(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);

      this.particles.push({
        mesh,
        vel,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.2,
        startSize: size,
        endSize: size * 0.6,
      });
    }
  }

  dispose() {
    for (const p of this.particles) this.group.remove(p.mesh);
    this.particles.length = 0;
    this.group.removeFromParent();
    this._dustTex?.dispose?.();
  }

  _makeSoftCircleTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 6, 32, 32, 28);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  spawnDustAt(x, z, count = 6) {
    for (let i = 0; i < count; i++) {
      const size = 0.2 + Math.random() * 0.25;
      const geo = new THREE.PlaneGeometry(1, 1);
      const mat = new THREE.MeshBasicMaterial({
        map: this._dustTex,
        transparent: true,
        color: new THREE.Color(0xcbd5e1), // soft gray-blue dust
        opacity: 0.0,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x + (Math.random() * 0.6 - 0.3), 0.02, z + (Math.random() * 0.6 - 0.3));
      this.group.add(mesh);

      const angle = Math.random() * Math.PI; // spread sideways
      const speed = 0.8 + Math.random() * 1.2;
      const vel = new THREE.Vector3(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);

      this.particles.push({
        mesh,
        vel,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.25,
        startSize: size,
        endSize: size * 1.8,
      });
    }
  }

  spawnBirdTrail(x, y, z, count = 1) {
    for (let i = 0; i < count; i++) {
      const size = 0.05 + Math.random() * 0.05;
      const geo = new THREE.PlaneGeometry(1, 1);
      const mat = new THREE.MeshBasicMaterial({
        map: this._dustTex,
        transparent: true,
        color: new THREE.Color(0xff6666), // a reddish color
        opacity: 0.0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.group.add(mesh);

      const vel = new THREE.Vector3(0, 0, 0);

      this.particles.push({
        mesh,
        vel,
        life: 0,
        maxLife: 0.2 + Math.random() * 0.1,
        startSize: size,
        endSize: size * 0.1,
      });
    }
  }

  spawnJumpParticles(x, z, count = 5) {
    for (let i = 0; i < count; i++) {
      const size = 0.15 + Math.random() * 0.2;
      const geo = new THREE.PlaneGeometry(1, 1);
      const mat = new THREE.MeshBasicMaterial({
        map: this._dustTex,
        transparent: true,
        color: new THREE.Color(0xffffff), // white particles
        opacity: 0.0,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x + (Math.random() * 0.4 - 0.2), 0.02, z + (Math.random() * 0.4 - 0.2));
      this.group.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 1.5;
      const vel = new THREE.Vector3(Math.cos(angle) * speed, 3.0 + Math.random() * 2.0, Math.sin(angle) * speed);

      this.particles.push({
        mesh,
        vel,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.2,
        startSize: size,
        endSize: size * 0.1,
      });
    }
  }

  spawnLandParticles(x, z, count = 8) {
    this.spawnDustAt(x, z, count);
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      const t = Math.min(1, p.life / p.maxLife);
      const size = THREE.MathUtils.lerp(p.startSize, p.endSize, t);
      p.mesh.scale.set(size, 1, size);
      p.mesh.position.x += p.vel.x * dt;
      p.mesh.position.z += p.vel.z * dt;
      // fade in then out
      const fade = t < 0.2 ? (t / 0.2) : (1 - (t - 0.2) / 0.8);
      p.mesh.material.opacity = Math.max(0, fade * 0.6);
      if (p.life >= p.maxLife) {
        this.group.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.map?.dispose?.();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }
}
