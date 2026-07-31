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
  script().push(nav(screen, biteId)).wait(900);

// ─── Join the tribe (10) ────────────────────────────────────────────────────

/** 1. Canonical: details → creator → Follow */
const tribeCanonical = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'resetFollow' })
    .push(nav('details', BOTANIC))
    .wait(1100)
    .appear({ x: 70, y: 58 })
    .tap('.bite-creator-container', { approachMs: 750 })
    .wait(180)
    .push(nav('profile'))
    .wait(800)
    .appear({ x: 78, y: 30 })
    .tap('.profile-actions ion-button', { approachMs: 650 })
    .emit({ type: 'follow' })
    .wait(2200)
    .hide()
    .wait(500)
    .build();

/** 2. Follow then open their bites grid */
const tribeFollowBitesGrid = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'resetFollow' })
    .push(nav('details', BOTANIC))
    .wait(900)
    .appear({ x: 68, y: 56 })
    .tap('.bite-creator-container', { approachMs: 700 })
    .wait(160)
    .push(nav('profile'))
    .wait(700)
    .appear({ x: 78, y: 30 })
    .tap('.profile-actions ion-button', { approachMs: 600 })
    .emit({ type: 'follow' })
    .wait(900)
    .appear({ x: 52, y: 72 })
    .scrollToTarget('.bites-section', 900, {
      alignY: 42,
      pointerX: 52,
      easing: easeInOutCubic,
    })
    .wait(400)
    .tap(`bt-bite[data-bite-id="${BOTANIC}"]`, { approachMs: 520 })
    .wait(120)
    .push(nav('details', BOTANIC))
    .wait(1400)
    .hide()
    .wait(400)
    .build();

/** 3. Unfollow then re-follow */
const tribeUnfollowRefollow = (): GestureScriptStep[] =>
  script()
    .push(nav('profile'))
    .wait(900)
    .appear({ x: 78, y: 30 })
    .tap('.profile-actions ion-button', { approachMs: 650 })
    .emit({ type: 'showUnfollowConfirm' })
    .wait(500)
    .tap('[data-intro="unfollow-confirm-yes"]', { approachMs: 480 })
    .emit({ type: 'unfollow' })
    .emit({ type: 'hideUnfollowConfirm' })
    .wait(900)
    .appear({ x: 78, y: 30 })
    .tap('.profile-actions ion-button', { approachMs: 650 })
    .emit({ type: 'follow' })
    .wait(2000)
    .hide()
    .wait(450)
    .build();

/** 4. Follow from details without full profile (inline chip shortcut) */
const tribeProfileShortcut = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'resetFollow' })
    .push(nav('details', BOTANIC))
    .wait(900)
    .emit({ type: 'showInlineFollow' })
    .wait(500)
    .appear({ x: 82, y: 42 })
    .tap('[data-intro="inline-follow"]', { approachMs: 620 })
    .emit({ type: 'follow' })
    .wait(700)
    .emit({ type: 'hideInlineFollow' })
    .wait(400)
    // Confirm on profile as the lasting social state
    .push(nav('profile'))
    .wait(1600)
    .hide()
    .wait(400)
    .build();

/** 5. Bucket-list save as join-adjacent social act */
const tribeBucketlistSave = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearBucketlist' })
    .emit({ type: 'resetFollow' })
    .push(nav('details', BOTANIC))
    .wait(1000)
    .appear({ x: 78, y: 68 })
    .tap('[data-testid="bite-details-bucket-list"]', { approachMs: 700 })
    .emit({ type: 'saveBucketlist' })
    .wait(1400)
    .appear({ x: 68, y: 42 })
    .tap('.bite-creator-container', { approachMs: 650 })
    .wait(160)
    .push(nav('profile'))
    .wait(700)
    .tap('.profile-actions ion-button', { approachMs: 600 })
    .emit({ type: 'follow' })
    .wait(1800)
    .hide()
    .wait(400)
    .build();

/** 6. Follow + follower count bump emphasis */
const tribeFollowerCountBump = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'resetFollow' })
    .emit({ type: 'clearEmphasizeFollowers' })
    .push(nav('profile'))
    .wait(1000)
    .appear({ x: 78, y: 30 })
    .tap('.profile-actions ion-button', { approachMs: 650 })
    .emit({ type: 'follow' })
    .emit({ type: 'emphasizeFollowers' })
    .wait(2400)
    .hide()
    .wait(450)
    .build();

/** 7. Open profile from menu then follow (via leaderboard) */
const tribeMenuThenFollow = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'resetFollow' })
    .push(nav('home'))
    .wait(900)
    .appear({ x: 88, y: 10 })
    .tap('[data-testid="btn-menu"]', { approachMs: 550 })
    .emit({ type: 'showMenu' })
    .wait(600)
    .tap('[data-testid="menu-leaderboard"]', { approachMs: 580 })
    .emit({ type: 'hideMenu' })
    .wait(140)
    .push(nav('leaderboard'))
    .wait(900)
    .appear({ x: 50, y: 36 })
    .tap('[data-intro="leaderboard-lina"]', { approachMs: 650 })
    .wait(160)
    .push(nav('profile'))
    .wait(800)
    .tap('.profile-actions ion-button', { approachMs: 600 })
    .emit({ type: 'follow' })
    .wait(2000)
    .hide()
    .wait(400)
    .build();

/** 8. Follow two creators — tribe building */
const tribeTwoCreators = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'resetFollow' })
    .emit({ type: 'setCreator', creatorId: 'lina' })
    .push(nav('profile'))
    .wait(800)
    .appear({ x: 78, y: 30 })
    .tap('.profile-actions ion-button', { approachMs: 600 })
    .emit({ type: 'follow' })
    .wait(1200)
    .emit({ type: 'setCreator', creatorId: 'marco' })
    .emit({ type: 'resetFollow' })
    .wait(200)
    .push(nav('home'))
    .wait(500)
    .push(nav('profile'))
    .wait(800)
    .appear({ x: 78, y: 30 })
    .tap('.profile-actions ion-button', { approachMs: 600 })
    .emit({ type: 'follow' })
    .wait(2000)
    .hide()
    .wait(400)
    .build();

/** 9. Public vs private awareness tip then follow */
const tribePublicPrivateTip = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'resetFollow' })
    .push(nav('details', BOTANIC))
    .wait(800)
    .emit({
      type: 'showTip',
      title: 'Public explorers',
      body: 'Only public profiles show a creator you can follow.',
    })
    .wait(1600)
    .appear({ x: 72, y: 78 })
    .tap('[data-intro="tip-next"]', { approachMs: 520 })
    .emit({ type: 'hideTip' })
    .wait(300)
    .tap('.bite-creator-container', { approachMs: 650 })
    .wait(160)
    .push(nav('profile'))
    .wait(700)
    .tap('.profile-actions ion-button', { approachMs: 600 })
    .emit({ type: 'follow' })
    .wait(2000)
    .hide()
    .wait(400)
    .build();

/** 10. Follow then leaderboard peek / profile stats */
const tribeLeaderboardPeek = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'resetFollow' })
    .push(nav('profile'))
    .wait(900)
    .appear({ x: 78, y: 30 })
    .tap('.profile-actions ion-button', { approachMs: 600 })
    .emit({ type: 'follow' })
    .emit({ type: 'emphasizeFollowers' })
    .wait(1200)
    .appear({ x: 78, y: 18 })
    .tap('.profile-header .header-column:last-child .clickable', {
      approachMs: 550,
    })
    .wait(400)
    .push(nav('leaderboard'))
    .wait(2000)
    .hide()
    .wait(400)
    .build();

// ─── Ready to taste? (10) ───────────────────────────────────────────────────

/** 1. Canonical: map → pin → drawer → Directions */
const goCanonical = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearHighlight' })
    .emit({ type: 'clearPin' })
    .emit({ type: 'clearWalkingSuccess' })
    .push(nav('map'))
    .wait(1100)
    .appear({ x: 72, y: 28 })
    .moveTo({ x: 48, y: 46 }, 700, easeOutCubic)
    .tap({ x: 48, y: 46 }, { approachMs: 200 })
    .emit({ type: 'selectPin', biteId: BOTANIC })
    .wait(1700)
    .tap('[data-intro="map-drawer"]', { approachMs: 560 })
    .wait(160)
    .push(nav('details', BOTANIC))
    .wait(700)
    .tap('[data-testid="bite-details-navigation"]', { approachMs: 650 })
    .emit({ type: 'highlightDirections' })
    .wait(1600)
    .hide()
    .wait(400)
    .build();

/** 2. Home Bitemap chip → map → pin → go */
const goBitemapChip = (): GestureScriptStep[] =>
  land('home')
    .appear({ x: 78, y: 22 })
    .tap('[data-testid="bitemap-chip"]', { approachMs: 650 })
    .wait(140)
    .push(nav('map'))
    .wait(900)
    .appear({ x: 55, y: 44 })
    .tap({ x: 48, y: 46 }, { approachMs: 400 })
    .emit({ type: 'selectPin', biteId: BOTANIC })
    .wait(1400)
    .tap('[data-intro="map-drawer"] .stage-drawer__go', { approachMs: 520 })
    .wait(140)
    .push(nav('details', BOTANIC))
    .wait(600)
    .tap('[data-testid="bite-details-navigation"]', { approachMs: 600 })
    .emit({ type: 'highlightDirections' })
    .wait(1500)
    .hide()
    .wait(400)
    .build();

/** 3. Pan map then select pin */
const goPanThenPin = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearPin' })
    .emit({ type: 'resetMapPan' })
    .push(nav('map'))
    .wait(900)
    .appear({ x: 60, y: 40 })
    .down()
    .drag({ x: 32, y: 52 }, 900, {
      onProgress: (t) => {
        /* pan driven by emit after drag */
        void t;
      },
      easing: easeInOutCubic,
    })
    .up()
    .emit({ type: 'panMap', dxPct: -10, dyPct: 6 })
    .wait(600)
    .tap({ x: 52, y: 44 }, { approachMs: 450 })
    .emit({ type: 'selectPin', biteId: BOTANIC })
    .wait(1600)
    .tap('[data-intro="map-drawer"]', { approachMs: 520 })
    .wait(140)
    .push(nav('details', BOTANIC))
    .wait(600)
    .tap('[data-testid="bite-details-navigation"]', { approachMs: 600 })
    .emit({ type: 'highlightDirections' })
    .wait(1400)
    .hide()
    .wait(400)
    .build();

/** 4. Select pin → open full details → Directions */
const goPinFullDetails = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearPin' })
    .emit({ type: 'clearHighlight' })
    .push(nav('map'))
    .wait(900)
    .appear({ x: 50, y: 48 })
    .tap({ x: 48, y: 46 }, { approachMs: 400 })
    .emit({ type: 'selectPin', biteId: BOTANIC })
    .wait(1200)
    .tap('[data-intro="map-drawer"]', { approachMs: 520 })
    .wait(160)
    .push(nav('details', BOTANIC))
    .wait(1400) // read full details
    .tap('[data-testid="bite-details-navigation"]', { approachMs: 650 })
    .emit({ type: 'highlightDirections' })
    .wait(1600)
    .hide()
    .wait(400)
    .build();

/** 5. Compare two pins then choose one */
const goCompareTwoPins = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearPin' })
    .push(nav('map'))
    .wait(900)
    .appear({ x: 40, y: 42 })
    .tap({ x: 38, y: 40 }, { approachMs: 400 })
    .emit({ type: 'selectPin', biteId: COMPARE_A })
    .wait(1400)
    .appear({ x: 58, y: 50 })
    .tap({ x: 55, y: 48 }, { approachMs: 450 })
    .emit({ type: 'selectPin', biteId: COMPARE_B })
    .wait(1400)
    .tap('[data-intro="map-drawer"]', { approachMs: 520 })
    .wait(160)
    .push(nav('details', COMPARE_B))
    .wait(600)
    .tap('[data-testid="bite-details-navigation"]', { approachMs: 600 })
    .emit({ type: 'highlightDirections' })
    .wait(1500)
    .hide()
    .wait(400)
    .build();

/** 6. Recenter my-location then nearest pin */
const goRecenterNearest = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearPin' })
    .emit({ type: 'resetMapPan' })
    .push(nav('map'))
    .wait(900)
    .emit({ type: 'panMap', dxPct: 12, dyPct: -8 })
    .wait(700)
    .appear({ x: 88, y: 82 })
    .tap('[data-testid="btn-my-position"]', { approachMs: 550 })
    .emit({ type: 'resetMapPan' })
    .wait(800)
    .appear({ x: 42, y: 44 })
    .tap({ x: 40, y: 42 }, { approachMs: 400 })
    .emit({ type: 'selectPin', biteId: NEAREST })
    .wait(1500)
    .tap('[data-intro="map-drawer"]', { approachMs: 520 })
    .wait(140)
    .push(nav('details', NEAREST))
    .wait(600)
    .tap('[data-testid="bite-details-navigation"]', { approachMs: 600 })
    .emit({ type: 'highlightDirections' })
    .wait(1400)
    .hide()
    .wait(400)
    .build();

/** 7. Drawer expand then navigate */
const goDrawerExpand = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearPin' })
    .emit({ type: 'collapseDrawer' })
    .push(nav('map'))
    .wait(900)
    .appear({ x: 50, y: 48 })
    .tap({ x: 48, y: 46 }, { approachMs: 400 })
    .emit({ type: 'selectPin', biteId: BOTANIC })
    .wait(1000)
    .appear({ x: 50, y: 78 })
    .tap('[data-intro="drawer-handle"]', { approachMs: 450 })
    .emit({ type: 'expandDrawer' })
    .wait(1200)
    .tap('[data-intro="map-drawer"] .stage-drawer__go', { approachMs: 520 })
    .wait(140)
    .push(nav('details', BOTANIC))
    .wait(600)
    .tap('[data-testid="bite-details-navigation"]', { approachMs: 600 })
    .emit({ type: 'highlightDirections' })
    .wait(1400)
    .hide()
    .wait(400)
    .build();

/** 8. Pin → details → back to map */
const goPinDetailsBack = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearPin' })
    .push(nav('map'))
    .wait(900)
    .appear({ x: 50, y: 48 })
    .tap({ x: 48, y: 46 }, { approachMs: 400 })
    .emit({ type: 'selectPin', biteId: BOTANIC })
    .wait(1200)
    .tap('[data-intro="map-drawer"]', { approachMs: 520 })
    .wait(160)
    .push(nav('details', BOTANIC))
    .wait(1200)
    .appear({ x: 12, y: 10 })
    .tap('ion-back-button', { approachMs: 480 })
    .wait(140)
    .push(nav('map'))
    .emit({ type: 'selectPin', biteId: BOTANIC })
    .wait(1600)
    .hide()
    .wait(400)
    .build();

/** 9. Distance-focused: farthest then nearest */
const goFarthestThenNearest = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearPin' })
    .push(nav('map'))
    .wait(900)
    .appear({ x: 68, y: 58 })
    .tap({ x: 66, y: 56 }, { approachMs: 400 })
    .emit({ type: 'selectPin', biteId: FARTHEST })
    .wait(1400)
    .appear({ x: 40, y: 42 })
    .tap({ x: 38, y: 40 }, { approachMs: 450 })
    .emit({ type: 'selectPin', biteId: NEAREST })
    .wait(1400)
    .tap('[data-intro="map-drawer"]', { approachMs: 520 })
    .wait(140)
    .push(nav('details', NEAREST))
    .wait(600)
    .tap('[data-testid="bite-details-navigation"]', { approachMs: 600 })
    .emit({ type: 'highlightDirections' })
    .wait(1400)
    .hide()
    .wait(400)
    .build();

/** 10. End on walking / directions success state */
const goWalkingSuccess = (): GestureScriptStep[] =>
  script()
    .emit({ type: 'clearPin' })
    .emit({ type: 'clearWalkingSuccess' })
    .emit({ type: 'clearHighlight' })
    .push(nav('map'))
    .wait(900)
    .appear({ x: 50, y: 48 })
    .tap({ x: 48, y: 46 }, { approachMs: 400 })
    .emit({ type: 'selectPin', biteId: BOTANIC })
    .wait(1200)
    .tap('[data-intro="map-drawer"]', { approachMs: 520 })
    .wait(140)
    .push(nav('details', BOTANIC))
    .wait(600)
    .tap('[data-testid="bite-details-navigation"]', { approachMs: 600 })
    .emit({ type: 'highlightDirections' })
    .wait(800)
    .emit({ type: 'walkingSuccess' })
    .wait(2400)
    .hide()
    .wait(450)
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
