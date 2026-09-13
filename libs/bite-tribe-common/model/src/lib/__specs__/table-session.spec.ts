import {
  DEFAULT_TABLE_SESSION_IDLE_MINUTES,
  TABLE_SESSION_END_STATUSES,
  TABLE_SESSION_LIVE_STATUSES,
  TABLE_SESSION_STATUSES,
  TableSession,
  TableSessionStatus,
  isTableSessionActive,
  isTableSessionEnded,
  isTableSessionExpired,
  isTableSessionStatus,
  tableSessionId,
  tableSessionIdleTimeoutMs,
} from '../table-session';

/**
 * The guest session model (GitHub issue #1101).
 *
 * Three of these are the kind of test that only earns its place because the
 * thing it guards is invisible from the dining room: a session that looks live
 * and cannot order, an id one half of the product derives differently from the
 * other, and a timeout of zero that expires every guest the moment they sit
 * down.
 */

const MINUTE = 60 * 1000;

const session = (
  overrides: Partial<TableSession> = {},
): Pick<TableSession, 'status' | 'lastActiveAt'> => ({
  status: 'active',
  lastActiveAt: 0,
  ...overrides,
});

describe('table session statuses', () => {
  it('carries the five statuses the product names', () => {
    expect(TABLE_SESSION_STATUSES).toEqual([
      'pending',
      'active',
      'left',
      'expired',
      'closed',
    ]);
  });

  /**
   * Not a restatement of the two arrays. It is what stops a sixth status being
   * added to the tuple and to neither set, which would be a status that is
   * neither live nor ended - unorderable and un-endable, so a guest holding one
   * is stuck with no screen able to say why.
   */
  it('sorts every status into exactly one of the two sets', () => {
    const live = [...TABLE_SESSION_LIVE_STATUSES];
    const ended = [...TABLE_SESSION_END_STATUSES];

    expect([...live, ...ended].sort()).toEqual(
      [...TABLE_SESSION_STATUSES].sort(),
    );
    expect(live.filter((status) => ended.includes(status))).toEqual([]);
  });

  it('recognises a stored status it knows, and nothing else', () => {
    for (const status of TABLE_SESSION_STATUSES) {
      expect(isTableSessionStatus(status)).toBe(true);
    }

    for (const value of ['ACTIVE', 'ordering', '', 7, null, undefined]) {
      expect(isTableSessionStatus(value)).toBe(false);
    }
  });
});

describe('what a session may do', () => {
  it('lets only an active session order', () => {
    expect(isTableSessionActive(session({ status: 'active' }))).toBe(true);

    for (const status of ['pending', 'left', 'expired', 'closed'] as const) {
      expect(isTableSessionActive(session({ status }))).toBe(false);
    }
  });

  /**
   * The one that matters. `pending` is not ended - the guest is still waiting
   * for staff and the session is still theirs - and it is still not allowed to
   * order, because staff have not confirmed anybody is at that table. A reading
   * of "may order" as "has not ended" is the scan-from-the-car-park hole.
   */
  it('keeps a pending session live without letting it order', () => {
    const pending = session({ status: 'pending' });

    expect(isTableSessionEnded(pending)).toBe(false);
    expect(isTableSessionActive(pending)).toBe(false);
  });

  it('treats all three endings as ended', () => {
    for (const status of ['left', 'expired', 'closed'] as const) {
      expect(isTableSessionEnded(session({ status }))).toBe(true);
    }
  });
});

describe('the session document id', () => {
  it('is derived from the table and the guest', () => {
    expect(tableSessionId('table-12', 'guest-uid')).toBe(
      '8_table-12_guest-uid',
    );
  });

  /**
   * The same phone scanning the same code twice must address one document, or a
   * guest ends up with two sessions at one table and the staff screen shows a
   * party of one as a party of two.
   */
  it('is the same for one guest at one table, however often they scan', () => {
    expect(tableSessionId('table-12', 'guest')).toBe(
      tableSessionId('table-12', 'guest'),
    );
  });

  it('separates two guests at one table and one guest at two tables', () => {
    expect(tableSessionId('table-12', 'a')).not.toBe(
      tableSessionId('table-12', 'b'),
    );
    expect(tableSessionId('table-12', 'a')).not.toBe(
      tableSessionId('table-13', 'a'),
    );
  });

  /**
   * The case the leading length exists for. With any separator alone, `table_`
   * with `guest` and `table` with `_guest` name one document - two guests at one
   * table sharing a session, each silently overwriting the other. Neither
   * generator produces such an id today, which is an accident of two generators
   * rather than a rule, and the failure it would cause is invisible from the
   * dining room.
   */
  it('does not collide when an id ends or begins with the separator', () => {
    expect(tableSessionId('table_', 'guest')).not.toBe(
      tableSessionId('table', '_guest'),
    );
  });
});

describe('the idle timeout', () => {
  it('falls back to the default when the restaurant has not configured one', () => {
    for (const value of [undefined, null, '90', Number.NaN]) {
      expect(tableSessionIdleTimeoutMs(value)).toBe(
        DEFAULT_TABLE_SESSION_IDLE_MINUTES * MINUTE,
      );
    }
  });

  it('uses the number the restaurant configured when it has one', () => {
    expect(tableSessionIdleTimeoutMs(45)).toBe(45 * MINUTE);
  });

  /**
   * Zero is a configuration mistake, not an instruction. Honouring it would
   * expire every session in the restaurant the instant it was written, which
   * reads from the dining room as the feature being broken rather than as a
   * setting somebody typed wrong.
   */
  it('refuses zero and negative rather than honouring them', () => {
    expect(tableSessionIdleTimeoutMs(0)).toBe(
      DEFAULT_TABLE_SESSION_IDLE_MINUTES * MINUTE,
    );
    expect(tableSessionIdleTimeoutMs(-30)).toBe(
      DEFAULT_TABLE_SESSION_IDLE_MINUTES * MINUTE,
    );
  });
});

describe('expiry', () => {
  const timeout = 30 * MINUTE;

  it('is not expired while the guest has been active inside the window', () => {
    expect(
      isTableSessionExpired(
        session({ lastActiveAt: 100 }),
        timeout,
        100 + timeout - 1,
      ),
    ).toBe(false);
  });

  it('is expired once the window has passed', () => {
    expect(
      isTableSessionExpired(
        session({ lastActiveAt: 100 }),
        timeout,
        100 + timeout,
      ),
    ).toBe(true);
  });

  /**
   * A pending session expires too, and this is the case it is for: the sticker
   * photographed at lunch and scanned at home. Without it, that scan would sit
   * on the restaurant's pending list until somebody cleared it by hand.
   */
  it('expires a pending session that nobody ever seated', () => {
    expect(
      isTableSessionExpired(
        session({ status: 'pending', lastActiveAt: 0 }),
        timeout,
        timeout + 1,
      ),
    ).toBe(true);
  });

  /**
   * Ending is one-way, so an ending that already happened is not re-labelled.
   * A guest who left and is later read as having timed out would have their
   * record rewritten by the act of somebody looking at it.
   */
  it('never expires a session that already ended', () => {
    for (const status of [
      'left',
      'expired',
      'closed',
    ] as TableSessionStatus[]) {
      expect(
        isTableSessionExpired(
          session({ status, lastActiveAt: 0 }),
          timeout,
          Number.MAX_SAFE_INTEGER,
        ),
      ).toBe(false);
    }
  });
});
