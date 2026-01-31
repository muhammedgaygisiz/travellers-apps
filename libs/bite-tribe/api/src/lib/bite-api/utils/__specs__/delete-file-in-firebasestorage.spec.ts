import { deleteFileInFirebaseStorage } from '../delete-file-in-firebasestorage';
import { FirebaseStorage } from '@capacitor-firebase/storage';

jest.mock('@capacitor-firebase/storage');

describe('deleteFileInFirebaseStorage', () => {
  let deleteFileSpy: jest.SpyInstance;

  beforeEach(() => {
    deleteFileSpy = jest
      .spyOn(FirebaseStorage, 'deleteFile')
      .mockResolvedValue(Promise.resolve());
  });

  it('should call FirebaseStorage.deleteFile', async () => {
    const SLASH = '%2F';
    const NECESSARY_PATH_FOR_FIREBASE_STORAGE_DELETE_FILE_FUNCTION =
      'images' + SLASH + 'photo.jpg';

    await deleteFileInFirebaseStorage(
      'https://firebasestorage.googleapis.com/v0/b/bucket/o/' +
        NECESSARY_PATH_FOR_FIREBASE_STORAGE_DELETE_FILE_FUNCTION +
        '?alt=media',
    );

    expect(deleteFileSpy).toHaveBeenCalledTimes(1);
  });
});
