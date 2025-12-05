// === ゲーム内オブジェクトの定義 ===

// リソース管理クラス
class ResourceManager {
  static coinImage = null;
  static hazardImage = null;
  static goalImage = null;

  static async loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  static getOrLoadImage(staticKey, src, obj) {
    if (!obj[staticKey]) {
      obj[staticKey] = new Image();
      obj[staticKey].src = src;
    }
    return obj[staticKey];
  }
}

// === Platform（プラットフォーム） ===
export class Platform {
  static get STROKE_COLOR() { return "blue"; }
  static get LINE_WIDTH() { return 2; }

  constructor(type, options = {}) {
    this.type = type;
    if (type === "function") {
      this.fn = options.fn || (x => 0);
    }
  }

  draw(ctx, originX, originY, scaleX, scaleY) {
    if (this.type === "function") {
      ctx.strokeStyle = Platform.STROKE_COLOR;
      ctx.lineWidth = Platform.LINE_WIDTH;
      ctx.beginPath();
      for (let px = 0; px <= 800; px++) { // canvas.width = 800
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

// === Collectible（コレクティブル・コイン） ===
export class Collectible {
  static get DEFAULT_SIZE() { return 0.5; }
  static get FILL_COLOR() { return "orange"; }
  static get IMAGE_PATH() { return 'game/images/Coin.png'; }

  constructor(x, y, size = Collectible.DEFAULT_SIZE) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.collected = false;
  }

  static get coinImage() {
    return ResourceManager.coinImage;
  }

  static set coinImage(img) {
    ResourceManager.coinImage = img;
  }

  draw(ctx, originX, originY, scaleX, scaleY) {
    if (this.collected) return;

    const img = ResourceManager.getOrLoadImage('coinImage', Collectible.IMAGE_PATH, ResourceManager);
    const px = originX + this.x * scaleX - (this.size * scaleX) / 2;
    const py = originY - this.y * scaleY - (this.size * scaleY) / 2;
    const pw = this.size * scaleX;
    const ph = this.size * scaleY;

    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, px, py, pw, ph);
    } else {
      // フォールバック
      ctx.fillStyle = Collectible.FILL_COLOR;
      ctx.beginPath();
      ctx.arc(originX + this.x * scaleX, originY - this.y * scaleY, pw / 2, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  check(player) {
    if (this.collected) return false;

    const playerBounds = this.getPlayerBounds(player);
    const collectibleBounds = this.getBounds();

    const overlap = this.boundsIntersect(playerBounds, collectibleBounds);
    if (overlap) this.collected = true;
    return overlap;
  }

  getPlayerBounds(player) {
    return {
      left: player.x - player.width / 2,
      right: player.x + player.width / 2,
      top: player.y + player.height,
      bottom: player.y
    };
  }

  getBounds() {
    return {
      left: this.x - this.size / 2,
      right: this.x + this.size / 2,
      top: this.y + this.size,
      bottom: this.y
    };
  }

  boundsIntersect(a, b) {
    return !(a.right < b.left || a.left > b.right || a.top < b.bottom || a.bottom > b.top);
  }
}

// === Hazard（ハザード） ===
export class Hazard {
  static get FILL_COLOR() { return "red"; }
  static get IMAGE_PATH() { return 'game/images/Hazard.png'; }
  static get DEFAULT_SIZE() { return 1; }

  constructor(x, y, size = Hazard.DEFAULT_SIZE) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.width = size;
    this.height = size;
  }

  static get hazardImage() {
    return ResourceManager.hazardImage;
  }

  static set hazardImage(img) {
    ResourceManager.hazardImage = img;
  }

  draw(ctx, originX, originY, scaleX, scaleY) {
    const img = ResourceManager.getOrLoadImage('hazardImage', Hazard.IMAGE_PATH, ResourceManager);
    const px = originX + this.x * scaleX - (this.width * scaleX) / 2;
    const py = originY - this.y * scaleY - (this.height * scaleY) / 2;
    const pw = this.width * scaleX;
    const ph = this.height * scaleY;

    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, px, py, pw, ph);
    } else {
      // フォールバック
      ctx.fillStyle = Hazard.FILL_COLOR;
      ctx.fillRect(px, py, pw, ph);
    }
  }

  check(player) {
    return this.boundsIntersect(
      this.getPlayerBounds(player),
      this.getBounds()
    );
  }

  getPlayerBounds(player) {
    return {
      left: player.x - player.width / 2,
      right: player.x + player.width / 2,
      top: player.y + player.height,
      bottom: player.y
    };
  }

  getBounds() {
    return {
      left: this.x - this.width / 2,
      right: this.x + this.width / 2,
      top: this.y + this.height,
      bottom: this.y
    };
  }

  boundsIntersect(a, b) {
    return (
      a.right > b.left &&
      a.left < b.right &&
      a.top > b.bottom &&
      a.bottom < b.top
    );
  }
}

// === Goal（ゴール） ===
export class Goal {
  static get DEFAULT_SIZE() { return 1.0; }
  static get FILL_COLOR() { return "#cc3"; }
  static get IMAGE_PATH() { return 'game/images/Flag.png'; }

  constructor(x, y, size = Goal.DEFAULT_SIZE) {
    this.x = x;
    this.y = y;
    this.width = size;
    this.height = size;
  }

  static get goalImage() {
    return ResourceManager.goalImage;
  }

  static set goalImage(img) {
    ResourceManager.goalImage = img;
  }

  draw(ctx, originX, originY, scaleX, scaleY) {
    const img = ResourceManager.getOrLoadImage('goalImage', Goal.IMAGE_PATH, ResourceManager);
    const px = originX + (this.x - this.width / 2) * scaleX;
    const py = originY - this.y * scaleY - this.height * scaleY;
    const pw = this.width * scaleX;
    const ph = this.height * scaleY;

    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, px, py, pw, ph);
    } else {
      // フォールバック
      ctx.fillStyle = Goal.FILL_COLOR;
      ctx.fillRect(px, py, pw, ph);
    }
  }

  check(player) {
    return this.boundsIntersect(
      this.getPlayerBounds(player),
      this.getBounds()
    );
  }

  getPlayerBounds(player) {
    return {
      left: player.x - player.width / 2,
      right: player.x + player.width / 2,
      top: player.y + player.height,
      bottom: player.y
    };
  }

  getBounds() {
    return {
      left: this.x - this.width / 2,
      right: this.x + this.width / 2,
      top: this.y + this.height,
      bottom: this.y
    };
  }

  boundsIntersect(a, b) {
    return !(a.right < b.left || a.left > b.right || a.top < b.bottom || a.bottom > b.top);
  }
}

// === RequiredPoint（関数が必ず通らなければいけない点） ===
export class RequiredPoint {
  static get RADIUS() { return 0.15; }
  static get COLOR() { return "#000000"; }

  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  draw(ctx, originX, originY, scaleX, scaleY) {
    const px = originX + this.x * scaleX;
    const py = originY - this.y * scaleY;
    const radius = RequiredPoint.RADIUS * scaleX;

    ctx.fillStyle = RequiredPoint.COLOR;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  check(fn) {
    // 関数が此の点を通っているかチェック（誤差0.05以内）
    const tolerance = 0.05;
    const expectedY = fn(this.x);
    return Math.abs(expectedY - this.y) < tolerance;
  }
}
