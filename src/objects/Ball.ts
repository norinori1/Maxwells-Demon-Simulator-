import Phaser from 'phaser';
import {
  GAME_W, GAME_H, UI_H,
  PARTITION_X, HOLE_SIZE, BALL_RADIUS,
  HOT_SPEED_MIN, HOT_SPEED_MAX,
  COLD_SPEED_MIN, COLD_SPEED_MAX,
  COLOR_HOT, COLOR_COLD,
} from '../config';

export class Ball {
  private glowArc: Phaser.GameObjects.Arc;
  private trails: Phaser.GameObjects.Arc[] = [];
  private history: { x: number; y: number }[] = [];
  private arc: Phaser.GameObjects.Arc;
  private vx: number;
  private vy: number;
  private speedMult = 1.0;
  readonly type: 'hot' | 'cold';
  public justPassed = false;
  public justBounced = false;
  public bounceY = 0;

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
    const glowColor = type === 'hot' ? 0xFF6B35 : 0x00BFFF;
    // glow arc first so it renders behind the body
    this.glowArc = scene.add.arc(x, y, BALL_RADIUS * 3, 0, 360, false, glowColor);
    this.glowArc.setAlpha(0.15);
    for (let i = 0; i < 3; i++) {
      const trail = scene.add.arc(x, y, BALL_RADIUS * (0.8 - i * 0.2), 0, 360, false, color);
      trail.setAlpha(0).setVisible(false);
      this.trails.push(trail);
      this.history.push({ x, y });
    }
    this.arc = scene.add.arc(x, y, BALL_RADIUS, 0, 360, false, color);
  }

  get x() { return this.arc.x; }
  get y() { return this.arc.y; }

  setSpeedMultiplier(m: number) { this.speedMult = m; }

  update(dt: number, holeOpen: boolean, holeY: number) {
    this.justPassed = false;
    this.justBounced = false;
    const prevX = this.arc.x;
    this.arc.x += this.vx * this.speedMult * dt;
    this.arc.y += this.vy * this.speedMult * dt;
    this.reflectWalls();
    this.checkPartition(prevX, holeOpen, holeY);
    this.glowArc.x = this.arc.x;
    this.glowArc.y = this.arc.y;
    this.glowArc.setAlpha(this.isCorrectSide() ? 0.30 : 0.12);

    this.history.unshift({ x: this.arc.x, y: this.arc.y });
    if (this.history.length > 3) this.history.pop();
    const trailStrength = Phaser.Math.Clamp((this.speedMult - 1.0) / 0.4, 0, 1);
    const showTrail = trailStrength > 0;
    for (let i = 0; i < this.trails.length; i++) {
      const trail = this.trails[i];
      const h = this.history[i] ?? this.history[this.history.length - 1];
      trail.setVisible(showTrail);
      if (showTrail) {
        trail.setPosition(h.x, h.y);
        trail.setAlpha((0.5 - i * 0.15) * trailStrength);
      }
    }
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
      this.justBounced = true;
      this.bounceY = this.arc.y;
    } else {
      this.justPassed = true;
    }
  }

  isCorrectSide(): boolean {
    return this.type === 'cold'
      ? this.arc.x < PARTITION_X
      : this.arc.x > PARTITION_X;
  }

  destroy() {
    for (const trail of this.trails) {
      trail.destroy();
    }
    this.glowArc.destroy();
    this.arc.destroy();
  }
}
