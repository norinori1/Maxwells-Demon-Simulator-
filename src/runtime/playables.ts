import Phaser from 'phaser';

const REGISTRY_KEY = '__playablesConfig';

export interface PlayablesConfig {
  enabled: boolean;
  hudUpdateIntervalMs: number;
  threatUpdateIntervalMs: number;
  sfxRateLimitMs: number;
  preloadAudioOnBoot: boolean;
}

function hasPlayablesFlag(search: string): boolean {
  try {
    return new URLSearchParams(search).get('playables') === '1';
  } catch {
    return false;
  }
}

export function createPlayablesConfig(search = window.location.search): PlayablesConfig {
  const enabled = hasPlayablesFlag(search);
  return {
    enabled,
    hudUpdateIntervalMs: enabled ? 33 : 0,
    threatUpdateIntervalMs: enabled ? 33 : 0,
    sfxRateLimitMs: enabled ? 70 : 0,
    preloadAudioOnBoot: !enabled,
  };
}

export const PLAYABLES_CONFIG = Object.freeze(createPlayablesConfig());

export function registerPlayablesConfig(game: Phaser.Game, config = PLAYABLES_CONFIG) {
  game.registry.set(REGISTRY_KEY, config);
}

export function getPlayablesConfig(scene?: Phaser.Scene): PlayablesConfig {
  if (scene) {
    const fromRegistry = scene.game.registry.get(REGISTRY_KEY) as PlayablesConfig | undefined;
    if (fromRegistry) {
      return fromRegistry;
    }
  }
  return PLAYABLES_CONFIG;
}

