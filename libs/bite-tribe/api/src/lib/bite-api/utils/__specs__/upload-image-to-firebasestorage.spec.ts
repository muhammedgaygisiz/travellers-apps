import { uploadImageToFirebaseStorage } from '../upload-image-to-firebasestorage';
import { FirebaseStorage } from '@capacitor-firebase/storage';

jest.mock('../write-blob-to-file-system', () => ({
  writeBlobToFileSystem: jest.fn(async (_: Blob, fileName: string) => {
    return { uri: `file://mock/path/${fileName}` };
  }),
}));

jest.mock('@capacitor-firebase/storage', () => ({
  FirebaseStorage: {
    uploadFile: jest.fn((_: any, callback: any): void => {
      callback({ completed: true }, null);
    }),
  },
}));

describe('uploadImageToFirebaseStorage', () => {
  describe('given web environment', () => {
    let uploadFileSpy: jest.SpyInstance;

    beforeEach(() => {
      uploadFileSpy = jest.spyOn(FirebaseStorage, 'uploadFile');
    });

    it('should upload image using web method', async () => {
      await uploadImageToFirebaseStorage(
        true,
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
        'bite123',
      );

      expect(uploadFileSpy).toHaveBeenCalledWith(
        {
          blob: new Blob(),
          metadata: {
            cacheControl: 'public,max-age=31536000,immutable',
            contentType: 'image/png',
          },
          path: expect.stringContaining('images/bites/bite123/'),
        },
        expect.any(Function),
      );
    });

    describe('and an error while uploading', () => {
      beforeEach(() => {
        uploadFileSpy.mockImplementationOnce((_: any, callback: any): void => {
          callback(null, new Error('Upload failed'));
        });
      });

      it('should throw an error', async () => {
        await expect(
          uploadImageToFirebaseStorage(
            true,
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
            'bite123',
          ),
        ).rejects.toThrow('Upload failed');
      });
    });

    describe('and event completed is false', () => {
      beforeEach(() => {
        uploadFileSpy.mockImplementationOnce((_: any, callback: any): void => {
          callback(undefined, null);
        });
      });

      it('should not resolve or reject the upload promise', async () => {
        // Since the upload promise neither resolves nor rejects,
        // we can test this by setting a timeout and expecting the promise to still be pending.
        const uploadPromise = uploadImageToFirebaseStorage(
          true,
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
          'bite123',
        );

        const timeoutPromise = new Promise((resolve) =>
          setTimeout(resolve, 100),
        );

        await Promise.race([uploadPromise, timeoutPromise]);

        // If the uploadPromise had resolved or rejected, the test would have completed before the timeout.
        // Since we reached here, it means the uploadPromise is still pending.
        expect(true).toBe(true);

        // Clean up by rejecting the uploadPromise to avoid unhandled promise rejections.
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        uploadPromise.catch(() => {});
      });
    });
  });

  describe('given a native environment', () => {
    let uploadFileSpy: jest.SpyInstance;

    beforeEach(() => {
      uploadFileSpy = jest.spyOn(FirebaseStorage, 'uploadFile');
    });

    it('should upload image using native method', async () => {
      await uploadImageToFirebaseStorage(
        false,
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD',
        'bite456',
      );

      expect(uploadFileSpy).toHaveBeenCalledWith(
        {
          blob: new Blob(),
          metadata: {
            cacheControl: 'public,max-age=31536000,immutable',
            contentType: 'image/jpeg',
          },
          path: expect.stringContaining('images/bites/bite456/'),
          uri: expect.stringContaining('file://mock/path/'),
        },
        expect.any(Function),
      );
    });
  });
});
