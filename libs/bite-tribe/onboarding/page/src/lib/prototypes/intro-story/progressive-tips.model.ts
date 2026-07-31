import {
  DISCOVER_TARGET_BITE_ID,
  type IntroStorySceneId,
} from './intro-story.model';
import type { IntroCoachState } from './source-real-ui/intro-coach-state';

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
    anchor: `bt-bite[data-bite-id="${DISCOVER_TARGET_BITE_ID}"]`,
    fallbackPct: { x: 50, y: 48, w: 86, h: 28 },
    cue: {
      screen: 'home',
      selectedBiteId: DISCOVER_TARGET_BITE_ID,
      mapPinId: null,
      scrollSelector: CARD,
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
      directionsHighlight: false,
    },
  },
];

export function tipsForArc(arc: IntroStorySceneId | 'all'): ProgressiveTip[] {
  if (arc === 'all') {
    return PROGRESSIVE_TIPS;
  }
  return PROGRESSIVE_TIPS.filter((t) => t.arc === arc);
}

/**
 * G — Spotlight Quest: one primary tip per arc for the checklist quest.
 * Order stays Find → Share → Tribe → Go.
 */
const QUEST_TIP_IDS = [
  'discover-feed',
  'share-create',
  'tribe-creator',
  'go-pin',
] as const;

export function questTipsForArc(
  arc: IntroStorySceneId | 'all',
): ProgressiveTip[] {
  const quest = QUEST_TIP_IDS.map((id) =>
    PROGRESSIVE_TIPS.find((t) => t.id === id),
  ).filter((t): t is ProgressiveTip => !!t);
  if (arc === 'all') {
    return quest;
  }
  return quest.filter((t) => t.arc === arc);
}

/** Local rect relative to the stage element. */
export interface TipLocalRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Resolve a tip anchor (or fallback %) into stage-local coordinates. */
export function measureTipInStage(
  stageEl: HTMLElement,
  tip: ProgressiveTip,
): TipLocalRect {
  const stageRect = stageEl.getBoundingClientRect();
  let target: HTMLElement | null = null;

  if (tip.anchor) {
    const live =
      (stageEl.querySelector('.source__layer--in') as HTMLElement | null) ??
      stageEl;
    let nodes = Array.from(live.querySelectorAll(tip.anchor)) as HTMLElement[];
    if (!nodes.length) {
      nodes = Array.from(stageEl.querySelectorAll(tip.anchor)) as HTMLElement[];
    }
    let bestArea = 0;
    for (const el of nodes) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) {
        continue;
      }
      const visW =
        Math.min(r.right, stageRect.right) - Math.max(r.left, stageRect.left);
      const visH =
        Math.min(r.bottom, stageRect.bottom) - Math.max(r.top, stageRect.top);
      const area = Math.max(0, visW) * Math.max(0, visH);
      if (area > bestArea) {
        bestArea = area;
        target = el;
      }
    }
  }

  if (target) {
    const r = target.getBoundingClientRect();
    if (r.width > 2 && r.height > 2) {
      return {
        top: r.top - stageRect.top,
        left: r.left - stageRect.left,
        width: r.width,
        height: r.height,
      };
    }
  }

  return fallbackLocalRect(stageEl, stageRect, tip.fallbackPct);
}

function fallbackLocalRect(
  stageEl: HTMLElement,
  stageRect: DOMRect,
  pct: TipFallbackPct,
): TipLocalRect {
  const native =
    (stageEl.querySelector('.source__native') as HTMLElement | null) ?? null;
  const box = native?.getBoundingClientRect() ?? stageRect;
  const w = (pct.w / 100) * box.width;
  const h = (pct.h / 100) * box.height;
  const left = box.left - stageRect.left + (pct.x / 100) * box.width - w / 2;
  const top = box.top - stageRect.top + (pct.y / 100) * box.height - h / 2;
  return { top, left, width: w, height: h };
}
