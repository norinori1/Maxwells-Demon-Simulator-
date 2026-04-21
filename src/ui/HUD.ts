import Phaser from 'phaser';
import { GAME_W, GAME_H, UI_H } from '../config';

const BAR_X = 200;
const BAR_Y = GAME_H - UI_H + 8;   // 384 — UI帯内に完全移動
const BAR_W = GAME_W - 400;
const BAR_H = 8;

export class HUD {
  private scene: Phaser.Scene;
  private timerRing: Phaser.GameObjects.Graphics;
  private timerText: Phaser.GameObjects.Text;
  private coldCountText: Phaser.GameObjects.Text;
  private hotCountText: Phaser.GameObjects.Text;
  private barBg: Phaser.GameObjects.Graphics;
  private barFill: Phaser.GameObjects.Graphics;
  private barTicks: Phaser.GameObjects.Graphics;
  private barGradeLabels: Phaser.GameObjects.Text[] = [];
  private coldLabel: Phaser.GameObjects.Text;
  private hotLabel: Phaser.GameObjects.Text;
  private valveText: Phaser.GameObjects.Text;
  private valveIcon: Phaser.GameObjects.Graphics;
  private urgencyBorder: Phaser.GameObjects.Graphics;
  private urgencyTween: Phaser.Tweens.Tween | null = null;
  private valveTween: Phaser.Tweens.Tween | null = null;
  private timerTween: Phaser.Tweens.Tween | null = null;
  private uiY: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.uiY = GAME_H - UI_H;

    // separator line
    const line = scene.add.graphics();
    line.lineStyle(1, 0x1C2E44);
    line.lineBetween(0, this.uiY, GAME_W, this.uiY);

    // ── TOP BAND (y=0-20): chamber labels + valve ──

    // chamber labels
    this.coldLabel = scene.add.text(GAME_W * 0.25, 8, '← COLD', {
      fontSize: '13px',
      color: '#00BFFF',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    this.hotLabel = scene.add.text(GAME_W * 0.75, 8, 'HOT →', {
      fontSize: '13px',
      color: '#FF6B35',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    // valve indicator — center, same size as chamber labels
    this.valveText = scene.add.text(GAME_W / 2, 8, '◈ VALVE: STANDBY', {
      fontSize: '13px',
      color: '#4A6FA8',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
    this.valveIcon = scene.add.graphics();

    // ── UI BAR (y=376-420): grade bar + timer row ──

    // entropy bar bg
    this.barBg = scene.add.graphics();
    this.barBg.fillStyle(0x0E1A2E);
    this.barBg.fillRect(BAR_X, BAR_Y, BAR_W, BAR_H);

    this.barFill = scene.add.graphics();

    // tick marks
    this.barTicks = scene.add.graphics();
    this.barTicks.lineStyle(1, 0x0E1A2E, 0.8);
    for (let i = 1; i < 10; i++) {
      const tx = BAR_X + (BAR_W * i) / 10;
      this.barTicks.lineBetween(tx, BAR_Y, tx, BAR_Y + BAR_H);
    }

    // grade threshold markers — now sit just inside UI bar top
    const gradeMarkers = [
      { pct: 0.40, label: 'C', color: '#4A6FA8' },
      { pct: 0.60, label: 'B', color: '#00BFFF' },
      { pct: 0.80, label: 'A', color: '#00E5CC' },
    ];
    this.barTicks.lineStyle(1, 0x4A6FA8, 0.6);
    for (const m of gradeMarkers) {
      const mx = BAR_X + BAR_W * m.pct;
      this.barTicks.lineBetween(mx, BAR_Y - 4, mx, BAR_Y + BAR_H + 4);
      const label = scene.add.text(mx, BAR_Y - 4, m.label, {
        fontSize: '9px',
        color: m.color,
        fontFamily: 'monospace',
      }).setOrigin(0.5, 1);
      this.barGradeLabels.push(label);
    }
    const sLabel = scene.add.text(BAR_X + BAR_W, BAR_Y - 4, 'S', {
      fontSize: '10px',
      color: '#FFD700',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5, 1);
    this.barGradeLabels.push(sLabel);

    // large timer + ring — bottom row of UI bar
    this.timerRing = scene.add.graphics();
    this.timerRing.lineStyle(2, 0x1E3A5F, 1);
    this.timerRing.strokeCircle(GAME_W / 2, this.uiY + 32, 20);

    this.timerText = scene.add.text(GAME_W / 2, this.uiY + 32, '60', {
      fontSize: '22px',
      color: '#FFFFFF',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    // COLD / HOT counts — same row as timer
    this.coldCountText = scene.add.text(20, this.uiY + 30, 'COLD: 0', {
      fontSize: '13px',
      color: '#00BFFF',
      fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    this.hotCountText = scene.add.text(GAME_W - 20, this.uiY + 30, 'HOT: 0', {
      fontSize: '13px',
      color: '#FF6B35',
      fontFamily: 'monospace',
    }).setOrigin(1, 0.5);

    // urgency border (residual invisible — becomes visible at low time)
    this.urgencyBorder = scene.add.graphics().setDepth(11);
    this.urgencyBorder.setAlpha(0);
    this.drawUrgencyBorder();
    this.drawValveIcon(false);
  }

  update(
    timeLeft: number,
    coldSorted: number,
    hotSorted: number,
    total: number,
    holeOpen: boolean,
  ) {
    const t = Math.max(0, timeLeft);

    // timer color + blink
    if (t <= 5) {
      this.timerText.setColor('#FF3333');
      this.timerRing.clear();
      this.timerRing.lineStyle(2, 0xFF3333, 1);
      this.timerRing.strokeCircle(GAME_W / 2, this.uiY + 32, 20);
      if (!this.timerTween) {
        this.timerTween = this.scene.tweens.add({
          targets: this.timerText,
          alpha: { from: 1.0, to: 0.3 },
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
      }
    } else if (t <= 10) {
      this.timerText.setColor('#FF8C00');
      this.timerRing.clear();
      this.timerRing.lineStyle(2, 0x1E3A5F, 1);
      this.timerRing.strokeCircle(GAME_W / 2, this.uiY + 32, 20);
      if (this.timerTween) {
        this.timerTween.stop();
        this.timerTween = null;
        this.timerText.setAlpha(1);
      }
    } else {
      this.timerText.setColor('#FFFFFF');
      this.timerRing.clear();
      this.timerRing.lineStyle(2, 0x1E3A5F, 1);
      this.timerRing.strokeCircle(GAME_W / 2, this.uiY + 32, 20);
      if (this.timerTween) {
        this.timerTween.stop();
        this.timerTween = null;
        this.timerText.setAlpha(1);
      }
    }
    this.timerText.setText(Math.ceil(t).toString());

    if (t <= 10 && !this.urgencyTween) {
      this.urgencyTween = this.scene.tweens.add({
        targets: this.urgencyBorder,
        alpha: { from: 0, to: 0.6 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }

    // counts
    this.coldCountText.setText(`COLD: ${coldSorted}`);
    this.hotCountText.setText(`HOT: ${hotSorted}`);

    // valve indicator
    if (holeOpen) {
      this.drawValveIcon(true);
      if (!this.valveTween) {
        this.valveText.setText('◈ VALVE: ENGAGED');
        this.valveText.setColor('#00E5CC');
        this.valveTween = this.scene.tweens.add({
          targets: this.valveText,
          alpha: { from: 1.0, to: 0.5 },
          duration: 400,
          yoyo: true,
          repeat: -1,
        });
      }
    } else {
      this.drawValveIcon(false);
      if (this.valveTween) {
        this.valveTween.stop();
        this.valveTween = null;
        this.valveText.setAlpha(1);
      }
      this.valveText.setText('◈ VALVE: STANDBY');
      this.valveText.setColor('#4A6FA8');
    }

    // entropy bar with grade-aware fill color
    const sorted = coldSorted + hotSorted;
    const pct = total > 0 ? sorted / total : 0;
    const fillColor = pct >= 0.80 ? 0xFFD700 : pct >= 0.60 ? 0x00E5CC : pct >= 0.40 ? 0x00BFFF : 0x4A6FA8;
    this.barFill.clear();
    this.barFill.fillStyle(fillColor);
    this.barFill.fillRect(BAR_X, BAR_Y, BAR_W * pct, BAR_H);
  }

  private drawValveIcon(open: boolean) {
    this.valveIcon.clear();
    const cx = GAME_W / 2;
    const cy = 22;
    if (open) {
      this.valveIcon.lineStyle(2, 0x00E5CC, 1);
      this.valveIcon.beginPath();
      this.valveIcon.moveTo(cx - 14, cy + 2);
      this.valveIcon.lineTo(cx - 20, cy + 8);
      this.valveIcon.lineTo(cx - 14, cy + 14);
      this.valveIcon.moveTo(cx + 14, cy + 2);
      this.valveIcon.lineTo(cx + 20, cy + 8);
      this.valveIcon.lineTo(cx + 14, cy + 14);
      this.valveIcon.strokePath();
    } else {
      this.valveIcon.lineStyle(2, 0x4A6FA8, 1);
      this.valveIcon.lineBetween(cx - 6, cy + 2, cx - 6, cy + 14);
      this.valveIcon.lineBetween(cx + 6, cy + 2, cx + 6, cy + 14);
    }
  }

  private drawUrgencyBorder() {
    this.urgencyBorder.clear();
    this.urgencyBorder.lineStyle(3, 0xFF3333, 1);
    this.urgencyBorder.strokeRect(1, 1, GAME_W - 2, GAME_H - UI_H - 2);
  }

  showCountdown(onComplete: () => void) {
    const label = this.scene.add.text(GAME_W / 2, (GAME_H - UI_H) / 2, '3', {
      fontSize: '72px',
      color: '#00E5CC',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20);

    const steps = [
      { text: '3', color: '#00BFFF', delay: 0 },
      { text: '2', color: '#00E5CC', delay: 600 },
      { text: '1', color: '#FF8C00', delay: 1200 },
      { text: 'GO!', color: '#00FF88', delay: 1800 },
    ];
    for (const s of steps) {
      this.scene.time.delayedCall(s.delay, () => {
        label.setText(s.text).setColor(s.color).setScale(1.5).setAlpha(1);
        this.scene.tweens.add({
          targets: label,
          scale: 1.0,
          alpha: s.text === 'GO!' ? 0 : 0.6,
          duration: 500,
        });
      });
    }
    this.scene.time.delayedCall(2400, () => {
      label.destroy();
      onComplete();
    });
  }

  showStreak(streak: number) {
    if (streak < 3) return;
    const color = streak >= 7 ? '#FFD700' : streak >= 5 ? '#FF8C00' : '#00FF88';
    const label = this.scene.add.text(GAME_W / 2, 50, `${streak} STREAK!`, {
      fontSize: '22px',
      color,
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0).setDepth(5);
    this.scene.tweens.add({
      targets: label,
      alpha: { from: 1, to: 0 },
      y: 28,
      duration: 900,
      onComplete: () => label.destroy(),
    });
  }

  destroy() {
    if (this.valveTween) this.valveTween.stop();
    if (this.timerTween) this.timerTween.stop();
    if (this.urgencyTween) this.urgencyTween.stop();
    this.timerRing.destroy();
    this.timerText.destroy();
    this.coldCountText.destroy();
    this.hotCountText.destroy();
    this.barBg.destroy();
    this.barFill.destroy();
    this.barTicks.destroy();
    this.coldLabel.destroy();
    this.hotLabel.destroy();
    this.valveText.destroy();
    this.valveIcon.destroy();
    this.urgencyBorder.destroy();
    for (const label of this.barGradeLabels) {
      label.destroy();
    }
  }
}
