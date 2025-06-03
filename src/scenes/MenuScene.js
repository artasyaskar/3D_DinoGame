import * as THREE from 'three';
import { scene, camera, renderer } from '../utils/Constants';
import { Howl } from 'howler';

export class MenuScene {
  constructor() {
    this.active = true;
    this.menuContainer = document.createElement('div');
    this.setupMenuUI();
    this.setupMenuScene();
    this.setupBackgroundMusic();
  }

  setupMenuUI() {
    this.menuContainer.id = 'menu-container';
    this.menuContainer.innerHTML = `
      <div class="menu-content">
        <h1>Dino Runner</h1>
        <h2>Apocalypse Edition</h2>
        <button id="start-btn">Start Game</button>
        <button id="settings-btn">Settings</button>
        <div id="settings-panel" style="display: none;">
          <h3>Settings</h3>
          <div class="setting-item">
            <label>Music Volume</label>
            <input type="range" id="music-volume" min="0" max="100" value="70">
          </div>
          <div class="setting-item">
            <label>Sound Effects</label>
            <input type="range" id="sfx-volume" min="0" max="100" value="80">
          </div>
        </div>
      </div>
    `;

    // Add menu styles
    const style = document.createElement('style');
    style.textContent = `
      #menu-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        background: rgba(0, 0, 0, 0.7);
        z-index: 1000;
      }
      .menu-content {
        background: rgba(20, 20, 20, 0.9);
        padding: 2rem;
        border-radius: 15px;
        text-align: center;
        color: #fff;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        border: 2px solid #444;
      }
      .menu-content h1 {
        font-size: 3rem;
        margin: 0;
        color: #ff4444;
        text-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
      }
      .menu-content h2 {
        font-size: 1.5rem;
        margin: 0.5rem 0 2rem;
        color: #aaa;
      }
      button {
        background: #ff4444;
        color: white;
        border: none;
        padding: 1rem 2rem;
        margin: 0.5rem;
        font-size: 1.2rem;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      button:hover {
        background: #ff6666;
        transform: scale(1.05);
      }
      #settings-panel {
        margin-top: 1rem;
        padding: 1rem;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 10px;
      }
      .setting-item {
        margin: 1rem 0;
        text-align: left;
      }
      input[type="range"] {
        width: 100%;
        margin-top: 0.5rem;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(this.menuContainer);

    // Event listeners
    document.getElementById('start-btn').addEventListener('click', () => this.startGame());
    document.getElementById('settings-btn').addEventListener('click', () => {
      const panel = document.getElementById('settings-panel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
  }

  setupMenuScene() {
    // Add fog to create depth and atmosphere
    scene.fog = new THREE.FogExp2(0x000000, 0.02);
    scene.background = new THREE.Color(0x1a0f0f);

    // Add ambient particles
    this.particles = new THREE.Group();
    const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.5
    });

    for (let i = 0; i < 100; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.set(
        (Math.random() - 0.5) * 20,
        Math.random() * 10,
        (Math.random() - 0.5) * 20
      );
      particle.userData.speed = Math.random() * 0.02;
      this.particles.add(particle);
    }
    scene.add(this.particles);

    // Set camera for menu scene
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
  }

  setupBackgroundMusic() {
    this.menuMusic = new Howl({
      src: [window.ASSET_PATHS?.sounds?.menu || '/assets/sounds/menu-music.mp3'],
      loop: true,
      volume: 0.7
    });
    this.menuMusic.play();
  }

  animate() {
    if (!this.active) return;

    // Animate particles
    this.particles.children.forEach(particle => {
      particle.position.y -= particle.userData.speed;
      if (particle.position.y < 0) {
        particle.position.y = 10;
      }
    });

    // Rotate camera slowly around the scene
    const time = Date.now() * 0.0005;
    camera.position.x = Math.cos(time) * 12;
    camera.position.z = Math.sin(time) * 12;
    camera.lookAt(0, 0, 0);

    requestAnimationFrame(() => this.animate());
    renderer.render(scene, camera);
  }

  startGame() {
    this.active = false;
    this.menuMusic.fade(0.7, 0, 1000);
    setTimeout(() => {
      this.menuMusic.stop();
      document.body.removeChild(this.menuContainer);
      scene.remove(this.particles);
      scene.fog = null;
      window.gameApp.startGame();
    }, 1000);
  }
}
