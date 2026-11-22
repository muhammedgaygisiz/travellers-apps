import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;

const sendLocalizedNotification = jest.fn();

// The trigger reads `getFirestore()` once at import, so it is handed a
// reference that reaches whichever fake the current test seeded.
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): unknown => ({ doc: (path: string) => db.doc(path) }),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/firestore', () => ({
  onDocumentCreated: jest.fn((_document: unknown, handler: unknown) => handler),
}));

jest.mock('../../shared/utils/send-localized-notification', () => ({
  sendLocalizedNotification: (...args: unknown[]): unknown =>
    sendLocalizedNotification(...args),
}));

import { notifyUserOnNewFollower } from '../notify-user-on-new-follower';

const OWNER = 'owner-1';
const FOLLOWER = 'follower-1';

type Trigger = (event: {
  data: { data: () => unknown } | undefined;
  params: { userId: string; followerId: string };
}) => Promise<void>;

/** Runs the trigger as Firestore would on the edge an acceptance writes. */
const fire = (): Promise<void> =>
  (notifyUserOnNewFollower as unknown as Trigger)({
    data: {
      data: () => ({
        createdAt: '2026-11-20T00:00:00.000Z',
        followerUid: FOLLOWER,
        followedUid: OWNER,
        acceptedAt: '2026-11-20T00:00:00.000Z',
      }),
    },
    params: { userId: OWNER, followerId: FOLLOWER },
  });

describe('notifyUserOnNewFollower', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    db.seed(`users/${FOLLOWER}`, { public: true, displayName: 'Leela' });
    sendLocalizedNotification.mockReset().mockResolvedValue(1);
  });

  it('sends a private owner no New Follower push for an accepted request', async () => {
    // `acceptFollowRequest` pushes the acceptance to the requester; the owner
    // accepted the follower and needs no second word of it (issue #2166).
    db.seed(`users/${OWNER}`, { public: false, displayName: 'Fry' });

    await fire();

    expect(sendLocalizedNotification).not.toHaveBeenCalled();
  });

  it('treats an owner without the public flag as private', async () => {
    db.seed(`users/${OWNER}`, { displayName: 'Fry' });

    await fire();

    expect(sendLocalizedNotification).not.toHaveBeenCalled();
  });

  it('still tells a public owner about a new follower', async () => {
    db.seed(`users/${OWNER}`, { public: true, displayName: 'Fry' });

    await fire();

    expect(sendLocalizedNotification).toHaveBeenCalledTimes(1);
    expect(sendLocalizedNotification.mock.calls[0][0]).toMatchObject({
      uids: [OWNER],
      data: { type: 'NEW_FOLLOWER', followerUid: FOLLOWER },
    });
  });
});
