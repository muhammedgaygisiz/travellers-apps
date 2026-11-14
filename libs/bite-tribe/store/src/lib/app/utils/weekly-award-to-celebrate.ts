import { Preferences } from '@capacitor/preferences';
import type { PublicUser, WeeklyBadge } from 'model';

/** Device storage of the last won week celebrated, per account. */
export const CELEBRATED_AWARD_KEY_PREFIX = 'weekly-award-celebrated:';

/**
 * The badge a winner's celebration names: the better place, and on a tie the
 * This week one - the same choice as the push (issue #2031).
 */
export const bestWeeklyBadge = (
  badges: WeeklyBadge[] | undefined,
): WeeklyBadge | undefined =>
  [...(badges ?? [])]
    .filter((badge) => badge.place >= 1 && badge.place <= 3)
    .sort(
      (a, b) =>
        a.place - b.place ||
        Number(a.board === 'mostLiked') - Number(b.board === 'mostLiked'),
    )[0];

/**
 * The badge to celebrate when the app opens, or nothing.
 *
 * A badge is celebrated once per won week on this device: the week is
 * remembered in {@link Preferences} after the celebration. A second phone
 * plays it again, which is fine for a once-a-week moment, and the push has
 * already told the user wherever they are.
 */
export const weeklyAwardToCelebrate = async (
  profile: Pick<PublicUser, 'userId' | 'weeklyBadges'> | undefined,
): Promise<WeeklyBadge | undefined> => {
  const badge = bestWeeklyBadge(profile?.weeklyBadges);

  if (!profile?.userId || !badge) {
    return undefined;
  }

  const key = `${CELEBRATED_AWARD_KEY_PREFIX}${profile.userId}`;
  const { value } = await Preferences.get({ key });

  if (value === badge.week) {
    return undefined;
  }

  await Preferences.set({ key, value: badge.week });

  return badge;
};
