import type { Review } from 'model';
import { toReviewThreads } from '../to-review-threads';

const review = (overrides: Partial<Review> & { id: string }): Review => ({
  author: 'Mira',
  biteId: '/bites/bite-1',
  review: 'Best kebab in Kreuzberg.',
  createdAtTimestamp: 1_000,
  ...overrides,
});

describe('toReviewThreads', () => {
  it('renders a review without answers as a thread of its own', () => {
    expect(toReviewThreads([review({ id: 'root-1' })])).toEqual([
      { root: review({ id: 'root-1' }), replies: [] },
    ]);
  });

  it('groups replies under the root they answer', () => {
    const root = review({ id: 'root-1' });
    const reply = review({
      id: 'reply-1',
      parentReviewId: 'root-1',
      threadId: 'root-1',
      author: 'Ali',
      createdAtTimestamp: 2_000,
    });

    expect(toReviewThreads([reply, root])).toEqual([
      { root, replies: [reply] },
    ]);
  });

  it('groups an answer to a reply under the same root, never below it', () => {
    const root = review({ id: 'root-1' });
    const reply = review({
      id: 'reply-1',
      parentReviewId: 'root-1',
      threadId: 'root-1',
      createdAtTimestamp: 2_000,
    });
    const answerToReply = review({
      id: 'reply-2',
      parentReviewId: 'reply-1',
      threadId: 'root-1',
      createdAtTimestamp: 3_000,
    });

    expect(toReviewThreads([root, answerToReply, reply])).toEqual([
      { root, replies: [reply, answerToReply] },
    ]);
  });

  it('renders threads newest first', () => {
    const older = review({ id: 'root-1', createdAtTimestamp: 1_000 });
    const newer = review({ id: 'root-2', createdAtTimestamp: 5_000 });

    expect(toReviewThreads([older, newer]).map(({ root }) => root.id)).toEqual([
      'root-2',
      'root-1',
    ]);
  });

  it('renders replies oldest first, so the conversation reads downwards', () => {
    const root = review({ id: 'root-1', createdAtTimestamp: 1_000 });
    const first = review({
      id: 'reply-1',
      parentReviewId: 'root-1',
      threadId: 'root-1',
      createdAtTimestamp: 2_000,
    });
    const second = review({
      id: 'reply-2',
      parentReviewId: 'root-1',
      threadId: 'root-1',
      createdAtTimestamp: 3_000,
    });

    expect(
      toReviewThreads([second, root, first])
        .at(0)
        ?.replies.map(({ id }) => id),
    ).toEqual(['reply-1', 'reply-2']);
  });

  it('falls back to createdAt for reviews written before the timestamp existed', () => {
    const legacy = review({
      id: 'root-1',
      createdAtTimestamp: undefined,
      createdAt: '2024-03-15T12:00:00.000Z',
    });
    const newer = review({
      id: 'root-2',
      createdAtTimestamp: Date.parse('2025-03-15T12:00:00.000Z'),
    });

    expect(toReviewThreads([legacy, newer]).map(({ root }) => root.id)).toEqual(
      ['root-2', 'root-1'],
    );
  });

  it('orders reviews of identical age deterministically', () => {
    const a = review({ id: 'root-a' });
    const b = review({ id: 'root-b' });

    expect(toReviewThreads([b, a]).map(({ root }) => root.id)).toEqual(
      toReviewThreads([a, b]).map(({ root }) => root.id),
    );
  });

  it('shows a reply whose root is missing rather than dropping it', () => {
    const orphan = review({
      id: 'reply-1',
      parentReviewId: 'gone',
      threadId: 'gone',
    });

    expect(toReviewThreads([orphan])).toEqual([{ root: orphan, replies: [] }]);
  });
});
