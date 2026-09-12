import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The visit model exists twice, and the duplication is deliberate
 * (GitHub issue #1095).
 *
 * `table-state-parity.spec.ts` explains the wall and the precedent: this
 * project compiles with its own `tsconfig.json`, whose `rootDir` is `src` and
 * which carries none of the workspace path mappings, and the deploy uploads
 * `lib/` alone - so the library the model belongs in is not importable here.
 * Copy it, and make the copy checked rather than trusted.
 *
 * What would drift if nothing checked is worse here than for the state matrix.
 * A status the library calls `abandoned` and the backend writes as something
 * else is a receipt the staff view cannot find, and
 * `TABLE_STATUS_AFTER_VISIT` is the acceptance criterion of the issue - the
 * button that ends a visit tells the host what the table will become, and the
 * backend decides what it does become.
 *
 * Both files are read as **text** rather than imported, for the same reason:
 * the library resolves through a path mapping this project does not have.
 */

const WORKSPACE_ROOT = join(__dirname, '..', '..', '..', '..', '..');

const FUNCTIONS_TABLE_VISIT = join(
  __dirname,
  '..',
  'functions',
  'restaurants',
  'table-visit.ts',
);

const LIBRARY_TABLE_VISIT = join(
  WORKSPACE_ROOT,
  'libs',
  'bite-tribe-common',
  'model',
  'src',
  'lib',
  'table-visit.ts',
);

/**
 * The members of a `const` list, in declaration order.
 *
 * Anchored on the declaration rather than on any quoted string in the file, so
 * a status named in a comment is not mistaken for a member - both files discuss
 * `abandoned` in prose more often than they declare it.
 */
const listIn = (file: string, name: string): string[] => {
  const source = readFileSync(file, 'utf8');
  const declaration = new RegExp(`${name}[^=]*= \\[([\\s\\S]*?)\\]`).exec(
    source,
  );

  if (!declaration) {
    throw new Error(`No ${name} declaration found in ${file}`);
  }

  return [...declaration[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
};

/** The value of a `const NAME: Type = 'value'` declaration. */
const valueIn = (file: string, name: string): string => {
  const source = readFileSync(file, 'utf8');
  const declaration = new RegExp(`${name}[^=]*= '([^']+)'`).exec(source);

  if (!declaration) {
    throw new Error(`No ${name} declaration found in ${file}`);
  }

  return declaration[1];
};

const BOTH = [FUNCTIONS_TABLE_VISIT, LIBRARY_TABLE_VISIT];

describe('table visit parity', () => {
  it('finds a status list in both files', () => {
    BOTH.forEach((file) =>
      expect(listIn(file, 'TABLE_VISIT_STATUSES').length).toBeGreaterThan(1),
    );
  });

  /**
   * Order as well as membership. `TableVisitStatus` is derived from the array
   * in both files, and a receipt list renders a filter straight from it.
   */
  it('holds the same statuses in the same order in both files', () => {
    expect(listIn(FUNCTIONS_TABLE_VISIT, 'TABLE_VISIT_STATUSES')).toEqual(
      listIn(LIBRARY_TABLE_VISIT, 'TABLE_VISIT_STATUSES'),
    );
  });

  it('carries the three statuses that exist', () => {
    expect(listIn(LIBRARY_TABLE_VISIT, 'TABLE_VISIT_STATUSES')).toEqual([
      'open',
      'closed',
      'abandoned',
    ]);
  });

  /**
   * The end set decides whether a table is free. A copy that forgot
   * `abandoned` would leave every table a walked-out party sat at blocked for
   * good, because nothing would read its visit as finished.
   */
  it('agrees on which statuses end a visit', () => {
    expect(listIn(FUNCTIONS_TABLE_VISIT, 'TABLE_VISIT_END_STATUSES')).toEqual(
      listIn(LIBRARY_TABLE_VISIT, 'TABLE_VISIT_END_STATUSES'),
    );
  });

  it('ends in every status except the one that begins a visit', () => {
    BOTH.forEach((file) => {
      const statuses = listIn(file, 'TABLE_VISIT_STATUSES');
      const endings = listIn(file, 'TABLE_VISIT_END_STATUSES');

      expect(endings).not.toContain('open');
      expect(statuses.filter((status) => status !== 'open')).toEqual(endings);
    });
  });

  /**
   * The acceptance criterion of the issue, and the one value where a
   * disagreement is visible to a host: the button that ends a visit says what
   * the table will become, and the backend decides what it does become.
   */
  it('agrees on the status a table lands on when a visit ends', () => {
    expect(valueIn(FUNCTIONS_TABLE_VISIT, 'TABLE_STATUS_AFTER_VISIT')).toBe(
      valueIn(LIBRARY_TABLE_VISIT, 'TABLE_STATUS_AFTER_VISIT'),
    );
    expect(valueIn(LIBRARY_TABLE_VISIT, 'TABLE_STATUS_AFTER_VISIT')).toBe(
      'cleaning',
    );
  });

  /** The collection both halves of the pair write, spelled once. */
  it('stores visits where the rules and the model agree', () => {
    expect(valueIn(FUNCTIONS_TABLE_VISIT, 'TABLE_VISITS_COLLECTION')).toBe(
      'visits',
    );
  });
});
