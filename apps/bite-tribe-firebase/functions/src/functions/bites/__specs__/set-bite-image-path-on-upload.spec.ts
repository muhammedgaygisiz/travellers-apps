const updateMock = jest.fn();
const getMock = jest.fn();
const docMock = jest.fn(() => ({ get: getMock, update: updateMock }));
const collectionMock = jest.fn(() => ({ doc: docMock }));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({ collection: collectionMock })),
  FieldValue: {
    delete: jest.fn(() => 'DELETE'),
    serverTimestamp: jest.fn(() => 'NOW'),
  },
}));

const deleteFileMock = jest.fn().mockResolvedValue(undefined);
const fileMock = jest.fn(() => ({ delete: deleteFileMock }));

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => ({ bucket: jest.fn(() => ({ file: fileMock })) })),
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

import { setBiteImagePathOnUpload } from '../set-bite-image-path-on-upload';

const handler = setBiteImagePathOnUpload as unknown as (event: {
  data: { name?: string; bucket: string };
}) => Promise<void>;

const PATH = 'images/bites/bite-1/photo.jpg';

const upload = (name: string | undefined = PATH): Promise<void> =>
  handler({ data: { name, bucket: 'bucket' } });

describe('setBiteImagePathOnUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMock.mockResolvedValue({
      exists: true,
      data: () => ({ userId: 'user-1' }),
    });
    checkImageMock.mockResolvedValue({ verdict: 'passed' });
  });

  it('checks the photo as a Bite photo of its creator before writing', async () => {
    await upload();

    expect(checkImageMock).toHaveBeenCalledWith(expect.anything(), {
      bucket: 'bucket',
      path: PATH,
      surface: 'bitePhoto',
      uid: 'user-1',
    });
  });

  it('publishes a photo the check passed, as before', async () => {
    await upload();

    expect(docMock).toHaveBeenCalledWith('bite-1');
    expect(updateMock).toHaveBeenCalledWith({
      imagePath: `url:bucket/${PATH}`,
      image: '',
      imageStatus: 'uploaded',
      imageRefusalCategory: 'DELETE',
      updatedAt: 'NOW',
    });
    expect(deleteFileMock).not.toHaveBeenCalled();
  });

  it('deletes a refused photo and marks the Bite refused without a URL', async () => {
    checkImageMock.mockResolvedValue({
      verdict: 'refused',
      category: 'violence',
    });

    await upload();

    expect(fileMock).toHaveBeenCalledWith(PATH);
    expect(deleteFileMock).toHaveBeenCalledWith({ ignoreNotFound: true });
    expect(updateMock).toHaveBeenCalledWith({
      imagePath: 'DELETE',
      image: '',
      imageStatus: 'refused',
      imageRefusalCategory: 'violence',
      updatedAt: 'NOW',
    });
  });

  it('leaves the Bite pending when the check is unavailable', async () => {
    checkImageMock.mockResolvedValue({ verdict: 'unavailable' });

    await upload();

    expect(updateMock).not.toHaveBeenCalled();
    expect(deleteFileMock).not.toHaveBeenCalled();
  });

  it('ignores objects outside the Bite image folder', async () => {
    await upload('images/users/user-1/photo.jpg');

    expect(checkImageMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('does nothing for a Bite that no longer exists', async () => {
    getMock.mockResolvedValue({ exists: false, data: () => undefined });

    await upload();

    expect(checkImageMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
