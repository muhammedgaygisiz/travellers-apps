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
  onAppCheck: jest.fn((handler: unknown) => handler),
}));

import {
  backfillReviewTimestamps,
  backfillReviewTimestampsHandler,
} from '../backfill-review-timestamps';

const JUNE_2025 = '2025-06-09T07:31:01.103Z';

const seedReview = (id: string, review: Record<string, unknown>): void => {
  db.seed(`reviews/${id}`, {
    biteId: '/bites/bite-1',
    author: 'Mira',
    authorId: 'mira',
    review: 'Best kebab in Kreuzberg.',
    ...review,
  });
};

const timestampOf = (id: string): unknown =>
  db.read(`reviews/${id}`)?.['createdAtTimestamp'];

describe('backfillReviewTimestamps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db = createFakeFirestore();
  });

  it('derives the timestamp from the ISO string a legacy review does have', async () => {
    seedReview('legacy-1', { createdAt: JUNE_2025 });

    const result = await backfillReviewTimestamps();

    expect(timestampOf('legacy-1')).toBe(Date.parse(JUNE_2025));
    expect(result).toEqual({
      processed: 1,
      filled: 1,
      skipped: 0,
      unresolvable: 0,
    });
  });

  it('leaves a review that already carries a timestamp exactly where it was', async () => {
    seedReview('current-1', {
      createdAt: JUNE_2025,
      createdAtTimestamp: 1_700_000_000_000,
    });

    const result = await backfillReviewTimestamps();

    expect(timestampOf('current-1')).toBe(1_700_000_000_000);
    expect(result).toMatchObject({ filled: 0, skipped: 1 });
  });

  it('runs again without moving anything', async () => {
    seedReview('legacy-1', { createdAt: JUNE_2025 });

    await backfillReviewTimestamps();
    const secondRun = await backfillReviewTimestamps();

    expect(timestampOf('legacy-1')).toBe(Date.parse(JUNE_2025));
    expect(secondRun).toMatchObject({ filled: 0, skipped: 1 });
  });

  it('replaces a timestamp that is present but unusable', async () => {
    seedReview('broken-1', {
      createdAt: JUNE_2025,
      createdAtTimestamp: 'not a number',
    });

    await backfillReviewTimestamps();

    expect(timestampOf('broken-1')).toBe(Date.parse(JUNE_2025));
  });

  it('invents nothing for a review with no readable createdAt', async () => {
    seedReview('no-date-1', {});
    seedReview('bad-date-1', { createdAt: 'sometime last year' });

    const result = await backfillReviewTimestamps();

    expect(timestampOf('no-date-1')).toBeUndefined();
    expect(timestampOf('bad-date-1')).toBeUndefined();
    expect(result).toMatchObject({ processed: 2, filled: 0, unresolvable: 2 });
  });

  it('keeps filling the rest when one document cannot be resolved', async () => {
    seedReview('legacy-1', { createdAt: JUNE_2025 });
    seedReview('no-date-1', {});
    seedReview('legacy-2', { createdAt: '2025-06-10T07:31:01.103Z' });

    const result = await backfillReviewTimestamps();

    expect(timestampOf('legacy-1')).toBe(Date.parse(JUNE_2025));
    expect(timestampOf('legacy-2')).toBe(
      Date.parse('2025-06-10T07:31:01.103Z'),
    );
    expect(result).toEqual({
      processed: 3,
      filled: 2,
      skipped: 0,
      unresolvable: 1,
    });
  });

  it('touches no other field of the review', async () => {
    seedReview('legacy-1', { createdAt: JUNE_2025 });

    await backfillReviewTimestamps();

    expect(db.read('reviews/legacy-1')).toEqual({
      biteId: '/bites/bite-1',
      author: 'Mira',
      authorId: 'mira',
      review: 'Best kebab in Kreuzberg.',
      createdAt: JUNE_2025,
      createdAtTimestamp: Date.parse(JUNE_2025),
    });
  });

  it('backfills a reply the same way it backfills a root review', async () => {
    seedReview('legacy-reply-1', {
      createdAt: JUNE_2025,
      parentReviewId: 'root-1',
      threadId: 'root-1',
    });

    await backfillReviewTimestamps();

    expect(timestampOf('legacy-reply-1')).toBe(Date.parse(JUNE_2025));
  });

  it('reports an empty collection rather than failing', async () => {
    const result = await backfillReviewTimestamps();

    expect(result).toEqual({
      processed: 0,
      filled: 0,
      skipped: 0,
      unresolvable: 0,
    });
  });

  describe('callable', () => {
    it('refuses a caller who is not signed in', async () => {
      seedReview('legacy-1', { createdAt: JUNE_2025 });

      await expect(
        backfillReviewTimestampsHandler({
          auth: undefined,
        } as unknown as Parameters<typeof backfillReviewTimestampsHandler>[0]),
      ).rejects.toThrow(
        'You must be signed in to run the review timestamp backfill.',
      );
      expect(timestampOf('legacy-1')).toBeUndefined();
    });

    it('runs the backfill for a signed-in caller', async () => {
      seedReview('legacy-1', { createdAt: JUNE_2025 });

      const result = await backfillReviewTimestampsHandler({
        auth: { uid: 'operator-1' },
      } as unknown as Parameters<typeof backfillReviewTimestampsHandler>[0]);

      expect(result).toMatchObject({ filled: 1 });
      expect(timestampOf('legacy-1')).toBe(Date.parse(JUNE_2025));
    });
  });
});
