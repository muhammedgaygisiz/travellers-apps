import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The table state machine exists twice, and the duplication is deliberate
 * rather than an oversight (GitHub issue #1092).
 *
 * Issue #1091 made `TABLE_STATE_TRANSITIONS` in `libs/bite-tribe-common/model`
 * the single definition, precisely so the backend, the staff view and the spec
 * could not each hold their own idea of what a table may do next. The backend
 * then could not reach it: this project compiles with its own `tsconfig.json`,
 * whose `rootDir` is `src` and which carries none of the workspace path
 * mappings, and the deploy uploads `lib/` alone - so a cross-workspace import
 * would neither compile nor ship.
 *
 * `shared/roles.ts` hit the same wall and answered it the same way, and
 * `role-list-parity.spec.ts` is the precedent for this file: copy the data, and
 * make the copy checked instead of trusted. A duplication nothing checks is a
 * duplication that drifts, and this one would drift silently - both copies
 * would keep passing their own tests while the staff view offered a button the
 * backend refuses, or worse, refused one it would have allowed.
 *
 * It reads both files as **text** rather than importing them, for the same
 * reason `role-list-parity.spec.ts` does: the library is outside this project's
 * `rootDir` and resolves through a path mapping this project does not have, so
 * an import would not compile.
 */

const WORKSPACE_ROOT = join(__dirname, '..', '..', '..', '..', '..');

const FUNCTIONS_TABLE_STATE = join(
  __dirname,
  '..',
  'functions',
  'restaurants',
  'table-state.ts',
);

const LIBRARY_TABLE_STATE = join(
  WORKSPACE_ROOT,
  'libs',
  'bite-tribe-common',
  'model',
  'src',
  'lib',
  'table-state.ts',
);

/**
 * The `TABLE_STATUSES` members, in declaration order.
 *
 * Anchored on the constant rather than on any quoted string in the file, so a
 * status named in a comment or in an error message is not mistaken for a
 * member - both files talk about `occupied` in prose more often than they
 * declare it.
 */
const statusesIn = (file: string): string[] => {
  const source = readFileSync(file, 'utf8');
  const list = /TABLE_STATUSES = \[([\s\S]*?)\] as const/.exec(source);

  if (!list) {
    throw new Error(`No TABLE_STATUSES declaration found in ${file}`);
  }

  return [...list[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
};

/**
 * The transition matrix, as `status -> allowed statuses`.
 *
 * Parsed out of the object literal rather than out of the whole file, so the
 * paragraph above each copy explaining why a status never lists itself cannot
 * be read as a row.
 */
const transitionsIn = (file: string): Record<string, string[]> => {
  const source = readFileSync(file, 'utf8');
  const body = /TABLE_STATE_TRANSITIONS[^=]*= \{([\s\S]*?)\} as const/.exec(
    source,
  );

  if (!body) {
    throw new Error(`No TABLE_STATE_TRANSITIONS declaration found in ${file}`);
  }

  const rows = [...body[1].matchAll(/(\w+): \[([^\]]*)\]/g)];

  return Object.fromEntries(
    rows.map((row) => [
      row[1],
      [...row[2].matchAll(/'([^']+)'/g)].map((match) => match[1]),
    ]),
  );
};

describe('table state parity', () => {
  it('finds a status list in both files', () => {
    expect(statusesIn(FUNCTIONS_TABLE_STATE).length).toBeGreaterThan(1);
    expect(statusesIn(LIBRARY_TABLE_STATE).length).toBeGreaterThan(1);
  });

  /**
   * Order as well as membership. `TableStatus` is derived from the array in
   * both files, and the staff view renders a legend straight from it, so the
   * two disagreeing on order would give the backend and the screen different
   * ideas of the same lifecycle.
   */
  it('holds the same statuses in the same order in both files', () => {
    expect(statusesIn(FUNCTIONS_TABLE_STATE)).toEqual(
      statusesIn(LIBRARY_TABLE_STATE),
    );
  });

  it('carries the seven statuses that exist', () => {
    expect(statusesIn(LIBRARY_TABLE_STATE)).toEqual([
      'available',
      'reserved',
      'occupied',
      'ordering',
      'awaitingPayment',
      'cleaning',
      'disabled',
    ]);
  });

  it('finds a transition matrix in both files', () => {
    expect(Object.keys(transitionsIn(FUNCTIONS_TABLE_STATE))).toHaveLength(7);
    expect(Object.keys(transitionsIn(LIBRARY_TABLE_STATE))).toHaveLength(7);
  });

  /**
   * The assertion the whole file exists for: a row added, removed or reordered
   * in one copy and not the other fails the build here rather than in a dining
   * room.
   */
  it('allows exactly the same transitions in both files', () => {
    expect(transitionsIn(FUNCTIONS_TABLE_STATE)).toEqual(
      transitionsIn(LIBRARY_TABLE_STATE),
    );
  });

  it('gives every status a row', () => {
    const matrix = transitionsIn(FUNCTIONS_TABLE_STATE);

    expect(Object.keys(matrix).sort()).toEqual(
      [...statusesIn(FUNCTIONS_TABLE_STATE)].sort(),
    );
  });

  /**
   * A status never lists itself, in either copy. Re-applying a status is a
   * retry rather than a transition: admitting it would reset `since`, which is
   * the clock the staff view is built to display.
   */
  it('lets no status transition to itself', () => {
    for (const file of [FUNCTIONS_TABLE_STATE, LIBRARY_TABLE_STATE]) {
      const selfTransitions = Object.entries(transitionsIn(file))
        .filter(([from, allowed]) => allowed.includes(from))
        .map(([from]) => from);

      expect(selfTransitions).toEqual([]);
    }
  });

  /** Every target is a status, so no row can name one that does not exist. */
  it('names only known statuses as targets', () => {
    const statuses = statusesIn(FUNCTIONS_TABLE_STATE);
    const unknown = Object.values(transitionsIn(FUNCTIONS_TABLE_STATE))
      .flat()
      .filter((status) => !statuses.includes(status));

    expect(unknown).toEqual([]);
  });
});
