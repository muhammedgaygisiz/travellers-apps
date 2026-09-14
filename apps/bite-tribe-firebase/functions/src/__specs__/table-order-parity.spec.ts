import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A table order exists twice, and the duplication is deliberate
 * (GitHub issue #1103).
 *
 * `table-order.ts` in `libs/bite-tribe-common/model` is the single definition
 * and carries the reasoning. The backend cannot reach it: this project compiles
 * with its own `tsconfig.json`, whose `rootDir` is `src` and which carries none
 * of the workspace path mappings, and the deploy uploads `lib/` alone.
 * `table-session-parity.spec.ts` and the three parity specs before it are the
 * precedent: copy the data, and make the copy checked instead of trusted.
 *
 * Three things here drift silently.
 *
 * **The refusal reasons.** A reason the backend returns and the client has no
 * sentence for renders as a blank line in front of a guest who cannot order and
 * is not told why - the same failure `table-scan-parity.spec.ts` exists to
 * catch, one screen further into the meal.
 *
 * **The transition matrix.** The staff queue of issue #1105 decides which
 * buttons to offer by reading the library copy, and this side decides which
 * moves to accept. A row that disagrees is a button that does nothing.
 *
 * **The total.** The running total on the guest's phone and the total stored on
 * the order are computed from two copies of one sum. A difference there is the
 * guest agreeing to one figure and the restaurant recording another, which
 * neither codebase can notice on its own.
 *
 * Read as **text** rather than imported, for the same reason the others are:
 * the library is outside this project's `rootDir` and resolves through a path
 * mapping this project does not have.
 */

const WORKSPACE_ROOT = join(__dirname, '..', '..', '..', '..', '..');

const FUNCTIONS_TABLE_ORDER = join(
  __dirname,
  '..',
  'functions',
  'restaurants',
  'table-order.ts',
);

const LIBRARY_TABLE_ORDER = join(
  WORKSPACE_ROOT,
  'libs',
  'bite-tribe-common',
  'model',
  'src',
  'lib',
  'table-order.ts',
);

const BOTH = [FUNCTIONS_TABLE_ORDER, LIBRARY_TABLE_ORDER];

/**
 * The members of a `const` tuple or a `readonly` array, in declaration order.
 *
 * Line-anchored, so a status named in the prose documenting the member above it
 * is not mistaken for a member - the library copy explains each of the five
 * statuses and each of the twelve reasons in a comment.
 */
const membersOf = (file: string, name: string): string[] => {
  const source = readFileSync(file, 'utf8');
  const list = new RegExp(`${name}[^=]*= \\[([\\s\\S]*?)\\n\\]`).exec(source);

  if (!list) {
    throw new Error(`No ${name} declaration found in ${file}`);
  }

  return [...list[1].matchAll(/^\s*'([^']+)',/gm)].map((match) => match[1]);
};

/**
 * The transition matrix, as rows of statuses.
 *
 * Parsed rather than imported for the reason the whole file is read as text,
 * and parsed off the object literal rather than off a type: the rows are the
 * contract, and a `Record<TableOrderStatus, ...>` would be satisfied by any
 * five rows at all.
 */
const matrixOf = (file: string): Record<string, string[]> => {
  const source = readFileSync(file, 'utf8');
  const block =
    /TABLE_ORDER_STATUS_TRANSITIONS[\s\S]*?= \{([\s\S]*?)\n\} as const;/.exec(
      source,
    );

  if (!block) {
    throw new Error(`No TABLE_ORDER_STATUS_TRANSITIONS found in ${file}`);
  }

  return Object.fromEntries(
    [...block[1].matchAll(/^\s*(\w+): \[([^\]]*)\],/gm)].map((row) => [
      row[1],
      [...row[2].matchAll(/'([^']+)'/g)].map((status) => status[1]),
    ]),
  );
};

/** The body of the one-expression `tableOrderTotal` arrow, as written. */
const totalBodyOf = (file: string): string => {
  const source = readFileSync(file, 'utf8');
  const body = /tableOrderTotal = \([\s\S]*?\): number =>\s*([^;]+);/.exec(
    source,
  );

  if (!body) {
    throw new Error(`No tableOrderTotal declaration found in ${file}`);
  }

  return body[1].replace(/\s+/g, ' ').trim();
};

describe('table order parity', () => {
  it('finds a status list in both files', () => {
    for (const file of BOTH) {
      expect(membersOf(file, 'TABLE_ORDER_STATUSES').length).toBe(5);
    }
  });

  /**
   * Order as well as membership. The order is the lifecycle as a reader meets
   * it, and a copy that reorders is a copy somebody edited without reading the
   * other - which is the edit this whole spec is watching for.
   */
  it('holds the same statuses in the same order in both files', () => {
    expect(membersOf(FUNCTIONS_TABLE_ORDER, 'TABLE_ORDER_STATUSES')).toEqual(
      membersOf(LIBRARY_TABLE_ORDER, 'TABLE_ORDER_STATUSES'),
    );
  });

  it('carries the five statuses the issue names', () => {
    expect(membersOf(LIBRARY_TABLE_ORDER, 'TABLE_ORDER_STATUSES')).toEqual([
      'submitted',
      'accepted',
      'preparing',
      'served',
      'cancelled',
    ]);
  });

  it('agrees on which statuses end an order', () => {
    expect(
      membersOf(FUNCTIONS_TABLE_ORDER, 'TABLE_ORDER_END_STATUSES'),
    ).toEqual(membersOf(LIBRARY_TABLE_ORDER, 'TABLE_ORDER_END_STATUSES'));
  });

  it('agrees on every row of the transition matrix', () => {
    expect(matrixOf(FUNCTIONS_TABLE_ORDER)).toEqual(
      matrixOf(LIBRARY_TABLE_ORDER),
    );
  });

  /**
   * Every status has a row, and every status a row names exists. A row naming a
   * status neither file declares is a move the matrix permits and
   * `isTableOrderStatus` refuses - an order stuck in a status the queue offers
   * a button out of.
   */
  it('gives every status a row, naming only statuses that exist', () => {
    for (const file of BOTH) {
      const statuses = membersOf(file, 'TABLE_ORDER_STATUSES');
      const matrix = matrixOf(file);

      expect(Object.keys(matrix).sort()).toEqual([...statuses].sort());
      expect(
        Object.values(matrix)
          .flat()
          .filter((to) => !statuses.includes(to)),
      ).toEqual([]);
    }
  });

  /**
   * Nothing leaves an end status, in either copy. An end status with an
   * outgoing row would let a served dish be cancelled an hour later, which is a
   * change to a bill dressed up as a status change.
   */
  it('lets nothing leave an end status', () => {
    for (const file of BOTH) {
      const matrix = matrixOf(file);

      for (const ended of membersOf(file, 'TABLE_ORDER_END_STATUSES')) {
        expect(matrix[ended]).toEqual([]);
      }
    }
  });

  it('agrees on every refusal reason, in the same order', () => {
    expect(
      membersOf(FUNCTIONS_TABLE_ORDER, 'TABLE_ORDER_REFUSAL_REASONS'),
    ).toEqual(membersOf(LIBRARY_TABLE_ORDER, 'TABLE_ORDER_REFUSAL_REASONS'));
  });

  /**
   * Pinned to the exact sum. This is the one arithmetic nothing compares at
   * runtime: the guest is shown one side's answer and charged the other's.
   */
  it('totals an order identically in both files', () => {
    expect(totalBodyOf(FUNCTIONS_TABLE_ORDER)).toBe(
      totalBodyOf(LIBRARY_TABLE_ORDER),
    );
    expect(totalBodyOf(LIBRARY_TABLE_ORDER)).toBe(
      'lines.reduce((sum, line) => sum + line.price * line.quantity, 0)',
    );
  });

  it('names the same collection and the same caps in both files', () => {
    for (const file of BOTH) {
      const source = readFileSync(file, 'utf8');

      expect(source).toContain("TABLE_ORDERS_COLLECTION = 'orders'");
      expect(source).toContain('MAX_ORDER_LINE_QUANTITY = 99');
      expect(source).toContain('MAX_ORDER_LINES = 60');
      expect(source).toContain(
        "INITIAL_TABLE_ORDER_STATUS: TableOrderStatus = 'submitted'",
      );
    }
  });

  /**
   * The queue's own two constants (GitHub issue #1105).
   *
   * `OPEN_TABLE_ORDER_STATUSES` is what the staff queue queries on, so a copy
   * that held a different set would give the backend and the screen different
   * answers to "is this order still outstanding" - and the screen's answer is
   * the one a kitchen works from. It is *derived* in both files rather than
   * listed, so the assertion is on the derivation: a literal in either copy is
   * a list that can drift from the end statuses beside it.
   *
   * The reason cap bounds a string staff type and a guest is shown. A backend
   * that accepted longer than the client offers would store a sentence no
   * screen renders whole; a backend that accepted shorter would refuse a
   * cancellation after the dish was already off.
   */
  it('derives the open statuses the same way in both files', () => {
    for (const file of BOTH) {
      const source = readFileSync(file, 'utf8').replace(/\s+/g, ' ');

      expect(source).toContain(
        'OPEN_TABLE_ORDER_STATUSES: readonly TableOrderStatus[] = TABLE_ORDER_STATUSES.filter( (status) => !TABLE_ORDER_END_STATUSES.includes(status), )',
      );
    }
  });

  /**
   * The idempotency key's spelling (GitHub issue #1108).
   *
   * The backend names an order document after the key and the guest's phone
   * derives that same name to recognise its own order in the list it is
   * already listening to. Two spellings of one rule would make a landed order
   * invisible to the screen that sent it - which is the exact uncertainty the
   * key exists to remove - so the prefix, the pattern and the derivation are
   * compared as text.
   */
  it('spells an order idempotency key the same way in both files', () => {
    for (const file of BOTH) {
      const source = readFileSync(file, 'utf8').replace(/\s+/g, ' ');

      expect(source).toContain("TABLE_ORDER_REQUEST_ID_PREFIX = 'req-'");
      expect(source).toContain(
        'TABLE_ORDER_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/',
      );
      expect(source).toContain(
        'tableOrderDocumentId = (requestId: string): string => `${TABLE_ORDER_REQUEST_ID_PREFIX}${requestId}`',
      );
    }
  });

  it('caps a cancellation reason at the same length in both files', () => {
    for (const file of BOTH) {
      expect(readFileSync(file, 'utf8')).toContain(
        'MAX_TABLE_ORDER_CANCELLATION_REASON_LENGTH = 200',
      );
    }
  });
});
