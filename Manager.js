import { drawHome } from './Home.js';
import { drawSettings } from './Settings.js';
import { startGame } from './game/Main.js';
import { soundManager } from './game/SoundManager.js';

// グローバルにsoundManagerを設定
window.soundManager = soundManager;

// localStorageから音量設定を読み込む
const savedBGMVolume = localStorage.getItem('bgmVolume');
const savedSEVolume = localStorage.getItem('seVolume');
if (savedBGMVolume !== null) {
  soundManager.setBGMVolume(parseFloat(savedBGMVolume));
}
if (savedSEVolume !== null) {
  soundManager.setSEVolume(parseFloat(savedSEVolume));
}

// Canvas作成
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext('2d');

let currentScreen = 'home';
let removeHomeClick = null;
let gameInstance = null;

function showHome() {
  if (removeHomeClick) {
    removeHomeClick();
    removeHomeClick = null;
  }
  gameInstance = null;
  // 入力欄のエレメントを削除 ボタンも
  const input = document.getElementById('expr');
  const button = document.getElementById('drawBtn');
  if (input) {
    input.remove();
  }
  if (button) {
    button.remove();
  }

  removeHomeClick = drawHome(ctx, canvas, stageId => {
    if (stageId <= 4) {
      showGame(stageId);
    } else {
      alert(`ステージ${stageId} はまだ未実装です`);
    }
  });
  window.showHome = showHome;
}

function showSettings() {
  if (removeHomeClick) {
    removeHomeClick();
    removeHomeClick = null;
  }
  drawSettings(ctx, canvas, () => {
    showHome();
  });
}

function showGame(stageId) {
  // 画面遷移時にscore-screen-uiを必ず削除
  const scoreScreenUI = document.getElementById('score-screen-ui');
  if (scoreScreenUI) scoreScreenUI.remove();
  window.currentStageId = stageId;
  if (removeHomeClick) {
    removeHomeClick();
    removeHomeClick = null;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  gameInstance = startGame(canvas, ctx, stageId);
}

window.nextStage = function() {
  console.log("nextStage called");
  console.log(showGame, window.currentStageId);
  if (showGame && typeof window.currentStageId === 'number') {
    showGame(window.currentStageId + 1);
  // } else {
  //   location.reload();
  }
};

window.showSettings = showSettings;

// 初期表示
showHome();
