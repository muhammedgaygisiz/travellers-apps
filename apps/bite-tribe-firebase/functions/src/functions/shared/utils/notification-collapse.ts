/**
 * The identity a notification collapses on.
 *
 * Without one, FCM gives every message its own notification id and the OS keeps
 * all of them: a daily leaderboard message stacks a new entry every morning, and
 * an active account accumulates a wall of them (issue \#1366).
 *
 * The key carries the collapse identity in its first segment and the surface the
 * notification opens in its second:
 *
 * ```text
 * <type>[:<surface>[:<variant>]]
 * ```
 *
 * That layout is what lets the app clear a surface's notifications without
 * knowing the payload that produced them - the delivered notification carries
 * only this key, and the surface can be read straight back out of it. A type
 * whose surface is a fixed page has no id to name, so the key is the type alone
 * and the type doubles as the surface.
 */

/** Separates the segments of a collapse key. */
const SEPARATOR = ':';

/**
 * Builds a key from its segments, or nothing when a segment the key needs is
 * missing.
 *
 * A missing id must not be filled in or dropped: `NEW_BITE_LIKE` alone would
 * collapse likes on unrelated Bites into a single notification. Returning
 * nothing leaves the message uncollapsed, which is the behavior every
 * notification had before this key existed.
 */
const buildKey = (
  type: string,
  ...ids: (string | undefined)[]
): string | undefined =>
  ids.every((id) => !!id) ? [type, ...ids].join(SEPARATOR) : undefined;

/**
 * Reads the collapse identity out of a notification payload.
 *
 * Two notifications sharing a key are the same notification restated, so the
 * later one replaces the earlier rather than joining it in the drawer. Type is
 * always part of the identity: a like and a review on one Bite are different
 * events with different copy, and collapsing them together would lose one.
 *
 * Returns nothing for a payload this app does not collapse, which leaves FCM's
 * default behavior of one notification per message.
 */
export const buildCollapseKey = (
  data: Record<string, string>,
): string | undefined => {
  const type = data['type'];

  if (!type) {
    return undefined;
  }

  switch (type) {
    case 'NEW_BITE':
    case 'NEW_BITE_REVIEW':
    case 'NEW_BITE_LIKE':
      return buildKey(type, data['biteId']);

    case 'NEW_REVIEW_REPLY':
      // A Bite holds many conversations, so replies collapse per thread while
      // still naming the Bite as their surface (issue \#1283).
      return buildKey(type, data['biteId'], data['threadId']);

    case 'NEW_FOLLOWER':
      return buildKey(type, data['followerUid']);

    case 'NEW_COUNTRY_BADGE':
      // Two countries earned by the same person are two achievements, so the
      // country is a variant rather than part of the surface. Both still clear
      // when their profile is opened.
      return buildKey(type, data['userId'], data['countryCode']);

    case 'LEADERBOARD_RANK_CHANGE':
    case 'WEEKLY_BITE_SUMMARY':
    case 'NEW_VERSION_AVAILABLE':
      // A fixed page, sent on a schedule. Yesterday's standing is superseded by
      // today's rather than kept beside it, so the type is the whole key.
      return type;

    default:
      return undefined;
  }
};

/**
 * Reads the surface a collapse key opens.
 *
 * This is what iOS groups on: every notification about one Bite shares a
 * thread, so the OS collapses them under a summary instead of listing each.
 */
export const toSurfaceKey = (collapseKey: string): string => {
  const [type, surface] = collapseKey.split(SEPARATOR);

  return surface ?? type;
};
