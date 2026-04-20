import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import { GAME_W, GAME_H, COLOR_BG } from './config';

const MOBILE_BREAKPOINT = 768;
const MOBILE_RESERVED_HEIGHT = 190;
const DESKTOP_RESERVED_HEIGHT = 140;
const VIEWPORT_PADDING = 32;
const MIN_GAME_WIDTH = 280;
const MIN_GAME_HEIGHT = 220;
const MIN_SCALE_FACTOR = 0.5;

function resizeGameContainer() {
  const container = document.getElementById('game');
  if (!container) return;

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const reservedH = viewportW <= MOBILE_BREAKPOINT
    ? MOBILE_RESERVED_HEIGHT
    : DESKTOP_RESERVED_HEIGHT;
  const availableW = Math.max(MIN_GAME_WIDTH, viewportW - VIEWPORT_PADDING);
  const availableH = Math.max(MIN_GAME_HEIGHT, viewportH - reservedH);
  const scale = Math.max(
    MIN_SCALE_FACTOR,
    Math.min(availableW / GAME_W, availableH / GAME_H),
  );

  container.style.width = `${Math.floor(GAME_W * scale)}px`;
  container.style.height = `${Math.floor(GAME_H * scale)}px`;
}

resizeGameContainer();
let resizeRafId = 0;
const scheduleResize = () => {
  if (resizeRafId !== 0) return;
  resizeRafId = window.requestAnimationFrame(() => {
    resizeRafId = 0;
    resizeGameContainer();
  });
};
window.addEventListener('resize', scheduleResize);
window.addEventListener('orientationchange', scheduleResize);

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
  scene: [PreloadScene, TitleScene, GameScene, ResultScene],
};

new Phaser.Game(config);
