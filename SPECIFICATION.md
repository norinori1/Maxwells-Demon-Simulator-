# Maxwell's Demon Simulator — 実装仕様書

Version 1.0 (Gamedev.js Jam 2026 提出想定)

## 1. ゲーム概要

- ジャンル: リアルタイム操作 / 物理シミュレーション
- プレイ時間: 60秒
- プレイヤー: 1人
- ターゲット: HTML5ブラウザ（PC / モバイル）
- 技術: Phaser 3 + TypeScript + Vite

プレイヤーは「悪魔」として中央の仕切りに穴を開け、球を正しいチャンバーへ仕分ける。

- Cold球（青）を左へ
- Hot球（赤）を右へ

## 2. ルール

- 制限時間内に正しい側にある球数を増やして仕分け率を上げる
- 仕分け率 = `正解球数 / 全球数 * 100`
- 終了時にグレード表示

| Grade | 仕分け率 |
| --- | --- |
| S | 80%以上 |
| A | 60〜79% |
| B | 40〜59% |
| C | 39%以下 |

## 3. 操作

- マウス左長押し / タッチ押下: 穴を開く
- ポインタY位置: 穴の上下位置
- 押していない間: 穴は閉じる

## 4. 画面仕様

- Canvas: 680x420
- 背景色: `0x0C0C18`
- プレイ領域: `Y=0..375`
- UI領域: `Y=376..419`（高さ44）
- 仕切り: `X=340`（幅6px相当）
- 穴サイズ: 高さ58px

UI要素:

- 残り時間（小数1桁、10秒以下は赤表示）
- COLD/HOT正解カウント
- 仕分け率バー（緑グラデーション）
- 上部チャンバーラベル `← COLD` / `HOT →`

## 5. ゲームオブジェクト

### Ball

- 半径: 7px
- Hot色: `0xC8512A`
- Cold色: `0x2070C0`
- Hot速度: 1.9〜3.4 px/frame（内部は `*60` して px/s）
- Cold速度: 0.4〜1.1 px/frame（同上）
- 数: Hot 11 + Cold 11
- 反射: 外周壁と中央仕切りで速度反転
- 穴が開いていて穴範囲にいる時のみ中央を通過可能

### Partition

- `Graphics` で毎フレーム描画
- 閉: 全壁描画
- 開: 上下壁 + 穴ブラケット（`#1AC878`）

## 6. シーン構成

- `PreloadScene`: 外部アセットなし、即ゲーム開始
- `GameScene`: 球更新、仕切り制御、HUD更新、タイマー処理
- `ResultScene`: 仕分け率とグレードを表示し、リトライ可能

## 7. 定数（src/config.ts）

- `GAME_W=680`
- `GAME_H=420`
- `UI_H=44`
- `PARTITION_X=340`
- `HOLE_SIZE=58`
- `BALL_RADIUS=7`
- `BALL_COUNT=11`（各タイプ）
- `TIME_LIMIT=60`

## 8. ビルド / 実行

```bash
npm install
npm run dev
npm run build
```

- `npm run build` は TypeScript 型検査 + Vite build
- 出力ディレクトリ: `dist/`

## 9. デプロイ（Vercel）

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## 10. 拡張候補

- パーティクル演出（通過時エフェクト）
- 速度に応じたトレイル
- ランキング（localStorage / BaaS）
- デモAI操作モード
