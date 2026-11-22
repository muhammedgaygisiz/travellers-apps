/**
 * The scheduled recheck of images whose check could not run (GitHub issue
 * #2142). Firestore is an in-memory store, so a photo can be followed through
 * the upload trigger and every run after it.
 */

type Data = Record<string, unknown>;

const DELETE = 'DELETE';
const SERVER_NOW = 'SERVER_NOW';

const store = new Map<string, Data>();

const applyUpdate = (path: string, update: Data): void => {
  const next = { ...(store.get(path) ?? {}) };

  for (const [key, value] of Object.entries(update)) {
    if (value === DELETE) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }

  store.set(path, next);
};

interface FakeSnapshot {
  id: string;
  exists: boolean;
  ref: { path: string };
  data: () => Data | undefined;
  get: (field: string) => unknown;
}

interface FakeRef {
  path: string;
  get: () => Promise<FakeSnapshot>;
  update: (update: Data) => Promise<void>;
}

interface FakeQuery {
  where: (field: string, op: string, value: number) => FakeQuery;
  orderBy: () => FakeQuery;
  limit: (count: number) => FakeQuery;
  get: () => Promise<{ docs: FakeSnapshot[] }>;
}

interface FakeTransaction {
  get: (ref: { path: string }) => Promise<FakeSnapshot>;
  update: (ref: { path: string }, update: Data) => void;
}

const snapshotOf = (path: string): FakeSnapshot => {
  const data = store.get(path);
  const id = path.slice(path.indexOf('/') + 1);

  return {
    id,
    exists: data !== undefined,
    ref: { path },
    data: (): Data | undefined => (data ? { ...data } : undefined),
    get: (field: string): unknown => data?.[field],
  };
};

const refOf = (path: string): FakeRef => ({
  path,
  get: async (): Promise<FakeSnapshot> => snapshotOf(path),
  update: async (update: Data): Promise<void> => applyUpdate(path, update),
});

const nextAtOf = (path: string): number =>
  Number(store.get(path)?.['imageCheckNextAt']);

/** The documents of `collection` due by `bound`, as the run's query reads them. */
const queryOf = (collection: string): FakeQuery => {
  let bound = Number.POSITIVE_INFINITY;
  let max = Number.POSITIVE_INFINITY;
  const query: FakeQuery = {
    where: (_field, _op, value): FakeQuery => {
      bound = value;
      return query;
    },
    orderBy: (): FakeQuery => query,
    limit: (count): FakeQuery => {
      max = count;
      return query;
    },
    get: async (): Promise<{ docs: FakeSnapshot[] }> => ({
      docs: [...store.keys()]
        .filter((path) => path.startsWith(`${collection}/`))
        .filter((path) => {
          const nextAt = store.get(path)?.['imageCheckNextAt'];

          return typeof nextAt === 'number' && nextAt <= bound;
        })
        .sort((a, b) => nextAtOf(a) - nextAtOf(b))
        .slice(0, max)
        .map(snapshotOf),
    }),
  };

  return query;
};

/** Lets a spec change the document while the model is being asked. */
let beforeTransaction: (() => void) | undefined;

const firestore = {
  collection: (
    collection: string,
  ): FakeQuery & { doc: (id: string) => FakeRef } => ({
    ...queryOf(collection),
    doc: (id: string): FakeRef => refOf(`${collection}/${id}`),
  }),
  doc: refOf,
  runTransaction: async <T>(
    handler: (transaction: FakeTransaction) => Promise<T>,
  ): Promise<T> => {
    beforeTransaction?.();
    beforeTransaction = undefined;

    return handler({
      get: async (ref): Promise<FakeSnapshot> => snapshotOf(ref.path),
      update: (ref, update): void => applyUpdate(ref.path, update),
    });
  },
};

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => firestore),
  FieldValue: {
    delete: jest.fn(() => DELETE),
    serverTimestamp: jest.fn(() => SERVER_NOW),
  },
}));

/** The objects in the bucket, by path, with their creation time. */
const objects = new Map<string, string>();
const deletedObjects: string[] = [];

interface FakeFile {
  name: string;
  metadata: { timeCreated?: string };
  exists: () => Promise<[boolean]>;
  getMetadata: () => Promise<[{ timeCreated?: string }]>;
  delete: () => Promise<void>;
}

const fileOf = (path: string): FakeFile => ({
  name: path,
  metadata: { timeCreated: objects.get(path) },
  exists: async (): Promise<[boolean]> => [objects.has(path)],
  getMetadata: async (): Promise<[{ timeCreated?: string }]> => [
    { timeCreated: objects.get(path) },
  ],
  delete: async (): Promise<void> => {
    objects.delete(path);
    deletedObjects.push(path);
  },
});

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => ({
    bucket: jest.fn(() => ({
      name: 'bucket',
      file: fileOf,
      getFiles: async ({
        prefix,
      }: {
        prefix: string;
      }): Promise<[FakeFile[]]> => [
        [...objects.keys()]
          .filter((path) => path.startsWith(prefix))
          .map(fileOf),
      ],
    })),
  })),
}));

jest.mock('../../utils/storage-download-url', () => ({
  storageDownloadUrl: jest.fn(
    async (bucket: string, path: string) => `url:${bucket}/${path}`,
  ),
}));

const checkImageMock = jest.fn();

jest.mock('../check-image', () => ({
  checkImage: (...args: unknown[]): unknown => checkImageMock(...args),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn() },
}));

jest.mock('firebase-functions/scheduler', () => ({
  onSchedule: jest.fn((_options, handler) => handler),
}));

jest.mock('firebase-functions/v2/storage', () => ({
  onObjectFinalized: jest.fn((handler) => handler),
}));

import { setBiteImagePathOnUpload } from '../../../bites/set-bite-image-path-on-upload';
import { setUserPhotoUrlOnUpload } from '../../../users/set-user-photo-url-on-upload';
import { setRestaurantImagePathOnUpload } from '../../../restaurants/set-restaurant-image-path-on-upload';
import { setBiteTrailImagePathOnUpload } from '../../../bite-trails/set-bite-trail-image-path-on-upload';
import { isListableBite } from '../../utils/bite-listability';
import {
  IMAGE_RECHECK_DELAYS_MS,
  MAX_IMAGE_CHECK_ATTEMPTS,
} from '../checked-image-subjects';
import {
  IMAGE_RECHECKS_PER_RUN,
  RecheckSummary,
  recheckPendingImages,
  recheckPendingImagesAt,
} from '../recheck-pending-images';

type UploadHandler = (event: {
  data: { name: string; bucket: string; timeCreated?: string };
}) => Promise<void>;

const UPLOADED_AT = Date.parse('2026-11-20T12:00:00.000Z');
const MINUTE = 60 * 1000;

const BITE_PATH = 'images/bites/bite-1/photo.jpg';

/** Uploads an object through its finalize trigger while the model is down. */
const uploadWhileDown = async (
  trigger: unknown,
  path: string,
  at: number = UPLOADED_AT,
): Promise<void> => {
  objects.set(path, new Date(at).toISOString());
  checkImageMock.mockResolvedValueOnce({ verdict: 'unavailable' });
  jest.setSystemTime(at);

  await (trigger as UploadHandler)({
    data: {
      name: path,
      bucket: 'bucket',
      timeCreated: new Date(at).toISOString(),
    },
  });
};

/** A run at the moment the photo's next attempt is due. */
const runWhenDue = (path: string): Promise<RecheckSummary> =>
  recheckPendingImagesAt(new Date(nextAtOf(path)));

const bite = (): Data => store.get('bites/bite-1') ?? {};

describe('recheckPendingImages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    store.clear();
    objects.clear();
    deletedObjects.length = 0;
    beforeTransaction = undefined;

    store.set('bites/bite-1', { userId: 'creator-1', imageStatus: 'pending' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs as a schedule over every collection', async () => {
    await uploadWhileDown(setBiteImagePathOnUpload, BITE_PATH);
    jest.setSystemTime(UPLOADED_AT + 15 * 60 * 1000);
    checkImageMock.mockResolvedValueOnce({ verdict: 'passed' });

    await (recheckPendingImages as unknown as () => Promise<void>)();

    expect(bite()['imageStatus']).toBe('uploaded');
  });

  it('settles the bound at six rechecks over about 16 hours', () => {
    expect(MAX_IMAGE_CHECK_ATTEMPTS).toBe(7);
    expect(IMAGE_RECHECK_DELAYS_MS.reduce((sum, delay) => sum + delay, 0)).toBe(
      (15 + 30 + 60 + 120 + 240 + 480) * MINUTE,
    );
  });

  it('records on the Bite when the photo is to be checked again', async () => {
    await uploadWhileDown(setBiteImagePathOnUpload, BITE_PATH);

    expect(bite()).toEqual({
      userId: 'creator-1',
      imageStatus: 'pending',
      imageCheckAttempts: 1,
      imageCheckNextAt: UPLOADED_AT + 15 * MINUTE,
      imageCheckPath: BITE_PATH,
    });
  });

  it('does not check a photo before its attempt is due', async () => {
    await uploadWhileDown(setBiteImagePathOnUpload, BITE_PATH);

    const summary = await recheckPendingImagesAt(
      new Date(UPLOADED_AT + 14 * MINUTE),
    );

    expect(summary.due).toBe(0);
    expect(checkImageMock).toHaveBeenCalledTimes(1);
  });

  it('checks a waiting photo again and publishes it on a pass, as the upload trigger would', async () => {
    await uploadWhileDown(setBiteImagePathOnUpload, BITE_PATH);
    checkImageMock.mockResolvedValueOnce({ verdict: 'passed' });

    const summary = await runWhenDue('bites/bite-1');

    expect(checkImageMock).toHaveBeenLastCalledWith(firestore, {
      bucket: 'bucket',
      path: BITE_PATH,
      surface: 'bitePhoto',
      uid: 'creator-1',
    });
    expect(bite()).toEqual({
      userId: 'creator-1',
      imagePath: `url:bucket/${BITE_PATH}`,
      image: '',
      imageStatus: 'uploaded',
      updatedAt: SERVER_NOW,
    });
    expect(isListableBite(bite())).toBe(true);
    expect(summary).toMatchObject({ due: 1, passed: 1 });
  });

  it('applies a refusal on a recheck as the upload trigger would', async () => {
    await uploadWhileDown(setBiteImagePathOnUpload, BITE_PATH);
    checkImageMock.mockResolvedValueOnce({
      verdict: 'refused',
      category: 'violence',
    });

    const summary = await runWhenDue('bites/bite-1');

    expect(deletedObjects).toEqual([BITE_PATH]);
    expect(bite()).toEqual({
      userId: 'creator-1',
      image: '',
      imageStatus: 'refused',
      imageRefusalCategory: 'violence',
      updatedAt: SERVER_NOW,
    });
    expect(summary).toMatchObject({ due: 1, refused: 1 });
  });

  it('backs off between attempts and marks the photo failed after the last', async () => {
    await uploadWhileDown(setBiteImagePathOnUpload, BITE_PATH);
    checkImageMock.mockResolvedValue({ verdict: 'unavailable' });

    const waits: number[] = [];
    let previous = UPLOADED_AT;

    for (let attempt = 2; attempt <= MAX_IMAGE_CHECK_ATTEMPTS; attempt += 1) {
      const nextAt = Number(bite()['imageCheckNextAt']);

      waits.push(nextAt - previous);
      previous = nextAt;

      await runWhenDue('bites/bite-1');

      // Not listable at any point before a pass.
      expect(isListableBite(bite())).toBe(false);
    }

    expect(waits).toEqual(IMAGE_RECHECK_DELAYS_MS);
    expect(checkImageMock).toHaveBeenCalledTimes(MAX_IMAGE_CHECK_ATTEMPTS);
    expect(bite()).toEqual({ userId: 'creator-1', imageStatus: 'failed' });
    // The unchecked object goes, as it does when the client's upload fails.
    expect(deletedObjects).toEqual([BITE_PATH]);

    const after = await recheckPendingImagesAt(
      new Date(previous + 24 * 60 * MINUTE),
    );

    expect(after.due).toBe(0);
  });

  it('keeps the Bite unlistable through every attempt until the pass', async () => {
    await uploadWhileDown(setBiteImagePathOnUpload, BITE_PATH);
    checkImageMock
      .mockResolvedValueOnce({ verdict: 'unavailable' })
      .mockResolvedValueOnce({ verdict: 'unavailable' })
      .mockResolvedValueOnce({ verdict: 'passed' });

    const states: unknown[] = [bite()['imageStatus']];

    for (let run = 0; run < 3; run += 1) {
      await runWhenDue('bites/bite-1');
      states.push(bite()['imageStatus']);
    }

    expect(states).toEqual(['pending', 'pending', 'pending', 'uploaded']);
    expect(bite()['imageCheckAttempts']).toBeUndefined();
  });

  it('checks at most its bound in one run and leaves the rest for the next', async () => {
    const total = IMAGE_RECHECKS_PER_RUN + 3;

    for (let index = 0; index < total; index += 1) {
      store.set(`bites/bite-${index}`, {
        userId: 'creator-1',
        imageStatus: 'pending',
      });
      await uploadWhileDown(
        setBiteImagePathOnUpload,
        `images/bites/bite-${index}/photo.jpg`,
        UPLOADED_AT + index,
      );
    }

    checkImageMock.mockClear();
    checkImageMock.mockResolvedValue({ verdict: 'passed' });
    const runAt = new Date(UPLOADED_AT + 30 * MINUTE);

    const first = await recheckPendingImagesAt(runAt);

    expect(first.due).toBe(IMAGE_RECHECKS_PER_RUN);
    expect(checkImageMock).toHaveBeenCalledTimes(IMAGE_RECHECKS_PER_RUN);
    // The oldest waited longest, so they are checked first.
    expect(store.get(`bites/bite-${total - 1}`)?.['imageStatus']).toBe(
      'pending',
    );
    expect(store.get('bites/bite-0')?.['imageStatus']).toBe('uploaded');

    const second = await recheckPendingImagesAt(runAt);

    expect(second.due).toBe(3);
    expect(store.get(`bites/bite-${total - 1}`)?.['imageStatus']).toBe(
      'uploaded',
    );
  });

  it('takes the oldest across collections, so one backlog cannot starve another', async () => {
    for (let index = 0; index < IMAGE_RECHECKS_PER_RUN; index += 1) {
      store.set(`bites/bite-${index}`, {
        userId: 'creator-1',
        imageStatus: 'pending',
      });
      await uploadWhileDown(
        setBiteImagePathOnUpload,
        `images/bites/bite-${index}/photo.jpg`,
        UPLOADED_AT + MINUTE + index,
      );
    }

    store.set('users/user-1', { photoStatus: 'pending', photoUrl: 'old' });
    await uploadWhileDown(
      setUserPhotoUrlOnUpload,
      'images/users/user-1/new.jpg',
      UPLOADED_AT,
    );
    checkImageMock.mockResolvedValue({ verdict: 'passed' });

    await recheckPendingImagesAt(new Date(UPLOADED_AT + 30 * MINUTE));

    expect(store.get('users/user-1')?.['photoStatus']).toBe('uploaded');
    expect(
      store.get(`bites/bite-${IMAGE_RECHECKS_PER_RUN - 1}`)?.['imageStatus'],
    ).toBe('pending');
  });

  it('publishes a profile photo on a recheck and removes the photo it replaced', async () => {
    objects.set('images/users/user-1/old.jpg', '2026-11-01T00:00:00.000Z');
    store.set('users/user-1', {
      photoStatus: 'pending',
      photoUrl: 'url:old',
    });
    await uploadWhileDown(
      setUserPhotoUrlOnUpload,
      'images/users/user-1/new.jpg',
    );
    checkImageMock.mockResolvedValueOnce({ verdict: 'passed' });

    await runWhenDue('users/user-1');

    expect(checkImageMock).toHaveBeenLastCalledWith(
      firestore,
      expect.objectContaining({ surface: 'profilePhoto', uid: 'user-1' }),
    );
    expect(store.get('users/user-1')).toEqual({
      photoStatus: 'uploaded',
      photoUrl: 'url:bucket/images/users/user-1/new.jpg',
    });
    expect(deletedObjects).toEqual(['images/users/user-1/old.jpg']);
  });

  it('keeps the previous profile photo when the last attempt fails', async () => {
    store.set('users/user-1', { photoStatus: 'pending', photoUrl: 'url:old' });
    await uploadWhileDown(
      setUserPhotoUrlOnUpload,
      'images/users/user-1/new.jpg',
    );
    checkImageMock.mockResolvedValue({ verdict: 'unavailable' });

    for (let attempt = 2; attempt <= MAX_IMAGE_CHECK_ATTEMPTS; attempt += 1) {
      await runWhenDue('users/user-1');
    }

    expect(store.get('users/user-1')).toEqual({
      photoStatus: 'failed',
      photoUrl: 'url:old',
    });
  });

  it.each([
    [
      'restaurant',
      setRestaurantImagePathOnUpload,
      'restaurants/restaurant-1',
      { ownerUserIds: ['owner-1'] },
      'restaurantPhoto',
      'owner-1',
    ],
    [
      'Bite Trail',
      setBiteTrailImagePathOnUpload,
      'biteTrails/trail-1',
      { ownerId: 'owner-2' },
      'biteTrailPhoto',
      'owner-2',
    ],
  ])(
    'publishes a %s photo on a recheck',
    async (_label, trigger, docPath, data, surface, uid) => {
      const path = `images/${docPath}/photo.jpg`;

      store.set(docPath, { ...data, imagePath: 'url:old' });
      await uploadWhileDown(trigger, path);

      expect(store.get(docPath)?.['imageStatus']).toBe('pending');

      checkImageMock.mockResolvedValueOnce({ verdict: 'passed' });
      await runWhenDue(docPath);

      expect(checkImageMock).toHaveBeenLastCalledWith(
        firestore,
        expect.objectContaining({ path, surface, uid }),
      );
      expect(store.get(docPath)).toEqual({
        ...data,
        imagePath: `url:bucket/${path}`,
        imageStatus: 'uploaded',
      });
    },
  );

  it('marks the photo failed at once when its object is gone', async () => {
    await uploadWhileDown(setBiteImagePathOnUpload, BITE_PATH);
    objects.delete(BITE_PATH);

    const summary = await runWhenDue('bites/bite-1');

    expect(checkImageMock).toHaveBeenCalledTimes(1);
    expect(bite()).toEqual({ userId: 'creator-1', imageStatus: 'failed' });
    expect(summary).toMatchObject({ failed: 1 });
  });

  it('counts a recheck that throws as one more attempt that could not answer', async () => {
    await uploadWhileDown(setBiteImagePathOnUpload, BITE_PATH);
    checkImageMock.mockRejectedValueOnce(new Error('download failed'));

    const summary = await runWhenDue('bites/bite-1');

    expect(bite()).toMatchObject({
      imageStatus: 'pending',
      imageCheckAttempts: 2,
    });
    expect(summary).toMatchObject({ waiting: 1 });
  });

  it.each([
    ['a pass', { verdict: 'passed' }, 1],
    ['a refusal', { verdict: 'refused', category: 'hate' }, 1],
    ['another unavailable', { verdict: 'unavailable' }, 1],
    ['the last unavailable', { verdict: 'unavailable' }, 6],
  ])(
    'does not overwrite what a newer upload decided while the model was asked, on %s',
    async (_label, verdict, attempts) => {
      await uploadWhileDown(setBiteImagePathOnUpload, BITE_PATH);
      store.set('bites/bite-1', {
        ...bite(),
        imageCheckAttempts: attempts,
      });
      checkImageMock.mockResolvedValueOnce(verdict);
      beforeTransaction = (): void => {
        store.set('bites/bite-1', {
          userId: 'creator-1',
          imageStatus: 'uploaded',
          imagePath: 'url:newer',
        });
      };

      const summary = await runWhenDue('bites/bite-1');

      expect(bite()).toEqual({
        userId: 'creator-1',
        imageStatus: 'uploaded',
        imagePath: 'url:newer',
      });
      expect(summary).toMatchObject({ due: 1, skipped: 1 });
    },
  );

  it('leaves a photo whose write failed for the next run', async () => {
    await uploadWhileDown(setBiteImagePathOnUpload, BITE_PATH);
    checkImageMock.mockResolvedValueOnce({ verdict: 'passed' });
    beforeTransaction = (): void => {
      throw new Error('contention');
    };

    const summary = await runWhenDue('bites/bite-1');

    expect(bite()).toMatchObject({
      imageStatus: 'pending',
      imageCheckAttempts: 1,
    });
    expect(summary).toMatchObject({ skipped: 1 });
  });

  it('drops the wait on a photo its uploader already gave up on', async () => {
    await uploadWhileDown(setBiteImagePathOnUpload, BITE_PATH);
    store.set('bites/bite-1', { ...bite(), imageStatus: 'failed' });

    const summary = await runWhenDue('bites/bite-1');

    expect(checkImageMock).toHaveBeenCalledTimes(1);
    expect(bite()).toEqual({ userId: 'creator-1', imageStatus: 'failed' });
    expect(summary).toMatchObject({ dropped: 1 });
  });

  it('never checks an object outside the document folder', async () => {
    store.set('bites/bite-1', {
      userId: 'creator-1',
      imageStatus: 'pending',
      imageCheckAttempts: 1,
      imageCheckNextAt: UPLOADED_AT,
      imageCheckPath: 'images/bites/someone-else/photo.jpg',
    });

    const summary = await recheckPendingImagesAt(new Date(UPLOADED_AT));

    expect(checkImageMock).not.toHaveBeenCalled();
    expect(bite()).toEqual({ userId: 'creator-1', imageStatus: 'pending' });
    expect(summary).toMatchObject({ dropped: 1 });
  });
});
