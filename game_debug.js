const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

class Player {
  constructor(x, y, width = 1, height = 1) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.velocity = { x: 0, y: 0 };
  }

  update(keys, groundFunc) {
    // 横移動
    this.velocity.x = keys.left ? -0.05 : keys.right ? 0.05 : 0;
    this.x += this.velocity.x;

    // 重力
    this.velocity.y += -0.02;
    this.y += this.velocity.y;

    // 地面判定
    const groundY = groundFunc(this.x);
    if (this.y < groundY) {
      this.y = groundY;
      this.velocity.y = 0;
      if (keys.up) this.velocity.y = 0.3; // ジャンプ力
    }
  }

  draw(ctx, originX, originY, scaleX, scaleY) {
    ctx.fillStyle = "red";
    ctx.fillRect(
      originX + (this.x - this.width / 2) * scaleX,
      originY - this.y * scaleY - this.height * scaleY,
      this.width * scaleX,
      this.height * scaleY
    );
  }
}

class Platform {
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

class Collectible {
  constructor(x, y, size = 0.5) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.collected = false;
  }

  draw(ctx, originX, originY, scaleX, scaleY) {
    if (this.collected) return;
    ctx.fillStyle = "orange";
    ctx.fillRect(
      originX + (this.x - this.size/2)*scaleX,
      originY - (this.y + this.size/2)*scaleY,
      this.size*scaleX,
      this.size*scaleY
    );
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


class Goal {
  constructor(x, y, width = 0.5, height = 0.5) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  draw(ctx, originX, originY, scaleX, scaleY) {
    ctx.fillStyle = "#cc3";
    ctx.fillRect(
      originX + (this.x - this.width / 2) * scaleX,
      originY - this.y * scaleY - this.height * scaleY,
      this.width * scaleX,
      this.height * scaleY
    );
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


class Game {
  constructor(canvas, ctx) {
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


    this.collectibles = [
      new Collectible(3, 0.5),
      new Collectible(5, 1.5),
      new Collectible(8, 0.5)
    ];
    this.collectedCount = 0;
    this.goal = new Goal(10, 0.25, 0.5, 0.5);
    this.running = true;

    this.initInput();
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

  setFunction(expr) {
    const compiled = math.compile(expr);
    this.functionPlatform.fn = x => compiled.evaluate({ x });
    // this.functionPlatform.fn = math.compile(expr).evaluate.bind(null);
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
  }

    update() {
    if (!this.running) return;

    this.player.update(this.keys, this.functionPlatform.fn);

    // ゴール判定
    if (this.goal.check(this.player)) {
      this.running = false; // ゲーム終了
      // alert(`CLEAR!\n取得アイテム: ${this.collectedCount} / ${this.collectibles.length}`);
    }

    // オブジェクト取得判定
    this.collectibles.forEach(c => {
      if (c.check(this.player)) this.collectedCount++;
    });
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.WIDTH, this.HEIGHT);
    this.drawGrid();
    this.platforms.forEach(p => p.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY));
    this.functionPlatform.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY);
    this.collectibles.forEach(c => c.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY));
    this.goal.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY);
    this.player.draw(ctx, this.originX, this.originY, this.scaleX, this.scaleY);

    // UI表示
    if (!this.running) {
      // 背景を少し暗く
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0,0,this.WIDTH,this.HEIGHT);

      // 中央ボックス
      const boxWidth = 300, boxHeight = 200;
      const boxX = this.WIDTH/2 - boxWidth/2;
      const boxY = this.HEIGHT/2 - boxHeight/2;
      ctx.fillStyle = "white";
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

      // CLEAR! 文字
      ctx.fillStyle = "black";
      ctx.font = "40px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("CLEAR!", this.WIDTH/2, this.HEIGHT/2 - 30);

      // 取得数表示
      ctx.font = "24px Arial";
      ctx.fillText(`取得アイテム: ${this.collectedCount} / ${this.collectibles.length}`, this.WIDTH/2, this.HEIGHT/2 + 30);
    }
  }


  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

// --- 初期化 ---
const game = new Game(canvas, ctx);

// 関数入力例（HTML側でボタン押したら game.setFunction(expr) を呼ぶ）

const input = document.getElementById("expr");
const button = document.getElementById("drawBtn");

button.addEventListener("click", () => {
  const expr = input.value;
  // クラスGameのインスタンス game に関数を設定
  game.setFunction(expr);
});

