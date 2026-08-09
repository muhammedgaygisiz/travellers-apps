/**
 * Where the position on a Bite came from. Stored with the Bite so a Bite
 * reopened for editing can still say which source produced its position, rather
 * than inferring it by comparing coordinates: two sources can resolve to the
 * same point, and a stored position matches no candidate at all.
 */
export type PositionSource =
  'photo' | 'gps' | 'restaurant' | 'google' | 'manual';
