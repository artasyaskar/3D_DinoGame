import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Howl } from 'howler';

// Store loaded assets
const models = {};
const sounds = {};

export function preloadAssets() {
  return Promise.all([loadModels(), loadSounds()]);
}

function loadModels() {
  const loader = new GLTFLoader();
  const toLoad = [
    { name: 'dino', path: import.meta.env.BASE_URL + 'assets/models/characters/dino.glb' },
    // Add any other models here
  ];

  const promises = toLoad.map((item) => {
    return new Promise((resolve, reject) => {
      loader.load(
        item.path,
        (gltf) => {
          models[item.name] = gltf.scene;
          resolve();
        },
        undefined,
        (error) => {
          reject(new Error(`Failed to load model ${item.name}: ${error}`));
        }
      );
    });
  });

  return Promise.all(promises);
}

function loadSounds() {
  const toLoad = [
    {
      name: 'jump',
      src: [import.meta.env.BASE_URL + 'assets/sounds/jump.mp3']
    },
    {
      name: 'collision',
      src: [import.meta.env.BASE_URL + 'assets/sounds/collision.mp3']
    }
    // Add other sounds here
  ];

  toLoad.forEach((item) => {
    sounds[item.name] = new Howl({
      src: item.src,
      preload: true
    });
  });

  // No need to wait – Howler preloads automatically
  return Promise.resolve();
}

export function getModel(name) {
  return models[name]?.clone();
}

export function playSound(name) {
  if (sounds[name]) {
    sounds[name].play();
  }
}
