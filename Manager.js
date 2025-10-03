import { drawHome } from './Home.js';
import { startGame } from './game/Main.js';

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
    if (stageId <= 3) {
      showGame(stageId);
    } else {
      alert(`ステージ${stageId} はまだ未実装です`);
    }
  });
  window.showHome = showHome;
}

function showGame(stageId) {
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

// 初期表示
showHome();
