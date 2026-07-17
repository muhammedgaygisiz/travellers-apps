/**
 * The surfaces that teach a feature with a coach mark on first visit. Each id
 * has its own seen flag, so a mark is shown and dismissed independently of the
 * others (there is no dismiss-all).
 *
 * `home-feed` and `create-bite` both live on the home surface and are shown in
 * turn: the create-Bite mark waits until the feed mark has been dismissed.
 */
export type CoachMarkSurface =
  | 'home-feed'
  | 'create-bite'
  | 'map'
  | 'bucket-lists'
  | 'leaderboard';
