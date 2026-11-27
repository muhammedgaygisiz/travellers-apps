import type { DocumentData, Firestore } from 'firebase-admin/firestore';

/**
 * Diners confirming or disputing a dietary label (GitHub issue #2197), as the
 * backend keeps them.
 *
 * ```text
 * /dietaryLabelTallies/{scopeKey}         the counts, readable by members
 * /dietaryLabelVotes/{scopeKey}__{uid}    one account's votes, readable by it
 * ```
 *
 * A scope is one Bite (`bite__{biteId}`) or one restaurant's menu
 * (`menu__{restaurantId}`), and inside it `items` is keyed by the Bite or the
 * menu item. Both are written only here, through the Admin SDK; the rules
 * refuse every client write (`UC - Find Dishes That Fit A Dietary Choice`
 * `R-5`).
 *
 * The constants are copies of `libs/bite-tribe-common/model/src/lib/dietary-vote.ts`
 * and `dietary-label.ts`, which this project cannot import;
 * `dietary-votes-parity.spec.ts` keeps them equal.
 */

export const DIETARY_LABEL_TALLIES_COLLECTION = 'dietaryLabelTallies';
export const DIETARY_LABEL_VOTES_COLLECTION = 'dietaryLabelVotes';

export const DIETARY_LABELS = [
  'vegan',
  'vegetarian',
  'pescatarian',
  'alcohol-free',
  'gluten-free',
  'lactose-free',
  'nut-free',
  'halal',
  'kosher',
] as const;

export type DietaryLabel = (typeof DIETARY_LABELS)[number];

export const DIETARY_VOTES = ['confirm', 'dispute'] as const;

export type DietaryVote = (typeof DIETARY_VOTES)[number];

export const DIETARY_DISPUTE_REASONS = [
  'animal-product',
  'gluten',
  'staff-said-not',
  'got-sick',
  'other',
] as const;

export type DietaryDisputeReason = (typeof DIETARY_DISPUTE_REASONS)[number];

export const MAX_DIETARY_VOTE_NOTE_LENGTH = 280;

export const DIETARY_VOTE_MIN_ACCOUNT_AGE_DAYS = 14;

export interface DietaryLabelTally {
  confirm: number;
  dispute: number;
}

export interface StoredDietaryVote {
  vote: DietaryVote;
  reason?: DietaryDisputeReason;
  note?: string;
  votedAt: string;
}

type ScopeItems<T> = Record<string, Record<string, T>>;

export const isDietaryLabel = (value: unknown): value is DietaryLabel =>
  (DIETARY_LABELS as readonly unknown[]).includes(value);

export const isDietaryVote = (value: unknown): value is DietaryVote =>
  (DIETARY_VOTES as readonly unknown[]).includes(value);

export const isDietaryDisputeReason = (
  value: unknown,
): value is DietaryDisputeReason =>
  (DIETARY_DISPUTE_REASONS as readonly unknown[]).includes(value);

export const biteScopeKey = (biteId: string): string => `bite__${biteId}`;

export const menuScopeKey = (restaurantId: string): string =>
  `menu__${restaurantId}`;

export const ownVotesId = (scopeKey: string, uid: string): string =>
  `${scopeKey}__${uid}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A stored `items` map, with anything that is not a map read as empty. */
export const scopeItemsOf = <T>(
  data: DocumentData | undefined,
): ScopeItems<T> => {
  const items = data?.['items'];

  if (!isRecord(items)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(items).map(([id, labels]) => [
      id,
      (isRecord(labels) ? labels : {}) as Record<string, T>,
    ]),
  );
};

const countOf = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;

export const tallyOf = (value: unknown): DietaryLabelTally => ({
  confirm: countOf((value as DietaryLabelTally | undefined)?.confirm),
  dispute: countOf((value as DietaryLabelTally | undefined)?.dispute),
});

/**
 * The counts after one account's vote on one label moved from `before` to
 * `after`; either may be absent. Never below zero, so a count that drifted
 * cannot go negative.
 */
export const shiftTally = (
  tally: DietaryLabelTally,
  before: DietaryVote | undefined,
  after: DietaryVote | undefined,
): DietaryLabelTally => {
  const next = { ...tally };

  if (before) {
    next[before] = Math.max(0, next[before] - 1);
  }

  if (after) {
    next[after] += 1;
  }

  return next;
};

/**
 * Takes one account's votes out of a scope's counts: what deleting the
 * account does (`R-5`). Returns the counts to write back, with a label or a
 * subject nobody voted on any more left out.
 */
export const withoutVotes = (
  tallies: ScopeItems<unknown>,
  votes: ScopeItems<StoredDietaryVote>,
): ScopeItems<DietaryLabelTally> => {
  const next: ScopeItems<DietaryLabelTally> = {};

  Object.entries(tallies).forEach(([subjectId, labels]) => {
    Object.entries(labels).forEach(([label, raw]) => {
      const removed = votes[subjectId]?.[label]?.vote;
      const tally = shiftTally(
        tallyOf(raw),
        isDietaryVote(removed) ? removed : undefined,
        undefined,
      );

      if (tally.confirm || tally.dispute) {
        next[subjectId] = { ...(next[subjectId] ?? {}), [label]: tally };
      }
    });
  });

  return next;
};

/**
 * Removes every vote of `uid` and corrects the counts they were part of, one
 * scope per transaction (`UC - Find Dishes That Fit A Dietary Choice`, issue
 * #2197). Returns the number of votes removed.
 */
export const deleteDietaryLabelVotesByUser = async (
  db: Firestore,
  uid: string,
): Promise<number> => {
  const snapshot = await db
    .collection(DIETARY_LABEL_VOTES_COLLECTION)
    .where('uid', '==', uid)
    .get();
  let removed = 0;

  for (const voteDoc of snapshot.docs) {
    removed += await db.runTransaction(async (transaction) => {
      const votesSnapshot = await transaction.get(voteDoc.ref);
      const votes = scopeItemsOf<StoredDietaryVote>(votesSnapshot.data());
      const scopeKey = votesSnapshot.data()?.['scopeKey'];
      const count = Object.values(votes).reduce(
        (sum, labels) => sum + Object.keys(labels).length,
        0,
      );

      if (typeof scopeKey === 'string' && scopeKey) {
        const tallyRef = db
          .collection(DIETARY_LABEL_TALLIES_COLLECTION)
          .doc(scopeKey);
        const tallySnapshot = await transaction.get(tallyRef);

        if (tallySnapshot.exists) {
          transaction.set(tallyRef, {
            ...tallySnapshot.data(),
            items: withoutVotes(scopeItemsOf(tallySnapshot.data()), votes),
          });
        }
      }

      transaction.delete(voteDoc.ref);

      return count;
    });
  }

  return removed;
};

/**
 * Removes a Bite's counts and every vote on it, once the Bite is gone: a vote
 * on nothing is personal data with no purpose left.
 */
export const deleteDietaryLabelVotesForBite = async (
  db: Firestore,
  biteId: string,
): Promise<number> => {
  const scopeKey = biteScopeKey(biteId);
  const votes = await db
    .collection(DIETARY_LABEL_VOTES_COLLECTION)
    .where('scopeKey', '==', scopeKey)
    .get();
  const batch = db.batch();

  votes.docs.forEach((voteDoc) => batch.delete(voteDoc.ref));
  batch.delete(db.collection(DIETARY_LABEL_TALLIES_COLLECTION).doc(scopeKey));
  await batch.commit();

  return votes.docs.length;
};
