import { Firestore } from 'firebase-admin/firestore';
import { isListableBite } from '../shared/utils/bite-listability';
import {
  FollowUpBite,
  MAX_MONITORS,
  MAX_PICKS,
} from './new-user-follow-up-picks';
import { toHttpsUrl, toText } from './suggestable-person';

/**
 * The document that names the fallback of the day-7 mail (GitHub issue #1874).
 *
 * Written from the Firebase console like `config/newUserFollowUp`, and closed
 * to every client by the same `config` rule. Its Bites only fill the places
 * the people a recipient follows left empty, so the list is longer than the
 * three a mail shows: the Bites the day-1 mail already showed are taken out of
 * it per run, and what remains still has to fill three places.
 */
export const NEW_USER_WEEK_FOLLOW_UP_CONFIG_PATH = 'config/newUserWeekFollowUp';

/**
 * The once-per-account claim, `newUserWeekFollowUps/{uid}`. Declared here,
 * beside the config, so the account-deletion cascade can name it without
 * importing the scheduled job.
 */
export const NEW_USER_WEEK_FOLLOW_UPS_COLLECTION = 'newUserWeekFollowUps';

/**
 * The fallback of the day-30 mail (GitHub issue #1894), the same shape as
 * `config/newUserWeekFollowUp`. The Bites the day-1 and day-7 configs name are
 * taken out of it per run.
 */
export const NEW_USER_MONTH_FOLLOW_UP_CONFIG_PATH =
  'config/newUserMonthFollowUp';

/** The once-per-account claim of the day-30 mail, `newUserMonthFollowUps/{uid}`. */
export const NEW_USER_MONTH_FOLLOW_UPS_COLLECTION = 'newUserMonthFollowUps';

/** How many fallback Bites the config may name, at most. */
export const MAX_FALLBACK_BITES = 10;

/** How many followed accounts one recipient's mail reads, at most. */
export const MAX_FOLLOWED_READ = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

/** How far back a followed account's Bite still counts as new in the day-7 mail. */
export const NEW_BITE_WINDOW_MS = 7 * DAY_MS;

/** The same for the day-30 mail: everything since the recipient joined. */
export const MONTH_NEW_BITE_WINDOW_MS = 30 * DAY_MS;

export interface WeekFollowUpBite extends FollowUpBite {
  /** The display name of the followed account that posted it. */
  by?: string;
}

export interface WeekFollowUpPicks {
  /** New Bites from people the recipient follows, newest first. */
  following: WeekFollowUpBite[];
  /** Hand-picked Bites that fill the places `following` left empty. */
  more: FollowUpBite[];
}

export interface WeekFollowUpConfig {
  biteIds: string[];
  /** As in `config/newUserFollowUp`: an operator copy after every run. */
  monitorUids: string[];
}

/** A fallback Bite, with the creator kept so a recipient never gets their own. */
export interface FallbackBite extends FollowUpBite {
  userId?: string;
}

const toIds = (value: unknown, max: number): string[] =>
  Array.isArray(value)
    ? value
        .filter((id): id is string => typeof id === 'string' && id !== '')
        .slice(0, max)
    : [];

/** Reads the config of the day-7 mail, or of a later one shaped like it. */
export const readWeekFollowUpConfig = async (
  db: Firestore,
  path: string = NEW_USER_WEEK_FOLLOW_UP_CONFIG_PATH,
): Promise<WeekFollowUpConfig> => {
  const data = (await db.doc(path).get()).data();

  return {
    biteIds: toIds(data?.['biteIds'], MAX_FALLBACK_BITES),
    monitorUids: toIds(data?.['monitorUids'], MAX_MONITORS),
  };
};

const toFollowUpBite = (
  id: string,
  data: Record<string, unknown> | undefined,
): FollowUpBite | undefined => {
  const name = toText(data?.['name']);

  if (!data || !name || !isListableBite(data)) {
    return undefined;
  }

  return {
    id,
    name,
    place: toText(data['place']),
    imageUrl: toHttpsUrl(data['imagePath']),
  };
};

/**
 * Resolves the fallback ids, leaving out the ones earlier mails showed.
 *
 * Unlike the day-1 picks, a fallback Bite must also be listable: it is shown
 * to somebody a week in, next to Bites that already had to be, and a Bite whose
 * image never uploaded would be the one broken card in the mail.
 */
export const resolveFallbackBites = async (
  db: Firestore,
  biteIds: string[],
  alreadyShownIds: string[],
): Promise<FallbackBite[]> => {
  const ids = biteIds.filter((id) => !alreadyShownIds.includes(id));
  const snapshots = await Promise.all(
    ids.map((id) => db.doc(`bites/${id}`).get()),
  );

  return snapshots.flatMap((snapshot): FallbackBite[] => {
    const data = snapshot.data();
    const bite = snapshot.exists
      ? toFollowUpBite(snapshot.id, data)
      : undefined;

    return bite ? [{ ...bite, userId: toText(data?.['userId']) }] : [];
  });
};

/**
 * The newest listable Bites the recipient's followed accounts posted since
 * `since`, newest first.
 *
 * A followed account whose profile is not public is left out: the mail is
 * read outside the app, and a private account's Bites are not for showing
 * there. One query per followed account rides the existing
 * `userId ASC, createdAtTimestamp DESC` index; a new account follows few
 * people, and `MAX_FOLLOWED_READ` bounds the rest.
 */
export const newBitesFromFollowing = async (
  db: Firestore,
  uid: string,
  since: number,
): Promise<WeekFollowUpBite[]> => {
  const following = await db
    .collection(`users/${uid}/following`)
    .limit(MAX_FOLLOWED_READ)
    .get();

  const perAccount = await Promise.all(
    following.docs.map(async ({ id: followedUid }) => {
      const profile = (await db.doc(`users/${followedUid}`).get()).data();

      if (profile?.['public'] !== true) {
        return [];
      }

      const bites = await db
        .collection('bites')
        .where('userId', '==', followedUid)
        .where('createdAtTimestamp', '>=', since)
        .orderBy('createdAtTimestamp', 'desc')
        .limit(MAX_PICKS * 3)
        .get();

      return bites.docs.flatMap((document) => {
        const data = document.data();
        const bite = toFollowUpBite(document.id, data);

        return bite
          ? [
              {
                bite: { ...bite, by: toText(profile['displayName']) },
                createdAt: data['createdAtTimestamp'] as number,
              },
            ]
          : [];
      });
    }),
  );

  return perAccount
    .flat()
    .sort((first, second) => second.createdAt - first.createdAt)
    .slice(0, MAX_PICKS)
    .map(({ bite }) => bite);
};

/**
 * One recipient's mail: their followed accounts' new Bites first, and the
 * fallback filling the rest, never their own Bite and never one twice.
 */
export const weekPicksFor = (
  uid: string,
  following: WeekFollowUpBite[],
  fallback: FallbackBite[],
): WeekFollowUpPicks => {
  const shown = new Set(following.map((bite) => bite.id));
  const more = fallback
    .filter((bite) => bite.userId !== uid && !shown.has(bite.id))
    .slice(0, Math.max(0, MAX_PICKS - following.length))
    .map(({ id, name, place, imageUrl }) => ({ id, name, place, imageUrl }));

  return { following, more };
};

export const hasWeekPicks = (picks: WeekFollowUpPicks): boolean =>
  picks.following.length > 0 || picks.more.length > 0;
