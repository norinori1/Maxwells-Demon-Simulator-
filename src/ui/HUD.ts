import Phaser from 'phaser';
import { GAME_W, GAME_H, UI_H } from '../config';

const BAR_X = 200;
const BAR_Y = GAME_H - UI_H + 14;
const BAR_W = GAME_W - 400;
const BAR_H = 12;

export class HUD {
  private timerText: Phaser.GameObjects.Text;
  private coldCountText: Phaser.GameObjects.Text;
  private hotCountText: Phaser.GameObjects.Text;
  private barBg: Phaser.GameObjects.Graphics;
  private barFill: Phaser.GameObjects.Graphics;
  private barLabel: Phaser.GameObjects.Text;
  private coldLabel: Phaser.GameObjects.Text;
  private hotLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const uiY = GAME_H - UI_H;

    // separator line
    const line = scene.add.graphics();
    line.lineStyle(1, 0x32324A);
    line.lineBetween(0, uiY, GAME_W, uiY);

    // chamber labels (top)
    this.coldLabel = scene.add.text(GAME_W * 0.25, 8, '← COLD', {
      fontSize: '13px',
      color: '#5599FF',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    this.hotLabel = scene.add.text(GAME_W * 0.75, 8, 'HOT →', {
      fontSize: '13px',
      color: '#FF7744',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    // timer (center bottom)
    this.timerText = scene.add.text(GAME_W / 2, uiY + 12, '60.0', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    // cold count (left bottom)
    this.coldCountText = scene.add.text(20, uiY + 12, 'COLD: 0', {
      fontSize: '13px',
      color: '#5599FF',
      fontFamily: 'monospace',
    }).setOrigin(0, 0);

    // hot count (right bottom)
    this.hotCountText = scene.add.text(GAME_W - 20, uiY + 12, 'HOT: 0', {
      fontSize: '13px',
      color: '#FF7744',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // entropy bar bg
    this.barBg = scene.add.graphics();
    this.barBg.fillStyle(0x222233);
    this.barBg.fillRect(BAR_X, BAR_Y, BAR_W, BAR_H);

    this.barFill = scene.add.graphics();

    this.barLabel = scene.add.text(BAR_X + BAR_W / 2, BAR_Y + BAR_H / 2, '0%', {
      fontSize: '10px',
      color: '#AAFFCC',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);
  }

  update(timeLeft: number, coldSorted: number, hotSorted: number, total: number) {
    // timer
    const t = Math.max(0, timeLeft);
    this.timerText.setText(t.toFixed(1));
    this.timerText.setColor(t <= 10 ? '#FF4444' : '#FFFFFF');

    // counts
    this.coldCountText.setText(`COLD: ${coldSorted}`);
    this.hotCountText.setText(`HOT: ${hotSorted}`);

    // bar
    const sorted = coldSorted + hotSorted;
    const pct = total > 0 ? sorted / total : 0;
    this.barFill.clear();
    const fillColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x145030),
      Phaser.Display.Color.ValueToColor(0x1AC878),
      100,
      Math.round(pct * 100),
    );
    this.barFill.fillStyle(
      Phaser.Display.Color.GetColor(fillColor.r, fillColor.g, fillColor.b),
    );
    this.barFill.fillRect(BAR_X, BAR_Y, BAR_W * pct, BAR_H);
    this.barLabel.setText(`${Math.round(pct * 100)}%`);
  }

  destroy() {
    this.timerText.destroy();
    this.coldCountText.destroy();
    this.hotCountText.destroy();
    this.barBg.destroy();
    this.barFill.destroy();
    this.barLabel.destroy();
    this.coldLabel.destroy();
    this.hotLabel.destroy();
  }
}
