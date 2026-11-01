import type { FakeFirestore } from './fake-firestore';
import { createFakeFirestore } from './fake-firestore';

let db: FakeFirestore;
const getUsersMock = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: (): unknown => ({ getUsers: getUsersMock }),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn((handler) => handler),
}));

import { logger } from 'firebase-functions';
import { reportUserHandler } from '../report-user';
import {
  dismissUserReportsHandler,
  listUserReportsHandler,
  RECENT_BITES_PER_USER,
} from '../user-reports-as-operator';

const ADMIN_UID = 'admin-uid';
const REPORTED_UID = 'reported-uid';
const REPORTER_UID = 'reporter-uid';

interface TestRequest {
  auth?: {
    uid: string;
    token: { roles?: unknown; firebase?: { sign_in_provider?: string } };
  };
  data: unknown;
}

const member = (data: unknown, uid = REPORTER_UID): TestRequest => ({
  auth: { uid, token: { firebase: { sign_in_provider: 'password' } } },
  data,
});

const operator = (data: unknown, roles: unknown = ['admin']): TestRequest => ({
  auth: { uid: ADMIN_UID, token: { roles } },
  data,
});

const report = (request: TestRequest): ReturnType<typeof reportUserHandler> =>
  reportUserHandler(request as Parameters<typeof reportUserHandler>[0]);

const list = (
  request: TestRequest,
): ReturnType<typeof listUserReportsHandler> =>
  listUserReportsHandler(
    request as Parameters<typeof listUserReportsHandler>[0],
  );

const dismiss = (
  request: TestRequest,
): ReturnType<typeof dismissUserReportsHandler> =>
  dismissUserReportsHandler(
    request as Parameters<typeof dismissUserReportsHandler>[0],
  );

const seedReport = (
  reportedUid: string,
  reporterUid: string,
  over: Record<string, unknown> = {},
): void =>
  db.seed(`userReports/${reportedUid}_${reporterUid}`, {
    reportedUid,
    reporterUid,
    reason: 'harassment',
    status: 'open',
    createdAt: '2026-10-01T10:00:00.000Z',
    createdAtTimestamp: 0,
    ...over,
  });

beforeEach(() => {
  db = createFakeFirestore();
  jest.mocked(logger.info).mockClear();
  getUsersMock.mockReset().mockResolvedValue({ users: [], notFound: [] });
  db.seed(`users/${REPORTED_UID}`, {
    displayName: 'Reported',
    photoUrl: 'https://example.test/o/face.jpg',
    about: 'Hello',
  });
});

describe('reportUser', () => {
  it('records the profile, the reporter, the reason and the time', async () => {
    await expect(
      report(member({ uid: REPORTED_UID, reason: 'impersonation' })),
    ).resolves.toEqual({ reported: true });

    expect(db.read(`userReports/${REPORTED_UID}_${REPORTER_UID}`)).toEqual({
      reportedUid: REPORTED_UID,
      reporterUid: REPORTER_UID,
      reason: 'impersonation',
      status: 'open',
      createdAt: expect.any(String),
      createdAtTimestamp: expect.any(Number),
    });
  });

  it('does not create a second report from the same account', async () => {
    await report(member({ uid: REPORTED_UID, reason: 'spam' }));

    await expect(
      report(member({ uid: REPORTED_UID, reason: 'harassment' })),
    ).resolves.toEqual({ reported: false });

    expect(
      db.read(`userReports/${REPORTED_UID}_${REPORTER_UID}`),
    ).toMatchObject({ reason: 'spam' });
  });

  it('does not reopen a report an operator dismissed', async () => {
    seedReport(REPORTED_UID, REPORTER_UID, { status: 'dismissed' });

    await expect(
      report(member({ uid: REPORTED_UID, reason: 'spam' })),
    ).resolves.toEqual({ reported: false });

    expect(
      db.read(`userReports/${REPORTED_UID}_${REPORTER_UID}`),
    ).toMatchObject({ status: 'dismissed' });
  });

  it('writes nothing the reported account can read and logs no reporter', async () => {
    await report(member({ uid: REPORTED_UID, reason: 'spam' }));

    expect(db.read(`users/${REPORTED_UID}`)).not.toHaveProperty('reported');
    expect(JSON.stringify(jest.mocked(logger.info).mock.calls)).not.toContain(
      REPORTER_UID,
    );
  });

  it('refuses a signed-out caller', async () => {
    await expect(
      report({ data: { uid: REPORTED_UID, reason: 'spam' } }),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('refuses a table guest', async () => {
    await expect(
      report({
        auth: {
          uid: 'guest',
          token: { firebase: { sign_in_provider: 'anonymous' } },
        },
        data: { uid: REPORTED_UID, reason: 'spam' },
      }),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('refuses a reason outside the list, including the Bite-only one', async () => {
    await expect(
      report(member({ uid: REPORTED_UID, reason: 'notFood' })),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('refuses a profile that does not exist', async () => {
    await expect(
      report(member({ uid: 'missing', reason: 'spam' })),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('refuses a path in place of a uid', async () => {
    await expect(
      report(member({ uid: `users/${REPORTED_UID}`, reason: 'spam' })),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('refuses an account reporting itself', async () => {
    await expect(
      report(member({ uid: REPORTED_UID, reason: 'spam' }, REPORTED_UID)),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});

describe('listUserReports', () => {
  it('refuses a caller without the admin role', async () => {
    await expect(list(operator({}, []))).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('aggregates the open reports per profile with the profile', async () => {
    seedReport(REPORTED_UID, 'a', { reason: 'harassment' });
    seedReport(REPORTED_UID, 'b', {
      reason: 'impersonation',
      createdAt: '2026-10-02T10:00:00.000Z',
    });
    seedReport(REPORTED_UID, 'c', { status: 'dismissed' });

    const { users, truncated } = await list(operator({}));

    expect(truncated).toBe(false);
    expect(users).toEqual([
      {
        uid: REPORTED_UID,
        exists: true,
        displayName: 'Reported',
        photoUrl: 'https://example.test/o/face.jpg',
        about: 'Hello',
        blocked: false,
        recentBites: [],
        reportCount: 2,
        reasons: {
          harassment: 1,
          impersonation: 1,
          spam: 0,
          inappropriate: 0,
          other: 0,
        },
        firstReportedAt: '2026-10-01T10:00:00.000Z',
        lastReportedAt: '2026-10-02T10:00:00.000Z',
      },
    ]);
  });

  it('carries the newest Bites of the reported account, and no one else’s', async () => {
    seedReport(REPORTED_UID, 'a');
    for (let index = 0; index < RECENT_BITES_PER_USER + 2; index += 1) {
      db.seed(`bites/bite-${index}`, {
        userId: REPORTED_UID,
        name: `Bite ${index}`,
        imagePath: `https://example.test/o/${index}.jpg`,
        createdAtTimestamp: index,
      });
    }
    db.seed('bites/other', { userId: 'someone-else', name: 'Other' });

    const [user] = (await list(operator({}))).users;

    expect(user.recentBites).toHaveLength(RECENT_BITES_PER_USER);
    expect(user.recentBites[0]).toEqual(
      expect.objectContaining({ name: expect.stringMatching(/^Bite /) }),
    );
    expect(user.recentBites.map((bite) => bite.biteId)).not.toContain('other');
  });

  it('says when the account is already blocked', async () => {
    seedReport(REPORTED_UID, 'a');
    getUsersMock.mockResolvedValue({
      users: [{ uid: REPORTED_UID, disabled: true }],
      notFound: [],
    });

    const [user] = (await list(operator({}))).users;

    expect(user.blocked).toBe(true);
    expect(getUsersMock).toHaveBeenCalledWith([{ uid: REPORTED_UID }]);
  });

  it('never returns who reported a profile', async () => {
    seedReport(REPORTED_UID, REPORTER_UID);

    const result = await list(operator({}));

    expect(JSON.stringify(result)).not.toContain(REPORTER_UID);
  });

  it('puts the most-reported profile first', async () => {
    db.seed('users/second', { displayName: 'Second' });
    seedReport(REPORTED_UID, 'a');
    seedReport('second', 'a');
    seedReport('second', 'b');

    const { users } = await list(operator({}));

    expect(users.map((user) => user.uid)).toEqual(['second', REPORTED_UID]);
  });

  it('still lists a report whose profile is gone, so it can be closed', async () => {
    seedReport('gone', 'a');

    const { users } = await list(operator({}));

    expect(users).toEqual([
      expect.objectContaining({ uid: 'gone', exists: false }),
    ]);
  });

  it('is empty when nothing is open', async () => {
    await expect(list(operator({}))).resolves.toEqual({
      users: [],
      truncated: false,
    });
    expect(getUsersMock).not.toHaveBeenCalled();
  });
});

describe('dismissUserReports', () => {
  it('refuses a caller without the admin role', async () => {
    await expect(
      dismiss(operator({ uid: REPORTED_UID, reason: 'Fine' }, ['business'])),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('requires a reason', async () => {
    seedReport(REPORTED_UID, 'a');

    await expect(
      dismiss(operator({ uid: REPORTED_UID, reason: '  ' })),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('closes every open report on the profile and no other', async () => {
    seedReport(REPORTED_UID, 'a');
    seedReport(REPORTED_UID, 'b');
    seedReport('second', 'a');

    await expect(
      dismiss(operator({ uid: REPORTED_UID, reason: 'Blocked.' })),
    ).resolves.toEqual({ uid: REPORTED_UID, dismissedReports: 2 });

    expect(db.read(`userReports/${REPORTED_UID}_a`)).toMatchObject({
      status: 'dismissed',
      dismissedAt: expect.any(String),
    });
    expect(db.read(`userReports/${REPORTED_UID}_b`)).toMatchObject({
      status: 'dismissed',
    });
    expect(db.read('userReports/second_a')).toMatchObject({ status: 'open' });
  });

  it('logs the dismissal as an operator action', async () => {
    seedReport(REPORTED_UID, 'a');

    await dismiss(operator({ uid: REPORTED_UID, reason: 'Blocked.' }));

    expect(logger.info).toHaveBeenCalledWith(
      'operator action: dismissUserReports succeeded',
      expect.objectContaining({
        operatorAction: 'dismissUserReports',
        targetType: 'user',
        targetId: REPORTED_UID,
        reason: 'Blocked.',
        callerUid: ADMIN_UID,
      }),
    );
  });

  it('refuses a profile with no open reports', async () => {
    seedReport(REPORTED_UID, 'a', { status: 'dismissed' });

    await expect(
      dismiss(operator({ uid: REPORTED_UID, reason: 'Fine' })),
    ).rejects.toMatchObject({ code: 'not-found' });
  });
});
