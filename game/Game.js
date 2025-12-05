// Gameクラス本体（他のクラスはimportで利用）
import { Player } from './Player.js';
import { Platform, Collectible, Hazard, Goal } from './entities.js';
import { soundManager } from './SoundManager.js';
// import * as math from 'mathjs';

let stageData = {};
fetch('game/stage_data.json')
  .then(response => response.json())
  .then(data => {
    stageData = data;
    console.log("Stage data loaded:", stageData);
  });

export class Game {
  // === 定数 ===
  static get CANVAS_WIDTH() { return 800; }
  static get CANVAS_HEIGHT() { return 600; }
  static get SCALE_X() { return 50; }
  static get SCALE_Y() { return 50; }
  static get ORIGIN_X() { return 50; }
  static get ORIGIN_Y_OFFSET() { return 50; }
  static get BOX_WIDTH() { return 340; }
  static get BOX_HEIGHT() { return 260; }
  static get BTN_WIDTH() { return 90; }
  static get BTN_HEIGHT() { return 48; }
  static get BTN_GAP() { return 60; }
  static get BTN_MARGIN() { return 24; }
  static get COIN_SIZE() { return 60; }
  static get COIN_MARGIN() { return 30; }
  static get MAX_STAGE() { return 4; }

  constructor(canvas, ctx, stageId) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.WIDTH = canvas.width;
    this.HEIGHT = canvas.height;
    this.scaleX = Game.SCALE_X;
    this.scaleY = Game.SCALE_Y;
    this.originX = Game.ORIGIN_X;
    this.originY = this.HEIGHT - Game.ORIGIN_Y_OFFSET;

    this.keys = { left: false, right: false, up: false };
    this.player = new Player(0, 0);
    this.platforms = [];
    this.functionPlatform = new Platform("function", { fn: x => 0 });
    this.fnText = "0";
    this.displayLatex = ""; // 表示用LaTeX

    this.stageId = stageId;
    this.initializeStage();
    this.collectedCount = 0;
    this.running = true;
    this.state = "playing";

    this.initInput();
    this.initClickHandler();
    this.initInputField();
    
    // BGM再生
    soundManager.playBGM('gameBGM');
    
    this.loop();
  }

  // === ステージ初期化 ===
  initializeStage() {
    const stage = stageData[String(this.stageId)];
    if (stage) {
      // コレクティブル
      this.collectibles = [];
      stage.collectibles?.forEach(item => {
        this.collectibles.push(new Collectible(item.x, item.y));
      });

      // ハザード
      this.hazards = [];
      stage.hazards?.forEach(item => {
        this.hazards.push(new Hazard(item.x, item.y, item.width, item.height));
      });

      // ゴール
      this.goal = new Goal(stage.goal.x, stage.goal.y);
    }
  }

  // === 入力処理 ===
  initInput() {
    document.addEventListener("keydown", e => {
      if (e.code === "ArrowLeft") this.keys.left = true;
      if (e.code === "ArrowRight") this.keys.right = true;
      if (e.code === "ArrowUp") this.keys.up = true;
    });
    document.addEventListener("keyup", e => {
      if (e.code === "ArrowLeft") this.keys.left = false;
      if (e.code === "ArrowRight") this.keys.right = false;
      if (e.code === "ArrowUp") this.keys.up = false;
    });
  }

  initInputField() {
    const input = document.getElementById('expr');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.setFunction(input.value);
        }
      });
      input.addEventListener('input', () => {
        this.updateDisplayLatex(input.value);
      });
    }
  }

  setFunction(expr) {
    try {
      const compiled = math.compile(expr);
      compiled.evaluate({ x: 0 });
      this.functionPlatform.fn = x => compiled.evaluate({ x });
      this.fnText = expr;
      this.updateDisplayLatex(expr);
      const input = document.getElementById('expr');
      if (input) input.value = expr;
    } catch (e) {
      const input = document.getElementById('expr');
      if (input) input.value = this.fnText;
      alert('関数の式が不正です');
    }
  }

  updateDisplayLatex(text) {
    try {
      const node = math.parse(text);
      this.displayLatex = node.toTex();
    } catch (e) {
      this.displayLatex = "";
    }
  }

  updateLatex() {
    // 互換性のため残す（使われていない）
  }

  // === グリッド描画 ===
  drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;

    for (let x = 0; x <= this.WIDTH; x += this.scaleX) {
      ctx.beginPath();
      ctx.moveTo(x + this.originX % this.scaleX, 0);
      ctx.lineTo(x + this.originX % this.scaleX, this.HEIGHT);
      ctx.stroke();
    }

    for (let y = 0; y <= this.HEIGHT; y += this.scaleY) {
      ctx.beginPath();
      ctx.moveTo(0, y + this.originY % this.scaleY);
      ctx.lineTo(this.WIDTH, y + this.originY % this.scaleY);
      ctx.stroke();
    }

    // 太い軸
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, this.originY); ctx.lineTo(this.WIDTH, this.originY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(this.originX, 0); ctx.lineTo(this.originX, this.HEIGHT); ctx.stroke();

    // メモリ
    this.drawAxisLabels();
  }

  drawAxisLabels() {
    const ctx = this.ctx;
    ctx.fillStyle = "#333";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // X軸メモリ
    for (let x = -Math.floor(this.originX/this.scaleX); x <= Math.floor((this.WIDTH - this.originX)/this.scaleX); x++) {
      if (x === 0 || x === -1 || x === 11) continue;
      ctx.fillText(x, this.originX + x*this.scaleX, this.originY + 4);
    }

    // Y軸メモリ
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let y = -Math.floor((this.HEIGHT - this.originY)/this.scaleY); y <= Math.floor(this.originY/this.scaleY); y++) {
      if (y === 0 || y === -1 || y === 7) continue;
      ctx.fillText(y, this.originX - 4, this.originY - y*this.scaleY);
    }

    // 原点と特殊点
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("0", this.originX - 4, this.originY + 4);
    ctx.fillText("11", this.originX + 11*this.scaleX, this.originY + 4);
    ctx.fillText("7", this.originX - 4, this.originY - 7*this.scaleY);
    ctx.textBaseline = "bottom";
    ctx.fillText("-1", this.originX - 4, this.originY + this.scaleY);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("-1", this.originX - this.scaleX, this.originY + 4);
  }

  // === イベント処理 ===
  initClickHandler() {
    this._canvasClickHandler = (e) => {
      if (this.state !== "playing" && this._scoreButtons) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        for (const btn of this._scoreButtons) {
          if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
            btn.onClick();
            return;
          }
        }
      }
    };
    this.canvas.addEventListener('click', this._canvasClickHandler);
  }

  removeClickHandler() {
    if (this._canvasClickHandler) {
      this.canvas.removeEventListener('click', this._canvasClickHandler);
      this._canvasClickHandler = null;
    }
  }

  // === リスタート処理 ===
  restart() {
    this.player.x = 0;
    this.player.y = 0;
    this.player.velocity = { x: 0, y: 0 };
    this.collectedCount = 0;
    this.collectibles.forEach(c => c.collected = false);
    this.state = "playing";
    this.functionPlatform.fn = x => 0;
    const input = document.getElementById('expr');
    if (input) input.value = '0';
    // BGM再生
    soundManager.playBGM('gameBGM');
  }

  // === ゲームロジック更新 ===
  update() {
    if (this.state !== "playing") return;

    this.player.update(this.keys, this.functionPlatform.fn);
    this.checkGameState();
    this.checkCollisions();
  }

  checkGameState() {
    // gameover判定
    if (this.player.y <= -1) {
      this.state = "GAME OVER";
      soundManager.playSE('gameover');
      soundManager.stopBGM();
    }
    // ゴール判定
    if (this.goal.check(this.player)) {
      this.state = "CLEAR!";
      this.saveClearData();
      soundManager.playSE('goal');
      soundManager.stopBGM();
    }
  }

  saveClearData() {
    // localStorageにクリアデータを保存
    const key = `stage_${this.stageId}_clear`;
    const totalCollectibles = this.collectibles.length;
    const collectedCount = this.collectedCount;
    
    // 既存のデータを取得
    const existingData = localStorage.getItem(key);
    let bestCollected = collectedCount;
    
    if (existingData) {
      const data = JSON.parse(existingData);
      bestCollected = Math.max(data.collected, collectedCount);
    }
    
    localStorage.setItem(key, JSON.stringify({
      cleared: true,
      collected: bestCollected,
      total: totalCollectibles
    }));
  }

  checkCollisions() {
    // ハザード判定
    if (this.hazards.some(h => h.check(this.player))) {
      this.state = "GAME OVER";
      soundManager.playSE('gameover');
      soundManager.stopBGM();
    }

    // オブジェクト取得判定
    this.collectibles.forEach(c => {
      if (c.check(this.player)) {
        this.collectedCount++;
        soundManager.playSE('coin');
      }
    });
  }

  // === 描画 ===
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

    // ゲームオブジェクト描画
    this.drawGrid();
    this.platforms.forEach(p => p.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY));
    this.functionPlatform.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY);
    this.collectibles.forEach(c => c.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY));
    this.hazards.forEach(h => h.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY));
    this.goal.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY);
    this.player.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY);

    // UI描画（ゲーム終了時）
    if (this.state !== "playing") {
      this.drawUI();
    }
  }

  drawUI() {
    const ctx = this.ctx;
    // 背景を暗く
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
    // スコア画面UIが既に表示されていれば再生成しない
    if (!document.getElementById('score-screen-ui')) {
      this.showScoreScreenUI();
    }
  }

  showScoreScreenUI() {
    console.log('showScoreScreenUI: start', this.state);
    // 既存のスコア画面UIを削除
    let scoreScreenUI = document.getElementById('score-screen-ui');
    if (scoreScreenUI) scoreScreenUI.remove();

    // スコア画面コンテナを作成
    scoreScreenUI = document.createElement('div');
    scoreScreenUI.id = 'score-screen-ui';
    scoreScreenUI.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
    `;
    // スコア画面表示中はcanvasのクリックを無効化
    if (this.canvas) this.canvas.style.pointerEvents = 'none';

    // スコアボックス
    const scoreBox = document.createElement('div');
    scoreBox.style.cssText = `
      background: white;
      border-radius: 15px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      min-width: 400px;
    `;

    // ステータスメッセージ
    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = `
      margin-bottom: 30px;
    `;

    const statusText = document.createElement('h2');
    statusText.style.cssText = `
      margin: 0;
      font-size: 3em;
      color: ${this.state === 'CLEAR!' ? '#4caf50' : '#f44336'};
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
    `;
    statusText.textContent = this.state;
    statusDiv.appendChild(statusText);

    scoreBox.appendChild(statusDiv);

    // スコア表示（CLEAR!時）
    if (this.state === "CLEAR!") {
      const scoreDiv = document.createElement('div');
      scoreDiv.style.cssText = `
        margin-bottom: 30px;
      `;

      const scoreLabel = document.createElement('p');
      scoreLabel.style.cssText = `
        margin: 0 0 15px 0;
        font-size: 1.2em;
        color: #666;
      `;
      scoreLabel.textContent = '獲得アイテム';
      scoreDiv.appendChild(scoreLabel);

      // コイン表示
      const coinContainer = document.createElement('div');
      coinContainer.style.cssText = `
        display: flex;
        gap: 10px;
        justify-content: center;
        flex-wrap: wrap;
      `;

      for (let i = 0; i < this.collectibles.length; i++) {
        const coinIcon = document.createElement('i');
        coinIcon.style.cssText = `
          font-size: 32px;
          color: ${i < this.collectedCount ? '#FFD700' : '#ccc'};
          transition: transform 0.3s ease;
        `;
        coinIcon.className = 'fas fa-coins';
        coinIcon.onmouseover = () => {
          coinIcon.style.transform = 'scale(1.2) rotate(10deg)';
        };
        coinIcon.onmouseout = () => {
          coinIcon.style.transform = 'scale(1) rotate(0)';
        };
        coinContainer.appendChild(coinIcon);
      }

      scoreDiv.appendChild(coinContainer);
      scoreBox.appendChild(scoreDiv);

      // スコア詳細
      const scoreDetail = document.createElement('p');
      scoreDetail.style.cssText = `
        margin: 15px 0 30px 0;
        font-size: 1.1em;
        color: #333;
        font-weight: bold;
      `;
      scoreDetail.textContent = `${this.collectedCount} / ${this.collectibles.length}`;
      scoreBox.appendChild(scoreDetail);
    }

    // ボタンエリア
    const buttonArea = document.createElement('div');
    buttonArea.style.cssText = `
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
    `;

    // リスタートボタン
    const restartBtn = this.createIconButton('↺ リスタート', '#2196F3', () => {
      console.log('restartBtn clicked');
      this.cleanup();
      this._lastScoreButton = "restart";
      this.restart();
    });
    buttonArea.appendChild(restartBtn);

    // ホームボタン
    const homeBtn = this.createIconButton('⌂ ホーム', '#4caf50', () => {
      console.log('homeBtn clicked');
      this.cleanup();
      this._lastScoreButton = "home";
      this.running = false;
    });
    buttonArea.appendChild(homeBtn);

    // NEXTボタン（CLEAR!かつ最終ステージでない場合）
    if (this.state === "CLEAR!" && this.stageId < Game.MAX_STAGE) {
      const nextBtn = this.createIconButton('→ 次へ', '#FF9800', () => {
        console.log('nextBtn clicked');
        this.cleanup(); // クリア画面UIを必ず削除
        const scoreScreenUI = document.getElementById('score-screen-ui');
        if (scoreScreenUI) scoreScreenUI.remove();
        this._lastScoreButton = "next";
        this.running = false;
      });
      buttonArea.appendChild(nextBtn);
    }

    scoreBox.appendChild(buttonArea);
    scoreScreenUI.appendChild(scoreBox);
    document.body.appendChild(scoreScreenUI);
  }

  createIconButton(label, bgColor, onClick) {
    console.log('createIconButton:', label);
    const btn = document.createElement('button');
    btn.style.cssText = `
      padding: 15px 25px;
      background: linear-gradient(135deg, ${bgColor} 0%, ${this.darkenColor(bgColor, 20)} 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;

    btn.textContent = label;

    btn.onmouseover = () => {
      btn.style.transform = 'translateY(-3px)';
      btn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
    };

    btn.onmouseout = () => {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    };

    btn.onclick = (e) => {
      console.log('clicked', label);
      soundManager.playSE('button');
      onClick.call(this, e);
    };
    return btn;
  }

  darkenColor(color, percent) {
    const num = parseInt(color.replace("#",""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 +
      (G<255?G<1?0:G:255)*0x100 +
      (B<255?B<1?0:B:255))
      .toString(16).slice(1);
  }

  cleanup() {
    const scoreScreenUI = document.getElementById('score-screen-ui');
    if (scoreScreenUI) scoreScreenUI.remove();
    // スコア画面を閉じたらcanvasのクリックを有効化
    if (this.canvas) this.canvas.style.pointerEvents = '';
  }

  // === ゲームループ ===
  loop() {
    this.update();
    this.draw();
    if (this.running) {
      requestAnimationFrame(() => this.loop());
    } else {
      this.removeClickHandler();
      this.handleGameEnd();
      console.log("Game stopped");
    }
  }

  handleGameEnd() {
    if (this._lastScoreButton === "home") {
      window.showHome();
    } else if (this._lastScoreButton === "next") {
      window.nextStage();
    } else {
      console.log("error");
      window.showHome();
    }
  }
}
