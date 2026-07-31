/**
 * Intro-story gesture framework — public API.
 *
 *   import {
 *     SyncedGestureController, IntroGesturePlayer,
 *     G, script, SoftDotPointerComponent,
 *     fitPhoneStage, fitPhoneStageTransform,
 *   } from '../gesture';
 *
 * Single rAF timeline; scrollSynced/drag share progress `t` with the pointer.
 * Soft-dot only — no cartoon hand. Stage helper fits 390×844 into the frame.
 */

export {
  easeLinear,
  easeOutCubic,
  easeInOutCubic,
  easeOutExpoish,
  lerp,
  type EasingFn,
} from './easing';

export {
  G,
  script,
  GestureScriptBuilder,
  type PointPct,
  type PointOrSelector,
  type GestureEmit,
  type GestureScriptStep,
} from './gesture-script';

export {
  SyncedGestureController,
  IntroGesturePlayer,
  SyncedGesturePlayer,
  elementCenterPct,
  type PointerState,
  type SyncedGestureControllerOptions,
} from './synced-gesture-controller';

export { SoftDotPointerComponent } from './soft-dot-pointer.component';

export { IntroIphoneShellComponent } from './intro-iphone-shell.component';

export {
  fitPhoneStage,
  fitPhoneStageTransform,
  PHONE_STAGE_NATIVE,
  type FitPhoneStageInput,
  type FitPhoneStageResult,
  type PhoneStageSize,
} from './phone-stage-scale';

export {
  INTRO_BEAT_SCRIPTS,
  type IntroBeatScript,
  type IntroStageScreen,
} from './beat-scripts';

export {
  SETTLE_MS,
  TAP_PAUSE_MS,
  LAND_MS,
  APPROACH_MS,
  MOVE_MS,
  CREATE_LAND_MS,
  PICKER_OPEN_HOLD_MS,
  PHOTO_SELECT_HOLD_MS,
  PHOTO_APPEAR_HOLD_MS,
  REACTION_HOLD_MS,
  REACTION_BURST_GAP_MS,
  FOLLOW_HOLD_MS,
  DRAWER_HOLD_MS,
  DIRECTIONS_HOLD_MS,
  DETAILS_HOLD_MS,
  LOOP_GAP_MS,
  RESOLVE_HOLD_MS,
  CELEBRATE_MS,
  REPLAY_SETTLE_MS,
  REPLAY_FADE_MS,
  CREATE_PHOTO_SEL,
  pickerPhotoSel,
} from './timing';

export {
  appendPickPhoto,
  appendBrowsePickerThenPick,
  appendAppearAndPickPhoto,
} from './script-phrases';

export { DISCOVER_TARGET_BITE_ID } from '../source-real-ui/intro-demo-fixtures';
