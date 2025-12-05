// ホーム画面の描画・UI管理
export function drawHome(ctx, canvas, onStageSelect) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '32px sans-serif';
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  ctx.fillText('関数アクションゲーム', canvas.width / 2, 80);

  const stages = [
    { id: 1, name: 'ステージ1' },
    { id: 2, name: 'ステージ2' },
    { id: 3, name: 'ステージ3' }
  ];
  const buttonWidth = 200;
  const buttonHeight = 50;
  const buttonYStart = 150;
  const buttonGap = 20;
  const buttons = [];

  stages.forEach((stage, i) => {
    const x = (canvas.width - buttonWidth) / 2;
    const y = buttonYStart + i * (buttonHeight + buttonGap);
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(x, y, buttonWidth, buttonHeight);
    ctx.font = '24px sans-serif';
    ctx.fillStyle = 'white';
    ctx.fillText(stage.name, canvas.width / 2, y + 32);
    buttons.push({ x, y, w: buttonWidth, h: buttonHeight, stage });
  });

  // クリック判定
  function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    buttons.forEach(btn => {
      if (
        mx >= btn.x && mx <= btn.x + btn.w &&
        my >= btn.y && my <= btn.y + btn.h
      ) {
        onStageSelect(btn.stage.id);
      }
    });
  }
  canvas.addEventListener('click', handleClick);
  // イベント解除用に返す
  return () => canvas.removeEventListener('click', handleClick);
}
