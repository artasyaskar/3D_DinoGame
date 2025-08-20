export class SoundManager {
  constructor() {
    this.muted = false;
    this.bgm = null;
    this.sfx = {
      jump: null,
      hit: null,
      coin: null,
      rain: null,
    };
    this._difficulty = 0;
    this._bgmBaseVol = 0.5;
    this._duckTimer = 0;
    this._duckDur = 0;
  }

  async init(paths) {
    this.bgm = new Audio(paths.bg);
    this.bgm.loop = true;
    this.bgm.volume = this._bgmBaseVol;

    this.sfx.jump = new Audio(paths.jump);
    this.sfx.hit = new Audio(paths.hit);
    this.sfx.coin = new Audio(paths.coin);
    if (paths.rain) {
      try {
        this.sfx.rain = new Audio(paths.rain);
        this.sfx.rain.loop = true;
        this.sfx.rain.volume = 0.0; // start silent
      } catch {}
    }

    // Attempt to load; errors are non-fatal
    const audios = [this.bgm, this.sfx.jump, this.sfx.hit, this.sfx.coin, this.sfx.rain].filter(Boolean);
    await Promise.all(audios.map(a => new Promise((resolve) => {
      a.addEventListener('canplaythrough', () => resolve(), { once: true });
      a.addEventListener('error', () => resolve(), { once: true });
      // Safari sometimes needs a play/pause nudge after a user gesture
      // but we'll leave autoplay to be triggered from a user-initiated start.
    })));
  }

  playBgm() { if (!this.muted) this.bgm?.play().catch(() => {}); }
  pauseBgm() { this.bgm?.pause(); }
  resumeBgm() { this.playBgm(); }
  stopBgm() { this.bgm?.pause(); if (this.bgm) this.bgm.currentTime = 0; }

  playJump() { this._play(this.sfx.jump, 1.0 + this._difficulty * 0.05); }
  playHit() { this._play(this.sfx.hit, 1.0); }
  playCoin() {
    // Slight random pitch around a difficulty-influenced base
    const base = 1.0 + this._difficulty * 0.08;
    const jitter = (Math.random()*0.12 - 0.06);
    this._play(this.sfx.coin, Math.max(0.75, base + jitter));
  }

  _play(audio, rate = 1.0) {
    if (!audio) return;
    if (this.muted) return;
    try {
      audio.playbackRate = rate;
      audio.currentTime = 0;
      audio.play();
    } catch {}
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.bgm?.pause();
      this.sfx.rain?.pause();
    } else {
      this.playBgm();
      if (this.sfx.rain && this.sfx.rain.volume > 0.001) {
        this.sfx.rain.play().catch(()=>{});
      }
    }
    return this.muted;
  }

  setDifficulty(d) {
    this._difficulty = Math.max(0, Math.min(1, d || 0));
    if (this.bgm) this.bgm.playbackRate = 1.0 + this._difficulty * 0.05;
  }

  // Briefly reduce BGM volume, then restore. Call every frame with dt to drive recovery.
  duck(durationMs = 400, level = 0.2) {
    if (!this.bgm) return;
    this._duckDur = Math.max(this._duckDur, durationMs / 1000);
    this._duckTimer = 0;
    this.bgm.volume = Math.min(this.bgm.volume, level);
  }

  update(dt) {
    if (!this.bgm) return;
    if (this._duckTimer < this._duckDur) {
      this._duckTimer += dt;
      // Ease volume back to base
      const t = Math.min(1, this._duckTimer / this._duckDur);
      const eased = 1 - Math.pow(1 - t, 2);
      const target = this._bgmBaseVol;
      this.bgm.volume = this.bgm.volume + (target - this.bgm.volume) * Math.max(0.2, eased);
    } else {
      this.bgm.volume = this._bgmBaseVol;
    }

    // keep rain playing if needed
    if (this.sfx.rain) {
      if (!this.muted && this.sfx.rain.volume > 0.001 && this.sfx.rain.paused) {
        this.sfx.rain.play().catch(()=>{});
      }
    }
  }

  // 0..1 intensity controls rain loop volume (non-invasive)
  setRainIntensity(i) {
    if (!this.sfx.rain) return;
    const v = Math.max(0, Math.min(1, i || 0)) * 0.5; // cap at 0.5 volume
    this.sfx.rain.volume = v;
    if (v > 0 && !this.muted) {
      this.sfx.rain.play().catch(()=>{});
    } else if (v <= 0) {
      this.sfx.rain.pause();
      this.sfx.rain.currentTime = 0;
    }
  }
}
