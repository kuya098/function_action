import { drawHome } from './home.js';
import { startGame } from './game.js';

// Canvas作成
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext('2d');

let currentScreen = 'home';
let removeHomeClick = null;
let gameInstance = null;

function showHome() {
  if (removeHomeClick) removeHomeClick(); // ホーム画面のクリック判定を解除
  if (gameInstance && gameInstance.loop) {
    // ゲームループ停止処理（必要なら追加）
  }
  removeHomeClick = drawHome(ctx, canvas, stageId => {
    if (stageId === 1) {
      showGame();
    } else {
      alert(`ステージ${stageId} はまだ未実装です`);
    }
  });
}

function showGame() {
  if (removeHomeClick) removeHomeClick(); // ホーム画面のクリック判定を解除
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  gameInstance = startGame(canvas, ctx);
}

// 初期表示
showHome();
