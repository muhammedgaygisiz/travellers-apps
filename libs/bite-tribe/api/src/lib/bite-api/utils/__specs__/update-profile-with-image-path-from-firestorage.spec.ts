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
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-03-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

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
        fullName: '',
        email: 'email',
        city: '',
        about: '',
        public: false,
        photoUrl: 'download-url',
        updatedAt: '2024-03-15T12:00:00.000Z',
        updatedAtTimestamp: 1710504000000,
      },
    });

    expect(result).toMatchObject({
      displayName: 'display-name',
      email: 'email',
      userId: 'user-id',
      photoUrl: 'download-url',
    });
  });

  /**
   * The write used to carry the whole profile back, backend-owned fields
   * included. The ownership-scoped rules refuse a write that changes one, so a
   * count that moved between the read and this save would have failed a profile
   * image change (issue #1078).
   */
  it('does not write the backend-owned profile fields', async () => {
    await updateProfileWithImagePathFromFirebaseStorage(
      'photo-url',
      {
        displayName: 'display-name',
        email: 'email',
        userId: 'user-id',
        biteCount: 7,
        subscriptionTier: 2,
        followersCount: 3,
      },
      'user-id',
    );

    const written = (
      FirebaseFirestore.updateDocument as unknown as jest.Mock
    ).mock.calls.at(-1)?.[0]?.data;

    expect(written).not.toHaveProperty('biteCount');
    expect(written).not.toHaveProperty('subscriptionTier');
    expect(written).not.toHaveProperty('followersCount');
    expect(written).not.toHaveProperty('userId');
  });
});
