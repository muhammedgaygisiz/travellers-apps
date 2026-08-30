import { PATH } from 'utils';

/**
 * The surface a notification talks about, as it appears in a delivered
 * notification and as a route names it.
 *
 * A notification the backend sent carries a collapse key shaped
 * `<type>[:<surface>[:<variant>]]` (see `notification-collapse.ts` in the
 * Cloud Functions). That key is the only thing about a delivered notification
 * the app can still read once the OS has it, so it is what the surface is
 * recovered from - not the payload, which the drawer does not keep.
 *
 * Matching a route against it is what lets opening a Bite clear the
 * notifications about that Bite (issue \#1366).
 */

/** Separates the segments of a collapse key. */
const SEPARATOR = ':';

/**
 * Surfaces for the notification types whose page is fixed and carries no id.
 *
 * Their collapse key is the type alone, so the type is also the surface. The
 * literals mirror the payload `type` values the backend sends; they are the
 * same contract `toNotificationTarget` routes on.
 */
const LEADERBOARD_SURFACE = 'LEADERBOARD_RANK_CHANGE';
const WEEKLY_BITES_SURFACE = 'WEEKLY_BITE_SUMMARY';

/**
 * Reads the surface out of a delivered notification's collapse key.
 *
 * A key with no surface segment is about a fixed page, and there the type is the
 * surface.
 */
const toSurface = (collapseKey: string): string => {
  const [type, surface] = collapseKey.split(SEPARATOR);

  return surface ?? type;
};

/**
 * Whether a delivered notification's collapse key is about the given surface.
 *
 * The key reaches the app as the notification `tag` on Android and as the
 * notification `id` on iOS, which is the `apns-collapse-id` it was sent with.
 * A notification carrying neither predates this contract and cannot be matched;
 * it is left in the drawer rather than guessed at.
 */
export const isNotificationForSurface = (
  collapseKey: string | undefined,
  surface: string,
): boolean => !!collapseKey && toSurface(collapseKey) === surface;

/**
 * Reads the surface a route is showing, so the notifications about it can be
 * cleared once the user is looking at the thing they announced.
 *
 * This is the inverse of {@link toNotificationTarget}: that maps a payload to
 * the route it opens, this maps a route back to what the payload named. Pages
 * nested under a Bite - its restaurant, menu, or Bite list - count as that
 * Bite, because the user reading them has plainly seen it.
 *
 * `ownUid` resolves the one route that names a profile without carrying its id.
 * Returns nothing for a route no notification talks about.
 */
export const toNotificationSurface = (
  url: string,
  ownUid: string | undefined,
): string | undefined => {
  const [path] = url.split('?');
  const [page, id] = path.split('/').filter(Boolean);

  switch (page) {
    case PATH.BITE:
      return id;

    case PATH.PROFILE:
      return id;

    case PATH.MY_PROFILE:
      return ownUid;

    case PATH.LEADERBOARD:
      return LEADERBOARD_SURFACE;

    case PATH.WEEKLY_BITES:
      return WEEKLY_BITES_SURFACE;

    default:
      return undefined;
  }
};
