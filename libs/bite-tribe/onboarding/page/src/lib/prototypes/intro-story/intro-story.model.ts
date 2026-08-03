export type IntroStorySceneId = 'discover' | 'share' | 'tribe' | 'go';

export interface IntroStoryScene {
  id: IntroStorySceneId;
  /** Short headline — ideally ≤ 5 words */
  headline: string;
  /** Compact supporting line — ideally ≤ 12 words */
  line: string;
  /** Ionic icon for the icons-only abstract variant */
  icon: string;
  accent: string;
  accentSoft: string;
  /**
   * Camera for the scaled real-UI showcase.
   * Native screen is rendered at phone size, then fit-scaled into the stage;
   * zoom + focus crop into the interesting region for this beat.
   */
  camera: IntroUiCamera;
}

/** Focus/zoom for the non-interactive real-UI showcase stage. */
export interface IntroUiCamera {
  /** Multiplier on fit-scale (1 = whole phone visible). */
  zoom: number;
  /** Focus X as % of native width (0–100). */
  focusX: number;
  /** Focus Y as % of native height (0–100). */
  focusY: number;
}

/** Shared narrative beats for every intro chrome. */
export const INTRO_STORY_SCENES: IntroStoryScene[] = [
  {
    id: 'discover',
    headline: 'Find the bite',
    line: 'Dishes worth eating, right where you are.',
    icon: 'locate-outline',
    accent: '#4a90d9',
    accentSoft: '#d6e7f8',
    // Default: fit entire phone; gesture layer may zoom in later
    camera: { zoom: 1, focusX: 50, focusY: 50 },
  },
  {
    id: 'share',
    headline: 'Share the find',
    line: 'Snap it. Tag it. Pass it on.',
    icon: 'camera-outline',
    accent: '#e08a3a',
    accentSoft: '#fde7d0',
    camera: { zoom: 1, focusX: 50, focusY: 50 },
  },
  {
    id: 'tribe',
    headline: 'Join the tribe',
    line: 'Follow explorers you love.',
    icon: 'flame-outline',
    accent: '#c45d6a',
    accentSoft: '#f8d9de',
    camera: { zoom: 1, focusX: 50, focusY: 50 },
  },
  {
    id: 'go',
    headline: 'Ready to taste?',
    line: 'Find it nearby — then go eat.',
    icon: 'restaurant-outline',
    accent: '#3f8f6b',
    accentSoft: '#d5eee3',
    camera: { zoom: 1, focusX: 50, focusY: 50 },
  },
];

export const INTRO_UI_NATIVE = {
  width: 390,
  height: 844,
} as const;

/**
 * Outer device chrome size (bezel around INTRO_UI_NATIVE screen).
 * Used to fit the full iPhone shell into the stage without clipping filters.
 */
export const INTRO_UI_DEVICE = {
  width: 412,
  height: 866,
  bezel: 11,
} as const;

/** @deprecated Prefer INTRO_UI_DEVICE — kept as alias for existing imports. */
export const INTRO_PHONE_SHELL = {
  width: INTRO_UI_DEVICE.width,
  height: INTRO_UI_DEVICE.height,
} as const;

/** Discover scroll+tap target — must match fixture id for Botanic Breeze. */
export const DISCOVER_TARGET_BITE_ID = 'bite1';
