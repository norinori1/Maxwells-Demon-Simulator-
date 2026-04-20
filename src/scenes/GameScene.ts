import Phaser from 'phaser';
import { Ball } from '../objects/Ball';
import { Partition } from '../objects/Partition';
import { HUD } from '../ui/HUD';
import {
  GAME_W, GAME_H, UI_H,
  PARTITION_X, HOLE_SIZE,
  BALL_COUNT, TIME_LIMIT,
  BALL_RADIUS,
} from '../config';

export class GameScene extends Phaser.Scene {
  private balls: Ball[] = [];
  private partition!: Partition;
  private hud!: HUD;
  private timeLeft = TIME_LIMIT;
  private isPlaying = false;
  private pointer!: Phaser.Input.Pointer;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.balls = [];
    this.timeLeft = TIME_LIMIT;
    this.isPlaying = false;

    this.pointer = this.input.activePointer;
    this.partition = new Partition(this);
    this.spawnBalls();
    this.hud = new HUD(this);
    this.isPlaying = true;
  }

  private spawnBalls() {
    const playH = GAME_H - UI_H;
    const margin = BALL_RADIUS + 4;

    for (let i = 0; i < BALL_COUNT; i++) {
      // hot balls: start on both sides randomly
      const hotSide = Math.random() < 0.5 ? 'left' : 'right';
      const hx = hotSide === 'left'
        ? Phaser.Math.FloatBetween(margin, PARTITION_X - margin)
        : Phaser.Math.FloatBetween(PARTITION_X + margin, GAME_W - margin);
      const hy = Phaser.Math.FloatBetween(margin, playH - margin);
      this.balls.push(new Ball(this, hx, hy, 'hot'));

      // cold balls: start on both sides randomly
      const coldSide = Math.random() < 0.5 ? 'left' : 'right';
      const cx = coldSide === 'left'
        ? Phaser.Math.FloatBetween(margin, PARTITION_X - margin)
        : Phaser.Math.FloatBetween(PARTITION_X + margin, GAME_W - margin);
      const cy = Phaser.Math.FloatBetween(margin, playH - margin);
      this.balls.push(new Ball(this, cx, cy, 'cold'));
    }
  }

  update(_time: number, delta: number) {
    if (!this.isPlaying) return;
    const dt = delta / 1000;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endGame();
      return;
    }

    const holeOpen = this.pointer.isDown;
    const holeY = Phaser.Math.Clamp(
      this.pointer.y,
      HOLE_SIZE / 2,
      GAME_H - UI_H - HOLE_SIZE / 2,
    );

    this.partition.update(holeOpen, holeY);
    for (const ball of this.balls) {
      ball.update(dt, holeOpen, holeY);
    }

    const { cold, hot } = this.countSorted();
    this.hud.update(this.timeLeft, cold, hot, this.balls.length, holeOpen);
  }

  private countSorted() {
    let cold = 0;
    let hot = 0;
    for (const b of this.balls) {
      if (b.isCorrectSide()) {
        b.type === 'cold' ? cold++ : hot++;
      }
    }
    return { cold, hot };
  }

  private endGame() {
    this.isPlaying = false;
    const { cold, hot } = this.countSorted();
    this.scene.start('ResultScene', {
      sorted: cold + hot,
      total: this.balls.length,
    });
  }
}
