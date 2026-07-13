import { uploadBlobToFirebasestorage } from '../upload-blob-to-firebasestorage';
import { writeBlobToFileSystem } from '../write-blob-to-file-system';
import { FirebaseStorage } from '@capacitor-firebase/storage';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

jest.mock('../write-blob-to-file-system', () => ({
  writeBlobToFileSystem: jest.fn(() =>
    Promise.resolve({ uri: 'mocked-file-path' }),
  ),
}));

jest.mock('@capacitor-firebase/storage');

describe(uploadBlobToFirebasestorage.name, () => {
  let uploadFileSpy: jest.SpyInstance;

  beforeEach(() => {
    uploadFileSpy = jest.spyOn(FirebaseStorage, 'uploadFile');
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
});
