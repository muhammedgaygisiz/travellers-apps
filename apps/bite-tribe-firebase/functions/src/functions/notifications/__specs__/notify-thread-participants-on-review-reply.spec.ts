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

/**
 * The send path reaches Firestore through modules that take their handle at
 * import time, so the trigger is re-imported per test against a freshly seeded
 * store.
 */
const runTrigger = (reviewId: string, data: ReviewDoc): Promise<void> => {
  const handler = (
    require('../notify-thread-participants-on-review-reply') as typeof import('../notify-thread-participants-on-review-reply')
  ).notifyThreadParticipantsOnReviewReply as unknown as (event: {
    data: { id: string; data: () => ReviewDoc };
    params: { reviewId: string };
  }) => Promise<void>;

  return handler({
    data: { id: reviewId, data: () => data },
    params: { reviewId },
  });
};

const seedUser = (uid: string, user: { public?: boolean } = {}): void => {
  db.seed(`users/${uid}`, {
    userId: uid,
    displayName: uid,
    public: true,
    ...user,
  });
};

const seedInstallation = (uid: string, token: string): void => {
  db.seed(`users/${uid}/pushTokens/${token}`, { enabled: true });
};

/** A participant who exists, is public and has an installation to reach. */
const seedParticipant = (uid: string): void => {
  seedUser(uid);
  seedInstallation(uid, `token-${uid}`);
};

const seedBite = (biteId: string, creatorUid: string): void => {
  db.seed(`bites/${biteId}`, {
    id: biteId,
    userId: creatorUid,
    name: 'Kebab',
  });
};

const seedReview = (reviewId: string, review: ReviewDoc): void => {
  db.seed(`reviews/${reviewId}`, { biteId: '/bites/bite-1', ...review });
};

const reply = (overrides: ReviewDoc = {}): ReviewDoc => ({
  biteId: '/bites/bite-1',
  authorId: 'jonas',
  author: 'jonas',
  review: 'Was it very spicy?',
  parentReviewId: 'root-1',
  threadId: 'root-1',
  ...overrides,
});

const sent = (): MulticastRequest[] =>
  sendEachForMulticast.mock.calls.map(([request]) => request);

/** Every uid the send went out to, in no particular order. */
const notifiedTokens = (): string[] =>
  sent().flatMap((request) => request.tokens);

describe('notifyThreadParticipantsOnReviewReply', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    db = createFakeFirestore();

    seedBite('bite-1', 'ali');
    seedParticipant('ali');
    seedParticipant('mira');
    seedParticipant('jonas');
    seedReview('root-1', { authorId: 'mira', author: 'mira' });
  });

  it('tells the root author and the Bite creator about a reply', async () => {
    seedReview('reply-1', reply());

    await runTrigger('reply-1', reply());

    expect(notifiedTokens().sort()).toEqual(['token-ali', 'token-mira']);
  });

  it('carries the thread so the tap can open it', async () => {
    seedReview('reply-1', reply());

    await runTrigger('reply-1', reply());

    expect(sent()[0].data).toEqual({
      type: 'NEW_REVIEW_REPLY',
      biteId: 'bite-1',
      threadId: 'root-1',
      replyId: 'reply-1',
      replyAuthorId: 'jonas',
    });
  });

  it('words the reply in its own copy, not the new-review copy', async () => {
    seedReview('reply-1', reply());

    await runTrigger('reply-1', reply());

    expect(sent()[0].notification).toEqual({
      title: 'New reply to a review',
      body: 'jonas replied to a review of "Kebab".',
    });
  });

  it('never notifies the author of the reply', async () => {
    seedReview('reply-1', reply({ authorId: 'mira', author: 'mira' }));

    await runTrigger('reply-1', reply({ authorId: 'mira', author: 'mira' }));

    expect(notifiedTokens()).toEqual(['token-ali']);
  });

  it('notifies a participant once however much they have said', async () => {
    seedReview('reply-1', reply({ authorId: 'mira' }));
    seedReview('reply-2', reply({ authorId: 'mira' }));
    seedReview('reply-3', reply());

    await runTrigger('reply-3', reply());

    expect(notifiedTokens().sort()).toEqual(['token-ali', 'token-mira']);
  });

  it('reaches the other reply authors, not only the root author', async () => {
    seedParticipant('sam');
    seedReview('reply-1', reply({ authorId: 'sam' }));
    seedReview('reply-2', reply());

    await runTrigger('reply-2', reply());

    expect(notifiedTokens().sort()).toEqual([
      'token-ali',
      'token-mira',
      'token-sam',
    ]);
  });

  it('skips a participant whose review predates authorId, without dropping the rest', async () => {
    seedReview('root-1', { authorId: undefined, author: 'anonymous' });
    seedReview('reply-1', reply());

    await runTrigger('reply-1', reply());

    expect(notifiedTokens()).toEqual(['token-ali']);
  });

  it('skips a participant with no public user doc', async () => {
    seedUser('mira', { public: false });
    seedReview('reply-1', reply());

    await runTrigger('reply-1', reply());

    expect(notifiedTokens()).toEqual(['token-ali']);
  });

  it('stays silent when the Bite creator replies in their own thread', async () => {
    seedReview('root-1', { authorId: 'ali', author: 'ali' });
    seedReview('reply-1', reply({ authorId: 'ali', author: 'ali' }));

    await runTrigger('reply-1', reply({ authorId: 'ali', author: 'ali' }));

    expect(sent()).toEqual([]);
  });

  it('ignores a root review, which the bite-creator trigger owns', async () => {
    await runTrigger('root-2', {
      biteId: '/bites/bite-1',
      authorId: 'jonas',
      review: 'Great kebab',
    });

    expect(sent()).toEqual([]);
  });

  it('falls back to the answered review when the reply names no thread', async () => {
    const withoutThreadId = reply({ threadId: undefined });
    seedReview('reply-1', withoutThreadId);

    await runTrigger('reply-1', withoutThreadId);

    expect(sent()[0].data['threadId']).toBe('root-1');
    expect(notifiedTokens().sort()).toEqual(['token-ali', 'token-mira']);
  });

  it('sends nothing for a reply that names no author', async () => {
    const anonymous = reply({ authorId: undefined });
    seedReview('reply-1', anonymous);

    await runTrigger('reply-1', anonymous);

    expect(sent()).toEqual([]);
  });

  it('sends nothing when the Bite is gone', async () => {
    const orphaned = reply({ biteId: '/bites/missing' });
    seedReview('reply-1', orphaned);

    await runTrigger('reply-1', orphaned);

    expect(sent()).toEqual([]);
  });
});
