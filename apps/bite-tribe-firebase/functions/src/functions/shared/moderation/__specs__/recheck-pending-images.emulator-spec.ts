import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { DocumentReference, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/**
 * The scheduled recheck against the Firestore and Storage emulators (GitHub
 * issue #2142).
 *
 * `recheck-pending-images.spec.ts` follows a photo through every attempt over
 * an in-memory store; this file holds what that store cannot: that the run's
 * query - a range and an order on `imageCheckNextAt`, with no composite index -
 * finds what is due and nothing else, that its transaction writes, and that
 * the objects it publishes, refuses and fails are real. Only the model is
 * stubbed, because the check outside production never answers `unavailable`.
 */
const checkImageMock = jest.fn();

jest.mock('../check-image', () => ({
  checkImage: (...args: unknown[]): unknown => checkImageMock(...args),
}));

import {
  IMAGE_RECHECK_DELAYS_MS,
  MAX_IMAGE_CHECK_ATTEMPTS,
} from '../checked-image-subjects';
import { recheckPendingImagesAt } from '../recheck-pending-images';

const PROJECT_ID = 'bite-tribe-emulator-tests';
const BUCKET = `${PROJECT_ID}.appspot.com`;
const NOW = Date.parse('2026-11-20T12:00:00.000Z');

const biteRef = (id: string): DocumentReference =>
  getFirestore().collection('bites').doc(id);

const objectExists = async (path: string): Promise<boolean> =>
  (await getStorage().bucket().file(path).exists())[0];

/** A Bite whose photo landed and whose check could not run. */
const seedWaitingBite = async (
  id: string,
  { attempts = 1, nextAt = NOW }: { attempts?: number; nextAt?: number } = {},
): Promise<string> => {
  const path = `images/bites/${id}/photo.jpg`;

  await getStorage()
    .bucket()
    .file(path)
    .save(Buffer.from('jpeg'), { contentType: 'image/jpeg' });
  await biteRef(id).set({
    userId: 'creator-1',
    name: 'Pho',
    imageStatus: 'pending',
    imageCheckAttempts: attempts,
    imageCheckNextAt: nextAt,
    imageCheckPath: path,
  });

  return path;
};

const clear = async (): Promise<void> => {
  const db = getFirestore();

  await Promise.all(
    ['bites', 'users', 'restaurants', 'biteTrails'].map((name) =>
      db.recursiveDelete(db.collection(name)),
    ),
  );
  await getStorage().bucket().deleteFiles({ prefix: 'images/' });
};

describe('recheckPendingImages in the emulators', () => {
  beforeAll(() => {
    if (
      !process.env['FIRESTORE_EMULATOR_HOST'] ||
      !process.env['FIREBASE_STORAGE_EMULATOR_HOST']
    ) {
      throw new Error(
        'recheck emulator specs require the Firestore and Storage emulators.',
      );
    }

    if (!getApps().length) {
      initializeApp({ projectId: PROJECT_ID, storageBucket: BUCKET });
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await clear();
  });

  afterAll(async () => {
    await clear();
    await Promise.all(getApps().map((app) => deleteApp(app)));
  });

  it('finds only what is due and publishes a photo the check passes', async () => {
    const path = await seedWaitingBite('due-bite');
    await seedWaitingBite('later-bite', { nextAt: NOW + 60_000 });
    await biteRef('settled-bite').set({
      userId: 'creator-1',
      imageStatus: 'uploaded',
    });
    checkImageMock.mockResolvedValue({ verdict: 'passed' });

    const summary = await recheckPendingImagesAt(new Date(NOW));

    expect(summary).toMatchObject({ due: 1, passed: 1 });
    expect(checkImageMock).toHaveBeenCalledTimes(1);
    expect(checkImageMock).toHaveBeenCalledWith(expect.anything(), {
      bucket: BUCKET,
      path,
      surface: 'bitePhoto',
      uid: 'creator-1',
    });

    const published = (await biteRef('due-bite').get()).data();

    expect(published?.['imageStatus']).toBe('uploaded');
    expect(published?.['imagePath']).toContain(encodeURIComponent(path));
    expect(published).not.toHaveProperty('imageCheckNextAt');
    expect(published).not.toHaveProperty('imageCheckAttempts');
    expect(published).not.toHaveProperty('imageCheckPath');
    expect((await biteRef('later-bite').get()).get('imageStatus')).toBe(
      'pending',
    );
  });

  it('schedules the next attempt when the check still cannot answer', async () => {
    await seedWaitingBite('waiting-bite');
    checkImageMock.mockResolvedValue({ verdict: 'unavailable' });

    await recheckPendingImagesAt(new Date(NOW));

    const waiting = (await biteRef('waiting-bite').get()).data();

    expect(waiting).toMatchObject({
      imageStatus: 'pending',
      imageCheckAttempts: 2,
      imageCheckNextAt: NOW + IMAGE_RECHECK_DELAYS_MS[1],
    });
  });

  it('deletes a refused photo and marks the Bite refused', async () => {
    const path = await seedWaitingBite('refused-bite');
    checkImageMock.mockResolvedValue({ verdict: 'refused', category: 'hate' });

    await recheckPendingImagesAt(new Date(NOW));

    expect((await biteRef('refused-bite').get()).data()).toMatchObject({
      imageStatus: 'refused',
      imageRefusalCategory: 'hate',
    });
    expect(await objectExists(path)).toBe(false);
  });

  it('deletes the unchecked object and marks the Bite failed after the last attempt', async () => {
    const path = await seedWaitingBite('failed-bite', {
      attempts: MAX_IMAGE_CHECK_ATTEMPTS - 1,
    });
    checkImageMock.mockResolvedValue({ verdict: 'unavailable' });

    await recheckPendingImagesAt(new Date(NOW));

    const failed = (await biteRef('failed-bite').get()).data();

    expect(failed?.['imageStatus']).toBe('failed');
    expect(failed).not.toHaveProperty('imageCheckNextAt');
    expect(await objectExists(path)).toBe(false);
  });
});
