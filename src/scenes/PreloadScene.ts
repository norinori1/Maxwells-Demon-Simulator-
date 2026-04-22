import Phaser from 'phaser';
import { preloadOptionalAudio } from '../runtime/audio';
import { getPlayablesConfig } from '../runtime/playables';

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

    const playables = getPlayablesConfig(this);
    if (playables.preloadAudioOnBoot) {
      preloadOptionalAudio(this);
    } else {
      preloadOptionalAudio(this, ['bgm_title', 'se_valve_open', 'se_valve_close']);
    }
  }

  create() {
    this.scene.start('TitleScene');
  }
}
