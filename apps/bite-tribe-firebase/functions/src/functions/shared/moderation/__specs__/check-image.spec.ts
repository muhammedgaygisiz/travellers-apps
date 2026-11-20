import type { FakeFirestore } from '../../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../../users/__specs__/fake-firestore';

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../utils/gemini', () => {
  class GeminiUnavailableError extends Error {}

  return {
    GEMINI_MODEL: 'test-model',
    GeminiUnavailableError,
    generateWithGemini: jest.fn(),
  };
});

jest.mock('../../utils/deployment-stage', () => ({
  resolveDeploymentStage: jest.fn(() => 'production'),
}));

const downloadMock = jest.fn();
const getMetadataMock = jest.fn();
const fileMock = jest.fn(() => ({
  download: downloadMock,
  getMetadata: getMetadataMock,
}));
const bucketMock = jest.fn(() => ({ file: fileMock }));

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => ({ bucket: bucketMock })),
}));

import { Firestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { resolveDeploymentStage } from '../../utils/deployment-stage';
import { generateWithGemini, GeminiUnavailableError } from '../../utils/gemini';
import { CONTENT_CHECKS_COLLECTION } from '../check-content';
import {
  checkImage,
  IMAGE_CHECK_TIMEOUT_MS,
  ImageCheckRequest,
  MAX_CHECKED_IMAGE_BYTES,
} from '../check-image';
import { CONTENT_REFUSED_LOG_MESSAGE } from '../content-refusal';

const gemini = generateWithGemini as jest.Mock;
const stage = resolveDeploymentStage as jest.Mock;
const warn = logger.warn as jest.Mock;

let db: FakeFirestore;
const asDb = (): Firestore => db as unknown as Firestore;

const PHOTO_BYTES = Buffer.from('a photo of ceviche');

const request = (
  path = 'images/bites/user-1/photo.jpg',
): ImageCheckRequest => ({
  bucket: 'bucket',
  path,
  surface: 'bitePhoto',
  uid: 'user-1',
});

const refusalLogs = (): unknown[][] =>
  warn.mock.calls.filter(
    ([message]) => message === CONTENT_REFUSED_LOG_MESSAGE,
  );

const storedChecks = async (): Promise<number> =>
  (
    await db
      .collection(CONTENT_CHECKS_COLLECTION)
      .where('subject', '==', 'image')
      .get()
  ).size;

describe('checkImage', () => {
  beforeEach(() => {
    db = createFakeFirestore();
    jest.clearAllMocks();
    stage.mockReturnValue('production');
    getMetadataMock.mockResolvedValue([
      { size: String(PHOTO_BYTES.length), contentType: 'image/webp' },
    ]);
    downloadMock.mockResolvedValue([PHOTO_BYTES]);
  });

  it('refuses an image the model judges objectionable and logs it without image data', async () => {
    gemini.mockResolvedValue({ json: { category: 'violence' } });

    await expect(checkImage(asDb(), request())).resolves.toEqual({
      verdict: 'refused',
      category: 'violence',
    });

    expect(bucketMock).toHaveBeenCalledWith('bucket');
    expect(fileMock).toHaveBeenCalledWith('images/bites/user-1/photo.jpg');
    expect(gemini.mock.calls[0][0].image).toEqual({
      mimeType: 'image/webp',
      data: PHOTO_BYTES.toString('base64'),
    });
    expect(gemini.mock.calls[0][0].timeoutMs).toBe(IMAGE_CHECK_TIMEOUT_MS);

    const logs = refusalLogs();

    expect(logs).toHaveLength(1);
    expect(logs[0][1]).toEqual(
      expect.objectContaining({
        uid: 'user-1',
        surface: 'bitePhoto',
        stage: 'trigger',
        field: 'image',
        source: 'model',
        reason: 'violence',
        storagePath: 'images/bites/user-1/photo.jpg',
      }),
    );
    expect(JSON.stringify(logs[0][1])).not.toContain(
      PHOTO_BYTES.toString('base64'),
    );
  });

  // The stored-photo backfill (issue #2143): its apply pass names itself in
  // the refusal log, and its report pass, which takes nothing down, logs none.
  it('names the stage it ran in, and logs nothing when told not to', async () => {
    gemini.mockResolvedValue({ json: { category: 'hate' } });

    await checkImage(asDb(), { ...request(), stage: 'backfill' });

    expect(refusalLogs()).toHaveLength(1);
    expect(refusalLogs()[0][1]).toEqual(
      expect.objectContaining({ stage: 'backfill', reason: 'hate' }),
    );

    warn.mockClear();

    await expect(
      checkImage(asDb(), { ...request(), recordRefusal: false }),
    ).resolves.toEqual({ verdict: 'refused', category: 'hate' });
    expect(refusalLogs()).toHaveLength(0);
  });

  it('passes an image the model judges acceptable, and logs no refusal', async () => {
    gemini.mockResolvedValue({ json: { category: 'none' } });

    await expect(checkImage(asDb(), request())).resolves.toEqual({
      verdict: 'passed',
    });
    expect(refusalLogs()).toHaveLength(0);
  });

  it('answers the same bytes a second time from contentChecks without the model', async () => {
    gemini.mockResolvedValue({ json: { category: 'sexual' } });

    await checkImage(asDb(), request('images/bites/user-1/first.jpg'));

    await expect(
      checkImage(asDb(), request('images/bites/user-2/copy.jpg')),
    ).resolves.toEqual({ verdict: 'refused', category: 'sexual' });
    expect(gemini).toHaveBeenCalledTimes(1);

    const snapshot = await db
      .collection(CONTENT_CHECKS_COLLECTION)
      .where('subject', '==', 'image')
      .get();

    expect(snapshot.size).toBe(1);
    expect(snapshot.docs[0].id).toMatch(/^[0-9a-f]{64}$/);
    expect(snapshot.docs[0].data()).toEqual(
      expect.objectContaining({ category: 'sexual', model: 'test-model' }),
    );
  });

  it('answers unavailable and keeps nothing when the model errors', async () => {
    gemini.mockRejectedValue(new GeminiUnavailableError('quota'));

    await expect(checkImage(asDb(), request())).resolves.toEqual({
      verdict: 'unavailable',
    });
    expect(await storedChecks()).toBe(0);
    expect(refusalLogs()).toHaveLength(0);
  });

  it('answers unavailable and keeps nothing when the model times out', async () => {
    gemini.mockRejectedValue(
      new DOMException(
        'The operation was aborted due to timeout',
        'TimeoutError',
      ),
    );

    await expect(checkImage(asDb(), request())).resolves.toEqual({
      verdict: 'unavailable',
    });
    expect(await storedChecks()).toBe(0);
  });

  it('answers unavailable when the image cannot be read', async () => {
    downloadMock.mockRejectedValue(new Error('No such object'));

    await expect(checkImage(asDb(), request())).resolves.toEqual({
      verdict: 'unavailable',
    });
    expect(gemini).not.toHaveBeenCalled();
  });

  it('never sends an image larger than the Storage rules allow', async () => {
    getMetadataMock.mockResolvedValue([
      { size: String(MAX_CHECKED_IMAGE_BYTES + 1), contentType: 'image/jpeg' },
    ]);

    await expect(checkImage(asDb(), request())).resolves.toEqual({
      verdict: 'unavailable',
    });
    expect(downloadMock).not.toHaveBeenCalled();
    expect(gemini).not.toHaveBeenCalled();
  });

  it('passes a model answer outside the category list', async () => {
    gemini.mockResolvedValue({ json: { category: 'not_food' } });

    await expect(checkImage(asDb(), request())).resolves.toEqual({
      verdict: 'passed',
    });
  });

  it.each(['qa', 'dev'])(
    'in %s never calls the model and refuses only the refuse-sample marker',
    async (deploymentStage) => {
      stage.mockReturnValue(deploymentStage);

      await expect(
        checkImage(asDb(), request('images/bites/user-1/photo.jpg')),
      ).resolves.toEqual({ verdict: 'passed' });
      await expect(
        checkImage(asDb(), request('images/bites/user-1/my-refuse-sample.jpg')),
      ).resolves.toEqual({ verdict: 'refused', category: 'sample' });
      await expect(
        checkImage(asDb(), request('images/refuse-sample/user-1/photo.jpg')),
      ).resolves.toEqual({ verdict: 'passed' });

      expect(gemini).not.toHaveBeenCalled();
      expect(downloadMock).not.toHaveBeenCalled();

      const logs = refusalLogs();

      expect(logs).toHaveLength(1);
      expect(logs[0][1]).toEqual(
        expect.objectContaining({
          source: 'sample',
          reason: 'sample',
          storagePath: 'images/bites/user-1/my-refuse-sample.jpg',
        }),
      );
    },
  );
});
