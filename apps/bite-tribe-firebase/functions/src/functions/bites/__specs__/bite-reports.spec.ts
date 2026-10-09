import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
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
import { deleteBiteReportsForBite } from '../bite-report';
import {
  dismissBiteReportsHandler,
  listBiteReportsHandler,
} from '../bite-reports-as-operator';
import { reportBiteHandler } from '../report-bite';

const ADMIN_UID = 'admin-uid';
const AUTHOR_UID = 'author-uid';
const REPORTER_UID = 'reporter-uid';
const BITE_ID = 'bite-1';

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

const report = (request: TestRequest): ReturnType<typeof reportBiteHandler> =>
  reportBiteHandler(request as Parameters<typeof reportBiteHandler>[0]);

const list = (
  request: TestRequest,
): ReturnType<typeof listBiteReportsHandler> =>
  listBiteReportsHandler(
    request as Parameters<typeof listBiteReportsHandler>[0],
  );

const dismiss = (
  request: TestRequest,
): ReturnType<typeof dismissBiteReportsHandler> =>
  dismissBiteReportsHandler(
    request as Parameters<typeof dismissBiteReportsHandler>[0],
  );

const seedReport = (
  biteId: string,
  reporterUid: string,
  over: Record<string, unknown> = {},
): void =>
  db.seed(`biteReports/${biteId}_${reporterUid}`, {
    biteId,
    reporterUid,
    reason: 'spam',
    status: 'open',
    createdAt: '2026-10-01T10:00:00.000Z',
    createdAtTimestamp: 0,
    ...over,
  });

beforeEach(() => {
  db = createFakeFirestore();
  jest.mocked(logger.info).mockClear();
  db.seed(`bites/${BITE_ID}`, {
    userId: AUTHOR_UID,
    name: 'Ramen',
    place: 'Ichiran',
    imagePath: 'https://example.test/o/ramen.jpg',
    tags: ['noodles'],
  });
  db.seed(`users/${AUTHOR_UID}`, { displayName: 'Author' });
});

describe('reportBite', () => {
  it('records the Bite, the reporter, the reason and the time', async () => {
    await expect(
      report(member({ biteId: BITE_ID, reason: 'notFood' })),
    ).resolves.toEqual({ reported: true });

    expect(db.read(`biteReports/${BITE_ID}_${REPORTER_UID}`)).toEqual({
      biteId: BITE_ID,
      reporterUid: REPORTER_UID,
      reason: 'notFood',
      status: 'open',
      createdAt: expect.any(String),
      createdAtTimestamp: expect.any(Number),
    });
  });

  it('does not create a second report from the same account', async () => {
    await report(member({ biteId: BITE_ID, reason: 'spam' }));

    await expect(
      report(member({ biteId: BITE_ID, reason: 'harassment' })),
    ).resolves.toEqual({ reported: false });

    expect(db.read(`biteReports/${BITE_ID}_${REPORTER_UID}`)).toMatchObject({
      reason: 'spam',
    });
  });

  it('does not reopen a report an operator dismissed', async () => {
    seedReport(BITE_ID, REPORTER_UID, { status: 'dismissed' });

    await expect(
      report(member({ biteId: BITE_ID, reason: 'spam' })),
    ).resolves.toEqual({ reported: false });

    expect(db.read(`biteReports/${BITE_ID}_${REPORTER_UID}`)).toMatchObject({
      status: 'dismissed',
    });
  });

  it('keeps reports from different accounts apart', async () => {
    await report(member({ biteId: BITE_ID, reason: 'spam' }));
    await report(member({ biteId: BITE_ID, reason: 'spam' }, 'second-uid'));

    expect(db.exists(`biteReports/${BITE_ID}_${REPORTER_UID}`)).toBe(true);
    expect(db.exists(`biteReports/${BITE_ID}_second-uid`)).toBe(true);
  });

  it('writes nothing the author can read and logs no reporter', async () => {
    await report(member({ biteId: BITE_ID, reason: 'spam' }));

    expect(db.read(`bites/${BITE_ID}`)).not.toHaveProperty('reported');
    expect(JSON.stringify(jest.mocked(logger.info).mock.calls)).not.toContain(
      REPORTER_UID,
    );
  });

  it('refuses a signed-out caller', async () => {
    await expect(
      report({ data: { biteId: BITE_ID, reason: 'spam' } }),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('refuses a table guest', async () => {
    await expect(
      report({
        auth: {
          uid: 'guest',
          token: { firebase: { sign_in_provider: 'anonymous' } },
        },
        data: { biteId: BITE_ID, reason: 'spam' },
      }),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('refuses a reason outside the list', async () => {
    await expect(
      report(member({ biteId: BITE_ID, reason: 'because' })),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('refuses a Bite that does not exist', async () => {
    await expect(
      report(member({ biteId: 'missing', reason: 'spam' })),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('refuses a path in place of a Bite id', async () => {
    await expect(
      report(member({ biteId: 'bites/bite-1', reason: 'spam' })),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('refuses the author reporting their own Bite', async () => {
    await expect(
      report(member({ biteId: BITE_ID, reason: 'spam' }, AUTHOR_UID)),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});

describe('listBiteReports', () => {
  it('refuses a caller without the admin role', async () => {
    await expect(list(operator({}, []))).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('aggregates the open reports per Bite with the Bite and its author', async () => {
    seedReport(BITE_ID, 'a', { reason: 'spam' });
    seedReport(BITE_ID, 'b', {
      reason: 'notFood',
      createdAt: '2026-10-02T10:00:00.000Z',
    });
    seedReport(BITE_ID, 'c', { status: 'dismissed' });

    const { bites, truncated } = await list(operator({}));

    expect(truncated).toBe(false);
    expect(bites).toEqual([
      expect.objectContaining({
        biteId: BITE_ID,
        exists: true,
        name: 'Ramen',
        place: 'Ichiran',
        imageSrc: 'https://example.test/o/ramen.jpg',
        tags: ['noodles'],
        authorUid: AUTHOR_UID,
        authorDisplayName: 'Author',
        reportCount: 2,
        reasons: {
          spam: 1,
          notFood: 1,
          inappropriate: 0,
          harassment: 0,
          other: 0,
        },
        firstReportedAt: '2026-10-01T10:00:00.000Z',
        lastReportedAt: '2026-10-02T10:00:00.000Z',
      }),
    ]);
  });

  it('never returns who reported a Bite', async () => {
    seedReport(BITE_ID, REPORTER_UID);

    const result = await list(operator({}));

    expect(JSON.stringify(result)).not.toContain(REPORTER_UID);
  });

  it('puts the most-reported Bite first', async () => {
    db.seed('bites/bite-2', { userId: AUTHOR_UID, name: 'Pizza' });
    seedReport(BITE_ID, 'a');
    seedReport('bite-2', 'a');
    seedReport('bite-2', 'b');

    const { bites } = await list(operator({}));

    expect(bites.map((bite) => bite.biteId)).toEqual(['bite-2', BITE_ID]);
  });

  it('still lists a report whose Bite is gone, so it can be closed', async () => {
    seedReport('gone', 'a');

    const { bites } = await list(operator({}));

    expect(bites).toEqual([
      expect.objectContaining({ biteId: 'gone', exists: false }),
    ]);
  });

  it('is empty when nothing is open', async () => {
    await expect(list(operator({}))).resolves.toEqual({
      bites: [],
      truncated: false,
    });
  });
});

describe('dismissBiteReports', () => {
  it('refuses a caller without the admin role', async () => {
    await expect(
      dismiss(operator({ biteId: BITE_ID, reason: 'Fine' }, ['business'])),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('requires a reason', async () => {
    seedReport(BITE_ID, 'a');

    await expect(
      dismiss(operator({ biteId: BITE_ID, reason: '  ' })),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('closes every open report on the Bite and keeps the Bite', async () => {
    seedReport(BITE_ID, 'a');
    seedReport(BITE_ID, 'b');
    seedReport('bite-2', 'a');

    await expect(
      dismiss(operator({ biteId: BITE_ID, reason: 'It is food.' })),
    ).resolves.toEqual({ biteId: BITE_ID, dismissedReports: 2 });

    expect(db.read(`biteReports/${BITE_ID}_a`)).toMatchObject({
      status: 'dismissed',
      dismissedAt: expect.any(String),
    });
    expect(db.read(`biteReports/${BITE_ID}_b`)).toMatchObject({
      status: 'dismissed',
    });
    expect(db.read('biteReports/bite-2_a')).toMatchObject({ status: 'open' });
    expect(db.exists(`bites/${BITE_ID}`)).toBe(true);
  });

  it('logs the dismissal as an operator action', async () => {
    seedReport(BITE_ID, 'a');

    await dismiss(operator({ biteId: BITE_ID, reason: 'It is food.' }));

    expect(logger.info).toHaveBeenCalledWith(
      'operator action: dismissBiteReports succeeded',
      expect.objectContaining({
        operatorAction: 'dismissBiteReports',
        targetType: 'bite',
        targetId: BITE_ID,
        reason: 'It is food.',
        callerUid: ADMIN_UID,
      }),
    );
  });

  it('refuses a Bite with no open reports', async () => {
    seedReport(BITE_ID, 'a', { status: 'dismissed' });

    await expect(
      dismiss(operator({ biteId: BITE_ID, reason: 'Fine' })),
    ).rejects.toMatchObject({ code: 'not-found' });
  });
});

describe('deleteBiteReportsForBite', () => {
  it('removes every report on the Bite, open or dismissed, and no other', async () => {
    seedReport(BITE_ID, 'a');
    seedReport(BITE_ID, 'b', { status: 'dismissed' });
    seedReport('bite-2', 'a');

    await expect(
      deleteBiteReportsForBite(
        db as unknown as Parameters<typeof deleteBiteReportsForBite>[0],
        BITE_ID,
      ),
    ).resolves.toBe(2);

    expect(db.exists(`biteReports/${BITE_ID}_a`)).toBe(false);
    expect(db.exists(`biteReports/${BITE_ID}_b`)).toBe(false);
    expect(db.exists('biteReports/bite-2_a')).toBe(true);
  });
});
