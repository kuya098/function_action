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
  constructor(canvas, ctx, stageId) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.WIDTH = canvas.width;
    this.HEIGHT = canvas.height;
    this.scaleX = 50;
    this.scaleY = 50;
    this.originX = 50;
    this.originY = this.HEIGHT - 50;

    this.keys = { left: false, right: false, up: false };
    this.player = new Player(0, 0);
    this.platforms = [];
    this.functionPlatform = new Platform("function", { fn: x => 0 });
    this.fnText = "0";
    this.displayLatex = ""; // 表示用LaTeX

    this.stageId = stageId;
    const stage = stageData[String(this.stageId)];
    if (stage) {
      // ステージデータからプラットフォームを生成
      this.collectibles = [];
      stage.collectibles.forEach(item => {
        this.collectibles.push(new Collectible(item.x, item.y));
      });
      this.hazards = [];
      if (stage.hazards) {
        stage.hazards.forEach(item => {
          this.hazards.push(new Hazard(item.x, item.y, item.width, item.height));
        });
      }
      this.goal = new Goal(stage.goal.x, stage.goal.y);
    }
    this.collectedCount = 0;
    this.running = true;
    this.state = "playing";

    this.initInput();
    this.initClickHandler();
    this.initInputField(); // HTML入力欄の初期化
    this.loop();
  }

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
      
      // 入力値が変わったらLaTeX表示を更新
      input.addEventListener('input', () => {
        this.updateDisplayLatex(input.value);
      });
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

  setFunction(expr) {
    try {
      const compiled = math.compile(expr);
      // テスト評価（エラー検出用）
      compiled.evaluate({ x: 0 });
      // 正常なら関数をセット
      this.functionPlatform.fn = x => compiled.evaluate({ x });
      this.fnText = expr;
      this.updateDisplayLatex(expr);
      // 入力欄の値を最新関数に
      const input = document.getElementById('expr');
      if (input) input.value = expr;
    } catch (e) {
      // エラー時：入力欄を現在描画中の関数に戻す
      const input = document.getElementById('expr');
      if (input) {
        input.value = this.fnText;
      }
      // エラーメッセージ表示
      alert('関数の式が不正です');
    }
  }

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
    ctx.fillStyle = "#333";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let x = -Math.floor(this.originX/this.scaleX); x <= Math.floor((this.WIDTH - this.originX)/this.scaleX); x++) {
      if (x === 0 || x === -1 || x === 11) continue;
      ctx.fillText(x, this.originX + x*this.scaleX, this.originY + 4);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let y = -Math.floor((this.HEIGHT - this.originY)/this.scaleY); y <= Math.floor(this.originY/this.scaleY); y++) {
      if (y === 0 || y === -1 || y === 7) continue;
      ctx.fillText(y, this.originX - 4, this.originY - y*this.scaleY);
    }
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

  // --- クリックイベント管理 ---
  initClickHandler() {
    this._canvasClickHandler = (e) => {
      // スコア画面のボタン判定
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

  // リスタート処理（必要に応じてmain.js等から呼び出し）
  restart() {
    // 必要な初期化処理をここに記述（例：位置・スコア・状態リセットなど）
    this.player.x = 0;
    this.player.y = 0;
    this.player.velocity = { x: 0, y: 0 };
    this.collectedCount = 0;
    this.collectibles.forEach(c => c.collected = false);
    this.state = "playing";
    // 入力関数を0にリセット
    this.functionPlatform.fn = x => 0;
    // 入力欄も0にリセット
    const input = document.getElementById('expr');
    if (input) input.value = '0';
  }

  update() {
    if (this.state !== "playing") return;

    this.player.update(this.keys, this.functionPlatform.fn);

    // gameover判定
    if (this.player.y <= -1) {
      this.state = "GAME OVER";
    }
    // ゴール判定
    if (this.goal.check(this.player)) {
      this.state = "CLEAR!";
    }

    if (this.hazards.some(h => h.check(this.player))) {
      this.state = "GAME OVER";
    }

    // オブジェクト取得判定
    this.collectibles.forEach(c => {
      if (c.check(this.player)) this.collectedCount++;
    });

    this.getScoreCoors();
  }

  getScoreCoors() {
      // ボタン情報を配列で管理
      const boxWidth = 340, boxHeight = 260;
      const boxX = this.WIDTH/2 - boxWidth/2;
      const boxY = this.HEIGHT/2 - boxHeight/2;
      const btnWidth = 90, btnHeight = 48, btnGap = 60;
      const btnHomeX = this.WIDTH/2;
      const btnRestartX = btnHomeX - btnWidth - btnGap;
      const btnNextX = btnHomeX + btnWidth + btnGap; // ← btnNextXを必ず定義
      const btnY = boxY + boxHeight - btnHeight - 24;

      this._lastScoreButton = null; // どのボタンが押されたか記録
      this._scoreBox = { x: boxX, y: boxY, w: boxWidth, h: boxHeight };
      this._scoreButtons = [
        {
          label: "↺",
          x: btnRestartX,
          y: btnY,
          w: btnWidth,
          h: btnHeight,
          onClick: () => { this._lastScoreButton = "restart"; this.restart(); }
        },
        {
          label: "HOME",
          x: btnHomeX - btnWidth/2,
          y: btnY,
          w: btnWidth,
          h: btnHeight,
          onClick: () => { this._lastScoreButton = "home"; this.running = false; }
        }
      ];
      if (this.state === "CLEAR!" && this.stageId < 3) {
        this._scoreButtons.push({
          label: "NEXT",
          x: btnNextX - btnWidth,
          y: btnY,
          w: btnWidth,
          h: btnHeight,
          onClick: () => { if(this.state === "CLEAR!"){ this._lastScoreButton = "next"; this.running = false } }
        });
      }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);

    this.drawGrid();
    this.platforms.forEach(p => p.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY));
    this.functionPlatform.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY);
    this.collectibles.forEach(c => c.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY));
    this.hazards.forEach(h => h.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY));
    this.goal.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY);
    this.player.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY);

    // UI表示
    if (this.state !== "playing") {
      // 背景を少し暗く
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0,0,this.WIDTH,this.HEIGHT);

      // 中央ボックス（サイズ・位置調整）
      ctx.fillStyle = "white";
      ctx.fillRect(this._scoreBox.x, this._scoreBox.y, this._scoreBox.w, this._scoreBox.h);

      // メッセージ表示（上部に余白を持たせる）
      ctx.fillStyle = "black";
      ctx.font = "40px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(this.state, this.WIDTH/2, this._scoreBox.y + 28);

      // スコア表示（CLEAR!のときのみ、メッセージの下に余白）
      if (this.state === "CLEAR!") {
        // コイン画像を取得枚数分表示
        if (!Collectible.coinImage) {
          Collectible.coinImage = new Image();
          Collectible.coinImage.src = 'game/images/Coin.png';
        }
        
        const coinSize = 60;
        const coinMargin = 30; // コイン間のマージン
        const totalCoins = this.collectibles.length;
        const totalCoinWidth = totalCoins * coinSize + (totalCoins - 1) * coinMargin;
        const startX = this.WIDTH / 2 - totalCoinWidth / 2;
        const coinY = this._scoreBox.y + 120;
        
        if (Collectible.coinImage.complete && Collectible.coinImage.naturalWidth > 0) {
          // 取得したコイン（カラー）
          for (let i = 0; i < this.collectedCount; i++) {
            const coinX = startX + i * (coinSize + coinMargin);
            ctx.drawImage(
              Collectible.coinImage,
              coinX,
              coinY - coinSize / 2,
              coinSize,
              coinSize
            );
          }
          
          // 取得していないコイン（グレースケール）
          ctx.globalAlpha = 0.3;
          for (let i = this.collectedCount; i < this.collectibles.length; i++) {
            const coinX = startX + i * (coinSize + coinMargin);
            ctx.drawImage(
              Collectible.coinImage,
              coinX,
              coinY - coinSize / 2,
              coinSize,
              coinSize
            );
          }
          ctx.globalAlpha = 1.0;
        } else {
          // 画像読み込み中はテキスト表示
          ctx.font = "24px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "black";
          ctx.fillText(`取得アイテム: ${this.collectedCount} / ${this.collectibles.length}`, this.WIDTH/2, coinY - 20);
        }
      }

      // ボタン描画
      ctx.font = "28px Arial";
      ctx.fillStyle = "#4caf50";
      this._scoreButtons.forEach(btn => {
        if ((this.state === "GAME OVER" || this.stageId >= 3) && btn.label === "NEXT") return;
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
      });
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      this._scoreButtons.forEach(btn => {
        ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h/2);
      });

      // ボタンのクリック判定（canvasクリックイベントはmain.js等で管理推奨）
      // 必要なら座標とラベルで判定可能
    }
  }

  loop() {
    this.update();
    this.draw();
    if (this.running) {
      requestAnimationFrame(() => this.loop());
    } else {
      this.removeClickHandler();
      // ボタン種別で分岐
      if (this._lastScoreButton === "home") {
        window.showHome();
      } else if (this._lastScoreButton === "next") {
        window.nextStage();
      } else {
        // それ以外（例: running=false だけの場合）
        console.log("error");
        window.showHome();
      }
      console.log("Game stopped");
    }
  }
}