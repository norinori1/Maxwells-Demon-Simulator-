import Phaser from 'phaser';
import {
  GAME_H, UI_H,
  PARTITION_X, HOLE_SIZE,
  COLOR_PARTITION, COLOR_HOLE,
} from '../config';

export class Partition {
  private gfx: Phaser.GameObjects.Graphics;
  private holeOpen = false;
  private holeY = GAME_H / 2;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics();
    this.draw();
  }

  update(holeOpen: boolean, holeY: number, holeSize = HOLE_SIZE) {
    this.holeOpen = holeOpen;
    this.holeY = holeY;
    this.draw(holeSize);
  }

  private draw(holeSize = HOLE_SIZE) {
    const wallHeight = GAME_H - UI_H;
    this.gfx.clear();
    this.gfx.fillStyle(COLOR_PARTITION);

    if (!this.holeOpen) {
      this.gfx.fillRect(PARTITION_X - 3, 0, 6, wallHeight);
    } else {
      const holeTop = this.holeY - holeSize / 2;
      const holeBottom = this.holeY + holeSize / 2;
      if (holeTop > 0) {
        this.gfx.fillRect(PARTITION_X - 3, 0, 6, holeTop);
      }
      if (holeBottom < wallHeight) {
        this.gfx.fillRect(PARTITION_X - 3, holeBottom, 6, wallHeight - holeBottom);
      }
      // cyan valve bracket
      this.gfx.lineStyle(2, COLOR_HOLE);
      this.gfx.strokeRect(PARTITION_X - 6, holeTop, 12, holeSize);
      // valve end-caps
      this.gfx.lineStyle(3, COLOR_HOLE);
      this.gfx.lineBetween(PARTITION_X - 8, holeTop, PARTITION_X + 8, holeTop);
      this.gfx.lineBetween(PARTITION_X - 8, holeBottom, PARTITION_X + 8, holeBottom);
    }

    // metal hatching lines over the solid wall
    this.gfx.lineStyle(1, 0x2A4060, 0.25);
    for (let y = 0; y < wallHeight; y += 8) {
      this.gfx.lineBetween(PARTITION_X - 3, y, PARTITION_X + 3, y + 6);
    }
  }

  destroy() {
    this.gfx.destroy();
  }
}
