// Result screen scene that renders the run report, telemetry, and restart/title actions.
import Phaser from 'phaser';
import { GAME_W, GAME_H, COLOR_AMBER } from '../config';

const BEST_KEY = 'mxd_best_pct';
const PANEL_FILL = 0x0E1A2E;
const PANEL_BORDER_ACTIVE = 0x1C2E44;
const SEP = '─'.repeat(58);

interface ResultData {
  sorted?: number;
  total?: number;
  hotSorted?: number;
  coldSorted?: number;
  valveOpenMs?: number;
  maxStreak?: number;
  bestPct?: number;
}

interface GradeInfo {
  grade: string;
  color: string;
  desc: string;
}

function getGrade(pct: number): GradeInfo {
  if (pct >= 80) return { grade: 'S', color: '#FFD700', desc: '第二法則に明確に違反' };
  if (pct >= 60) return { grade: 'A', color: '#00E5CC', desc: '優秀な悪魔' };
  if (pct >= 40) return { grade: 'B', color: '#00BFFF', desc: '平均的なプレイ' };
  return { grade: 'C', color: '#FF6B35', desc: '改善の余地あり' };
}

function tryPlay(scene: Phaser.Scene, key: string, config?: Phaser.Types.Sound.SoundConfig) {
  if (scene.cache.audio.has(key)) {
    scene.sound.play(key, config);
  }
}

export class ResultScene extends Phaser.Scene {
  private allTweens: Phaser.Tweens.Tween[] = [];
  private isComplete = false;
  private isTransitioning = false;
  private inputUnlockAt = Number.POSITIVE_INFINITY;

  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data: ResultData) {
    const sorted = data.sorted ?? 0;
    const total = data.total ?? 0;
    const hotSorted = data.hotSorted ?? 0;
    const coldSorted = data.coldSorted ?? 0;
    const valveOpenMs = data.valveOpenMs ?? 0;
    const maxStreak = data.maxStreak ?? 0;
    const hotTotal = Math.max(0, Math.floor(total / 2));
    const coldTotal = Math.max(0, total - hotTotal);
    const pct = total > 0 ? Math.round((sorted / total) * 100) : 0;
    const { grade, color, desc } = getGrade(pct);
    const cx = GAME_W / 2;
    const cy = GAME_H / 2;

    if (this.cache.audio.has('bgm_result')) {
      this.sound.add('bgm_result', { loop: true, volume: 0.45 }).play();
    }

    const previousBest = Math.max(data.bestPct ?? 0, this.loadBest());
    const isNewBest = pct > previousBest;
    const bestForDisplay = isNewBest ? pct : previousBest;
    if (isNewBest) {
      this.saveBest(pct);
    }

    const elements: Phaser.GameObjects.GameObject[] = [];

    const bg = this.add.graphics();
    bg.fillStyle(0x080D1A, 0);
    bg.fillRect(0, 0, GAME_W, GAME_H);
    this.tween(bg, { fillAlpha: 0.97 }, 300);

    const headerL = this.add.text(20, cy - 156, 'MXD-001 · RUN REPORT', {
      fontSize: '12px', color: '#00E5CC', fontFamily: 'monospace',
    }).setAlpha(0);
    const headerR = this.add.text(GAME_W - 20, cy - 156, 'TIMESTAMP: 60.0s', {
      fontSize: '12px', color: '#4A6FA8', fontFamily: 'monospace',
    }).setOrigin(1, 0).setAlpha(0);
    const sep1 = this.add.text(cx, cy - 138, SEP, {
      fontSize: '10px', color: '#1C2E44', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);
    const effLabel = this.add.text(cx, cy - 94, 'EFFICIENCY RATING', {
      fontSize: '14px', color: '#4A6FA8', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    const sDiamond = this.add.rectangle(cx, cy - 25, 120, 120, COLOR_AMBER, grade === 'S' ? 0.15 : 0)
      .setRotation(Math.PI / 4)
      .setVisible(grade === 'S')
      .setAlpha(0);
    const gradeText = this.add.text(cx, cy - 25, `[ ${grade} ]`, {
      fontSize: '72px', color, fontFamily: 'monospace',
    }).setOrigin(0.5).setScale(0).setAlpha(0);

    const barY = cy + 28;
    const barX = cx - 120;
    const barW = 240;
    const barH = 10;
    const accuracyBg = this.add.graphics().setAlpha(0);
    accuracyBg.fillStyle(PANEL_FILL);
    accuracyBg.fillRect(barX, barY, barW, barH);
    accuracyBg.lineStyle(1, PANEL_BORDER_ACTIVE);
    accuracyBg.strokeRect(barX, barY, barW, barH);
    accuracyBg.lineBetween(barX - 2, barY - 2, barX - 2, barY + barH + 2);
    accuracyBg.lineBetween(barX + barW + 2, barY - 2, barX + barW + 2, barY + barH + 2);
    const accuracyBar = this.add.graphics().setAlpha(0);
    const accuracyLabel = this.add.text(cx, barY - 14, 'SORT ACCURACY  0%', {
      fontSize: '12px', color: '#00E5CC', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);
    const sortDetail = this.add.text(cx, barY + 14, `( ${sorted} / ${total} )`, {
      fontSize: '11px', color: '#4A6FA8', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    const telemetryX = cx - 200;
    const telemetryY = cy + 70;
    const telemetryW = 400;
    const telemetryH = 110;
    const telemetryFrame = this.add.graphics().setAlpha(0);
    telemetryFrame.fillStyle(PANEL_FILL);
    telemetryFrame.fillRect(telemetryX, telemetryY, telemetryW, telemetryH);
    telemetryFrame.lineStyle(1, 0x1E3A5F);
    telemetryFrame.strokeRect(telemetryX, telemetryY, telemetryW, telemetryH);
    telemetryFrame.lineStyle(1, 0x00E5CC);
    telemetryFrame.lineBetween(telemetryX + 1, telemetryY + 8, telemetryX + 1, telemetryY + 1);
    telemetryFrame.lineBetween(telemetryX + 8, telemetryY + 1, telemetryX + 1, telemetryY + 1);
    telemetryFrame.lineBetween(telemetryX + telemetryW - 9, telemetryY + 1, telemetryX + telemetryW - 1, telemetryY + 1);
    telemetryFrame.lineBetween(telemetryX + telemetryW - 1, telemetryY + 1, telemetryX + telemetryW - 1, telemetryY + 9);
    telemetryFrame.lineBetween(telemetryX + 1, telemetryY + telemetryH - 9, telemetryX + 1, telemetryY + telemetryH - 1);
    telemetryFrame.lineBetween(telemetryX + 1, telemetryY + telemetryH - 1, telemetryX + 9, telemetryY + telemetryH - 1);
    telemetryFrame.lineBetween(telemetryX + telemetryW - 9, telemetryY + telemetryH - 1, telemetryX + telemetryW - 1, telemetryY + telemetryH - 1);
    telemetryFrame.lineBetween(telemetryX + telemetryW - 1, telemetryY + telemetryH - 9, telemetryX + telemetryW - 1, telemetryY + telemetryH - 1);

    const valveSec = Math.round((valveOpenMs / 1000) * 10) / 10;
    const telemetryRows = [
      `HOT   correct: ${hotSorted.toString().padStart(2, ' ')} / ${hotTotal.toString().padStart(2, ' ')}`,
      `COLD  correct: ${coldSorted.toString().padStart(2, ' ')} / ${coldTotal.toString().padStart(2, ' ')}`,
      `VALVE uptime: ${valveSec.toFixed(1).padStart(5, ' ')} s`,
      `BEST STREAK: ${maxStreak}`,
    ];
    const telemetryTargets = [
      hotTotal > 0 ? (hotSorted / hotTotal) : 0,
      coldTotal > 0 ? (coldSorted / coldTotal) : 0,
      Math.min(1, valveOpenMs / 60000),
      0,
    ];
    const telemetryTexts: Phaser.GameObjects.Text[] = [];
    const telemetryBars: Phaser.GameObjects.Graphics[] = [];
    const telemetryBarStartX = telemetryX + 292;
    const telemetryBarW = 92;
    for (let i = 0; i < telemetryRows.length; i++) {
      const y = telemetryY + 14 + i * 20;
      const row = this.add.text(telemetryX + 16, y, telemetryRows[i], {
        fontSize: '11px', color: i === 3 ? '#E6F1FF' : '#4A6FA8', fontFamily: 'monospace',
      }).setAlpha(0);
      telemetryTexts.push(row);
      const bar = this.add.graphics().setAlpha(0);
      telemetryBars.push(bar);
    }

    const statusText = this.add.text(cx, cy + 190, `STATUS: ${desc}`, {
      fontSize: '13px', color, fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    const sep2 = this.add.text(cx, cy + 208, SEP, {
      fontSize: '10px', color: '#1C2E44', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    const bestText = this.add.text(cx, cy + 226, '', {
      fontSize: '11px',
      color: isNewBest ? '#FF8C00' : '#4A6FA8',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);
    bestText.setText(isNewBest ? 'PERSONAL BEST ★ NEW RECORD' : `PERSONAL BEST: ${bestForDisplay}%`);

    const reBtn = this.createButton(cx - 120, cy + 252, 200, 36, '[ REINITIALIZE ]', () => this.startGame());
    const titleBtn = this.createButton(cx + 120, cy + 252, 220, 36, '[ RETURN TO TITLE ]', () => this.startTitle());

    elements.push(
      headerL, headerR, sep1, effLabel, sDiamond, gradeText,
      accuracyBg, accuracyBar, accuracyLabel, sortDetail, telemetryFrame,
      ...telemetryTexts, ...telemetryBars, statusText, sep2, bestText,
      ...reBtn, ...titleBtn,
    );

    this.tween([headerL, headerR], { alpha: 1 }, 200, 100);
    this.tween(sep1, { alpha: 1 }, 150, 200);
    this.tween(effLabel, { alpha: 1 }, 150, 300);

    this.tween(gradeText, { alpha: 1, scaleX: 1.2, scaleY: 1.2 }, 250, 400, 0, false, () => {
      this.tween(gradeText, { scaleX: 1, scaleY: 1 }, 150);
      tryPlay(this, 'se_valve_close', { volume: 0.7 });
    });
    if (grade === 'S') {
      this.tween(sDiamond, { alpha: 0.15 }, 250, 400, 0, false, () => {
        this.tween(sDiamond, { alpha: 0.1 }, 2000, 0, -1, true);
      });
    }

    this.tween([accuracyBg, accuracyBar, accuracyLabel, sortDetail], { alpha: 1 }, 200, 500);
    this.tweenCounter(0, pct, 1200, 600, (v) => {
      const value = Math.round(v);
      const ratio = value / 100;
      accuracyBar.clear();
      accuracyBar.fillStyle(pct < 40 ? 0xFF6B35 : 0x00E5CC);
      accuracyBar.fillRect(barX, barY, barW * ratio, barH);
      accuracyLabel.setText(`SORT ACCURACY  ${value}%`);
    }, () => {
      tryPlay(this, 'se_ball_pass', { volume: 0.4 });
    });

    this.tween(statusText, { alpha: 1 }, 200, 800);
    this.tween(sep2, { alpha: 1 }, 150, 900);
    this.tween(telemetryFrame, { alpha: 1 }, 200, 1000);

    for (let i = 0; i < telemetryTexts.length; i++) {
      const delay = 1080 + i * 80;
      const txt = telemetryTexts[i];
      const bar = telemetryBars[i];
      this.tween([txt, bar], { alpha: 1 }, 160, delay);
      if (i < 3) {
        this.tweenCounter(0, telemetryTargets[i] * 100, 500, delay, (v) => {
          bar.clear();
          bar.fillStyle(0x1C2E44);
          bar.fillRect(telemetryBarStartX, telemetryY + 17 + i * 20, telemetryBarW, 5);
          bar.fillStyle(0x00E5CC);
          bar.fillRect(telemetryBarStartX, telemetryY + 17 + i * 20, telemetryBarW * (v / 100), 5);
          if (i === 2) {
            txt.setText(`${telemetryRows[i]}   ${Math.round(v)}%`);
          }
        });
      }
    }

    this.tween([bestText, ...reBtn, ...titleBtn], { alpha: 1 }, 200, 1400, 0, false, () => {
      this.isComplete = true;
      this.inputUnlockAt = this.time.now;
      if (isNewBest) {
        tryPlay(this, 'se_warning', { volume: 0.5 });
        this.tween(bestText, { alpha: 0.2 }, 200, 0, 1, true);
      }
    });

    this.bindSkip(elements, pct, accuracyBar, accuracyLabel, barX, barY, barW, barH, telemetryBars, telemetryTargets, telemetryBarStartX, telemetryY, isNewBest, bestText);
  }

  private bindSkip(
    elements: Phaser.GameObjects.GameObject[],
    pct: number,
    accuracyBar: Phaser.GameObjects.Graphics,
    accuracyLabel: Phaser.GameObjects.Text,
    barX: number,
    barY: number,
    barW: number,
    barH: number,
    telemetryBars: Phaser.GameObjects.Graphics[],
    telemetryTargets: number[],
    telemetryBarStartX: number,
    telemetryY: number,
    isNewBest: boolean,
    bestText: Phaser.GameObjects.Text,
  ) {
    const skip = () => {
      if (this.isComplete) return;
      for (const tween of this.allTweens) {
        tween.stop();
      }
      this.allTweens = [];
      for (const el of elements) {
        el.setAlpha(1);
      }
      accuracyBar.clear();
      accuracyBar.fillStyle(pct < 40 ? 0xFF6B35 : 0x00E5CC);
      accuracyBar.fillRect(barX, barY, barW * (pct / 100), barH);
      accuracyLabel.setText(`SORT ACCURACY  ${pct}%`);
      for (let i = 0; i < telemetryBars.length; i++) {
        const bar = telemetryBars[i];
        bar.clear();
        if (i < 3) {
          bar.fillStyle(0x1C2E44);
          bar.fillRect(telemetryBarStartX, telemetryY + 17 + i * 20, 92, 5);
          bar.fillStyle(0x00E5CC);
          bar.fillRect(telemetryBarStartX, telemetryY + 17 + i * 20, 92 * telemetryTargets[i], 5);
        }
      }
      if (isNewBest) {
        bestText.setText('PERSONAL BEST ★ NEW RECORD');
      }
      this.isComplete = true;
      this.inputUnlockAt = this.time.now + 50;
    };

    this.input.on('pointerdown', skip);
    this.input.keyboard?.on('keydown', skip);
    this.input.keyboard?.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard?.on('keydown-T', () => this.startTitle());
    this.input.keyboard?.on('keydown-ESC', () => this.startTitle());
  }

  private createButton(
    cx: number,
    cy: number,
    w: number,
    h: number,
    text: string,
    onClick: () => void,
  ): Phaser.GameObjects.GameObject[] {
    const bg = this.add.graphics().setAlpha(0);
    const label = this.add.text(cx, cy, text, {
      fontSize: '14px', color: '#4A6FA8', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);
    const draw = (hover: boolean) => {
      bg.clear();
      bg.lineStyle(1, hover ? 0x00E5CC : PANEL_BORDER_ACTIVE);
      bg.strokeRect(cx - w / 2, cy - h / 2, w, h);
      if (hover) {
        bg.lineStyle(1, 0x00E5CC, 0.3);
        bg.strokeRect(cx - w / 2 - 2, cy - h / 2 - 2, w + 4, h + 4);
      }
      label.setColor(hover ? '#00E5CC' : '#4A6FA8');
    };
    draw(false);
    const zone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true }).setAlpha(0);
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout', () => draw(false));
    zone.on('pointerup', () => onClick());
    return [bg, label, zone];
  }

  private startGame() {
    if (!this.isComplete || this.isTransitioning) return;
    if (this.time.now < this.inputUnlockAt) return;
    this.isTransitioning = true;
    this.sound.stopAll();
    this.scene.start('GameScene');
  }

  private startTitle() {
    if (!this.isComplete || this.isTransitioning) return;
    if (this.time.now < this.inputUnlockAt) return;
    this.isTransitioning = true;
    this.sound.stopAll();
    this.scene.start('TitleScene');
  }

  private loadBest(): number {
    try {
      const raw = window.localStorage.getItem(BEST_KEY);
      if (!raw) return 0;
      const value = Number(raw);
      return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
    } catch {
      return 0;
    }
  }

  private saveBest(value: number) {
    try {
      window.localStorage.setItem(BEST_KEY, String(value));
    } catch {
      // ignore storage failures
    }
  }

  private tween(
    targets: Phaser.Types.Tweens.TweenTarget,
    values: Record<string, unknown>,
    duration: number,
    delay = 0,
    repeat = 0,
    yoyo = false,
    onComplete?: () => void,
  ): Phaser.Tweens.Tween {
    const tween = this.tweens.add({
      targets,
      ...values,
      duration,
      delay,
      repeat,
      yoyo,
      onComplete,
    });
    this.allTweens.push(tween);
    return tween;
  }

  private tweenCounter(
    from: number,
    to: number,
    duration: number,
    delay: number,
    onUpdate: (value: number) => void,
    onComplete?: () => void,
  ) {
    const tween = this.tweens.addCounter({
      from,
      to,
      duration,
      delay,
      onUpdate: (tw) => {
        onUpdate(tw.getValue() ?? 0);
      },
      onComplete,
    });
    this.allTweens.push(tween);
  }
}
