# 3D_DinoGame

## Overview

3D Dino Game is a polished 3D endless runner inspired by Chrome’s offline dino, rebuilt with modern Web tech. It features responsive controls, orthographic side-view camera, dynamic weather, parallax backgrounds, post effects, particles, coins, and obstacles — all running client‑side in the browser.

Built with Three.js and Vite. Static assets live in `public/` and are fetched at runtime.

---

## Features

- Orthographic side camera with adaptive sizing and safe area
- Player jump, coyote time, buffered jumps, and duck (no duck in mid‑air)
- Obstacles (cacti, optional bird) and collectible coins with collisions
- Scoring, difficulty scaling, and persistent high score (localStorage)
- Dynamic Weather System: day/night, fog, rain (with pooled drops + splashes)
- Parallax background + sky clouds and night stars
- Lightweight PostFX (vignette, exposure) with no external deps
- Particle effects: dust, jump/land bursts, coin sparkles
- Sound Manager using native HTML Audio (BGM, jump, hit, coin, rain loop)
- Keyboard, mouse, and touch input; HUD overlays for start, pause, and game over
- Platform-specific scale: larger entities on Windows desktop for clarity

---

## Controls

- Jump: Space / ArrowUp / W / Tap
- Duck (hold): ArrowDown / S / Hold touch lower area
- Pause/Resume: P or two‑finger tap
- Mute/Unmute: HUD mute button
- Weather hotkeys: 1 = sunny, 2 = cloudy, 3 = rainy, 4 = foggy

---

## Quick Start

1) Install dependencies
```bash
npm install
```
2) Run the dev server (Vite is configured to strict port 5189)
```bash
npm run dev
```
3) Open the game
```text
http://localhost:5189
```

Build and preview
```bash
npm run build
npm run preview
```

---

## Project Structure

- `public/`
  - `models/` GLB assets, e.g. `dino.glb`, `cactus.glb`, `bird.glb`, `coin.glb`
  - `textures/` environment and effects textures (optional; graceful fallbacks exist)
  - `sounds/` `bg_music.mp3`, `jump.ogg`, `hit.ogg`, `coin.ogg`, optional `rain.ogg`
- `src/`
  - `core/Game.js` main engine: scene, camera, renderer, loop, scoring, difficulty
  - `entities/Player.js` player model/animations, jump/duck, collider
  - `systems/ObstacleManager.js` obstacles and coin spawning, collisions
  - `systems/BackgroundSystem.js` sky plane, gradient ground band, parallax layers
  - `systems/SkySystem.js` clouds and night stars
  - `systems/WeatherSystem.js` day/night, fog, rain pooling, exposure control
  - `systems/ParticleSystem.js` dust and sparkle particles
  - `systems/PostFXSystem.js` simple full‑screen pass (vignette/exposure)
  - `managers/AssetLoader.js` GLB loader with cache
  - `managers/SoundManager.js` audio playback with difficulty‑aware pitch and rain loop
  - `main.js` bootstrap, HUD wiring, input handlers
- `index.html` HUD overlays and root container
- `vite.config.js`, `package.json`

---

## How It Works

- Entry point `src/main.js` creates `new Game()` and wires UI, input, and overlays.
- `src/core/Game.js` orchestrates scene/camera/renderer, systems, loop, scoring, difficulty, and platform scaling.
- Player (`src/entities/Player.js`) loads GLTF, normalizes scale, blends animations (run/jump/duck/stumble), and exposes a collider.
- Obstacles + coins (`src/systems/ObstacleManager.js`) spawn based on speed/difficulty, move left, detect collisions, and clean up.
- Weather (`src/systems/WeatherSystem.js`) drives day/night exposure, fog density, rain intensity, sky tint, stars visibility, and rain SFX.
- Background/Sky (`src/systems/BackgroundSystem.js`, `src/systems/SkySystem.js`) render sky, gradient ground band, clouds, stars, and parallax.
- PostFX (`src/systems/PostFXSystem.js`) applies a subtle vignette and exposure on a full‑screen pass.
- Particles (`src/systems/ParticleSystem.js`) emit dust/sparkles for landings, jumps, coins, and bird trails.

---

## Assets

- All assets are served from `public/` and referenced with absolute paths like `/models/dino.glb`.
- Missing textures are handled gracefully via generated Canvas textures; you’ll see warnings but no crashes.
- Audio auto‑play requires a user gesture in many browsers — press Start or jump to enable sounds.

---

## Troubleshooting

- White/blank screen: check devtools console for 404s under `/models` or `/textures`. Ensure assets are present in `public/`.
- No audio: interact with the page (click/tap). Ensure the Mute toggle in HUD is off.
- Wrong URL/port: Vite uses strict port 5189 (`vite.config.js`). Open `http://localhost:5189`.
- Performance issues: reduce window size, disable helpers, or lower vignette exposure in `PostFXSystem`.

---

## Technology

- Three.js (r160+)
- Vite (dev/build tooling)
- Native HTML Audio for SFX/BGM
- JavaScript (ES Modules), HTML5, CSS

Note: `howler` may be present in dependencies but is not required; the current code uses native Audio.

---

## Contributing

Contributions are welcome.
- Fork and create a feature branch
- Commit with clear messages
- Open a PR for discussion/review

Please follow the existing style and keep features modular (entities/systems/managers).

---

## License

MIT — see `LICENSE` for details.

---

## Credits

Inspired by Chrome’s Dino Game. Models/textures/sounds belong to their respective authors or are placeholders for demonstration.

Enjoy running! 🦖
