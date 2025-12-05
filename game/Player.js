export class Player {
  constructor(x, y, width = 1, height = 1) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.velocity = { x: 0, y: 0 };
    this.history = [];
    this.faceDirection = 1; // 向き（1:右, -1:左）
  }

  // === 定数 ===
  static get GRAVITY() { return 0.02; }
  static get JUMP_POWER() { return 0.3; }
  static get MOVE_SPEED() { return 0.05; }
  static get WALL_LEFT() { return -1; }
  static get WALL_RIGHT() { return 11; }
  static get CEILING_HEIGHT() { return 7; }
  static get SAMPLE_INTERVAL() { return 0.1; }
  static get CORNER_RADIUS_RATIO() { return 0.28; }
  static get EYE_BASE_HEIGHT_RATIO() { return 0.6; }
  static get EYE_OFFSET_RATIO() { return 0.16; }
  static get EYE_RADIUS_RATIO() { return 0.07; }
  static get EYE_GAP_RATIO() { return 0.23; }
  static get TRAIL_COLOR() { return "rgba(0, 238, 255, 0.3)"; }
  static get BODY_COLOR() { return "rgba(0, 238, 255, 1)"; }
  static get HISTORY_LIMIT() { return 20; }
  static get EYE_COLOR() { return "#222"; }

  // === メインメソッド ===
  update(keys, groundFunc) {
    this.updateHorizontalMovement(keys);
    this.updateVerticalMovement(groundFunc, keys);
    this.enforceWorldBoundaries();
    this.updateTrail();
  }

  draw(ctx, originX, originY, scaleX, scaleY) {
    this.drawTrail(ctx, originX, originY, scaleX, scaleY);
    this.drawBody(ctx, originX, originY, scaleX, scaleY);
    this.drawEyes(ctx, originX, originY, scaleX, scaleY);
  }

  // === 物理更新メソッド ===
  updateHorizontalMovement(keys) {
    // 横移動
    this.velocity.x = keys.left ? -Player.MOVE_SPEED : keys.right ? Player.MOVE_SPEED : 0;
    this.x += this.velocity.x;

    // 左右の壁に当たり判定
    const leftBound = Player.WALL_LEFT + this.width / 2;
    const rightBound = Player.WALL_RIGHT - this.width / 2;
    if (this.x < leftBound) this.x = leftBound;
    if (this.x > rightBound) this.x = rightBound;
  }

  updateVerticalMovement(groundFunc, keys) {
    // 重力を適用
    this.velocity.y -= Player.GRAVITY;
    this.y += this.velocity.y;

    // 地面判定（常にめり込み量だけy座標を補正）
    const boundingBox = this.getHorizontalBounds();
    const verticalAdjust = this.checkGroundCollision(boundingBox, groundFunc);

    this.y += verticalAdjust;
    if (verticalAdjust !== 0) {
      this.velocity.y = 0;
      if (keys.up) this.velocity.y = Player.JUMP_POWER; // ジャンプ
    }
  }

  enforceWorldBoundaries() {
    // 上限超過時
    const maxY = Player.CEILING_HEIGHT - this.height;
    if (this.y > maxY) {
      this.y = maxY;
      this.velocity.y = 0;
    }
  }

  updateTrail() {
    // 残像記録
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > Player.HISTORY_LIMIT) {
      this.history.shift();
    }
  }

  // === 当たり判定メソッド ===
  getHorizontalBounds() {
    return {
      xMin: this.x - this.width / 2,
      xMax: this.x + this.width / 2,
      yMin: this.y,
      yMax: this.y + this.height
    };
  }

  checkGroundCollision(boundingBox, groundFunc) {
    let maxGroundY = null;
    let contact = false;

    for (let x = boundingBox.xMin; x <= boundingBox.xMax; x += Player.SAMPLE_INTERVAL) {
      const groundY = groundFunc(x);
      if (groundY >= boundingBox.yMin && groundY <= boundingBox.yMax) {
        contact = true;
        if (maxGroundY === null || groundY > maxGroundY) {
          maxGroundY = groundY;
        }
      }
    }

    if (!contact) return 0;
    return maxGroundY - boundingBox.yMin;
  }

  // === 描画メソッド ===
  drawTrail(ctx, originX, originY, scaleX, scaleY) {
    ctx.fillStyle = Player.TRAIL_COLOR;
    this.history.forEach((pos, index) => {
      const sizeFactor = (index + 1) / this.history.length;
      this.drawRoundedRect(ctx, pos, sizeFactor, originX, originY, scaleX, scaleY);
    });
  }

  drawBody(ctx, originX, originY, scaleX, scaleY) {
    ctx.fillStyle = Player.BODY_COLOR;
    this.drawRoundedRect(ctx, { x: this.x, y: this.y }, 1, originX, originY, scaleX, scaleY);
  }

  drawRoundedRect(ctx, pos, sizeFactor, originX, originY, scaleX, scaleY) {
    const px = originX + (pos.x - this.width / 2) * scaleX + this.width * scaleX * (1 - sizeFactor) / 2;
    const py = originY - pos.y * scaleY - this.height * scaleY + this.height * scaleY * (1 - sizeFactor) / 2;
    const pw = this.width * scaleX * sizeFactor;
    const ph = this.height * scaleY * sizeFactor;
    const radius = Math.min(pw, ph) * Player.CORNER_RADIUS_RATIO;

    ctx.beginPath();
    ctx.moveTo(px + radius, py);
    ctx.lineTo(px + pw - radius, py);
    ctx.quadraticCurveTo(px + pw, py, px + pw, py + radius);
    ctx.lineTo(px + pw, py + ph - radius);
    ctx.quadraticCurveTo(px + pw, py + ph, px + pw - radius, py + ph);
    ctx.lineTo(px + radius, py + ph);
    ctx.quadraticCurveTo(px, py + ph, px, py + ph - radius);
    ctx.lineTo(px, py + radius);
    ctx.quadraticCurveTo(px, py, px + radius, py);
    ctx.closePath();
    ctx.fill();
  }

  drawEyes(ctx, originX, originY, scaleX, scaleY) {
    // 向き更新
    if (this.velocity.x > 0) this.faceDirection = 1;
    else if (this.velocity.x < 0) this.faceDirection = -1;

    const eyeBaseX = originX + this.x * scaleX;
    const eyeBaseY = originY - (this.y + this.height * Player.EYE_BASE_HEIGHT_RATIO) * scaleY;
    const eyeOffsetX = (this.width * scaleX) * Player.EYE_OFFSET_RATIO * this.faceDirection;
    const eyeGap = (this.width * scaleX) * Player.EYE_GAP_RATIO;
    const eyeRadius = (this.width * scaleX) * Player.EYE_RADIUS_RATIO;
    const eyePositions = [eyeBaseX + eyeOffsetX + eyeGap / 2, eyeBaseX + eyeOffsetX - eyeGap / 2];

    eyePositions.forEach(eyeX => {
      ctx.save();
      ctx.translate(eyeX, eyeBaseY);
      ctx.scale(1, 2);
      
      // 黒目
      ctx.fillStyle = Player.EYE_COLOR;
      ctx.beginPath();
      ctx.arc(0, 0, eyeRadius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    });
  }
}
