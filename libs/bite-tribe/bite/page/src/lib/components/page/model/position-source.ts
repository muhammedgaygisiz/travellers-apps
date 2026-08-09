import { MarkerColor } from 'bite-tribe-common/map';
import type { Geopoint } from 'model';

/**
 * Where the position on the Bite form came from. Tracked explicitly instead of
 * inferred by comparing coordinates: two sources can resolve to the same point,
 * and a position with no matching candidate used to report no source at all.
 */
export type PositionSource =
  'photo' | 'gps' | 'restaurant' | 'google' | 'manual';

/** Transloco key naming each source in the text row and the modal list. */
export const POSITION_SOURCE_LABEL_KEYS: Record<PositionSource, string> = {
  photo: 'from-photo',
  gps: 'from-gps',
  restaurant: 'from-restaurant',
  google: 'from-google',
  manual: 'from-manual',
};

/** Marker colour each source gets on the comparison map. */
export const POSITION_SOURCE_COLORS: Record<PositionSource, MarkerColor> = {
  photo: MarkerColor.RED,
  gps: MarkerColor.BLUE,
  restaurant: MarkerColor.GREEN,
  google: MarkerColor.ORANGE,
  manual: MarkerColor.PURPLE,
};

/**
 * Label used when a position exists but its source is not known, for example an
 * existing Bite opened for editing.
 */
export const UNKNOWN_POSITION_SOURCE_LABEL_KEY = 'position-source-unknown';

/**
 * One row of the edit modal. Sources without a position stay listed and
 * disabled with a reason, so the user learns the option exists instead of
 * meeting a dead button.
 */
export interface PositionCandidate {
  source: PositionSource;
  labelKey: string;
  color: MarkerColor;
  position?: Geopoint;
  disabled: boolean;
  /** Set only while the source has nothing to offer. */
  unavailableReasonKey?: string;
}
