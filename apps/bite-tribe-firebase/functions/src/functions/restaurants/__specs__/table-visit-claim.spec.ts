import {
  mergeTableSessions,
  refuseClaim,
  TABLE_VISIT_CLAIM_REFUSAL_REASONS,
} from '../table-visit-claim';

/**
 * The merge rules of `RD-TS-42` (GitHub issue #1658).
 *
 * The plain case is not a merge at all: the account holds no session at this
 * table, so the anonymous one is rewritten under its name. The merge is for the
 * same person having scanned the code twice, once signed in and once not, and
 * every field where the two sessions disagree needs a rule that is written down
 * rather than implied by whichever `...spread` came last.
 */
const SESSION_ID = '5_table_member-uid';
const MEMBER = 'member-uid';

const session = (fields: Record<string, unknown>): Record<string, unknown> => ({
  id: '5_table_guest-uid',
  restaurantId: 'restaurant',
  tableId: 'table',
  guestUserId: 'guest-uid',
  status: 'active',
  visitId: 'visit-1',
  startedAt: 1_000,
  lastActiveAt: 2_000,
  isAnonymousGuest: true,
  ...fields,
});

describe('mergeTableSessions', () => {
  it('rewrites the anonymous session under the account name when there is none', () => {
    const merged = mergeTableSessions(
      session({}),
      undefined,
      SESSION_ID,
      MEMBER,
    );

    expect(merged).toMatchObject({
      id: SESSION_ID,
      guestUserId: MEMBER,
      status: 'active',
      visitId: 'visit-1',
      startedAt: 1_000,
      lastActiveAt: 2_000,
      // Whoever holds it now, it is not an anonymous guest's.
      isAnonymousGuest: false,
    });
  });

  /**
   * A closed meal that happens to share a name. `RD-TS-5` makes ending
   * one-way, so there is nothing in it to merge with.
   */
  it('replaces an ended session rather than merging with it', () => {
    const merged = mergeTableSessions(
      session({ visitId: 'visit-2', startedAt: 9_000, lastActiveAt: 9_500 }),
      session({
        guestUserId: MEMBER,
        status: 'closed',
        visitId: 'visit-1',
        startedAt: 10,
        lastActiveAt: 20,
        endedAt: 30,
      }),
      SESSION_ID,
      MEMBER,
    );

    expect(merged).toMatchObject({
      status: 'active',
      visitId: 'visit-2',
      startedAt: 9_000,
      lastActiveAt: 9_500,
    });
  });

  /** Staff seated this party; which session the confirmation landed on is an accident. */
  it('keeps active over pending', () => {
    const fromPending = mergeTableSessions(
      session({ status: 'pending' }),
      session({ guestUserId: MEMBER, status: 'active' }),
      SESSION_ID,
      MEMBER,
    );
    const fromActive = mergeTableSessions(
      session({ status: 'active' }),
      session({ guestUserId: MEMBER, status: 'pending' }),
      SESSION_ID,
      MEMBER,
    );

    expect(fromPending['status']).toBe('active');
    expect(fromActive['status']).toBe('active');
  });

  it('leaves two pending sessions pending', () => {
    const merged = mergeTableSessions(
      session({ status: 'pending' }),
      session({ guestUserId: MEMBER, status: 'pending' }),
      SESSION_ID,
      MEMBER,
    );

    expect(merged['status']).toBe('pending');
  });

  /**
   * The party arrived once, at the earlier of the two, and the idle clock
   * measures from the last thing they did on either phone.
   */
  it('takes the earliest arrival and the latest activity', () => {
    const merged = mergeTableSessions(
      session({ startedAt: 500, lastActiveAt: 3_000 }),
      session({ guestUserId: MEMBER, startedAt: 100, lastActiveAt: 2_000 }),
      SESSION_ID,
      MEMBER,
    );

    expect(merged).toMatchObject({ startedAt: 100, lastActiveAt: 3_000 });
  });

  /**
   * A pending session has no visit, and the account's live one may. Taking the
   * visit that exists is what puts the claimed orders somewhere to hang from.
   */
  it('keeps the visit either session names', () => {
    const merged = mergeTableSessions(
      session({ status: 'pending', visitId: undefined }),
      session({ guestUserId: MEMBER, status: 'active', visitId: 'visit-7' }),
      SESSION_ID,
      MEMBER,
    );

    expect(merged['visitId']).toBe('visit-7');
  });

  /**
   * The guest left the table on the anonymous phone, signed in, and is
   * claiming the meal back. A live session with an `endedAt` on it would read
   * as ended to everything that checks the field rather than the status.
   */
  it('drops the end timestamp when the merged session is live', () => {
    const merged = mergeTableSessions(
      session({ status: 'left', endedAt: 4_000 }),
      session({ guestUserId: MEMBER, status: 'active' }),
      SESSION_ID,
      MEMBER,
    );

    expect(merged['status']).toBe('active');
    expect('endedAt' in merged).toBe(false);
  });

  it('writes no visit when neither session has one', () => {
    const merged = mergeTableSessions(
      session({ status: 'pending', visitId: undefined }),
      undefined,
      SESSION_ID,
      MEMBER,
    );

    expect('visitId' in merged).toBe(false);
  });
});

describe('refuseClaim', () => {
  it.each([...TABLE_VISIT_CLAIM_REFUSAL_REASONS])(
    'carries %p and nothing else',
    (reason) => {
      expect(refuseClaim(reason)).toEqual({ ok: false, reason });
    },
  );
});
