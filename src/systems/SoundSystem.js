import { Howl } from 'howler';

const sounds = {
  jump: new Howl({ src: ['/assets/sounds/jump.ogg'] }),
  crash: new Howl({ src: ['/assets/sounds/crash.ogg'] }),
  background: new Howl({ 
    src: ['/assets/sounds/background.mp3'],
    loop: true,
    volume: 0.5
  })
};

export function playSound(type) {
  if (sounds[type]) sounds[type].play();
}

export function stopSound(type) {
  if (sounds[type]) sounds[type].stop();
}

export function playBackgroundMusic() {
  playSound('background');
}
