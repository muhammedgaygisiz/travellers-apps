/**
 * Intentional Join the tribe / Ready to taste? story-flow variants.
 * Each script is one recognizable intention — not random timing tweaks.
 */
import {
  DISCOVER_TARGET_BITE_ID,
  FARTHEST_MAP_BITE_ID,
  NEAREST_MAP_BITE_ID,
} from '../source-real-ui/intro-demo-fixtures';
import {
  G,
  script,
  easeInOutCubic,
  easeOutCubic,
  type GestureScriptStep,
  type IntroStageScreen,
  APPROACH_MS,
  CREATE_LAND_MS,
  DETAILS_HOLD_MS,
  DIRECTIONS_HOLD_MS,
  DRAWER_HOLD_MS,
  FOLLOW_HOLD_MS,
  LAND_MS,
  LOOP_GAP_MS,
  MOVE_MS,
  SETTLE_MS,
  TAP_PAUSE_MS,
} from '../gesture';
import type { IntroFlowVariant } from './flow-scripts';

const BOTANIC = DISCOVER_TARGET_BITE_ID;
const NEAREST = NEAREST_MAP_BITE_ID;
const FARTHEST = FARTHEST_MAP_BITE_ID;
const COMPARE_A = 'bite2';
const COMPARE_B = BOTANIC;

const nav = (screen: IntroStageScreen, biteId?: string): GestureScriptStep =>
  G.emit(
    biteId
      ? { type: 'navigate', screen, biteId }
      : { type: 'navigate', screen },
  );

type Builder = ReturnType<typeof script>;

const land = (screen: IntroStageScreen, biteId?: string): Builder =>
  script().push(nav(screen, biteId)).wait(LAND_MS);

// ─── Join the tribe (10) ────────────────────────────────────────────────────

/** 1. Canonical: details → creator → Follow */
const tribeCanonical = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'resetFollow' })
    .push(nav('details', BOTANIC))
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
    .wait(FOLLOW_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 2. Follow then open their bites grid */
const tribeFollowBitesGrid = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'resetFollow' })
    .push(nav('details', BOTANIC))
    .wait(LAND_MS)
    .appear({ x: 68, y: 56 })
    .tap('.bite-creator-container', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('profile'))
    .wait(CREATE_LAND_MS)
    .appear({ x: 78, y: 30 })
    .tap('.profile-actions ion-button', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'follow' },
    })
    .wait(FOLLOW_HOLD_MS)
    .appear({ x: 52, y: 72 })
    .scrollToTarget('.bites-section', 1000, {
      alignY: 42,
      pointerX: 52,
      easing: easeInOutCubic,
    })
    .wait(SETTLE_MS)
    .tap(`bt-bite[data-bite-id="${BOTANIC}"]`, { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', BOTANIC))
    .wait(DETAILS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 3. Unfollow then re-follow */
const tribeUnfollowRefollow = (): GestureScriptStep[] =>
  script()
    .push(nav('profile'))
    .wait(LAND_MS)
    .appear({ x: 78, y: 30 })
    .tap('.profile-actions ion-button', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'showUnfollowConfirm' },
    })
    .wait(SETTLE_MS + 100)
    .tap('[data-intro="unfollow-confirm-yes"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'unfollow' },
    })
    .emit({ type: 'hideUnfollowConfirm' })
    .wait(1100)
    .appear({ x: 78, y: 30 })
    .tap('.profile-actions ion-button', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'follow' },
    })
    .wait(FOLLOW_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 4. Follow from details without full profile (inline chip shortcut) */
const tribeProfileShortcut = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'resetFollow' })
    .push(nav('details', BOTANIC))
    .wait(LAND_MS)
    .emit({ type: 'showInlineFollow' })
    .wait(SETTLE_MS + 100)
    .appear({ x: 82, y: 42 })
    .tap('[data-intro="inline-follow"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'follow' },
    })
    .wait(FOLLOW_HOLD_MS)
    .emit({ type: 'hideInlineFollow' })
    .wait(SETTLE_MS)
    .push(nav('profile'))
    .wait(DETAILS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 5. Bucket-list save as join-adjacent social act */
const tribeBucketlistSave = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearBucketlist' })
    .emit({ type: 'resetFollow' })
    .push(nav('details', BOTANIC))
    .wait(LAND_MS)
    .appear({ x: 78, y: 68 })
    .tap('[data-testid="bite-details-bucket-list"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'saveBucketlist' },
    })
    .wait(1800)
    .appear({ x: 68, y: 42 })
    .tap('.bite-creator-container', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('profile'))
    .wait(CREATE_LAND_MS)
    .tap('.profile-actions ion-button', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'follow' },
    })
    .wait(FOLLOW_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 6. Follow + follower count bump emphasis */
const tribeFollowerCountBump = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'resetFollow' })
    .emit({ type: 'clearEmphasizeFollowers' })
    .push(nav('profile'))
    .wait(LAND_MS)
    .appear({ x: 78, y: 30 })
    .tap('.profile-actions ion-button', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'follow' },
    })
    .emit({ type: 'emphasizeFollowers' })
    .wait(FOLLOW_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 7. Open profile from menu then follow (via leaderboard) */
const tribeMenuThenFollow = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'resetFollow' })
    .push(nav('home'))
    .wait(LAND_MS)
    .appear({ x: 88, y: 10 })
    .tap('[data-testid="btn-menu"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'showMenu' },
    })
    .wait(700)
    .tap('[data-testid="menu-leaderboard"]', { approachMs: APPROACH_MS })
    .emit({ type: 'hideMenu' })
    .wait(TAP_PAUSE_MS)
    .push(nav('leaderboard'))
    .wait(LAND_MS)
    .appear({ x: 50, y: 36 })
    .tap('[data-intro="leaderboard-lina"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('profile'))
    .wait(CREATE_LAND_MS)
    .tap('.profile-actions ion-button', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'follow' },
    })
    .wait(FOLLOW_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 8. Follow two creators — tribe building */
const tribeTwoCreators = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'resetFollow' })
    .emit({ type: 'setCreator', creatorId: 'lina' })
    .push(nav('profile'))
    .wait(CREATE_LAND_MS)
    .appear({ x: 78, y: 30 })
    .tap('.profile-actions ion-button', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'follow' },
    })
    .wait(1600)
    .emit({ type: 'setCreator', creatorId: 'marco' })
    .emit({ type: 'resetFollow' })
    .wait(TAP_PAUSE_MS)
    .push(nav('home'))
    .wait(SETTLE_MS + 100)
    .push(nav('profile'))
    .wait(CREATE_LAND_MS)
    .appear({ x: 78, y: 30 })
    .tap('.profile-actions ion-button', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'follow' },
    })
    .wait(FOLLOW_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 9. Public vs private awareness tip then follow */
const tribePublicPrivateTip = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'resetFollow' })
    .push(nav('details', BOTANIC))
    .wait(CREATE_LAND_MS)
    .emit({
      type: 'showTip',
      title: 'Public explorers',
      body: 'Only public profiles show a creator you can follow.',
    })
    .wait(2000)
    .appear({ x: 72, y: 78 })
    .tap('[data-intro="tip-next"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'hideTip' },
    })
    .wait(SETTLE_MS)
    .tap('.bite-creator-container', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('profile'))
    .wait(CREATE_LAND_MS)
    .tap('.profile-actions ion-button', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'follow' },
    })
    .wait(FOLLOW_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 10. Follow then leaderboard peek / profile stats */
const tribeLeaderboardPeek = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'resetFollow' })
    .push(nav('profile'))
    .wait(LAND_MS)
    .appear({ x: 78, y: 30 })
    .tap('.profile-actions ion-button', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'follow' },
    })
    .emit({ type: 'emphasizeFollowers' })
    .wait(1600)
    .appear({ x: 78, y: 18 })
    .tap('.profile-header .header-column:last-child .clickable', {
      approachMs: APPROACH_MS,
    })
    .wait(SETTLE_MS)
    .push(nav('leaderboard'))
    .wait(DETAILS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

// ─── Ready to taste? (10) ───────────────────────────────────────────────────

/** 1. Canonical: map → pin → drawer → Directions */
const goCanonical = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearHighlight' })
    .emit({ type: 'clearPin' })
    .emit({ type: 'clearWalkingSuccess' })
    .push(nav('map'))
    .wait(LAND_MS)
    .appear({ x: 72, y: 28 })
    .moveTo({ x: 48, y: 46 }, MOVE_MS, easeOutCubic)
    .wait(SETTLE_MS)
    .tap(
      { x: 48, y: 46 },
      {
        approachMs: 280,
        emitOnPress: { type: 'selectPin', biteId: BOTANIC },
      },
    )
    .wait(DRAWER_HOLD_MS)
    .tap('[data-intro="map-drawer"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', BOTANIC))
    .wait(CREATE_LAND_MS)
    .tap('[data-testid="bite-details-navigation"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'highlightDirections' },
    })
    .wait(DIRECTIONS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 2. Home Bitemap chip → map → pin → go */
const goBitemapChip = (): GestureScriptStep[] =>
  land('home')
    .appear({ x: 78, y: 22 })
    .tap('[data-testid="bitemap-chip"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('map'))
    .wait(LAND_MS)
    .appear({ x: 55, y: 44 })
    .tap(
      { x: 48, y: 46 },
      {
        approachMs: APPROACH_MS,
        emitOnPress: { type: 'selectPin', biteId: BOTANIC },
      },
    )
    .wait(DRAWER_HOLD_MS)
    .tap('[data-intro="map-drawer"] .stage-drawer__go', {
      approachMs: APPROACH_MS,
    })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', BOTANIC))
    .wait(CREATE_LAND_MS)
    .tap('[data-testid="bite-details-navigation"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'highlightDirections' },
    })
    .wait(DIRECTIONS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 3. Pan map then select pin */
const goPanThenPin = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearPin' })
    .emit({ type: 'resetMapPan' })
    .push(nav('map'))
    .wait(LAND_MS)
    .appear({ x: 60, y: 40 })
    .down()
    .drag({ x: 32, y: 52 }, 1000, {
      onProgress: (t) => {
        void t;
      },
      easing: easeInOutCubic,
    })
    .up()
    .emit({ type: 'panMap', dxPct: -10, dyPct: 6 })
    .wait(700)
    .tap(
      { x: 52, y: 44 },
      {
        approachMs: APPROACH_MS,
        emitOnPress: { type: 'selectPin', biteId: BOTANIC },
      },
    )
    .wait(DRAWER_HOLD_MS)
    .tap('[data-intro="map-drawer"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', BOTANIC))
    .wait(CREATE_LAND_MS)
    .tap('[data-testid="bite-details-navigation"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'highlightDirections' },
    })
    .wait(DIRECTIONS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 4. Select pin → open full details → Directions */
const goPinFullDetails = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearPin' })
    .emit({ type: 'clearHighlight' })
    .push(nav('map'))
    .wait(LAND_MS)
    .appear({ x: 50, y: 48 })
    .tap(
      { x: 48, y: 46 },
      {
        approachMs: APPROACH_MS,
        emitOnPress: { type: 'selectPin', biteId: BOTANIC },
      },
    )
    .wait(DRAWER_HOLD_MS)
    .tap('[data-intro="map-drawer"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', BOTANIC))
    .wait(DETAILS_HOLD_MS)
    .tap('[data-testid="bite-details-navigation"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'highlightDirections' },
    })
    .wait(DIRECTIONS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 5. Compare two pins then choose one */
const goCompareTwoPins = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearPin' })
    .push(nav('map'))
    .wait(LAND_MS)
    .appear({ x: 40, y: 42 })
    .tap(
      { x: 38, y: 40 },
      {
        approachMs: APPROACH_MS,
        emitOnPress: { type: 'selectPin', biteId: COMPARE_A },
      },
    )
    .wait(1800)
    .appear({ x: 58, y: 50 })
    .tap(
      { x: 55, y: 48 },
      {
        approachMs: APPROACH_MS,
        emitOnPress: { type: 'selectPin', biteId: COMPARE_B },
      },
    )
    .wait(DRAWER_HOLD_MS)
    .tap('[data-intro="map-drawer"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', COMPARE_B))
    .wait(CREATE_LAND_MS)
    .tap('[data-testid="bite-details-navigation"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'highlightDirections' },
    })
    .wait(DIRECTIONS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 6. Recenter my-location then nearest pin */
const goRecenterNearest = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearPin' })
    .emit({ type: 'resetMapPan' })
    .push(nav('map'))
    .wait(LAND_MS)
    .emit({ type: 'panMap', dxPct: 12, dyPct: -8 })
    .wait(800)
    .appear({ x: 88, y: 82 })
    .tap('[data-testid="btn-my-position"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'resetMapPan' },
    })
    .wait(1000)
    .appear({ x: 42, y: 44 })
    .tap(
      { x: 40, y: 42 },
      {
        approachMs: APPROACH_MS,
        emitOnPress: { type: 'selectPin', biteId: NEAREST },
      },
    )
    .wait(DRAWER_HOLD_MS)
    .tap('[data-intro="map-drawer"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', NEAREST))
    .wait(CREATE_LAND_MS)
    .tap('[data-testid="bite-details-navigation"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'highlightDirections' },
    })
    .wait(DIRECTIONS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 7. Drawer expand then navigate */
const goDrawerExpand = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearPin' })
    .emit({ type: 'collapseDrawer' })
    .push(nav('map'))
    .wait(LAND_MS)
    .appear({ x: 50, y: 48 })
    .tap(
      { x: 48, y: 46 },
      {
        approachMs: APPROACH_MS,
        emitOnPress: { type: 'selectPin', biteId: BOTANIC },
      },
    )
    .wait(1400)
    .appear({ x: 50, y: 78 })
    .tap('[data-intro="drawer-handle"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'expandDrawer' },
    })
    .wait(1600)
    .tap('[data-intro="map-drawer"] .stage-drawer__go', {
      approachMs: APPROACH_MS,
    })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', BOTANIC))
    .wait(CREATE_LAND_MS)
    .tap('[data-testid="bite-details-navigation"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'highlightDirections' },
    })
    .wait(DIRECTIONS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 8. Pin → details → back to map */
const goPinDetailsBack = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearPin' })
    .push(nav('map'))
    .wait(LAND_MS)
    .appear({ x: 50, y: 48 })
    .tap(
      { x: 48, y: 46 },
      {
        approachMs: APPROACH_MS,
        emitOnPress: { type: 'selectPin', biteId: BOTANIC },
      },
    )
    .wait(DRAWER_HOLD_MS)
    .tap('[data-intro="map-drawer"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', BOTANIC))
    .wait(DETAILS_HOLD_MS)
    .appear({ x: 12, y: 10 })
    .tap('ion-back-button', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('map'))
    .emit({ type: 'selectPin', biteId: BOTANIC })
    .wait(DRAWER_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 9. Distance-focused: farthest then nearest */
const goFarthestThenNearest = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearPin' })
    .push(nav('map'))
    .wait(LAND_MS)
    .appear({ x: 68, y: 58 })
    .tap(
      { x: 66, y: 56 },
      {
        approachMs: APPROACH_MS,
        emitOnPress: { type: 'selectPin', biteId: FARTHEST },
      },
    )
    .wait(1800)
    .appear({ x: 40, y: 42 })
    .tap(
      { x: 38, y: 40 },
      {
        approachMs: APPROACH_MS,
        emitOnPress: { type: 'selectPin', biteId: NEAREST },
      },
    )
    .wait(DRAWER_HOLD_MS)
    .tap('[data-intro="map-drawer"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', NEAREST))
    .wait(CREATE_LAND_MS)
    .tap('[data-testid="bite-details-navigation"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'highlightDirections' },
    })
    .wait(DIRECTIONS_HOLD_MS)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

/** 10. End on walking / directions success state */
const goWalkingSuccess = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearPin' })
    .emit({ type: 'clearWalkingSuccess' })
    .emit({ type: 'clearHighlight' })
    .push(nav('map'))
    .wait(LAND_MS)
    .appear({ x: 50, y: 48 })
    .tap(
      { x: 48, y: 46 },
      {
        approachMs: APPROACH_MS,
        emitOnPress: { type: 'selectPin', biteId: BOTANIC },
      },
    )
    .wait(DRAWER_HOLD_MS)
    .tap('[data-intro="map-drawer"]', { approachMs: APPROACH_MS })
    .wait(TAP_PAUSE_MS)
    .push(nav('details', BOTANIC))
    .wait(CREATE_LAND_MS)
    .tap('[data-testid="bite-details-navigation"]', {
      approachMs: APPROACH_MS,
      emitOnPress: { type: 'highlightDirections' },
    })
    .wait(1000)
    .emit({ type: 'walkingSuccess' })
    .wait(2800)
    .hide()
    .wait(LOOP_GAP_MS)
    .build();

export const JOIN_THE_TRIBE_FLOWS: IntroFlowVariant[] = [
  {
    id: 'tribe-canonical',
    title: '1 Details → creator → Follow',
    caption: 'Canonical: open creator from details, then Follow.',
    beat: 'tribe',
    loop: true,
    startScreen: 'details',
    steps: tribeCanonical(),
  },
  {
    id: 'tribe-follow-bites-grid',
    title: '2 Follow then open bites grid',
    caption: 'Follow, then browse the explorer’s bites grid.',
    beat: 'tribe',
    loop: true,
    startScreen: 'details',
    steps: tribeFollowBitesGrid(),
  },
  {
    id: 'tribe-unfollow-refollow',
    title: '3 Unfollow then re-follow',
    caption: 'Stop following, confirm, then Follow again.',
    beat: 'tribe',
    loop: true,
    startScreen: 'profile',
    initialFollowed: true,
    initialFollowerCount: 13,
    steps: tribeUnfollowRefollow(),
  },
  {
    id: 'tribe-profile-shortcut',
    title: '4 Follow from details shortcut',
    caption: 'Inline Follow on details — no full profile detour required.',
    beat: 'tribe',
    loop: true,
    startScreen: 'details',
    steps: tribeProfileShortcut(),
  },
  {
    id: 'tribe-bucketlist-save',
    title: '5 Bucket-list save then follow',
    caption: 'Save to bucket list (join-adjacent), then Follow the creator.',
    beat: 'tribe',
    loop: true,
    startScreen: 'details',
    steps: tribeBucketlistSave(),
  },
  {
    id: 'tribe-follower-count-bump',
    title: '6 Follow + follower count bump',
    caption: 'Follow and emphasize the follower-count bump.',
    beat: 'tribe',
    loop: true,
    startScreen: 'profile',
    steps: tribeFollowerCountBump(),
  },
  {
    id: 'tribe-menu-then-follow',
    title: '7 Menu → leaderboard → follow',
    caption: 'Open menu, peek leaderboard, open explorer, Follow.',
    beat: 'tribe',
    loop: true,
    startScreen: 'home',
    steps: tribeMenuThenFollow(),
  },
  {
    id: 'tribe-two-creators',
    title: '8 Follow two creators',
    caption: 'Tribe building — Follow Lina, then Marco.',
    beat: 'tribe',
    loop: true,
    startScreen: 'profile',
    steps: tribeTwoCreators(),
  },
  {
    id: 'tribe-public-private-tip',
    title: '9 Public vs private tip then follow',
    caption: 'Awareness tip about public profiles, then Follow.',
    beat: 'tribe',
    loop: true,
    startScreen: 'details',
    steps: tribePublicPrivateTip(),
  },
  {
    id: 'tribe-leaderboard-peek',
    title: '10 Follow then leaderboard peek',
    caption: 'Follow, emphasize stats, then peek the leaderboard.',
    beat: 'tribe',
    loop: true,
    startScreen: 'profile',
    steps: tribeLeaderboardPeek(),
  },
];

export const READY_TO_TASTE_FLOWS: IntroFlowVariant[] = [
  {
    id: 'go-canonical',
    title: '1 Map → pin → drawer → Directions',
    caption: 'Canonical: pick a nearby pin, open drawer, get directions.',
    beat: 'go',
    loop: true,
    startScreen: 'map',
    steps: goCanonical(),
  },
  {
    id: 'go-bitemap-chip',
    title: '2 Home Bitemap chip → go',
    caption: 'Bitemap chip from home → pin → Directions.',
    beat: 'go',
    loop: true,
    startScreen: 'home',
    steps: goBitemapChip(),
  },
  {
    id: 'go-pan-then-pin',
    title: '3 Pan map then select pin',
    caption: 'Pan the map, then select a pin and go.',
    beat: 'go',
    loop: true,
    startScreen: 'map',
    steps: goPanThenPin(),
  },
  {
    id: 'go-pin-full-details',
    title: '4 Pin → full details → Directions',
    caption: 'Open full bite details from the pin, then Directions.',
    beat: 'go',
    loop: true,
    startScreen: 'map',
    steps: goPinFullDetails(),
  },
  {
    id: 'go-compare-two-pins',
    title: '5 Compare two pins then choose',
    caption: 'Peek two pins, then commit to one and go.',
    beat: 'go',
    loop: true,
    startScreen: 'map',
    steps: goCompareTwoPins(),
  },
  {
    id: 'go-recenter-nearest',
    title: '6 Recenter then nearest pin',
    caption: 'My-location recenter, then open the nearest pin.',
    beat: 'go',
    loop: true,
    startScreen: 'map',
    steps: goRecenterNearest(),
  },
  {
    id: 'go-drawer-expand',
    title: '7 Drawer expand then navigate',
    caption: 'Expand the pin drawer, then navigate.',
    beat: 'go',
    loop: true,
    startScreen: 'map',
    steps: goDrawerExpand(),
  },
  {
    id: 'go-pin-details-back',
    title: '8 Pin → details → back to map',
    caption: 'Open details from a pin, then return to the map.',
    beat: 'go',
    loop: true,
    startScreen: 'map',
    steps: goPinDetailsBack(),
  },
  {
    id: 'go-farthest-then-nearest',
    title: '9 Farthest then nearest',
    caption: 'Distance focus: peek farthest, then go to nearest.',
    beat: 'go',
    loop: true,
    startScreen: 'map',
    steps: goFarthestThenNearest(),
  },
  {
    id: 'go-walking-success',
    title: '10 Walking / directions success',
    caption: 'Complete the arc on a walking / directions success state.',
    beat: 'go',
    loop: true,
    startScreen: 'map',
    steps: goWalkingSuccess(),
  },
];

export const TRIBE_GO_FLOWS: IntroFlowVariant[] = [
  ...JOIN_THE_TRIBE_FLOWS,
  ...READY_TO_TASTE_FLOWS,
];

export const TRIBE_GO_FLOW_BY_ID: Record<string, IntroFlowVariant> =
  Object.fromEntries(TRIBE_GO_FLOWS.map((f) => [f.id, f]));
