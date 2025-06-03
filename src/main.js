import App from './App';
import { preloadAssets } from './utils/Loader';

// Preload assets (models, textures, sounds, etc.) before starting the game
preloadAssets()
  .then(() => {
    // All assets loaded → instantiate and start the App
    window.gameApp = new App();
    window.gameApp.start();
  })
  .catch((error) => {
    console.error('Error initializing game:', error);
    const errorDisplay = document.createElement('div');
    errorDisplay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background: rgba(255,0,0,0.9);
      color: white;
      padding: 20px;
      font-family: monospace;
      text-align: left;
      z-index: 9999;
    `;
    errorDisplay.innerHTML = `
      <h3>Error Starting Game</h3>
      <p>${error.message}</p>
      <pre style="background: #222; padding: 10px; overflow: auto;">${
        error.stack || 'No stack trace available'
      }</pre>
      <button id="retry-btn" style="
        margin-top: 12px;
        background: #fff; color: #000;
        padding: 8px 16px;
        border: none; border-radius: 4px;
        cursor: pointer;
      ">Retry</button>
    `;
    document.body.appendChild(errorDisplay);

    document.getElementById('retry-btn').addEventListener('click', () => {
      window.location.reload();
    });
  });

// Global error handler for uncaught exceptions
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
});
