import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../users/__specs__/fake-firestore';
import { createTranslate } from '../../shared/i18n/translate';

let db: FakeFirestore;

const sendLocalizedNotification = jest.fn();
const judgeBiteContent = jest.fn();

// The trigger reads `getFirestore()` once at import, so it is handed a
// reference that reaches whichever fake the current test seeded.
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): unknown => ({
    doc: (path: string) => db.doc(path),
    collection: (path: string) => db.collection(path),
  }),
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

jest.mock('../../bites/bite-content', () => ({
  judgeBiteContent: (...args: unknown[]): unknown => judgeBiteContent(...args),
}));

import { notifyFollowersOnNewBite } from '../notify-followers-on-new-bite';

const AUTHOR = 'author-1';
const ACCEPTED = 'accepted-1';
const UNAPPROVED = 'unapproved-1';
const BITE_ID = 'bite-1';

type Trigger = (event: {
  data: { data: () => unknown } | undefined;
  params: { biteId: string };
}) => Promise<void>;

type Request = {
  uids: string[];
  data: Record<string, string>;
  buildMessage: (translate: ReturnType<typeof createTranslate>) => {
    title: string;
    body: string;
  };
};

/** Runs the trigger as Firestore would on the create of a Bite. */
const fire = (): Promise<void> =>
  (notifyFollowersOnNewBite as unknown as Trigger)({
    data: { data: () => ({ userId: AUTHOR, name: 'Ramen' }) },
    params: { biteId: BITE_ID },
  });

const sent = (): Request[] =>
  sendLocalizedNotification.mock.calls.map(([request]) => request as Request);

/** A follower edge as a one-tap follow writes it, without `acceptedAt`. */
const seedFollower = (uid: string, accepted: boolean): void =>
  db.seed(`users/${AUTHOR}/followers/${uid}`, {
    createdAt: '2026-11-01T00:00:00.000Z',
    followerUid: uid,
    followedUid: AUTHOR,
    ...(accepted ? { acceptedAt: '2026-11-19T00:00:00.000Z' } : {}),
  });

describe('notifyFollowersOnNewBite', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    sendLocalizedNotification.mockReset().mockResolvedValue(1);
    judgeBiteContent.mockReset().mockResolvedValue({ verdict: 'allowed' });
    seedFollower(ACCEPTED, true);
    seedFollower(UNAPPROVED, false);
  });

  describe('for a private author', () => {
    beforeEach(() => {
      db.seed(`users/${AUTHOR}`, {
        public: false,
        displayName: 'Fry',
        realName: 'Philip J. Fry',
      });
    });

    it('sends the new-Bite push to each accepted follower only', async () => {
      await fire();

      expect(sent()).toHaveLength(1);
      expect(sent()[0]).toMatchObject({
        uids: [ACCEPTED],
        data: { type: 'NEW_BITE', biteId: BITE_ID, authorUid: AUTHOR },
      });
    });

    it('treats an author without the public flag as private', async () => {
      db.seed(`users/${AUTHOR}`, { displayName: 'Fry' });

      await fire();

      expect(sent()[0].uids).toEqual([ACCEPTED]);
    });

    it('names the author by display name only', async () => {
      await fire();

      const { body } = sent()[0].buildMessage(createTranslate('en'));

      expect(body).toContain('Fry');
      expect(body).not.toContain('Philip');
    });

    it('sends nothing when no follower was ever accepted', async () => {
      db.seed(`users/${AUTHOR}/followers/${ACCEPTED}`, {
        followerUid: ACCEPTED,
        followedUid: AUTHOR,
      });

      await fire();

      expect(sendLocalizedNotification).not.toHaveBeenCalled();
      expect(judgeBiteContent).not.toHaveBeenCalled();
    });

    it('leaves out an accepted follower the author blocks', async () => {
      db.seed(`users/${AUTHOR}/blocked/${ACCEPTED}`, { blockedUid: ACCEPTED });

      await fire();

      expect(sendLocalizedNotification).not.toHaveBeenCalled();
    });

    it('leaves out an accepted follower who blocks the author', async () => {
      db.seed(`users/${AUTHOR}/blockedBy/${ACCEPTED}`, {
        blockerUid: ACCEPTED,
      });

      await fire();

      expect(sendLocalizedNotification).not.toHaveBeenCalled();
    });
  });

  describe('for a public author', () => {
    beforeEach(() => {
      db.seed(`users/${AUTHOR}`, { public: true, displayName: 'Fry' });
    });

    it('sends the push to every follower, accepted or not', async () => {
      await fire();

      expect(sent()[0].uids).toEqual([ACCEPTED, UNAPPROVED]);
    });

    it('leaves out a follower the author blocks', async () => {
      db.seed(`users/${AUTHOR}/blocked/${UNAPPROVED}`, {
        blockedUid: UNAPPROVED,
      });

      await fire();

      expect(sent()[0].uids).toEqual([ACCEPTED]);
    });

    it('leaves out a follower who blocks the author', async () => {
      db.seed(`users/${AUTHOR}/blockedBy/${ACCEPTED}`, {
        blockerUid: ACCEPTED,
      });

      await fire();

      expect(sent()[0].uids).toEqual([UNAPPROVED]);
    });

    it('sends nothing for a Bite whose text is refused', async () => {
      judgeBiteContent.mockResolvedValue({ verdict: 'refused' });

      await fire();

      expect(sendLocalizedNotification).not.toHaveBeenCalled();
    });
  });
});
