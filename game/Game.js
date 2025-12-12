// Gameクラス本体（他のクラスはimportで利用）
import { Player } from './Player.js';
import { Platform, Collectible, Hazard, Goal, RequiredPoint } from './entities.js';
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
  static get MAX_STAGE() { return 7; }

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

    // 時間管理（t 変数用）
    this.startTime = performance.now();
    this.time = 0;

    // 関数更新アニメーション用
    this.functionUpdateAnimation = null;

    // 関数変更回数
    this.functionChangeCount = 0;

    // t使用解禁フラグ（全ステージ100%クリアでtrue）
    this.isTimeUnlocked = this.checkTimeUnlocked();

    // t解禁演出
    this.timeUnlockAnimation = null; // { start: number, duration: number }

    // すでに解禁状態に到達しており、まだ告知していなければ起動
    try {
      const announced = localStorage.getItem('time_unlocked_announced') === 'true';
      if (this.isTimeUnlocked && !announced) {
        localStorage.setItem('time_unlocked_announced', 'true');
        this.triggerTimeUnlockEffect();
      }
    } catch {}

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
        this.hazards.push(new Hazard(item.x, item.y, item.size));
      });

      // 必須通過点
      this.requiredPoints = [];
      stage.requiredPoints?.forEach(item => {
        this.requiredPoints.push(new RequiredPoint(item.x, item.y));
      });

      // ゴール
      this.goal = new Goal(stage.goal.x, stage.goal.y);

      // 初期設定関数 g(x)（合成用）
      this.initialFunctionText = stage.initialFunction || "x";
      try {
        const compiledInit = math.compile(this.initialFunctionText);
        // 検証
        compiledInit.evaluate({ x: 0, t: 0 });
        this.initialFn = (x, t) => compiledInit.evaluate({ x, t });
      } catch (e) {
        console.warn('初期設定関数の読み込みに失敗しました。identityにフォールバックします', e);
        this.initialFunctionText = "x";
        this.initialFn = (x) => x;
      }
    }
  }

  // 全ステージ100%クリアかどうかを判定し、t使用の解禁可否を返す
  checkTimeUnlocked() {
    try {
      for (let id = 1; id <= Game.MAX_STAGE; id++) {
        const key = `stage_${id}_clear`;
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        const data = JSON.parse(raw);
        const collected = Number(data.collected ?? -1);
        const total = Number(data.total ?? -1);
        if (!data.cleared || !Number.isFinite(collected) || !Number.isFinite(total) || collected !== total) {
          return false;
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // 現在のt値（ロック時は0を返す）
  getCurrentTime() {
    return this.isTimeUnlocked ? this.time : 0;
  }

  // t解禁演出を開始
  triggerTimeUnlockEffect() {
    this.timeUnlockAnimation = { start: performance.now(), duration: 3000 };
    // 既存のSEを流用（関数作成音）。必要なら専用SEに差し替え可
    soundManager.playSE('make_func');
  }

  // === 入力処理 ===
  initInput() {
    document.addEventListener("keydown", e => {
      // 入力欄がfocus状態なら矢印キーを無視
      const inputElement = document.getElementById('expr');
      if (inputElement && inputElement === document.activeElement) {
        return;
      }
      
      if (e.code === "ArrowLeft") this.keys.left = true;
      if (e.code === "ArrowRight") this.keys.right = true;
      if (e.code === "ArrowUp") this.keys.up = true;
    });
    document.addEventListener("keyup", e => {
      // 入力欄がfocus状態なら矢印キーを無視
      const inputElement = document.getElementById('expr');
      if (inputElement && inputElement === document.activeElement) {
        return;
      }
      
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
          input.blur(); // focusを外す
        }
      });
      input.addEventListener('input', () => {
        this.updateDisplayLatex(input.value);
      });
    }
  }

  setFunction(expr) {
    try {
      // t未解禁で式にtが含まれている場合は不正扱い
      if (!this.isTimeUnlocked && /\bt\b/.test(expr)) {
        const input = document.getElementById('expr');
        if (input) input.value = this.fnText;
        alert('tは使用できません（全ステージ100%で解禁）');
        return;
      }

      const compiled = math.compile(expr);
      const currentT = this.getCurrentTime();
      compiled.evaluate({ x: 0, t: currentT });
      const fn = x => compiled.evaluate({ x, t: this.getCurrentTime() });

      // 合成 g(f(x)) を作成（初期設定関数 g を後段に適用）
      const composedFn = (x) => this.initialFn ? this.initialFn(fn(x), this.getCurrentTime()) : fn(x);

      // 必須通過点の検証
      for (const rp of this.requiredPoints) {
        if (!rp.check(composedFn)) {
          const input = document.getElementById('expr');
          if (input) input.value = this.fnText;
          alert('要求された点を通っていません');
          return;
        }
      }

      this.functionPlatform.fn = composedFn;
      this.fnText = expr;
      this.updateDisplayLatex(expr);
      const input = document.getElementById('expr');
      if (input) input.value = expr;
      soundManager.playSE('make_func');
      
      // 関数変更回数をカウント
      this.functionChangeCount++;
      
      // 関数更新アニメーションを開始
      this.startFunctionUpdateAnimation();
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
    this.startTime = performance.now();
    this.time = 0;
    this.functionChangeCount = 0;
    // ステージクリア状況が更新されている可能性があるため再判定
    this.isTimeUnlocked = this.checkTimeUnlocked();
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
      // クリアにより全ステージ100%に到達した場合、t解禁演出
      const wasUnlocked = this.isTimeUnlocked;
      const nowUnlocked = this.checkTimeUnlocked();
      if (!wasUnlocked && nowUnlocked) {
        this.isTimeUnlocked = true;
        try { localStorage.setItem('time_unlocked_announced', 'true'); } catch {}
        this.triggerTimeUnlockEffect();
      }
    }
  }

  saveClearData() {
    // localStorageにクリアデータを保存
    const key = `stage_${this.stageId}_clear`;
    const totalCollectibles = this.collectibles.length;
    const collectedCount = this.collectedCount;
    const clearTime = this.time; // 現在のクリア時間（秒）
    
    // 既存のデータを取得
    const existingData = localStorage.getItem(key);
    let bestCollected = collectedCount;
    let bestFunctionChangeCount = this.functionChangeCount;
    let oneShotTrophy = false; // 永続トロフィー
    let bestTime = clearTime;
    
    if (existingData) {
      const data = JSON.parse(existingData);
      bestCollected = Math.max(data.collected, collectedCount);
      // 関数変更回数は少ない方が良い(ベストスコア)
      if (data.functionChangeCount !== undefined) {
        bestFunctionChangeCount = Math.min(data.functionChangeCount, this.functionChangeCount);
      }
      // 既存の永続トロフィーを引き継ぐ
      oneShotTrophy = Boolean(data.oneShotTrophy);
      // 最速クリアタイムを更新（少ない方が良い）
      if (typeof data.bestTime === 'number' && isFinite(data.bestTime)) {
        bestTime = Math.min(data.bestTime, clearTime);
      }
    }
    // 今回のプレイで条件達成ならトロフィー付与（全コイン取得 かつ 関数変更1回のみ）
    if (collectedCount === totalCollectibles && this.functionChangeCount <= 1) {
      oneShotTrophy = true;
    }
    
    localStorage.setItem(key, JSON.stringify({
      cleared: true,
      collected: bestCollected,
      total: totalCollectibles,
      functionChangeCount: bestFunctionChangeCount,
      oneShotTrophy,
      bestTime
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
    this.requiredPoints.forEach(rp => rp.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY));
    this.goal.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY);
    this.player.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY);

    // 時間表示 (右上)
    ctx.save();
    ctx.fillStyle = "#333";
    ctx.font = "14px Arial";
    ctx.textAlign = "right";
    // 初期関数が"x"以外なら g(f(x)) の形式で表示
    const compositionText = this.initialFunctionText === "x" 
      ? "y = f(x)" 
      : `y = ${this.initialFunctionText.replace(/x/g, "f(x)")}`;
    const hudX = this.WIDTH - 10;
    const compY = 12;
    const timeY = 30;
    ctx.fillText(compositionText, hudX, compY);
    if (this.isTimeUnlocked) {
      ctx.fillText(`t = ${this.time.toFixed(2)}s`, hudX, timeY);
    }
    ctx.restore();

    // t解禁演出の描画（中央に大きな"t"＋放射状の光）
    if (this.timeUnlockAnimation) {
      const elapsed = performance.now() - this.timeUnlockAnimation.start;
      const progress = Math.min(1, elapsed / this.timeUnlockAnimation.duration);
      const alpha = 1 - progress; // 徐々にフェードアウト
      const cx = this.WIDTH / 2;
      const cy = this.HEIGHT / 2;
      const baseRadius = Math.min(this.WIDTH, this.HEIGHT) * 0.35;
      const pulse = Math.sin(elapsed / 180) * 8;

      ctx.save();
      ctx.translate(cx, cy);

      // 放射状の線（豪華な光）
      const rays = 32;
      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2 + elapsed / 600; // ゆっくり回転
        const len = baseRadius + pulse + (i % 2 === 0 ? 12 : 0);
        const hue = (elapsed / 10 + i * 12) % 360;
        ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${alpha * 0.7})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 40, Math.sin(angle) * 40);
        ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
        ctx.stroke();
      }

      // 外周のグローリング
      ctx.beginPath();
      ctx.lineWidth = 6;
      ctx.strokeStyle = `rgba(255, 200, 80, ${alpha * 0.6})`;
      ctx.arc(0, 0, baseRadius - 10 + pulse, 0, Math.PI * 2);
      ctx.stroke();

      // 中央の大きな"t"（少し下げる）
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = 160;
      ctx.font = `bold ${fontSize}px Arial`;
      // 内側グラデーション風
      const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      gradient.addColorStop(1, `rgba(255, 180, 50, ${alpha})`);
      ctx.fillStyle = gradient;
      ctx.fillText('t', 0, 20);

      // 下に解禁テキスト（位置も少し下げる）
      ctx.font = 'bold 36px Arial';
      ctx.fillStyle = `rgba(255, 200, 80, ${alpha})`;
      ctx.fillText('解禁!', 0, 110);

      ctx.restore();
      if (progress >= 1) this.timeUnlockAnimation = null;
    }

    // 関数更新アニメーション描画
    if (this.functionUpdateAnimation) {
      this.drawFunctionUpdateAnimation(ctx);
    }

    // UI描画（ゲーム終了時）
    if (this.state !== "playing") {
      this.drawUI();
    }
  }

  // === 関数更新アニメーション ===
  startFunctionUpdateAnimation() {
    this.functionUpdateAnimation = {
      startTime: Date.now(),
      duration: 800 // 0.8秒
    };
  }

  drawFunctionUpdateAnimation(ctx) {
    const anim = this.functionUpdateAnimation;
    const elapsed = Date.now() - anim.startTime;
    const progress = Math.min(elapsed / anim.duration, 1);

    // アニメーション終了判定
    if (progress >= 1) {
      this.functionUpdateAnimation = null;
      return;
    }

    // 関数曲線上を光が走る
    const startX = -1;
    const endX = 11;
    const currentX = startX + (endX - startX) * progress;

    // 光の範囲（前後に少し広げる）
    const lightRange = 1.5;
    
    ctx.save();
    ctx.lineWidth = 4;

    // 光のグラデーション効果
    for (let x = Math.max(startX, currentX - lightRange); x <= Math.min(endX, currentX + lightRange); x += 0.05) {
      try {
        const y = this.functionPlatform.fn(x);
        if (!isFinite(y)) continue;

        const px = this.originX + x * this.scaleX;
        const py = this.originY - y * this.scaleY;

        // 距離に応じた明るさ
        const dist = Math.abs(x - currentX);
        const intensity = Math.max(0, 1 - (dist / lightRange));
        
        // 虹色グラデーション
        const hue = (progress * 360 + x * 30) % 360;
        const alpha = intensity * 0.8;

        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 6 * intensity, 0, Math.PI * 2);
        ctx.stroke();

        // 中心の明るい点
        if (intensity > 0.7) {
          ctx.fillStyle = `hsla(${hue}, 100%, 90%, ${intensity})`;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } catch (e) {
        // 関数評価エラーは無視
      }
    }

    ctx.restore();
  }

  drawUI() {
    const ctx = this.ctx;
    // t解禁演出中は背景暗転も含めてスコア画面表示を遅延
    if (this.timeUnlockAnimation) {
      return;
    }
    // 背景を暗く（演出終了後に適用）
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
    const homeBtn = this.createIconButton('<i class="fas fa-home"></i> ホーム', '#4caf50', () => {
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

    btn.innerHTML = label;

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
    // 経過時間を秒で更新
    this.time = (performance.now() - this.startTime) / 1000;

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
