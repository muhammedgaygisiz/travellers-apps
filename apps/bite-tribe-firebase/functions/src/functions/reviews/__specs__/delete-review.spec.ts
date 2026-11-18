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

import { CallableRequest } from 'firebase-functions/https';
import {
  deleteReviewHandler,
  DeleteReviewRequest,
  removeReviewsByAuthor,
} from '../delete-review';

const AUTHOR = 'author-uid';
const OTHER = 'other-uid';

const as = (
  uid: string,
  data: DeleteReviewRequest,
): CallableRequest<DeleteReviewRequest> =>
  ({
    auth: { uid, token: { firebase: { sign_in_provider: 'password' } } },
    data,
  }) as unknown as CallableRequest<DeleteReviewRequest>;

const root = (id: string, authorId: string): void =>
  db.seed(`reviews/${id}`, {
    review: `text of ${id}`,
    author: `name of ${authorId}`,
    authorId,
    biteId: '/bites/bite-1',
    createdAt: '2026-11-01T10:00:00.000Z',
    createdAtTimestamp: 1,
    updatedAt: '2026-11-02T10:00:00.000Z',
    updatedAtTimestamp: 2,
  });

const reply = (
  id: string,
  authorId: string,
  parentReviewId: string,
  threadId: string,
): void =>
  db.seed(`reviews/${id}`, {
    review: `text of ${id}`,
    author: `name of ${authorId}`,
    authorId,
    biteId: '/bites/bite-1',
    parentReviewId,
    threadId,
    createdAt: '2026-11-03T10:00:00.000Z',
    createdAtTimestamp: 3,
  });

const tombstone = (id: string, parentReviewId?: string): void =>
  db.seed(`reviews/${id}`, {
    biteId: '/bites/bite-1',
    ...(parentReviewId ? { parentReviewId, threadId: 'root' } : {}),
    createdAt: '2026-11-01T10:00:00.000Z',
    createdAtTimestamp: 1,
    deletedAt: '2026-11-04T10:00:00.000Z',
    deletedAtTimestamp: 4,
  });

describe('deleteReview', () => {
  beforeEach(() => {
    db = createFakeFirestore();
  });

  it('deletes a review nobody answered', async () => {
    root('root', AUTHOR);

    await expect(
      deleteReviewHandler(as(AUTHOR, { reviewId: 'root' })),
    ).resolves.toEqual({ status: 'deleted' });
    expect(db.exists('reviews/root')).toBe(false);
  });

  it('turns an answered review into a tombstone and keeps the replies under it', async () => {
    root('root', AUTHOR);
    reply('reply-1', OTHER, 'root', 'root');

    await expect(
      deleteReviewHandler(as(AUTHOR, { reviewId: 'root' })),
    ).resolves.toEqual({ status: 'tombstoned' });

    expect(db.read('reviews/root')).toEqual({
      biteId: '/bites/bite-1',
      createdAt: '2026-11-01T10:00:00.000Z',
      createdAtTimestamp: 1,
      deletedAt: expect.any(String),
      deletedAtTimestamp: expect.any(Number),
    });
    expect(db.read('reviews/reply-1')).toEqual(
      expect.objectContaining({ review: 'text of reply-1', authorId: OTHER }),
    );
  });

  it('turns an answered reply into a tombstone that keeps its place in the thread', async () => {
    root('root', OTHER);
    reply('reply-1', AUTHOR, 'root', 'root');
    reply('reply-2', OTHER, 'reply-1', 'root');

    await deleteReviewHandler(as(AUTHOR, { reviewId: 'reply-1' }));

    expect(db.read('reviews/reply-1')).toEqual({
      biteId: '/bites/bite-1',
      parentReviewId: 'root',
      threadId: 'root',
      createdAt: '2026-11-03T10:00:00.000Z',
      createdAtTimestamp: 3,
      deletedAt: expect.any(String),
      deletedAtTimestamp: expect.any(Number),
    });
  });

  it('removes a tombstone together with the last reply it held up', async () => {
    tombstone('root');
    reply('reply-1', AUTHOR, 'root', 'root');

    await deleteReviewHandler(as(AUTHOR, { reviewId: 'reply-1' }));

    expect(db.exists('reviews/reply-1')).toBe(false);
    expect(db.exists('reviews/root')).toBe(false);
  });

  it('walks up the chain of tombstones left holding nothing up', async () => {
    tombstone('root');
    tombstone('reply-1', 'root');
    reply('reply-2', AUTHOR, 'reply-1', 'root');

    await deleteReviewHandler(as(AUTHOR, { reviewId: 'reply-2' }));

    expect(db.exists('reviews/reply-2')).toBe(false);
    expect(db.exists('reviews/reply-1')).toBe(false);
    expect(db.exists('reviews/root')).toBe(false);
  });

  it('keeps a tombstone that still holds up another reply', async () => {
    tombstone('root');
    reply('reply-1', AUTHOR, 'root', 'root');
    reply('reply-2', OTHER, 'root', 'root');

    await deleteReviewHandler(as(AUTHOR, { reviewId: 'reply-1' }));

    expect(db.exists('reviews/reply-1')).toBe(false);
    expect(db.exists('reviews/root')).toBe(true);
  });

  it("keeps a review's parent that is not a tombstone", async () => {
    root('root', OTHER);
    reply('reply-1', AUTHOR, 'root', 'root');

    await deleteReviewHandler(as(AUTHOR, { reviewId: 'reply-1' }));

    expect(db.exists('reviews/root')).toBe(true);
  });

  it("refuses to delete somebody else's review", async () => {
    root('root', OTHER);

    await expect(
      deleteReviewHandler(as(AUTHOR, { reviewId: 'root' })),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(db.exists('reviews/root')).toBe(true);
  });

  it('refuses to delete a tombstone, which belongs to nobody', async () => {
    tombstone('root');
    reply('reply-1', OTHER, 'root', 'root');

    await expect(
      deleteReviewHandler(as(AUTHOR, { reviewId: 'root' })),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('rejects a review that does not exist', async () => {
    await expect(
      deleteReviewHandler(as(AUTHOR, { reviewId: 'missing' })),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('rejects a missing or malformed review id', async () => {
    await expect(
      deleteReviewHandler(as(AUTHOR, { reviewId: 'reviews/root' })),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(deleteReviewHandler(as(AUTHOR, {}))).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('rejects a signed-out caller', async () => {
    root('root', AUTHOR);

    await expect(
      deleteReviewHandler({
        data: { reviewId: 'root' },
      } as unknown as CallableRequest<DeleteReviewRequest>),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(db.exists('reviews/root')).toBe(true);
  });
});

describe('removeReviewsByAuthor', () => {
  beforeEach(() => {
    db = createFakeFirestore();
  });

  it('deletes the reviews nobody else answered and tombstones the rest', async () => {
    root('alone', AUTHOR);
    root('answered', AUTHOR);
    reply('their-reply', OTHER, 'answered', 'answered');

    await expect(removeReviewsByAuthor(db as never, AUTHOR)).resolves.toBe(2);

    expect(db.exists('reviews/alone')).toBe(false);
    expect(db.read('reviews/answered')).toEqual(
      expect.objectContaining({ deletedAt: expect.any(String) }),
    );
    expect(db.read('reviews/answered')?.['authorId']).toBeUndefined();
    expect(db.read('reviews/answered')?.['author']).toBeUndefined();
    expect(db.exists('reviews/their-reply')).toBe(true);
  });

  it('deletes a thread the account answered only itself', async () => {
    root('root', AUTHOR);
    reply('own-reply', AUTHOR, 'root', 'root');

    await removeReviewsByAuthor(db as never, AUTHOR);

    expect(db.exists('reviews/root')).toBe(false);
    expect(db.exists('reviews/own-reply')).toBe(false);
  });

  it('tombstones its own reply when somebody else answered that reply', async () => {
    root('root', AUTHOR);
    reply('own-reply', AUTHOR, 'root', 'root');
    reply('their-reply', OTHER, 'own-reply', 'root');

    await removeReviewsByAuthor(db as never, AUTHOR);

    expect(db.read('reviews/root')?.['deletedAt']).toBeDefined();
    expect(db.read('reviews/own-reply')?.['deletedAt']).toBeDefined();
    expect(db.exists('reviews/their-reply')).toBe(true);
  });

  it('removes a tombstone left holding nothing up', async () => {
    tombstone('root');
    reply('own-reply', AUTHOR, 'root', 'root');

    await removeReviewsByAuthor(db as never, AUTHOR);

    expect(db.exists('reviews/own-reply')).toBe(false);
    expect(db.exists('reviews/root')).toBe(false);
  });

  it("leaves other accounts' reviews alone", async () => {
    root('theirs', OTHER);

    await expect(removeReviewsByAuthor(db as never, AUTHOR)).resolves.toBe(0);
    expect(db.exists('reviews/theirs')).toBe(true);
  });
});
