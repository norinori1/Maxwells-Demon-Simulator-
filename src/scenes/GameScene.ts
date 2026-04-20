import Phaser from 'phaser';
import { Ball } from '../objects/Ball';
import { Partition } from '../objects/Partition';
import { HUD } from '../ui/HUD';
import {
  GAME_W, GAME_H, UI_H,
  PARTITION_X, HOLE_SIZE,
  BALL_COUNT, TIME_LIMIT,
  BALL_RADIUS, COLOR_GRID,
} from '../config';

function tryPlay(scene: Phaser.Scene, key: string, config?: Phaser.Types.Sound.SoundConfig) {
  if (scene.cache.audio.has(key)) {
    scene.sound.play(key, config);
  }
}

export class GameScene extends Phaser.Scene {
  private balls: Ball[] = [];
  private partition!: Partition;
  private hud!: HUD;
  private timeLeft = TIME_LIMIT;
  private isPlaying = false;
  private pointer!: Phaser.Input.Pointer;
  private prevHoleOpen = false;
  private vignetteStarted = false;
  private warningSounded = false;
  private vignette!: Phaser.GameObjects.Graphics;
  private bgm?: Phaser.Sound.BaseSound;
  private valveOpenMs = 0;
  private hotSorted = 0;
  private coldSorted = 0;
  private currentStreak = 0;
  private maxStreak = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.balls = [];
    this.timeLeft = TIME_LIMIT;
    this.isPlaying = false;
    this.prevHoleOpen = false;
    this.vignetteStarted = false;
    this.warningSounded = false;
    this.valveOpenMs = 0;
    this.hotSorted = 0;
    this.coldSorted = 0;
    this.currentStreak = 0;
    this.maxStreak = 0;

    // dot grid background
    const grid = this.add.graphics().setDepth(-1);
    grid.fillStyle(COLOR_GRID);
    for (let x = 16; x < GAME_W; x += 32) {
      for (let y = 16; y < GAME_H - UI_H; y += 32) {
        grid.fillRect(x, y, 2, 2);
      }
    }

    // chamber zone overlays
    const zones = this.add.graphics().setDepth(-1);
    zones.fillStyle(0x00BFFF, 0.05);
    zones.fillRect(0, 0, PARTITION_X, GAME_H - UI_H);
    zones.fillStyle(0xFF6B35, 0.05);
    zones.fillRect(PARTITION_X, 0, GAME_W - PARTITION_X, GAME_H - UI_H);

    this.pointer = this.input.activePointer;
    this.partition = new Partition(this);
    this.spawnBalls();
    this.hud = new HUD(this);

    // vignette overlay (starts invisible, fades in at low time)
    this.vignette = this.add.graphics().setDepth(10);
    this.vignette.fillStyle(0xFF0000, 1);
    this.vignette.fillRect(0, 0, GAME_W, GAME_H);
    this.vignette.setAlpha(0);

    // BGM
    if (this.cache.audio.has('bgm_game')) {
      this.bgm = this.sound.add('bgm_game', { loop: true, volume: 0.5 });
      this.bgm.play();
    }

    this.isPlaying = true;
  }

  private spawnBalls() {
    const playH = GAME_H - UI_H;
    const margin = BALL_RADIUS + 4;

    for (let i = 0; i < BALL_COUNT; i++) {
      const hotSide = Math.random() < 0.5 ? 'left' : 'right';
      const hx = hotSide === 'left'
        ? Phaser.Math.FloatBetween(margin, PARTITION_X - margin)
        : Phaser.Math.FloatBetween(PARTITION_X + margin, GAME_W - margin);
      const hy = Phaser.Math.FloatBetween(margin, playH - margin);
      this.balls.push(new Ball(this, hx, hy, 'hot'));

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

    // valve SFX + particle burst on open/close edges
    if (holeOpen && !this.prevHoleOpen) {
      tryPlay(this, 'se_valve_open', { volume: 0.6 });

      const leftEmitter = this.add.particles(PARTITION_X, holeY, 'particle', {
        speed: { min: 30, max: 70 },
        angle: { min: 160, max: 200 },
        lifespan: 350,
        quantity: 8,
        tint: [0x00E5CC, 0x5D8FAA],
        scale: { start: 1, end: 0 },
        emitting: false,
      });
      leftEmitter.explode(8);

      const rightEmitter = this.add.particles(PARTITION_X, holeY, 'particle', {
        speed: { min: 30, max: 70 },
        angle: { min: -20, max: 20 },
        lifespan: 350,
        quantity: 8,
        tint: [0x00E5CC, 0x5D8FAA],
        scale: { start: 1, end: 0 },
        emitting: false,
      });
      rightEmitter.explode(8);
    }
    if (!holeOpen && this.prevHoleOpen) {
      tryPlay(this, 'se_valve_close', { volume: 0.5 });
    }
    if (holeOpen) {
      this.valveOpenMs += delta;
    }
    this.prevHoleOpen = holeOpen;

    this.partition.update(holeOpen, holeY);
    for (const ball of this.balls) {
      ball.update(dt, holeOpen, holeY);
    }

    // pass-through flash + SFX
    for (const ball of this.balls) {
      if (ball.justPassed) {
        if (ball.isCorrectSide()) {
          this.currentStreak++;
          this.maxStreak = Math.max(this.maxStreak, this.currentStreak);
        } else {
          this.currentStreak = 0;
        }
        tryPlay(this, 'se_ball_pass', { volume: 0.4 });
        const flash = this.add.arc(ball.x, ball.y, BALL_RADIUS * 2.5, 0, 360, false, 0xFFFFFF);
        flash.setAlpha(0.8);
        this.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 200,
          onComplete: () => flash.destroy(),
        });
      }
    }

    // warning SFX + vignette at <10s
    if (this.timeLeft < 10 && !this.vignetteStarted) {
      this.vignetteStarted = true;
      this.tweens.add({ targets: this.vignette, alpha: 0.12, duration: 800 });
    }
    if (this.timeLeft < 10 && !this.warningSounded) {
      this.warningSounded = true;
      tryPlay(this, 'se_warning', { volume: 0.7 });
    }

    const { cold, hot } = this.countSorted();
    this.coldSorted = cold;
    this.hotSorted = hot;
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
    this.bgm?.stop();
    const { cold, hot } = this.countSorted();
    this.scene.start('ResultScene', {
      sorted: cold + hot,
      total: this.balls.length,
      hotSorted: this.hotSorted,
      coldSorted: this.coldSorted,
      valveOpenMs: this.valveOpenMs,
      maxStreak: this.maxStreak,
    });
  }
}
