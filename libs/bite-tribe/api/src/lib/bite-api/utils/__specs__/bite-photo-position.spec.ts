import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import {
  loadBitePhotoPosition,
  saveBitePhotoPosition,
} from '../bite-photo-position';

jest.mock('@capacitor-firebase/firestore');

/** The author-only photo position of a Bite (GitHub issue #1290). */
describe('bite photo position', () => {
  const reference = 'bites/bite-1/authorPrivate/author-1';

  beforeEach(() => jest.clearAllMocks());

  afterEach(() => jest.restoreAllMocks());

  describe('saveBitePhotoPosition', () => {
    it('writes the author and the coordinates, and nothing else', async () => {
      const setDocument = jest
        .spyOn(FirebaseFirestore, 'setDocument')
        .mockResolvedValue(undefined);

      // A candidate geopoint can carry an id; the rules refuse any field
      // beyond `userId` and `photoPosition`.
      await saveBitePhotoPosition('bite-1', 'author-1', {
        id: 'photo',
        latitude: 36.74,
        longitude: -5.16,
      });

      expect(setDocument).toHaveBeenCalledWith({
        reference,
        data: {
          userId: 'author-1',
          photoPosition: { latitude: 36.74, longitude: -5.16 },
        },
      });
    });

    it('removes the document when the photo has no position', async () => {
      const deleteDocument = jest
        .spyOn(FirebaseFirestore, 'deleteDocument')
        .mockResolvedValue(undefined);
      const setDocument = jest.spyOn(FirebaseFirestore, 'setDocument');

      await saveBitePhotoPosition('bite-1', 'author-1', null);

      expect(deleteDocument).toHaveBeenCalledWith({ reference });
      expect(setDocument).not.toHaveBeenCalled();
    });
  });

  describe('loadBitePhotoPosition', () => {
    it('answers the stored coordinates', async () => {
      jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
        snapshot: {
          id: 'author-1',
          path: reference,
          data: {
            userId: 'author-1',
            photoPosition: { latitude: 36.74, longitude: -5.16 },
          },
        },
      });

      await expect(
        loadBitePhotoPosition('bite-1', 'author-1'),
      ).resolves.toEqual({ latitude: 36.74, longitude: -5.16 });
    });

    it('answers nothing when no position was stored', async () => {
      jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
        snapshot: { id: 'author-1', path: reference, data: null },
      });

      await expect(
        loadBitePhotoPosition('bite-1', 'author-1'),
      ).resolves.toBeUndefined();
    });
  });
});
