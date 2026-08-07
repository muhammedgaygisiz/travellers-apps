import { PATH } from 'utils';

/**
 * Where a tapped notification takes the user.
 *
 * The tap is turned into a target rather than into a navigation so the decision
 * (what the notification is about) stays separate from the timing (when the app
 * is ready to show it). Startup can only postpone a target it can hold on to
 * (issue #1244).
 */
export type NotificationTarget = {
  /** Router commands, as passed to `navigateForward`. */
  commands: string[];
  /** Navigation extras, omitted when the target needs none. */
  extras?: { queryParams: Record<string, string> };
};

/**
 * Turns the week bounds of a weekly summary payload into navigation query
 * params. Push data arrives as strings, and a payload without a complete range
 * yields no params at all so the page can pick its own default week.
 */
const toWeekRangeOptions = (
  data: Record<string, string>,
): NotificationTarget['extras'] => {
  const weekStart = data['weekStart'];
  const weekEnd = data['weekEnd'];

  if (!weekStart || !weekEnd) {
    return undefined;
  }

  return { queryParams: { weekStart, weekEnd } };
};

/**
 * Reads the surface a notification talks about out of its payload.
 *
 * Returns `undefined` for a type this app does not route, and for a payload
 * missing the id its route needs. Both are bounded outcomes: the user stays
 * where they are instead of being sent to a half-built route or to a page the
 * notification never mentioned.
 *
 * `userUid` is the recipient, needed only where the same payload reaches
 * several people and the route depends on which one tapped it.
 */
export const toNotificationTarget = (
  data: Record<string, string> | undefined,
  userUid: string | undefined,
): NotificationTarget | undefined => {
  if (!data?.['type']) {
    return undefined;
  }

  switch (data['type']) {
    case 'NEW_BITE':
    case 'NEW_BITE_REVIEW':
    case 'NEW_BITE_LIKE':
      return data['biteId']
        ? { commands: [PATH.BITE, data['biteId']] }
        : undefined;

    case 'NEW_FOLLOWER':
      return data['followerUid']
        ? { commands: [PATH.PROFILE, data['followerUid']] }
        : undefined;

    case 'LEADERBOARD_RANK_CHANGE':
      return { commands: [PATH.LEADERBOARD] };

    case 'NEW_COUNTRY_BADGE':
      // The badge lives on the profile of whoever earned it. The same payload
      // reaches the achiever and their followers, so the achiever is sent to
      // their own profile page rather than to a read-only view of themselves.
      if (!data['userId']) {
        return undefined;
      }

      return data['userId'] === userUid
        ? { commands: [PATH.MY_PROFILE] }
        : { commands: [PATH.PROFILE, data['userId']] };

    case 'WEEKLY_BITE_SUMMARY':
      // The summary counts one specific week, so carry its bounds into the page
      // instead of dropping the user on the home feed. Older payloads have no
      // bounds; the page then falls back to the previous week.
      return {
        commands: [PATH.WEEKLY_BITES],
        extras: toWeekRangeOptions(data),
      };

    default:
      return undefined;
  }
};
