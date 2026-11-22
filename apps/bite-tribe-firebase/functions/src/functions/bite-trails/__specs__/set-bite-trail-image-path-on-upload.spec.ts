const updateMock = jest.fn();
const getMock = jest.fn();
const docMock = jest.fn(() => ({ get: getMock, update: updateMock }));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({ doc: docMock })),
  FieldValue: { delete: jest.fn(() => 'DELETE') },
}));

const getFilesMock = jest.fn();
const deleteFileMock = jest.fn().mockResolvedValue(undefined);
const fileMock = jest.fn(() => ({ delete: deleteFileMock }));

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => ({
    bucket: jest.fn(() => ({ getFiles: getFilesMock, file: fileMock })),
  })),
}));

jest.mock('../../shared/utils/storage-download-url', () => ({
  storageDownloadUrl: jest.fn(
    async (bucket: string, path: string) => `url:${bucket}/${path}`,
  ),
}));

const checkImageMock = jest.fn();

jest.mock('../../shared/moderation/check-image', () => ({
  checkImage: (...args: unknown[]): unknown => checkImageMock(...args),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn() },
}));

jest.mock('firebase-functions/v2/storage', () => ({
  onObjectFinalized: jest.fn((handler) => handler),
}));

import { setBiteTrailImagePathOnUpload } from '../set-bite-trail-image-path-on-upload';

/** The wait on a recheck (issue #2142), cleared by every final verdict. */
const CLEARED_CHECK = {
  imageCheckAttempts: 'DELETE',
  imageCheckNextAt: 'DELETE',
  imageCheckPath: 'DELETE',
};

const NOW = Date.parse('2026-11-20T12:00:00.000Z');
const FIRST_RECHECK_DELAY_MS = 15 * 60 * 1000;

const handler = setBiteTrailImagePathOnUpload as unknown as (event: {
  data: { name?: string; bucket: string; timeCreated?: string };
}) => Promise<void>;

const PATH = 'images/biteTrails/trail-1/photo.jpg';

const upload = (name: string = PATH): Promise<void> =>
  handler({
    data: { name, bucket: 'bucket', timeCreated: '2026-11-20T12:00:00.000Z' },
  });

/** GitHub issue #2141. */
describe('setBiteTrailImagePathOnUpload', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getMock.mockResolvedValue({
      exists: true,
      data: () => ({ ownerId: 'owner-1' }),
    });
    getFilesMock.mockResolvedValue([[]]);
    checkImageMock.mockResolvedValue({ verdict: 'passed' });
  });

  it('checks the photo as a Bite Trail photo of its owner', async () => {
    await upload();

    expect(checkImageMock).toHaveBeenCalledWith(expect.anything(), {
      bucket: 'bucket',
      path: PATH,
      surface: 'biteTrailPhoto',
      uid: 'owner-1',
    });
  });

  it('publishes a photo the check passed and deletes the older ones', async () => {
    await upload();

    expect(docMock).toHaveBeenCalledWith('biteTrails/trail-1');
    expect(updateMock).toHaveBeenCalledWith({
      imagePath: `url:bucket/${PATH}`,
      imageStatus: 'uploaded',
      imageRefusalCategory: 'DELETE',
      ...CLEARED_CHECK,
    });
    expect(getFilesMock).toHaveBeenCalledWith({
      prefix: 'images/biteTrails/trail-1/',
    });
  });

  it('deletes a refused photo and keeps the previous imagePath', async () => {
    checkImageMock.mockResolvedValue({ verdict: 'refused', category: 'hate' });

    await upload();

    expect(fileMock).toHaveBeenCalledWith(PATH);
    expect(deleteFileMock).toHaveBeenCalledWith({ ignoreNotFound: true });
    expect(updateMock).toHaveBeenCalledWith({
      imageStatus: 'refused',
      imageRefusalCategory: 'hate',
      ...CLEARED_CHECK,
    });
  });

  it('leaves the photo pending and schedules a recheck when the check is unavailable', async () => {
    jest.useFakeTimers({ now: NOW });
    checkImageMock.mockResolvedValue({ verdict: 'unavailable' });

    await upload();

    expect(updateMock).toHaveBeenCalledWith({
      imageStatus: 'pending',
      imageCheckAttempts: 1,
      imageCheckNextAt: NOW + FIRST_RECHECK_DELAY_MS,
      imageCheckPath: PATH,
    });
  });

  it('names no uploader for a trail without an owner', async () => {
    getMock.mockResolvedValue({ exists: true, data: () => undefined });

    await upload();

    expect(checkImageMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ uid: '' }),
    );
  });

  it('ignores a restaurant photo', async () => {
    await upload('images/restaurants/restaurant-1/photo.jpg');

    expect(docMock).not.toHaveBeenCalled();
  });

  it('leaves a missing trail alone', async () => {
    getMock.mockResolvedValue({ exists: false });

    await upload();

    expect(checkImageMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
