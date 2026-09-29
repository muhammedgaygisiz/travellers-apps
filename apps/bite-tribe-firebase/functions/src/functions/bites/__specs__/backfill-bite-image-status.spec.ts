import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;

/** Every object in the fake bucket, by full path. */
let objects: Set<string>;

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

interface FakeBucket {
  getFiles(options: { prefix: string }): Promise<[{ name: string }[]]>;
  file(path: string): { exists(): Promise<[boolean]> };
}

const fakeBucket = (): FakeBucket => ({
  getFiles: async ({ prefix }) => [
    [...objects]
      .filter((path) => path.startsWith(prefix))
      .map((name) => ({ name })),
  ],
  file: (path) => ({
    exists: async (): Promise<[boolean]> => [objects.has(path)],
  }),
});

jest.mock('firebase-admin/storage', () => ({
  getStorage: (): { bucket: () => FakeBucket } => ({ bucket: fakeBucket }),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn((handler: unknown) => handler),
}));

import {
  backfillBiteImageStatus,
  backfillBiteImageStatusHandler,
} from '../backfill-bite-image-status';

const downloadUrl = (path: string): string =>
  `https://firebasestorage.googleapis.com/v0/b/bucket/o/${encodeURIComponent(path)}?alt=media`;

const statusOf = (biteId: string): unknown =>
  db.read(`bites/${biteId}`)?.['imageStatus'];

describe('backfillBiteImageStatus', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    objects = new Set();
  });

  it('marks a Bite uploaded when its prefix holds a photo', async () => {
    db.seed('bites/with-photo', { name: 'Margherita' });
    objects.add('images/bites/with-photo/abc.jpg');

    await backfillBiteImageStatus();

    expect(statusOf('with-photo')).toBe('uploaded');
  });

  /**
   * An edited Bite leaves the earlier object behind under a fresh UUID, so
   * `imagePath` may name something gone while the prefix still holds a photo.
   */
  it('trusts the prefix over a stale imagePath', async () => {
    db.seed('bites/edited', {
      imagePath: downloadUrl('images/bites/edited/gone.jpg'),
    });
    objects.add('images/bites/edited/current.jpg');

    await backfillBiteImageStatus();

    expect(statusOf('edited')).toBe('uploaded');
  });

  it('marks a Bite uploaded when imagePath names an object outside the prefix', async () => {
    db.seed('bites/migrated', {
      imagePath: downloadUrl('legacy/migrated.jpg'),
    });
    objects.add('legacy/migrated.jpg');

    await backfillBiteImageStatus();

    expect(statusOf('migrated')).toBe('uploaded');
  });

  it('marks a Bite failed when Storage holds no photo for it', async () => {
    db.seed('bites/lost', {
      imagePath: downloadUrl('images/bites/lost/never.jpg'),
    });
    db.seed('bites/bare', { name: 'Nothing at all' });

    await backfillBiteImageStatus();

    expect(statusOf('lost')).toBe('failed');
    expect(statusOf('bare')).toBe('failed');
  });

  it('leaves a Bite that already has a status alone', async () => {
    db.seed('bites/pending', { imageStatus: 'pending' });
    objects.add('images/bites/pending/abc.jpg');

    const result = await backfillBiteImageStatus();

    expect(statusOf('pending')).toBe('pending');
    expect(result).toEqual({
      inspected: 1,
      uploaded: 0,
      failed: 0,
      skipped: 1,
    });
  });

  it('writes nothing but the status', async () => {
    db.seed('bites/b', { name: 'Margherita', updatedAt: 'then' });

    await backfillBiteImageStatus();

    expect(db.read('bites/b')).toEqual({
      name: 'Margherita',
      updatedAt: 'then',
      imageStatus: 'failed',
    });
  });

  it('reports every count, and changes nothing on a second run', async () => {
    db.seed('bites/a', {});
    db.seed('bites/b', {});
    db.seed('bites/c', { imageStatus: 'uploaded' });
    objects.add('images/bites/a/abc.jpg');

    expect(await backfillBiteImageStatus()).toEqual({
      inspected: 3,
      uploaded: 1,
      failed: 1,
      skipped: 1,
    });

    const before = ['a', 'b', 'c'].map((id) => db.read(`bites/${id}`));

    expect(await backfillBiteImageStatus()).toEqual({
      inspected: 3,
      uploaded: 0,
      failed: 0,
      skipped: 3,
    });
    expect(['a', 'b', 'c'].map((id) => db.read(`bites/${id}`))).toEqual(before);
  });
});

describe('backfillBiteImageStatusHandler', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    objects = new Set();
  });

  it('rejects a caller without the admin role', async () => {
    db.seed('bites/a', {});

    await expect(
      backfillBiteImageStatusHandler({
        auth: { uid: 'member', token: {} },
      } as never),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(statusOf('a')).toBeUndefined();
  });
});
