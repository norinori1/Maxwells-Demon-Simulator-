import Phaser from 'phaser';
import { Ball } from '../objects/Ball';
import { Partition } from '../objects/Partition';
import { HUD } from '../ui/HUD';
import { bindVisibilityBgm, playAudio, startLoopingBgm } from '../runtime/audio';
import { getPlayablesConfig, type PlayablesConfig } from '../runtime/playables';
import {
  GAME_W, GAME_H, UI_H,
  PARTITION_X, HOLE_SIZE,
  BALL_COUNT, TIME_LIMIT,
  BALL_RADIUS, COLOR_GRID,
  ACTION_PROFILE, ONBOARDING_ASSIST_SEC, ONBOARDING_AUTOVALVE_SEC,
  TELEGRAPH_WINDOW_MIN_SEC, TELEGRAPH_WINDOW_MAX_SEC,
} from '../config';

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
  private playables!: PlayablesConfig;
  private overdriveKey?: Phaser.Input.Keyboard.Key;
  private sfxRateLimitMs = 0;
  private valveOpenMs = 0;
  private hotSorted = 0;
  private coldSorted = 0;
  private currentStreak = 0;
  private maxStreak = 0;
  private valveStreamLeft?: Phaser.GameObjects.Particles.ParticleEmitter;
  private valveStreamRight?: Phaser.GameObjects.Particles.ParticleEmitter;
  private valveBurstLeft?: Phaser.GameObjects.Particles.ParticleEmitter;
  private valveBurstRight?: Phaser.GameObjects.Particles.ParticleEmitter;
  private hudUpdateAccumulatorMs = 0;
  private threatUpdateAccumulatorMs = 0;
  private lastMaxThreat = 0;
  private passFlashPool: Phaser.GameObjects.Arc[] = [];
  private passFlashCursor = 0;
  private scoreLabelPool: Phaser.GameObjects.Text[] = [];
  private scoreLabelCursor = 0;
  private chamberFlashPool: Phaser.GameObjects.Graphics[] = [];
  private chamberFlashCursor = 0;
  private bounceRingPool: Phaser.GameObjects.Arc[] = [];
  private bounceRingCursor = 0;
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
    this.hudUpdateAccumulatorMs = 0;
    this.threatUpdateAccumulatorMs = 0;
    this.lastMaxThreat = 0;
    this.playables = getPlayablesConfig(this);
    this.sfxRateLimitMs = this.playables.sfxRateLimitMs;

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
    this.overdriveKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.partition = new Partition(this);
    this.spawnBalls();
    this.hud = new HUD(this);
    this.initializeFxPools();
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
    this.valveBurstLeft = this.add.particles(PARTITION_X, GAME_H / 2, 'particle', {
      speed: { min: 30, max: 70 },
      angle: { min: 160, max: 200 },
      lifespan: 350,
      quantity: 8,
      tint: [0x00E5CC, 0x5D8FAA],
      scale: { start: 1, end: 0 },
      emitting: false,
    });
    this.valveBurstRight = this.add.particles(PARTITION_X, GAME_H / 2, 'particle', {
      speed: { min: 30, max: 70 },
      angle: { min: -20, max: 20 },
      lifespan: 350,
      quantity: 8,
      tint: [0x00E5CC, 0x5D8FAA],
      scale: { start: 1, end: 0 },
      emitting: false,
    });

    // vignette overlay (starts invisible, fades in at low time)
    this.vignette = this.add.graphics().setDepth(10);
    this.vignette.fillStyle(0xFF0000, 1);
    this.vignette.fillRect(0, 0, GAME_W, GAME_H);
    this.vignette.setAlpha(0);

    this.hud.showCountdown(() => {
      // BGM starts when play starts
      startLoopingBgm(this, 'bgm_game', { loop: true, volume: 0.5 }, (bgm) => {
        this.bgm = bgm;
      });
      bindVisibilityBgm(this, () => this.bgm);
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

  private initializeFxPools() {
    this.passFlashPool = [];
    this.scoreLabelPool = [];
    this.chamberFlashPool = [];
    this.bounceRingPool = [];
    this.passFlashCursor = 0;
    this.scoreLabelCursor = 0;
    this.chamberFlashCursor = 0;
    this.bounceRingCursor = 0;

    for (let i = 0; i < 18; i++) {
      this.passFlashPool.push(this.add.arc(0, 0, BALL_RADIUS * 2.5, 0, 360, false, 0x00FF88).setAlpha(0).setVisible(false));
      this.scoreLabelPool.push(
        this.add.text(0, 0, '', {
          fontSize: '14px',
          color: '#00FF88',
          fontFamily: 'monospace',
        }).setOrigin(0.5).setDepth(5).setAlpha(0).setVisible(false),
      );
      this.bounceRingPool.push(
        this.add.arc(0, 0, 4, 0, 360, false).setStrokeStyle(2, 0x00BFFF, 0.8).setAlpha(0).setVisible(false),
      );
    }

    for (let i = 0; i < 8; i++) {
      this.chamberFlashPool.push(this.add.graphics().setDepth(-0.5).setAlpha(0).setVisible(false));
    }
  }

  private playPassFlash(x: number, y: number, color: number) {
    const flash = this.passFlashPool[this.passFlashCursor];
    this.passFlashCursor = (this.passFlashCursor + 1) % this.passFlashPool.length;
    this.tweens.killTweensOf(flash);
    flash.setFillStyle(color, 1);
    flash.setPosition(x, y);
    flash.setAlpha(0.9);
    flash.setVisible(true);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.setVisible(false),
    });
  }

  private playScoreLabel(x: number, y: number, text: string, color: string) {
    const label = this.scoreLabelPool[this.scoreLabelCursor];
    this.scoreLabelCursor = (this.scoreLabelCursor + 1) % this.scoreLabelPool.length;
    this.tweens.killTweensOf(label);
    label.setPosition(x, y - 10);
    label.setText(text);
    label.setColor(color);
    label.setAlpha(1);
    label.setVisible(true);
    this.tweens.add({
      targets: label,
      y: y - 38,
      alpha: 0,
      duration: 500,
      onComplete: () => label.setVisible(false),
    });
  }

  private playChamberFlash(type: 'hot' | 'cold') {
    const chamberFlash = this.chamberFlashPool[this.chamberFlashCursor];
    this.chamberFlashCursor = (this.chamberFlashCursor + 1) % this.chamberFlashPool.length;
    this.tweens.killTweensOf(chamberFlash);
    chamberFlash.clear();
    chamberFlash.setVisible(true);
    chamberFlash.setAlpha(1);
    const chamberColor = type === 'cold' ? 0x00BFFF : 0xFF6B35;
    chamberFlash.fillStyle(chamberColor, 0.18);
    if (type === 'cold') {
      chamberFlash.fillRect(0, 0, PARTITION_X, GAME_H - UI_H);
    } else {
      chamberFlash.fillRect(PARTITION_X, 0, GAME_W - PARTITION_X, GAME_H - UI_H);
    }
    this.tweens.add({
      targets: chamberFlash,
      alpha: 0,
      duration: 150,
      onComplete: () => chamberFlash.setVisible(false),
    });
  }

  private playBounceRing(y: number, color: number) {
    const ring = this.bounceRingPool[this.bounceRingCursor];
    this.bounceRingCursor = (this.bounceRingCursor + 1) % this.bounceRingPool.length;
    this.tweens.killTweensOf(ring);
    ring.setPosition(PARTITION_X, y);
    ring.setStrokeStyle(2, color, 0.8);
    ring.setScale(1);
    ring.setAlpha(0.8);
    ring.setVisible(true);
    this.tweens.add({
      targets: ring,
      scaleX: 4.5,
      scaleY: 4.5,
      alpha: 0,
      duration: 220,
      onComplete: () => ring.setVisible(false),
    });
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
    const pointerIsDown = this.pointer.isDown;
    const pointerY = this.pointer.y;
    const holeOpen = pointerIsDown || assistAutoValve;
    const holeSize = this.getCurrentHoleSize(elapsedSec);
    const holeY = Phaser.Math.Clamp(
      pointerY,
      holeSize / 2,
      GAME_H - UI_H - holeSize / 2,
    );
    const shouldRefreshThreat = !this.playables.enabled || this.shouldRunThreatRefresh(delta);
    const shouldRefreshHud = !this.playables.enabled || this.shouldRunHudRefresh(delta);

    // valve SFX + particle burst on open/close edges
    if (holeOpen && !this.prevHoleOpen) {
      playAudio(this, 'se_valve_open', { volume: 0.6 }, { rateLimitMs: this.sfxRateLimitMs });
      this.valveBurstLeft?.setPosition(PARTITION_X, holeY);
      this.valveBurstRight?.setPosition(PARTITION_X, holeY);
      this.valveBurstLeft?.explode(8);
      this.valveBurstRight?.explode(8);
    }
    if (!holeOpen && this.prevHoleOpen) {
      playAudio(this, 'se_valve_close', { volume: 0.5 }, { rateLimitMs: this.sfxRateLimitMs });
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
    let maxThreat = shouldRefreshThreat ? 0 : this.lastMaxThreat;
    for (const ball of this.balls) {
      ball.setSpeedMultiplier(speedMult);
      ball.updateWithHoleSize(dt, holeOpen, holeY, holeSize);
      if (shouldRefreshThreat) {
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
    }
    if (shouldRefreshThreat) {
      this.lastMaxThreat = maxThreat;
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
        playAudio(this, correct ? 'se_ball_pass' : 'se_valve_close', { volume: 0.4 }, { rateLimitMs: this.sfxRateLimitMs });
        const flashColor = correct ? 0x00FF88 : 0xFF3333;
        this.playPassFlash(ball.x, ball.y, flashColor);
        this.playScoreLabel(
          ball.x,
          ball.y,
          scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}`,
          correct ? '#00FF88' : '#FF3333',
        );
        if (correct) {
          this.playChamberFlash(ball.type);
        }
      }
    }

    for (const ball of this.balls) {
      if (ball.justBounced) {
        const ringColor = ball.type === 'hot' ? 0xFF6B35 : 0x00BFFF;
        this.playBounceRing(ball.bounceY, ringColor);
      }
    }

    // warning SFX + vignette at <10s
    if (this.timeLeft < 10 && !this.vignetteStarted) {
      this.vignetteStarted = true;
      this.tweens.add({ targets: this.vignette, alpha: 0.12, duration: 800 });
    }
    if (this.timeLeft < 10 && !this.warningSounded) {
      this.warningSounded = true;
      playAudio(this, 'se_warning', { volume: 0.7 }, { rateLimitMs: this.sfxRateLimitMs });
    }

    if (shouldRefreshHud) {
      const { cold, hot } = this.countSorted();
      this.coldSorted = cold;
      this.hotSorted = hot;
      const sorted = cold + hot;
      const accuracy = this.balls.length > 0 ? sorted / this.balls.length : 0;
      this.guidanceText = this.lastMaxThreat > 0.3
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
  }

  private shouldRunThreatRefresh(delta: number): boolean {
    this.threatUpdateAccumulatorMs += delta;
    if (this.threatUpdateAccumulatorMs < this.playables.threatUpdateIntervalMs) {
      return false;
    }
    this.threatUpdateAccumulatorMs = 0;
    return true;
  }

  private shouldRunHudRefresh(delta: number): boolean {
    this.hudUpdateAccumulatorMs += delta;
    if (this.hudUpdateAccumulatorMs < this.playables.hudUpdateIntervalMs) {
      return false;
    }
    this.hudUpdateAccumulatorMs = 0;
    return true;
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
    playAudio(this, 'se_warning', { volume: 0.9 }, { rateLimitMs: this.sfxRateLimitMs });

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
    const eDown = this.overdriveKey?.isDown ?? false;
    return (rightDown || eDown) && this.overdriveSecLeft <= 0 && this.overdriveCooldownSecLeft <= 0;
  }

  private activateOverdrive() {
    this.overdriveSecLeft = ACTION_PROFILE.overdrive.durationSec;
    this.overdriveCooldownSecLeft = ACTION_PROFILE.overdrive.cooldownSec;
    this.overdriveUsage += 1;
    playAudio(this, 'se_warning', { volume: 0.4 }, { rateLimitMs: this.sfxRateLimitMs });
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
