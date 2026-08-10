import type { Review, ReviewThread } from 'model';

/**
 * When a review was written, as a comparable number.
 *
 * `createdAtTimestamp` is written alongside `createdAt` and is the cheaper
 * read. Reviews written before that field existed were given it by
 * `backfillReviewTimestamps`, derived from their own `createdAt`, so the ISO
 * fallback below is no longer the path a legacy review takes — it covers what
 * the migration could not resolve and anything written while it had not run
 * yet. An unusable value sorts as the oldest possible rather than as `NaN`,
 * which would make the comparison non-transitive and the order unstable.
 */
const writtenAt = (review: Review): number => {
  if (typeof review.createdAtTimestamp === 'number') {
    return review.createdAtTimestamp;
  }

  const parsed = review.createdAt ? Date.parse(review.createdAt) : NaN;

  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * The conversation a review belongs to. A root review opens its own, so its id
 * is the thread id and no reply has to walk a parent chain to find it.
 */
const threadIdOf = (review: Review): string => review.threadId ?? review.id;

const isReply = (review: Review): boolean => !!review.parentReviewId;

/** Newest first, with the id breaking a tie so the order never wobbles. */
const newestFirst = (a: Review, b: Review): number =>
  writtenAt(b) - writtenAt(a) || a.id.localeCompare(b.id);

/** Oldest first, so a thread reads top to bottom. */
const oldestFirst = (a: Review, b: Review): number =>
  writtenAt(a) - writtenAt(b) || a.id.localeCompare(b.id);

/**
 * Groups a Bite's reviews into threads.
 *
 * Replies live in the same collection as the reviews they answer, so one query
 * per Bite still reads the whole compartment and the shape it is displayed in
 * is decided here rather than by the backend (issue #1283).
 *
 * Ordering is part of the contract: the flat list had none at all, which was
 * tolerable while every review stood alone and is not once a reply has to sit
 * under the right root in the right place. Threads render newest first, replies
 * oldest first inside their thread.
 *
 * A reply whose root is not in the set — a thread whose root was never written,
 * or a `threadId` pointing outside this Bite — is rendered as its own root
 * rather than dropped, so no one's words disappear from the page.
 */
export const toReviewThreads = (reviews: Review[]): ReviewThread[] => {
  const roots = reviews.filter((review) => !isReply(review));
  const rootIds = new Set(roots.map((root) => root.id));

  const replies = reviews.filter(isReply);
  const orphans = replies.filter((reply) => !rootIds.has(threadIdOf(reply)));

  const repliesByThread = new Map<string, Review[]>();

  replies
    .filter((reply) => rootIds.has(threadIdOf(reply)))
    .forEach((reply) => {
      const threadId = threadIdOf(reply);
      const thread = repliesByThread.get(threadId);

      if (thread) {
        thread.push(reply);

        return;
      }

      repliesByThread.set(threadId, [reply]);
    });

  return [...roots, ...orphans].sort(newestFirst).map((root) => ({
    root,
    replies: [...(repliesByThread.get(root.id) ?? [])].sort(oldestFirst),
  }));
};
