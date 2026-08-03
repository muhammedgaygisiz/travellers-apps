import type { IntroStageScreen } from '../gesture';

/**
 * Parent-driven stage cue for coach-mark / progressive-disclosure variants.
 * When set on RealUiSource, gesture replay stays off and the stage follows this cue.
 */
export interface IntroCoachState {
  screen: IntroStageScreen;
  selectedBiteId?: string;
  pickerOpen?: boolean;
  pickerSelected?: boolean;
  createImagePath?: string;
  /** When set, opens the stage-owned map drawer for that bite. */
  mapPinId?: string | null;
  followed?: boolean;
  directionsHighlight?: boolean;
  /** Scroll a selector into view inside the active layer (e.g. a feed card). */
  scrollSelector?: string | null;
}
