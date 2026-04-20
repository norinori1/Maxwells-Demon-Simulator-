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

  update(holeOpen: boolean, holeY: number) {
    this.holeOpen = holeOpen;
    this.holeY = holeY;
    this.draw();
  }

  private draw() {
    const wallHeight = GAME_H - UI_H;
    this.gfx.clear();
    this.gfx.fillStyle(COLOR_PARTITION);

    if (!this.holeOpen) {
      this.gfx.fillRect(PARTITION_X - 3, 0, 6, wallHeight);
    } else {
      const holeTop = this.holeY - HOLE_SIZE / 2;
      const holeBottom = this.holeY + HOLE_SIZE / 2;
      if (holeTop > 0) {
        this.gfx.fillRect(PARTITION_X - 3, 0, 6, holeTop);
      }
      if (holeBottom < wallHeight) {
        this.gfx.fillRect(PARTITION_X - 3, holeBottom, 6, wallHeight - holeBottom);
      }
      this.gfx.lineStyle(2, COLOR_HOLE);
      this.gfx.strokeRect(PARTITION_X - 5, holeTop, 10, HOLE_SIZE);
    }
  }

  destroy() {
    this.gfx.destroy();
  }
}
