import { uploadImageAndUpdateBite } from '../upload-image-and-update-bite';
import { Bite } from 'model';

const uploadImageToFirebaseStorageMock = jest.fn();
jest.mock('../upload-image-to-firebasestorage', () => ({
  uploadImageToFirebaseStorage: (): any => uploadImageToFirebaseStorageMock,
}));

const updateBiteWithImagePathFromFirestorageMock = jest.fn();
jest.mock('../update-bite-with-image-path-from-firestorage', () => ({
  updateBiteWithImagePathFromFirestorage: (): any =>
    updateBiteWithImagePathFromFirestorageMock,
}));

describe('uploadImageAndUpdateBite', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  it('should upload image and update bite', async () => {
    await uploadImageAndUpdateBite(true, 'base64', 'biteId', {} as Bite);
    expect(logSpy).toHaveBeenCalledWith('updatedBite:', expect.anything());
  });
});
