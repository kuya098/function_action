export class Player {
  constructor(x, y, width = 1, height = 1) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.velocity = { x: 0, y: 0 };
    this.history = [];
  }

  update(keys, groundFunc) {
    // 横移動
    this.velocity.x = keys.left ? -0.05 : keys.right ? 0.05 : 0;
    this.x += this.velocity.x;
    //左右の壁に当たり判定
    if (this.x - this.width / 2 < -1) this.x = -1 + this.width / 2;
    if (this.x + this.width / 2 > 11) this.x = 11 - this.width / 2;

    // 重力
    this.velocity.y += -0.02;
    this.y += this.velocity.y;

    // 地面判定（常にめり込み量だけy座標を補正）
    const xMin = this.x - this.width / 2;
    const xMax = this.x + this.width / 2;
    const yMin = this.y;
    const yMax = this.y + this.height;
    const adjust = this.rectIntersectsFunction(xMin, xMax, yMin, yMax, groundFunc);
    this.y += adjust;
    if (adjust !== 0) {
      this.velocity.y = 0;
      if (keys.up) this.velocity.y = 0.3; // ジャンプ力
    }

    if (this.y > 7 - this.height) {
      this.y = 7 - this.height;
      this.velocity.y = 0;
    }
  }

  draw(ctx, originX, originY, scaleX, scaleY) {
    // 残像を残す　ちょっとずつ小さくする（角丸）
    ctx.fillStyle = "rgba(0, 238, 255, 0.3)";
    this.history.forEach((pos, index) => {
      const sizeFactor = (index + 1) / this.history.length; // 残像の大きさを調整
      const px = originX + (pos.x - this.width / 2) * scaleX + this.width * scaleX * (1 - sizeFactor) / 2;
      const py = originY - pos.y * scaleY - this.height * scaleY + this.height * scaleY * (1 - sizeFactor) / 2;
      const pw = this.width * scaleX * sizeFactor;
      const ph = this.height * scaleY * sizeFactor;
      const radius = Math.min(pw, ph) * 0.28;
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
    });


    ctx.fillStyle = "rgba(0, 238, 255, 1)";
    // --- 角丸四角形で本体を描画 ---
    const px = originX + (this.x - this.width / 2) * scaleX;
    const py = originY - this.y * scaleY - this.height * scaleY;
    const pw = this.width * scaleX;
    const ph = this.height * scaleY;
    const radius = Math.min(pw, ph) * 0.28;
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

    // 丸い目（白目＋黒目）を一時コメントアウト
    if (this._faceDir === undefined) this._faceDir = 1;
    if (this.velocity.x > 0) this._faceDir = 1;
    else if (this.velocity.x < 0) this._faceDir = -1;
    const eyeBaseX = originX + this.x * scaleX;
    const eyeBaseY = originY - (this.y + this.height * 0.6) * scaleY;
    const eyeOffsetX = (this.width * scaleX) * 0.16 * this._faceDir;
    const eyeGap = (this.width * scaleX) * 0.23;
    const eye1X = eyeBaseX + eyeOffsetX + eyeGap/2;
    const eye2X = eyeBaseX + eyeOffsetX - eyeGap/2;
    [eye1X, eye2X].forEach(eyeX => {
      ctx.save();
      ctx.translate(eyeX, eyeBaseY);
      ctx.scale(1, 2);
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(0, 0, (this.width * scaleX) * 0.07, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    });




    this.history.push({x: this.x, y: this.y});
    if (this.history.length > 20) {
      this.history.shift();
    }
  }


  /**
   * プレイヤー矩形と関数グラフの重なり量（y方向）を返す
   * @param {number} xMin - プレイヤー矩形の左端
   * @param {number} xMax - プレイヤー矩形の右端
   * @param {number} yMin - プレイヤー矩形の下端
   * @param {number} yMax - プレイヤー矩形の上端
   * @param {function} fn - 地面関数
   * @returns {y: number} どれだけx/y方向に動かせば重ならないか（0なら重なっていない）
   */
  rectIntersectsFunction(xMin, xMax, yMin, yMax, fn) {
    const SAMPLES_INTERVAL = 0.1;
    let maxGroundY = null;
    let contact = false;
    
    // 簡易版：角丸矩形を考慮しながら、当たり判定を矩形のまま使用
    // 角丸による縮小を適用（下部の角丸を考慮して有効な下端を上げる）
    const cornerRadius = Math.min(this.width, this.height) * 0.28;
    const effectiveYMin = yMin + cornerRadius * 0.5; // 角丸を考慮した有効下端
    
    for (let x = xMin; x <= xMax; x += SAMPLES_INTERVAL) {
      const groundY = fn(x);
      // サンプル点がプレイヤーと接触しているか
      if (groundY >= effectiveYMin && groundY <= yMax) {
        contact = true;
        if (maxGroundY === null || groundY > maxGroundY) {
          maxGroundY = groundY;
        }
      }
    }
    
    // どのサンプル点も接触していなければ0を返す
    if (!contact) return 0;
    // プレイヤーの有効な下辺に合わせる
    return maxGroundY - effectiveYMin;
  }

}

