import { uploadBlobToFirebasestorage } from '../upload-blob-to-firebasestorage';
import { writeBlobToFileSystem } from '../write-blob-to-file-system';
import { FirebaseStorage } from '@capacitor-firebase/storage';
import { Capacitor } from '@capacitor/core';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

jest.mock('../write-blob-to-file-system', () => ({
  writeBlobToFileSystem: jest.fn(() =>
    Promise.resolve({ uri: 'mocked-file-path' }),
  ),
}));

jest.mock('@capacitor-firebase/storage');

// Spread the real module: other Capacitor plugins reach through it for
// `registerPlugin` while this file is loading, and a bare object breaks them.
jest.mock('@capacitor/core', () => ({
  ...jest.requireActual('@capacitor/core'),
  Capacitor: { isNativePlatform: jest.fn(() => false) },
}));

const isNativePlatform = Capacitor.isNativePlatform as jest.Mock;
const writeBlobToFileSystemMock = writeBlobToFileSystem as jest.Mock;

describe(uploadBlobToFirebasestorage.name, () => {
  let uploadFileSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    uploadFileSpy = jest.spyOn(FirebaseStorage, 'uploadFile');
    isNativePlatform.mockReturnValue(false);
    writeBlobToFileSystemMock.mockResolvedValue({ uri: 'mocked-file-path' });
  });

  it('should build all file upload options, write file to file system and call upload to firebase', async () => {
    const imagePath = await uploadBlobToFirebasestorage({
      collection: 'test-collection',
      docId: 'test-doc-id',
      extension: 'jpg',
      blob: new Blob(),
      contentType: 'image/jpeg',
    });

    expect(writeBlobToFileSystem).toHaveBeenCalledWith(
      new Blob(),
      'test-collection_test-doc-id.jpg',
    );

    expect(imagePath).toBe(
      `images/test-collection/test-doc-id/mocked-uuid.jpg`,
    );

    expect(uploadFileSpy).toHaveBeenCalledWith(
      {
        blob: new Blob(),
        metadata: {
          contentType: 'image/jpeg',
          cacheControl: 'public,max-age=31536000,immutable',
        },
        path: 'images/test-collection/test-doc-id/mocked-uuid.jpg',
        uri: 'mocked-file-path',
      },
      expect.any(Function),
    );
  });

  // The local copy feeds the gallery; on web the blob above is what actually
  // gets uploaded. Losing a cache entry must not cost the user their photo -
  // that conflation is what made a denied write take the whole save down.
  // See GitHub issue #1229.
  it('should still upload on web when the local copy cannot be written', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    writeBlobToFileSystemMock.mockRejectedValue(new Error('write denied'));

    const imagePath = await uploadBlobToFirebasestorage({
      collection: 'test-collection',
      docId: 'test-doc-id',
      extension: 'jpg',
      blob: new Blob(),
      contentType: 'image/jpeg',
    });

    expect(imagePath).toBe(
      'images/test-collection/test-doc-id/mocked-uuid.jpg',
    );
    expect(uploadFileSpy).toHaveBeenCalledWith(
      expect.not.objectContaining({ uri: expect.anything() }),
      expect.any(Function),
    );
  });

  // The native plugin uploads from a file URI and rejects with "uri must be
  // provided" without one, so there the copy is load-bearing and its failure
  // has to travel rather than be swallowed into a silent no-op.
  it('should fail on a device when the local copy cannot be written', async () => {
    isNativePlatform.mockReturnValue(true);
    writeBlobToFileSystemMock.mockRejectedValue(new Error('write denied'));

    await expect(
      uploadBlobToFirebasestorage({
        collection: 'test-collection',
        docId: 'test-doc-id',
        extension: 'jpg',
        blob: new Blob(),
        contentType: 'image/jpeg',
      }),
    ).rejects.toThrow('write denied');

    expect(uploadFileSpy).not.toHaveBeenCalled();
  });
});
