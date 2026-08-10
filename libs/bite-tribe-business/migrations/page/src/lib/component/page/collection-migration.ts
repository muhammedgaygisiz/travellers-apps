import { CollectionMigrationResult } from 'bite-tribe-business/migrations-data-access';

export { type CollectionMigrationResult };

/**
 * The migrations that rewrite a whole collection in one call.
 *
 * Unlike the per-Bite actions on this page, these take no target: the operator
 * presses once and the callable walks the collection itself. Both are
 * idempotent, so a second press is safe — which is what makes a plain button
 * enough, with no confirmation step in front of it.
 */
export const COLLECTION_MIGRATIONS = ['review-timestamps'] as const;

export type CollectionMigrationName = (typeof COLLECTION_MIGRATIONS)[number];

/**
 * What the last run of one migration did, as far as the operator needs to know.
 *
 * A collection-wide rewrite leaves nothing on the page to look at, so the
 * outcome has to be reported explicitly — otherwise pressing the button again
 * is the only way to find out whether the first press worked. Same reasoning as
 * the release announcement above it (issue #1194).
 */
export interface CollectionMigrationState {
  status: 'running' | 'done' | 'failed';
  /** The counts the run reported, absent while it is running or if it failed. */
  result?: CollectionMigrationResult;
}

/** The last run of each migration, keyed by name. Absent until first pressed. */
export type CollectionMigrationStates = Partial<
  Record<CollectionMigrationName, CollectionMigrationState>
>;
