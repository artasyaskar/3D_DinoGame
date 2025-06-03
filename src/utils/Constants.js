import * as THREE from 'three';

// Store initialization status globally for debugging
window.RENDERER_INFO = { initialized: false, error: null };

// Create scene
export const scene = new THREE.Scene();
let renderer, camera;

// Try to detect WebGL support
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    console.error('WebGL detection failed:', e);
    return false;
  }
}

// Initialize renderer with robust error handling
try {
  if (!isWebGLAvailable()) {
    throw new Error('WebGL not supported by this browser');
  }
  
  // Create renderer with optimal settings
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    alpha: true
  });
  // Configure renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  
  // Store info for debugging
  window.RENDERER_INFO.initialized = true;
  window.RENDERER_INFO.renderer = 'THREE.WebGLRenderer';
  window.RENDERER_INFO.version = THREE.REVISION;
  console.log('Renderer initialized successfully:', window.RENDERER_INFO);
} catch (e) {
  console.error('Failed to initialize renderer:', e);
  window.RENDERER_INFO.error = e.message;
  
  // Create a fallback renderer for diagnostics
  renderer = {
    domElement: document.createElement('div'),
    render: () => {},
    setSize: () => {},
    setPixelRatio: () => {},
    shadowMap: { enabled: false, type: null },
    toneMapping: null,
    toneMappingExposure: 1,
    outputColorSpace: null
  };
  
  // Add error message to DOM
  const errorMsg = document.createElement('div');
  errorMsg.style.cssText = 'position:fixed;top:0;left:0;width:100%;padding:20px;background:red;color:white;text-align:center;z-index:9999;';
  errorMsg.innerHTML = 'WebGL Error: ' + e.message + '. Please try a different browser or update your graphics drivers.';
  document.body.appendChild(errorMsg);
}

// Advanced camera setup for better game view
camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 3, 10); // Positioned to see both dino and obstacles better
camera.lookAt(0, 1, 0);

// Enhanced lighting system
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

// Main directional light (sun)
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(2, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -15;
directionalLight.shadow.camera.right = 15;
directionalLight.shadow.camera.top = 15;
directionalLight.shadow.camera.bottom = -15;
directionalLight.shadow.bias = -0.0001;
scene.add(directionalLight);

// Fill light
const fillLight = new THREE.DirectionalLight(0x7ec0ee, 0.3);
fillLight.position.set(-2, 3, -2);
scene.add(fillLight);

// Set background color
scene.background = new THREE.Color(0x87ceeb); // Sky blue

// Add subtle fog for depth
scene.fog = new THREE.Fog(0x87ceeb, 20, 100);

// Background setup - use gradient sky instead of texture
const createGradientSky = () => {
  try {
    // Create a simple gradient background
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    // Create gradient from light blue to darker blue
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB'); // Sky blue
    gradient.addColorStop(1, '#4682B4'); // Steel blue
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
    console.log('Created gradient sky background');
  } catch (e) {
    console.error('Error creating gradient sky:', e);
    scene.background = new THREE.Color(0x87ceeb); // fallback solid color
  }
};

// Try to load sky texture, fallback to gradient
const textureLoader = new THREE.TextureLoader();
if (window.ASSET_PATHS?.textures?.sky) {
  textureLoader.load(
    window.ASSET_PATHS.textures.sky,
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = texture;
      console.log('Successfully loaded sky texture');
    },
    undefined,
    (error) => {
      console.warn('Failed to load sky texture, using gradient:', error);
      createGradientSky();
    }
  );
} else {
  createGradientSky();
}

// Resize handler with error catching
window.addEventListener('resize', () => {
  try {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    console.log('Resized renderer to:', window.innerWidth, 'x', window.innerHeight);
  } catch (e) {
    console.error('Error during resize:', e);
  }
});

// Export the renderer and camera
export { renderer, camera };
