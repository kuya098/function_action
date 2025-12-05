import { Game } from './Game.js';

/**
 * ゲーム起動メイン関数
 * @param {HTMLCanvasElement} canvas - ゲーム用キャンバス要素
 * @param {CanvasRenderingContext2D} ctx - 描画コンテキスト
 * @param {number} stageId - ステージID
 * @returns {Game} ゲームインスタンス
 */
export function startGame(canvas, ctx, stageId) {
  const inputId = 'expr';
  const buttonId = 'drawBtn';

  // 入力欄の初期化
  let input = document.getElementById(inputId);
  if (!input) {
    input = createInputField(inputId);
    // .input-containerに追加
    const inputContainer = document.querySelector('.input-container');
    if (inputContainer) {
      inputContainer.appendChild(input);
    } else {
      document.body.appendChild(input);
    }
  }

  // ボタンの初期化
  let button = document.getElementById(buttonId);
  if (!button) {
    button = createButton(buttonId);
    // .input-containerに追加
    const inputContainer = document.querySelector('.input-container');
    if (inputContainer) {
      inputContainer.appendChild(button);
    } else {
      document.body.appendChild(button);
    }
  }

  // ゲーム開始
  const game = new Game(canvas, ctx, stageId);

  // ボタンイベント
  button.onclick = () => {
    game.setFunction(input.value);
  };

  return game;
}

/**
 * 数式入力フィールドを作成
 * @param {string} id - 要素ID
 * @returns {HTMLInputElement}
 */
function createInputField(id) {
  const input = document.createElement('input');
  input.id = id;
  input.type = 'text';
  input.value = '0';
  input.style.width = '200px';
  return input;
}

/**
 * 描画ボタンを作成
 * @param {string} id - 要素ID
 * @returns {HTMLButtonElement}
 */
function createButton(id) {
  const button = document.createElement('button');
  button.id = id;
  button.textContent = '描画';
  return button;
}
