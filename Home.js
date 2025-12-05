// ホーム画面の描画・UI管理
// FontAwesomeアイコンを使ったUI実装

export function drawHome(ctx, canvas, onStageSelect) {
  // クリア画面UIが残っていたら削除
  const scoreScreenUI = document.getElementById('score-screen-ui');
  if (scoreScreenUI) scoreScreenUI.remove();

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
    margin: 0 auto;
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
    { id: 3, name: 'ステージ3' }
  ];

  stages.forEach(stage => {
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
      justify-content: center;
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

    // テキストのみ
    const label = document.createElement('span');
    label.textContent = stage.name;

    button.appendChild(label);

    button.onclick = () => {
      cleanup();
      onStageSelect(stage.id);
    };

    stagesContainer.appendChild(button);
  });

  homeContainer.appendChild(stagesContainer);

  // 入力欄を隠す
  const input = document.getElementById('expr');
  if (input) input.style.display = 'none';
  const drawBtn = document.getElementById('drawBtn');
  if (drawBtn) drawBtn.style.display = 'none';

  // DOMに追加
  document.body.appendChild(homeContainer);

  // クリーンアップ関数
  function cleanup() {
    if (homeContainer) homeContainer.remove();
    canvas.style.display = 'block';
    if (input) input.style.display = 'block';
    if (drawBtn) drawBtn.style.display = 'block';
  }

  return cleanup;
}
