const updateMock = jest.fn();
const getMock = jest.fn();
const docMock = jest.fn(() => ({ get: getMock, update: updateMock }));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({ doc: docMock })),
}));

const getFilesMock = jest.fn();

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => ({
    bucket: jest.fn(() => ({ getFiles: getFilesMock })),
  })),
}));

jest.mock('../../shared/utils/storage-download-url', () => ({
  storageDownloadUrl: jest.fn(
    async (bucket: string, path: string) => `url:${bucket}/${path}`,
  ),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn() },
}));

jest.mock('firebase-functions/v2/storage', () => ({
  onObjectFinalized: jest.fn((handler) => handler),
}));

import { setUserPhotoUrlOnUpload } from '../set-user-photo-url-on-upload';

const handler = setUserPhotoUrlOnUpload as unknown as (event: {
  data: { name?: string; bucket: string; timeCreated?: string };
}) => Promise<void>;

const NEW_PATH = 'images/users/user-1/new.jpg';

const storedFile = (
  name: string,
  timeCreated: string | undefined,
): { name: string; metadata: { timeCreated?: string }; delete: jest.Mock } => ({
  name,
  metadata: { timeCreated },
  delete: jest.fn().mockResolvedValue(undefined),
});

describe('setUserPhotoUrlOnUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMock.mockResolvedValue({ exists: true });
    getFilesMock.mockResolvedValue([[]]);
  });

  it('points the profile at the new photo and clears the pending status', async () => {
    await handler({
      data: {
        name: NEW_PATH,
        bucket: 'bucket',
        timeCreated: '2026-11-10T12:00:00.000Z',
      },
    });

    expect(docMock).toHaveBeenCalledWith('users/user-1');
    expect(updateMock).toHaveBeenCalledWith({
      photoUrl: `url:bucket/${NEW_PATH}`,
      photoStatus: 'uploaded',
    });
  });

  it('deletes the photos it replaced, and only older ones', async () => {
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

    await handler({
      data: {
        name: NEW_PATH,
        bucket: 'bucket',
        timeCreated: '2026-11-10T12:00:00.000Z',
      },
    });

    expect(getFilesMock).toHaveBeenCalledWith({
      prefix: 'images/users/user-1/',
    });
    expect(older.delete).toHaveBeenCalled();
    expect(newer.delete).not.toHaveBeenCalled();
    expect(unknownAge.delete).not.toHaveBeenCalled();
    expect(self.delete).not.toHaveBeenCalled();
  });

  it('ignores objects outside a user photo folder', async () => {
    await handler({
      data: { name: 'images/bites/bite-1/photo.jpg', bucket: 'bucket' },
    });

    expect(docMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('leaves a missing user alone', async () => {
    getMock.mockResolvedValue({ exists: false });

    await handler({ data: { name: NEW_PATH, bucket: 'bucket' } });

    expect(updateMock).not.toHaveBeenCalled();
    expect(getFilesMock).not.toHaveBeenCalled();
  });
});
