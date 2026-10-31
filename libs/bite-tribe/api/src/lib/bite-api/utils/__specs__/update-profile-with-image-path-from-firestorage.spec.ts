import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { updateProfileWithImagePathFromFirebaseStorage } from '../update-profile-with-image-path-from-firestorage';
import { getDownloadUrlFromFirebaseStorage } from 'utils';

/**
 * The automock, plus the deletion marker it leaves undefined: `FieldValue` is a
 * class export beside the plugin object, and a profile write calls
 * `FieldValue.delete()` to remove cleared pronouns (issue #1826). The marker is
 * the plain `{ __type__ }` object the plugin builds.
 */
jest.mock('@capacitor-firebase/firestore', () => ({
  ...jest.createMockFromModule<object>('@capacitor-firebase/firestore'),
  FieldValue: { delete: jest.fn(() => ({ __type__: 'delete' })) },
}));

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
        pronouns: { __type__: 'delete' },
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

  describe('pronouns (issue #1826)', () => {
    const written = (): Record<string, unknown> =>
      (FirebaseFirestore.updateDocument as unknown as jest.Mock).mock.calls.at(
        -1,
      )?.[0]?.data;

    it('keeps the pronouns, trimmed, when the photo changes', async () => {
      const result = await updateProfileWithImagePathFromFirebaseStorage(
        'photo-url',
        { displayName: 'Mo', email: 'e', userId: 'u', pronouns: ' they/them ' },
        'u',
      );

      expect(written()['pronouns']).toBe('they/them');
      expect(result.pronouns).toBe('they/them');
    });

    it('removes cleared pronouns from the document and the result', async () => {
      const result = await updateProfileWithImagePathFromFirebaseStorage(
        'photo-url',
        { displayName: 'Mo', email: 'e', userId: 'u', pronouns: '   ' },
        'u',
      );

      expect(written()['pronouns']).toEqual({ __type__: 'delete' });
      expect(result).not.toHaveProperty('pronouns');
    });
  });
});
