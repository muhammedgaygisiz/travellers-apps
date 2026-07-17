/**
 * The surfaces that teach a feature with a coach mark on first visit. Each id
 * has its own seen flag, so a mark is shown and dismissed independently of the
 * others (there is no dismiss-all).
 *
 * `home-feed`, `home-feed-controls`, and `create-bite` live on the home surface
 * and are shown in turn: each mark waits until the previous one has settled.
 */
export type CoachMarkSurface =
  | 'home-feed'
  | 'home-feed-controls'
  | 'create-bite'
  | 'map'
  | 'bucket-lists'
  | 'leaderboard';
