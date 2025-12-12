// ホーム画面の描画・UI管理
// FontAwesomeアイコンを使ったUI実装

import { soundManager } from './game/SoundManager.js';

let stageData = {};
fetch('game/stage_data.json')
  .then(response => response.json())
  .then(data => {
    stageData = data;
  });

function getClearData(stageId) {
  const key = `stage_${stageId}_clear`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

function getClearRate(stageId) {
  const clearData = getClearData(stageId);
  
  if (!clearData || !clearData.cleared) return 0;
  
  // クリアで50%、コレクティブル取得率で残り50%
  const baseRate = 50;
  const collectRate = (clearData.collected / clearData.total) * 50;
  
  return Math.round(baseRate + collectRate);
}

export function drawHome(ctx, canvas, onStageSelect) {
  // クリア画面UIが残っていたら削除
  const scoreScreenUI = document.getElementById('score-screen-ui');
  if (scoreScreenUI) scoreScreenUI.remove();

  // ホームBGMを再生
  soundManager.playBGM('homeBGM');

  // キャンバス描画をクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // キャンバスを非表示にしてHTMLベースUIを表示
  canvas.style.display = 'none';

  // 既存のホーム画面コンテナを削除
  let homeContainer = document.getElementById('home-container');
  if (homeContainer) homeContainer.remove();

  // ホーム画面コンテナを作成
  homeContainer = document.createElement('div');
  homeContainer.id = 'home-container';
  homeContainer.style.cssText = `
    max-width: 600px;
    margin: 40px auto 0 auto;
    padding: 40px 20px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;

  // タイトル
  const title = document.createElement('h1');
  title.style.cssText = `
    text-align: center;
    color: #333;
    margin-bottom: 40px;
    font-size: 2.5em;
  `;
  title.textContent = '関数アクションゲーム';
  homeContainer.appendChild(title);

  // ステージボタンコンテナ
  const stagesContainer = document.createElement('div');
  stagesContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 15px;
  `;

  const stages = [
    { id: 1, name: 'ステージ1' },
    { id: 2, name: 'ステージ2' },
    { id: 3, name: 'ステージ3' },
    { id: 4, name: 'ステージ4' },
    { id: 5, name: 'ステージ5' },
    { id: 6, name: 'ステージ6' },
    { id: 7, name: 'ステージ7' }
  ];

  stages.forEach(stage => {
    const clearRate = getClearRate(stage.id);
    const clearData = getClearData(stage.id);
    // トロフィー表示条件（永続）
    // 一度達成したら`oneShotTrophy`で維持する
    let isOneShot = false;
    if (clearData) {
      if (clearData.oneShotTrophy) {
        isOneShot = true;
      } else {
        // 旧データやまだ一度も達成していない場合は、その場の条件で判定
        const collected = Number(clearData.collected);
        const total = Number(clearData.total);
        const fnCount = clearData.functionChangeCount !== undefined ? Number(clearData.functionChangeCount) : NaN;
        isOneShot = Number.isFinite(fnCount) && fnCount === 1 && collected === total;
      }
    }
    if (clearData && typeof window !== 'undefined' && window.localStorage) {
      console.debug(`[Home] stage ${stage.id} trophy check`, { isOneShot, clearData });
    }
    
    const button = document.createElement('button');
    button.style.cssText = `
      padding: 20px;
      background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    `;

    button.onmouseover = () => {
      button.style.transform = 'translateY(-3px)';
      button.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
    };
    button.onmouseout = () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    };

    // ステージ名
    const label = document.createElement('span');
    label.textContent = stage.name;

    // クリア率表示とバッジ
    const rateDiv = document.createElement('div');
    rateDiv.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    // 最速タイム表示（存在しない場合は--.--sを表示）
    const timeSpan = document.createElement('span');
    if (clearData && typeof clearData.bestTime === 'number' && isFinite(clearData.bestTime)) {
      timeSpan.textContent = `タイム ${clearData.bestTime.toFixed(2)}s`;
    } else {
      timeSpan.textContent = `タイム --.--s`;
    }
    timeSpan.style.fontSize = '14px';
    timeSpan.style.opacity = '0.9';
    rateDiv.appendChild(timeSpan);

    // ワンショットバッジ
    if (isOneShot) {
      const trophyIcon = document.createElement('i');
      trophyIcon.className = 'fas fa-trophy';
      trophyIcon.style.color = '#FFD700';
      trophyIcon.title = '全コイン取得 & 1回の関数でクリア!';
      rateDiv.appendChild(trophyIcon);
    }

    const starIcon = document.createElement('i');
    starIcon.className = clearRate === 100 ? 'fas fa-star' : 'far fa-star';
    starIcon.style.color = '#FFD700';
    rateDiv.appendChild(starIcon);

    const rateText = document.createElement('span');
    rateText.textContent = `${clearRate}%`;
    rateText.style.fontSize = '16px';
    rateDiv.appendChild(rateText);

    button.appendChild(label);
    button.appendChild(rateDiv);

    button.onclick = () => {
      soundManager.playSE('button');
      cleanup();
      onStageSelect(stage.id);
    };

    stagesContainer.appendChild(button);
  });

  homeContainer.appendChild(stagesContainer);

  // 設定ボタン
  const settingsButton = document.createElement('button');
  settingsButton.innerHTML = '<i class="fas fa-cog"></i> 設定';
  settingsButton.style.cssText = `
    margin-top: 20px;
    padding: 15px 30px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    width: 100%;
  `;
  
  settingsButton.onmouseover = () => {
    settingsButton.style.transform = 'translateY(-3px)';
    settingsButton.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
  };
  settingsButton.onmouseout = () => {
    settingsButton.style.transform = 'translateY(0)';
    settingsButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
  };
  
  settingsButton.onclick = () => {
    soundManager.playSE('button');
    window.showSettings();
  };
  
  homeContainer.appendChild(settingsButton);

  // 入力欄・ボタンを隠す
  const input = document.getElementById('expr');
  const drawBtn = document.getElementById('drawBtn');
  const inputContainer = document.querySelector('.input-container');
  
  if (input) input.style.display = 'none';
  if (drawBtn) drawBtn.style.display = 'none';
  if (inputContainer) inputContainer.style.display = 'none';

  // DOMに追加
  document.body.appendChild(homeContainer);

  // クリーンアップ関数
  function cleanup() {
    if (homeContainer) homeContainer.remove();
    canvas.style.display = 'block';
    if (input) input.style.display = 'block';
    if (drawBtn) drawBtn.style.display = 'block';
    if (inputContainer) inputContainer.style.display = 'flex';
  }

  return cleanup;
}
