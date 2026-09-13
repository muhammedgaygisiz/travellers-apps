import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A guest's session exists twice, and the duplication is deliberate
 * (GitHub issue #1101).
 *
 * `table-session.ts` in `libs/bite-tribe-common/model` is the single definition
 * and carries the reasoning. The backend cannot reach it: this project compiles
 * with its own `tsconfig.json`, whose `rootDir` is `src` and which carries none
 * of the workspace path mappings, and the deploy uploads `lib/` alone.
 * `table-state-parity.spec.ts`, `table-visit-parity.spec.ts`,
 * `table-scan-parity.spec.ts` and `role-list-parity.spec.ts` are the
 * precedent: copy the data, and make the copy checked instead of trusted.
 *
 * Two things here drift silently, and one of them is worse than a wrong
 * sentence.
 *
 * **The id.** `tableSessionId` is computed on both sides - the guest's phone
 * derives the document name to subscribe to its own session, and the backend
 * derives it to write one - so a separator changed in one file and not the
 * other leaves a guest watching a document nothing ever writes. Nothing fails.
 * The screen simply never moves off "waiting for the restaurant", and both
 * codebases keep passing their own tests.
 *
 * **The statuses and the two sets over them.** A status the backend writes and
 * the client has no sentence for is the blank refusal screen; a `live` set that
 * disagrees is a second session opened for one phone, or a guest allowed to
 * order from a session that ended.
 *
 * Read as **text** rather than imported, for the same reason the others are:
 * the library is outside this project's `rootDir` and resolves through a path
 * mapping this project does not have.
 */

const WORKSPACE_ROOT = join(__dirname, '..', '..', '..', '..', '..');

const FUNCTIONS_TABLE_SESSION = join(
  __dirname,
  '..',
  'functions',
  'restaurants',
  'table-session.ts',
);

const LIBRARY_TABLE_SESSION = join(
  WORKSPACE_ROOT,
  'libs',
  'bite-tribe-common',
  'model',
  'src',
  'lib',
  'table-session.ts',
);

const BOTH = [FUNCTIONS_TABLE_SESSION, LIBRARY_TABLE_SESSION];

/**
 * The members of a `const` tuple or a `readonly` array, in declaration order.
 *
 * Anchored on the name rather than on any quoted string in the file, because
 * the library copy documents each status in prose above it and a status named
 * in a sentence is not a member.
 */
const membersOf = (file: string, name: string): string[] => {
  const source = readFileSync(file, 'utf8');
  const list = new RegExp(`${name}[^=]*= \\[([\\s\\S]*?)\\]`).exec(source);

  if (!list) {
    throw new Error(`No ${name} declaration found in ${file}`);
  }

  // Line-anchored, so a status named in the prose documenting the member above
  // it is not mistaken for a member. The library copy explains each of the five
  // in a comment, and one of those comments contains an apostrophe.
  return [...list[1].matchAll(/^\s*'([^']+)',/gm)].map((match) => match[1]);
};

/** The body of the one-line `tableSessionId` arrow, as written. */
const idTemplateOf = (file: string): string => {
  const source = readFileSync(file, 'utf8');
  const body = /tableSessionId = \([\s\S]*?\): string =>\s*([^;]+);/.exec(
    source,
  );

  if (!body) {
    throw new Error(`No tableSessionId declaration found in ${file}`);
  }

  return body[1].trim();
};

/** The default idle timeout, as a number. */
const defaultIdleMinutesOf = (file: string): number => {
  const source = readFileSync(file, 'utf8');
  const value = /DEFAULT_TABLE_SESSION_IDLE_MINUTES = (\d+)/.exec(source);

  if (!value) {
    throw new Error(
      `No DEFAULT_TABLE_SESSION_IDLE_MINUTES declaration found in ${file}`,
    );
  }

  return Number(value[1]);
};

describe('table session parity', () => {
  it('finds a status list in both files', () => {
    for (const file of BOTH) {
      expect(membersOf(file, 'TABLE_SESSION_STATUSES').length).toBe(5);
    }
  });

  /**
   * Order as well as membership. The order is not itself a contract the way the
   * refusal reasons' is, but a copy that reorders is a copy somebody edited
   * without reading the other, which is the edit this whole spec is watching
   * for.
   */
  it('holds the same statuses in the same order in both files', () => {
    expect(
      membersOf(FUNCTIONS_TABLE_SESSION, 'TABLE_SESSION_STATUSES'),
    ).toEqual(membersOf(LIBRARY_TABLE_SESSION, 'TABLE_SESSION_STATUSES'));
  });

  it('carries the five statuses that exist', () => {
    expect(membersOf(LIBRARY_TABLE_SESSION, 'TABLE_SESSION_STATUSES')).toEqual([
      'pending',
      'active',
      'left',
      'expired',
      'closed',
    ]);
  });

  it('agrees on which statuses end a session', () => {
    expect(
      membersOf(FUNCTIONS_TABLE_SESSION, 'TABLE_SESSION_END_STATUSES'),
    ).toEqual(membersOf(LIBRARY_TABLE_SESSION, 'TABLE_SESSION_END_STATUSES'));
  });

  it('agrees on which statuses still stand between the guest and ordering', () => {
    expect(
      membersOf(FUNCTIONS_TABLE_SESSION, 'TABLE_SESSION_LIVE_STATUSES'),
    ).toEqual(membersOf(LIBRARY_TABLE_SESSION, 'TABLE_SESSION_LIVE_STATUSES'));
  });

  /**
   * Every status is in exactly one of the two sets. Without this a status added
   * to both files and to neither set would be neither live nor ended - which
   * reads as ended to `isEndedSession` and as unorderable to
   * `isTableSessionActive`, so the guest is silently locked out by a status
   * somebody meant to be usable.
   */
  it('sorts every status into exactly one of the two sets', () => {
    for (const file of BOTH) {
      const live = membersOf(file, 'TABLE_SESSION_LIVE_STATUSES');
      const ended = membersOf(file, 'TABLE_SESSION_END_STATUSES');

      expect([...live, ...ended].sort()).toEqual(
        [...membersOf(file, 'TABLE_SESSION_STATUSES')].sort(),
      );
    }
  });

  /**
   * The id is derived on both sides and compared by neither at runtime. This is
   * the only place the two spellings ever meet.
   */
  it('derives the session document id identically in both files', () => {
    expect(idTemplateOf(FUNCTIONS_TABLE_SESSION)).toBe(
      idTemplateOf(LIBRARY_TABLE_SESSION),
    );
  });

  /**
   * Pinned to the exact spelling, because this is the one derivation nothing
   * compares at runtime. The leading length is what makes it injective - a
   * plain separator lets `table_` with `guest` and `table` with `_guest` name
   * one document - so an edit that "simplifies" it away is an edit that makes
   * two guests at one table share a session.
   */
  it('length-prefixes the table id so the derivation is injective', () => {
    expect(idTemplateOf(LIBRARY_TABLE_SESSION)).toBe(
      '`${tableId.length}_${tableId}_${guestUserId}`',
    );
  });

  /**
   * The default timeout decides when a guest stops being able to order, and the
   * two copies are each read by a different half of that sentence: the backend
   * writes `expired`, and the staff view predicts it while drawing a pending
   * list. Disagreeing would make the screen lie about a session that is already
   * over.
   */
  it('defaults to the same idle timeout in both files', () => {
    expect(defaultIdleMinutesOf(FUNCTIONS_TABLE_SESSION)).toBe(
      defaultIdleMinutesOf(LIBRARY_TABLE_SESSION),
    );
  });

  it('names the same collection in both files', () => {
    for (const file of BOTH) {
      expect(readFileSync(file, 'utf8')).toContain(
        "TABLE_SESSIONS_COLLECTION = 'tableSessions'",
      );
    }
  });
});
