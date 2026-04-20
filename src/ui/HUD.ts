import Phaser from 'phaser';
import { GAME_W, GAME_H, UI_H } from '../config';

const BAR_X = 200;
const BAR_Y = GAME_H - UI_H + 14;
const BAR_W = GAME_W - 400;
const BAR_H = 12;

export class HUD {
  private scene: Phaser.Scene;
  private timerText: Phaser.GameObjects.Text;
  private coldCountText: Phaser.GameObjects.Text;
  private hotCountText: Phaser.GameObjects.Text;
  private barBg: Phaser.GameObjects.Graphics;
  private barFill: Phaser.GameObjects.Graphics;
  private barTicks: Phaser.GameObjects.Graphics;
  private barLabel: Phaser.GameObjects.Text;
  private coldLabel: Phaser.GameObjects.Text;
  private hotLabel: Phaser.GameObjects.Text;
  private valveText: Phaser.GameObjects.Text;
  private coldBar: Phaser.GameObjects.Graphics;
  private hotBar: Phaser.GameObjects.Graphics;
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

    // chamber labels (top)
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

    // valve indicator
    this.valveText = scene.add.text(GAME_W / 2, 24, '◈ VALVE: STANDBY', {
      fontSize: '11px',
      color: '#4A6FA8',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    // timer
    this.timerText = scene.add.text(GAME_W / 2, this.uiY + 12, '60.0', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    // cold count
    this.coldCountText = scene.add.text(20, this.uiY + 12, 'COLD: 0', {
      fontSize: '13px',
      color: '#00BFFF',
      fontFamily: 'monospace',
    }).setOrigin(0, 0);

    // hot count
    this.hotCountText = scene.add.text(GAME_W - 20, this.uiY + 12, 'HOT: 0', {
      fontSize: '13px',
      color: '#FF6B35',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // small progress bars under counters
    this.coldBar = scene.add.graphics();
    this.hotBar = scene.add.graphics();

    // entropy bar bg
    this.barBg = scene.add.graphics();
    this.barBg.fillStyle(0x0E1A2E);
    this.barBg.fillRect(BAR_X, BAR_Y, BAR_W, BAR_H);

    this.barFill = scene.add.graphics();

    // static tick marks on bar
    this.barTicks = scene.add.graphics();
    this.barTicks.lineStyle(1, 0x0E1A2E, 0.8);
    for (let i = 1; i < 10; i++) {
      const tx = BAR_X + (BAR_W * i) / 10;
      this.barTicks.lineBetween(tx, BAR_Y, tx, BAR_Y + BAR_H);
    }

    this.barLabel = scene.add.text(BAR_X + BAR_W / 2, BAR_Y + BAR_H / 2, '0%', {
      fontSize: '10px',
      color: '#00E5CC',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);
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
      if (this.timerTween) {
        this.timerTween.stop();
        this.timerTween = null;
        this.timerText.setAlpha(1);
      }
    } else {
      this.timerText.setColor('#FFFFFF');
      if (this.timerTween) {
        this.timerTween.stop();
        this.timerTween = null;
        this.timerText.setAlpha(1);
      }
    }
    this.timerText.setText(t.toFixed(1));

    // counts
    this.coldCountText.setText(`COLD: ${coldSorted}`);
    this.hotCountText.setText(`HOT: ${hotSorted}`);

    // small counter bars
    const half = Math.max(1, total / 2);
    this.coldBar.clear();
    this.coldBar.fillStyle(0x00BFFF);
    this.coldBar.fillRect(20, this.uiY + 32, Math.min(1, coldSorted / half) * 50, 3);

    this.hotBar.clear();
    this.hotBar.fillStyle(0xFF6B35);
    this.hotBar.fillRect(GAME_W - 70, this.uiY + 32, Math.min(1, hotSorted / half) * 50, 3);

    // valve indicator tween
    if (holeOpen) {
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
      if (this.valveTween) {
        this.valveTween.stop();
        this.valveTween = null;
        this.valveText.setAlpha(1);
      }
      this.valveText.setText('◈ VALVE: STANDBY');
      this.valveText.setColor('#4A6FA8');
    }

    // entropy bar
    const sorted = coldSorted + hotSorted;
    const pct = total > 0 ? sorted / total : 0;
    this.barFill.clear();
    this.barFill.fillStyle(0x00E5CC);
    this.barFill.fillRect(BAR_X, BAR_Y, BAR_W * pct, BAR_H);
    this.barLabel.setText(`${Math.round(pct * 100)}%`);
  }

  destroy() {
    if (this.valveTween) this.valveTween.stop();
    if (this.timerTween) this.timerTween.stop();
    this.timerText.destroy();
    this.coldCountText.destroy();
    this.hotCountText.destroy();
    this.barBg.destroy();
    this.barFill.destroy();
    this.barTicks.destroy();
    this.barLabel.destroy();
    this.coldLabel.destroy();
    this.hotLabel.destroy();
    this.valveText.destroy();
    this.coldBar.destroy();
    this.hotBar.destroy();
  }
}
