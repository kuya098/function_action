import { Game } from './Game.js';

export function startGame(canvas, ctx, stageId) {
  // 入力欄とボタンを表示
  let input = document.getElementById('expr');
  let button = document.getElementById('drawBtn');
  if (!input) {
    input = document.createElement('input');
    input.id = 'expr';
    input.type = 'text';
    input.value = '0';
    input.style.width = '200px';
    document.body.appendChild(input);
  }
  if (!button) {
    button = document.createElement('button');
    button.id = 'drawBtn';
    button.textContent = '描画';
    document.body.appendChild(button);
  }
  const game = new Game(canvas, ctx, stageId);
  button.onclick = () => {
    const expr = input.value;
    game.setFunction(expr);
  };
  return game;
}