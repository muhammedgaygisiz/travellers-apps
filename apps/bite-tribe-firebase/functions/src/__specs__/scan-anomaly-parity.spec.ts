import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * What the restaurant is told about unusual scans exists twice, and the
 * duplication is deliberate (GitHub issue #1107).
 *
 * `scan-anomaly.ts` in `libs/bite-tribe-common/model` is the single definition
 * and carries the reasoning. The backend cannot reach it: this project compiles
 * with its own `tsconfig.json`, whose `rootDir` is `src` and which carries none
 * of the workspace path mappings, and the deploy uploads `lib/` alone.
 * `table-assistance-parity.spec.ts` and the five before it are the precedent:
 * copy the data, and make the copy checked instead of trusted.
 *
 * Four things here drift silently.
 *
 * **The kinds.** The backend raises them and the business app renders one
 * sentence per kind. A kind added to one file alone is a blank row on the one
 * screen whose entire purpose is telling somebody something, and both codebases
 * keep passing their own tests while it happens.
 *
 * **The id.** It is derived on both sides - here to write a row, and in the
 * business app to dismiss one - so a separator changed in one file leaves every
 * dismissal landing on a document nothing ever wrote, with no error anywhere.
 *
 * **The quiet window.** It is what bounds the writer on a path an attacker
 * controls the frequency of, and it is also what the staff row's "counted since"
 * sentence means. A copy that believed it was shorter would be a copy that
 * writes more often than the design allows.
 *
 * **The two thresholds.** `MIN_SESSIONS_BEFORE_ANOMALY` and
 * `DISTANT_SCAN_METERS` decide whether a row exists at all. Only the backend
 * applies them today, but the business app states both to the reader - "more
 * than six sessions", "more than 500 m away" - and a screen explaining a rule
 * the backend does not run is worse than one explaining nothing.
 *
 * Read as **text** rather than imported, for the same reason the others are:
 * the library is outside this project's `rootDir` and resolves through a path
 * mapping this project does not have.
 */

const WORKSPACE_ROOT = join(__dirname, '..', '..', '..', '..', '..');

const FUNCTIONS_FILE = join(
  __dirname,
  '..',
  'functions',
  'restaurants',
  'scan-anomaly.ts',
);

const LIBRARY_FILE = join(
  WORKSPACE_ROOT,
  'libs',
  'bite-tribe-common',
  'model',
  'src',
  'lib',
  'scan-anomaly.ts',
);

const BOTH = [FUNCTIONS_FILE, LIBRARY_FILE];

/**
 * The members of a `const` tuple, in declaration order.
 *
 * Two readings, because the two files write these lists differently and both
 * spellings are correct. A list whose members carry prose above them spans
 * lines, and there the member is anchored to the start of its own line - a kind
 * named in a sentence is not a member, and matching every quoted string in the
 * body would collect the sentences too. A list short enough to fit on one line
 * has no prose in it, so every quoted string in it is a member.
 *
 * Deriving which reading to use from the source rather than passing a flag,
 * because the choice is not a property of the list: `SCAN_ANOMALY_STATUSES` is
 * one line here and would span several the moment somebody documents an entry,
 * and a spec that stopped seeing the second status at that point would stop
 * checking the thing it exists to check without failing.
 */
const membersOf = (file: string, name: string): string[] => {
  const source = readFileSync(file, 'utf8');
  const list = new RegExp(`${name}[^=]*= \\[([\\s\\S]*?)\\]`).exec(source);

  if (!list) {
    throw new Error(`No ${name} declaration found in ${file}`);
  }

  const body = list[1];
  const members = body.includes('\n')
    ? body.matchAll(/^\s*'([^']+)',/gm)
    : body.matchAll(/'([^']+)'/g);

  return [...members].map((match) => match[1]);
};

/** The body of the one-line `scanAnomalyId` arrow, as written. */
const idTemplateOf = (file: string): string => {
  const source = readFileSync(file, 'utf8');
  const body = /scanAnomalyId = \([\s\S]*?\): string =>\s*([^;]+);/.exec(
    source,
  );

  if (!body) {
    throw new Error(`No scanAnomalyId declaration in ${file}`);
  }

  return body[1].trim();
};

/** A named numeric constant, as a number. */
const numberOf = (file: string, name: string): number => {
  const source = readFileSync(file, 'utf8');
  const value = new RegExp(`${name} = ([0-9_]+)`).exec(source);

  if (!value) {
    throw new Error(`No ${name} declaration found in ${file}`);
  }

  return Number(value[1].replace(/_/g, ''));
};

/** A named string constant, as written. */
const stringOf = (file: string, name: string): string => {
  const source = readFileSync(file, 'utf8');
  const value = new RegExp(`${name}[^=]*= '([^']+)'`).exec(source);

  if (!value) {
    throw new Error(`No ${name} declaration found in ${file}`);
  }

  return value[1];
};

describe('scan anomaly parity', () => {
  /**
   * Order as well as membership. The staff screen renders one sentence per
   * kind from a table keyed by it, so a kind added to one file alone is the
   * blank row this spec exists to prevent.
   */
  it('holds the same kinds in the same order in both files', () => {
    const [backend, library] = BOTH.map((file) =>
      membersOf(file, 'SCAN_ANOMALY_KINDS'),
    );

    expect(backend).toEqual([
      'rateLimited',
      'outsideOpeningHours',
      'disabledTable',
      'manySessions',
      'distantScan',
    ]);
    expect(library).toEqual(backend);
  });

  it('holds the same statuses in the same order in both files', () => {
    const [backend, library] = BOTH.map((file) =>
      membersOf(file, 'SCAN_ANOMALY_STATUSES'),
    );

    expect(backend).toEqual(['open', 'dismissed']);
    expect(library).toEqual(backend);
  });

  /**
   * The derivation, compared as source text. The business app computes the name
   * to dismiss a row, so a separator that differs by one character is a
   * dismissal that lands on a document nothing wrote and a row that never goes.
   */
  it('derives the document name the same way in both files', () => {
    const [backend, library] = BOTH.map(idTemplateOf);

    expect(backend).toBe('`${tableId.length}_${tableId}_${kind}`');
    expect(library).toBe(backend);
  });

  it('holds the same quiet window in both files', () => {
    const [backend, library] = BOTH.map((file) =>
      numberOf(file, 'SCAN_ANOMALY_QUIET_MS'),
    );

    expect(backend).toBe(60000);
    expect(library).toBe(backend);
  });

  it('holds the same session floor in both files', () => {
    const [backend, library] = BOTH.map((file) =>
      numberOf(file, 'MIN_SESSIONS_BEFORE_ANOMALY'),
    );

    expect(library).toBe(backend);
  });

  it('holds the same distance threshold in both files', () => {
    const [backend, library] = BOTH.map((file) =>
      numberOf(file, 'DISTANT_SCAN_METERS'),
    );

    expect(backend).toBe(500);
    expect(library).toBe(backend);
  });

  /**
   * The collection name and the status a row is raised in. The first is the
   * path both sides address; the second is what the staff screen filters by,
   * and a copy that raised rows as `dismissed` would write a list nobody sees.
   */
  it('names the same collection and initial status in both files', () => {
    const [backendCollection, libraryCollection] = BOTH.map((file) =>
      stringOf(file, 'SCAN_ANOMALIES_COLLECTION'),
    );
    const [backendStatus, libraryStatus] = BOTH.map((file) =>
      stringOf(file, 'INITIAL_SCAN_ANOMALY_STATUS'),
    );

    expect(backendCollection).toBe('scanAnomalies');
    expect(libraryCollection).toBe(backendCollection);
    expect(backendStatus).toBe('open');
    expect(libraryStatus).toBe(backendStatus);
  });
});
