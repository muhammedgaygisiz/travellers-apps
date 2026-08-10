import type { Review } from './review';

/**
 * One conversation under a Bite: the review that opened it and the answers to
 * it, in reading order.
 *
 * Threads are one level deep by decision, so a reply carries no replies of its
 * own — answering a reply attaches to the same root (issue #1283).
 */
export interface ReviewThread {
  root: Review;
  replies: Review[];
}
