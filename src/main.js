import App from './App';
import { preloadAssets } from './utils/Loader';

// Global error handler
window.addEventListener('error', function(event) {
  console.error('Global error:', event.error);
  const errorDisplay = document.createElement('div');
  errorDisplay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background: rgba(255,0,0,0.8);
    color: white;
    padding: 10px;
    font-family: monospace;
    z-index: 9999;
  `;
  errorDisplay.textContent = 'Error: ' + (event.error ? event.error.message : event.message);
  document.body.appendChild(errorDisplay);
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded - starting game initialization');
  
  // Display loading message
  const loading = document.createElement('div');
  loading.id = 'loading';
  loading.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 24px;
    color: white;
    background: rgba(0,0,0,0.7);
    padding: 20px;
    border-radius: 10px;
    text-align: center;
  `;
  loading.innerHTML = 'Loading assets...<br><small>Please wait</small>';
  document.body.appendChild(loading);
  
  // Set a timeout in case assets never load
  const assetTimeout = setTimeout(() => {
    console.warn('Asset loading timed out - forcing start');
    loading.innerHTML += '<br><small>Loading taking longer than expected...</small>';
    startGame();
  }, 10000); // 10 second timeout
  
  try {
    preloadAssets();
    console.log('Asset preloading initiated');
  } catch (error) {
    console.error('Error preloading assets:', error);
    clearTimeout(assetTimeout);
    startGame(); // Force start even if asset preloading fails
  }
  
  // Assets loaded event handler
  window.addEventListener('assetsLoaded', () => {
    console.log('Assets loaded successfully');
    clearTimeout(assetTimeout);
    startGame();
  });
  
  // Function to start the game
  function startGame() {
    try {
      // Remove loading screen if it exists
      if (document.body.contains(loading)) {
        document.body.removeChild(loading);
      }
      
      console.log('Initializing game app');
      
      // Run diagnostics before initializing
      if (window.runDiagnostics) {
        window.runDiagnostics();
      }
      
      // Check WebGL context
      if (window.RENDERER_INFO && window.RENDERER_INFO.error) {
        throw new Error('WebGL initialization failed: ' + window.RENDERER_INFO.error);
      }
      
      // Create the game app instance
      const app = new App();
      
      // Store globally for restart functionality and debugging
      window.gameApp = app; 
      
      // Check that dinosaur model is loaded or has fallback
      if (window.ASSET_PATHS) {
        console.log('Asset paths ready:', window.ASSET_PATHS);
      } else {
        console.warn('Asset paths not available, fallbacks will be used');
      }
      
      // Start the game
      app.start();
      console.log('Game started successfully');
      
      // Setup debug button
      const debugButton = document.createElement('button');
      debugButton.innerText = 'Run Diagnostics';
      debugButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 1000;
        padding: 5px 10px;
        background: #333;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      `;
      document.body.appendChild(debugButton);
      
      debugButton.addEventListener('click', () => {
        if (window.runDiagnostics) {
          window.runDiagnostics();
        }
      });
    } catch (error) {
      console.error('Error starting game:', error);
      const errorDisplay = document.createElement('div');
      errorDisplay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 20px;
        font-family: monospace;
        z-index: 9999;
        text-align: center;
        border-radius: 10px;
        max-width: 80%;
      `;
      errorDisplay.innerHTML = `
        <h3>Error Starting Game</h3>
        <p>${error.message}</p>
        <pre style="text-align: left; background: #222; padding: 10px; max-height: 200px; overflow: auto;">${error.stack || 'No stack trace available'}</pre>
        <p>Check the browser console for more details.</p>
        <button id="retry-btn" style="padding: 8px 16px; margin-top: 10px; background: #4CAF50; border: none; color: white; cursor: pointer; border-radius: 4px;">Retry</button>
      `;
      document.body.appendChild(errorDisplay);
      
      document.getElementById('retry-btn').addEventListener('click', () => {
        location.reload();
      });
    }
  }
});
