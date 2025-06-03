import { Howl } from 'howler';

export class SoundSystem {
  constructor() {
    this.sounds = {
      jump: new Howl({
        src: [window.ASSET_PATHS?.sounds?.jump || '/assets/sounds/effects/jump.ogg'],
        volume: 0.7
      }),
      hit: new Howl({
        src: [window.ASSET_PATHS?.sounds?.hit || '/assets/sounds/effects/crash.ogg'],
        volume: 0.8
      }),
      background: new Howl({
        src: [window.ASSET_PATHS?.sounds?.background || '/assets/sounds/music/background.mp3'],
        loop: true,
        volume: 0.5,
        preload: true
      })
    };

    this.volumeSettings = {
      master: 1,
      music: 0.7,
      sfx: 0.8
    };

    // Initialize volume from localStorage if available
    this.loadVolumeSettings();
  }

  loadVolumeSettings() {
    const savedSettings = localStorage.getItem('volumeSettings');
    if (savedSettings) {
      this.volumeSettings = { ...this.volumeSettings, ...JSON.parse(savedSettings) };
      this.updateAllVolumes();
    }
  }

  saveVolumeSettings() {
    localStorage.setItem('volumeSettings', JSON.stringify(this.volumeSettings));
  }

  setMasterVolume(volume) {
    this.volumeSettings.master = volume;
    this.updateAllVolumes();
    this.saveVolumeSettings();
  }

  setMusicVolume(volume) {
    this.volumeSettings.music = volume;
    this.updateAllVolumes();
    this.saveVolumeSettings();
  }

  setSFXVolume(volume) {
    this.volumeSettings.sfx = volume;
    this.updateAllVolumes();
    this.saveVolumeSettings();
  }

  updateAllVolumes() {
    const { master, music, sfx } = this.volumeSettings;
    
    // Update music volume
    if (this.sounds.background) {
      this.sounds.background.volume(master * music);
    }
    
    // Update SFX volumes
    ['jump', 'hit'].forEach(soundName => {
      if (this.sounds[soundName]) {
        this.sounds[soundName].volume(master * sfx);
      }
    });
  }

  playJump() {
    if (this.sounds.jump) {
      try {
        this.sounds.jump.play();
      } catch (error) {
        console.warn('Failed to play jump sound:', error);
      }
    }
  }

  playHit() {
    if (this.sounds.hit) {
      try {
        this.sounds.hit.play();
      } catch (error) {
        console.warn('Failed to play hit sound:', error);
      }
    }
  }

  playBackground() {
    if (this.sounds.background) {
      try {
        this.sounds.background.play();
      } catch (error) {
        console.warn('Failed to play background music:', error);
      }
    }
  }

  stopBackground() {
    if (this.sounds.background) {
      try {
        this.sounds.background.stop();
      } catch (error) {
        console.warn('Failed to stop background music:', error);
      }
    }
  }

  pauseBackground() {
    if (this.sounds.background) {
      try {
        this.sounds.background.pause();
      } catch (error) {
        console.warn('Failed to pause background music:', error);
      }
    }
  }
}

const soundSystemInstance = new SoundSystem();

export const playSound = (soundName) => {
  switch (soundName) {
    case 'jump':
      soundSystemInstance.playJump();
      break;
    case 'hit':
      soundSystemInstance.playHit();
      break;
    default:
      console.warn(`Sound "${soundName}" not recognized by playSound.`);
  }
};

export const playJump = () => soundSystemInstance.playJump();
export const playHit = () => soundSystemInstance.playHit();
export const playBackground = () => soundSystemInstance.playBackground();
export const stopBackground = () => soundSystemInstance.stopBackground();
export const pauseBackground = () => soundSystemInstance.pauseBackground();
export const setMasterVolume = (volume) => soundSystemInstance.setMasterVolume(volume);
export const setMusicVolume = (volume) => soundSystemInstance.setMusicVolume(volume);
export const setSFXVolume = (volume) => soundSystemInstance.setSFXVolume(volume);
