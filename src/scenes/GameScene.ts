import Phaser from 'phaser';
import { Ball } from '../objects/Ball';
import { Partition } from '../objects/Partition';
import { HUD } from '../ui/HUD';
import {
  GAME_W, GAME_H, UI_H,
  PARTITION_X, HOLE_SIZE,
  BALL_COUNT, TIME_LIMIT,
  BALL_RADIUS, COLOR_GRID,
  ACTION_PROFILE, ONBOARDING_ASSIST_SEC, ONBOARDING_AUTOVALVE_SEC,
  TELEGRAPH_WINDOW_MIN_SEC, TELEGRAPH_WINDOW_MAX_SEC,
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
  private valveStreamLeft?: Phaser.GameObjects.Particles.ParticleEmitter;
  private valveStreamRight?: Phaser.GameObjects.Particles.ParticleEmitter;
  private score = 0;
  private overdriveSecLeft = 0;
  private overdriveCooldownSecLeft = 0;
  private overdriveUsage = 0;
  private missionTriggersSec = [20, 40, 55];
  private missionStates = [false, false, false];
  private firstSuccessSec: number | null = null;
  private guidanceText = '';

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
    this.score = 0;
    this.overdriveSecLeft = 0;
    this.overdriveCooldownSecLeft = 0;
    this.overdriveUsage = 0;
    this.missionStates = [false, false, false];
    this.firstSuccessSec = null;
    this.guidanceText = '';

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
    this.valveStreamLeft = this.add.particles(PARTITION_X, GAME_H / 2, 'particle', {
      speed: { min: 20, max: 60 },
      angle: { min: 170, max: 190 },
      lifespan: 300,
      quantity: 1,
      frequency: 25,
      tint: [0x00E5CC, 0x5D8FAA],
      scale: { start: 0.8, end: 0 },
      emitting: false,
    });
    this.valveStreamRight = this.add.particles(PARTITION_X, GAME_H / 2, 'particle', {
      speed: { min: 20, max: 60 },
      angle: { min: -10, max: 10 },
      lifespan: 300,
      quantity: 1,
      frequency: 25,
      tint: [0x00E5CC, 0x5D8FAA],
      scale: { start: 0.8, end: 0 },
      emitting: false,
    });

    // vignette overlay (starts invisible, fades in at low time)
    this.vignette = this.add.graphics().setDepth(10);
    this.vignette.fillStyle(0xFF0000, 1);
    this.vignette.fillRect(0, 0, GAME_W, GAME_H);
    this.vignette.setAlpha(0);

    this.hud.showCountdown(() => {
      // BGM starts when play starts
      if (this.cache.audio.has('bgm_game')) {
        this.bgm = this.sound.add('bgm_game', { loop: true, volume: 0.5 });
        this.bgm.play();
      }
      this.isPlaying = true;
    });
  }

  private spawnBalls() {
    const playH = GAME_H - UI_H;
    const margin = BALL_RADIUS + 4;

    const guidedHotY = playH * 0.5 - 24;
    const guidedColdY = playH * 0.5 + 24;
    this.balls.push(new Ball(this, PARTITION_X - 38, guidedHotY, 'hot', { vx: 150, vy: 20 }));
    this.balls.push(new Ball(this, PARTITION_X + 38, guidedColdY, 'cold', { vx: -150, vy: -20 }));

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
    this.overdriveSecLeft = Math.max(0, this.overdriveSecLeft - dt);
    this.overdriveCooldownSecLeft = Math.max(0, this.overdriveCooldownSecLeft - dt);
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endGame();
      return;
    }

    if (this.isOverdriveTrigger()) {
      this.activateOverdrive();
    }

    const elapsedSec = TIME_LIMIT - this.timeLeft;
    const assistAutoValve = elapsedSec <= ONBOARDING_AUTOVALVE_SEC;
    const holeOpen = this.pointer.isDown || assistAutoValve;
    const holeSize = this.getCurrentHoleSize(elapsedSec);
    const holeY = Phaser.Math.Clamp(
      this.pointer.y,
      holeSize / 2,
      GAME_H - UI_H - holeSize / 2,
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
      this.time.delayedCall(400, () => leftEmitter.destroy());

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
      this.time.delayedCall(400, () => rightEmitter.destroy());
    }
    if (!holeOpen && this.prevHoleOpen) {
      tryPlay(this, 'se_valve_close', { volume: 0.5 });
    }
    if (holeOpen) {
      this.valveOpenMs += delta;
    }
    this.prevHoleOpen = holeOpen;
    this.valveStreamLeft?.setPosition(PARTITION_X, holeY);
    this.valveStreamRight?.setPosition(PARTITION_X, holeY);
    if (holeOpen) {
      if (this.valveStreamLeft && !this.valveStreamLeft.on) this.valveStreamLeft.start();
      if (this.valveStreamRight && !this.valveStreamRight.on) this.valveStreamRight.start();
    } else {
      if (this.valveStreamLeft?.on) this.valveStreamLeft.stop();
      if (this.valveStreamRight?.on) this.valveStreamRight.stop();
    }

    this.partition.update(holeOpen, holeY, holeSize);
    const speedMult = this.timeLeft < 15 ? 1.4 : this.timeLeft < 30 ? 1.2 : 1.0;
    let maxThreat = 0;
    for (const ball of this.balls) {
      ball.setSpeedMultiplier(speedMult);
      ball.updateWithHoleSize(dt, holeOpen, holeY, holeSize);
      const threat = ball.getWrongPassThreat(
        holeOpen,
        holeY,
        holeSize,
        TELEGRAPH_WINDOW_MIN_SEC,
        TELEGRAPH_WINDOW_MAX_SEC,
      );
      ball.setThreatVisual(threat);
      maxThreat = Math.max(maxThreat, threat);
    }

    // pass-through flash + SFX
    for (const ball of this.balls) {
      if (ball.justPassed) {
        const correct = ball.isCorrectSide();
        const actionProfile = this.overdriveSecLeft > 0 ? ACTION_PROFILE.overdrive : ACTION_PROFILE.normal;
        const scoreDelta = correct ? actionProfile.scoreReward : actionProfile.scorePenalty;
        this.score += scoreDelta;
        if (correct) {
          if (this.firstSuccessSec === null) {
            this.firstSuccessSec = elapsedSec;
          }
          this.currentStreak++;
          this.maxStreak = Math.max(this.maxStreak, this.currentStreak);
          this.hud.showStreak(this.currentStreak);
          if (this.currentStreak === 10) {
            this.cameras.main.shake(180, 0.005);
          } else if (this.currentStreak === 5) {
            this.cameras.main.shake(120, 0.003);
          }
        } else {
          this.currentStreak = 0;
        }
        tryPlay(this, correct ? 'se_ball_pass' : 'se_valve_close', { volume: 0.4 });
        const flashColor = correct ? 0x00FF88 : 0xFF3333;
        const flash = this.add.arc(ball.x, ball.y, BALL_RADIUS * 2.5, 0, 360, false, flashColor);
        flash.setAlpha(0.9);
        this.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 200,
          onComplete: () => flash.destroy(),
        });
        const floatLabel = this.add.text(ball.x, ball.y - 10, correct ? '+1' : '−1', {
          fontSize: '14px',
          color: correct ? '#00FF88' : '#FF3333',
          fontFamily: 'monospace',
        }).setOrigin(0.5).setDepth(5);
        floatLabel.setText(scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}`);
        this.tweens.add({
          targets: floatLabel,
          y: ball.y - 38,
          alpha: 0,
          duration: 500,
          onComplete: () => floatLabel.destroy(),
        });
        if (correct) {
          const chamberFlash = this.add.graphics().setDepth(-0.5);
          const chamberColor = ball.type === 'cold' ? 0x00BFFF : 0xFF6B35;
          chamberFlash.fillStyle(chamberColor, 0.18);
          if (ball.type === 'cold') {
            chamberFlash.fillRect(0, 0, PARTITION_X, GAME_H - UI_H);
          } else {
            chamberFlash.fillRect(PARTITION_X, 0, GAME_W - PARTITION_X, GAME_H - UI_H);
          }
          this.tweens.add({
            targets: chamberFlash,
            alpha: 0,
            duration: 150,
            onComplete: () => chamberFlash.destroy(),
          });
        }
      }
    }

    for (const ball of this.balls) {
      if (ball.justBounced) {
        const ringColor = ball.type === 'hot' ? 0xFF6B35 : 0x00BFFF;
        const ring = this.add.arc(PARTITION_X, ball.bounceY, 4, 0, 360, false);
        ring.setStrokeStyle(2, ringColor, 0.8).setAlpha(0.8);
        this.tweens.add({
          targets: ring,
          scaleX: 4.5,
          scaleY: 4.5,
          alpha: 0,
          duration: 220,
          onComplete: () => ring.destroy(),
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
    const sorted = cold + hot;
    const accuracy = this.balls.length > 0 ? sorted / this.balls.length : 0;
    this.guidanceText = maxThreat > 0.3
      ? '危険予兆: このまま開放で誤仕分け'
      : this.overdriveSecLeft > 0
        ? 'OVERDRIVE中: 高報酬だがミスで大減点'
        : this.timeLeft > 45
          ? '序盤: 正解1回を優先'
          : '精度とスコアの両立を狙う';
    this.updateMissions(elapsedSec, sorted, accuracy);
    this.hud.update(
      this.timeLeft,
      cold,
      hot,
      this.balls.length,
      holeOpen,
      this.score,
      this.overdriveSecLeft,
      this.overdriveCooldownSecLeft,
      this.guidanceText,
      this.missionStates,
    );
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
    this.valveStreamLeft?.stop();
    this.valveStreamRight?.stop();
    this.cameras.main.shake(300, 0.008);
    tryPlay(this, 'se_warning', { volume: 0.9 });

    const timeUpLabel = this.add.text(GAME_W / 2, (GAME_H - UI_H) / 2, 'T I M E   U P', {
      fontSize: '48px',
      color: '#FF3333',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0).setDepth(15);

    this.tweens.add({
      targets: timeUpLabel,
      alpha: 1,
      duration: 300,
      yoyo: true,
      hold: 500,
      onComplete: () => {
        const { cold, hot } = this.countSorted();
        this.scene.start('ResultScene', {
          sorted: cold + hot,
          total: this.balls.length,
          hotSorted: this.hotSorted,
          coldSorted: this.coldSorted,
          valveOpenMs: this.valveOpenMs,
          maxStreak: this.maxStreak,
          score: this.score,
          missionStates: this.missionStates,
          firstSuccessSec: this.firstSuccessSec,
          overdriveUsage: this.overdriveUsage,
          challengeProgress: this.updateChallengeProgress(cold + hot, this.balls.length),
        });
      },
    });
  }

  private getCurrentHoleSize(elapsedSec: number): number {
    const assistBonus = elapsedSec <= ONBOARDING_ASSIST_SEC ? 14 : 0;
    const overdriveBonus = this.overdriveSecLeft > 0 ? ACTION_PROFILE.overdrive.holeSizeBonus : 0;
    return HOLE_SIZE + assistBonus + overdriveBonus;
  }

  private isOverdriveTrigger(): boolean {
    const rightDown = this.input.mousePointer?.rightButtonDown() ?? false;
    const eDown = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E).isDown ?? false;
    return (rightDown || eDown) && this.overdriveSecLeft <= 0 && this.overdriveCooldownSecLeft <= 0;
  }

  private activateOverdrive() {
    this.overdriveSecLeft = ACTION_PROFILE.overdrive.durationSec;
    this.overdriveCooldownSecLeft = ACTION_PROFILE.overdrive.cooldownSec;
    this.overdriveUsage += 1;
    tryPlay(this, 'se_warning', { volume: 0.4 });
  }

  private updateMissions(elapsedSec: number, sorted: number, accuracy: number) {
    for (let i = 0; i < this.missionTriggersSec.length; i++) {
      if (this.missionStates[i]) continue;
      if (elapsedSec < this.missionTriggersSec[i]) continue;
      let success = false;
      if (i === 0) success = sorted >= 6;
      if (i === 1) success = this.maxStreak >= 5;
      if (i === 2) success = accuracy >= 0.6;
      this.missionStates[i] = success;
      this.showMissionToast(i + 1, success);
    }
  }

  private showMissionToast(index: number, success: boolean) {
    const label = this.add.text(GAME_W / 2, 78 + index * 22, success ? `MISSION ${index} COMPLETE` : `MISSION ${index} FAILED`, {
      fontSize: '12px',
      color: success ? '#00FF88' : '#FF6B35',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(12).setAlpha(0);
    this.tweens.add({
      targets: label,
      alpha: { from: 1, to: 0 },
      y: label.y - 10,
      duration: 900,
      onComplete: () => label.destroy(),
    });
  }

  private updateChallengeProgress(sorted: number, total: number) {
    const key = 'mxd_challenges_v1';
    const accuracy = total > 0 ? Math.round((sorted / total) * 100) : 0;
    const progress = {
      gradeA: accuracy >= 60,
      streak10: this.maxStreak >= 10,
      overdriveControl: this.overdriveUsage >= 3 && accuracy >= 50,
    };
    let previous = { gradeA: false, streak10: false, overdriveControl: false };
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as typeof previous;
        previous = {
          gradeA: Boolean(parsed.gradeA),
          streak10: Boolean(parsed.streak10),
          overdriveControl: Boolean(parsed.overdriveControl),
        };
      }
      const merged = {
        gradeA: previous.gradeA || progress.gradeA,
        streak10: previous.streak10 || progress.streak10,
        overdriveControl: previous.overdriveControl || progress.overdriveControl,
      };
      window.localStorage.setItem(key, JSON.stringify(merged));
      return merged;
    } catch {
      return {
        gradeA: previous.gradeA || progress.gradeA,
        streak10: previous.streak10 || progress.streak10,
        overdriveControl: previous.overdriveControl || progress.overdriveControl,
      };
    }
  }
}
