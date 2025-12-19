// サウンド管理クラス
export class SoundManager {
  constructor() {
    this.sounds = {};
    this.bgm = null;
    this.bgmVolume = 0.3;
    this.seVolume = 0.5;
    this.audioUnlocked = false;
    this.pendingBGM = null;
    this.loadSounds();
    this.setupAudioUnlock();
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

  setupAudioUnlock() {
    const unlockAudio = () => {
      if (this.audioUnlocked) return;
      
      this.audioUnlocked = true;
      
      // 保留中のBGMがあれば再生
      if (this.pendingBGM) {
        this.playBGM(this.pendingBGM);
        this.pendingBGM = null;
      }
      
      // イベントリスナーを削除
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
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
      // オーディオがアンロックされていない場合は保留
      if (!this.audioUnlocked) {
        this.pendingBGM = name;
        return;
      }
      
      this.bgm = this.sounds[name];
      // 直近の設定値を反映してから再生
      this.bgm.volume = this.bgmVolume;
      this.bgm.currentTime = 0;
      this.bgm.play().catch(e => {
        console.log('BGM play error:', e);
        // 再生失敗時は保留扱いに
        this.pendingBGM = name;
        this.audioUnlocked = false;
      });
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
