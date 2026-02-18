import { uploadImageAndUpdateBite } from '../upload-image-and-update-bite';
import { Bite } from 'model';
import { updateBiteWithImagePathFromFirestorage } from '../update-bite-with-image-path-from-firestorage';
import { uploadBase64ToFirebaseStorage } from '../../../utils/upload-base64-to-firebase-storage';

jest.mock('../../../utils/upload-base64-to-firebase-storage', () => ({
  uploadBase64ToFirebaseStorage: jest.fn(),
}));

jest.mock('../update-bite-with-image-path-from-firestorage', () => ({
  updateBiteWithImagePathFromFirestorage: jest.fn(),
}));

describe(uploadImageAndUpdateBite.name, () => {
  it('should upload image and update bite', async () => {
    await uploadImageAndUpdateBite({
      imageBase64: 'base64',
      biteId: 'biteId',
      biteWithoutImage: {} as Bite,
    });

    expect(uploadBase64ToFirebaseStorage).toHaveBeenCalledWith({
      base64: 'base64',
      docId: 'biteId',
    });
    expect(updateBiteWithImagePathFromFirestorage).toHaveBeenCalled();
  });
});
