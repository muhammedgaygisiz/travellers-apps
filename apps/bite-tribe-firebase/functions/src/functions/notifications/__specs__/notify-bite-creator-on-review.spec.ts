import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;

interface MulticastRequest {
  tokens: string[];
  notification: { title: string; body: string };
  data: Record<string, string>;
}

const sendEachForMulticast = jest.fn(async ({ tokens }: MulticastRequest) => ({
  successCount: tokens.length,
  failureCount: 0,
  responses: tokens.map(() => ({ success: true })),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: (): { sendEachForMulticast: typeof sendEachForMulticast } => ({
    sendEachForMulticast,
  }),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/firestore', () => ({
  onDocumentCreated: jest.fn((_document: unknown, handler: unknown) => handler),
}));

type ReviewDoc = {
  biteId?: string;
  authorId?: string;
  author?: string;
  review?: string;
  parentReviewId?: string;
  threadId?: string;
};

const runTrigger = (reviewId: string, data: ReviewDoc): Promise<void> => {
  const handler = (
    require('../notify-bite-creator-on-review') as typeof import('../notify-bite-creator-on-review')
  ).notifyBiteCreatorOnReview as unknown as (event: {
    data: { id: string; data: () => ReviewDoc };
    params: { reviewId: string };
  }) => Promise<void>;

  return handler({
    data: { id: reviewId, data: () => data },
    params: { reviewId },
  });
};

const seedParticipant = (uid: string): void => {
  db.seed(`users/${uid}`, { userId: uid, displayName: uid, public: true });
  db.seed(`users/${uid}/pushTokens/token-${uid}`, { enabled: true });
};

const sent = (): MulticastRequest[] =>
  sendEachForMulticast.mock.calls.map(([request]) => request);

describe('notifyBiteCreatorOnReview', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    db = createFakeFirestore();

    db.seed('bites/bite-1', { id: 'bite-1', userId: 'ali', name: 'Kebab' });
    seedParticipant('ali');
    seedParticipant('mira');
    seedParticipant('jonas');
  });

  it('tells the Bite creator about a new root review', async () => {
    await runTrigger('root-1', {
      biteId: '/bites/bite-1',
      authorId: 'mira',
      author: 'mira',
      review: 'Best kebab in Kreuzberg.',
    });

    expect(sent()).toEqual([
      {
        tokens: ['token-ali'],
        notification: {
          title: 'New Review on Your Bite!',
          body: 'mira reviewed your Bite "Kebab".',
        },
        data: {
          type: 'NEW_BITE_REVIEW',
          biteId: 'bite-1',
          reviewAuthorId: 'mira',
        },
      },
    ]);
  });

  it('leaves a reply to the thread trigger', async () => {
    // A reply is stored as a review, so this trigger sees it too. Announcing it
    // as a new review would tell the Bite creator the wrong thing and would
    // reach none of the people actually in the conversation (issue #1283).
    await runTrigger('reply-1', {
      biteId: '/bites/bite-1',
      authorId: 'jonas',
      author: 'jonas',
      review: 'Was it very spicy?',
      parentReviewId: 'root-1',
      threadId: 'root-1',
    });

    expect(sent()).toEqual([]);
  });

  it('stays silent when the Bite creator reviews their own Bite', async () => {
    await runTrigger('root-1', {
      biteId: '/bites/bite-1',
      authorId: 'ali',
      author: 'ali',
      review: 'Still my favourite.',
    });

    expect(sent()).toEqual([]);
  });
});
