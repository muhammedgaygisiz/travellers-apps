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

import { setUserPhotoUrlOnUpload } from '../set-user-photo-url-on-upload';

/** The wait on a recheck (issue #2142), cleared by every final verdict. */
const CLEARED_CHECK = {
  imageCheckAttempts: 'DELETE',
  imageCheckNextAt: 'DELETE',
  imageCheckPath: 'DELETE',
};

const NOW = Date.parse('2026-11-20T12:00:00.000Z');
const FIRST_RECHECK_DELAY_MS = 15 * 60 * 1000;

const handler = setUserPhotoUrlOnUpload as unknown as (event: {
  data: { name?: string; bucket: string; timeCreated?: string };
}) => Promise<void>;

const NEW_PATH = 'images/users/user-1/new.jpg';

const upload = (): Promise<void> =>
  handler({
    data: {
      name: NEW_PATH,
      bucket: 'bucket',
      timeCreated: '2026-11-10T12:00:00.000Z',
    },
  });

const storedFile = (
  name: string,
  timeCreated: string | undefined,
): { name: string; metadata: { timeCreated?: string }; delete: jest.Mock } => ({
  name,
  metadata: { timeCreated },
  delete: jest.fn().mockResolvedValue(undefined),
});

describe('setUserPhotoUrlOnUpload', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getMock.mockResolvedValue({ exists: true });
    getFilesMock.mockResolvedValue([[]]);
    checkImageMock.mockResolvedValue({ verdict: 'passed' });
  });

  it('checks the photo as a profile photo of its owner before writing', async () => {
    await upload();

    expect(checkImageMock).toHaveBeenCalledWith(expect.anything(), {
      bucket: 'bucket',
      path: NEW_PATH,
      surface: 'profilePhoto',
      uid: 'user-1',
    });
  });

  it('points the profile at a photo the check passed and clears the pending status', async () => {
    await upload();

    expect(docMock).toHaveBeenCalledWith('users/user-1');
    expect(updateMock).toHaveBeenCalledWith({
      photoUrl: `url:bucket/${NEW_PATH}`,
      photoStatus: 'uploaded',
      photoRefusalCategory: 'DELETE',
      ...CLEARED_CHECK,
    });
  });

  it('deletes the photos a passed photo replaced, and only older ones', async () => {
    const older = storedFile(
      'images/users/user-1/old.jpg',
      '2026-11-10T11:00:00.000Z',
    );
    const newer = storedFile(
      'images/users/user-1/newer.jpg',
      '2026-11-10T12:00:01.000Z',
    );
    const unknownAge = storedFile('images/users/user-1/unknown.jpg', undefined);
    const self = storedFile(NEW_PATH, '2026-11-10T12:00:00.000Z');
    getFilesMock.mockResolvedValue([[older, newer, unknownAge, self]]);

    await upload();

    expect(getFilesMock).toHaveBeenCalledWith({
      prefix: 'images/users/user-1/',
    });
    expect(older.delete).toHaveBeenCalled();
    expect(newer.delete).not.toHaveBeenCalled();
    expect(unknownAge.delete).not.toHaveBeenCalled();
    expect(self.delete).not.toHaveBeenCalled();
  });

  it('deletes a refused photo, keeps the previous one and records the refusal', async () => {
    checkImageMock.mockResolvedValue({ verdict: 'refused', category: 'hate' });

    await upload();

    expect(fileMock).toHaveBeenCalledWith(NEW_PATH);
    expect(deleteFileMock).toHaveBeenCalledWith({ ignoreNotFound: true });
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      photoStatus: 'refused',
      photoRefusalCategory: 'hate',
      ...CLEARED_CHECK,
    });
    expect(updateMock.mock.calls[0][0]).not.toHaveProperty('photoUrl');
  });

  it('leaves the older photos alone when the new one is refused', async () => {
    checkImageMock.mockResolvedValue({ verdict: 'refused', category: 'hate' });
    const older = storedFile(
      'images/users/user-1/old.jpg',
      '2026-11-10T11:00:00.000Z',
    );
    getFilesMock.mockResolvedValue([[older]]);

    await upload();

    expect(getFilesMock).not.toHaveBeenCalled();
    expect(older.delete).not.toHaveBeenCalled();
  });

  it('keeps the photo pending and schedules a recheck when the check is unavailable', async () => {
    jest.useFakeTimers({ now: NOW });
    checkImageMock.mockResolvedValue({ verdict: 'unavailable' });

    await upload();

    expect(updateMock).toHaveBeenCalledWith({
      photoStatus: 'pending',
      imageCheckAttempts: 1,
      imageCheckNextAt: NOW + FIRST_RECHECK_DELAY_MS,
      imageCheckPath: NEW_PATH,
    });
    expect(updateMock.mock.calls[0][0]).not.toHaveProperty('photoUrl');
    expect(deleteFileMock).not.toHaveBeenCalled();
    expect(getFilesMock).not.toHaveBeenCalled();
  });

  it('ignores objects outside a user photo folder', async () => {
    await handler({
      data: { name: 'images/bites/bite-1/photo.jpg', bucket: 'bucket' },
    });

    expect(docMock).not.toHaveBeenCalled();
    expect(checkImageMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('leaves a missing user alone', async () => {
    getMock.mockResolvedValue({ exists: false });

    await handler({ data: { name: NEW_PATH, bucket: 'bucket' } });

    expect(checkImageMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(getFilesMock).not.toHaveBeenCalled();
  });
});
