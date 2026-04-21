// Title screen scene with boot animation, launch controls, and briefing overlay.
import Phaser from 'phaser';
import { GAME_W, GAME_H, COLOR_BG, COLOR_HOLE, COLOR_PANEL_BORDER } from '../config';

const TEXT_PRIMARY = '#E6F1FF';
const TEXT_SECONDARY = '#4A6FA8';
const PANEL_FILL = 0x0E1A2E;
const PANEL_BORDER_ACTIVE = 0x1C2E44;
const FOOTER_LEFT = '© 1967 NORINORI LABS';
const HERO_LINE1 = "M A X W E L L ' S   D E M O N";
const HERO_LINE2 = 'S I M U L A T O R';
const BOOT_TOTAL_MS = 1200;
const CTA_W = 220;
const CTA_H = 36;
const CTA2_H = 32;
type AlphaTarget = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.AlphaSingle;

function tryPlay(scene: Phaser.Scene, key: string, config?: Phaser.Types.Sound.SoundConfig) {
  if (scene.cache.audio.has(key)) {
    scene.sound.play(key, config);
  }
}

export class TitleScene extends Phaser.Scene {
  private isBootComplete = false;
  private isTransitioning = false;
  private isBriefingOpen = false;
  private isCreditsOpen = false;
  private allTweens: Phaser.Tweens.Tween[] = [];
  private delayedCalls: Phaser.Time.TimerEvent[] = [];

  private scanlines!: Phaser.GameObjects.Graphics;
  private diagnosticsFillBars: Phaser.GameObjects.Graphics[] = [];
  private diagnosticsValueTexts: Phaser.GameObjects.Text[] = [];
  private diagnosticsTargets = [72, 61, 100];
  private diagnosticsBarMax = [160, 160, 160];
  private diagnosticsBarX = 0;
  private diagnosticsBarY = 0;
  private diagnosticsRowGap = 18;
  private diagnosticsBarHeight = 8;

  private statusText!: Phaser.GameObjects.Text;
  private footerRight!: Phaser.GameObjects.Text;

  private bootLog!: Phaser.GameObjects.Text;
  private titleElements: AlphaTarget[] = [];
  private ctaElements: AlphaTarget[] = [];

  private briefingLayer!: Phaser.GameObjects.Container;
  private creditsLayer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor(COLOR_BG);
    this.tryPlayTitleBgm();

    this.buildBaseLayout();
    this.buildBriefingOverlay();
    this.buildCreditsOverlay();
    this.startBootSequence();
    this.bindInputs();
  }

  private tryPlayTitleBgm() {
    if (this.cache.audio.has('bgm_title')) {
      this.sound.add('bgm_title', { loop: true, volume: 0.4 }).play();
    }
  }

  private buildBaseLayout() {
    const cx = GAME_W / 2;
    const cy = GAME_H / 2;

    this.scanlines = this.add.graphics().setAlpha(0);
    this.drawScanlines(this.scanlines);

    const topBorder = this.add.graphics();
    topBorder.lineStyle(1, COLOR_PANEL_BORDER);
    topBorder.strokeRect(20, 14, GAME_W - 40, 22);

    this.titleElements.push(
      topBorder,
      this.add.text(20, 18, 'MXD-001 · THERMODYNAMIC SORTING UNIT', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: TEXT_SECONDARY,
      }),
    );

    this.statusText = this.add.text(GAME_W - 20, 18, 'STATUS: ONLINE ●', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#00E5CC',
    }).setOrigin(1, 0);
    this.titleElements.push(this.statusText);

    this.titleElements.push(
      this.add.text(cx, cy - 70, HERO_LINE1, {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: TEXT_PRIMARY,
      }).setOrigin(0.5),
      this.add.text(cx, cy - 30, HERO_LINE2, {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: TEXT_PRIMARY,
      }).setOrigin(0.5),
      this.add.text(cx, cy + 2, '─'.repeat(32), {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#1E3A5F',
      }).setOrigin(0.5),
      this.add.text(cx, cy + 18, 'v1.0 · OPERATOR CONSOLE BUILD', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: TEXT_SECONDARY,
      }).setOrigin(0.5),
    );

    this.createButton(cx, cy + 60, CTA_W, CTA_H, '[ INITIATE  RUN ]', false, () => {
      this.startRun();
    });
    this.createButton(cx - 57, cy + 104, 106, CTA2_H, '[ BRIEFING ]', true, () => {
      this.showBriefingOverlay();
    });
    this.createButton(cx + 57, cy + 104, 106, CTA2_H, '[ CREDITS ]', true, () => {
      this.showCreditsOverlay();
    });

    this.titleElements.push(
      this.add.text(20, GAME_H - 14, FOOTER_LEFT, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: TEXT_SECONDARY,
      }),
    );

    this.footerRight = this.add.text(GAME_W - 20, GAME_H - 14, 'PRESS [ENTER] TO START', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#00E5CC',
    }).setOrigin(1, 0);
    this.titleElements.push(this.footerRight);

    this.createDiagnosticsPanel(cy);

    this.bootLog = this.add.text(cx, cy, 'SYSTEM BOOT...', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: TEXT_PRIMARY,
    }).setOrigin(0.5);

    for (const el of this.titleElements) {
      el.setAlpha(0);
    }
    for (const el of this.ctaElements) {
      el.setAlpha(0);
    }
  }

  private createDiagnosticsPanel(cy: number) {
    const panelX = 40;
    const panelY = cy + 130;
    const panelW = GAME_W - 80;
    const panelH = GAME_H - 40 - panelY;

    const panel = this.add.graphics();
    panel.fillStyle(PANEL_FILL, 1);
    panel.fillRect(panelX, panelY, panelW, panelH);
    panel.lineStyle(1, COLOR_PANEL_BORDER);
    panel.strokeRect(panelX, panelY, panelW, panelH);
    panel.lineStyle(1, COLOR_HOLE);
    panel.lineBetween(panelX + 8, panelY, panelX + 120, panelY);

    const panelTitle = this.add.text(panelX + 12, panelY - 9, ' DIAGNOSTICS ', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#00E5CC',
      backgroundColor: '#080D1A',
    });

    const labels = [
      'CHAMBER TEMP Δ:',
      'ENTROPY FLUX:  ',
      'DEMON LINK:    ',
    ];

    this.titleElements.push(panel, panelTitle);

    const baseY = panelY + 14;
    this.diagnosticsBarX = panelX + 156;
    this.diagnosticsBarY = baseY + 3;
    for (let i = 0; i < labels.length; i++) {
      const y = baseY + i * this.diagnosticsRowGap;
      const row = this.add.text(panelX + 14, y, labels[i], {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: TEXT_PRIMARY,
      });
      const barBg = this.add.graphics();
      barBg.fillStyle(0x1C2E44, 1);
      barBg.fillRect(this.diagnosticsBarX, y + 3, this.diagnosticsBarMax[i], this.diagnosticsBarHeight);
      const barFill = this.add.graphics();
      const value = this.add.text(panelX + 324, y, i < 2 ? '0%  ---' : 'OFFLINE', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: i < 2 ? TEXT_SECONDARY : '#00E5CC',
      });

      this.diagnosticsFillBars.push(barFill);
      this.diagnosticsValueTexts.push(value);
      this.titleElements.push(row, barBg, barFill, value);
    }
  }

  private createButton(
    cx: number,
    y: number,
    w: number,
    h: number,
    text: string,
    dim: boolean,
    onClick: () => void,
  ) {
    const btnBg = this.add.graphics();
    const btnText = this.add.text(cx, y, text, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: dim ? '#4A6FA8' : '#00E5CC',
    }).setOrigin(0.5);

    const drawBtn = (hover: boolean) => {
      btnBg.clear();
      const border = hover ? COLOR_HOLE : (dim ? PANEL_BORDER_ACTIVE : COLOR_HOLE);
      btnBg.lineStyle(1, border);
      btnBg.strokeRect(cx - w / 2, y - h / 2, w, h);
      if (hover) {
        btnBg.lineStyle(1, COLOR_HOLE, 0.35);
        btnBg.strokeRect(cx - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4);
      }
      btnText.setColor(hover ? '#00E5CC' : (dim ? '#4A6FA8' : '#00E5CC'));
    };

    drawBtn(false);

    const zone = this.add.zone(cx, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      drawBtn(true);
      tryPlay(this, 'se_valve_open', { volume: 0.3 });
    });
    zone.on('pointerout', () => {
      drawBtn(false);
    });
    zone.on('pointerup', () => {
      const wasBootComplete = this.isBootComplete;
      if (!wasBootComplete) {
        this.skipBootSequence();
        return;
      }
      onClick();
      tryPlay(this, 'se_valve_close', { volume: 0.6 });
    });

    this.titleElements.push(btnBg, btnText);
    this.ctaElements.push(btnBg, btnText);
  }

  private buildBriefingOverlay() {
    const cx = GAME_W / 2;
    const cy = GAME_H / 2;
    const panelW = 520;
    const panelH = 304;
    const panelX = cx - panelW / 2;
    const panelY = cy - panelH / 2;

    const bg = this.add.rectangle(0, 0, GAME_W, GAME_H, COLOR_BG, 0.92).setOrigin(0, 0);
    const panel = this.add.graphics();
    panel.fillStyle(PANEL_FILL, 1);
    panel.fillRect(panelX, panelY, panelW, panelH);
    panel.lineStyle(1, COLOR_PANEL_BORDER);
    panel.strokeRect(panelX, panelY, panelW, panelH);

    const body = this.add.text(panelX + 28, panelY + 22,
`OPERATOR BRIEFING ─────────────────────────

OBJECTIVE
  Sort hot particles → RIGHT chamber
  Sort cold particles → LEFT chamber

CONTROLS
   HOLD    mouse / touch      open valve
   MOVE    pointer vertical   aim aperture
   RELEASE                    seal valve
   TAP E / RIGHT CLICK        OVERDRIVE (high risk / high reward)

TIME LIMIT   60.0 s
GRADES       S ≥80%   A ≥60%   B ≥40%   C <40%`, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: TEXT_PRIMARY,
      lineSpacing: 4,
    });

    const closeBg = this.add.graphics();
    const closeY = panelY + panelH - 28;
    const closeText = this.add.text(cx, closeY, '[ CLOSE ] (ESC)', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#4A6FA8',
    }).setOrigin(0.5);
    const closeW = 170;
    const closeH = 32;
    const closeDraw = (hover: boolean) => {
      closeBg.clear();
      closeBg.lineStyle(1, hover ? COLOR_HOLE : PANEL_BORDER_ACTIVE);
      closeBg.strokeRect(cx - closeW / 2, closeY - closeH / 2, closeW, closeH);
      if (hover) {
        closeBg.lineStyle(1, COLOR_HOLE, 0.3);
        closeBg.strokeRect(cx - closeW / 2 - 2, closeY - closeH / 2 - 2, closeW + 4, closeH + 4);
      }
      closeText.setColor(hover ? '#00E5CC' : '#4A6FA8');
    };
    closeDraw(false);

    const closeZone = this.add.zone(cx, closeY, closeW, closeH).setInteractive({ useHandCursor: true });
    closeZone.on('pointerover', () => closeDraw(true));
    closeZone.on('pointerout', () => closeDraw(false));
    closeZone.on('pointerup', () => this.hideBriefingOverlay());

    this.briefingLayer = this.add.container(0, 0, [bg, panel, body, closeBg, closeText, closeZone]);
    this.briefingLayer.setDepth(20).setAlpha(0).setVisible(false);
  }

  private startBootSequence() {
    const steps: Array<{ at: number; fn: () => void }> = [
      { at: 150, fn: () => this.bootLog.setText('[1/3] LINKING DEMON...').setColor(TEXT_SECONDARY) },
      { at: 300, fn: () => this.bootLog.setText('[2/3] CALIBRATING CHAMBERS...').setColor(TEXT_SECONDARY) },
      { at: 500, fn: () => this.bootLog.setText('[3/3] READY.').setColor('#00E5CC') },
      {
        at: 700,
        fn: () => {
          this.bootLog.setVisible(false);
          this.tween(this.titleElements, { alpha: 1 }, 200);
          this.startDiagnosticsSweep();
        },
      },
      { at: 1000, fn: () => this.tween(this.ctaElements, { alpha: 1 }, 180) },
      { at: BOOT_TOTAL_MS, fn: () => this.completeBoot() },
    ];

    this.tween(this.scanlines, { alpha: 0.04 }, 150);

    for (const step of steps) {
      const evt = this.time.delayedCall(step.at, step.fn);
      this.delayedCalls.push(evt);
    }
  }

  private startDiagnosticsSweep() {
    const statuses = ['NOMINAL', 'STABLE', 'ONLINE'];
    for (let i = 0; i < this.diagnosticsFillBars.length; i++) {
      const target = this.diagnosticsTargets[i];
      const maxW = this.diagnosticsBarMax[i];
      this.tweenCounter(0, target, 400, 700, (v) => {
        const pct = Math.round(v);
        const bar = this.diagnosticsFillBars[i];
        bar.clear();
        bar.fillStyle(COLOR_HOLE, 1);
        bar.fillRect(
          this.diagnosticsBarX,
          this.diagnosticsBarY + i * this.diagnosticsRowGap,
          maxW * (pct / 100),
          this.diagnosticsBarHeight,
        );
        if (i < 2) {
          this.diagnosticsValueTexts[i].setText(`${pct}%  ${statuses[i]}`).setColor(pct > 0 ? '#00E5CC' : TEXT_SECONDARY);
        } else {
          this.diagnosticsValueTexts[i].setText(`${statuses[i]}`).setColor('#00E5CC');
        }
      });
    }
  }

  private bindInputs() {
    this.input.on('pointerdown', () => {
      if (!this.isBootComplete) {
        this.skipBootSequence();
      }
    });

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (!this.isBootComplete) {
        this.skipBootSequence();
        return;
      }

      if (this.isBriefingOpen || this.isCreditsOpen) {
        if (e.code === 'Escape') {
          if (this.isBriefingOpen) {
            this.hideBriefingOverlay();
          }
          if (this.isCreditsOpen) {
            this.hideCreditsOverlay();
          }
        }
        return;
      }

      if (e.code === 'Enter' || e.code === 'Space') {
        this.startRun();
      } else if (e.code === 'KeyH') {
        this.showBriefingOverlay();
      } else if (e.code === 'KeyC') {
        this.showCreditsOverlay();
      }
    });
  }

  private skipBootSequence() {
    if (this.isBootComplete) return;

    for (const tween of this.allTweens) {
      tween.stop();
    }
    this.allTweens = [];
    for (const evt of this.delayedCalls) {
      evt.remove(false);
    }
    this.delayedCalls = [];

    this.scanlines.setAlpha(0.04);
    this.bootLog.setVisible(false);
    for (const el of this.titleElements) {
      el.setAlpha(1);
    }
    for (const el of this.ctaElements) {
      el.setAlpha(1);
    }

    const statuses = ['NOMINAL', 'STABLE', 'ONLINE'];
    for (let i = 0; i < this.diagnosticsFillBars.length; i++) {
      const bar = this.diagnosticsFillBars[i];
      const target = this.diagnosticsTargets[i];
      const maxW = this.diagnosticsBarMax[i];
      bar.clear();
      bar.fillStyle(COLOR_HOLE, 1);
      bar.fillRect(
        this.diagnosticsBarX,
        this.diagnosticsBarY + i * this.diagnosticsRowGap,
        maxW * (target / 100),
        this.diagnosticsBarHeight,
      );
      if (i < 2) {
        this.diagnosticsValueTexts[i].setText(`${target}%  ${statuses[i]}`).setColor('#00E5CC');
      } else {
        this.diagnosticsValueTexts[i].setText(statuses[i]).setColor('#00E5CC');
      }
    }

    this.completeBoot();
  }

  private completeBoot() {
    if (this.isBootComplete) return;
    this.isBootComplete = true;

    this.tween(this.statusText, { alpha: 0.3 }, 450, 0, -1, true);
    this.tween(this.footerRight, { alpha: 0.2 }, 300, 0, -1, true);
  }

  private showBriefingOverlay() {
    if (!this.isBootComplete || this.isBriefingOpen || this.isCreditsOpen || this.isTransitioning) return;
    this.isBriefingOpen = true;
    this.briefingLayer.setVisible(true).setAlpha(0);
    this.tween(this.briefingLayer, { alpha: 1 }, 180);
    tryPlay(this, 'se_valve_open', { volume: 0.3 });
  }

  private hideBriefingOverlay() {
    if (!this.isBriefingOpen) return;
    this.isBriefingOpen = false;
    this.tween(this.briefingLayer, { alpha: 0 }, 160, 0, 0, false, () => {
      this.briefingLayer.setVisible(false);
    });
    tryPlay(this, 'se_valve_close', { volume: 0.6 });
  }

  private buildCreditsOverlay() {
    const cx = GAME_W / 2;
    const cy = GAME_H / 2;
    const panelW = 520;
    const panelH = 304;
    const panelX = cx - panelW / 2;
    const panelY = cy - panelH / 2;

    const bg = this.add.rectangle(0, 0, GAME_W, GAME_H, COLOR_BG, 0.92).setOrigin(0, 0);
    const panel = this.add.graphics();
    panel.fillStyle(PANEL_FILL, 1);
    panel.fillRect(panelX, panelY, panelW, panelH);
    panel.lineStyle(1, COLOR_PANEL_BORDER);
    panel.strokeRect(panelX, panelY, panelW, panelH);

    const body = this.add.text(panelX + 28, panelY + 22,
`CREDITS ──────────────────────────────────

CREATED BY
  norinori1
  NORINORI LABS

TECH STACK
  Phaser 3
  TypeScript
  Vite

AUDIO
  Optional sound assets: public/sounds/*
  Attribution notes: docs/audio-spec.md

© 2026 NORINORI LABS`, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: TEXT_PRIMARY,
      lineSpacing: 4,
    });

    const closeBg = this.add.graphics();
    const closeY = panelY + panelH - 28;
    const closeText = this.add.text(cx, closeY, '[ CLOSE ] (ESC)', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#4A6FA8',
    }).setOrigin(0.5);
    const closeW = 170;
    const closeH = 32;
    const closeDraw = (hover: boolean) => {
      closeBg.clear();
      closeBg.lineStyle(1, hover ? COLOR_HOLE : PANEL_BORDER_ACTIVE);
      closeBg.strokeRect(cx - closeW / 2, closeY - closeH / 2, closeW, closeH);
      if (hover) {
        closeBg.lineStyle(1, COLOR_HOLE, 0.3);
        closeBg.strokeRect(cx - closeW / 2 - 2, closeY - closeH / 2 - 2, closeW + 4, closeH + 4);
      }
      closeText.setColor(hover ? '#00E5CC' : '#4A6FA8');
    };
    closeDraw(false);

    const closeZone = this.add.zone(cx, closeY, closeW, closeH).setInteractive({ useHandCursor: true });
    closeZone.on('pointerover', () => closeDraw(true));
    closeZone.on('pointerout', () => closeDraw(false));
    closeZone.on('pointerup', () => this.hideCreditsOverlay());

    this.creditsLayer = this.add.container(0, 0, [bg, panel, body, closeBg, closeText, closeZone]);
    this.creditsLayer.setDepth(20).setAlpha(0).setVisible(false);
  }

  private showCreditsOverlay() {
    if (!this.isBootComplete || this.isCreditsOpen || this.isBriefingOpen || this.isTransitioning) return;
    this.isCreditsOpen = true;
    this.creditsLayer.setVisible(true).setAlpha(0);
    this.tween(this.creditsLayer, { alpha: 1 }, 180);
    tryPlay(this, 'se_valve_open', { volume: 0.3 });
  }

  private hideCreditsOverlay() {
    if (!this.isCreditsOpen) return;
    this.isCreditsOpen = false;
    this.tween(this.creditsLayer, { alpha: 0 }, 160, 0, 0, false, () => {
      this.creditsLayer.setVisible(false);
    });
    tryPlay(this, 'se_valve_close', { volume: 0.6 });
  }

  private startRun() {
    if (!this.isBootComplete || this.isTransitioning || this.isBriefingOpen || this.isCreditsOpen) return;
    this.isTransitioning = true;
    this.input.enabled = false;
    this.sound.stopAll();
    this.scene.start('GameScene');
  }

  private drawScanlines(target: Phaser.GameObjects.Graphics) {
    target.clear();
    target.fillStyle(0xE6F1FF, 1);
    for (let y = 0; y < GAME_H; y += 4) {
      target.fillRect(0, y, GAME_W, 2);
    }
  }

  private tween(
    targets: unknown,
    values: Record<string, unknown>,
    duration: number,
    delay = 0,
    repeat = 0,
    yoyo = false,
    onComplete?: () => void,
  ): Phaser.Tweens.Tween {
    const tween = this.tweens.add({
      targets,
      ...values,
      duration,
      delay,
      repeat,
      yoyo,
      onComplete,
    });
    this.allTweens.push(tween);
    return tween;
  }

  private tweenCounter(from: number, to: number, duration: number, delay: number, onUpdate: (value: number) => void) {
    const tween = this.tweens.addCounter({
      from,
      to,
      duration,
      delay,
      onUpdate: (tw) => {
        onUpdate(tw.getValue() ?? 0);
      },
    });
    this.allTweens.push(tween);
  }
}
