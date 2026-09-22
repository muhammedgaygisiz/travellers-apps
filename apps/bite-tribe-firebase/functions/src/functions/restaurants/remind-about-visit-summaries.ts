import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/scheduler';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';
import { ZURICH_TZ } from '../shared/utils/week-bounds';
import { VISIT_SUMMARIES_COLLECTION } from './visit-summary';

/**
 * Asks once, the morning after, whether last night's dish is worth a Bite
 * (GitHub issue #1112).
 *
 * ## Once, and then never
 *
 * `RD-TS-51`. The guest is offered a Bite on the summary while they are still
 * at the table, and once more here. There is no third ask and no counter to
 * keep, because the bound is the **meal**: one summary, one reminder, and
 * `reminded` on the document is what makes that true of the record rather than
 * of a habit. A guest who ignores both is a guest who did not want to.
 *
 * ## Why the morning after, and one sweep
 *
 * A push at the table competes with the people the guest is eating with, and
 * one an hour later arrives while they are still walking home. The morning
 * after is when a meal is a memory worth writing down and the phone is not in
 * a restaurant - and it is reachable with one scheduled read rather than a
 * timer per visit.
 *
 * ## What it reads
 *
 * A collection group over every guest's `visitSummaries`, because a summary
 * lives under the account that ate the meal and there is no path that holds
 * them all. The `where` clauses are the whole query: yesterday's meals, no
 * Bite made from them, not already reminded. Both flags are written `false` at
 * close precisely so this query can ask for them - Firestore cannot ask for a
 * field that is not there.
 *
 * It needs a composite index at `COLLECTION_GROUP` scope, declared in
 * `firestore.indexes.json` and deployed from CI with the rules ([#1567]).
 *
 * ## The reminder is marked before it is sent
 *
 * The same argument the summary mail makes. A send that fails after the flag
 * is set costs the guest a reminder they never got; a flag set after a send
 * that succeeded but whose write failed costs them a second push for a meal
 * they have already been asked about. Of the two, the silence is the one that
 * does not annoy anybody, and a notification nobody asked for is the failure
 * this function is one `where` clause away from becoming.
 */

/** How many meals one run will remind about, newest first. */
export const MAX_VISIT_REMINDERS = 200;

/** The window a run looks at: the calendar day before it runs, in Zurich. */
export const previousDayBounds = (
  now: Date,
): { start: number; end: number } => {
  const end = new Date(now);

  end.setHours(0, 0, 0, 0);

  const start = new Date(end);

  start.setDate(start.getDate() - 1);

  return { start: start.getTime(), end: end.getTime() };
};

export const remindAboutVisitSummaries = async (
  now: Date = new Date(),
): Promise<number> => {
  const { start, end } = previousDayBounds(now);
  const firestore = getFirestore();

  const due = await firestore
    .collectionGroup(VISIT_SUMMARIES_COLLECTION)
    .where('closedAt', '>=', start)
    .where('closedAt', '<', end)
    .where('biteCreated', '==', false)
    .where('reminded', '==', false)
    .orderBy('closedAt', 'desc')
    .limit(MAX_VISIT_REMINDERS)
    .get();

  if (due.empty) {
    logger.info('no visit summaries to remind about', { start, end });

    return 0;
  }

  // The uid is the document's grandparent: `/users/{uid}/visitSummaries/{id}`.
  // Reading it off the path rather than off a field on the summary, because
  // the path is what filed it and a copy could disagree with where it lives.
  const byGuest = new Map<string, string[]>();

  for (const document of due.docs) {
    const uid = document.ref.parent.parent?.id;

    if (!uid) {
      continue;
    }

    byGuest.set(uid, [...(byGuest.get(uid) ?? []), document.id]);
  }

  // Marked before the send, so a failure costs a reminder nobody got rather
  // than a second push about a meal already asked about.
  const marking = firestore.batch();

  due.docs.forEach((document) =>
    marking.update(document.ref, { reminded: true }),
  );

  await marking.commit();

  const sent = await sendLocalizedNotification({
    uids: [...byGuest.keys()],
    data: { kind: 'visitSummaryReminder' },
    buildMessage: (translate) => ({
      title: translate('visitReminder.title'),
      body: translate('visitReminder.body'),
    }),
  });

  logger.info('visit summary reminders sent', {
    summaries: due.size,
    guests: byGuest.size,
    sent,
  });

  return sent;
};

export const remindAboutVisitSummariesDaily = onSchedule(
  { schedule: '0 10 * * *', timeZone: ZURICH_TZ },
  async (): Promise<void> => {
    await remindAboutVisitSummaries();
  },
);
