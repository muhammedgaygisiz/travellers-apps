import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TABLE_ORDERS_COLLECTION } from 'model';

/**
 * The queue's query needs an index that Firestore does not create by itself
 * (GitHub issue #1105).
 *
 * Firestore indexes every single field automatically, but only at **collection**
 * scope. A collection-group query needs the scope declared, and without it the
 * query fails at runtime, in production, with `FAILED_PRECONDITION` - which is
 * exactly how the account-deletion cascade broke in issue #1227.
 *
 * That breakage produced `firestore-collection-group-indexes.spec.ts` in the
 * functions project, which pairs every `collectionGroup(...).where(...)` in the
 * *backend* source with an entry in `firestore.indexes.json`. This query is the
 * first collection-group query a **client** makes, and that spec cannot see it:
 * it walks the functions source, and it matches the Admin SDK's call shape
 * rather than the Capacitor plugin's. So the check lives here, next to the
 * query it is about.
 *
 * It reads the file rather than the query, deliberately. What it can prove is
 * that the declaration exists; what it cannot prove is that anybody has run
 * `npx nx firebase-deploy-indexes bite-tribe-firebase`, because indexes in this
 * repository deploy by hand - the same standing gap the rules have.
 */

const INDEXES_FILE = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  '..',
  '..',
  'apps',
  'bite-tribe-firebase',
  'firestore.indexes.json',
);

interface FieldIndex {
  order?: string;
  arrayConfig?: string;
  queryScope: string;
}

interface FieldOverride {
  collectionGroup: string;
  fieldPath: string;
  indexes: FieldIndex[];
}

interface CompositeIndex {
  collectionGroup: string;
  queryScope: string;
  fields: { fieldPath: string; order?: string }[];
}

const indexes: { indexes: CompositeIndex[]; fieldOverrides: FieldOverride[] } =
  JSON.parse(readFileSync(INDEXES_FILE, 'utf8'));

const exemptionFor = (fieldPath: string): FieldOverride | undefined =>
  indexes.fieldOverrides.find(
    (override) =>
      override.collectionGroup === TABLE_ORDERS_COLLECTION &&
      override.fieldPath === fieldPath,
  );

describe('the staff order queue indexes', () => {
  /**
   * The constraint that carries the permission. Without its exemption the
   * listener never delivers a first snapshot, and the queue shows an empty
   * kitchen instead of an error.
   */
  it('exempts restaurantId at collection-group scope', () => {
    expect(exemptionFor('restaurantId')?.indexes).toContainEqual({
      order: 'ASCENDING',
      queryScope: 'COLLECTION_GROUP',
    });
  });

  /** The constraint that keeps the read bounded to the open orders. */
  it('exempts status at collection-group scope', () => {
    expect(exemptionFor('status')?.indexes).toContainEqual({
      order: 'ASCENDING',
      queryScope: 'COLLECTION_GROUP',
    });
  });

  /**
   * And the composite over both, because the two constraints are used
   * together. Firestore can serve some two-equality queries by merging single
   * field indexes and is not obliged to, and an `in` is a disjunction of
   * equalities rather than one - so the composite is declared rather than
   * relied on not being needed. A superfluous index costs storage; a missing
   * one costs the screen.
   */
  it('declares the composite the two constraints are used through', () => {
    expect(indexes.indexes).toContainEqual({
      collectionGroup: TABLE_ORDERS_COLLECTION,
      queryScope: 'COLLECTION_GROUP',
      fields: [
        { fieldPath: 'restaurantId', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
      ],
    });
  });
});
