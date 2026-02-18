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
      'mocked-uuid.jpg',
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

  describe('uploadFile callback function', () => {
    describe('given a call', () => {
      describe('and uploadFile on FirebaseStorage is called', () => {
        describe('and its callback function is called with the callback fn defined', () => {
          it('should call the callback fn with the upload params and image path', async () => {
            const callbackFn = jest.fn();

            await uploadBlobToFirebasestorage({
              collection: 'test-collection',
              docId: 'test-doc-id',
              extension: 'jpg',
              blob: new Blob(),
              contentType: 'image/jpeg',
              callbackFn,
            });

            const uploadFileCallback = uploadFileSpy.mock.calls[0][1] as (
              evt: any,
              err: any,
            ) => void;

            const mockEvt = { completed: true };
            const mockErr = null;

            // Called with completed event and no error
            uploadFileCallback(mockEvt, mockErr);

            expect(callbackFn).toHaveBeenCalledWith({
              uploadParams: {
                evt: mockEvt,
                err: mockErr,
                offlineImagePath: 'mocked-file-path',
              },
              imagePath: `images/test-collection/test-doc-id/mocked-uuid.jpg`,
            });

            // Call with an error
            const mockError = new Error('Upload failed');
            uploadFileCallback(null, mockError);

            expect(callbackFn).toHaveBeenCalledWith({
              uploadParams: {
                evt: null,
                err: mockError,
                offlineImagePath: 'mocked-file-path',
              },
              imagePath: `images/test-collection/test-doc-id/mocked-uuid.jpg`,
            });
          });
        });
      });
    });
  });
});
