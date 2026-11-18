import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
  FieldValue: { delete: jest.fn() },
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
import { reportReviewHandler } from '../report-review';
import { deleteReviewReportsForReview } from '../review-report';
import {
  dismissReviewReportsHandler,
  listReviewReportsHandler,
} from '../review-reports-as-operator';

const ADMIN_UID = 'admin-uid';
const AUTHOR_UID = 'author-uid';
const REPLIER_UID = 'replier-uid';
const REPORTER_UID = 'reporter-uid';
const BITE_ID = 'bite-1';
const REVIEW_ID = 'review-1';
const REPLY_ID = 'reply-1';

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

const report = (request: TestRequest): ReturnType<typeof reportReviewHandler> =>
  reportReviewHandler(request as Parameters<typeof reportReviewHandler>[0]);

const list = (
  request: TestRequest,
): ReturnType<typeof listReviewReportsHandler> =>
  listReviewReportsHandler(
    request as Parameters<typeof listReviewReportsHandler>[0],
  );

const dismiss = (
  request: TestRequest,
): ReturnType<typeof dismissReviewReportsHandler> =>
  dismissReviewReportsHandler(
    request as Parameters<typeof dismissReviewReportsHandler>[0],
  );

const seedReport = (
  reviewId: string,
  reporterUid: string,
  over: Record<string, unknown> = {},
): void =>
  db.seed(`reviewReports/${reviewId}_${reporterUid}`, {
    reviewId,
    biteId: BITE_ID,
    threadId: REVIEW_ID,
    reviewAuthorId: REPLIER_UID,
    reporterUid,
    reason: 'harassment',
    status: 'open',
    createdAt: '2026-11-01T10:00:00.000Z',
    createdAtTimestamp: 0,
    ...over,
  });

beforeEach(() => {
  db = createFakeFirestore();
  jest.mocked(logger.info).mockClear();
  db.seed(`bites/${BITE_ID}`, { userId: 'bite-owner', name: 'Ramen' });
  db.seed(`reviews/${REVIEW_ID}`, {
    review: 'Great broth.',
    biteId: `/bites/${BITE_ID}`,
    authorId: AUTHOR_UID,
    author: 'Author copy',
  });
  db.seed(`reviews/${REPLY_ID}`, {
    review: 'Nobody asked you.',
    biteId: `/bites/${BITE_ID}`,
    parentReviewId: REVIEW_ID,
    threadId: REVIEW_ID,
    authorId: REPLIER_UID,
    author: 'Replier copy',
  });
  db.seed(`users/${AUTHOR_UID}`, { displayName: 'Author' });
  db.seed(`users/${REPLIER_UID}`, { displayName: 'Replier' });
});

describe('reportReview', () => {
  it('records the reply, its Bite and thread, the authors and the reason', async () => {
    await expect(
      report(member({ reviewId: REPLY_ID, reason: 'hate' })),
    ).resolves.toEqual({ reported: true });

    expect(db.read(`reviewReports/${REPLY_ID}_${REPORTER_UID}`)).toEqual({
      reviewId: REPLY_ID,
      biteId: BITE_ID,
      threadId: REVIEW_ID,
      reviewAuthorId: REPLIER_UID,
      reporterUid: REPORTER_UID,
      reason: 'hate',
      status: 'open',
      createdAt: expect.any(String),
      createdAtTimestamp: expect.any(Number),
    });
  });

  it('uses the review itself as the thread of a top-level review', async () => {
    await report(member({ reviewId: REVIEW_ID, reason: 'spam' }));

    expect(db.read(`reviewReports/${REVIEW_ID}_${REPORTER_UID}`)).toMatchObject(
      { threadId: REVIEW_ID, reviewAuthorId: AUTHOR_UID },
    );
  });

  it('does not create a second report from the same account', async () => {
    await report(member({ reviewId: REPLY_ID, reason: 'spam' }));

    await expect(
      report(member({ reviewId: REPLY_ID, reason: 'harassment' })),
    ).resolves.toEqual({ reported: false });

    expect(db.read(`reviewReports/${REPLY_ID}_${REPORTER_UID}`)).toMatchObject({
      reason: 'spam',
    });
  });

  it('does not reopen a report an operator dismissed', async () => {
    seedReport(REPLY_ID, REPORTER_UID, { status: 'dismissed' });

    await expect(
      report(member({ reviewId: REPLY_ID, reason: 'spam' })),
    ).resolves.toEqual({ reported: false });

    expect(db.read(`reviewReports/${REPLY_ID}_${REPORTER_UID}`)).toMatchObject({
      status: 'dismissed',
    });
  });

  it('writes nothing the author can read and logs no reporter', async () => {
    const before = db.read(`reviews/${REPLY_ID}`);

    await report(member({ reviewId: REPLY_ID, reason: 'spam' }));

    expect(db.read(`reviews/${REPLY_ID}`)).toEqual(before);
    expect(JSON.stringify(jest.mocked(logger.info).mock.calls)).not.toContain(
      REPORTER_UID,
    );
  });

  it('refuses a signed-out caller', async () => {
    await expect(
      report({ data: { reviewId: REPLY_ID, reason: 'spam' } }),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('refuses a table guest', async () => {
    await expect(
      report({
        auth: {
          uid: 'guest',
          token: { firebase: { sign_in_provider: 'anonymous' } },
        },
        data: { reviewId: REPLY_ID, reason: 'spam' },
      }),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('refuses a reason outside the list, the Bite-only one included', async () => {
    await expect(
      report(member({ reviewId: REPLY_ID, reason: 'notFood' })),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('refuses a review that does not exist', async () => {
    await expect(
      report(member({ reviewId: 'missing', reason: 'spam' })),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('refuses a path in place of a review id', async () => {
    await expect(
      report(member({ reviewId: 'reviews/reply-1', reason: 'spam' })),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('refuses the author reporting their own reply', async () => {
    await expect(
      report(member({ reviewId: REPLY_ID, reason: 'spam' }, REPLIER_UID)),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('refuses a tombstone', async () => {
    db.seed(`reviews/${REVIEW_ID}`, {
      biteId: `/bites/${BITE_ID}`,
      deletedAt: '2026-11-02T10:00:00.000Z',
    });

    await expect(
      report(member({ reviewId: REVIEW_ID, reason: 'spam' })),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(db.exists(`reviewReports/${REVIEW_ID}_${REPORTER_UID}`)).toBe(false);
  });
});

describe('listReviewReports', () => {
  it('refuses a caller without the admin role', async () => {
    await expect(list(operator({}, []))).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('aggregates the open reports per reply with its Bite and its parent', async () => {
    seedReport(REPLY_ID, 'a', { reason: 'harassment' });
    seedReport(REPLY_ID, 'b', {
      reason: 'hate',
      createdAt: '2026-11-02T10:00:00.000Z',
    });
    seedReport(REPLY_ID, 'c', { status: 'dismissed' });

    const { reviews, truncated } = await list(operator({}));

    expect(truncated).toBe(false);
    expect(reviews).toEqual([
      {
        reviewId: REPLY_ID,
        exists: true,
        text: 'Nobody asked you.',
        authorUid: REPLIER_UID,
        authorDisplayName: 'Replier',
        biteId: BITE_ID,
        biteName: 'Ramen',
        parent: {
          reviewId: REVIEW_ID,
          text: 'Great broth.',
          authorDisplayName: 'Author',
        },
        reportCount: 2,
        reasons: {
          harassment: 1,
          hate: 1,
          spam: 0,
          inappropriate: 0,
          other: 0,
        },
        firstReportedAt: '2026-11-01T10:00:00.000Z',
        lastReportedAt: '2026-11-02T10:00:00.000Z',
      },
    ]);
  });

  it('gives a top-level review no parent', async () => {
    seedReport(REVIEW_ID, 'a', { reviewAuthorId: AUTHOR_UID });

    const { reviews } = await list(operator({}));

    expect(reviews[0]).not.toHaveProperty('parent');
    expect(reviews[0]).toMatchObject({ authorDisplayName: 'Author' });
  });

  it('never returns who reported a review', async () => {
    seedReport(REPLY_ID, REPORTER_UID);

    const result = await list(operator({}));

    expect(JSON.stringify(result)).not.toContain(REPORTER_UID);
  });

  it('puts the most recently reported review first', async () => {
    seedReport(REVIEW_ID, 'a', { createdAt: '2026-11-05T10:00:00.000Z' });
    seedReport(REPLY_ID, 'a', { createdAt: '2026-11-01T10:00:00.000Z' });
    seedReport(REPLY_ID, 'b', { createdAt: '2026-11-03T10:00:00.000Z' });

    const { reviews } = await list(operator({}));

    expect(reviews.map((review) => review.reviewId)).toEqual([
      REVIEW_ID,
      REPLY_ID,
    ]);
  });

  it('lists a withdrawn or deleted review without its text, so it can be closed', async () => {
    db.seed(`reviews/${REVIEW_ID}`, {
      biteId: `/bites/${BITE_ID}`,
      deletedAt: '2026-11-02T10:00:00.000Z',
    });
    seedReport(REVIEW_ID, 'a');
    seedReport('gone', 'a');

    const { reviews } = await list(operator({}));

    expect(reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reviewId: REVIEW_ID,
          exists: false,
          text: '',
          authorUid: '',
        }),
        expect.objectContaining({
          reviewId: 'gone',
          exists: false,
          biteName: 'Ramen',
        }),
      ]),
    );
  });

  it('is empty when nothing is open', async () => {
    await expect(list(operator({}))).resolves.toEqual({
      reviews: [],
      truncated: false,
    });
  });
});

describe('dismissReviewReports', () => {
  it('refuses a caller without the admin role', async () => {
    await expect(
      dismiss(operator({ reviewId: REPLY_ID, reason: 'Fine' }, ['business'])),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('requires a reason', async () => {
    seedReport(REPLY_ID, 'a');

    await expect(
      dismiss(operator({ reviewId: REPLY_ID, reason: '  ' })),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('closes every open report on the review and keeps the review', async () => {
    seedReport(REPLY_ID, 'a');
    seedReport(REPLY_ID, 'b');
    seedReport(REVIEW_ID, 'a');

    await expect(
      dismiss(operator({ reviewId: REPLY_ID, reason: 'Banter.' })),
    ).resolves.toEqual({ reviewId: REPLY_ID, dismissedReports: 2 });

    expect(db.read(`reviewReports/${REPLY_ID}_a`)).toMatchObject({
      status: 'dismissed',
      dismissedAt: expect.any(String),
    });
    expect(db.read(`reviewReports/${REPLY_ID}_b`)).toMatchObject({
      status: 'dismissed',
    });
    expect(db.read(`reviewReports/${REVIEW_ID}_a`)).toMatchObject({
      status: 'open',
    });
    expect(db.exists(`reviews/${REPLY_ID}`)).toBe(true);
  });

  it('logs the dismissal as an operator action', async () => {
    seedReport(REPLY_ID, 'a');

    await dismiss(operator({ reviewId: REPLY_ID, reason: 'Banter.' }));

    expect(logger.info).toHaveBeenCalledWith(
      'operator action: dismissReviewReports succeeded',
      expect.objectContaining({
        operatorAction: 'dismissReviewReports',
        targetType: 'review',
        targetId: REPLY_ID,
        reason: 'Banter.',
        callerUid: ADMIN_UID,
      }),
    );
  });

  it('refuses a review with no open reports', async () => {
    seedReport(REPLY_ID, 'a', { status: 'dismissed' });

    await expect(
      dismiss(operator({ reviewId: REPLY_ID, reason: 'Fine' })),
    ).rejects.toMatchObject({ code: 'not-found' });
  });
});

describe('deleteReviewReportsForReview', () => {
  it('removes every report on the review, open or dismissed, and no other', async () => {
    seedReport(REPLY_ID, 'a');
    seedReport(REPLY_ID, 'b', { status: 'dismissed' });
    seedReport(REVIEW_ID, 'a');

    await expect(
      deleteReviewReportsForReview(
        db as unknown as Parameters<typeof deleteReviewReportsForReview>[0],
        REPLY_ID,
      ),
    ).resolves.toBe(2);

    expect(db.exists(`reviewReports/${REPLY_ID}_a`)).toBe(false);
    expect(db.exists(`reviewReports/${REPLY_ID}_b`)).toBe(false);
    expect(db.exists(`reviewReports/${REVIEW_ID}_a`)).toBe(true);
  });
});
