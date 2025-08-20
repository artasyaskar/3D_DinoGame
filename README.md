# 3D_DinoGame

================================================================================
Overview
================================================================================

Welcome to **3D Dino Game**, a modern, browser-based 3D endless runner inspired by the classic Chrome Dino — now in 3D with smooth animations, responsive controls, and polished visuals.

Built with **Three.js** and **Vite**, plus **Howler.js** for audio and **GSAP** for micro‑tweens, it runs directly in your browser and is easy to host on any static server (Vercel, Netlify, GitHub Pages, etc.).

Whether you are a game dev, learner, or just curious, this repo shows a clean ES modules setup with modular entities/systems and async asset loading.

---

## Features

- Smooth orthographic side camera with live zoom and fit
- Jump and duck mechanics (no duck in mid‑air)
- Obstacles and coins with collisions and SFX
- Score + persistent High Score (localStorage)
- Keyboard and touch controls (two‑finger tap to pause)
- Debug helpers (axes, grid, bbox) toggle via H or HUD button

## Controls

- Jump: Space / ArrowUp / W
- Duck (hold): ArrowDown / S
- Pause/Resume: P (or two‑finger tap)
- Helpers: H or HUD “Helpers” button
- Camera: ] / [ to zoom, F fit to player, R reset

## Quick Start

1) Install deps
```
npm install
```
2) Run dev server (Vite)
```
npm run dev
```
3) Open the game
```
http://localhost:5173
```

Build and preview
```
npm run build
npm run preview
```

## Project Structure (current)

- `public/`
  - `models/` dino.glb, cactus.glb, coin.glb
  - `textures/environment/ground.png` (optional)
  - `sounds/` bg_music.mp3, jump.ogg, hit.ogg, coin.ogg
- `src/`
  - `core/Game.js` main engine, camera, loop, scoring
  - `entities/Player.js` dino model, animations, jump/duck, collider
  - `systems/ObstacleManager.js` cactus/coin logic, collisions
  - `managers/AssetLoader.js`, `managers/SoundManager.js`
  - `main.js` bootstrap + UI wiring
- `index.html` HUD and overlays
- `vite.config.js`, `package.json`

---

================================================================================
Project Structure Explained
================================================================================

This is the high-level layout of the project directory, designed for clarity and scalability:

3D_DinoGame/
│
├── public/ # Static assets served directly by Vercel
│ ├── models/ # 3D models (.glb) for dino, obstacles, enemies
│ ├── textures/ # Textures for environments, characters, props, effects
│ └── sounds/ # Sound effects and background music
│
├── src/ # All source code files organized by functionality
│ ├── core/ # Engine bootstrap & main game loop
│ │ ├── EngineInit.js # Babylon engine setup and canvas resizing
│ │ ├── SceneManager.js # Controls switching between game states/scenes
│ │ ├── InputManager.js # Keyboard, mouse, and touch input handling
│ │ └── Game.js # Main game orchestrator, game flow control
│ │
│ ├── environments/ # Different game levels or biomes
│ │ ├── DesertScene.js
│ │ ├── JungleScene.js
│ │ └── CityScene.js
│ │
│ ├── entities/ # Game objects: player, enemies, obstacles, power-ups
│ │ ├── Dino.js
│ │ ├── Obstacle.js
│ │ ├── Enemy.js
│ │ └── PowerUp.js
│ │
│ ├── animations/ # Handlers for character and environmental animations
│ │ ├── DinoAnimations.js
│ │ ├── EnvironmentAnimations.js
│ │ └── TransitionEffects.js # Scene fades, camera swoops, visual transitions
│ │
│ ├── systems/ # Core gameplay systems and logic modules
│ │ ├── PhysicsSystem.js
│ │ ├── CollisionSystem.js
│ │ ├── ScoringSystem.js
│ │ ├── DifficultySystem.js # Adjusts game difficulty dynamically
│ │ └── PowerUpSystem.js
│ │
│ ├── vfx/ # Visual and post-processing effects
│ │ ├── ParticleEffects.js # Dust, explosions, sparkles
│ │ ├── PostProcessing.js # Bloom, motion blur, color grading
│ │ └── WeatherSystem.js # Environmental effects like rain, fog, sandstorms
│ │
│ ├── ui/ # User interface components and screens
│ │ ├── HUD.js # Heads-up display: score, health, power-ups
│ │ ├── MainMenu.js
│ │ ├── PauseMenu.js
│ │ ├── GameOverScreen.js
│ │ └── ShopScreen.js # Skins, upgrades, and in-game purchases
│ │
│ ├── assets/ # Asset management and loading helpers
│ │ ├── AssetLoader.js
│ │ └── AssetManifest.js
│ │
│ ├── utils/ # Utility functions and helpers
│ │ ├── MathUtils.js
│ │ ├── SoundManager.js
│ │ ├── Settings.js
│ │ └── Logger.js # Debugging and logging tools
│ │
│ ├── tests/ # Automated tests for game logic and systems
│ │ ├── collision.test.js
│ │ ├── scoring.test.js
│ │ └── input.test.js
│ │
│ ├── config/ # Configuration files for tuning and controls
│ │ ├── gameConfig.json # Gameplay tuning parameters
│ │ ├── graphicsConfig.json # Rendering and quality settings
│ │ └── controlsConfig.json # Key bindings and control settings
│ │
│ └── index.js # The main game entry point
│
├── build/ # Compiled or bundled output (ignored in git)
│
├── scripts/ # Scripts for development, optimization, and deployment
│ ├── optimizeModels.js # Compress and optimize 3D models (.glb)
│ ├── generateSpriteSheets.js # Tools for creating sprite animations
│ └── deployVercel.js # Automate deployment to Vercel
│
├── package.json # NPM package metadata and dependencies
├── vercel.json # Vercel deployment configuration
├── .gitignore # Git ignore rules
├── README.md # You are here - project documentation
└── LICENSE # License file for open-source terms


---

================================================================================
How to Get Started
================================================================================

1. **Clone the repository**  
git clone https://github.com/artasyaskar/3D_DinoGame.git

2. **Install dependencies**  
npm install

3. **Start the development server**  
npm run dev

4. **Open the game**  
Visit `http://localhost:5173` in your web browser to play and test.

---

================================================================================
How It Works - The Big Picture
================================================================================

- The game boots with `src/main.js` which creates `Game` and wires UI.
- `src/core/Game.js` sets up Three.js scene, orthographic camera, lights, renderer, loop, scoring, and high score.
- `src/entities/Player.js` loads and normalizes the GLTF dino, plays animations, handles jump/duck and collider.
- `src/systems/ObstacleManager.js` spawns cacti/coins, updates movement, collisions and pickups.
- `src/managers/AssetLoader.js` and `src/managers/SoundManager.js` handle assets and audio (Howler).
- Static assets are served from `public/` via absolute paths like `/models/dino.glb`.

---

================================================================================
Technologies Used
================================================================================

- **Three.js** — Rendering and scene management
- **Vite** — Dev server and build
- **Howler.js** — Audio (BGM + SFX)
- **GSAP** — Micro‑tweens where applicable
- **JavaScript (ES Modules)**, **HTML5/CSS3**

---

================================================================================
Contribution Guidelines
================================================================================

Contributions are highly welcome! To contribute:

- Fork the repo
- Create a feature branch:  
git checkout -b feature/my-feature
- Commit your changes with clear messages:  
git commit -m "Add feature X"
- Push to your branch:  
git push origin feature/my-feature

- Open a pull request for review and discussion

Please ensure your code follows existing style conventions and includes appropriate comments.

---

================================================================================
License
================================================================================

This project is open source and licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

================================================================================
Contact & Support
================================================================================

Feel free to open issues or contact me for questions, suggestions, or help.  
Let’s build an amazing 3D Dino game experience together!

---

Thank you for exploring **3D_DinoGame**!  
Happy coding and gaming! 🚀🦖
