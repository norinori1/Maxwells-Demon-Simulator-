---
doc_type: implementation_spec
target: Maxwell's Demon Simulator
scope: TitleScene (new) / ResultScene (overhaul)
version: 1.0
date: 2026-04-20
audience: implementing AI agent (Phaser 3 + TypeScript)
---

# Title & Result Scene — Implementation Specification

> **MXD-001 Thermodynamic Sorting Unit / Operator Console Build**
> 本仕様書は、Maxwell's Demon Simulator に「立派なタイトル画面」と「強化版リザルト画面」を実装するための完全な指示書である。実装担当 AI は本書を単独の情報源として扱い、独自拡張を行う前に本仕様との整合性を確認すること。

---

## 0. Executive Summary

| 項目 | 内容 |
| --- | --- |
| 追加シーン | `TitleScene`（新規） |
| 改修シーン | `ResultScene`（既存を段階的に強化） |
| テーマ | *Retro-Futuristic Laboratory Console* — 計器ダッシュボード / CRT ターミナル風 |
| 目的 | ゲームのブランド感確立、導入の演出強化、リザルトの「実験レポート化」 |
| 制約 | フレームワーク・言語・解像度・カラーパレットは既存に揃える |

**NON-GOALS**（本書では扱わない）:
- ゲームプレイロジック（`GameScene` / `Ball` / `Partition`）の変更
- 物理挙動、速度定数、時間制限の調整
- 音声ファイルの新規追加（既存キーの再利用のみ）
- ハイスコア永続化以外のセーブデータ（設定保存は任意）

---

## 1. Project Context（既存コードベースの前提）

実装担当 AI は作業前に以下ファイルを読むこと:

| ファイル | 役割 |
| --- | --- |
| `src/main.ts` | Phaser ゲーム構築 / シーン登録順 |
| `src/config.ts` | 解像度・色・速度など全定数 |
| `src/scenes/PreloadScene.ts` | アセット読込と起動シーン遷移 |
| `src/scenes/GameScene.ts` | プレイシーン（手を加えない） |
| `src/scenes/ResultScene.ts` | 既存リザルト（本仕様で強化） |
| `src/ui/HUD.ts` | 既存 UI スタイル参考 |
| `SPECIFICATION.md` | 全体仕様（ゲームルール） |

### 1.1 画面サイズ / 座標系

```
GAME_W = 680  / GAME_H = 420
原点左上、Y 下方向
UI_H = 44（プレイ時のみ使用。Title/Result では全画面扱い）
```

### 1.2 既存カラーパレット（`config.ts` と ResultScene から抽出）

| 役割 | 名称 | Hex | 用途 |
| --- | --- | --- | --- |
| Background Deep | `COLOR_BG` | `#080D1A` | 画面全体の最背面 |
| Panel Fill | — | `#0E1A2E` | 計器パネル地 |
| Panel Border Dim | `COLOR_PANEL_BORDER` | `#1E3A5F` | 枠線（非強調） |
| Panel Border Active | — | `#1C2E44` | ボーダー通常 |
| Accent Cyan | `COLOR_HOLE` | `#00E5CC` | 主要強調・ホバー・成功 |
| Accent Amber | `COLOR_AMBER` | `#FF8C00` | 警告・注意喚起 |
| Hot Chamber | `COLOR_HOT` | `#FF6B35` | 右側粒子・Hot 表示 |
| Cold Chamber | `COLOR_COLD` | `#00BFFF` | 左側粒子・Cold 表示 |
| Text Primary | — | `#E6F1FF` | 見出し本文 |
| Text Secondary | — | `#4A6FA8` | キャプション |
| Grid Line | `COLOR_GRID` | `#101A2E` | ドットグリッド |
| Gold (S-Rank) | — | `#FFD700` | S グレードのみ |

**厳守**: 上記以外の色を新規導入しないこと。新色が必要な場合は必ず `config.ts` に定数として追加し、本書の表に追記した上で使用する。

### 1.3 フォント

すべて **monospace** 指定で統一。サイズ規約:

| 用途 | サイズ |
| --- | --- |
| Hero Title | 48px（タイトル画面のみ） |
| Section Heading | 14px |
| Body | 11–12px |
| Caption / Helper | 10px |
| Large Metric | 56–72px |

---

## 2. TitleScene — 新規実装

### 2.1 シーン識別

- **Scene Key**: `'TitleScene'`
- **ファイル**: `src/scenes/TitleScene.ts`（新規作成）
- **遷移元**: `PreloadScene`（`start('GameScene')` → `start('TitleScene')` に変更）
- **遷移先**: `GameScene`（スタート時）、オプションで `HowToPlay` オーバーレイ（同一シーン内表示）

### 2.2 コンセプト

> 「1967 年の極秘研究施設に配属された新任オペレーターが、MXD-001 起動端末に座った瞬間」
> — CRT の走査線、電源投入シーケンス、計器の針振れを模した *ブート演出* を 1.2 秒で完結させる。

### 2.3 レイアウト（680×420）

```
 ┌──────────────────────────────────────────────────────────────┐
 │ ░ scanlines overlay (alpha 0.04)                            │
 │                                                              │
 │   ┌────────────────────────────────────────────────────┐    │
 │   │ [TL] MXD-001 · THERMODYNAMIC SORTING UNIT          │    │
 │   │ [TR] STATUS: ONLINE ● (pulse)                       │    │
 │   └────────────────────────────────────────────────────┘    │
 │                                                              │
 │              M A X W E L L ' S   D E M O N                   │
 │                      S I M U L A T O R                       │
 │              ───────────────────────────────                 │
 │              v1.0 · OPERATOR CONSOLE BUILD                   │
 │                                                              │
 │                  ┌──────────────────────┐                    │
 │                  │   [ INITIATE  RUN ]  │ ← primary CTA      │
 │                  └──────────────────────┘                    │
 │                  ┌──────────────────────┐                    │
 │                  │   [ BRIEFING ]       │ ← how-to           │
 │                  └──────────────────────┘                    │
 │                                                              │
 │   ┌─ DIAGNOSTICS ─────────────────────────────────────┐     │
 │   │ CHAMBER TEMP Δ:  ████████░░ 72%  NOMINAL         │     │
 │   │ ENTROPY FLUX:    ██████░░░░ 61%  STABLE          │     │
 │   │ DEMON LINK:      ██████████ ONLINE               │     │
 │   └───────────────────────────────────────────────────┘     │
 │                                                              │
 │ [BL] © 1967 NORINORI LABS      [BR] PRESS [ENTER] TO START  │
 └──────────────────────────────────────────────────────────────┘
```

座標指定（中央揃え基準、`cx = 340, cy = 210`）:

| 要素 | 位置 | サイズ / 備考 |
| --- | --- | --- |
| Scanlines overlay | 全画面 | `Graphics` に 2px 横線を 4px 間隔で `alpha=0.04` |
| Top bar label（左） | `(20, 18)` | 11px, `#4A6FA8` |
| Status indicator（右） | `(GAME_W-20, 18)` origin(1,0) | 11px, `#00E5CC`、●は 0.9 秒周期で alpha 1→0.3 脈動 |
| Hero Title Line 1 | `(cx, cy-70)` | 36px, `#E6F1FF`, letter-spacing 風に文字間スペース |
| Hero Title Line 2 | `(cx, cy-30)` | 36px, `#E6F1FF` |
| Separator | `(cx, cy+2)` | `─` ×32, `#1E3A5F`, 10px |
| Version Line | `(cx, cy+18)` | 11px, `#4A6FA8` |
| Primary CTA | `(cx, cy+60)` | 220×36, 枠線 `#00E5CC` / ホバー時二重枠 |
| Secondary CTA | `(cx, cy+104)` | 220×32, 枠線 `#1C2E44`（控えめ） |
| Diagnostics Panel | `(40, cy+152) – (GAME_W-40, GAME_H-40)` | 角は 4px ストローク矩形、内側に 3 行の疑似メータ |
| Footer L | `(20, GAME_H-14)` | 10px, `#4A6FA8` |
| Footer R | `(GAME_W-20, GAME_H-14)` origin(1,0) | 10px, `#00E5CC`、0.6 秒周期点滅 |

> **装飾禁止事項**: ネオン系の派手なグロー、ドロップシャドウ多重、カラフルなグラデーションは使わない。Phaser の `PostFX` は本画面では導入しない。*抑制されたクール* を最優先する。

### 2.4 ブート演出（create 時、合計 1200ms）

タイムライン（全て `this.tweens` で制御）:

| t (ms) | イベント |
| --- | --- |
| 0 | 画面全体黒、`SYSTEM BOOT...` テキスト中央に瞬間表示 |
| 0–150 | scanlines overlay を `alpha 0 → 0.04` |
| 150 | `SYSTEM BOOT` を消去し、`[1/3] LINKING DEMON...` に差替え（10px, `#4A6FA8`） |
| 300 | `[2/3] CALIBRATING CHAMBERS...` |
| 500 | `[3/3] READY.` を `#00E5CC` で表示 |
| 700 | ブートログ消去 → タイトル本体要素を `alpha 0→1` で 200ms フェード |
| 700–1100 | Diagnostics Panel のメーターを `tweens.addCounter` で 0 → 目標値までスイープ |
| 1000 | CTA ボタン群 `alpha 0→1` |
| 1200 | 入力受付開始（それ以前の入力は無視） |

演出スキップ: ユーザーが 1200ms 以内に任意のキー or クリックを行った場合は、即座に完了状態へジャンプ（全要素 `alpha=1`、メーター値 = 目標値、入力受付開始）。

### 2.5 インタラクション

| 操作 | 結果 |
| --- | --- |
| `INITIATE RUN` クリック / タップ | `this.scene.start('GameScene')` |
| `BRIEFING` クリック / タップ | 同シーン内で `showBriefingOverlay()`（§2.6） |
| `ENTER` / `SPACE` キー | INITIATE RUN と同等 |
| `H` キー | BRIEFING と同等 |
| `Esc`（ブリーフィング表示中） | オーバーレイを閉じる |

- ホバー時: ボタン枠線を `#00E5CC` に、テキストを `#4A6FA8 → #00E5CC`、外側に 2px オフセットの二重枠を描画（既存 ResultScene の `drawBtn` パターンを踏襲）
- 連打防止: シーン遷移を 1 度だけ行うため `this.input.enabled = false` を遷移直前に設定

### 2.6 BRIEFING Overlay

タイトル画面上に半透明パネルを重ねる（別シーンにはしない）。

- 背景: `#080D1A` を `alpha 0.92` で全画面
- パネル: `cx±260, cy±140` の矩形、枠 `#1E3A5F`
- 内容（モノスペース、行間 18px）:

```
OPERATOR BRIEFING ─────────────────────────

OBJECTIVE
  Sort hot particles → RIGHT chamber
  Sort cold particles → LEFT chamber

CONTROLS
  HOLD    mouse / touch      open valve
  MOVE    pointer vertical   aim aperture
  RELEASE                    seal valve

TIME LIMIT   60.0 s
GRADES       S ≥80%   A ≥60%   B ≥40%   C <40%

[ CLOSE ] (ESC)
```

- フェード: `alpha 0 → 1` 180ms
- `CLOSE` ボタンは既存スタイルに合わせる

### 2.7 BGM / SFX

| トリガ | キー | 備考 |
| --- | --- | --- |
| シーン開始 | `bgm_title`（任意） | キャッシュに無ければ無音で続行（既存の `tryPlay` パターン） |
| CTA hover | `se_valve_open` | volume 0.3 |
| CTA click | `se_valve_close` | volume 0.6 |
| BRIEFING 開閉 | `se_valve_open` / `se_valve_close` | 同上 |

> **重要**: `PreloadScene` に `bgm_title` の `tryLoad` 行を 1 行追加するのみで新アセット追加は不要。ファイル不在時は無音で動作する既存挙動を継承する。

### 2.8 PreloadScene との接続

`PreloadScene.create()` の `this.scene.start('GameScene')` を `this.scene.start('TitleScene')` に書き換える。`main.ts` のシーン配列に `TitleScene` を `PreloadScene` の直後に挿入する。

```ts
// main.ts
scene: [PreloadScene, TitleScene, GameScene, ResultScene],
```

---

## 3. ResultScene — 強化仕様

既存 `src/scenes/ResultScene.ts` をベースに、以下の拡張を段階的に重ねる。**既存の DOM 構造・アニメーション順序は極力維持**し、追加要素は後段の tween に追記する形を取ること。

### 3.1 追加入力データ

`ResultData` を拡張する:

```ts
interface ResultData {
  sorted: number;        // 既存
  total: number;         // 既存
  hotSorted: number;     // 追加：右チャンバー内の Hot 数
  coldSorted: number;    // 追加：左チャンバー内の Cold 数
  valveOpenMs: number;   // 追加：バルブ累積開放時間（ms）
  maxStreak: number;     // 追加：連続正解の最大数（任意、未計測なら 0）
  bestPct: number;       // 追加：ベスト仕分け率（localStorage）
}
```

> `GameScene` 側の計測追加は担当 AI の責務だが、**未対応フィールドは安全なデフォルト**（0）で動作する実装にすること（既存呼び出し互換）。

### 3.2 レポート構成の再設計

既存の 1 画面完結を活かしつつ、情報密度を上げる。

```
 ┌──────────────────────────────────────────────────────────────┐
 │ MXD-001 · RUN REPORT                     TIMESTAMP: 60.0s    │
 │ ────────────────────────────────────────────────────────────│
 │                                                              │
 │                 EFFICIENCY RATING                            │
 │                                                              │
 │                       [  S  ]        ← 72px                  │
 │                                                              │
 │          SORT ACCURACY  ████████░░  82%                      │
 │          ( 18 / 22 )                                         │
 │                                                              │
 │ ┌─ TELEMETRY ────────────────────────────────────────────┐   │
 │ │  HOT   correct:  9 / 11     ████████░░                │   │
 │ │  COLD  correct:  9 / 11     ████████░░                │   │
 │ │  VALVE uptime:   24.3 s     ████░░░░░░   40%          │   │
 │ │  BEST STREAK:    7                                    │   │
 │ └───────────────────────────────────────────────────────┘   │
 │                                                              │
 │   STATUS: 第二法則に明確に違反                               │
 │   PERSONAL BEST ★ NEW RECORD（該当時のみ）                  │
 │                                                              │
 │    [ REINITIALIZE ]    [ RETURN TO TITLE ]                   │
 └──────────────────────────────────────────────────────────────┘
```

### 3.3 要素別仕様

#### 3.3.1 ヘッダ強化
- 左上: `MXD-001 · RUN REPORT`（既存 SYSTEM DIAGNOSTIC REPORT を置換）
- 右上: `TIMESTAMP: 60.0s`（プレイ時間固定表示、今後可変対応を見越して文字列化）
- フォント: 12px, 左は `#00E5CC`, 右は `#4A6FA8`

#### 3.3.2 グレード表示
- 既存の `[ S ]` スケールアニメーションを維持（400ms delay → scale 1.2 → 1.0）
- **追加**: グレードが S の場合のみ、文字背面に `COLOR_AMBER` で 120×120 の菱形（回転 45°）を `alpha 0.15` で配置、ゆるく 4 秒周期で `alpha 0.1↔0.2` パルス

#### 3.3.3 Accuracy Bar
- 既存の 200×8 バーを 240×10 に拡大、位置 `(cx-120, cy+30)`
- バー両端に 2px のキャップ線（`#1C2E44`）を追加
- バー色: 既存 `#00E5CC` を維持。ただし 40% 未満の場合のみ `#FF6B35` に切替

#### 3.3.4 Telemetry Panel（新規）
- 位置: `(cx-200, cy+70)` から幅 400 / 高さ 110 の矩形
- 枠: `#1E3A5F` 1px / 角装飾としてコーナー内側 8px ずつ `#00E5CC` を描画（計器枠風）
- 内部 4 行、行間 20px、左マージン 16px
  1. `HOT   correct: {hot}/{hotTotal}` + 100px ミニバー
  2. `COLD  correct: {cold}/{coldTotal}` + 100px ミニバー
  3. `VALVE uptime:  {sec}s` + 100px ミニバー（uptime / 60s を比率に）
  4. `BEST STREAK:   {n}`
- 各行フェードイン: delay 1000ms から 80ms 間隔で順次
- ミニバー sweep: 各行 fade-in 完了と同時に 500ms カウントアップ

#### 3.3.5 Personal Best 表示
- `localStorage.getItem('mxd_best_pct')` と現スコアを比較
- 更新時のみ `PERSONAL BEST ★ NEW RECORD` を `COLOR_AMBER` で表示、400ms 周期で点滅 2 回 → 静止
- 更新時は `localStorage.setItem('mxd_best_pct', String(pct))` を行う
- 非更新時: `PERSONAL BEST: {bestPct}%` を `#4A6FA8` で控えめに表示

#### 3.3.6 ボタン群
- 既存 `[ REINITIALIZE ]` を左、`[ RETURN TO TITLE ]` を右の 2 個並びに拡張
- 左ボタン: `this.scene.start('GameScene')`（現行挙動維持）
- 右ボタン: `this.scene.start('TitleScene')`
- キーボード: `ENTER`/`SPACE` → REINITIALIZE, `T` → RETURN TO TITLE, `ESC` → RETURN TO TITLE

### 3.4 演出タイムライン（合計 1400ms）

| t (ms) | 要素 |
| --- | --- |
| 0 | 背景 overlay `alpha 0 → 0.97` (既存) |
| 100 | ヘッダ 2 行 fade-in |
| 200 | セパレータ上 fade-in |
| 300 | EFFICIENCY RATING ラベル |
| 400 | GRADE スケールイン（既存） |
| 500 | Accuracy Bar fade-in |
| 600 | Accuracy カウントアップ 1200ms |
| 800 | STATUS ライン fade-in |
| 900 | セパレータ下 fade-in |
| 1000 | Telemetry パネル枠 fade-in |
| 1080 / 1160 / 1240 / 1320 | Telemetry 各行順次 fade-in + バー sweep |
| 1400 | Personal Best / CTA ボタン fade-in |

### 3.5 スキップ
- 1400ms 経過前の任意入力: 全 tween を `stop()` → 全要素 `alpha=1` / 目標値へジャンプ（TitleScene と同じスキップ規約）

### 3.6 SFX 追加
| トリガ | キー |
| --- | --- |
| グレード表示（スケールイン完了） | `se_valve_close`（volume 0.7） |
| カウントアップ完了 | `se_ball_pass`（volume 0.4） |
| NEW RECORD 点滅 | `se_warning`（volume 0.5） |

---

## 4. GameScene 側の最小変更（依存）

本仕様の範囲では GameScene のロジックは変更しないが、計測値を ResultScene に渡すため以下のみ追加する:

1. `GameScene` クラスに以下フィールドを追加:
   ```ts
   private valveOpenMs = 0;
   private hotSorted = 0;
   private coldSorted = 0;
   private currentStreak = 0;
   private maxStreak = 0;
   ```
2. `update(time, delta)` で穴が開いている時 `valveOpenMs += delta` を加算
3. ボールが仕切りを通過した瞬間（既存の通過判定箇所）で、正解なら `currentStreak++; maxStreak = Math.max(...)`、不正解なら `currentStreak = 0`
4. タイムアップ時の既存 `scene.start('ResultScene', {...})` に新フィールドを添える
5. ベストスコアは ResultScene 側で `localStorage` を読むため、`bestPct` は ResultScene 内で取得 / 更新。GameScene からは渡さなくてよい

> **重要**: 既存の球数計測ロジック（`sorted` / `total`）には触れない。追加計測は新規フィールドのみ。

---

## 5. 実装順序（推奨）

1. `src/scenes/TitleScene.ts` を新規作成し、静的レイアウトのみ実装（アニメーション無し）
2. `PreloadScene` / `main.ts` を書き換え、Title → Game 遷移を確認
3. TitleScene にブート演出を追加、スキップ挙動検証
4. BRIEFING オーバーレイを実装
5. `GameScene` に計測フィールド追加 → ResultScene へ渡す
6. `ResultScene` の ResultData を拡張、Telemetry Panel を追加
7. Personal Best（localStorage）導入
8. ResultScene の CTA を 2 ボタンに拡張し TitleScene 戻り動線を接続
9. SFX 接続 / スキップ挙動統一
10. 全解像度（スマホ縦, 1920×1080, 1366×768）でレイアウトが破綻しないか確認（`main.ts` の Scale.FIT で自動対応されるはずだが、相対座標を使い絶対配置を避けない）

---

## 6. コーディング規約（厳守）

- **TypeScript strict**: `any` 禁止、`Phaser.Tweens.Tween` 等の型を明示
- **依存追加不可**: 新規 npm パッケージは追加しない
- **マジックナンバー排除**: タイミング・座標・色はすべて定数化、再利用される値は `config.ts` にエクスポート
- **既存命名の踏襲**: `drawBtn`, `tryPlay` などの既存パターンに合わせる
- **シーン間状態**: `scene.start(key, data)` 以外の共有を作らない（シングルトン・グローバル禁止）
- **副作用**: `localStorage` アクセスは ResultScene 内の `loadBest()` / `saveBest()` に閉じ込め、`try/catch` で例外を飲み込む（Safari プライベートモード対策）
- **コメント**: ファイル冒頭に 1 行の役割コメント。関数コメントは必要最低限
- **リンタ / ビルド**: 実装完了時点で `npm run build`（Vite）および型チェックが緑であること

---

## 7. 受け入れ基準（Acceptance Criteria）

実装担当 AI は以下すべてを満たして提出すること:

- [ ] `npm run dev` 起動後、`TitleScene` がブート演出後に表示される
- [ ] タイトルから ENTER / クリックで `GameScene` が開始する
- [ ] BRIEFING オーバーレイが開閉でき、ESC で閉じられる
- [ ] ゲーム終了後 `ResultScene` が表示され、Telemetry の 4 メトリクスが全て数値表示される
- [ ] S ランク達成時、背面の菱形パルスが描画される
- [ ] Personal Best が localStorage に保存され、再プレイで参照される
- [ ] `REINITIALIZE` で GameScene に戻り、`RETURN TO TITLE` で TitleScene に戻る
- [ ] 音声ファイル不在でも例外なく動作する
- [ ] スマホ縦画面（360×640 相当）でレイアウトが崩れない
- [ ] 型チェック / ビルドが全て成功する
- [ ] 本仕様書に記載のない新色・新フォント・新アセットが追加されていない

---

## 8. Open Questions（実装時に判断してよい）

以下は裁量事項。既存美学を損なわない範囲で担当 AI が決定して良い:

1. ブート演出中のログ行の正確な文言（トーンは『抑制された計装英語』）
2. Diagnostics Panel のメーター目標値（見栄えのため適当な 60–85% の範囲で固定可）
3. Telemetry Panel の左右ミニバー長（±20px の範囲で微調整可）
4. `localStorage` キー名は `mxd_best_pct` を推奨。名前空間衝突を避けるため変更可

---

## 9. 付録：視覚リファレンス（ASCII モックアップ早見表）

### TitleScene（完成状態）
```
════════════════════════════════════════════════
 MXD-001 · THERMODYNAMIC SORTING UNIT   ● ONLINE
------------------------------------------------

           M A X W E L L ' S   D E M O N
                  S I M U L A T O R
          ─────────────────────────────
          v1.0 · OPERATOR CONSOLE BUILD

              ┌──────────────────┐
              │ [ INITIATE RUN ] │
              └──────────────────┘
              ┌──────────────────┐
              │   [ BRIEFING ]   │
              └──────────────────┘

  ┌─ DIAGNOSTICS ────────────────────────┐
  │ CHAMBER Δ   ████████░░ 72% NOMINAL  │
  │ ENTROPY     ██████░░░░ 61% STABLE   │
  │ DEMON LINK  ██████████ ONLINE       │
  └──────────────────────────────────────┘

 © 1967 NORINORI LABS        PRESS [ENTER]
════════════════════════════════════════════════
```

### ResultScene（S ランク時）
```
════════════════════════════════════════════════
 MXD-001 · RUN REPORT              TIMESTAMP: 60.0s
────────────────────────────────────────────────

                 EFFICIENCY RATING

                      [  S  ]

           SORT ACCURACY  ████████░░ 82%
           ( 18 / 22 )

  ┌─ TELEMETRY ──────────────────────────┐
  │ HOT   correct   9 / 11  ████████░░  │
  │ COLD  correct   9 / 11  ████████░░  │
  │ VALVE uptime   24.3 s   ████░░░░░░  │
  │ BEST STREAK     7                   │
  └──────────────────────────────────────┘

    STATUS: 第二法則に明確に違反
    ★ NEW RECORD

    [ REINITIALIZE ]    [ RETURN TO TITLE ]
════════════════════════════════════════════════
```

---

**END OF SPEC** — 本書は実装担当 AI への単独情報源であり、差異が見つかった場合は本書を優先すること。仕様の解釈に迷った場合のみ、既存コードの慣習と §1.2 のカラーパレットに従って判断し、独断による新規意匠の導入は避けること。
