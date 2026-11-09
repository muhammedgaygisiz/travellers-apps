import type { CallableRequest } from 'firebase-functions/https';
import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import {
  arrayRemove,
  createFakeFirestore,
} from '../../users/__specs__/fake-firestore';

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

import { removeSelfFromBiteTagsHandler } from '../remove-self-from-bite-tags';

const CREATOR = 'creator-1';
const FRIEND = 'friend-1';
const OTHER_FRIEND = 'friend-2';
const BITE = {
  userId: CREATOR,
  name: 'Ramen',
  price: 12,
  taggedUserIds: [FRIEND, OTHER_FRIEND],
};

const asRequest = (request: {
  data: unknown;
  auth?: { uid: string; token: Record<string, unknown> };
}): CallableRequest<{ biteId?: unknown }> =>
  request as unknown as CallableRequest<{ biteId?: unknown }>;

const as = (
  uid: string,
  biteId: unknown = 'bite-1',
): CallableRequest<{ biteId?: unknown }> =>
  asRequest({ data: { biteId }, auth: { uid, token: {} } });

describe('removeSelfFromBiteTagsHandler', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    db.seed('bites/bite-1', BITE);
  });

  it('removes the caller and changes no other field', async () => {
    await expect(removeSelfFromBiteTagsHandler(as(FRIEND))).resolves.toEqual({
      removed: true,
    });

    expect(db.read('bites/bite-1')).toEqual({
      ...BITE,
      taggedUserIds: [OTHER_FRIEND],
    });
  });

  it('refuses a caller who is not tagged and leaves the Bite alone', async () => {
    await expect(
      removeSelfFromBiteTagsHandler(as('stranger')),
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    expect(db.read('bites/bite-1')).toEqual(BITE);
  });

  it('refuses a Bite that does not exist', async () => {
    await expect(
      removeSelfFromBiteTagsHandler(as(FRIEND, 'ghost')),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('refuses a request without a usable biteId', async () => {
    await expect(
      removeSelfFromBiteTagsHandler(as(FRIEND, 'bites/bite-1')),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(
      removeSelfFromBiteTagsHandler(as(FRIEND, '  ')),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('refuses a signed-out caller', async () => {
    await expect(
      removeSelfFromBiteTagsHandler(asRequest({ data: { biteId: 'bite-1' } })),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });
});
