# Dino Runner 3D

A professional 3D implementation of Google Chrome's offline dinosaur game with enhanced graphics and responsive design.

## Features
- Professional 3D graphics using Three.js
- Responsive design for desktop and mobile
- Touch and keyboard controls
- Score tracking with high scores
- Dynamic lighting and shadows
- Sound effects and background music (graceful fallback if assets missing)
- Procedural obstacle generation
- Increasing difficulty over timevelopment
```bash
npm run dev
```
Open http://localhost:5173 in your browser.

## Building for Production
```bash
npm run build
```
This creates a `dist` folder with optimized production files.

## Preview Production Build
```bash
npm run preview
```
Open http://localhost:4173 to test the production build.

## Deployment Options

### 1. GitHub Pages
```bash
npm run deploy
```
This builds the project and deploys to GitHub Pages.

### 2. Netlify
1. Build the project: `npm run build`
2. Upload the `dist` folder to Netlify
3. Or connect your GitHub repository to Netlify for automatic deployments

### 3. Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts

### 4. Static File Hosting
Upload the contents of the `dist` folder to any static file hosting service:
- AWS S3 + CloudFront
- Firebase Hosting
- Surge.sh
- Any web server

## Controls
- **Space** or **Up Arrow**: Jump
- **Click/Tap**: Jump (mobile friendly)
- **R**: Restart game (when game over)

## Game Mechanics
- Jump over obstacles to avoid collision
- Score increases over time
- Game speed and obstacle frequency increase gradually
- High score is saved locally

## Technical Details
- Built with Vite for fast development and optimized builds
- Uses Three.js for 3D graphics
- Howler.js for audio (with graceful fallback)
- Responsive design works on desktop and mobile
- Optimized for performance with shadow mapping and efficient rendering

## Troubleshooting
- If assets fail to load, the game uses fallback 3D models
- Audio files are optional - game works without them
- Ensure your browser supports WebGL for 3D graphics
