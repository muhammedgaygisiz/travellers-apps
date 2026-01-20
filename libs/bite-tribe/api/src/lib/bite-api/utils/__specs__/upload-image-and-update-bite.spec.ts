import { uploadImageAndUpdateBite } from '../upload-image-and-update-bite';
import { Bite } from 'model';
import { updateBiteWithImagePathFromFirestorage } from '../update-bite-with-image-path-from-firestorage';
import { uploadImageToFirebaseStorage } from '../upload-image-to-firebasestorage';

jest.mock('../upload-image-to-firebasestorage', () => ({
  uploadImageToFirebaseStorage: jest.fn(),
}));

jest.mock('../update-bite-with-image-path-from-firestorage', () => ({
  updateBiteWithImagePathFromFirestorage: jest.fn(),
}));

describe('uploadImageAndUpdateBite', () => {
  it('should upload image and update bite', async () => {
    await uploadImageAndUpdateBite(true, 'base64', 'biteId', {} as Bite);

    expect(uploadImageToFirebaseStorage).toHaveBeenCalledWith(
      true,
      'base64',
      'biteId',
    );
    expect(updateBiteWithImagePathFromFirestorage).toHaveBeenCalled();
  });
});
