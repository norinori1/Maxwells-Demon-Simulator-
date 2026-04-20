import Phaser from 'phaser';
import {
  GAME_W, GAME_H, UI_H,
  PARTITION_X, HOLE_SIZE, BALL_RADIUS,
  HOT_SPEED_MIN, HOT_SPEED_MAX,
  COLD_SPEED_MIN, COLD_SPEED_MAX,
  COLOR_HOT, COLOR_COLD,
} from '../config';

export class Ball {
  private arc: Phaser.GameObjects.Arc;
  private vx: number;
  private vy: number;
  readonly type: 'hot' | 'cold';

  constructor(scene: Phaser.Scene, x: number, y: number, type: 'hot' | 'cold') {
    this.type = type;
    const [minSpd, maxSpd] = type === 'hot'
      ? [HOT_SPEED_MIN, HOT_SPEED_MAX]
      : [COLD_SPEED_MIN, COLD_SPEED_MAX];
    const speed = Phaser.Math.FloatBetween(minSpd, maxSpd) * 60;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    const color = type === 'hot' ? COLOR_HOT : COLOR_COLD;
    this.arc = scene.add.arc(x, y, BALL_RADIUS, 0, 360, false, color);
  }

  update(dt: number, holeOpen: boolean, holeY: number) {
    const prevX = this.arc.x;
    this.arc.x += this.vx * dt;
    this.arc.y += this.vy * dt;
    this.reflectWalls();
    this.checkPartition(prevX, holeOpen, holeY);
  }

  private reflectWalls() {
    const r = BALL_RADIUS;
    const maxY = GAME_H - UI_H - r;
    if (this.arc.x < r) { this.vx = Math.abs(this.vx); }
    if (this.arc.x > GAME_W - r) { this.vx = -Math.abs(this.vx); }
    if (this.arc.y < r) { this.vy = Math.abs(this.vy); }
    if (this.arc.y > maxY) { this.vy = -Math.abs(this.vy); }
    this.arc.x = Phaser.Math.Clamp(this.arc.x, r, GAME_W - r);
    this.arc.y = Phaser.Math.Clamp(this.arc.y, r, maxY);
  }

  private checkPartition(prevX: number, holeOpen: boolean, holeY: number) {
    const wx = PARTITION_X;
    const crossedWall =
      (prevX < wx && this.arc.x >= wx) ||
      (prevX > wx && this.arc.x <= wx);
    if (!crossedWall) return;

    const withinHole =
      holeOpen &&
      this.arc.y > holeY - HOLE_SIZE / 2 - BALL_RADIUS &&
      this.arc.y < holeY + HOLE_SIZE / 2 + BALL_RADIUS;

    if (!withinHole) {
      this.vx *= -1;
      this.arc.x = prevX < wx
        ? wx - BALL_RADIUS - 1
        : wx + BALL_RADIUS + 1;
    }
  }

  isCorrectSide(): boolean {
    return this.type === 'cold'
      ? this.arc.x < PARTITION_X
      : this.arc.x > PARTITION_X;
  }

  destroy() {
    this.arc.destroy();
  }
}
