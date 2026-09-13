import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A guest's call for a waiter exists twice, and the duplication is deliberate
 * (GitHub issue #1106).
 *
 * `table-assistance.ts` in `libs/bite-tribe-common/model` is the single
 * definition and carries the reasoning. The backend cannot reach it: this
 * project compiles with its own `tsconfig.json`, whose `rootDir` is `src` and
 * which carries none of the workspace path mappings, and the deploy uploads
 * `lib/` alone. `table-order-parity.spec.ts`, `table-session-parity.spec.ts`
 * and the three before them are the precedent: copy the data, and make the
 * copy checked instead of trusted.
 *
 * Three things here drift silently.
 *
 * **The id.** `tableAssistanceRequestId` is computed on both sides - the
 * guest's phone derives the document name to watch the answer, and the backend
 * derives it to write one - so a separator changed in one file and not the
 * other leaves a guest watching a document nothing ever writes while the
 * restaurant sees a marker the guest is never told about. Nothing fails, and
 * both codebases keep passing their own tests.
 *
 * **The cooldown.** It is the number the guest's screen counts down from and
 * the number the backend refuses against. A phone that believed it was shorter
 * would offer a button the backend refuses; one that believed it was longer
 * would hide a button that works.
 *
 * **The kinds, the statuses and the refusal reasons.** A refusal the backend
 * returns and the client has no sentence for is a blank line in front of a
 * guest who cannot get a waiter and is not told why, and a kind one side does
 * not know is a tap that answers with `invalid-argument`.
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
  'table-assistance.ts',
);

const LIBRARY_FILE = join(
  WORKSPACE_ROOT,
  'libs',
  'bite-tribe-common',
  'model',
  'src',
  'lib',
  'table-assistance.ts',
);

const BOTH = [FUNCTIONS_FILE, LIBRARY_FILE];

/**
 * The members of a `const` tuple or a `readonly` array, in declaration order.
 *
 * Line-anchored on the quoted member rather than on any quoted string in the
 * file, because the library copy documents each entry in prose above it and a
 * kind named in a sentence is not a member.
 */
const membersOf = (file: string, name: string): string[] => {
  const source = readFileSync(file, 'utf8');
  const list = new RegExp(`${name}[^=]*= \\[([\\s\\S]*?)\\]`).exec(source);

  if (!list) {
    throw new Error(`No ${name} declaration found in ${file}`);
  }

  return [...list[1].matchAll(/^\s*'([^']+)',/gm)].map((match) => match[1]);
};

/** The body of the one-line `tableAssistanceRequestId` arrow, as written. */
const idTemplateOf = (file: string): string => {
  const source = readFileSync(file, 'utf8');
  const body =
    /tableAssistanceRequestId = \([\s\S]*?\): string =>\s*([^;]+);/.exec(
      source,
    );

  if (!body) {
    throw new Error(`No tableAssistanceRequestId declaration in ${file}`);
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

describe('table assistance parity', () => {
  it('holds the same kinds in the same order in both files', () => {
    const [backend, library] = BOTH.map((file) =>
      membersOf(file, 'TABLE_ASSISTANCE_KINDS'),
    );

    expect(backend).toEqual(['callStaff', 'requestBill']);
    expect(library).toEqual(backend);
  });

  it('holds the same statuses in the same order in both files', () => {
    const [backend, library] = BOTH.map((file) =>
      membersOf(file, 'TABLE_ASSISTANCE_STATUSES'),
    );

    expect(backend).toEqual(['open', 'acknowledged']);
    expect(library).toEqual(backend);
  });

  /**
   * Order as well as membership. The client renders one sentence per reason,
   * and a reason added to one file alone is the blank line this spec exists to
   * prevent.
   */
  it('holds the same refusal reasons in the same order in both files', () => {
    const [backend, library] = BOTH.map((file) =>
      membersOf(file, 'TABLE_ASSISTANCE_REFUSAL_REASONS'),
    );

    expect(backend).toContain('cooldown');
    expect(library).toEqual(backend);
  });

  /**
   * The statuses a signal may be raised from, which is where this model and
   * the order model deliberately differ: `awaitingPayment` is in this list and
   * not in `ORDERABLE_TABLE_STATUSES`. A copy that dropped it would refuse the
   * second bill request of every party whose waiter did not come.
   */
  it('admits the same table statuses in both files', () => {
    const [backend, library] = BOTH.map((file) =>
      membersOf(file, 'ATTENDED_TABLE_STATUSES'),
    );

    expect(backend).toEqual(['occupied', 'ordering', 'awaitingPayment']);
    expect(library).toEqual(backend);
  });

  /**
   * The derivation, compared as source text. A guest subscribes to the name
   * their phone computes, so a separator that differs by one character is a
   * screen that never moves off "asking".
   */
  it('derives the document name the same way in both files', () => {
    const [backend, library] = BOTH.map(idTemplateOf);

    expect(backend).toBe('`${tableId.length}_${tableId}_${kind}`');
    expect(library).toBe(backend);
  });

  it('holds the same cooldown in both files', () => {
    const [backend, library] = BOTH.map((file) =>
      numberOf(file, 'TABLE_ASSISTANCE_COOLDOWN_MS'),
    );

    expect(backend).toBe(60000);
    expect(library).toBe(backend);
  });

  it('holds the same requester cap in both files', () => {
    const [backend, library] = BOTH.map((file) =>
      numberOf(file, 'MAX_TABLE_ASSISTANCE_REQUESTERS'),
    );

    expect(library).toBe(backend);
  });

  /**
   * The collection name and the status a bill request lands a table on. The
   * first is the path both sides address; the second is a product rule the
   * staff screen predicts when it says what a requested bill did to the table.
   */
  it('names the same collection and the same status after a bill request', () => {
    const [backendCollection, libraryCollection] = BOTH.map((file) =>
      stringOf(file, 'TABLE_ASSISTANCE_REQUESTS_COLLECTION'),
    );
    const [backendStatus, libraryStatus] = BOTH.map((file) =>
      stringOf(file, 'TABLE_STATUS_AFTER_BILL_REQUEST'),
    );

    expect(backendCollection).toBe('assistanceRequests');
    expect(libraryCollection).toBe(backendCollection);
    expect(backendStatus).toBe('awaitingPayment');
    expect(libraryStatus).toBe(backendStatus);
  });
});
