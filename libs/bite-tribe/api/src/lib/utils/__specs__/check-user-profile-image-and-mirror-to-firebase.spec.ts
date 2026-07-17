import { checkUserProfileImageAndMirrorToFirebase } from '../check-user-profile-image-and-mirror-to-firebase';
import { PublicUser } from 'model';
import { uploadBlobToFirebasestorage } from '../upload-blob-to-firebasestorage';
import { USERS_COLLECTION } from '../user-collection-key';

jest.mock('../upload-blob-to-firebasestorage', () => ({
  uploadBlobToFirebasestorage: jest.fn(),
}));

jest.mock('@capacitor-firebase/storage');

const USER_ID = 'user1';
const BASE_USER = {
  userId: USER_ID,
  displayName: 'User 1',
};

describe(checkUserProfileImageAndMirrorToFirebase.name, () => {
  describe('given a user without photoUrl', () => {
    const user = {
      ...BASE_USER,
      photoUrl: '',
    } as PublicUser;
    it('should return the same user', async () => {
      const result = await checkUserProfileImageAndMirrorToFirebase(user, true);

      expect(result).toBe(user);
    });
  });

  describe('given a user with photoUrl but not a google avatar url', () => {
    it('should return the same user', async () => {
      const user = {
        ...BASE_USER,
        photoUrl: 'https://example.com/avatar.jpg',
      } as PublicUser;

      const result = await checkUserProfileImageAndMirrorToFirebase(user, true);

      expect(result).toBe(user);
    });
  });

  describe('given a user with a google avatar url and fetching is successful', () => {
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          blob: async () =>
            new Blob(['avatar content'], { type: 'image/jpeg' }),
        } as Response;
      });

      (uploadBlobToFirebasestorage as jest.Mock).mockResolvedValue(
        'https://url-to-mirrored-image.com/avatar.jpg',
      );
    });

    it('should mirror the image to firebase and return the updated user', async () => {
      const PHOTO_URL =
        'https://lh3.googleusercontent.com/a-/AOh14Gg6t0exampleavatar';
      const user = {
        ...BASE_USER,
        photoUrl: PHOTO_URL,
      } as PublicUser;

      const result = await checkUserProfileImageAndMirrorToFirebase(user, true);

      expect(fetchSpy).toHaveBeenCalledWith(PHOTO_URL, { cache: 'no-cache' });
      expect(uploadBlobToFirebasestorage).toHaveBeenCalledWith({
        collection: USERS_COLLECTION,
        docId: USER_ID,
        extension: expect.any(String),
        blob: expect.any(Blob),
        contentType: 'image/jpeg',
      });
      expect(result).toEqual({
        displayName: 'User 1',
        photoUrl: 'https://url-to-mirrored-image.com/avatar.jpg',
        userId: 'user1',
      });
    });
  });

  describe('given a user with a google avatar url and fetching is not successful', () => {
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
      fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () => {
        return {
          ok: false,
        } as Response;
      });
    });

    it('should return the same user without mirroring', async () => {
      const PHOTO_URL =
        'https://lh3.googleusercontent.com/a-/AOh14Gg6t0exampleavatar';
      const user = {
        ...BASE_USER,
        photoUrl: PHOTO_URL,
      } as PublicUser;

      const result = await checkUserProfileImageAndMirrorToFirebase(user, true);

      expect(fetchSpy).toHaveBeenCalledWith(PHOTO_URL, { cache: 'no-cache' });
      expect(result).toBe(user);
    });
  });
});
