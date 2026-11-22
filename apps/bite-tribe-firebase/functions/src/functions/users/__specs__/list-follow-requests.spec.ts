import type { CallableRequest } from 'firebase-functions/https';
import type { FakeFirestore } from './fake-firestore';
import { createFakeFirestore } from './fake-firestore';

let db: FakeFirestore;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
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

import { listFollowRequestsHandler } from '../list-follow-requests';
import { followRequestId } from '../follow-request';

const OWNER = 'owner-1';
const PUBLIC_REQUESTER = 'public-requester-1';
const PRIVATE_REQUESTER = 'private-requester-1';
const BLOCKED_REQUESTER = 'blocked-requester-1';
const OTHER_OWNER = 'other-owner-1';

const as = (uid?: string): CallableRequest<unknown> =>
  ({
    data: {},
    ...(uid ? { auth: { uid, token: {} } } : {}),
  }) as unknown as CallableRequest<unknown>;

const seedRequest = (
  ownerUid: string,
  requesterUid: string,
  createdAt: string,
): void =>
  db.seed(`followRequests/${followRequestId(ownerUid, requesterUid)}`, {
    ownerUid,
    requesterUid,
    createdAt,
  });

beforeEach(() => {
  db = createFakeFirestore();
  db.seed(`users/${OWNER}`, { userId: OWNER, public: false });
  db.seed(`users/${PUBLIC_REQUESTER}`, {
    userId: PUBLIC_REQUESTER,
    public: true,
    displayName: 'Pia',
    photoUrl: 'https://example.com/pia.jpg',
    about: 'Loves ramen',
  });
  db.seed(`users/${PRIVATE_REQUESTER}`, {
    userId: PRIVATE_REQUESTER,
    public: false,
    displayName: 'Quinn',
    photoUrl: 'https://example.com/quinn.jpg',
    about: 'Secret',
  });
  db.seed(`users/${BLOCKED_REQUESTER}`, {
    userId: BLOCKED_REQUESTER,
    public: true,
    displayName: 'Blocked',
  });
});

describe('listFollowRequestsHandler', () => {
  it('refuses a signed-out caller', async () => {
    await expect(listFollowRequestsHandler(as())).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('answers an empty list when nothing is pending', async () => {
    await expect(listFollowRequestsHandler(as(OWNER))).resolves.toEqual({
      requests: [],
    });
  });

  it("lists the caller's pending requests, newest first", async () => {
    seedRequest(OWNER, PUBLIC_REQUESTER, '2026-11-18T10:00:00.000Z');
    seedRequest(OWNER, PRIVATE_REQUESTER, '2026-11-19T10:00:00.000Z');

    const { requests } = await listFollowRequestsHandler(as(OWNER));

    expect(requests.map(({ requesterUid }) => requesterUid)).toEqual([
      PRIVATE_REQUESTER,
      PUBLIC_REQUESTER,
    ]);
  });

  it("shows a public requester's display name and photo", async () => {
    seedRequest(OWNER, PUBLIC_REQUESTER, '2026-11-18T10:00:00.000Z');

    await expect(listFollowRequestsHandler(as(OWNER))).resolves.toEqual({
      requests: [
        {
          requesterUid: PUBLIC_REQUESTER,
          displayName: 'Pia',
          photoUrl: 'https://example.com/pia.jpg',
          createdAt: '2026-11-18T10:00:00.000Z',
        },
      ],
    });
  });

  it("shows a private requester's display name and nothing else", async () => {
    seedRequest(OWNER, PRIVATE_REQUESTER, '2026-11-18T10:00:00.000Z');

    await expect(listFollowRequestsHandler(as(OWNER))).resolves.toEqual({
      requests: [
        {
          requesterUid: PRIVATE_REQUESTER,
          displayName: 'Quinn',
          createdAt: '2026-11-18T10:00:00.000Z',
        },
      ],
    });
  });

  it('leaves out the display name a requester has not set', async () => {
    db.seed(`users/${PUBLIC_REQUESTER}`, {
      userId: PUBLIC_REQUESTER,
      public: true,
      displayName: '  ',
    });
    seedRequest(OWNER, PUBLIC_REQUESTER, '2026-11-18T10:00:00.000Z');

    const { requests } = await listFollowRequestsHandler(as(OWNER));

    expect(requests).toEqual([
      { requesterUid: PUBLIC_REQUESTER, createdAt: '2026-11-18T10:00:00.000Z' },
    ]);
  });

  it('never lists a request from an account the owner blocks', async () => {
    db.seed(`users/${OWNER}/blocked/${BLOCKED_REQUESTER}`, {
      blockedUid: BLOCKED_REQUESTER,
    });
    seedRequest(OWNER, BLOCKED_REQUESTER, '2026-11-19T10:00:00.000Z');
    seedRequest(OWNER, PUBLIC_REQUESTER, '2026-11-18T10:00:00.000Z');

    const { requests } = await listFollowRequestsHandler(as(OWNER));

    expect(requests.map(({ requesterUid }) => requesterUid)).toEqual([
      PUBLIC_REQUESTER,
    ]);
  });

  it('leaves out a request whose requester has no user document', async () => {
    seedRequest(OWNER, 'gone-1', '2026-11-19T10:00:00.000Z');

    await expect(listFollowRequestsHandler(as(OWNER))).resolves.toEqual({
      requests: [],
    });
  });

  it('never lists a request addressed to another account', async () => {
    seedRequest(OTHER_OWNER, PUBLIC_REQUESTER, '2026-11-19T10:00:00.000Z');

    await expect(listFollowRequestsHandler(as(OWNER))).resolves.toEqual({
      requests: [],
    });
  });
});
