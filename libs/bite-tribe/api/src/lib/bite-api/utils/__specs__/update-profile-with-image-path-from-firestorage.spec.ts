import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { updateProfileWithImagePathFromFirebaseStorage } from '../update-profile-with-image-path-from-firestorage';
import { getDownloadUrlFromFirebaseStorage } from 'utils';

jest.mock('@capacitor-firebase/firestore');

jest.mock('utils', () => ({
  getDownloadUrlFromFirebaseStorage: jest
    .fn()
    .mockResolvedValue('download-url'),
}));

describe(updateProfileWithImagePathFromFirebaseStorage.name, () => {
  it('should upload image and update profile', async () => {
    const result = await updateProfileWithImagePathFromFirebaseStorage(
      'photo-url',
      {
        displayName: 'display-name',
        email: 'email',
        userId: 'user-id',
      },
      'user-id',
    );

    expect(getDownloadUrlFromFirebaseStorage).toHaveBeenCalledWith('photo-url');

    expect(FirebaseFirestore.updateDocument).toHaveBeenCalledWith({
      reference: 'users/user-id',
      data: {
        displayName: 'display-name',
        email: 'email',
        userId: 'user-id',
        photoUrl: 'download-url',
      },
    });

    expect(result).toEqual({
      displayName: 'display-name',
      email: 'email',
      userId: 'user-id',
      photoUrl: 'download-url',
    });
  });
});
