import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import {
  arrayRemove,
  createFakeFirestore,
} from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;

const getFilesMock = jest.fn();
const deleteFileMock = jest.fn();
const fileMock = jest.fn();

jest.mock('firebase-admin/storage', () => ({
  getStorage: (): unknown => ({
    bucket: (): unknown => ({
      getFiles: getFilesMock,
      file: fileMock,
    }),
  }),
}));

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
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn((handler) => handler),
}));

import { logger } from 'firebase-functions';
import {
  deleteBiteAsOperatorHandler,
  storagePathFromDownloadUrl,
} from '../delete-bite-as-operator';

const ADMIN_UID = 'admin-uid';
const AUTHOR_UID = 'author-uid';
const BITE_ID = 'bite-1';
const REASON = 'Reported as advertising, ticket 88.';

interface TestRequest {
  auth?: { uid: string; token: { roles?: unknown } };
  data: unknown;
}

type Handler = typeof deleteBiteAsOperatorHandler;

const handle = (request: TestRequest): ReturnType<Handler> =>
  deleteBiteAsOperatorHandler(request as Parameters<Handler>[0]);

const callerWith = (roles: unknown, uid = ADMIN_UID): TestRequest => ({
  auth: { uid, token: { roles } },
  data: {},
});

const request = (
  data: unknown,
  caller = callerWith(['admin']),
): TestRequest => ({ ...caller, data });

const validData = (over: Record<string, unknown> = {}): unknown => ({
  biteId: BITE_ID,
  reason: REASON,
  ...over,
});

const codeOf = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise;
  } catch (error) {
    return (error as { code: string }).code;
  }

  throw new Error('Expected the handler to reject, but it resolved.');
};

/** A stored object, as `bucket.getFiles` hands them back. */
const storedFile = (name: string): unknown => ({ name });

const seedBite = (over: Record<string, unknown> = {}): void => {
  db.seed(`bites/${BITE_ID}`, {
    name: 'Pad Thai',
    place: 'Bangkok Street Food',
    userId: AUTHOR_UID,
    imagePath: `https://firebasestorage.googleapis.com/v0/b/bucket/o/${encodeURIComponent(
      `images/bites/${BITE_ID}/abc.jpg`,
    )}?alt=media&token=t`,
    ...over,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  db = createFakeFirestore();
  getFilesMock.mockResolvedValue([[]]);
  deleteFileMock.mockResolvedValue(undefined);
  fileMock.mockImplementation(() => ({ delete: deleteFileMock }));
});

describe('deleteBiteAsOperator authorization', () => {
  it('rejects an unauthenticated caller', async () => {
    seedBite();

    expect(await codeOf(handle({ data: validData() }))).toBe('unauthenticated');
    expect(db.exists(`bites/${BITE_ID}`)).toBe(true);
  });

  it('rejects a signed-in caller holding no roles', async () => {
    seedBite();

    const code = await codeOf(
      handle(request(validData(), callerWith(undefined))),
    );

    expect(code).toBe('permission-denied');
    expect(db.exists(`bites/${BITE_ID}`)).toBe(true);
  });

  // A restaurant holds `business`. Deleting the Bite that named it is exactly
  // what this gate exists to refuse.
  it('rejects a caller holding only the business role', async () => {
    seedBite();

    const code = await codeOf(
      handle(request(validData(), callerWith(['business']))),
    );

    expect(code).toBe('permission-denied');
    expect(db.exists(`bites/${BITE_ID}`)).toBe(true);
  });

  it('accepts a caller holding the admin role', async () => {
    seedBite();

    await expect(handle(request(validData()))).resolves.toMatchObject({
      biteId: BITE_ID,
    });
  });
});

describe('deleteBiteAsOperator input', () => {
  it.each([[undefined], [''], ['   '], [42]])(
    'rejects the biteId %p',
    async (biteId) => {
      seedBite();

      expect(await codeOf(handle(request(validData({ biteId }))))).toBe(
        'invalid-argument',
      );
      expect(db.exists(`bites/${BITE_ID}`)).toBe(true);
    },
  );

  // Cloud Logging is the only record the deletion leaves, and the Bite cannot
  // be restored, so an entry that does not say why is not worth reading later.
  it.each([[undefined], [''], ['   '], [42], [null]])(
    'rejects the reason %p',
    async (reason) => {
      seedBite();

      expect(await codeOf(handle(request(validData({ reason }))))).toBe(
        'invalid-argument',
      );
      expect(db.exists(`bites/${BITE_ID}`)).toBe(true);
    },
  );

  it('rejects a reason longer than 500 characters', async () => {
    seedBite();

    const code = await codeOf(
      handle(request(validData({ reason: 'x'.repeat(501) }))),
    );

    expect(code).toBe('invalid-argument');
    expect(db.exists(`bites/${BITE_ID}`)).toBe(true);
  });

  it('accepts a reason of exactly 500 characters', async () => {
    seedBite();

    await expect(
      handle(request(validData({ reason: 'x'.repeat(500) }))),
    ).resolves.toMatchObject({ biteId: BITE_ID });
  });

  it('trims the biteId before resolving the Bite', async () => {
    seedBite();

    await handle(request(validData({ biteId: `  ${BITE_ID}  ` })));

    expect(db.exists(`bites/${BITE_ID}`)).toBe(false);
  });
});

describe('deleteBiteAsOperator missing Bite', () => {
  // A mistyped id has to be a clean refusal, not a cascade that half-runs over
  // a Bite that never existed.
  it('reports an unknown Bite as not-found', async () => {
    expect(await codeOf(handle(request(validData({ biteId: 'ghost' }))))).toBe(
      'not-found',
    );
  });

  it('touches neither Storage nor the log', async () => {
    await codeOf(handle(request(validData({ biteId: 'ghost' }))));

    expect(getFilesMock).not.toHaveBeenCalled();
    expect(deleteFileMock).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('leaves the likes and reviews of other Bites alone', async () => {
    db.seed('bites/other/likes/liker', { userId: 'liker' });
    db.seed('reviews/r1', { biteId: '/bites/other', review: 'Great' });

    await codeOf(handle(request(validData({ biteId: 'ghost' }))));

    expect(db.exists('bites/other/likes/liker')).toBe(true);
    expect(db.exists('reviews/r1')).toBe(true);
  });
});

describe('deleteBiteAsOperator cascade', () => {
  it('deletes the Bite document', async () => {
    seedBite();

    await handle(request(validData()));

    expect(db.exists(`bites/${BITE_ID}`)).toBe(false);
  });

  // Firestore does not delete a subcollection with its parent, so likes left
  // behind would be documents under a path nothing resolves.
  it('deletes the likes hanging off the Bite', async () => {
    seedBite();
    db.seed(`bites/${BITE_ID}/likes/liker-1`, { likeType: 'thumbup' });
    db.seed(`bites/${BITE_ID}/likes/liker-2`, { likeType: 'drooling' });
    db.seed('bites/other/likes/liker-3', { likeType: 'thumbup' });

    const result = await handle(request(validData()));

    expect(result.deletedLikes).toBe(2);
    expect(db.exists(`bites/${BITE_ID}/likes/liker-1`)).toBe(false);
    expect(db.exists(`bites/${BITE_ID}/likes/liker-2`)).toBe(false);
    expect(db.exists('bites/other/likes/liker-3')).toBe(true);
  });

  // Replies carry the same `biteId` as their root, so one query takes whole
  // threads.
  it('deletes every review and reply written on the Bite', async () => {
    seedBite();
    db.seed('reviews/root', {
      biteId: `/bites/${BITE_ID}`,
      review: 'Not food',
    });
    db.seed('reviews/reply', {
      biteId: `/bites/${BITE_ID}`,
      threadId: 'root',
      parentReviewId: 'root',
      review: 'Agreed',
    });
    db.seed('reviews/elsewhere', { biteId: '/bites/other', review: 'Nice' });

    const result = await handle(request(validData()));

    expect(result.deletedReviews).toBe(2);
    expect(db.exists('reviews/root')).toBe(false);
    expect(db.exists('reviews/reply')).toBe(false);
    expect(db.exists('reviews/elsewhere')).toBe(true);
  });

  // The bare id is the shape the read path does not query, so such a review is
  // already invisible in the app and would be left behind as text about a Bite
  // nobody can open.
  it('deletes a review that stored the bare id rather than the path', async () => {
    seedBite();
    db.seed('reviews/bare', { biteId: BITE_ID, review: 'Old shape' });

    const result = await handle(request(validData()));

    expect(result.deletedReviews).toBe(1);
    expect(db.exists('reviews/bare')).toBe(false);
  });

  it('reports a Bite with nothing hanging off it as an empty cascade', async () => {
    seedBite({ imagePath: '' });

    await expect(handle(request(validData()))).resolves.toEqual({
      biteId: BITE_ID,
      deletedLikes: 0,
      deletedReviews: 0,
      deletedImages: 0,
      updatedRestaurantCandidates: 0,
      updatedBucketlists: 0,
      updatedBiteTrails: 0,
    });
  });
});

describe('deleteBiteAsOperator images', () => {
  // An orphaned object costs money forever, and on an improper Bite it may be
  // the very content being removed.
  it('deletes every object under the Bite prefix', async () => {
    // Two uploads under one prefix is an edited Bite: the current object, which
    // `imagePath` also names, and the one it replaced.
    seedBite();
    getFilesMock.mockResolvedValue([
      [
        storedFile(`images/bites/${BITE_ID}/abc.jpg`),
        storedFile(`images/bites/${BITE_ID}/replaced.jpg`),
      ],
    ]);

    const result = await handle(request(validData()));

    expect(getFilesMock).toHaveBeenCalledWith({
      prefix: `images/bites/${BITE_ID}/`,
    });
    expect(result.deletedImages).toBe(2);
    expect(fileMock).toHaveBeenCalledWith(`images/bites/${BITE_ID}/abc.jpg`);
    expect(fileMock).toHaveBeenCalledWith(
      `images/bites/${BITE_ID}/replaced.jpg`,
    );
  });

  // The prefix listing and `imagePath` overlap on the current object, and the
  // set is what makes deleting it twice impossible.
  it('does not repeat the object the imagePath names', async () => {
    seedBite();
    getFilesMock.mockResolvedValue([
      [storedFile(`images/bites/${BITE_ID}/abc.jpg`)],
    ]);

    const result = await handle(request(validData()));

    expect(result.deletedImages).toBe(1);
    expect(deleteFileMock).toHaveBeenCalledTimes(1);
  });

  // A Bite whose image predates the prefix, or was migrated into place, has an
  // object the prefix listing never returns.
  it('deletes an image that lives outside the prefix', async () => {
    seedBite({
      imagePath: `https://firebasestorage.googleapis.com/v0/b/bucket/o/${encodeURIComponent(
        'images/legacy/old.jpg',
      )}?alt=media`,
    });

    const result = await handle(request(validData()));

    expect(result.deletedImages).toBe(1);
    expect(fileMock).toHaveBeenCalledWith('images/legacy/old.jpg');
  });

  // The object whose survival would actually be visible must not depend on the
  // listing returning it — a wrong bucket or a failed listing is exactly how it
  // would be left behind, and nothing downstream would say so.
  it('deletes the named object even when the prefix lists nothing', async () => {
    seedBite();
    getFilesMock.mockResolvedValue([[]]);

    const result = await handle(request(validData()));

    expect(result.deletedImages).toBe(1);
    expect(fileMock).toHaveBeenCalledWith(`images/bites/${BITE_ID}/abc.jpg`);
  });

  it('ignores an imagePath that is not a download URL', async () => {
    seedBite({ imagePath: 'data:image/jpeg;base64,AAAA' });

    const result = await handle(request(validData()));

    expect(result.deletedImages).toBe(0);
    expect(deleteFileMock).not.toHaveBeenCalled();
  });

  it('tolerates an object that is already gone', async () => {
    seedBite();
    getFilesMock.mockResolvedValue([
      [storedFile(`images/bites/${BITE_ID}/one.jpg`)],
    ]);

    await handle(request(validData()));

    expect(deleteFileMock).toHaveBeenCalledWith({ ignoreNotFound: true });
  });
});

describe('storagePathFromDownloadUrl', () => {
  it('decodes the object path out of a download URL', () => {
    expect(
      storagePathFromDownloadUrl(
        'https://firebasestorage.googleapis.com/v0/b/b/o/images%2Fbites%2Fb1%2Fx.jpg?alt=media&token=t',
      ),
    ).toBe('images/bites/b1/x.jpg');
  });

  it('reads an emulator URL the same way', () => {
    expect(
      storagePathFromDownloadUrl(
        'http://localhost:9199/v0/b/b/o/images%2Fbites%2Fb1%2Fx.jpg?alt=media',
      ),
    ).toBe('images/bites/b1/x.jpg');
  });

  it.each([[undefined], [''], [42], ['data:image/png;base64,AA']])(
    'returns nothing for %p',
    (value) => {
      expect(storagePathFromDownloadUrl(value)).toBeUndefined();
    },
  );
});

describe('deleteBiteAsOperator restaurant candidates', () => {
  // `verifyRestaurantCandidate` already tolerates a missing Bite so a deletion
  // cannot wedge a candidate in `pending`. What it does not do is remove the
  // id, and `evidence.biteCount` is the length of that array.
  it('drops the Bite from the candidates that cited it', async () => {
    seedBite();
    db.seed('restaurantCandidates/candidate-1', {
      name: 'Bangkok Street Food',
      status: 'pending',
      biteIds: [BITE_ID, 'bite-2'],
      evidence: { biteCount: 2, placeNames: { 'bangkok street food': 2 } },
    });

    const result = await handle(request(validData()));

    expect(result.updatedRestaurantCandidates).toBe(1);
    expect(db.read('restaurantCandidates/candidate-1')).toMatchObject({
      biteIds: ['bite-2'],
      evidence: { biteCount: 1, placeNames: { 'bangkok street food': 2 } },
      status: 'pending',
    });
  });

  it('leaves a candidate that never named the Bite alone', async () => {
    seedBite();
    db.seed('restaurantCandidates/candidate-2', {
      biteIds: ['bite-2'],
      evidence: { biteCount: 1, placeNames: {} },
    });

    const result = await handle(request(validData()));

    expect(result.updatedRestaurantCandidates).toBe(0);
    expect(db.read('restaurantCandidates/candidate-2')).toMatchObject({
      biteIds: ['bite-2'],
      evidence: { biteCount: 1 },
    });
  });

  // The candidate has to stay verifiable afterwards, which means it stays
  // `pending` with an evidence count that matches what is left.
  it('leaves a candidate whose only Bite was deleted verifiable', async () => {
    seedBite();
    db.seed('restaurantCandidates/candidate-3', {
      status: 'pending',
      biteIds: [BITE_ID],
      evidence: { biteCount: 1, placeNames: {} },
    });

    await handle(request(validData()));

    expect(db.read('restaurantCandidates/candidate-3')).toMatchObject({
      status: 'pending',
      biteIds: [],
      evidence: { biteCount: 0 },
    });
  });
});

describe('deleteBiteAsOperator bucket lists and BiteTrails', () => {
  // `loadBitesByBucketlist` resolves each id and its filter cannot drop a
  // missing one, so a stale id renders as a nameless, imageless Bite.
  it('drops the Bite from every bucket list holding it', async () => {
    seedBite();
    db.seed('bucketlists/list-1', {
      userId: 'someone',
      biteIds: [BITE_ID, 'bite-2'],
    });

    const result = await handle(request(validData()));

    expect(result.updatedBucketlists).toBe(1);
    expect(db.read('bucketlists/list-1')).toMatchObject({
      biteIds: ['bite-2'],
    });
  });

  it('drops the record of having tried the Bite out', async () => {
    seedBite();
    db.seed('bucketlists/list-2', {
      biteIds: [BITE_ID],
      triedOutBites: [
        { biteId: BITE_ID, date: '2026-01-01', timestamp: 1 },
        { biteId: 'bite-2', date: '2026-01-02', timestamp: 2 },
      ],
    });

    await handle(request(validData()));

    expect(db.read('bucketlists/list-2')).toMatchObject({
      biteIds: [],
      triedOutBites: [{ biteId: 'bite-2', date: '2026-01-02', timestamp: 2 }],
    });
  });

  it('drops the Bite from every BiteTrail listing it', async () => {
    seedBite();
    db.seed('biteTrails/trail-1', {
      ownerId: 'owner',
      biteIds: ['bite-2', BITE_ID],
      soldCount: 3,
    });

    const result = await handle(request(validData()));

    expect(result.updatedBiteTrails).toBe(1);
    expect(db.read('biteTrails/trail-1')).toMatchObject({
      biteIds: ['bite-2'],
      soldCount: 3,
    });
  });

  it('leaves a bucket list and a BiteTrail that never held it alone', async () => {
    seedBite();
    db.seed('bucketlists/list-3', { biteIds: ['bite-2'] });
    db.seed('biteTrails/trail-2', { biteIds: ['bite-2'] });

    const result = await handle(request(validData()));

    expect(result.updatedBucketlists).toBe(0);
    expect(result.updatedBiteTrails).toBe(0);
    expect(db.read('bucketlists/list-3')).toEqual({ biteIds: ['bite-2'] });
    expect(db.read('biteTrails/trail-2')).toEqual({ biteIds: ['bite-2'] });
  });
});

describe('deleteBiteAsOperator logging', () => {
  // Cloud Logging is the audit trail for every operator action in epic #1471,
  // so one query has to answer what was done to a Bite.
  it('logs actor, target, reason and outcome in the shared shape', async () => {
    seedBite();
    db.seed(`bites/${BITE_ID}/likes/liker-1`, { likeType: 'thumbup' });
    db.seed('reviews/root', {
      biteId: `/bites/${BITE_ID}`,
      review: 'Not food',
    });

    await handle(request(validData()));

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('deleteBiteAsOperator'),
      expect.objectContaining({
        operatorAction: 'deleteBiteAsOperator',
        callerUid: ADMIN_UID,
        callerRoles: ['admin'],
        targetType: 'bite',
        targetId: BITE_ID,
        outcome: 'succeeded',
        reason: REASON,
        details: expect.objectContaining({
          deletedLikes: 1,
          deletedReviews: 1,
          authorUid: AUTHOR_UID,
          name: 'Pad Thai',
        }),
      }),
    );
  });

  // A `started` with no matching `succeeded` is a crashed operator action,
  // which is exactly what an audit trail should still show.
  it('brackets the cascade with a started entry', async () => {
    seedBite();

    await handle(request(validData()));

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('deleteBiteAsOperator'),
      expect.objectContaining({ outcome: 'started', reason: REASON }),
    );
  });

  // The Bite is gone, so the entry is the only place its image survives as a
  // reference — and the image is often the content that had to come down.
  it('names the Storage objects it removed', async () => {
    seedBite();
    getFilesMock.mockResolvedValue([
      [storedFile(`images/bites/${BITE_ID}/abc.jpg`)],
    ]);

    await handle(request(validData()));

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('deleteBiteAsOperator'),
      expect.objectContaining({
        outcome: 'succeeded',
        details: expect.objectContaining({
          imagePaths: [`images/bites/${BITE_ID}/abc.jpg`],
        }),
      }),
    );
  });

  it('does not log a refused deletion', async () => {
    seedBite();

    await codeOf(handle(request(validData(), callerWith(['business']))));

    expect(logger.info).not.toHaveBeenCalled();
  });
});
