// 設定画面の描画・UI管理
import { soundManager } from './game/SoundManager.js';

export function drawSettings(ctx, canvas, onBack) {
  // 既存の画面UIをクリア
  const scoreScreenUI = document.getElementById('score-screen-ui');
  if (scoreScreenUI) scoreScreenUI.remove();
  
  const homeContainer = document.getElementById('home-container');
  if (homeContainer) homeContainer.remove();

  // キャンバスを非表示
  canvas.style.display = 'none';

  // 既存の設定画面コンテナを削除
  let settingsContainer = document.getElementById('settings-container');
  if (settingsContainer) settingsContainer.remove();

  // 設定画面コンテナを作成
  settingsContainer = document.createElement('div');
  settingsContainer.id = 'settings-container';
  settingsContainer.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 40px;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    text-align: center;
    min-width: 500px;
    font-family: Arial, sans-serif;
  `;

  // タイトル
  const title = document.createElement('h1');
  title.textContent = '設定';
  title.style.cssText = `
    margin: 0 0 30px 0;
    font-size: 36px;
    color: #333;
  `;
  settingsContainer.appendChild(title);

  // BGM音量設定
  const bgmSection = createVolumeControl(
    'BGM音量',
    soundManager.bgmVolume,
    (value) => {
      soundManager.setBGMVolume(value);
      localStorage.setItem('bgmVolume', value);
    }
  );
  settingsContainer.appendChild(bgmSection);

  // SE音量設定
  const seSection = createVolumeControl(
    'SE音量',
    soundManager.seVolume,
    (value) => {
      soundManager.setSEVolume(value);
      localStorage.setItem('seVolume', value);
    }
  );
  settingsContainer.appendChild(seSection);

  // 戻るボタン
  const backButton = document.createElement('button');
  backButton.innerHTML = '<i class="fas fa-arrow-left"></i> 戻る';
  backButton.style.cssText = `
    margin-top: 30px;
    padding: 15px 40px;
    font-size: 20px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.3s;
  `;
  backButton.onmouseover = () => backButton.style.background = '#45a049';
  backButton.onmouseout = () => backButton.style.background = '#4CAF50';
  backButton.onclick = () => {
    soundManager.playSE('button');
    settingsContainer.remove();
    onBack();
  };
  settingsContainer.appendChild(backButton);

  // DOM に追加
  document.querySelector('.center').appendChild(settingsContainer);
}

function createVolumeControl(label, initialValue, onChange) {
  const section = document.createElement('div');
  section.style.cssText = `
    margin: 20px 0;
    text-align: left;
  `;

  const labelElement = document.createElement('label');
  labelElement.textContent = label;
  labelElement.style.cssText = `
    display: block;
    font-size: 18px;
    color: #333;
    margin-bottom: 10px;
    font-weight: bold;
  `;
  section.appendChild(labelElement);

  const controlContainer = document.createElement('div');
  controlContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 15px;
  `;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = Math.round(initialValue * 100);
  slider.style.cssText = `
    flex: 1;
    height: 8px;
    border-radius: 5px;
    background: #ddd;
    outline: none;
    cursor: pointer;
  `;

  const valueDisplay = document.createElement('span');
  valueDisplay.textContent = `${Math.round(initialValue * 100)}%`;
  valueDisplay.style.cssText = `
    font-size: 18px;
    color: #333;
    min-width: 50px;
    text-align: right;
  `;

  slider.oninput = () => {
    const value = parseFloat(slider.value) / 100;
    valueDisplay.textContent = `${slider.value}%`;
    onChange(value);
  };

  controlContainer.appendChild(slider);
  controlContainer.appendChild(valueDisplay);
  section.appendChild(controlContainer);

  return section;
}
