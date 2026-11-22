import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { DocumentReference, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { CallableRequest } from 'firebase-functions/https';

/**
 * The backfill of stored photos against the Firestore and Storage emulators
 * (GitHub issue #2143).
 *
 * The check itself is real: the stage is production, so `checkImage`
 * downloads each object and keeps its verdict in `contentChecks`, and only
 * the model behind it is stubbed. That is what lets these specs count model
 * calls, and prove that a second run asks the model about nothing it judged.
 */
const askModel = jest.fn();

jest.mock('../../utils/gemini', () => ({
  GEMINI_MODEL: 'gemini-test',
  generateWithGemini: (...args: unknown[]): unknown => askModel(...args),
}));

jest.mock('../../utils/deployment-stage', () => ({
  resolveDeploymentStage: (): string => 'production',
}));

import {
  BACKFILL_PAGE_SIZE,
  BACKFILL_TIME_BUDGET_MS,
  imageModerationBackfillHandler,
  ImageModerationBackfillMode,
  ImageModerationBackfillResult,
  MIGRATION_RUNS_COLLECTION,
  runImageModerationBackfill,
} from '../image-moderation-backfill';

const PROJECT_ID = 'bite-tribe-emulator-tests';
const BUCKET = `${PROJECT_ID}.appspot.com`;

/** Bytes the stubbed model refuses; anything else passes. */
const OBJECTIONABLE = 'objectionable';
/** Bytes the stubbed model cannot answer for. */
const UNANSWERABLE = 'unanswerable';

const docRef = (path: string): DocumentReference => getFirestore().doc(path);

const urlOf = (path: string): string =>
  `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=t`;

const objectExists = async (path: string): Promise<boolean> =>
  (await getStorage().bucket().file(path).exists())[0];

/** Stores an object whose bytes say what the stubbed model answers. */
const storeObject = async (path: string, content: string): Promise<string> => {
  await getStorage()
    .bucket()
    .file(path)
    .save(Buffer.from(`${content}:${path}`), { contentType: 'image/jpeg' });

  return path;
};

/** A photo published before the check: stored, and named by its document. */
const seedPublished = async ({
  collection,
  id,
  content = 'food',
  data = {},
}: {
  collection: 'bites' | 'users' | 'restaurants' | 'biteTrails';
  id: string;
  content?: string;
  data?: Record<string, unknown>;
}): Promise<string> => {
  const path = await storeObject(
    `images/${collection}/${id}/photo.jpg`,
    content,
  );
  const urlField = collection === 'users' ? 'photoUrl' : 'imagePath';
  const statusField = collection === 'users' ? 'photoStatus' : 'imageStatus';

  await docRef(`${collection}/${id}`).set({
    [urlField]: urlOf(path),
    [statusField]: 'uploaded',
    ...(collection === 'bites' ? { userId: 'creator-1', name: 'Pho' } : {}),
    ...(collection === 'restaurants' ? { ownerUserIds: ['owner-1'] } : {}),
    ...(collection === 'biteTrails' ? { ownerId: 'owner-1' } : {}),
    ...data,
  });

  return path;
};

/** Calls until the run is complete, as the admin app does. */
const runToEnd = async (
  mode: ImageModerationBackfillMode,
): Promise<ImageModerationBackfillResult> => {
  for (;;) {
    const result = await runImageModerationBackfill({ mode });

    if (result.complete) {
      return result;
    }
  }
};

const modelCallsFor = (path: string): number =>
  askModel.mock.calls.filter(([request]) =>
    Buffer.from(request.image.data, 'base64').toString().endsWith(`:${path}`),
  ).length;

const clear = async (): Promise<void> => {
  const db = getFirestore();

  await Promise.all(
    [
      'bites',
      'users',
      'restaurants',
      'biteTrails',
      'contentChecks',
      MIGRATION_RUNS_COLLECTION,
    ].map((name) => db.recursiveDelete(db.collection(name))),
  );
  await getStorage().bucket().deleteFiles({ prefix: 'images/' });
};

const requestAs = (
  roles: string[],
  mode: ImageModerationBackfillMode,
): CallableRequest<{ mode: ImageModerationBackfillMode }> =>
  ({
    auth: { uid: 'operator-1', token: { roles } },
    data: { mode },
  }) as unknown as CallableRequest<{ mode: ImageModerationBackfillMode }>;

describe('imageModerationBackfill in the emulators', () => {
  beforeAll(() => {
    if (
      !process.env['FIRESTORE_EMULATOR_HOST'] ||
      !process.env['FIREBASE_STORAGE_EMULATOR_HOST']
    ) {
      throw new Error(
        'backfill emulator specs require the Firestore and Storage emulators.',
      );
    }

    if (!getApps().length) {
      initializeApp({ projectId: PROJECT_ID, storageBucket: BUCKET });
    }
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    askModel.mockReset();
    askModel.mockImplementation(
      async ({ image }: { image: { data: string } }) => {
        const content = Buffer.from(image.data, 'base64').toString();

        if (content.startsWith(UNANSWERABLE)) {
          throw new Error('Vertex timed out');
        }

        return {
          json: {
            category: content.startsWith(OBJECTIONABLE) ? 'sexual' : 'none',
          },
        };
      },
    );
    await clear();
  });

  afterAll(async () => {
    await clear();
    await Promise.all(getApps().map((app) => deleteApp(app)));
  });

  it('reports without changing anything, then takes down only what it reported', async () => {
    const goodBite = await seedPublished({ collection: 'bites', id: 'good' });
    const badBite = await seedPublished({
      collection: 'bites',
      id: 'bad',
      content: OBJECTIONABLE,
    });
    const olderBite = await storeObject(
      'images/bites/good/older.jpg',
      OBJECTIONABLE,
    );
    const badProfile = await seedPublished({
      collection: 'users',
      id: 'member-1',
      content: OBJECTIONABLE,
    });
    const badRestaurant = await seedPublished({
      collection: 'restaurants',
      id: 'trattoria',
      content: OBJECTIONABLE,
    });
    const goodTrail = await seedPublished({
      collection: 'biteTrails',
      id: 'trail',
    });

    const report = await runToEnd('report');

    expect(report).toEqual({
      mode: 'report',
      complete: true,
      checked: 5,
      passed: 2,
      refused: 3,
      unavailable: 0,
      skipped: 1,
    });
    // Nothing is taken down, and the older object is never sent.
    for (const path of [badBite, badProfile, badRestaurant, olderBite]) {
      expect(await objectExists(path)).toBe(true);
    }
    expect(modelCallsFor(olderBite)).toBe(0);
    expect((await docRef('bites/bad').get()).get('imageStatus')).toBe(
      'uploaded',
    );
    expect(
      (
        await docRef(
          `${MIGRATION_RUNS_COLLECTION}/image-moderation-report`,
        ).get()
      ).get('refusedTargets'),
    ).toEqual(['bites/bad', 'users/member-1', 'restaurants/trattoria']);

    askModel.mockClear();
    const apply = await runToEnd('apply');

    expect(apply).toMatchObject({ checked: 5, passed: 2, refused: 3 });
    // Every verdict came from what the report judged.
    expect(askModel).not.toHaveBeenCalled();

    for (const path of [badBite, badProfile, badRestaurant]) {
      expect(await objectExists(path)).toBe(false);
    }
    for (const path of [goodBite, goodTrail, olderBite]) {
      expect(await objectExists(path)).toBe(true);
    }

    const bite = (await docRef('bites/bad').get()).data();

    expect(bite).toMatchObject({
      imageStatus: 'refused',
      imageRefusalCategory: 'sexual',
      name: 'Pho',
    });
    expect(bite).not.toHaveProperty('imagePath');
    expect(bite).not.toHaveProperty('updatedAt');
    expect((await docRef('users/member-1').get()).data()).toMatchObject({
      photoUrl: '',
      photoStatus: 'refused',
      photoRefusalCategory: 'sexual',
    });

    const restaurant = (await docRef('restaurants/trattoria').get()).data();

    expect(restaurant).toMatchObject({
      imageStatus: 'refused',
      imageRefusalCategory: 'sexual',
    });
    expect(restaurant).not.toHaveProperty('imagePath');
    expect((await docRef('bites/good').get()).get('imagePath')).toBe(
      urlOf(goodBite),
    );

    // A second run finds the passed photos judged and the refused ones gone.
    askModel.mockClear();
    const again = await runToEnd('apply');

    expect(askModel).not.toHaveBeenCalled();
    expect(again).toMatchObject({ checked: 2, passed: 2, refused: 0 });
  });

  it('refuses to apply before a report run has finished', async () => {
    await seedPublished({
      collection: 'bites',
      id: 'bad',
      content: OBJECTIONABLE,
    });

    await expect(
      runImageModerationBackfill({ mode: 'apply' }),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(await objectExists('images/bites/bad/photo.jpg')).toBe(true);
  });

  it('continues a stopped run from where it stopped', async () => {
    const bites = BACKFILL_PAGE_SIZE + 3;
    const paths: string[] = [];

    for (let index = 0; index < bites; index++) {
      paths.push(
        await seedPublished({
          collection: 'bites',
          id: `bite-${String(index).padStart(3, '0')}`,
        }),
      );
    }
    const profile = await seedPublished({
      collection: 'users',
      id: 'member-1',
    });

    // The first model call uses up the time budget, so the call stops after
    // its first page.
    let clock = 0;
    askModel.mockImplementationOnce(async () => {
      clock = BACKFILL_TIME_BUDGET_MS + 1;

      return { json: { category: 'none' } };
    });

    const first = await runImageModerationBackfill({
      mode: 'report',
      now: () => clock,
    });

    expect(first).toMatchObject({
      complete: false,
      checked: BACKFILL_PAGE_SIZE,
    });
    expect(modelCallsFor(profile)).toBe(0);

    const second = await runImageModerationBackfill({
      mode: 'report',
      now: () => clock,
    });

    expect(second).toMatchObject({
      complete: true,
      checked: bites + 1,
      passed: bites + 1,
    });
    // Each photo was judged once across both calls.
    for (const path of [...paths, profile]) {
      expect(modelCallsFor(path)).toBe(1);
    }
  });

  it('leaves a photo the check cannot answer for published, for a later run', async () => {
    const path = await seedPublished({
      collection: 'bites',
      id: 'unanswered',
      content: UNANSWERABLE,
    });

    await runToEnd('report');
    const apply = await runToEnd('apply');

    expect(apply).toMatchObject({ checked: 1, unavailable: 1, refused: 0 });
    expect(await objectExists(path)).toBe(true);
    expect((await docRef('bites/unanswered').get()).data()).toMatchObject({
      imageStatus: 'uploaded',
      imagePath: urlOf(path),
    });
  });

  it('keeps the status a newer upload is waiting on', async () => {
    const path = await seedPublished({
      collection: 'restaurants',
      id: 'trattoria',
      content: OBJECTIONABLE,
      data: {
        imageStatus: 'pending',
        imageCheckPath: 'images/restaurants/trattoria/newer.jpg',
        imageCheckAttempts: 1,
        imageCheckNextAt: 1,
      },
    });

    await runToEnd('report');
    await runToEnd('apply');

    const restaurant = (await docRef('restaurants/trattoria').get()).data();

    expect(await objectExists(path)).toBe(false);
    expect(restaurant).not.toHaveProperty('imagePath');
    expect(restaurant).toMatchObject({
      imageStatus: 'pending',
      imageCheckPath: 'images/restaurants/trattoria/newer.jpg',
    });
  });

  it('is refused to a caller without the operator role', async () => {
    await expect(
      imageModerationBackfillHandler(requestAs(['business'], 'report')),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('logs one operator action per run, with its counts', async () => {
    await seedPublished({
      collection: 'bites',
      id: 'bad',
      content: OBJECTIONABLE,
    });
    await seedPublished({ collection: 'users', id: 'member-1' });
    const info = jest.spyOn(logger, 'info');

    const result = await imageModerationBackfillHandler(
      requestAs(['admin'], 'report'),
    );

    expect(result).toMatchObject({ complete: true, refused: 1 });

    const operatorEntries = info.mock.calls.filter(([message]) =>
      String(message).startsWith('operator action: imageModerationBackfill'),
    );

    expect(operatorEntries.map(([message]) => message)).toEqual([
      'operator action: imageModerationBackfill started',
      'operator action: imageModerationBackfill succeeded',
    ]);
    expect(operatorEntries[1][1]).toMatchObject({
      operatorAction: 'imageModerationBackfill',
      callerUid: 'operator-1',
      targetType: 'image',
      outcome: 'succeeded',
      details: {
        mode: 'report',
        checked: 2,
        passed: 1,
        refused: 1,
        refusedTargets: ['bites/bad'],
      },
    });
  });

  it('refuses a mode it does not know', async () => {
    await expect(
      imageModerationBackfillHandler({
        ...requestAs(['admin'], 'report'),
        data: { mode: 'delete-everything' },
      } as unknown as CallableRequest<{ mode: ImageModerationBackfillMode }>),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});
