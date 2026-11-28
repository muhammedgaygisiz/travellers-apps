import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { requireAdmin } from '../shared/roles';
import {
  DIETARY_LABEL_VOTES_COLLECTION,
  DietaryDisputeReason,
  isDietaryDisputeReason,
  menuScopeKey,
  scopeItemsOf,
  StoredDietaryVote,
} from './dietary-votes';
import { DIETARY_LABEL_REMOVALS_COLLECTION } from './dietary-restoration';

export interface DietaryRemovalDispute {
  reason?: DietaryDisputeReason;
  note?: string;
  votedAt: string;
}

export interface ListDietaryLabelRemovalsResponse {
  removals: (Record<string, unknown> & {
    removalId: string;
    disputesDetail: DietaryRemovalDispute[];
  })[];
}

/** At most this many open removals a call; the queue is short by design. */
const MAX_REMOVALS = 200;

/** Fields of a queue item an operator has no use for. */
const INTERNAL_FIELDS = [
  'requesterUid',
  'imageCheckAttempts',
  'imageCheckNextAt',
  'imageCheckPath',
];

/**
 * The removed dietary labels waiting for an operator, newest request or
 * removal first (GitHub issue #2199): each with its disputes - their reasons,
 * their notes and when - its confirmations, and the owner's explanation and
 * evidence photo when there is a request. Never who disputed or who asked.
 *
 * The rules refuse `dietaryLabelRemovals` and the votes to every client, so
 * the admin app reads the queue here, like the report queues.
 */
export const listDietaryLabelRemovalsHandler = async (
  request: CallableRequest<unknown>,
): Promise<ListDietaryLabelRemovalsResponse> => {
  requireAdmin(request);

  const db = getFirestore();
  const snapshot = await db
    .collection(DIETARY_LABEL_REMOVALS_COLLECTION)
    .where('status', '==', 'open')
    .limit(MAX_REMOVALS)
    .get();
  const votesByScope = new Map<string, Promise<DocumentData[]>>();
  const votesOf = (scopeKey: string): Promise<DocumentData[]> => {
    if (!votesByScope.has(scopeKey)) {
      votesByScope.set(
        scopeKey,
        db
          .collection(DIETARY_LABEL_VOTES_COLLECTION)
          .where('scopeKey', '==', scopeKey)
          .get()
          .then((votes) => votes.docs.map((doc) => doc.data())),
      );
    }

    return votesByScope.get(scopeKey) as Promise<DocumentData[]>;
  };

  const removals = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = { ...doc.data() };
      const restaurantId = String(data['restaurantId'] ?? '');
      const menuItemId = String(data['menuItemId'] ?? '');
      const label = String(data['label'] ?? '');
      const disputesDetail = (await votesOf(menuScopeKey(restaurantId)))
        .map(
          (votes) =>
            scopeItemsOf<StoredDietaryVote>(votes)[menuItemId]?.[label],
        )
        .filter((vote): vote is StoredDietaryVote => vote?.vote === 'dispute')
        .map((vote) => ({
          ...(isDietaryDisputeReason(vote.reason)
            ? { reason: vote.reason }
            : {}),
          ...(vote.note ? { note: vote.note } : {}),
          votedAt: vote.votedAt,
        }))
        .sort((left, right) => right.votedAt.localeCompare(left.votedAt));

      INTERNAL_FIELDS.forEach((field) => delete data[field]);

      return { ...data, removalId: doc.id, disputesDetail };
    }),
  );

  const latest = (entry: Record<string, unknown>): string =>
    String(entry['requestedAt'] ?? entry['removedAt'] ?? '');

  return {
    removals: removals.sort((left, right) =>
      latest(right).localeCompare(latest(left)),
    ),
  };
};

export const listDietaryLabelRemovals = onAppCheck<
  unknown,
  Promise<ListDietaryLabelRemovalsResponse>
>({ timeoutSeconds: 30 }, listDietaryLabelRemovalsHandler);
