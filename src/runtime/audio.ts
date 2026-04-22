import Phaser from 'phaser';

export const AUDIO_MANIFEST = {
  bgm_game: 'sounds/bgm_game.ogg',
  bgm_title: 'sounds/bgm_title.ogg',
  bgm_result: 'sounds/bgm_result.ogg',
  se_valve_open: 'sounds/se_valve_open.mp3',
  se_valve_close: 'sounds/se_valve_close.mp3',
  se_ball_pass: 'sounds/se_ball_pass.mp3',
  se_warning: 'sounds/se_warning.mp3',
} as const;

export type AudioKey = keyof typeof AUDIO_MANIFEST;

interface PlayAudioOptions {
  rateLimitMs?: number;
  lazyLoad?: boolean;
  playOnLoad?: boolean;
}

const loadingByGame = new WeakMap<Phaser.Game, Set<AudioKey>>();
const lastPlayByGame = new WeakMap<Phaser.Game, Map<AudioKey, number>>();

function getLoadingSet(game: Phaser.Game): Set<AudioKey> {
  let set = loadingByGame.get(game);
  if (!set) {
    set = new Set<AudioKey>();
    loadingByGame.set(game, set);
  }
  return set;
}

function getLastPlayMap(game: Phaser.Game): Map<AudioKey, number> {
  let map = lastPlayByGame.get(game);
  if (!map) {
    map = new Map<AudioKey, number>();
    lastPlayByGame.set(game, map);
  }
  return map;
}

export function preloadOptionalAudio(scene: Phaser.Scene, keys: AudioKey[] = Object.keys(AUDIO_MANIFEST) as AudioKey[]) {
  for (const key of keys) {
    if (!scene.cache.audio.has(key)) {
      scene.load.audio(key, AUDIO_MANIFEST[key]);
    }
  }
}

export function ensureAudioLoaded(scene: Phaser.Scene, key: AudioKey, onLoaded?: () => void): boolean {
  if (scene.cache.audio.has(key)) {
    onLoaded?.();
    return true;
  }

  if (onLoaded) {
    scene.load.once(`filecomplete-audio-${key}`, onLoaded);
  }

  const loading = getLoadingSet(scene.game);
  if (loading.has(key)) {
    return false;
  }

  loading.add(key);
  scene.load.audio(key, AUDIO_MANIFEST[key]);
  scene.load.once(`filecomplete-audio-${key}`, () => loading.delete(key));
  scene.load.once('loaderror', (file: unknown) => {
    if (typeof file === 'object' && file !== null && 'key' in file && (file as { key?: unknown }).key === key) {
      loading.delete(key);
    }
  });
  if (!scene.load.isLoading()) {
    scene.load.start();
  }
  return false;
}

export function playAudio(
  scene: Phaser.Scene,
  key: AudioKey,
  config?: Phaser.Types.Sound.SoundConfig,
  options: PlayAudioOptions = {},
): boolean {
  const {
    rateLimitMs = 0,
    lazyLoad = true,
    playOnLoad = true,
  } = options;

  const now = scene.time.now;
  const lastMap = getLastPlayMap(scene.game);
  const lastPlay = lastMap.get(key) ?? Number.NEGATIVE_INFINITY;
  if (rateLimitMs > 0 && now - lastPlay < rateLimitMs) {
    return false;
  }

  if (scene.cache.audio.has(key)) {
    scene.sound.play(key, config);
    lastMap.set(key, now);
    return true;
  }

  if (!lazyLoad) {
    return false;
  }

  ensureAudioLoaded(
    scene,
    key,
    playOnLoad
      ? () => {
        if (!scene.sys.settings.active) return;
        const loadedNow = scene.time.now;
        const lastLoadedPlay = lastMap.get(key) ?? Number.NEGATIVE_INFINITY;
        if (rateLimitMs > 0 && loadedNow - lastLoadedPlay < rateLimitMs) return;
        scene.sound.play(key, config);
        lastMap.set(key, loadedNow);
      }
      : undefined,
  );
  return false;
}

export function startLoopingBgm(
  scene: Phaser.Scene,
  key: AudioKey,
  config: Phaser.Types.Sound.SoundConfig,
  onStart: (bgm: Phaser.Sound.BaseSound) => void,
) {
  const start = () => {
    if (!scene.sys.settings.active) return;
    const bgm = scene.sound.add(key, config);
    bgm.play();
    onStart(bgm);
  };

  if (!ensureAudioLoaded(scene, key, start)) {
    return;
  }
  start();
}

export function bindVisibilityBgm(scene: Phaser.Scene, getBgm: () => Phaser.Sound.BaseSound | undefined) {
  const onVisibilityChange = () => {
    const bgm = getBgm();
    if (!bgm) return;
    if (document.hidden) {
      if (bgm.isPlaying) {
        bgm.pause();
      }
      return;
    }
    if (bgm.isPaused) {
      bgm.resume();
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  const cleanup = () => document.removeEventListener('visibilitychange', onVisibilityChange);
  scene.events.once('shutdown', cleanup);
  scene.events.once('destroy', cleanup);
}

