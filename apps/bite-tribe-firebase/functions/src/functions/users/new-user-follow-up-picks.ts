import { Firestore } from 'firebase-admin/firestore';

/**
 * The document that names what the follow-up mail shows (GitHub issue #1707).
 *
 * `config` is written from the Firebase console, not from any app, and the
 * rules close it to every client. The picks are fixed rather than ranked: every
 * new user sees the same three Bites and the same three people, chosen by hand,
 * because the first message a new account gets is a showcase and not a feed.
 * Until the document names a pick that resolves, there is nothing to send and
 * a run sends nothing.
 */
export const NEW_USER_FOLLOW_UP_CONFIG_PATH = 'config/newUserFollowUp';

/**
 * The once-per-account claim, `newUserFollowUps/{uid}`. Declared here, beside
 * the config, so the account-deletion cascade can name it without importing
 * the scheduled job.
 */
export const NEW_USER_FOLLOW_UPS_COLLECTION = 'newUserFollowUps';

/** How many Bites and how many people one follow-up shows, at most. */
export const MAX_PICKS = 3;

export interface FollowUpBite {
  id: string;
  name: string;
  place?: string;
  /** Only an absolute `https` URL: a mail client cannot resolve anything else. */
  imageUrl?: string;
}

export interface FollowUpPerson {
  uid: string;
  displayName: string;
  photoUrl?: string;
}

export interface FollowUpPicks {
  bites: FollowUpBite[];
  people: FollowUpPerson[];
}

export interface FollowUpConfig {
  biteIds: string[];
  userIds: string[];
  /**
   * Accounts that get a copy of the mail after every run, whether or not
   * anybody new was due, with the run's counts in the subject. A day without
   * that copy means the job did not run.
   */
  monitorUids: string[];
}

/** How many monitor copies one run sends, at most. */
export const MAX_MONITORS = 5;

const toIds = (value: unknown, max = MAX_PICKS): string[] =>
  Array.isArray(value)
    ? value
        .filter((id): id is string => typeof id === 'string' && id !== '')
        .slice(0, max)
    : [];

const toText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const toHttpsUrl = (value: unknown): string | undefined => {
  const text = toText(value);

  return text?.startsWith('https://') ? text : undefined;
};

export const readFollowUpConfig = async (
  db: Firestore,
): Promise<FollowUpConfig> => {
  const data = (await db.doc(NEW_USER_FOLLOW_UP_CONFIG_PATH).get()).data();

  return {
    biteIds: toIds(data?.['biteIds']),
    userIds: toIds(data?.['userIds']),
    monitorUids: toIds(data?.['monitorUids'], MAX_MONITORS),
  };
};

/**
 * Resolves the configured ids into what the message shows.
 *
 * A pick is dropped rather than shown broken: a Bite that was deleted since it
 * was chosen, or a profile that went private, would otherwise send a new user
 * to a page that says nothing or refuses them. The order of the config is the
 * order of the message.
 */
export const resolveFollowUpPicks = async (
  db: Firestore,
  config: FollowUpConfig,
): Promise<FollowUpPicks> => {
  const [biteSnapshots, userSnapshots] = await Promise.all([
    Promise.all(config.biteIds.map((id) => db.doc(`bites/${id}`).get())),
    Promise.all(config.userIds.map((uid) => db.doc(`users/${uid}`).get())),
  ]);

  const bites = biteSnapshots.flatMap((snapshot): FollowUpBite[] => {
    const data = snapshot.data();
    const name = toText(data?.['name']);

    if (!snapshot.exists || !name) {
      return [];
    }

    return [
      {
        id: snapshot.id,
        name,
        place: toText(data?.['place']),
        imageUrl: toHttpsUrl(data?.['imagePath']),
      },
    ];
  });

  const people = userSnapshots.flatMap((snapshot): FollowUpPerson[] => {
    const data = snapshot.data();
    const displayName = toText(data?.['displayName']);

    if (!snapshot.exists || data?.['public'] !== true || !displayName) {
      return [];
    }

    return [
      {
        uid: snapshot.id,
        displayName,
        photoUrl: toHttpsUrl(data?.['photoUrl']),
      },
    ];
  });

  return { bites, people };
};

/**
 * The picks as one recipient gets them: never themselves.
 *
 * Only matters for a person who is both new and picked, which is rare, but a
 * mail that suggests following yourself reads as a bug.
 */
export const picksFor = (picks: FollowUpPicks, uid: string): FollowUpPicks => ({
  bites: picks.bites,
  people: picks.people.filter((person) => person.uid !== uid),
});

export const hasPicks = (picks: FollowUpPicks): boolean =>
  picks.bites.length > 0 || picks.people.length > 0;
