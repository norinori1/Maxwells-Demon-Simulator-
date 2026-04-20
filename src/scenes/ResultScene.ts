import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';

interface ResultData {
  sorted: number;
  total: number;
}

function getGrade(pct: number): { grade: string; color: string; desc: string } {
  if (pct >= 80) return { grade: 'S', color: '#FFD700', desc: '第二法則に明確に違反！' };
  if (pct >= 60) return { grade: 'A', color: '#1AC878', desc: '優秀な悪魔！' };
  if (pct >= 40) return { grade: 'B', color: '#5599FF', desc: '平均的なプレイ' };
  return { grade: 'C', color: '#AA4444', desc: '改善の余地あり' };
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data: ResultData) {
    const { sorted, total } = data;
    const pct = total > 0 ? Math.round((sorted / total) * 100) : 0;
    const { grade, color, desc } = getGrade(pct);

    const cx = GAME_W / 2;
    const cy = GAME_H / 2;

    // background overlay
    const bg = this.add.graphics();
    bg.fillStyle(0x0C0C18, 0.95);
    bg.fillRect(0, 0, GAME_W, GAME_H);

    // title
    this.add.text(cx, cy - 120, "MAXWELL'S DEMON", {
      fontSize: '20px',
      color: '#888899',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // grade
    this.add.text(cx, cy - 60, grade, {
      fontSize: '96px',
      color,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // sort rate
    this.add.text(cx, cy + 40, `仕分け率 ${pct}%  (${sorted} / ${total})`, {
      fontSize: '18px',
      color: '#CCCCDD',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // description
    this.add.text(cx, cy + 75, desc, {
      fontSize: '14px',
      color,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // retry button
    const btnBg = this.add.graphics();
    const btnX = cx - 80;
    const btnY = cy + 110;
    const btnW = 160;
    const btnH = 38;
    btnBg.fillStyle(0x1A1A2E);
    btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);
    btnBg.lineStyle(1, 0x5599FF);
    btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 6);

    const btnText = this.add.text(cx, btnY + btnH / 2, 'もう一度', {
      fontSize: '16px',
      color: '#AACCFF',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // clickable zone
    const zone = this.add.zone(cx, btnY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x223355);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);
      btnBg.lineStyle(1, 0x88AAFF);
      btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 6);
      btnText.setColor('#FFFFFF');
    });
    zone.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x1A1A2E);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);
      btnBg.lineStyle(1, 0x5599FF);
      btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 6);
      btnText.setColor('#AACCFF');
    });
    zone.on('pointerup', () => {
      this.scene.start('GameScene');
    });

    // also allow pressing Enter / Space
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('GameScene'));
    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('GameScene'));
  }
}
