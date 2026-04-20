import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // no external assets — all drawn procedurally
  }

  create() {
    this.scene.start('GameScene');
  }
}
