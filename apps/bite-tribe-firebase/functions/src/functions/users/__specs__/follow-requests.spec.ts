import type { CallableRequest } from 'firebase-functions/https';
import type { FakeFirestore } from './fake-firestore';
import { arrayRemove, createFakeFirestore } from './fake-firestore';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
  FieldValue: {
    arrayRemove: (...values: unknown[]): unknown => arrayRemove(...values),
  },
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
  onCall: jest.fn((_options, handler) => handler),
}));

const sendLocalizedNotification = jest.fn();

jest.mock('../../shared/utils/send-localized-notification', () => ({
  sendLocalizedNotification: (...args: unknown[]): unknown =>
    sendLocalizedNotification(...args),
}));

import {
  requestFollowHandler,
  withdrawFollowRequestHandler,
} from '../request-follow';
import {
  acceptFollowRequestHandler,
  declineFollowRequestHandler,
} from '../answer-follow-request';
import { blockUserHandler } from '../block-user';
import { followRequestId } from '../follow-request';
import { createTranslate } from '../../shared/i18n/translate';

/** The private profile being asked to be followed. */
const OWNER = 'owner-1';
/** The account asking. */
const REQUESTER = 'requester-1';
/** A third account, with no part in the request. */
const BYSTANDER = 'bystander-1';
/** A profile anybody follows in one tap. */
const PUBLIC_OWNER = 'public-owner-1';

const REQUEST_PATH = `followRequests/${followRequestId(OWNER, REQUESTER)}`;

type Data = { userId?: unknown };

const asRequest = (request: {
  data: unknown;
  auth?: { uid: string; token: Record<string, unknown> };
}): CallableRequest<Data> => request as unknown as CallableRequest<Data>;

const as = (callerUid: string, userId: unknown): CallableRequest<Data> =>
  asRequest({ data: { userId }, auth: { uid: callerUid, token: {} } });

/**
 * Every document under a `followers` or `following` subcollection. The four
 * follow-count triggers fire on exactly those paths, so an empty list is a
 * count that did not move and one edge on each side is a rise by one.
 */
const followEdges = (): string[] =>
  [OWNER, REQUESTER, BYSTANDER, PUBLIC_OWNER].flatMap((uid) =>
    [OWNER, REQUESTER, BYSTANDER, PUBLIC_OWNER].flatMap((other) =>
      [
        `users/${uid}/followers/${other}`,
        `users/${uid}/following/${other}`,
      ].filter((path) => db.exists(path)),
    ),
  );

beforeEach(() => {
  db = createFakeFirestore();
  sendLocalizedNotification.mockReset().mockResolvedValue(1);
  db.seed(`users/${OWNER}`, {
    userId: OWNER,
    public: false,
    displayName: 'Owner',
  });
  db.seed(`users/${REQUESTER}`, { userId: REQUESTER, public: true });
  db.seed(`users/${BYSTANDER}`, { userId: BYSTANDER, public: true });
  db.seed(`users/${PUBLIC_OWNER}`, { userId: PUBLIC_OWNER, public: true });
});

describe('requestFollowHandler', () => {
  it('stores a request to follow a private profile and writes no follow edge', async () => {
    await expect(requestFollowHandler(as(REQUESTER, OWNER))).resolves.toEqual({
      requested: true,
    });

    expect(db.read(REQUEST_PATH)).toEqual({
      ownerUid: OWNER,
      requesterUid: REQUESTER,
      createdAt: expect.any(String),
    });
    expect(followEdges()).toEqual([]);
  });

  it('treats a profile without the public flag as private', async () => {
    db.seed(`users/${OWNER}`, { userId: OWNER });

    await expect(requestFollowHandler(as(REQUESTER, OWNER))).resolves.toEqual({
      requested: true,
    });
  });

  it('leaves one request for a pair that asks twice', async () => {
    await requestFollowHandler(as(REQUESTER, OWNER));
    const first = db.read(REQUEST_PATH);

    await expect(requestFollowHandler(as(REQUESTER, OWNER))).resolves.toEqual({
      requested: false,
    });

    expect(db.read(REQUEST_PATH)).toEqual(first);
  });

  it("refuses the caller's own profile", async () => {
    await expect(requestFollowHandler(as(OWNER, OWNER))).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('refuses a request without a userId', async () => {
    await expect(
      requestFollowHandler(as(REQUESTER, undefined)),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('refuses an account that does not exist', async () => {
    await expect(
      requestFollowHandler(as(REQUESTER, 'ghost')),
    ).rejects.toMatchObject({ code: 'not-found' });
    expect(
      db.exists(`followRequests/${followRequestId('ghost', REQUESTER)}`),
    ).toBe(false);
  });

  it('refuses a public profile, which is followed directly', async () => {
    await expect(
      requestFollowHandler(as(REQUESTER, PUBLIC_OWNER)),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(
      db.exists(`followRequests/${followRequestId(PUBLIC_OWNER, REQUESTER)}`),
    ).toBe(false);
  });

  it('refuses a pair where the owner blocks the requester', async () => {
    db.seed(`users/${OWNER}/blocked/${REQUESTER}`, {});

    await expect(
      requestFollowHandler(as(REQUESTER, OWNER)),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(db.exists(REQUEST_PATH)).toBe(false);
  });

  it('refuses a pair where the requester blocks the owner', async () => {
    db.seed(`users/${REQUESTER}/blocked/${OWNER}`, {});

    await expect(
      requestFollowHandler(as(REQUESTER, OWNER)),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(db.exists(REQUEST_PATH)).toBe(false);
  });

  it('refuses a pair that already follows', async () => {
    db.seed(`users/${OWNER}/followers/${REQUESTER}`, {});
    db.seed(`users/${REQUESTER}/following/${OWNER}`, {});

    await expect(
      requestFollowHandler(as(REQUESTER, OWNER)),
    ).rejects.toMatchObject({ code: 'already-exists' });
    expect(db.exists(REQUEST_PATH)).toBe(false);
  });

  it('refuses a signed-out caller', async () => {
    await expect(
      requestFollowHandler(asRequest({ data: { userId: OWNER } })),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('refuses an anonymous table guest', async () => {
    await expect(
      requestFollowHandler(
        asRequest({
          data: { userId: OWNER },
          auth: {
            uid: REQUESTER,
            token: { firebase: { sign_in_provider: 'anonymous' } },
          },
        }),
      ),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });
});

describe('acceptFollowRequestHandler', () => {
  beforeEach(async () => {
    await requestFollowHandler(as(REQUESTER, OWNER));
  });

  it('deletes the request and writes both follow edges with acceptedAt', async () => {
    await expect(
      acceptFollowRequestHandler(as(OWNER, REQUESTER)),
    ).resolves.toEqual({ accepted: true });

    expect(db.exists(REQUEST_PATH)).toBe(false);

    const edge = {
      createdAt: expect.any(String),
      followerUid: REQUESTER,
      followedUid: OWNER,
      acceptedAt: expect.any(String),
    };

    expect(db.read(`users/${OWNER}/followers/${REQUESTER}`)).toEqual(edge);
    expect(db.read(`users/${REQUESTER}/following/${OWNER}`)).toEqual(edge);
    // One edge on each side: each count rises by exactly one.
    expect(followEdges()).toEqual([
      `users/${OWNER}/followers/${REQUESTER}`,
      `users/${REQUESTER}/following/${OWNER}`,
    ]);
  });

  it('pushes the acceptance to the requester once, naming the owner', async () => {
    // The callable sends it rather than a trigger: the follower edge cannot
    // tell an accepted request from a public follow (issue #2166).
    await acceptFollowRequestHandler(as(OWNER, REQUESTER));

    expect(sendLocalizedNotification).toHaveBeenCalledTimes(1);

    const [push] = sendLocalizedNotification.mock.calls[0] as [
      {
        uids: string[];
        data: Record<string, string>;
        buildMessage: (translate: ReturnType<typeof createTranslate>) => {
          body: string;
        };
      },
    ];

    expect(push.uids).toEqual([REQUESTER]);
    expect(push.data).toEqual({
      type: 'FOLLOW_REQUEST_ACCEPTED',
      ownerUid: OWNER,
    });
    expect(push.buildMessage(createTranslate('en')).body).toBe(
      'Owner accepted your follow request.',
    );
  });

  it('still accepts when the push fails', async () => {
    sendLocalizedNotification.mockRejectedValue(new Error('FCM is down'));

    await expect(
      acceptFollowRequestHandler(as(OWNER, REQUESTER)),
    ).resolves.toEqual({ accepted: true });
    expect(db.exists(`users/${OWNER}/followers/${REQUESTER}`)).toBe(true);
  });

  it('pushes nothing for a refused acceptance', async () => {
    await expect(
      acceptFollowRequestHandler(as(BYSTANDER, REQUESTER)),
    ).rejects.toMatchObject({ code: 'not-found' });

    expect(sendLocalizedNotification).not.toHaveBeenCalled();
  });

  it('refuses the requester accepting their own request', async () => {
    await expect(
      acceptFollowRequestHandler(as(REQUESTER, OWNER)),
    ).rejects.toMatchObject({ code: 'not-found' });

    expect(db.exists(REQUEST_PATH)).toBe(true);
    expect(followEdges()).toEqual([]);
  });

  it('refuses a third account accepting the request', async () => {
    await expect(
      acceptFollowRequestHandler(as(BYSTANDER, REQUESTER)),
    ).rejects.toMatchObject({ code: 'not-found' });

    expect(db.exists(REQUEST_PATH)).toBe(true);
    expect(followEdges()).toEqual([]);
  });

  it('refuses a request that is not there', async () => {
    await withdrawFollowRequestHandler(as(REQUESTER, OWNER));

    await expect(
      acceptFollowRequestHandler(as(OWNER, REQUESTER)),
    ).rejects.toMatchObject({ code: 'not-found' });
    expect(followEdges()).toEqual([]);
  });
});

describe('declineFollowRequestHandler', () => {
  beforeEach(async () => {
    await requestFollowHandler(as(REQUESTER, OWNER));
  });

  it('deletes the request and writes no follow edge', async () => {
    await expect(
      declineFollowRequestHandler(as(OWNER, REQUESTER)),
    ).resolves.toEqual({ declined: true });

    expect(db.exists(REQUEST_PATH)).toBe(false);
    expect(followEdges()).toEqual([]);
    // Nobody is told about a decline (issue #2166).
    expect(sendLocalizedNotification).not.toHaveBeenCalled();
  });

  it('leaves the request alone for anybody but its owner', async () => {
    await expect(
      declineFollowRequestHandler(as(REQUESTER, OWNER)),
    ).resolves.toEqual({ declined: false });
    await expect(
      declineFollowRequestHandler(as(BYSTANDER, REQUESTER)),
    ).resolves.toEqual({ declined: false });

    expect(db.exists(REQUEST_PATH)).toBe(true);
  });
});

describe('withdrawFollowRequestHandler', () => {
  beforeEach(async () => {
    await requestFollowHandler(as(REQUESTER, OWNER));
  });

  it('deletes the request and writes no follow edge', async () => {
    await expect(
      withdrawFollowRequestHandler(as(REQUESTER, OWNER)),
    ).resolves.toEqual({ withdrawn: true });

    expect(db.exists(REQUEST_PATH)).toBe(false);
    expect(followEdges()).toEqual([]);
    // Nobody is told about a withdrawal (issue #2166).
    expect(sendLocalizedNotification).not.toHaveBeenCalled();
  });

  it('leaves the request alone for anybody but its requester', async () => {
    await expect(
      withdrawFollowRequestHandler(as(OWNER, REQUESTER)),
    ).resolves.toEqual({ withdrawn: false });
    await expect(
      withdrawFollowRequestHandler(as(BYSTANDER, OWNER)),
    ).resolves.toEqual({ withdrawn: false });

    expect(db.exists(REQUEST_PATH)).toBe(true);
  });

  it('answers withdrawn: false when there is nothing to withdraw', async () => {
    await withdrawFollowRequestHandler(as(REQUESTER, OWNER));

    await expect(
      withdrawFollowRequestHandler(as(REQUESTER, OWNER)),
    ).resolves.toEqual({ withdrawn: false });
  });
});

describe('blockUserHandler and a pending follow request', () => {
  const block = (blockerUid: string, blockedUid: string): Promise<unknown> =>
    blockUserHandler(
      asRequest({
        data: { uid: blockedUid },
        auth: { uid: blockerUid, token: {} },
      }) as unknown as Parameters<typeof blockUserHandler>[0],
    );

  beforeEach(async () => {
    await requestFollowHandler(as(REQUESTER, OWNER));
  });

  it('deletes the request when the owner blocks the requester', async () => {
    await block(OWNER, REQUESTER);

    expect(db.exists(REQUEST_PATH)).toBe(false);
  });

  it('deletes the request when the requester blocks the owner', async () => {
    await block(REQUESTER, OWNER);

    expect(db.exists(REQUEST_PATH)).toBe(false);
  });

  it('leaves requests between other accounts alone', async () => {
    db.seed(`users/${BYSTANDER}`, { userId: BYSTANDER, public: false });
    await requestFollowHandler(as(OWNER, BYSTANDER));

    await block(OWNER, REQUESTER);

    expect(
      db.exists(`followRequests/${followRequestId(BYSTANDER, OWNER)}`),
    ).toBe(true);
  });
});
