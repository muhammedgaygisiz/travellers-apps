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
