import { deleteCurrentImage } from '../delete-current-image';
import { PublicUser } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { deleteFileInFirebaseStorage } from '../../bite-api/utils/delete-file-in-firebasestorage';

jest.mock('@capacitor-firebase/firestore');

jest.mock('../../bite-api/utils/delete-file-in-firebasestorage', () => ({
  deleteFileInFirebaseStorage: jest.fn(),
}));

describe(deleteCurrentImage.name, () => {
  describe('given a user', () => {
    it('should get the user and delete the image', async () => {
      const getDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue({
          snapshot: { data: { photoUrl: 'path/to/image.jpg' } } as any,
        });

      const user = {
        userId: 'user123',
      } as PublicUser;

      await deleteCurrentImage(user);

      expect(getDocumentSpy).toHaveBeenCalledWith({
        reference: 'users/user123',
      });
      expect(deleteFileInFirebaseStorage).toHaveBeenCalledWith(
        'path/to/image.jpg',
      );
    });
  });
});
