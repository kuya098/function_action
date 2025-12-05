// Gameクラス本体（他のクラスはimportで利用）
import { Player } from './Player.js';
import { Platform, Collectible, Hazard, Goal } from './entities.js';
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
  static get MAX_STAGE() { return 3; }

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
  }

  // === ゲームロジック更新 ===
  update() {
    if (this.state !== "playing") return;

    this.player.update(this.keys, this.functionPlatform.fn);
    this.checkGameState();
    this.checkCollisions();
    this.prepareScoreUI();
  }

  checkGameState() {
    // gameover判定
    if (this.player.y <= -1) {
      this.state = "GAME OVER";
    }
    // ゴール判定
    if (this.goal.check(this.player)) {
      this.state = "CLEAR!";
    }
  }

  checkCollisions() {
    // ハザード判定
    if (this.hazards.some(h => h.check(this.player))) {
      this.state = "GAME OVER";
    }

    // オブジェクト取得判定
    this.collectibles.forEach(c => {
      if (c.check(this.player)) this.collectedCount++;
    });
  }

  prepareScoreUI() {
    const boxX = this.WIDTH / 2 - Game.BOX_WIDTH / 2;
    const boxY = this.HEIGHT / 2 - Game.BOX_HEIGHT / 2;
    const btnHomeX = this.WIDTH / 2;
    const btnRestartX = btnHomeX - Game.BTN_WIDTH - Game.BTN_GAP;
    const btnNextX = btnHomeX + Game.BTN_WIDTH + Game.BTN_GAP;
    const btnY = boxY + Game.BOX_HEIGHT - Game.BTN_HEIGHT - Game.BTN_MARGIN;

    this._lastScoreButton = null;
    this._scoreBox = { x: boxX, y: boxY, w: Game.BOX_WIDTH, h: Game.BOX_HEIGHT };
    this._scoreButtons = [
      {
        label: "↺",
        icon: "fa-redo",
        x: btnRestartX,
        y: btnY,
        w: Game.BTN_WIDTH,
        h: Game.BTN_HEIGHT,
        onClick: () => { this._lastScoreButton = "restart"; this.restart(); }
      },
      {
        label: "HOME",
        icon: "fa-home",
        x: btnHomeX - Game.BTN_WIDTH / 2,
        y: btnY,
        w: Game.BTN_WIDTH,
        h: Game.BTN_HEIGHT,
        onClick: () => { this._lastScoreButton = "home"; this.running = false; }
      }
    ];

    if (this.state === "CLEAR!" && this.stageId < Game.MAX_STAGE) {
      this._scoreButtons.push({
        label: "NEXT",
        icon: "fa-arrow-right",
        x: btnNextX - Game.BTN_WIDTH,
        y: btnY,
        w: Game.BTN_WIDTH,
        h: Game.BTN_HEIGHT,
        onClick: () => { if(this.state === "CLEAR!"){ this._lastScoreButton = "next"; this.running = false } }
      });
    }
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

    // スコアボックス
    this.drawScoreBox();

    // メッセージ
    this.drawStateMessage();

    // スコア（CLEAR!時）
    if (this.state === "CLEAR!") {
      this.drawCoinDisplay();
    }

    // ボタン
    this.drawButtons();
  }

  drawScoreBox() {
    const ctx = this.ctx;
    ctx.fillStyle = "white";
    ctx.fillRect(this._scoreBox.x, this._scoreBox.y, this._scoreBox.w, this._scoreBox.h);
  }

  drawStateMessage() {
    const ctx = this.ctx;
    ctx.fillStyle = "black";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(this.state, this.WIDTH / 2, this._scoreBox.y + 28);
  }

  drawCoinDisplay() {
    const ctx = this.ctx;
    if (!Collectible.coinImage) {
      Collectible.coinImage = new Image();
      Collectible.coinImage.src = 'game/images/Coin.png';
    }

    const totalCoins = this.collectibles.length;
    const totalCoinWidth = totalCoins * Game.COIN_SIZE + (totalCoins - 1) * Game.COIN_MARGIN;
    const startX = this.WIDTH / 2 - totalCoinWidth / 2;
    const coinY = this._scoreBox.y + 120;

    if (Collectible.coinImage.complete && Collectible.coinImage.naturalWidth > 0) {
      // 取得したコイン（カラー）
      for (let i = 0; i < this.collectedCount; i++) {
        const coinX = startX + i * (Game.COIN_SIZE + Game.COIN_MARGIN);
        ctx.drawImage(
          Collectible.coinImage,
          coinX,
          coinY - Game.COIN_SIZE / 2,
          Game.COIN_SIZE,
          Game.COIN_SIZE
        );
      }

      // 未取得コイン（グレースケール）
      ctx.globalAlpha = 0.3;
      for (let i = this.collectedCount; i < totalCoins; i++) {
        const coinX = startX + i * (Game.COIN_SIZE + Game.COIN_MARGIN);
        ctx.drawImage(
          Collectible.coinImage,
          coinX,
          coinY - Game.COIN_SIZE / 2,
          Game.COIN_SIZE,
          Game.COIN_SIZE
        );
      }
      ctx.globalAlpha = 1.0;
    } else {
      // 画像読み込み中
      ctx.font = "24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "black";
      ctx.fillText(`取得アイテム: ${this.collectedCount} / ${totalCoins}`, this.WIDTH / 2, coinY - 20);
    }
  }

  drawButtons() {
    const ctx = this.ctx;
    ctx.font = "28px Arial";
    ctx.fillStyle = "#4caf50";

    // ボタン背景
    this._scoreButtons.forEach(btn => {
      if ((this.state === "GAME OVER" || this.stageId >= Game.MAX_STAGE) && btn.label === "NEXT") return;
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    });

    // ボタンアイコン表示
    this._scoreButtons.forEach(btn => {
      if ((this.state === "GAME OVER" || this.stageId >= Game.MAX_STAGE) && btn.label === "NEXT") return;
      
      // アイコン用HTML要素を作成（キャンバス上に重ねて表示）
      this.drawCanvasIcon(ctx, btn);
    });
  }

  drawCanvasIcon(ctx, btn) {
    // キャンバス上にFontAwesomeアイコンを疑似表示するため、テキストベースで代替
    // 実際のアイコン表示は、オーバーレイHTMLで実装するのが最適
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "24px Arial";
    
    // アイコン記号として使用（テキストフォールバック）
    const iconSymbols = {
      'fa-redo': '↺',
      'fa-home': '⌂',
      'fa-arrow-right': '→'
    };
    
    const symbol = iconSymbols[btn.icon] || btn.label;
    ctx.fillText(symbol, btn.x + btn.w / 2, btn.y + btn.h / 2);
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
