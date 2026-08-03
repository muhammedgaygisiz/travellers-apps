/**
 * Beat scripts — one sentence story each. Only gestures that serve the sentence.
 *
 * End of beat: resolve (hold success) → celebrate (soft particles) → stop.
 * Soft replay / chapter advance is owned by the host — never hard-cut mid-cheer.
 */
import {
  DISCOVER_TARGET_BITE_ID,
  type IntroStorySceneId,
} from '../intro-story.model';
import { G, script, type GestureScriptStep } from './gesture-script';
import { easeInOutCubic, easeOutCubic } from './easing';
import { appendAppearAndPickPhoto } from './script-phrases';
import {
  APPROACH_MS,
  CELEBRATE_MS,
  CREATE_LAND_MS,
  DETAILS_HOLD_MS,
  DIRECTIONS_HOLD_MS,
  DRAWER_HOLD_MS,
  FOLLOW_HOLD_MS,
  LAND_MS,
  MOVE_MS,
  REACTION_HOLD_MS,
  RESOLVE_HOLD_MS,
  SETTLE_MS,
  TAP_PAUSE_MS,
} from './timing';

export type IntroStageScreen =
  'home' | 'create' | 'details' | 'profile' | 'map' | 'leaderboard';

export interface IntroBeatScript {
  beat: IntroStorySceneId;
  /**
   * Hard rAF loop is off — hosts soft-replay or advance chapters after complete.
   * Kept for API compatibility; always false for polished endings.
   */
  loop: boolean;
  steps: GestureScriptStep[];
}

/** Same selector for scroll target AND tap — never scroll A / open B. */
const DISCOVER_CARD = `bt-bite[data-bite-id="${DISCOVER_TARGET_BITE_ID}"]`;

export const nav = (
  screen: IntroStageScreen,
  biteId?: string,
): GestureScriptStep =>
  G.emit(
    biteId
      ? { type: 'navigate', screen, biteId }
      : { type: 'navigate', screen },
  );

/** Resolve hold → soft celebrate → linger on the cheerful final frame. */
const resolveAndCelebrate = (
  builder: ReturnType<typeof script>,
  anchor: string,
): ReturnType<typeof script> =>
  builder
    .wait(RESOLVE_HOLD_MS)
    .emit({ type: 'celebrate', anchor })
    .wait(CELEBRATE_MS)
    .hide()
    .wait(SETTLE_MS);

export const INTRO_BEAT_SCRIPTS: Record<IntroStorySceneId, IntroBeatScript> = {
  discover: {
    beat: 'discover',
    loop: false,
    steps: resolveAndCelebrate(
      script()
        .push(nav('home'))
        .wait(LAND_MS)
        .appear({ x: 74, y: 78 })
        .moveTo({ x: 52, y: 66 }, MOVE_MS, easeOutCubic)
        .scrollToTarget(DISCOVER_CARD, 1600, {
          alignY: 46,
          pointerX: 52,
          easing: easeInOutCubic,
        })
        .wait(SETTLE_MS)
        .tap(DISCOVER_CARD, { approachMs: APPROACH_MS })
        .wait(TAP_PAUSE_MS)
        .push(nav('details', DISCOVER_TARGET_BITE_ID))
        .wait(DETAILS_HOLD_MS),
      'details-page h1, .title-container, [data-intro="details-title"]',
    ).build(),
  },

  share: {
    beat: 'share',
    loop: false,
    steps: resolveAndCelebrate(
      appendAppearAndPickPhoto(
        script()
          .push(nav('home'))
          .wait(LAND_MS)
          .appear({ x: 78, y: 88 })
          .moveTo({ x: 50, y: 91 }, MOVE_MS, easeOutCubic)
          .tap('[data-testid="footer-add-button"]', { approachMs: APPROACH_MS })
          .wait(TAP_PAUSE_MS)
          .push(nav('create'))
          .wait(CREATE_LAND_MS),
      )
        .tap('[data-testid="post-bite"]', { approachMs: APPROACH_MS })
        .wait(TAP_PAUSE_MS)
        .push(nav('details', DISCOVER_TARGET_BITE_ID))
        .wait(SETTLE_MS + 200)
        .appear({ x: 72, y: 62 })
        .tap('[data-testid="like-chip"]', {
          approachMs: APPROACH_MS,
          emitOnPress: { type: 'reactLikes' },
        })
        .wait(REACTION_HOLD_MS),
      '.source__react, [data-testid="like-chip"]',
    ).build(),
  },

  tribe: {
    beat: 'tribe',
    loop: false,
    steps: resolveAndCelebrate(
      script()
        .emit({ type: 'resetFollow' })
        .push(nav('details', DISCOVER_TARGET_BITE_ID))
        .wait(LAND_MS)
        .appear({ x: 70, y: 58 })
        .tap('.bite-creator-container', { approachMs: APPROACH_MS })
        .wait(TAP_PAUSE_MS)
        .push(nav('profile'))
        .wait(CREATE_LAND_MS)
        .appear({ x: 78, y: 30 })
        .tap('.profile-actions ion-button', {
          approachMs: APPROACH_MS,
          emitOnPress: { type: 'follow' },
        })
        .wait(FOLLOW_HOLD_MS),
      '[data-intro="following"], .source__toast',
    ).build(),
  },

  go: {
    beat: 'go',
    loop: false,
    steps: resolveAndCelebrate(
      script()
        .emit({ type: 'clearHighlight' })
        .emit({ type: 'clearPin' })
        .push(nav('map'))
        .wait(LAND_MS)
        .appear({ x: 72, y: 28 })
        .moveTo({ x: 48, y: 46 }, MOVE_MS, easeOutCubic)
        .wait(SETTLE_MS)
        .tap(
          { x: 48, y: 46 },
          {
            approachMs: 280,
            emitOnPress: {
              type: 'selectPin',
              biteId: DISCOVER_TARGET_BITE_ID,
            },
          },
        )
        .wait(DRAWER_HOLD_MS)
        .tap('[data-intro="map-drawer"]', { approachMs: APPROACH_MS })
        .wait(TAP_PAUSE_MS)
        .push(nav('details', DISCOVER_TARGET_BITE_ID))
        .wait(CREATE_LAND_MS)
        .tap('[data-testid="bite-details-navigation"]', {
          approachMs: APPROACH_MS,
          emitOnPress: { type: 'highlightDirections' },
        })
        .wait(DIRECTIONS_HOLD_MS),
      '[data-testid="bite-details-navigation"], .stage-drawer__go',
    ).build(),
  },
};
