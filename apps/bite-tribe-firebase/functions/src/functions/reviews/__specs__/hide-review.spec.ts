import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import {
  createFakeFirestore,
  DELETE_SENTINEL,
} from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
  FieldValue: { delete: (): unknown => DELETE_SENTINEL },
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

jest.mock('firebase-functions/firestore', () => ({
  onDocumentDeleted: jest.fn((_document: unknown, handler: unknown) => handler),
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn(
    (options: unknown, handler?: unknown) => handler ?? options,
  ),
}));

// The wordlist alone: no model outside production.
jest.mock('../../shared/utils/deployment-stage', () => ({
  resolveDeploymentStage: (): string => 'dev',
}));

jest.mock('../../shared/moderation/content-refusal', () => ({
  recordContentRefusal: jest.fn(),
}));

import { logger } from 'firebase-functions';
import { deleteReviewHandler } from '../delete-review';
import { deleteHiddenReviewOnReviewDelete } from '../delete-hidden-review-on-review-delete';
import { deleteHiddenReviewsForAccount } from '../hidden-review';
import { reportReviewHandler } from '../report-review';
import {
  hideReviewAsOperatorHandler,
  listReviewReportsHandler,
} from '../review-reports-as-operator';
import { editReviewHandler, saveReviewHandler } from '../save-review';

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

type Handler<T> = (request: never) => Promise<T>;

const call = <T>(handler: Handler<T>, request: TestRequest): Promise<T> =>
  handler(request as never);

const hide = (
  reviewId: string,
  reason: unknown = 'Harassment, ticket 12',
): ReturnType<typeof hideReviewAsOperatorHandler> =>
  call(hideReviewAsOperatorHandler, operator({ reviewId, reason }));

const seedReport = (
  reviewId: string,
  reporterUid: string,
  status = 'open',
): void =>
  db.seed(`reviewReports/${reviewId}_${reporterUid}`, {
    reviewId,
    biteId: BITE_ID,
    threadId: REVIEW_ID,
    reviewAuthorId: REPLIER_UID,
    reporterUid,
    reason: 'harassment',
    status,
    createdAt: '2026-11-01T10:00:00.000Z',
    createdAtTimestamp: 0,
  });

beforeEach(() => {
  db = createFakeFirestore();
  jest.mocked(logger.info).mockClear();
  db.seed(`bites/${BITE_ID}`, { userId: 'bite-owner', name: 'Ramen' });
  db.seed(`users/${AUTHOR_UID}`, { displayName: 'Author' });
  db.seed(`users/${REPLIER_UID}`, { displayName: 'Replier' });
  db.seed(`reviews/${REVIEW_ID}`, {
    review: 'Great broth.',
    biteId: `/bites/${BITE_ID}`,
    authorId: AUTHOR_UID,
    author: 'Author',
    createdAt: '2026-11-01T09:00:00.000Z',
    createdAtTimestamp: 1,
  });
  db.seed(`reviews/${REPLY_ID}`, {
    review: 'Nobody asked you.',
    biteId: `/bites/${BITE_ID}`,
    parentReviewId: REVIEW_ID,
    threadId: REVIEW_ID,
    authorId: REPLIER_UID,
    author: 'Replier',
    createdAt: '2026-11-01T09:30:00.000Z',
    createdAtTimestamp: 2,
    updatedAt: '2026-11-01T09:40:00.000Z',
    updatedAtTimestamp: 3,
  });
});

describe('hideReviewAsOperator', () => {
  it('moves the text and name to the hidden store and keeps the place', async () => {
    seedReport(REPLY_ID, REPORTER_UID);

    await expect(hide(REPLY_ID)).resolves.toEqual({
      reviewId: REPLY_ID,
      dismissedReports: 1,
    });

    expect(db.read(`reviews/${REPLY_ID}`)).toEqual({
      biteId: `/bites/${BITE_ID}`,
      parentReviewId: REVIEW_ID,
      threadId: REVIEW_ID,
      authorId: REPLIER_UID,
      createdAt: '2026-11-01T09:30:00.000Z',
      createdAtTimestamp: 2,
      hiddenAt: expect.any(String),
      hiddenAtTimestamp: expect.any(Number),
    });
    expect(db.read(`hiddenReviews/${REPLY_ID}`)).toEqual({
      reviewId: REPLY_ID,
      review: 'Nobody asked you.',
      author: 'Replier',
      authorId: REPLIER_UID,
      biteId: `/bites/${BITE_ID}`,
      threadId: REVIEW_ID,
      parentReviewId: REVIEW_ID,
      createdAt: '2026-11-01T09:30:00.000Z',
      updatedAt: '2026-11-01T09:40:00.000Z',
      hiddenBy: ADMIN_UID,
      reason: 'Harassment, ticket 12',
      hiddenAt: expect.any(String),
      hiddenAtTimestamp: expect.any(Number),
    });
  });

  it('dismisses the open reports and leaves dismissed ones alone', async () => {
    seedReport(REPLY_ID, REPORTER_UID);
    seedReport(REPLY_ID, 'earlier-reporter', 'dismissed');

    await hide(REPLY_ID);

    expect(db.read(`reviewReports/${REPLY_ID}_${REPORTER_UID}`)).toMatchObject({
      status: 'dismissed',
      dismissedAt: expect.any(String),
    });
    expect(
      db.read(`reviewReports/${REPLY_ID}_earlier-reporter`),
    ).not.toHaveProperty('dismissedAt');
  });

  it('records the action and its reason in the operator log', async () => {
    await hide(REVIEW_ID);

    expect(JSON.stringify(jest.mocked(logger.info).mock.calls)).toContain(
      'hideReviewAsOperator',
    );
    expect(JSON.stringify(jest.mocked(logger.info).mock.calls)).toContain(
      'Harassment, ticket 12',
    );
  });

  it('leaves the replies under a hidden root attached', async () => {
    await hide(REVIEW_ID);

    expect(db.read(`reviews/${REPLY_ID}`)).toMatchObject({
      review: 'Nobody asked you.',
      parentReviewId: REVIEW_ID,
    });
  });

  it('requires a reason', async () => {
    await expect(hide(REPLY_ID, '  ')).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    expect(db.exists(`hiddenReviews/${REPLY_ID}`)).toBe(false);
  });

  it('refuses a caller who is not an operator', async () => {
    await expect(
      call(
        hideReviewAsOperatorHandler,
        member({ reviewId: REPLY_ID, reason: 'x' }),
      ),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(db.read(`reviews/${REPLY_ID}`)).toHaveProperty('review');
  });

  it('refuses a review that is gone, deleted or already hidden', async () => {
    await expect(hide('missing')).rejects.toMatchObject({ code: 'not-found' });

    db.seed('reviews/tombstone', {
      biteId: `/bites/${BITE_ID}`,
      deletedAt: '2026-11-02T00:00:00.000Z',
    });
    await expect(hide('tombstone')).rejects.toMatchObject({
      code: 'failed-precondition',
    });

    await hide(REPLY_ID);
    await expect(hide(REPLY_ID)).rejects.toMatchObject({
      code: 'failed-precondition',
    });
    // The second attempt did not overwrite the kept text with an empty one.
    expect(db.read(`hiddenReviews/${REPLY_ID}`)).toMatchObject({
      review: 'Nobody asked you.',
    });
  });

  it('takes the item out of the queue as an item with nothing to judge', async () => {
    seedReport(REPLY_ID, REPORTER_UID);
    await hide(REPLY_ID);
    // A report that slipped in before the hide still shows the item as gone.
    seedReport(REPLY_ID, 'late-reporter');

    const { reviews } = await call(listReviewReportsHandler, operator({}));

    expect(reviews).toEqual([
      expect.objectContaining({
        reviewId: REPLY_ID,
        exists: false,
        text: '',
        authorDisplayName: '',
      }),
    ]);
  });
});

describe('writes against a hidden item', () => {
  beforeEach(async () => {
    await hide(REVIEW_ID);
  });

  it('refuses a reply to it', async () => {
    await expect(
      call(
        saveReviewHandler,
        member(
          {
            biteId: BITE_ID,
            review: 'Me too.',
            parentReviewId: REVIEW_ID,
            threadId: REVIEW_ID,
          },
          REPLIER_UID,
        ),
      ),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('refuses an edit by its author', async () => {
    await expect(
      call(
        editReviewHandler,
        member({ reviewId: REVIEW_ID, review: 'Back again.' }, AUTHOR_UID),
      ),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(db.read(`reviews/${REVIEW_ID}`)).not.toHaveProperty('review');
  });

  it('refuses a report on it', async () => {
    await expect(
      call(
        reportReviewHandler,
        member({ reviewId: REVIEW_ID, reason: 'spam' }),
      ),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('lets its author delete it; with replies it becomes a tombstone without its copy', async () => {
    await expect(
      call(deleteReviewHandler, member({ reviewId: REVIEW_ID }, AUTHOR_UID)),
    ).resolves.toEqual({ status: 'tombstoned' });

    const stored = db.read(`reviews/${REVIEW_ID}`);

    expect(stored).toHaveProperty('deletedAt');
    expect(stored).not.toHaveProperty('hiddenAt');
    expect(stored).not.toHaveProperty('authorId');
    expect(db.exists(`hiddenReviews/${REVIEW_ID}`)).toBe(false);
  });

  it('lets its author delete it; without replies the document goes', async () => {
    await hide(REPLY_ID);

    await expect(
      call(deleteReviewHandler, member({ reviewId: REPLY_ID }, REPLIER_UID)),
    ).resolves.toEqual({ status: 'deleted' });
    expect(db.exists(`reviews/${REPLY_ID}`)).toBe(false);
  });
});

describe('cleanup of the hidden copy', () => {
  const runDeleteTrigger = (
    reviewId: string,
    data: Record<string, unknown>,
  ): Promise<void> =>
    (
      deleteHiddenReviewOnReviewDelete as unknown as (event: {
        params: { reviewId: string };
        data: { data: () => Record<string, unknown> };
      }) => Promise<void>
    )({ params: { reviewId }, data: { data: () => data } });

  it('removes the copy when a hidden review document is deleted', async () => {
    await hide(REPLY_ID);
    const deleted = db.read(`reviews/${REPLY_ID}`) ?? {};

    await runDeleteTrigger(REPLY_ID, deleted);

    expect(db.exists(`hiddenReviews/${REPLY_ID}`)).toBe(false);
  });

  it('does nothing for a review that was never hidden', async () => {
    await runDeleteTrigger(REPLY_ID, { review: 'x' });

    expect(jest.mocked(logger.info)).not.toHaveBeenCalledWith(
      expect.stringContaining('deleteHiddenReviewOnReviewDelete'),
      expect.anything(),
    );
  });

  it("removes every copy of an account's items for its deletion", async () => {
    await hide(REVIEW_ID);
    await hide(REPLY_ID);

    await expect(
      deleteHiddenReviewsForAccount(db as never, REPLIER_UID),
    ).resolves.toBe(1);
    expect(db.exists(`hiddenReviews/${REPLY_ID}`)).toBe(false);
    expect(db.exists(`hiddenReviews/${REVIEW_ID}`)).toBe(true);
  });
});
