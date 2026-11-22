import type { CallableRequest } from 'firebase-functions/https';
import type { FakeFirestore } from './fake-firestore';
import { createFakeFirestore } from './fake-firestore';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/firestore', () => ({
  onDocumentUpdated: jest.fn((_path, handler) => handler),
  onDocumentCreated: jest.fn((_path, handler) => handler),
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
  onCall: jest.fn((_options, handler) => handler),
}));

const sendLocalizedNotification = jest.fn();

jest.mock('../../shared/utils/send-localized-notification', () => ({
  sendLocalizedNotification: (...args: unknown[]): unknown =>
    sendLocalizedNotification(...args),
}));

import {
  acceptAllFollowRequests,
  applyFollowVisibilityOnUserUpdate,
  stampFollowersAsAccepted,
} from '../follow-visibility';
import { backfillFollowerAcceptanceHandler } from '../backfill-follower-acceptance';
import { followRequestId } from '../follow-request';

const OWNER = 'owner-1';
const FAN = 'fan-1';
const OTHER_FAN = 'fan-2';
const ASKER = 'asker-1';
const OTHER_ASKER = 'asker-2';
const NOW = new Date('2026-11-20T10:00:00.000Z');

/** A follow as `ProfileApiService.follow` writes it: no `acceptedAt`. */
const seedClientFollow = (followerUid: string, followedUid: string): void => {
  const edge = {
    createdAt: '2026-01-01T00:00:00.000Z',
    followerUid,
    followedUid,
  };

  db.seed(`users/${followedUid}/followers/${followerUid}`, edge);
  db.seed(`users/${followerUid}/following/${followedUid}`, edge);
};

const seedRequest = (ownerUid: string, requesterUid: string): void =>
  db.seed(`followRequests/${followRequestId(ownerUid, requesterUid)}`, {
    ownerUid,
    requesterUid,
    createdAt: '2026-11-19T00:00:00.000Z',
  });

type UserData = Record<string, unknown>;

const trigger = applyFollowVisibilityOnUserUpdate as unknown as (event: {
  params: { uid: string };
  data: {
    before: { data: () => UserData };
    after: { data: () => UserData };
  };
}) => Promise<void>;

const update = (before: UserData, after: UserData): Promise<void> =>
  trigger({
    params: { uid: OWNER },
    data: { before: { data: () => before }, after: { data: () => after } },
  });

beforeEach(() => {
  db = createFakeFirestore();
  sendLocalizedNotification.mockReset().mockResolvedValue(1);
  db.seed(`users/${OWNER}`, { userId: OWNER, public: true });
  [FAN, OTHER_FAN, ASKER, OTHER_ASKER].forEach((uid) =>
    db.seed(`users/${uid}`, { userId: uid, public: true }),
  );
});

describe('stampFollowersAsAccepted', () => {
  it('stamps both edges of every follower and keeps every follow', async () => {
    seedClientFollow(FAN, OWNER);
    seedClientFollow(OTHER_FAN, OWNER);

    await expect(
      stampFollowersAsAccepted(db as never, OWNER, NOW),
    ).resolves.toBe(2);

    [FAN, OTHER_FAN].forEach((fan) => {
      expect(db.read(`users/${OWNER}/followers/${fan}`)).toEqual({
        createdAt: '2026-01-01T00:00:00.000Z',
        followerUid: fan,
        followedUid: OWNER,
        acceptedAt: NOW.toISOString(),
      });
      expect(db.read(`users/${fan}/following/${OWNER}`)?.['acceptedAt']).toBe(
        NOW.toISOString(),
      );
    });
  });

  it('leaves an edge that is already accepted alone', async () => {
    const accepted = {
      createdAt: '2026-11-01T00:00:00.000Z',
      followerUid: FAN,
      followedUid: OWNER,
      acceptedAt: '2026-11-01T00:00:00.000Z',
    };
    db.seed(`users/${OWNER}/followers/${FAN}`, accepted);
    db.seed(`users/${FAN}/following/${OWNER}`, accepted);

    await expect(
      stampFollowersAsAccepted(db as never, OWNER, NOW),
    ).resolves.toBe(0);
    expect(db.read(`users/${OWNER}/followers/${FAN}`)).toEqual(accepted);
  });

  it('does not create a following edge that is missing', async () => {
    db.seed(`users/${OWNER}/followers/${FAN}`, {
      followerUid: FAN,
      followedUid: OWNER,
    });

    await stampFollowersAsAccepted(db as never, OWNER, NOW);

    expect(db.exists(`users/${FAN}/following/${OWNER}`)).toBe(false);
    expect(db.read(`users/${OWNER}/followers/${FAN}`)?.['acceptedAt']).toBe(
      NOW.toISOString(),
    );
  });
});

describe('acceptAllFollowRequests', () => {
  it('turns every request into a follow and sends no push', async () => {
    seedRequest(OWNER, ASKER);
    seedRequest(OWNER, OTHER_ASKER);
    seedRequest('someone-else', FAN);

    await expect(
      acceptAllFollowRequests(db as never, OWNER, NOW),
    ).resolves.toBe(2);

    [ASKER, OTHER_ASKER].forEach((asker) => {
      const edge = {
        createdAt: NOW.toISOString(),
        followerUid: asker,
        followedUid: OWNER,
        acceptedAt: NOW.toISOString(),
      };

      expect(db.read(`users/${OWNER}/followers/${asker}`)).toEqual(edge);
      expect(db.read(`users/${asker}/following/${OWNER}`)).toEqual(edge);
      expect(db.exists(`followRequests/${followRequestId(OWNER, asker)}`)).toBe(
        false,
      );
    });
    expect(
      db.exists(`followRequests/${followRequestId('someone-else', FAN)}`),
    ).toBe(true);
    expect(sendLocalizedNotification).not.toHaveBeenCalled();
  });

  it('accepts nothing when no request is pending', async () => {
    await expect(
      acceptAllFollowRequests(db as never, OWNER, NOW),
    ).resolves.toBe(0);
  });
});

describe('applyFollowVisibilityOnUserUpdate', () => {
  it('keeps every follower as accepted when the profile turns private', async () => {
    seedClientFollow(FAN, OWNER);

    await update({ public: true }, { public: false });

    expect(db.read(`users/${OWNER}/followers/${FAN}`)?.['acceptedAt']).toEqual(
      expect.any(String),
    );
    expect(db.read(`users/${FAN}/following/${OWNER}`)?.['acceptedAt']).toEqual(
      expect.any(String),
    );
  });

  it('treats a dropped public flag as turning private', async () => {
    seedClientFollow(FAN, OWNER);

    await update({ public: true }, {});

    expect(
      db.read(`users/${OWNER}/followers/${FAN}`)?.['acceptedAt'],
    ).toBeDefined();
  });

  it('accepts every pending request when the profile turns public', async () => {
    seedRequest(OWNER, ASKER);

    await update({ public: false }, { public: true });

    expect(db.exists(`users/${OWNER}/followers/${ASKER}`)).toBe(true);
    expect(db.exists(`users/${ASKER}/following/${OWNER}`)).toBe(true);
    expect(db.exists(`followRequests/${followRequestId(OWNER, ASKER)}`)).toBe(
      false,
    );
    expect(sendLocalizedNotification).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a public',
      { public: true, city: 'Berlin' },
      { public: true, city: 'Rome' },
    ],
    [
      'a private',
      { public: false, city: 'Berlin' },
      { public: false, city: 'Rome' },
    ],
  ])(
    'touches no edge and no request on a save of %s profile that keeps the flag',
    async (_label, before, after) => {
      seedClientFollow(FAN, OWNER);
      seedRequest(OWNER, ASKER);
      const edge = db.read(`users/${OWNER}/followers/${FAN}`);

      await update(before, after);

      expect(db.read(`users/${OWNER}/followers/${FAN}`)).toEqual(edge);
      expect(db.exists(`users/${OWNER}/followers/${ASKER}`)).toBe(false);
      expect(db.exists(`followRequests/${followRequestId(OWNER, ASKER)}`)).toBe(
        true,
      );
    },
  );
});

describe('backfillFollowerAcceptanceHandler', () => {
  const asCaller = (roles: string[]): CallableRequest<void> =>
    ({
      data: undefined,
      auth: { uid: 'operator-1', token: { roles } },
    }) as unknown as CallableRequest<void>;

  it('refuses a caller without the admin role', async () => {
    await expect(
      backfillFollowerAcceptanceHandler(asCaller([])),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('stamps the followers of every private profile and no public one', async () => {
    db.seed(`users/${OWNER}`, { userId: OWNER, public: false });
    db.seed('users/legacy-1', { userId: 'legacy-1' });
    seedClientFollow(FAN, OWNER);
    seedClientFollow(OTHER_FAN, 'legacy-1');
    seedClientFollow(ASKER, FAN);

    await expect(
      backfillFollowerAcceptanceHandler(asCaller(['admin'])),
    ).resolves.toEqual({ processed: 6, private: 2, stamped: 2 });

    expect(
      db.read(`users/${OWNER}/followers/${FAN}`)?.['acceptedAt'],
    ).toBeDefined();
    expect(
      db.read(`users/legacy-1/followers/${OTHER_FAN}`)?.['acceptedAt'],
    ).toBeDefined();
    expect(
      db.read(`users/${FAN}/followers/${ASKER}`)?.['acceptedAt'],
    ).toBeUndefined();
  });

  it('writes nothing new on a second run', async () => {
    db.seed(`users/${OWNER}`, { userId: OWNER, public: false });
    seedClientFollow(FAN, OWNER);

    await backfillFollowerAcceptanceHandler(asCaller(['admin']));

    await expect(
      backfillFollowerAcceptanceHandler(asCaller(['admin'])),
    ).resolves.toMatchObject({ stamped: 0 });
  });
});
