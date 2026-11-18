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
  HttpsError: class extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
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

import { CallableRequest } from 'firebase-functions/https';
import { recordContentRefusal } from '../../shared/moderation/content-refusal';
import {
  editReviewHandler,
  EditReviewRequest,
  MAX_REVIEW_LENGTH,
  saveReviewHandler,
  SaveReviewRequest,
} from '../save-review';

const AUTHOR = 'author-uid';
const OTHER = 'other-uid';
const REFUSED = 'what a cunt';

const as = <T>(uid: string, data: T): CallableRequest<T> =>
  ({
    auth: { uid, token: { firebase: { sign_in_provider: 'password' } } },
    data,
  }) as unknown as CallableRequest<T>;

/** Every review written by the test, leaving out the seeded `root-1`. */
const reviews = async (): Promise<Record<string, unknown>[]> =>
  (await db.collection('reviews').get()).docs
    .filter((doc) => doc.id !== 'root-1')
    .map((doc) => doc.data());

describe('saveReview', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    db.seed('bites/bite-1', { name: 'Ramen', userId: OTHER });
    db.seed(`users/${AUTHOR}`, { displayName: 'Ana' });
    db.seed('reviews/root-1', {
      review: 'Root',
      authorId: OTHER,
      biteId: '/bites/bite-1',
    });
    (recordContentRefusal as jest.Mock).mockClear();
  });

  it('writes a review under the profile name and answers with its id', async () => {
    const result = await saveReviewHandler(
      as<SaveReviewRequest>(AUTHOR, { biteId: 'bite-1', review: 'Lovely' }),
    );

    expect(result).toEqual({ status: 'saved', reviewId: expect.any(String) });
    expect(await reviews()).toEqual([
      expect.objectContaining({
        review: 'Lovely',
        biteId: '/bites/bite-1',
        authorId: AUTHOR,
        author: 'Ana',
        createdAtTimestamp: expect.any(Number),
      }),
    ]);
  });

  it('writes a reply with its parent and thread', async () => {
    await saveReviewHandler(
      as<SaveReviewRequest>(AUTHOR, {
        biteId: 'bite-1',
        review: 'Agreed',
        parentReviewId: 'root-1',
        threadId: 'root-1',
      }),
    );

    expect(await reviews()).toEqual([
      expect.objectContaining({ parentReviewId: 'root-1', threadId: 'root-1' }),
    ]);
  });

  it('rejects a reply to a review that does not exist', async () => {
    await expect(
      saveReviewHandler(
        as<SaveReviewRequest>(AUTHOR, {
          biteId: 'bite-1',
          review: 'Agreed',
          parentReviewId: 'missing',
          threadId: 'missing',
        }),
      ),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  // Issue #2116: a tombstone holds up the replies under it and takes no more.
  it('rejects a reply to a deleted review', async () => {
    db.seed('reviews/root-1', {
      biteId: '/bites/bite-1',
      deletedAt: '2026-11-04T10:00:00.000Z',
      deletedAtTimestamp: 4,
    });

    await expect(
      saveReviewHandler(
        as<SaveReviewRequest>(AUTHOR, {
          biteId: 'bite-1',
          review: 'Agreed',
          parentReviewId: 'root-1',
          threadId: 'root-1',
        }),
      ),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(await reviews()).toEqual([]);
  });

  it('refuses objectionable text, writes nothing and records the attempt', async () => {
    await expect(
      saveReviewHandler(
        as<SaveReviewRequest>(AUTHOR, { biteId: 'bite-1', review: REFUSED }),
      ),
    ).resolves.toEqual({ status: 'refused' });

    expect(await reviews()).toEqual([]);
    expect(recordContentRefusal).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: AUTHOR,
        surface: 'review',
        stage: 'callable',
        targetId: 'bite-1',
        text: REFUSED,
      }),
    );
  });

  it('records a refused reply as a reply', async () => {
    await saveReviewHandler(
      as<SaveReviewRequest>(AUTHOR, {
        biteId: 'bite-1',
        review: REFUSED,
        parentReviewId: 'root-1',
        threadId: 'root-1',
      }),
    );

    expect(recordContentRefusal).toHaveBeenCalledWith(
      expect.objectContaining({ surface: 'reviewReply' }),
    );
  });

  it.each([
    ['blank text', { biteId: 'bite-1', review: '   ' }],
    [
      'text over the limit',
      { biteId: 'bite-1', review: 'a'.repeat(MAX_REVIEW_LENGTH + 1) },
    ],
    ['no Bite', { review: 'Lovely' }],
    [
      'a reply without a thread',
      { biteId: 'bite-1', review: 'Hi', parentReviewId: 'root-1' },
    ],
  ])('rejects %s', async (_, data) => {
    await expect(
      saveReviewHandler(as<SaveReviewRequest>(AUTHOR, data)),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('rejects a review of a Bite that does not exist', async () => {
    await expect(
      saveReviewHandler(
        as<SaveReviewRequest>(AUTHOR, { biteId: 'missing', review: 'Hi' }),
      ),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('rejects a signed-out caller', async () => {
    await expect(
      saveReviewHandler({
        data: { biteId: 'bite-1', review: 'Hi' },
      } as CallableRequest<SaveReviewRequest>),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });
});

describe('editReview', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    db.seed('reviews/review-1', {
      review: 'Good',
      authorId: AUTHOR,
      biteId: '/bites/bite-1',
      createdAtTimestamp: 1,
    });
    (recordContentRefusal as jest.Mock).mockClear();
  });

  it('replaces the text and marks the review edited, and nothing else', async () => {
    await expect(
      editReviewHandler(
        as<EditReviewRequest>(AUTHOR, {
          reviewId: 'review-1',
          review: 'Great',
        }),
      ),
    ).resolves.toEqual({ status: 'saved', reviewId: 'review-1' });

    expect(db.read('reviews/review-1')).toEqual({
      review: 'Great',
      authorId: AUTHOR,
      biteId: '/bites/bite-1',
      createdAtTimestamp: 1,
      updatedAt: expect.any(String),
      updatedAtTimestamp: expect.any(Number),
    });
  });

  it('refuses objectionable text and leaves the review as it was', async () => {
    await expect(
      editReviewHandler(
        as<EditReviewRequest>(AUTHOR, {
          reviewId: 'review-1',
          review: REFUSED,
        }),
      ),
    ).resolves.toEqual({ status: 'refused' });

    expect(db.read('reviews/review-1')?.['review']).toBe('Good');
    expect(recordContentRefusal).toHaveBeenCalledWith(
      expect.objectContaining({ surface: 'review', targetId: 'review-1' }),
    );
  });

  it("rejects an edit of somebody else's review", async () => {
    await expect(
      editReviewHandler(
        as<EditReviewRequest>(OTHER, { reviewId: 'review-1', review: 'Mine' }),
      ),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(db.read('reviews/review-1')?.['review']).toBe('Good');
  });

  it('rejects an edit of a deleted review, which belongs to nobody', async () => {
    db.seed('reviews/review-1', {
      biteId: '/bites/bite-1',
      deletedAt: '2026-11-04T10:00:00.000Z',
      deletedAtTimestamp: 4,
    });

    await expect(
      editReviewHandler(
        as<EditReviewRequest>(AUTHOR, { reviewId: 'review-1', review: 'Back' }),
      ),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(db.read('reviews/review-1')?.['review']).toBeUndefined();
  });

  it('rejects an edit of a review that does not exist', async () => {
    await expect(
      editReviewHandler(
        as<EditReviewRequest>(AUTHOR, { reviewId: 'missing', review: 'Hi' }),
      ),
    ).rejects.toMatchObject({ code: 'not-found' });
  });
});
