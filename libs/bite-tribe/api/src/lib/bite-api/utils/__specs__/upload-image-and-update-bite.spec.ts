import { uploadImageAndUpdateBite } from '../upload-image-and-update-bite';
import { Bite } from 'model';
import { updateBiteWithImagePathFromFirestorage } from '../update-bite-with-image-path-from-firestorage';
import { uploadBase64ToFirebaseStorage } from '../upload-base64-to-firebase-storage';

jest.mock('../upload-base64-to-firebase-storage', () => ({
  uploadImageToFirebaseStorage: jest.fn(),
}));

jest.mock('../update-bite-with-image-path-from-firestorage', () => ({
  updateBiteWithImagePathFromFirestorage: jest.fn(),
}));

describe('uploadImageAndUpdateBite', () => {
  it('should upload image and update bite', async () => {
    await uploadImageAndUpdateBite(true, 'base64', 'biteId', {} as Bite);

    expect(uploadBase64ToFirebaseStorage).toHaveBeenCalledWith(
      true,
      'base64',
      'biteId',
    );
    expect(updateBiteWithImagePathFromFirestorage).toHaveBeenCalled();
  });
});
