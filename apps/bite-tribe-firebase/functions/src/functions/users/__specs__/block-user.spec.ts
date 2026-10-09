import type { Firestore } from 'firebase-admin/firestore';
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

import {
  blockUserHandler,
  unblockUserForCaller,
  unblockUserHandler,
} from '../block-user';
import { loadBlockedUids } from '../../shared/utils/user-blocks';

const BLOCKER = 'blocker-1';
const BLOCKED = 'blocked-1';
const BYSTANDER = 'bystander-1';

const asFirestore = (fake: FakeFirestore): Firestore =>
  fake as unknown as Firestore;

const asRequest = (request: {
  data: unknown;
  auth?: { uid: string; token: Record<string, unknown> };
}): CallableRequest<{ uid?: unknown }> =>
  request as unknown as CallableRequest<{ uid?: unknown }>;

const asBlocker = (uid: unknown): CallableRequest<{ uid?: unknown }> =>
  asRequest({ data: { uid }, auth: { uid: BLOCKER, token: {} } });

describe('blockUserHandler', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    db.seed(`users/${BLOCKER}`, { userId: BLOCKER });
    db.seed(`users/${BLOCKED}`, { userId: BLOCKED });
  });

  it('writes the block on both sides', async () => {
    await expect(blockUserHandler(asBlocker(BLOCKED))).resolves.toEqual({
      blocked: true,
    });

    expect(db.read(`users/${BLOCKER}/blocked/${BLOCKED}`)).toMatchObject({
      blockerUid: BLOCKER,
      blockedUid: BLOCKED,
    });
    expect(db.exists(`users/${BLOCKED}/blockedBy/${BLOCKER}`)).toBe(true);
  });

  it('removes the follow relation in both directions', async () => {
    db.seed(`users/${BLOCKER}/following/${BLOCKED}`, {});
    db.seed(`users/${BLOCKED}/followers/${BLOCKER}`, {});
    db.seed(`users/${BLOCKED}/following/${BLOCKER}`, {});
    db.seed(`users/${BLOCKER}/followers/${BLOCKED}`, {});

    await blockUserHandler(asBlocker(BLOCKED));

    expect(db.exists(`users/${BLOCKER}/following/${BLOCKED}`)).toBe(false);
    expect(db.exists(`users/${BLOCKED}/followers/${BLOCKER}`)).toBe(false);
    expect(db.exists(`users/${BLOCKED}/following/${BLOCKER}`)).toBe(false);
    expect(db.exists(`users/${BLOCKER}/followers/${BLOCKED}`)).toBe(false);
  });

  it('leaves follow relations with anybody else alone', async () => {
    db.seed(`users/${BLOCKER}/following/${BYSTANDER}`, {});
    db.seed(`users/${BLOCKED}/followers/${BYSTANDER}`, {});

    await blockUserHandler(asBlocker(BLOCKED));

    expect(db.exists(`users/${BLOCKER}/following/${BYSTANDER}`)).toBe(true);
    expect(db.exists(`users/${BLOCKED}/followers/${BYSTANDER}`)).toBe(true);
  });

  it('refuses blocking oneself', async () => {
    await expect(blockUserHandler(asBlocker(BLOCKER))).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('refuses a request without a uid', async () => {
    await expect(blockUserHandler(asBlocker(undefined))).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('refuses an account that does not exist', async () => {
    await expect(blockUserHandler(asBlocker('ghost'))).rejects.toMatchObject({
      code: 'not-found',
    });
    expect(db.exists(`users/${BLOCKER}/blocked/ghost`)).toBe(false);
  });

  it('refuses a signed-out caller', async () => {
    await expect(
      blockUserHandler(asRequest({ data: { uid: BLOCKED } })),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('refuses an anonymous table guest', async () => {
    await expect(
      blockUserHandler(
        asRequest({
          data: { uid: BLOCKED },
          auth: {
            uid: BLOCKER,
            token: { firebase: { sign_in_provider: 'anonymous' } },
          },
        }),
      ),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });
});

describe('unblockUserHandler', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    db.seed(`users/${BLOCKER}/blocked/${BLOCKED}`, {});
    db.seed(`users/${BLOCKED}/blockedBy/${BLOCKER}`, {});
  });

  it('removes the block on both sides', async () => {
    await expect(unblockUserHandler(asBlocker(BLOCKED))).resolves.toEqual({
      blocked: false,
    });

    expect(db.exists(`users/${BLOCKER}/blocked/${BLOCKED}`)).toBe(false);
    expect(db.exists(`users/${BLOCKED}/blockedBy/${BLOCKER}`)).toBe(false);
  });

  it('does not restore a follow relation the block removed', async () => {
    await unblockUserForCaller(asFirestore(db), BLOCKER, BLOCKED);

    expect(db.exists(`users/${BLOCKER}/following/${BLOCKED}`)).toBe(false);
  });
});

describe('loadBlockedUids', () => {
  beforeEach(() => {
    db = createFakeFirestore();
  });

  it('returns the accounts the viewer blocked, and no one else’s', async () => {
    db.seed(`users/${BLOCKER}/blocked/${BLOCKED}`, {});
    db.seed(`users/${BYSTANDER}/blocked/${BLOCKER}`, {});

    const blocked = await loadBlockedUids(asFirestore(db), BLOCKER);

    expect([...blocked]).toEqual([BLOCKED]);
  });

  it('returns nothing for a request without a viewer', async () => {
    const blocked = await loadBlockedUids(asFirestore(db), undefined);

    expect(blocked.size).toBe(0);
  });
});
