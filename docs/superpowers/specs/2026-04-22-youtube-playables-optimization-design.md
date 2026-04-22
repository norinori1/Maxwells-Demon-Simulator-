# YouTube Playables 最適化設計（Maxwell's Demon Simulator）

## 1. 背景と目的

- 対象: `https://gamedevjs.com/jam/2026/` の YouTube Playables チャレンジ向け調整
- 現状: Open Source / Phaser チャレンジ対応済み
- 目的: **見た目・演出を削らず**、Playables での初回ロード体験と実行時安定性を改善する

## 2. 要件と制約

1. 優先軸は「初回ロード速度・容量削減」
2. 演出削減はしない（音・パーティクル・UI演出は維持）
3. 切り替えは `?playables=1` の URL クエリで有効化
4. 通常モードの挙動は維持（後方互換）

## 3. 採用アプローチ（C案）

以下を **Playables モード時のみ** 適用する。

1. 毎フレームの生成物をプール/再利用し、GC負荷を抑制  
2. `update` 内の計算・描画更新を間引き/キャッシュ化  
3. 入力・オーディオ・可視性イベントの Playables 向け安全運用を追加

## 4. 設計詳細

### 4.1 ランタイムフラグ層

- 追加: `src/runtime/playables.ts`
- 役割:
  - `isPlayablesMode(): boolean` で `URLSearchParams` から `playables=1` を判定
  - 将来拡張用に `PlayablesConfig` を一元化（更新間隔や上限値など）
- 影響:
  - `main.ts` から参照可能にし、Scene 作成時に参照可能な設計へ統一

### 4.2 オブジェクト再利用（GameScene中心）

- 既存の一時生成箇所（例: 通過フラッシュ、浮遊スコア、open/close時 burst）を再利用化
- 追加方針:
  - `FxPool` 相当の軽量クラス（`src/scenes/fx/` 配下）を導入
  - 上限数を持つ ring buffer で使い回し
  - TTL 到達後に `destroy` ではなく `setVisible(false)` + 再初期化
- 目的:
  - 生成/破棄の頻度を下げ、短時間でのメモリ断片化とGC頻発を抑える

### 4.3 update最適化（挙動不変）

- 脅威評価・HUD更新を固定周期へ集約（例: 毎フレーム→16-33ms間隔）
- フレーム間で不変の値（hole範囲境界、速度係数）を局所キャッシュ
- 画面に見える出力は維持し、計算スケジューリングだけを変更

### 4.4 入力・オーディオのPlayables運用

- 入力:
  - `pointer`/`keyboard` の重複評価を整理し、1フレーム1回の集約判定へ
- オーディオ:
  - 同一SFXの短時間多重再生をレート制御（聴感は維持）
  - `visibilitychange` 連動で BGM の pause/resume を安全化（タブ遷移耐性）
- 目的:
  - Playables 埋め込み環境での不安定要因を減らす

### 4.5 ビルド最適化（容量・初回ロード）

- `vite.config.ts` で Playables 向け build 設定を追加（通常 build とは共存）
  - 例: `manualChunks` 見直し、`sourcemap` 無効化、不要メタデータ抑制
- デバッグ用途コードを `import.meta.env.DEV` ガード内へ集約
- 成果指標:
  - `dist` サイズ縮小
  - 初回実行までの時間短縮（同等回線前提の相対比較）

## 5. データフロー/責務

1. `main.ts` で Playables モードを判定
2. Scene が `PlayablesConfig` を参照して最適化分岐
3. `GameScene` は FX をプール経由で発火
4. HUD/脅威計算は定周期更新
5. 通常モードでは従来処理を維持

## 6. エラーハンドリング

- クエリ判定失敗時は通常モードにフォールバック（例外を投げない）
- `localStorage`/audio は既存方針を維持し、失敗時もプレイ進行は継続
- プール枯渇時は「最古を再利用」で無停止運用

## 7. 検証方針

1. `npm run build` 成功
2. 通常モード（クエリなし）で現行挙動同等
3. Playables モード（`?playables=1`）で:
   - 演出差分が目視でほぼないこと
   - 連続プレイ時のフレーム落ち/引っかかりが減ること
   - 生成物の急増が抑えられていること

## 8. スコープ外

- ゲームルール・難易度・スコア仕様の変更
- UIデザイン刷新
- サウンドアセット差し替え

## 9. 実装順序（要約）

1. Playables 判定基盤の追加
2. FXプール導入と GameScene 統合
3. update 周期最適化
4. 入力/音声の安定化
5. ビルド最適化
6. 通常/Playables 2系統の回帰確認
