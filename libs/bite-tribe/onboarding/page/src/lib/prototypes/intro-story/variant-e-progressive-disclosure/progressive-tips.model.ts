import {
  DISCOVER_TARGET_BITE_ID,
  type IntroStorySceneId,
} from '../intro-story.model';
import type { IntroCoachState } from '../source-real-ui/intro-coach-state';

/** Spotlight fallback as % of the native phone screen (390×844). */
export interface TipFallbackPct {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ProgressiveTip {
  id: string;
  arc: IntroStorySceneId;
  /** Short label — earns its place in the teaching order. */
  title: string;
  /** ≤12 words. */
  body: string;
  /** Query within the real-UI stage (prefer data-testid / stable classes). */
  anchor: string | null;
  fallbackPct: TipFallbackPct;
  cue: IntroCoachState;
}

const CARD = `bt-bite[data-bite-id="${DISCOVER_TARGET_BITE_ID}"]`;

/**
 * Teaching order — one tip at a time, never random.
 *
 * Find → Share → Tribe → Go, matching INTRO_STORY_SCENES.
 */
export const PROGRESSIVE_TIPS: ProgressiveTip[] = [
  // ── Find the bite ──────────────────────────────────────────────
  {
    id: 'discover-feed',
    arc: 'discover',
    title: 'Feed cards',
    body: 'Real dishes from explorers near you.',
    anchor: 'bt-bite',
    fallbackPct: { x: 50, y: 48, w: 86, h: 28 },
    cue: {
      screen: 'home',
      selectedBiteId: DISCOVER_TARGET_BITE_ID,
      mapPinId: null,
    },
  },
  {
    id: 'discover-filters',
    arc: 'discover',
    title: 'Filters & search',
    body: 'Narrow by taste, place, or price.',
    anchor: '[data-testid="home-feed-controls"]',
    fallbackPct: { x: 50, y: 18, w: 88, h: 8 },
    cue: {
      screen: 'home',
      selectedBiteId: DISCOVER_TARGET_BITE_ID,
      mapPinId: null,
    },
  },
  {
    id: 'discover-bitemap',
    arc: 'discover',
    title: 'Bitemap',
    body: 'See every nearby bite on the map.',
    anchor: '[data-testid="bitemap-chip"]',
    fallbackPct: { x: 62, y: 18, w: 28, h: 7 },
    cue: {
      screen: 'home',
      selectedBiteId: DISCOVER_TARGET_BITE_ID,
      mapPinId: null,
      scrollSelector: CARD,
    },
  },

  // ── Share the find ─────────────────────────────────────────────
  {
    id: 'share-create',
    arc: 'share',
    title: 'Create Bite',
    body: 'Share what you just tasted.',
    anchor: '[data-testid="footer-add-button"]',
    fallbackPct: { x: 50, y: 92, w: 14, h: 7 },
    cue: {
      screen: 'home',
      mapPinId: null,
    },
  },
  {
    id: 'share-photo',
    arc: 'share',
    title: 'Add a photo',
    body: 'Snap the plate — proof of the find.',
    anchor: 'image-upload',
    fallbackPct: { x: 50, y: 28, w: 78, h: 22 },
    cue: {
      screen: 'create',
      pickerOpen: false,
      createImagePath: '',
      mapPinId: null,
    },
  },
  {
    id: 'share-publish',
    arc: 'share',
    title: 'Publish',
    body: 'Post it so the tribe can find it.',
    anchor: '[data-testid="post-bite"]',
    fallbackPct: { x: 50, y: 88, w: 78, h: 8 },
    cue: {
      screen: 'create',
      createImagePath: 'assets/demo/bite-botanic-breeze.png',
      mapPinId: null,
    },
  },

  // ── Join the tribe ─────────────────────────────────────────────
  {
    id: 'tribe-creator',
    arc: 'tribe',
    title: 'The explorer',
    body: 'Meet who shared this bite.',
    anchor: '.bite-creator-container',
    fallbackPct: { x: 36, y: 58, w: 48, h: 8 },
    cue: {
      screen: 'details',
      selectedBiteId: DISCOVER_TARGET_BITE_ID,
      mapPinId: null,
      followed: false,
    },
  },
  {
    id: 'tribe-follow',
    arc: 'tribe',
    title: 'Follow',
    body: 'Keep explorers you love close by.',
    anchor: '.profile-actions ion-button',
    fallbackPct: { x: 50, y: 36, w: 56, h: 8 },
    cue: {
      screen: 'profile',
      selectedBiteId: DISCOVER_TARGET_BITE_ID,
      mapPinId: null,
      followed: false,
    },
  },

  // ── Ready to taste? ────────────────────────────────────────────
  {
    id: 'go-pin',
    arc: 'go',
    title: 'Map pin',
    body: 'Tap a pin to spot a nearby bite.',
    anchor: null,
    fallbackPct: { x: 48, y: 46, w: 16, h: 10 },
    cue: {
      screen: 'map',
      mapPinId: null,
      directionsHighlight: false,
    },
  },
  {
    id: 'go-drawer',
    arc: 'go',
    title: 'Bite drawer',
    body: 'Peek the find before you head out.',
    anchor: '[data-intro="map-drawer"]',
    fallbackPct: { x: 50, y: 78, w: 88, h: 22 },
    cue: {
      screen: 'map',
      mapPinId: DISCOVER_TARGET_BITE_ID,
      selectedBiteId: DISCOVER_TARGET_BITE_ID,
      directionsHighlight: false,
    },
  },
  {
    id: 'go-directions',
    arc: 'go',
    title: 'Directions',
    body: 'One tap — then go taste it.',
    anchor: '.stage-drawer__go',
    fallbackPct: { x: 72, y: 86, w: 28, h: 6 },
    cue: {
      screen: 'map',
      mapPinId: DISCOVER_TARGET_BITE_ID,
      selectedBiteId: DISCOVER_TARGET_BITE_ID,
      directionsHighlight: true,
    },
  },
];

export function tipsForArc(arc: IntroStorySceneId | 'all'): ProgressiveTip[] {
  if (arc === 'all') {
    return PROGRESSIVE_TIPS;
  }
  return PROGRESSIVE_TIPS.filter((t) => t.arc === arc);
}
