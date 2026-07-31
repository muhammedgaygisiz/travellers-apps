/**
 * Intentional Find / Share story-flow variants.
 * Each script is one recognizable intention — not random timing tweaks.
 */
import {
  DEEP_FEED_BITE_ID,
  DISCOVER_TARGET_BITE_ID,
  FIRST_FEED_BITE_ID,
  NEAREST_FEED_BITE_ID,
} from '../source-real-ui/intro-demo-fixtures';
import type { IntroStorySceneId } from '../intro-story.model';
import {
  G,
  script,
  easeInOutCubic,
  easeOutCubic,
  appendAppearAndPickPhoto,
  appendBrowsePickerThenPick,
  appendPickPhoto,
  type GestureScriptStep,
  type IntroStageScreen,
  APPROACH_MS,
  CREATE_LAND_MS,
  DETAILS_HOLD_MS,
  LAND_MS,
  LOOP_GAP_MS,
  MOVE_MS,
  REACTION_HOLD_MS,
  SETTLE_MS,
  TAP_PAUSE_MS,
  TYPE_HOLD_MS,
} from '../gesture';

export interface IntroFlowVariant {
  id: string;
  /** Storybook story export / title slug */
  title: string;
  /** Short caption stating the intention */
  caption: string;
  beat: IntroStorySceneId;
  loop: boolean;
  steps: GestureScriptStep[];
  /** Override beat start screen when the flow lands elsewhere. */
  startScreen?: IntroStageScreen;
  /** Seed follow state before the script runs (unfollow → re-follow). */
  initialFollowed?: boolean;
  initialFollowerCount?: number;
}

const card = (id: string): string => `bt-bite[data-bite-id="${id}"]`;

const DISCOVER = DISCOVER_TARGET_BITE_ID;
const FIRST = FIRST_FEED_BITE_ID;
const DEEP = DEEP_FEED_BITE_ID;
const NEAREST = NEAREST_FEED_BITE_ID;
const SECOND = 'bite2';

const nav = (screen: IntroStageScreen, biteId?: string): GestureScriptStep =>
  G.emit(
    biteId
      ? { type: 'navigate', screen, biteId }
      : { type: 'navigate', screen },
  );

const DISCOVER_CARD = card(DISCOVER);
const FIRST_CARD = card(FIRST);
const DEEP_CARD = card(DEEP);
const NEAREST_CARD = card(NEAREST);
const SECOND_CARD = card(SECOND);

/** Shared: soft settle on home before gestures. */
const landHome = (): GestureScriptBuilder =>
  script().push(nav('home')).wait(LAND_MS);

type GestureScriptBuilder = ReturnType<typeof script>;

/** Create Bite from home footer → land on create form. */
const openCreate = (): GestureScriptBuilder =>
  landHome()
    .appear({ x: 78, y: 88 })
    .moveTo({ x: 50, y: 91 }, MOVE_MS, easeOutCubic)
    .tap('[data-testid="footer-add-button"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('create'))
    .wait(CREATE_LAND_MS);

// ─── Find the bite (10) ─────────────────────────────────────────────────────

const findScrollToCardThenOpen = (): GestureScriptStep[] =>
  landHome()
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
    .push(nav('details', DISCOVER))
    .wait(DETAILS_HOLD_MS)
    .hide()
    .wait(SETTLE_MS)
    .push(nav('home'))
    .wait(LOOP_GAP_MS)
    .build();

const findTapFirstVisible = (): GestureScriptStep[] =>
  landHome()
    .appear({ x: 70, y: 72 })
    .moveTo({ x: 50, y: 48 }, 600, easeOutCubic)
    .wait(280)
    .tap(FIRST_CARD, { approachMs: 420 })
    .wait(100)
    .push(nav('details', FIRST))
    .wait(1600)
    .hide()
    .wait(320)
    .push(nav('home'))
    .wait(600)
    .build();

const findSearchChipThenOpen = (): GestureScriptStep[] =>
  landHome()
    .appear({ x: 78, y: 28 })
    .tap('[data-testid="search-chip"]', { approachMs: 650 })
    .emit({ type: 'openSearch' })
    .wait(400)
    .typeText('[data-testid="search-input"]', 'Botanic', {
      approachMs: APPROACH_MS,
      sync: 'applySearch',
      holdMs: TYPE_HOLD_MS,
    })
    .appear({ x: 55, y: 58 })
    .tap(DISCOVER_CARD, { approachMs: 520 })
    .wait(100)
    .push(nav('details', DISCOVER))
    .wait(1500)
    .emit({ type: 'closeSearch' })
    .hide()
    .wait(360)
    .push(nav('home'))
    .wait(600)
    .build();

const findFilterByTagThenOpen = (): GestureScriptStep[] =>
  landHome()
    .appear({ x: 28, y: 28 })
    .tap('#select-tags', { approachMs: 650 })
    .wait(380)
    .emit({ type: 'applyFilter', tag: 'alkoholfrei' })
    .wait(900)
    .appear({ x: 52, y: 55 })
    .tap(DISCOVER_CARD, { approachMs: 520 })
    .wait(100)
    .push(nav('details', DISCOVER))
    .wait(1500)
    .emit({ type: 'clearFilter' })
    .hide()
    .wait(360)
    .push(nav('home'))
    .wait(600)
    .build();

const findSortDistanceNearest = (): GestureScriptStep[] =>
  landHome()
    .appear({ x: 82, y: 28 })
    .tap('#select-sorting', { approachMs: 650 })
    .wait(420)
    .emit({ type: 'applySort', sorting: 'distance' })
    .wait(900)
    .appear({ x: 50, y: 48 })
    .tap(NEAREST_CARD, { approachMs: 480 })
    .wait(100)
    .push(nav('details', NEAREST))
    .wait(1500)
    .hide()
    .wait(360)
    .push(nav('home'))
    .wait(600)
    .build();

const findLongBrowseThenOpen = (): GestureScriptStep[] =>
  landHome()
    .appear({ x: 74, y: 78 })
    .moveTo({ x: 52, y: 66 }, 600, easeOutCubic)
    .scrollToTarget(DEEP_CARD, 2200, {
      alignY: 44,
      pointerX: 52,
      easing: easeInOutCubic,
    })
    .wait(400)
    .tap(DEEP_CARD, { approachMs: 520 })
    .wait(100)
    .push(nav('details', DEEP))
    .wait(1600)
    .hide()
    .wait(360)
    .push(nav('home'))
    .wait(600)
    .build();

const findOpenThenSwipeBack = (): GestureScriptStep[] =>
  landHome()
    .appear({ x: 55, y: 50 })
    .tap(FIRST_CARD, { approachMs: 520 })
    .wait(100)
    .push(nav('details', FIRST))
    .wait(1100)
    .appear({ x: 18, y: 12 })
    .tap({ x: 12, y: 12 }, { approachMs: 480 })
    .wait(120)
    .push(nav('home'))
    .wait(1400)
    .hide()
    .wait(400)
    .build();

const findDetailsThenRelated = (): GestureScriptStep[] =>
  landHome()
    .appear({ x: 52, y: 66 })
    .scrollToTarget(DISCOVER_CARD, 1200, {
      alignY: 46,
      pointerX: 52,
      easing: easeInOutCubic,
    })
    .wait(280)
    .tap(DISCOVER_CARD, { approachMs: 480 })
    .wait(100)
    .push(nav('details', DISCOVER))
    .wait(1000)
    .appear({ x: 70, y: 78 })
    .moveTo({ x: 50, y: 82 }, 600, easeOutCubic)
    .tap({ x: 50, y: 82 }, { approachMs: 320 })
    .wait(140)
    .push(nav('details', SECOND))
    .wait(1600)
    .hide()
    .wait(360)
    .push(nav('home'))
    .wait(600)
    .build();

const findRatingStarsThenOpen = (): GestureScriptStep[] =>
  landHome()
    .appear({ x: 70, y: 72 })
    .moveTo({ x: 50, y: 58 }, 650, easeOutCubic)
    .scrollToTarget(SECOND_CARD, 900, {
      alignY: 50,
      pointerX: 50,
      easing: easeInOutCubic,
    })
    .wait(280)
    .tap(`${SECOND_CARD} .star-rating`, { approachMs: 520 })
    .wait(700)
    .tap(SECOND_CARD, { approachMs: 480 })
    .wait(100)
    .push(nav('details', SECOND))
    .wait(1500)
    .hide()
    .wait(360)
    .push(nav('home'))
    .wait(600)
    .build();

const findQuickPeek = (): GestureScriptStep[] =>
  landHome()
    .appear({ x: 55, y: 50 })
    .tap(FIRST_CARD, { approachMs: 420 })
    .wait(80)
    .push(nav('details', FIRST))
    .wait(720)
    .appear({ x: 14, y: 12 })
    .tap({ x: 12, y: 12 }, { approachMs: 360 })
    .wait(80)
    .push(nav('home'))
    .wait(900)
    .hide()
    .wait(320)
    .build();

// ─── Share the find (10) ────────────────────────────────────────────────────

const shareCanonical = (): GestureScriptStep[] =>
  appendAppearAndPickPhoto(openCreate())
    .tap('[data-testid="post-bite"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', DISCOVER))
    .wait(SETTLE_MS + 200)
    .appear({ x: 72, y: 62 })
    .tap('[data-testid="like-chip"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'reactLikes' },
    })
    .wait(REACTION_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

const shareTypedNameThenPhoto = (): GestureScriptStep[] =>
  appendPickPhoto(
    openCreate()
      .appear({ x: 60, y: 42 })
      .typeText('[data-testid="bite-name"]', 'Botanic Breeze', {
        approachMs: APPROACH_MS,
        sync: 'setDraftName',
        holdMs: TYPE_HOLD_MS,
      }),
  )
    .tap('[data-testid="post-bite"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', DISCOVER))
    .wait(DETAILS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

const sharePhotoFirstThenPriceTags = (): GestureScriptStep[] =>
  appendAppearAndPickPhoto(openCreate())
    .appear({ x: 55, y: 48 })
    .moveTo({ x: 50, y: 52 }, MOVE_MS, easeOutCubic)
    .tap({ x: 50, y: 52 }, { approachMs: 320 })
    .wait(SETTLE_MS)
    .moveTo({ x: 50, y: 68 }, MOVE_MS, easeOutCubic)
    .tap({ x: 42, y: 68 }, { approachMs: APPROACH_MS })
    .emit({ type: 'setDraftTags', tags: ['drink', 'bern'] })
    .wait(900)
    .tap('[data-testid="post-bite"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', DISCOVER))
    .wait(DETAILS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

const shareSkipPhotoThenPublish = (): GestureScriptStep[] =>
  openCreate()
    .appear({ x: 60, y: 40 })
    .typeText('[data-testid="bite-name"]', 'Botanic Breeze', {
      approachMs: APPROACH_MS,
      sync: 'setDraftName',
      holdMs: TYPE_HOLD_MS,
    })
    .emit({ type: 'setDraftTags', tags: ['bern'] })
    .wait(SETTLE_MS)
    .tap('[data-testid="post-bite"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', DISCOVER))
    .wait(DETAILS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

const sharePublishThenShareSheet = (): GestureScriptStep[] =>
  appendAppearAndPickPhoto(openCreate())
    .tap('[data-testid="post-bite"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', DISCOVER))
    .wait(900)
    .appear({ x: 78, y: 38 })
    .tap('[data-testid="bite-details-share"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'highlightShareSheet' },
    })
    .wait(2000)
    .emit({ type: 'clearShareSheet' })
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

const shareCreateDetailsThumbsUp = (): GestureScriptStep[] =>
  appendAppearAndPickPhoto(openCreate())
    .tap('[data-testid="post-bite"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', DISCOVER))
    .wait(SETTLE_MS + 200)
    .appear({ x: 72, y: 62 })
    .tap('[data-testid="like-chip"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'reactLikes' },
    })
    .wait(REACTION_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

const shareMultiPhotoPicker = (): GestureScriptStep[] =>
  appendBrowsePickerThenPick(openCreate().appear({ x: 70, y: 80 }), [0, 1, 2])
    .tap('[data-testid="post-bite"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', DISCOVER))
    .wait(DETAILS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

const shareTagSuggestionsThenPublish = (): GestureScriptStep[] =>
  appendAppearAndPickPhoto(openCreate())
    .appear({ x: 40, y: 72 })
    .moveTo({ x: 35, y: 74 }, MOVE_MS, easeOutCubic)
    .tap({ x: 35, y: 74 }, { approachMs: APPROACH_MS })
    .emit({ type: 'setDraftTags', tags: ['vegan', 'drink'] })
    .wait(1000)
    .tap('[data-testid="post-bite"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', DISCOVER))
    .wait(DETAILS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

const shareLocationPinThenPublish = (): GestureScriptStep[] =>
  appendAppearAndPickPhoto(openCreate())
    .appear({ x: 55, y: 78 })
    .moveTo({ x: 42, y: 80 }, MOVE_MS, easeOutCubic)
    .tap('[data-testid="position-from-gps"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'setLocationGps' },
    })
    .wait(1100)
    .tap('[data-testid="post-bite"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', DISCOVER))
    .wait(DETAILS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

const shareAppearOnHomeFeed = (): GestureScriptStep[] =>
  appendAppearAndPickPhoto(openCreate())
    .tap('[data-testid="post-bite"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .emit({ type: 'showNewFeedCard' })
    .push(nav('home'))
    .wait(2000)
    .appear({ x: 50, y: 42 })
    .tap(DISCOVER_CARD, { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', DISCOVER))
    .wait(1200)
    .emit({ type: 'clearNewFeedCard' })
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

export const FIND_THE_BITE_FLOWS: IntroFlowVariant[] = [
  {
    id: 'find-scroll-to-card',
    title: '1 Scroll to card then open',
    caption: 'Canonical: scroll Botanic Breeze into view, then open it.',
    beat: 'discover',
    loop: true,
    steps: findScrollToCardThenOpen(),
  },
  {
    id: 'find-tap-first-visible',
    title: '2 Tap first visible card',
    caption: 'No scroll — open the first card already on screen.',
    beat: 'discover',
    loop: true,
    steps: findTapFirstVisible(),
  },
  {
    id: 'find-search-chip',
    title: '3 Use search chip then open',
    caption: 'Search chip → type a name → open the matching result.',
    beat: 'discover',
    loop: true,
    steps: findSearchChipThenOpen(),
  },
  {
    id: 'find-filter-by-tag',
    title: '4 Filter by tag then open',
    caption: 'Open filters, pick a tag, then open a filtered bite.',
    beat: 'discover',
    loop: true,
    steps: findFilterByTagThenOpen(),
  },
  {
    id: 'find-sort-distance',
    title: '5 Sort by distance then open nearest',
    caption: 'Sort by distance, then open the nearest card.',
    beat: 'discover',
    loop: true,
    steps: findSortDistanceNearest(),
  },
  {
    id: 'find-long-browse',
    title: '6 Long browse then open',
    caption: 'Deep scroll through the feed, then open a later card.',
    beat: 'discover',
    loop: true,
    steps: findLongBrowseThenOpen(),
  },
  {
    id: 'find-round-trip',
    title: '7 Open then swipe back to feed',
    caption: 'Open details, then return to the feed (round trip).',
    beat: 'discover',
    loop: true,
    steps: findOpenThenSwipeBack(),
  },
  {
    id: 'find-related-second',
    title: '8 Details then related bite',
    caption: 'Feed → details → hop to a second / related bite.',
    beat: 'discover',
    loop: true,
    steps: findDetailsThenRelated(),
  },
  {
    id: 'find-rating-stars',
    title: '9 Rating stars then open',
    caption: 'Focus on the star rating, then open that card.',
    beat: 'discover',
    loop: true,
    steps: findRatingStarsThenOpen(),
  },
  {
    id: 'find-quick-peek',
    title: '10 Quick peek then back',
    caption: 'Tap a card, brief details glance, immediately back.',
    beat: 'discover',
    loop: true,
    steps: findQuickPeek(),
  },
];

export const SHARE_THE_FIND_FLOWS: IntroFlowVariant[] = [
  {
    id: 'share-canonical',
    title: '1 Home → Create → publish → reactions',
    caption: 'Canonical: Create Bite → picker → publish → reaction burst.',
    beat: 'share',
    loop: true,
    steps: shareCanonical(),
  },
  {
    id: 'share-typed-name-then-photo',
    title: '2 Typed name then photo',
    caption: 'Name the dish first, then capture a photo and publish.',
    beat: 'share',
    loop: true,
    steps: shareTypedNameThenPhoto(),
  },
  {
    id: 'share-photo-first-price-tags',
    title: '3 Photo first then price & tags',
    caption: 'Photo first, then fill price/tags before publishing.',
    beat: 'share',
    loop: true,
    steps: sharePhotoFirstThenPriceTags(),
  },
  {
    id: 'share-skip-photo',
    title: '4 Skip photo then publish',
    caption: 'Publish without a photo (name + tags only).',
    beat: 'share',
    loop: true,
    steps: shareSkipPhotoThenPublish(),
  },
  {
    id: 'share-publish-share-sheet',
    title: '5 Publish then share sheet',
    caption: 'Publish, then tap the share-sheet affordance on details.',
    beat: 'share',
    loop: true,
    steps: sharePublishThenShareSheet(),
  },
  {
    id: 'share-thumbs-up-celebration',
    title: '6 Create → details → thumbs-up',
    caption: 'Publish, then self-celebrate with a thumbs-up on details.',
    beat: 'share',
    loop: true,
    steps: shareCreateDetailsThumbsUp(),
  },
  {
    id: 'share-multi-photo-picker',
    title: '7 Multi-photo picker grid',
    caption: 'Browse the picker grid, pick among photos, then publish.',
    beat: 'share',
    loop: true,
    steps: shareMultiPhotoPicker(),
  },
  {
    id: 'share-tag-suggestions',
    title: '8 Tag suggestions then publish',
    caption: 'Tap suggested tags on create, then publish.',
    beat: 'share',
    loop: true,
    steps: shareTagSuggestionsThenPublish(),
  },
  {
    id: 'share-location-pin',
    title: '9 Location pin then publish',
    caption: 'Set location from GPS on create, then publish.',
    beat: 'share',
    loop: true,
    steps: shareLocationPinThenPublish(),
  },
  {
    id: 'share-appear-on-home',
    title: '10 Appear on home feed',
    caption: 'Publish, then land on home with the new card highlighted.',
    beat: 'share',
    loop: true,
    steps: shareAppearOnHomeFeed(),
  },
];

export const ALL_INTRO_FLOWS: IntroFlowVariant[] = [
  ...FIND_THE_BITE_FLOWS,
  ...SHARE_THE_FIND_FLOWS,
];

export const INTRO_FLOW_BY_ID: Record<string, IntroFlowVariant> =
  Object.fromEntries(ALL_INTRO_FLOWS.map((f) => [f.id, f]));
