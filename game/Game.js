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
    this.inputAreaHeight = 50; // 下部の入力エリア高さ
    this.playHeight = this.HEIGHT - this.inputAreaHeight;
    this.scaleX = 50;
    this.scaleY = 50;
    this.originX = 50;
    this.originY = this.playHeight - 50; // 入力エリア分だけ上にずらす

    this.keys = { left: false, right: false, up: false };
    this.player = new Player(0, 0);
    this.platforms = [];
    this.functionPlatform = new Platform("function", { fn: x => 0 });
    this.fnText = "0";
    this.inputText = ""; // 入力エリアのテキスト
    this.inputLatex = ""; // LaTeX変換後のテキスト

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

    this.inputFocused = false; // 入力欄がフォーカスされているか
    this.inputCursorVisible = true; // カーソル点滅用
    this._cursorBlinkInterval = setInterval(() => {
      if (this.inputFocused) {
        this.inputCursorVisible = !this.inputCursorVisible;
      }
    }, 500);

    this.initInput();
    this.initClickHandler();
    this.loop();
  }

  initInput() {
    document.addEventListener("keydown", e => {
      // 入力エリアがフォーカスされている場合のテキスト入力
      if (this.inputFocused) {
        if (e.key === "Backspace") {
          e.preventDefault();
          this.inputText = this.inputText.slice(0, -1);
          this.updateLatex();
        } else if (e.key === "Enter") {
          e.preventDefault();
          // Enterで関数をセット
          this.setFunction(this.inputText);
          this.inputFocused = false;
        } else if (e.key.length === 1) {
          // 通常の文字入力
          this.inputText += e.key;
          this.updateLatex();
        }
        return;
      }

      // ゲームの操作キー
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

  updateLatex() {
    try {
      const node = math.parse(this.inputText);
      this.inputLatex = node.toTex();
    } catch (e) {
      // パースエラー時はそのまま表示
      this.inputLatex = "";
    }
  }

  setFunction(expr) {
    try {
      const compiled = math.compile(expr);
      // テスト評価（エラー検出用）
      compiled.evaluate({ x: 0 });
      // 正常なら関数をセット
      this.functionPlatform.fn = x => compiled.evaluate({ x });
      this.fnText = expr;
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
    const gridHeight = this.playHeight;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.WIDTH, gridHeight); // 入力エリアを除外するためにクリップ
    ctx.clip();

    for (let x = 0; x <= this.WIDTH; x += this.scaleX) {
      ctx.beginPath();
      ctx.moveTo(x + this.originX % this.scaleX, 0);
      ctx.lineTo(x + this.originX % this.scaleX, gridHeight);
      ctx.stroke();
    }

    for (let y = 0; y <= gridHeight; y += this.scaleY) {
      ctx.beginPath();
      ctx.moveTo(0, y + this.originY % this.scaleY);
      ctx.lineTo(this.WIDTH, y + this.originY % this.scaleY);
      ctx.stroke();
    }

    // 太い軸
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, this.originY); ctx.lineTo(this.WIDTH, this.originY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(this.originX, 0); ctx.lineTo(this.originX, gridHeight); ctx.stroke();

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
    for (let y = -Math.floor((gridHeight - this.originY)/this.scaleY); y <= Math.floor(this.originY/this.scaleY); y++) {
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

    ctx.restore();
  }

  // --- クリックイベント管理 ---
  initClickHandler() {
    this._canvasClickHandler = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // 入力エリアのクリック判定
      if (my >= this.playHeight && my <= this.HEIGHT) {
        this.inputFocused = true;
        this.inputCursorVisible = true;
        return;
      } else {
        this.inputFocused = false;
      }

      // スコア画面のボタン判定
      if (this.state !== "playing" && this._scoreButtons) {
        for (const btn of this._scoreButtons) {
          if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
            btn.onClick();
            return;
          }
        }
      }
    };
    this.canvas.addEventListener('click', this._canvasClickHandler);

    // マウスホバーでカーソル変更
    this._canvasMouseMoveHandler = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const my = e.clientY - rect.top;
      if (my >= this.playHeight && my <= this.HEIGHT) {
        this.canvas.style.cursor = 'text';
      } else {
        this.canvas.style.cursor = 'default';
      }
    };
    this.canvas.addEventListener('mousemove', this._canvasMouseMoveHandler);
  }

  removeClickHandler() {
    if (this._canvasClickHandler) {
      this.canvas.removeEventListener('click', this._canvasClickHandler);
      this._canvasClickHandler = null;
    }
    if (this._canvasMouseMoveHandler) {
      this.canvas.removeEventListener('mousemove', this._canvasMouseMoveHandler);
      this._canvasMouseMoveHandler = null;
    }
    this.canvas.style.cursor = 'default';
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
    // 入力エリアは常に白背景で確保（他の描画は載せない）
    ctx.fillStyle = "white";
    ctx.fillRect(0, this.playHeight, this.WIDTH, this.inputAreaHeight);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, this.playHeight, this.WIDTH, this.inputAreaHeight);

    // 入力テキストのLaTeX描画
    if (this.inputLatex) {
      // DOM要素を使ってKaTeXレンダリング
      if (!this._latexContainer) {
        this._latexContainer = document.createElement('div');
        this._latexContainer.style.position = 'absolute';
        this._latexContainer.style.pointerEvents = 'none';
        document.body.appendChild(this._latexContainer);
      }
      const rect = this.canvas.getBoundingClientRect();
      this._latexContainer.style.left = (rect.left + 10) + 'px';
      this._latexContainer.style.top = (rect.top + this.playHeight + 5) + 'px';
      this._latexContainer.style.fontSize = '20px';
      try {
        katex.render(this.inputLatex, this._latexContainer, { throwOnError: false });
      } catch (e) {
        this._latexContainer.textContent = this.inputText;
      }
    } else if (this.inputText) {
      // LaTeX変換できない場合は通常テキスト
      ctx.fillStyle = "black";
      ctx.font = "20px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const textX = 10;
      const textY = this.playHeight + this.inputAreaHeight / 2;
      ctx.fillText(this.inputText, textX, textY);
      if (this._latexContainer) {
        this._latexContainer.textContent = '';
      }
    } else {
      if (this._latexContainer) {
        this._latexContainer.textContent = '';
      }
    }

    // 入力欄のカーソル描画（フォーカス時に点滅）
    if (this.inputFocused && this.inputCursorVisible) {
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;
      ctx.beginPath();
      let textWidth = 0;
      if (this._latexContainer && this.inputLatex) {
        textWidth = this._latexContainer.offsetWidth;
      } else {
        ctx.font = "20px Arial";
        textWidth = ctx.measureText(this.inputText).width;
      }
      const cursorX = 10 + textWidth;
      const cursorY = this.playHeight + 10;
      ctx.moveTo(cursorX, cursorY);
      ctx.lineTo(cursorX, cursorY + this.inputAreaHeight - 20);
      ctx.stroke();
    }

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
        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(`取得アイテム: ${this.collectedCount} / ${this.collectibles.length}`, this.WIDTH/2, this._scoreBox.y + 80);
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