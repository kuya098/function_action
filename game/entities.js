export class Platform {
  constructor(type, options = {}) {
    this.type = type;
    if (type === "function") {
      this.fn = options.fn || (x => 0);
    }
  }

  draw(ctx, originX, originY, scaleX, scaleY) {
    if (this.type === "function") {
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let px = 0; px <= canvas.width; px++) {
        const x = (px - originX) / scaleX;
        const y = this.fn(x);
        const py = originY - y * scaleY;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
}

export class Collectible {
  constructor(x, y, size = 0.5) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.collected = false;
  }

  draw(ctx, originX, originY, scaleX, scaleY) {
    
    if (this.collected) return;
    if (!Collectible.coinImage) {
      Collectible.coinImage = new Image();
      Collectible.coinImage.src = 'game/images/Coin.png'; // コイン画像のパス
    }
    if (Collectible.coinImage.complete) {
      ctx.drawImage(
        Collectible.coinImage,
        originX + this.x * scaleX - (this.size * scaleX) / 2,
        originY - this.y * scaleY - (this.size * scaleY) / 2,
        this.size * scaleX,
        this.size * scaleY
      );
    } else {
      // 読み込み中は円で代用
      ctx.fillStyle = "orange";
      ctx.beginPath();
      ctx.arc(
        originX + this.x * scaleX,
        originY - this.y * scaleY,
        (this.size * scaleX) / 2,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
  }

  check(player) {
    if (this.collected) return false;
    const pxLeft = player.x - player.width/2;
    const pxRight = player.x + player.width/2;
    const pyBottom = player.y;
    const pyTop = player.y + player.height;

    const cxLeft = this.x - this.size/2;
    const cxRight = this.x + this.size/2;
    const cyBottom = this.y;
    const cyTop = this.y + this.size;

    const overlap = !(pxRight < cxLeft || pxLeft > cxRight || pyTop < cyBottom || pyBottom > cyTop);
    if (overlap) this.collected = true;
    return overlap;
  }
}

export class Hazard {
  constructor(x, y, width = 1, height = 1) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  draw(ctx, originX, originY, scaleX, scaleY) {
    if (!Hazard.hazardImage) {
      Hazard.hazardImage = new Image();
      Hazard.hazardImage.src = 'game/images/Hazard.png';
    }
    if (Hazard.hazardImage.complete && Hazard.hazardImage.naturalWidth > 0) {
      ctx.drawImage(
        Hazard.hazardImage,
        originX + this.x * scaleX - (this.width * scaleX) / 2,
        originY - this.y * scaleY - (this.height * scaleY) / 2,
        this.width * scaleX,
        this.height * scaleY
      );
    } else {
      // 読み込み中は赤い四角で描画
      ctx.fillStyle = "red";
      ctx.fillRect(
        originX + this.x * scaleX - (this.width * scaleX) / 2,
        originY - this.y * scaleY - (this.height * scaleY) / 2,
        this.width * scaleX,
        this.height * scaleY
      );
    }
  }

  check(player) {
    // プレイヤーと矩形の当たり判定
    const px = player.x, py = player.y;
    return (
      px + player.width / 2 > this.x - this.width / 2 &&
      px - player.width / 2 < this.x + this.width / 2 &&
      py + player.height > this.y &&
      py < this.y + this.height
    );
  }
}

export class Goal {
  constructor(x, y, size = 1.0) {
    this.x = x;
    this.y = y;
    this.width = size;
    this.height = size;
  }

  draw(ctx, originX, originY, scaleX, scaleY) {
    if (!Goal.goalImage) {
      Goal.goalImage = new Image();
      Goal.goalImage.src = 'game/images/Flag.png';
    }
    if (Goal.goalImage.complete && Goal.goalImage.naturalWidth > 0) {
      ctx.drawImage(
        Goal.goalImage,
        originX + (this.x - this.width / 2) * scaleX,
        originY - this.y * scaleY - this.height * scaleY,
        this.width * scaleX,
        this.height * scaleY
      );
    } else {
      // 読み込み中は従来の色で描画
      ctx.fillStyle = "#cc3";
      ctx.fillRect(
        originX + (this.x - this.width / 2) * scaleX,
        originY - this.y * scaleY - this.height * scaleY,
        this.width * scaleX,
        this.height * scaleY
      );
    }
  }

  check(player) {
    const pxLeft = player.x - player.width / 2;
    const pxRight = player.x + player.width / 2;
    const pyBottom = player.y;
    const pyTop = player.y + player.height;

    const gxLeft = this.x - this.width / 2;
    const gxRight = this.x + this.width / 2;
    const gyBottom = this.y;
    const gyTop = this.y + this.height;

    return !(pxRight < gxLeft || pxLeft > gxRight || pyTop < gyBottom || pyBottom > gyTop);
  }
}

