import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // particle texture
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture('particle', 4, 4);
    g.destroy();

    // audio — gracefully skip missing files
    const tryLoad = (key: string, path: string) => {
      this.load.once(`filecomplete-audio-${key}`, () => {});
      this.load.audio(key, path);
    };
    tryLoad('bgm_game',        'sounds/bgm_game.ogg');
    tryLoad('bgm_result',      'sounds/bgm_result.ogg');
    tryLoad('se_valve_open',   'sounds/se_valve_open.wav');
    tryLoad('se_valve_close',  'sounds/se_valve_close.wav');
    tryLoad('se_ball_pass',    'sounds/se_ball_pass.wav');
    tryLoad('se_warning',      'sounds/se_warning.wav');
  }

  create() {
    this.scene.start('GameScene');
  }
}
