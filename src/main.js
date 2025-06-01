import App from './App';
import { preloadAssets } from './utils/Loader';

document.addEventListener('DOMContentLoaded', () => {
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
  `;
  loading.innerText = 'Loading assets...';
  document.body.appendChild(loading);
  
  preloadAssets();
  
  window.addEventListener('assetsLoaded', () => {
    document.body.removeChild(loading);
    const app = new App();
    app.start();
  });
});
