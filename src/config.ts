export const GAME_W = 680;
export const GAME_H = 420;
export const UI_H = 44;
export const PARTITION_X = 340;
export const HOLE_SIZE = 58;
export const BALL_RADIUS = 7;
export const BALL_COUNT = 11;
export const TIME_LIMIT = 60;

export const HOT_SPEED_MIN = 1.9;
export const HOT_SPEED_MAX = 3.4;
export const COLD_SPEED_MIN = 1.0;
export const COLD_SPEED_MAX = 2.0;

export const COLOR_HOT       = 0xFF6B35;
export const COLOR_COLD      = 0x00BFFF;
export const COLOR_BG        = 0x080D1A;
export const COLOR_PARTITION = 0x1C2E44;
export const COLOR_HOLE      = 0x00E5CC;

export const COLOR_GRID         = 0x101A2E;
export const COLOR_AMBER        = 0xFF8C00;
export const COLOR_PANEL_BORDER = 0x1E3A5F;

export const ACTION_PROFILE = {
  normal: {
    scoreReward: 1,
    scorePenalty: -1,
    holeSizeBonus: 0,
  },
  overdrive: {
    scoreReward: 3,
    scorePenalty: -2,
    holeSizeBonus: 22,
    durationSec: 2.6,
    cooldownSec: 8.0,
  },
} as const;

export const ONBOARDING_ASSIST_SEC = 10;
export const ONBOARDING_AUTOVALVE_SEC = 1.6;
export const TELEGRAPH_WINDOW_MIN_SEC = 0.2;
export const TELEGRAPH_WINDOW_MAX_SEC = 0.6;
