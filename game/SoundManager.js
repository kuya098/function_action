// サウンド管理クラス
export class SoundManager {
  constructor() {
    this.sounds = {};
    this.bgm = null;
    this.bgmVolume = 0.3;
    this.seVolume = 0.5;
    this.loadSounds();
  }

  loadSounds() {
    // SEの読み込み
    const soundFiles = {
      jump: 'game/sounds/jump.mp3',
      coin: 'game/sounds/coin.mp3',
      goal: 'game/sounds/goal.mp3',
      gameover: 'game/sounds/gameover.mp3',
      button: 'game/sounds/button.mp3',
      make_func: 'game/sounds/make_func.mp3',
      gameBGM: 'game/sounds/GameBGM.mp3',
      homeBGM: 'game/sounds/HomeBGM.mp3'
    };

    for (const [key, path] of Object.entries(soundFiles)) {
      this.sounds[key] = new Audio(path);
      if (key.includes('BGM')) {
        this.sounds[key].loop = true;
        this.sounds[key].volume = this.bgmVolume;
      } else {
        this.sounds[key].volume = this.seVolume;
      }
    }
  }

  playSE(name) {
    if (this.sounds[name]) {
      // 同じ音を重ねて再生できるようにクローンを作成
      const sound = this.sounds[name].cloneNode();
      sound.volume = this.seVolume;
      sound.play().catch(e => console.log('SE play error:', e));
    }
  }

  playBGM(name) {
    // 現在のBGMを停止
    this.stopBGM();
    
    if (this.sounds[name]) {
      this.bgm = this.sounds[name];
      this.bgm.currentTime = 0;
      this.bgm.play().catch(e => console.log('BGM play error:', e));
    }
  }

  stopBGM() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
    }
  }

  pauseBGM() {
    if (this.bgm) {
      this.bgm.pause();
    }
  }

  resumeBGM() {
    if (this.bgm) {
      this.bgm.play().catch(e => console.log('BGM resume error:', e));
    }
  }

  setBGMVolume(volume) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.bgm) {
      this.bgm.volume = this.bgmVolume;
    }
  }

  setSEVolume(volume) {
    this.seVolume = Math.max(0, Math.min(1, volume));
  }
}

// グローバルインスタンス
export const soundManager = new SoundManager();
