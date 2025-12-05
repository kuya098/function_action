# プロジェクト構造まとめ

## ディレクトリ構成

```
function_action_game/
├── Home.js
├── index.html
├── Manager.js
├── SoundManager.js
├── PROJECT_STRUCTURE.md
├── 関数アクション　必要機能.txt
└── game/
    ├── entities.js
    ├── Game.js
    ├── Main.js
    ├── Player.js
    ├── stage_data.json
    ├── audio/
    │   ├── GameBGM.mp3
    │   ├── HomeBGM.mp3
    │   ├── coin.mp3
    │   ├── gameover.mp3
    │   ├── goal.mp3
    │   ├── button.mp3
    │   └── jump.mp3
    └── images/
        ├── Coin.png
        ├── Goal.png
        ├── Hazard.png
        ├── Star.png
        └── Star_gray.png
```

## 主なファイルと役割

- **index.html**: ゲームのHTMLエントリポイント。canvas配置、JSロード、中央配置、input-container。
- **Manager.js**: 画面遷移・ゲームインスタンス管理。`showHome`, `showGame`, `nextStage` などグローバル関数。soundManager をグローバルで提供。
- **Home.js**: ホーム画面の描画・クリック処理。クリア率表示（localStorage ベース）。
- **SoundManager.js**: Web Audio API による音声管理。BGM/SE 再生・ボリュームコントロール。
- **game/Game.js**: ゲーム本体ロジック。ステージ進行、UI、スコア画面、ボタン管理、必須通過点（RequiredPoint）検証。
- **game/Main.js**: `startGame` 関数など、ゲーム開始のエントリポイント。input フィールド・ボタン生成。
- **game/Player.js**: プレイヤーキャラクター。物理演算、衝突検出（床・天井・ハザード）、描画。
- **game/entities.js**: Platform, Collectible, Hazard, Goal, **RequiredPoint** クラス。
- **game/stage_data.json**: ステージごとのアイテム・ハザード・必須通過点・ゴール配置データ。
- **game/audio/**: BGM・SE の MP3 ファイル。
- **game/images/**: コイン・ゴール・ハザード等の画像素材。

## 画面遷移・グローバル関数
- `showHome()` : ホーム画面へ遷移
- `showGame(stageId)` : 指定ステージでゲーム開始
- `nextStage()` : 次のステージへ進む

## ゲームの流れ
1. **ホーム画面**: クリア率表示、ステージ選択ボタン、BGM 再生
2. **ゲーム画面**: 
   - キーボード（←→↑）またはマウス/タッチ入力で関数式を操作
   - 必須通過点（黒い点）を通す必要があれば「要求された点を通っていません」エラー
   - 関数をハザード・ゴールと衝突判定しながらステージクリア
   - コイン集めでスコア加算
3. **スコア画面**: クリア判定、コイン成功率、[NEXT] [HOME] [リスタート] ボタン

## ステージデータ
- `game/stage_data.json` で各ステージの以下を管理:
  - `collectibles`: コインの座標 `[{ x, y }, ...]`
  - `hazards`: ハザード領域 `[{ x, y, width, height }, ...]`
  - `requiredPoints`: 関数が必須で通過する座標 `[{ x, y }, ...]` (stage 4 に実装)
  - `goal`: ゴール座標 `{ x, y }`

## ゲームUI・ボタン
- スコア画面のボタンはGame.jsで配列管理し、描画・クリック判定を一元化
- FontAwesome 6.5.1 でアイコン表示（ホームボタンなど）
- 入力フィールド：750px × 48px、フォーカス時に矢印キーを無視

## 重要な仕様

### 必須通過点（RequiredPoint）
- entities.js で RequiredPoint クラスを定義
- Game.js の setFunction() で関数を検証
- 合致しない場合は「要求された点を通っていません」でアラート

### 衝突検出
- Player.js で床衝突・天井衝突・ハザード衝突を個別に処理
- 天井衝突時は上昇速度を 0 に制限（関数上部の線形スキップ防止）

### サウンド
- BGM: HomeBGM (ホーム), GameBGM (ゲーム中)
- SE: jump, coin (1.0 ボリューム), goal, gameover, button (0.5 ボリューム)
- 効果音でゲームのフィードバック向上

### スコア計算
- クリア判定：50%
- コイン獲得率：50%（totalCount が 0 なら自動 25%）
- localStorage に保存・ホーム画面で表示

## 注意点
- fetch による json ロードは非同期なので、データ取得後にGameインスタンス生成が必要
- グローバル関数は Manager.js で window に登録
- soundManager はグローバルで利用可能（Manager.js で設定）
- RequiredPoint の許容値は 0.05 単位
- 入力フィールドはHTMLの `.input-container` 内に flex row で配置、フォーカス時に矢印キーを無視
- マウス/タッチ入力はゲーム領域全体で検出可能
