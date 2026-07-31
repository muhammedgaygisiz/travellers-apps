/**
 * Shared intro-story gesture timings.
 *
 * Celebratory / state moments must stay readable — prefer these constants
 * over one-off magic numbers in beat and flow scripts.
 */

/** Brief settle after a tap before the next move (cursor + UI catch up). */
export const SETTLE_MS = 520;

/** Short pause right after a press–release before an emit/nav. */
export const TAP_PAUSE_MS = 360;

/** Soft land on a screen before the first gesture. */
export const LAND_MS = 1300;

/** Default approach into a tap target. */
export const APPROACH_MS = 780;

/** Default moveTo duration toward a control. */
export const MOVE_MS = 880;

/** Hold after Create Bite opens so the form is readable. */
export const CREATE_LAND_MS = 1100;

/** Hold with the image picker sheet fully open (before choosing a photo). */
export const PICKER_OPEN_HOLD_MS = 1400;

/** Hold the selected photo highlight in the picker. */
export const PHOTO_SELECT_HOLD_MS = 1100;

/** Hold after the photo appears on the create form. */
export const PHOTO_APPEAR_HOLD_MS = 2000;

/** Thumbs-up / reaction burst — must stay visible ~2.5s+. */
export const REACTION_HOLD_MS = 3200;

/** Spacing between staggered reaction bursts (ms from first). */
export const REACTION_BURST_GAP_MS = [0, 1000, 2000] as const;

/** Following toast / badge hold. */
export const FOLLOW_HOLD_MS = 3200;

/** Map pin drawer fully open. */
export const DRAWER_HOLD_MS = 2600;

/** Directions CTA highlight hold. */
export const DIRECTIONS_HOLD_MS = 2400;

/** Bite details screen hold. */
export const DETAILS_HOLD_MS = 2400;

/** Gap before looping a beat (legacy hard-loop — prefer soft replay). */
export const LOOP_GAP_MS = 600;

/** Hold the success state after the last intentional action. */
export const RESOLVE_HOLD_MS = 2400;

/** Soft particle celebrate burst around the success element. */
export const CELEBRATE_MS = 2000;

/** Cheerful final frame settle before soft replay (single-beat). */
export const REPLAY_SETTLE_MS = 2800;

/** Soft fade out before restarting a single-beat story. */
export const REPLAY_FADE_MS = 850;

/** Create-form photo control (real `image-upload`). */
export const CREATE_PHOTO_SEL = 'image-upload';

/** Picker grid cell by index. */
export const pickerPhotoSel = (index = 0): string =>
  `[data-intro="picker-photo-${index}"]`;
