import type { Firestore } from 'firebase-admin/firestore';
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
}));

import {
  syncDisplayNameCopies,
  syncDisplayNameCopiesOnUserUpdate,
} from '../sync-display-name-copies';

const UID = 'user-1';

/**
 * The fake stands in for the admin Firestore. It implements only the surface the
 * sync uses, so the cast is deliberate rather than a gap in the typing.
 */
const asFirestore = (fake: FakeFirestore): Firestore =>
  fake as unknown as Firestore;

const entry = (
  userId: string,
  displayName: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  userId,
  displayName,
  photoUrl: '',
  public: true,
  biteCount: 3,
  ...extra,
});

describe('syncDisplayNameCopies', () => {
  beforeEach(() => {
    db = createFakeFirestore();
  });

  it('renames the user in both leaderboard snapshots and leaves the others alone', async () => {
    db.seed('meta/leaderboard', {
      users: [entry('other', 'Other'), entry(UID, 'Old Name')],
      updatedAt: 'then',
    });
    db.seed('meta/leaderboardDaily', {
      users: [entry(UID, 'Old Name'), entry('other', 'Other')],
    });

    await syncDisplayNameCopies(asFirestore(db), UID, 'New Name');

    expect(db.read('meta/leaderboard')).toEqual({
      users: [entry('other', 'Other'), entry(UID, 'New Name')],
      updatedAt: 'then',
    });
    expect(db.read('meta/leaderboardDaily')?.['users']).toEqual([
      entry(UID, 'New Name'),
      entry('other', 'Other'),
    ]);
  });

  it('does not give a non-public leaderboard entry a name', async () => {
    db.seed('meta/leaderboard', {
      users: [entry(UID, '', { public: false })],
    });

    await syncDisplayNameCopies(asFirestore(db), UID, 'New Name');

    expect(db.read('meta/leaderboard')?.['users']).toEqual([
      entry(UID, '', { public: false }),
    ]);
  });

  it('drops retired fields when it rewrites a snapshot', async () => {
    db.seed('meta/leaderboardDaily', {
      users: [entry(UID, 'Old Name', { email: 'old@example.com' })],
    });

    await syncDisplayNameCopies(asFirestore(db), UID, 'New Name');

    expect(db.read('meta/leaderboardDaily')?.['users']).toEqual([
      entry(UID, 'New Name'),
    ]);
  });

  it("rewrites the author on the user's reviews only", async () => {
    db.seed('reviews/r1', { authorId: UID, author: 'Old Name', review: 'a' });
    db.seed('reviews/r2', { authorId: UID, author: 'Old Name', review: 'b' });
    db.seed('reviews/r3', { authorId: 'other', author: 'Other', review: 'c' });

    await syncDisplayNameCopies(asFirestore(db), UID, 'New Name');

    expect(db.read('reviews/r1')).toEqual({
      authorId: UID,
      author: 'New Name',
      review: 'a',
    });
    expect(db.read('reviews/r2')?.['author']).toBe('New Name');
    expect(db.read('reviews/r3')?.['author']).toBe('Other');
  });

  it("rewrites the owner name on the user's Bite Trails only", async () => {
    db.seed('biteTrails/t1', { ownerId: UID, ownerName: 'Old Name' });
    db.seed('biteTrails/t2', { ownerId: 'other', ownerName: 'Other' });

    await syncDisplayNameCopies(asFirestore(db), UID, 'New Name');

    expect(db.read('biteTrails/t1')?.['ownerName']).toBe('New Name');
    expect(db.read('biteTrails/t2')?.['ownerName']).toBe('Other');
  });

  it('writes nothing when there is no copy to fix', async () => {
    await syncDisplayNameCopies(asFirestore(db), UID, 'New Name');

    expect(db.exists('meta/leaderboard')).toBe(false);
    expect(db.exists('meta/leaderboardDaily')).toBe(false);
  });
});

describe('syncDisplayNameCopiesOnUserUpdate', () => {
  const handler = syncDisplayNameCopiesOnUserUpdate as unknown as (event: {
    params: { uid: string };
    data: {
      before: { data: () => Record<string, unknown> };
      after: { data: () => Record<string, unknown> };
    };
  }) => Promise<void>;

  const event = (
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): Parameters<typeof handler>[0] => ({
    params: { uid: UID },
    data: { before: { data: () => before }, after: { data: () => after } },
  });

  beforeEach(() => {
    db = createFakeFirestore();
    db.seed('reviews/r1', { authorId: UID, author: 'Old Name' });
  });

  it('syncs the copies when the display name changed', async () => {
    await handler(
      event({ displayName: 'Old Name' }, { displayName: 'New Name' }),
    );

    expect(db.read('reviews/r1')?.['author']).toBe('New Name');
  });

  it('ignores an update that leaves the display name as it was', async () => {
    await handler(
      event(
        { displayName: 'Old Name', lastSeen: 'then' },
        { displayName: 'Old Name ', lastSeen: 'now' },
      ),
    );

    expect(db.read('reviews/r1')?.['author']).toBe('Old Name');
  });
});
