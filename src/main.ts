import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import { GAME_W, GAME_H, COLOR_BG } from './config';

function resizeGameContainer() {
  const container = document.getElementById('game');
  if (!container) return;

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const reservedH = viewportW <= 768 ? 190 : 240;
  const availableW = Math.max(280, viewportW - 32);
  const availableH = Math.max(220, viewportH - reservedH);
  const scale = Math.max(0.5, Math.min(availableW / GAME_W, availableH / GAME_H));

  container.style.width = `${Math.floor(GAME_W * scale)}px`;
  container.style.height = `${Math.floor(GAME_H * scale)}px`;
}

resizeGameContainer();
window.addEventListener('resize', resizeGameContainer);
window.addEventListener('orientationchange', resizeGameContainer);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  backgroundColor: COLOR_BG,
  parent: 'game',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PreloadScene, GameScene, ResultScene],
};

new Phaser.Game(config);
