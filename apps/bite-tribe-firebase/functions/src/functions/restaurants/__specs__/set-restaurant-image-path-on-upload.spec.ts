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

import { setRestaurantImagePathOnUpload } from '../set-restaurant-image-path-on-upload';

const handler = setRestaurantImagePathOnUpload as unknown as (event: {
  data: { name?: string; bucket: string; timeCreated?: string };
}) => Promise<void>;

const NEW_PATH = 'images/restaurants/restaurant-1/new.jpg';
const FINALIZED_AT = '2026-11-10T12:00:00.000Z';

const upload = (name: string | undefined = NEW_PATH): Promise<void> =>
  handler({
    data: {
      name: name || undefined,
      bucket: 'bucket',
      timeCreated: FINALIZED_AT,
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

/** GitHub issues #2126 and #2141. */
describe('setRestaurantImagePathOnUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMock.mockResolvedValue({
      exists: true,
      data: () => ({ ownerUserIds: ['owner-1', 'owner-2'] }),
    });
    getFilesMock.mockResolvedValue([[]]);
    checkImageMock.mockResolvedValue({ verdict: 'passed' });
  });

  it('checks the photo as a restaurant photo before writing anything', async () => {
    await upload();

    expect(checkImageMock).toHaveBeenCalledWith(expect.anything(), {
      bucket: 'bucket',
      path: NEW_PATH,
      surface: 'restaurantPhoto',
      uid: 'owner-1',
    });
  });

  it('names no uploader for a restaurant nobody holds', async () => {
    getMock.mockResolvedValue({ exists: true, data: () => ({}) });

    await upload();

    expect(checkImageMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ uid: '' }),
    );
  });

  it('publishes a photo the check passed and clears any earlier refusal', async () => {
    await upload();

    expect(docMock).toHaveBeenCalledWith('restaurants/restaurant-1');
    expect(updateMock).toHaveBeenCalledWith({
      imagePath: `url:bucket/${NEW_PATH}`,
      imageStatus: 'uploaded',
      imageRefusalCategory: 'DELETE',
    });
  });

  it('deletes the photos a passed one replaced, and only older ones', async () => {
    const older = storedFile(
      'images/restaurants/restaurant-1/old.jpg',
      '2026-11-10T11:00:00.000Z',
    );
    const newer = storedFile(
      'images/restaurants/restaurant-1/newer.jpg',
      '2026-11-10T12:00:01.000Z',
    );
    const unknownAge = storedFile(
      'images/restaurants/restaurant-1/unknown.jpg',
      undefined,
    );
    const self = storedFile(NEW_PATH, FINALIZED_AT);
    getFilesMock.mockResolvedValue([[older, newer, unknownAge, self]]);

    await upload();

    expect(getFilesMock).toHaveBeenCalledWith({
      prefix: 'images/restaurants/restaurant-1/',
    });
    expect(older.delete).toHaveBeenCalled();
    expect(newer.delete).not.toHaveBeenCalled();
    expect(unknownAge.delete).not.toHaveBeenCalled();
    expect(self.delete).not.toHaveBeenCalled();
  });

  it('deletes a refused photo and keeps the previous imagePath', async () => {
    checkImageMock.mockResolvedValue({
      verdict: 'refused',
      category: 'violence',
    });

    await upload();

    expect(fileMock).toHaveBeenCalledWith(NEW_PATH);
    expect(deleteFileMock).toHaveBeenCalledWith({ ignoreNotFound: true });
    expect(updateMock).toHaveBeenCalledWith({
      imageStatus: 'refused',
      imageRefusalCategory: 'violence',
    });
    expect(updateMock.mock.calls[0][0]).not.toHaveProperty('imagePath');
    // The photo the restaurant still shows is not touched.
    expect(getFilesMock).not.toHaveBeenCalled();
  });

  it('leaves the photo pending when the check is unavailable', async () => {
    checkImageMock.mockResolvedValue({ verdict: 'unavailable' });

    await upload();

    expect(updateMock).toHaveBeenCalledWith({ imageStatus: 'pending' });
    expect(deleteFileMock).not.toHaveBeenCalled();
    expect(getFilesMock).not.toHaveBeenCalled();
  });

  it('ignores objects outside a restaurant photo folder', async () => {
    await upload('images/users/user-1/photo.jpg');

    expect(docMock).not.toHaveBeenCalled();
    expect(checkImageMock).not.toHaveBeenCalled();
  });

  it('ignores an event without an object name', async () => {
    await upload('');

    expect(docMock).not.toHaveBeenCalled();
  });

  it('leaves a missing restaurant alone', async () => {
    getMock.mockResolvedValue({ exists: false });

    await upload();

    expect(checkImageMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(getFilesMock).not.toHaveBeenCalled();
  });
});
