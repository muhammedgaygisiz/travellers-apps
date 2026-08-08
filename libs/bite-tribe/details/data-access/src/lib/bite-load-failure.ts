import { ResourceStatus } from '@angular/core';
import { Bite } from 'model';
import { BiteNotFoundError } from './bite-not-found-error';

/**
 * Why the details page has no Bite to show, once its read has settled.
 *
 * - `not-found`: the read came back and the Bite is gone for good.
 * - `unavailable`: the read itself failed — a timeout from the retry wrapper, a
 *   permission rejection, an App Check refusal. The Bite may well still exist.
 */
export type BiteLoadFailure = 'not-found' | 'unavailable';

/**
 * Reads a settled Bite resource.
 *
 * Matching one error class was too narrow: a read that failed for any other
 * reason left the page with no Bite, no error state it recognised, and its
 * loading skeleton running forever. The condition is therefore "the read
 * finished and there is no Bite", and every way of finishing lands on one of
 * the two failures. A resource that has not been asked for anything — no
 * `biteId` in the URL, so nothing to load — is not a failure and keeps the page
 * in its loading state. See GitHub issue #1232.
 */
export const classifyBiteLoadFailure = (
  status: ResourceStatus,
  bite: Bite | undefined,
  error: unknown,
): BiteLoadFailure | undefined => {
  const settled =
    status === 'resolved' || status === 'error' || status === 'local';

  if (bite || !settled) {
    return undefined;
  }

  return !error || error instanceof BiteNotFoundError
    ? 'not-found'
    : 'unavailable';
};
