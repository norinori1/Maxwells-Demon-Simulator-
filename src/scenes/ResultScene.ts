import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';

interface ResultData {
  sorted: number;
  total: number;
}

function getGrade(pct: number): { grade: string; color: string; desc: string } {
  if (pct >= 80) return { grade: 'S', color: '#FFD700', desc: '第二法則に明確に違反！' };
  if (pct >= 60) return { grade: 'A', color: '#00E5CC', desc: '優秀な悪魔！' };
  if (pct >= 40) return { grade: 'B', color: '#00BFFF', desc: '平均的なプレイ' };
  return { grade: 'C', color: '#FF6B35', desc: '改善の余地あり' };
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data: ResultData) {
    const { sorted, total } = data;
    const pct = total > 0 ? Math.round((sorted / total) * 100) : 0;
    const { grade, color, desc } = getGrade(pct);

    if (this.cache.audio.has('bgm_result')) {
      this.sound.add('bgm_result', { loop: true, volume: 0.45 }).play();
    }

    const cx = GAME_W / 2;
    const cy = GAME_H / 2;
    const SEP = '─'.repeat(38);

    // background overlay
    const bg = this.add.graphics();
    bg.fillStyle(0x080D1A, 0);
    bg.fillRect(0, 0, GAME_W, GAME_H);
    this.tweens.add({ targets: bg, fillAlpha: 0.97, duration: 300 });

    // header
    const header = this.add.text(cx, cy - 140, 'SYSTEM DIAGNOSTIC REPORT', {
      fontSize: '14px', color: '#00E5CC', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    const subheader = this.add.text(cx, cy - 118, 'THERMODYNAMIC SORTING UNIT: MXD-001', {
      fontSize: '11px', color: '#4A6FA8', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    // separator top
    const sep1 = this.add.text(cx, cy - 98, SEP, {
      fontSize: '10px', color: '#1C2E44', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    // efficiency label
    const effLabel = this.add.text(cx, cy - 78, 'EFFICIENCY RATING', {
      fontSize: '11px', color: '#4A6FA8', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    // grade text
    const gradeText = this.add.text(cx, cy - 28, `[ ${grade} ]`, {
      fontSize: '72px', color, fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0).setScale(0);

    // accuracy bar
    const barY = cy + 40;
    const accuracyBar = this.add.graphics().setAlpha(0);
    const accuracyBg = this.add.graphics().setAlpha(0);
    accuracyBg.fillStyle(0x0E1A2E);
    accuracyBg.fillRect(cx - 100, barY, 200, 8);

    const accuracyLabel = this.add.text(cx, barY + 18, `SORT ACCURACY  0%`, {
      fontSize: '11px', color: '#00E5CC', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    const sortDetail = this.add.text(cx, barY + 34, `(${sorted} / ${total})`, {
      fontSize: '10px', color: '#4A6FA8', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    // status desc
    const statusText = this.add.text(cx, cy + 90, `STATUS: ${desc}`, {
      fontSize: '13px', color, fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    // separator bottom
    const sep2 = this.add.text(cx, cy + 108, SEP, {
      fontSize: '10px', color: '#1C2E44', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    // button
    const btnW = 200;
    const btnH = 36;
    const btnX = cx - btnW / 2;
    const btnY = cy + 122;
    const btnBg = this.add.graphics().setAlpha(0);
    const drawBtn = (hover: boolean) => {
      btnBg.clear();
      btnBg.lineStyle(1, hover ? 0x00E5CC : 0x1C2E44);
      btnBg.strokeRect(btnX, btnY, btnW, btnH);
      if (hover) {
        btnBg.lineStyle(1, 0x00E5CC, 0.3);
        btnBg.strokeRect(btnX - 2, btnY - 2, btnW + 4, btnH + 4);
      }
    };
    drawBtn(false);

    const btnText = this.add.text(cx, btnY + btnH / 2, '[ REINITIALIZE ]', {
      fontSize: '14px', color: '#4A6FA8', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0);

    const zone = this.add.zone(cx, btnY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => { drawBtn(true); btnText.setColor('#00E5CC'); });
    zone.on('pointerout',  () => { drawBtn(false); btnText.setColor('#4A6FA8'); });
    zone.on('pointerup',   () => { this.sound.stopAll(); this.scene.start('GameScene'); });

    this.input.keyboard?.once('keydown-ENTER', () => { this.sound.stopAll(); this.scene.start('GameScene'); });
    this.input.keyboard?.once('keydown-SPACE', () => { this.sound.stopAll(); this.scene.start('GameScene'); });

    // staggered tween sequence
    this.tweens.add({ targets: [header, subheader], alpha: 1, duration: 200, delay: 100 });
    this.tweens.add({ targets: sep1, alpha: 1, duration: 150, delay: 200 });
    this.tweens.add({ targets: effLabel, alpha: 1, duration: 150, delay: 300 });

    // grade: scale + fade
    this.tweens.add({
      targets: gradeText,
      alpha: 1,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 250,
      delay: 400,
      onComplete: () => {
        this.tweens.add({ targets: gradeText, scaleX: 1, scaleY: 1, duration: 150 });
      },
    });

    // accuracy bar sweep
    this.tweens.add({ targets: [accuracyBg, accuracyBar, accuracyLabel, sortDetail], alpha: 1, duration: 200, delay: 500 });
    this.tweens.addCounter({
      from: 0,
      to: pct,
      duration: 1200,
      delay: 600,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const v = tween.getValue() ?? 0;
        accuracyBar.clear();
        accuracyBar.fillStyle(0x00E5CC);
        accuracyBar.fillRect(cx - 100, barY, 200 * (v / 100), 8);
        accuracyLabel.setText(`SORT ACCURACY  ${Math.round(v)}%`);
      },
    });

    this.tweens.add({ targets: statusText, alpha: 1, duration: 200, delay: 800 });
    this.tweens.add({ targets: sep2, alpha: 1, duration: 150, delay: 900 });
    this.tweens.add({ targets: [btnBg, btnText], alpha: 1, duration: 200, delay: 1000 });
  }
}
