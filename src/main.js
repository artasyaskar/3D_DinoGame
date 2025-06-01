import App from './App';
import { preloadAssets } from './utils/Loader';

document.addEventListener('DOMContentLoaded', () => {
  const loading = document.createElement('div');
  loading.id = 'loading';
  loading.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 24px;
    color: white;
    z-index: 100;
  `;
  loading.innerText = 'Loading assets...';
  document.body.appendChild(loading);
  
  preloadAssets(() => {
    document.body.removeChild(loading);
    const app = new App();
    app.start();
  });
  
  // Fallback in case assets don't load
  setTimeout(() => {
    if (document.getElementById('loading')) {
      loading.innerHTML = 'Assets taking longer than expected. Trying to start game...';
      const app = new App();
      app.start();
    }
  }, 5000);
});
