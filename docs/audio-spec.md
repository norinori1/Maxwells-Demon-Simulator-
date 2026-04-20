# 音声仕様書 — Maxwell's Demon Simulator

## 概要

Phaser 3 の `Sound Manager` を使用したゲーム内音声システム。  
すべての音声ファイルはオプション扱いであり、**ファイルが存在しない場合もエラーなく動作する**。

---

## ファイル一覧

配置先: `public/sounds/`

| キー | ファイル名 | 種別 | ループ | 推奨音量 | 用途 |
|------|-----------|------|--------|---------|------|
| `bgm_game` | `bgm_game.ogg` | BGM | ✓ | 0.5 | ゲームプレイ中のBGM |
| `bgm_result` | `bgm_result.ogg` | BGM | ✓ | 0.45 | リザルト画面のBGM |
| `se_valve_open` | `se_valve_open.wav` | SE | ✗ | 0.6 | バルブ（ホール）開放時 |
| `se_valve_close` | `se_valve_close.wav` | SE | ✗ | 0.5 | バルブ（ホール）閉鎖時 |
| `se_ball_pass` | `se_ball_pass.wav` | SE | ✗ | 0.4 | ボールが穴を通過した瞬間 |
| `se_warning` | `se_warning.wav` | SE | ✗ | 0.7 | 残り10秒警告（1回のみ） |

### 対応フォーマット

Phaser 3 は複数フォーマットの自動フォールバックに対応している。  
BGM は圧縮率の高い `.ogg` を推奨。SE は遅延の少ない `.wav` を推奨。

---

## 再生トリガー仕様

### BGM

| イベント | 動作 |
|---------|------|
| `GameScene.create()` | `bgm_game` をループ再生開始 |
| `GameScene.endGame()` | `bgm_game` を停止 |
| `ResultScene.create()` | `bgm_result` をループ再生開始 |
| REINITIALIZE ボタン押下 / Enter / Space | `sound.stopAll()` → `GameScene` 遷移 |

### SE

| イベント | キー | 条件 |
|---------|------|------|
| マウスボタン押下（前フレームが未押下） | `se_valve_open` | `holeOpen && !prevHoleOpen` |
| マウスボタン解放（前フレームが押下中） | `se_valve_close` | `!holeOpen && prevHoleOpen` |
| ボールがパーティションの穴を通過 | `se_ball_pass` | `ball.justPassed === true` |
| タイマーが初めて10秒を下回った | `se_warning` | `timeLeft < 10 && !warningSounded`（フラグで1回のみ） |

---

## 実装詳細

### ロード（`PreloadScene.ts`）

```typescript
// ファイルが存在しない場合も Phaser はエラーをログに出すが処理は継続する
this.load.audio('bgm_game',       'sounds/bgm_game.ogg');
this.load.audio('bgm_result',     'sounds/bgm_result.ogg');
this.load.audio('se_valve_open',  'sounds/se_valve_open.wav');
this.load.audio('se_valve_close', 'sounds/se_valve_close.wav');
this.load.audio('se_ball_pass',   'sounds/se_ball_pass.wav');
this.load.audio('se_warning',     'sounds/se_warning.wav');
```

### 安全な再生ヘルパー（`GameScene.ts`）

```typescript
function tryPlay(scene: Phaser.Scene, key: string, config?: SoundConfig) {
  if (scene.cache.audio.has(key)) {
    scene.sound.play(key, config);
  }
}
```

`cache.audio.has()` で存在確認してから再生するため、ファイル未配置時も無音で動作する。

### BGM 管理（`GameScene.ts`）

```typescript
// 再生
this.bgm = this.sound.add('bgm_game', { loop: true, volume: 0.5 });
this.bgm.play();

// 停止（シーン遷移前）
this.bgm?.stop();
```

---

## 素材選定ガイド

### BGM (`bgm_game.ogg`)

- **雰囲気**: テクノ / エレクトロ / アンビエント
- **テンポ**: 中程度（80〜120 BPM）。速すぎると焦燥感が強くなりすぎる
- **ループ**: イントロなしのシームレスループが望ましい
- **長さ**: 30秒〜3分（ループするため長さは問わない）
- **推奨サイト**: 魔王魂 > ループ音楽 > テクノ・エレクトロ

### BGM (`bgm_result.ogg`)

- **雰囲気**: 達成感 / 静けさ / 実験終了
- **長さ**: 15秒〜1分程度のジングルでも可
- **推奨サイト**: 魔王魂 > ループ音楽 or ジングル

### SE (`se_valve_open.wav` / `se_valve_close.wav`)

- **イメージ**: 金属的な開閉音、バルブ・スイッチ・ゲート
- **長さ**: 0.1〜0.5秒
- **推奨サイト**: 効果音ラボ > 機械・ボタン・スイッチ系

### SE (`se_ball_pass.wav`)

- **イメージ**: 粒子が通過する軽い音。ポップ・ピコ・ウィスパー系
- **長さ**: 0.05〜0.2秒（連続して鳴るため短くすること）
- **注意**: 連続再生されるため、長い音やリバーブの深い音は避ける
- **推奨サイト**: 効果音ラボ > ポップ・ピコ・決定音系

### SE (`se_warning.wav`)

- **イメージ**: アラーム・カウントダウン・警告ビープ
- **長さ**: 0.5〜2秒
- **推奨サイト**: 効果音ラボ > アラーム・ビープ・警告系

---

## 音量バランス

| レイヤー | 音量値 | 備考 |
|---------|--------|------|
| BGM | 0.45〜0.5 | SEが聞こえる余白を確保 |
| SE（バルブ） | 0.5〜0.6 | 操作フィードバックとして明確に聞こえること |
| SE（通過） | 0.4 | 頻繁に鳴るため控えめに |
| SE（警告） | 0.7 | 1回のみで緊急性を伝える |

音量は `tryPlay(this, key, { volume: X })` の第3引数で調整可能。

---

## ファイル追加手順

1. 配布サイトで利用規約を確認し、ゲームジャム提出への使用が許諾されていることを確認する
2. ファイルを上記のファイル名にリネームする
3. `public/sounds/` に配置する
4. `npm run dev` でブラウザをリロードすれば即時反映される（再ビルド不要）

---

## 利用規約について

使用する素材の配布サイトごとに利用規約が異なる。ゲームジャム提出前に以下を確認すること。

- クレジット表記が必要か（必要な場合はゲーム画面またはREADMEに記載）
- 商用利用の可否（ゲームジャムの賞金有無による）
- 再配布・改変の可否
