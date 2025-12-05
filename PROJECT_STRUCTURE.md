# プロジェクト構造まとめ

## ディレクトリ構成

```
function_action_game/
├── Home.js
├── index.html
├── Manager.js
├── PROJECT_STRUCTURE.md
├── 関数アクション　必要機能.txt
└── game/
    ├── entities.js
    ├── Game.js
    ├── Main.js
    ├── Player.js
    ├── stage_data.json
    └── images/
        ├── Coin.png
        ├── Goal.png
        ├── Hazard.png
        ├── Star.png
        └── Star_gray,.png
```

## 主なファイルと役割

- **index.html**: ゲームのHTMLエントリポイント。canvas配置、JSロード。
- **Manager.js**: 画面遷移・ゲームインスタンス管理。`showHome`, `showGame`, `nextStage` などグローバル関数もここ。
- **Home.js**: ホーム画面の描画・クリック処理。
- **game/Game.js**: ゲーム本体ロジック。ステージ進行、UI、スコア画面、ボタン管理など。
- **game/Main.js**: `startGame`関数など、ゲーム開始のエントリポイント。
- **game/Player.js**: プレイヤーキャラクターの挙動・描画。
- **game/entities.js**: Platform, Collectible, Hazard, Goal などゲーム内オブジェクトのクラス群。
- **game/stage_data.json**: ステージごとのアイテム・ゴール・ハザード配置データ。
- **game/images/**: コイン・ゴール・ハザード等の画像素材。

## 画面遷移・グローバル関数
- `showHome()` : ホーム画面へ遷移
- `showGame(stageId)` : 指定ステージでゲーム開始
- `nextStage()` : 次のステージへ進む

## ステージデータ
- `game/stage_data.json` で各ステージのcollectibles, hazards, goal座標を管理
- Game.jsでfetchして利用

## ゲームUI・ボタン
- スコア画面のボタンはGame.jsで配列管理し、描画・クリック判定を一元化
- NEXT, HOME, リスタートの3ボタン

## 注意点
- fetchによるjsonロードは非同期なので、データ取得後にGameインスタンス生成が必要
- グローバル関数はManager.jsでwindowに登録
