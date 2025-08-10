# 3D_DinoGame

================================================================================
Overview
================================================================================

Welcome to **3D_DinoGame**, a modern, browser-based 3D endless runner inspired by the classic Chrome Dino game — but taken to a whole new level with stunning 3D visuals, smooth animations, and immersive environments.

Built with the powerful WebGL engine **Babylon.js**, this project aims to deliver a polished, engaging game experience that feels like a Gameloft studio title — all while running directly in your browser and deployable easily on platforms like Vercel.

Whether you are a game developer, a learner, or simply curious, this repository contains a full 3D game framework demonstrating modular design, asset management, and advanced game systems in JavaScript.

---

================================================================================
Why This Project Exists
================================================================================

- To provide a solid foundation for building high-quality 3D web games.
- To demonstrate best practices for organizing code and assets in complex game projects.
- To learn and showcase game programming techniques including animation, physics, UI, and audio.
- To create a base for future expansion with more environments, enemies, and gameplay features.
- To experiment with deploying 3D games seamlessly on free platforms like Vercel.

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
npm start

4. **Open the game**  
Visit `http://localhost:3000` in your web browser to play and test.

---

================================================================================
How It Works - The Big Picture
================================================================================

- The game boots up by initializing Babylon.js in `src/core/EngineInit.js`, setting up the WebGL canvas, and handling resizing.
- Game scenes (biomes like desert, jungle, city) load from `src/environments/` dynamically.
- The player’s dinosaur, enemies, obstacles, and power-ups are represented as entities in `src/entities/`.
- Animations for characters and environmental elements live inside `src/animations/`.
- Core gameplay logic—physics simulation, collision detection, scoring, and difficulty progression—is managed in the `src/systems/` folder.
- Visual effects, including particles, weather, and post-processing (bloom, motion blur), enhance immersion and live in `src/vfx/`.
- The user interface for menus, HUD, pause screens, and shops is modularized under `src/ui/`.
- Asset management (loading models, textures, and sounds) is centralized via `src/assets/AssetLoader.js`.
- Utility code like math helpers, sound control, and logging is in `src/utils/`.
- Automated tests ensure stable gameplay logic in `src/tests/`.
- Configuration files in `src/config/` make tuning gameplay, graphics, and controls easy.

---

================================================================================
Technologies Used
================================================================================

- **Babylon.js** — WebGL-based 3D engine powering the rendering and game loop  
- **JavaScript (ES6+)** — The core programming language driving game logic  
- **HTML5 & CSS3** — For UI and styling  
- **Node.js & npm** — Dependency management and build tooling  
- **Vercel** — Cloud platform for effortless deployment and hosting  
- **Git & GitHub** — Version control and collaboration platform

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
