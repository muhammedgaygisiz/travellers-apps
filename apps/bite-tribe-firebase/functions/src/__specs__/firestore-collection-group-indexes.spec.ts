import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Firestore indexes every single field at collection scope automatically, but a
 * collection-group query needs an explicit exemption. Without it the query only
 * fails at runtime, in production, with `FAILED_PRECONDITION` — which is how the
 * account-deletion cascade broke (issue #1227). This test pairs every
 * collection-group filter in the functions source with an entry in
 * `firestore.indexes.json` so the gap is caught at build time instead.
 */

const SOURCE_ROOT = join(__dirname, '..');
const INDEXES_FILE = join(
  __dirname,
  '..',
  '..',
  '..',
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

interface CollectionGroupQuery {
  collection: string;
  field: string;
  file: string;
}

const listTypeScriptFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return entry === '__specs__' ? [] : listTypeScriptFiles(path);
    }

    return entry.endsWith('.ts') ? [path] : [];
  });

/** Resolves `const NAME = 'value';` so a query can name its collection by constant. */
const readStringConstants = (source: string): Map<string, string> => {
  const constants = new Map<string, string>();
  const pattern = /const\s+([A-Za-z0-9_$]+)\s*=\s*['"]([^'"]+)['"]/g;

  for (const match of source.matchAll(pattern)) {
    constants.set(match[1], match[2]);
  }

  return constants;
};

const findCollectionGroupQueries = (file: string): CollectionGroupQuery[] => {
  const source = readFileSync(file, 'utf8');
  const constants = readStringConstants(source);
  const flattened = source.replace(/\s+/g, ' ');
  const pattern =
    /collectionGroup\( *(['"]?)([A-Za-z0-9_$]+)\1 *\) *\.where\( *['"]([^'"]+)['"]/g;

  return [...flattened.matchAll(pattern)].map((match) => ({
    collection: match[1] ? match[2] : (constants.get(match[2]) ?? match[2]),
    field: match[3],
    file,
  }));
};

const hasCollectionGroupIndex = (
  overrides: FieldOverride[],
  query: CollectionGroupQuery,
): boolean =>
  overrides.some(
    (override) =>
      override.collectionGroup === query.collection &&
      override.fieldPath === query.field &&
      override.indexes.some(
        (index) => index.queryScope === 'COLLECTION_GROUP' && !!index.order,
      ),
  );

describe('firestore collection-group indexes', () => {
  const overrides: FieldOverride[] = JSON.parse(
    readFileSync(INDEXES_FILE, 'utf8'),
  ).fieldOverrides;

  const queries = listTypeScriptFiles(SOURCE_ROOT).flatMap(
    findCollectionGroupQueries,
  );

  it('finds the collection-group queries in the functions source', () => {
    expect(queries.length).toBeGreaterThan(0);
  });

  it('declares an exemption for every filtered collection-group query', () => {
    const missing = queries.filter(
      (query) => !hasCollectionGroupIndex(overrides, query),
    );

    expect(missing).toEqual([]);
  });
});
