/**
 * The weekly posting-streak aggregates for the daily digest (issue #2150).
 *
 * The streak lives in Firestore, not in GA4 or BigQuery, so the two weekly
 * numbers are read from `/meta/postingStreakStats`, which `resyncBiteCounts`
 * writes every Monday: users at 2 weeks or more, and streaks that run took
 * from 1 or more to 0. The third streak number, the milestones celebrated
 * yesterday, is a GA4 tile in `dashboard.config.mjs`.
 *
 * Only the two counts are taken from the document, so nothing else it might
 * one day hold can reach the digest. It holds no user id, name or per-user
 * value either way.
 *
 * Never fatal, like the BigQuery sections: a missing role or document answers
 * `{ available: false, reason }` and the digest prints the reason where the
 * section would have been.
 *
 * Credentials: the same service account as the rest of the digest
 * (`GOOGLE_APPLICATION_CREDENTIALS`), which needs `roles/datastore.viewer` on
 * the Firebase project. See README.md.
 */

export const POSTING_STREAK_STATS_PATH = 'meta/postingStreakStats';

/** A resync older than this missed a Monday, and the digest says so. */
const STALE_AFTER_DAYS = 8;

const DAY_MS = 24 * 60 * 60 * 1000;

const count = (value) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;

/**
 * The digest's view of the stats document: the two counts and when the resync
 * wrote them, or the reason they are unavailable. Pure, so it is tested
 * without Firestore.
 */
export function readPostingStreakStats(data, now = Date.now()) {
  if (!data) {
    return {
      available: false,
      reason:
        `\`${POSTING_STREAK_STATS_PATH}\` does not exist yet; ` +
        '`resyncBiteCounts` writes it on Monday at 03:00 Europe/Zurich.',
    };
  }

  const usersWithStreakOfTwoOrMore = count(data.usersWithStreakOfTwoOrMore);
  const streaksBroken = count(data.streaksBroken);

  if (usersWithStreakOfTwoOrMore === null || streaksBroken === null) {
    return {
      available: false,
      reason: `\`${POSTING_STREAK_STATS_PATH}\` does not hold the two counts.`,
    };
  }

  const computedAt =
    typeof data.computedAt?.toDate === 'function'
      ? data.computedAt.toDate()
      : null;

  return {
    available: true,
    usersWithStreakOfTwoOrMore,
    streaksBroken,
    computedAt: computedAt ? computedAt.toISOString() : null,
    stale:
      !computedAt || now - computedAt.getTime() > STALE_AFTER_DAYS * DAY_MS,
  };
}

/** Reads the stats document and never throws. */
export async function collectPostingStreakStats() {
  let app;
  try {
    const { applicationDefault, initializeApp } =
      await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');

    // A missing or unreadable key is found here, as one rejection. Left to the
    // Firestore client, it rejects a second time on its own, after the digest
    // has printed, and that exits the workflow step before the post.
    // The emulator (`FIRESTORE_EMULATOR_HOST`) takes no credentials.
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      await applicationDefault().getAccessToken();
    }

    app = initializeApp(
      process.env.FIREBASE_PROJECT_ID
        ? { projectId: process.env.FIREBASE_PROJECT_ID }
        : {},
      'analytics-digest',
    );
    const snapshot = await getFirestore(app)
      .doc(POSTING_STREAK_STATS_PATH)
      .get();

    return readPostingStreakStats(snapshot.exists ? snapshot.data() : null);
  } catch (error) {
    return {
      available: false,
      reason:
        `Firestore read failed (${String(error?.message ?? error).split('\n')[0]}). ` +
        'The digest service account needs `roles/datastore.viewer` on the ' +
        'Firebase project; see tools/analytics/README.md.',
    };
  } finally {
    // Closes the gRPC channel, so a failed read leaves nothing behind that
    // could reject after the digest has printed and fail the workflow step.
    if (app) {
      const { deleteApp } = await import('firebase-admin/app');
      await deleteApp(app).catch(() => undefined);
    }
  }
}

/** The digest section, as Markdown lines. */
export function postingStreakMarkdown(stats) {
  const lines = ['### Posting streaks', ''];

  if (!stats.available) {
    lines.push(`_Unavailable: ${stats.reason}_`, '');
    return lines;
  }

  lines.push(
    `As of the last weekly resync${stats.computedAt ? `, \`${stats.computedAt}\`` : ''}. ` +
      'Milestones celebrated yesterday are the `Posting-streak milestones` row above.',
    '',
    '| Streak | Users |',
    '| --- | --- |',
    `| 2 weeks or more | ${stats.usersWithStreakOfTwoOrMore} |`,
    `| Broken in the last resync | ${stats.streaksBroken} |`,
    '',
  );

  if (stats.stale) {
    lines.push(
      `> ⚠️ The last resync is more than ${STALE_AFTER_DAYS} days old, so ` +
        "these are not this week's figures. Check `resyncBiteCounts` in the " +
        'Functions logs.',
      '',
    );
  }

  return lines;
}
