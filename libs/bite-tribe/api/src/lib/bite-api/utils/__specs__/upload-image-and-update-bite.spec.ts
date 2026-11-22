import { uploadImageAndUpdateBite } from '../upload-image-and-update-bite';
import { Bite } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { uploadBase64ToFirebaseStorage } from '../../../utils/upload-base64-to-firebase-storage';

jest.mock('../../../utils/upload-base64-to-firebase-storage', () => ({
  uploadBase64ToFirebaseStorage: jest.fn().mockResolvedValue('images/x.jpg'),
}));

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: { updateDocument: jest.fn() },
}));

describe(uploadImageAndUpdateBite.name, () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploads the photo and saves the edit without any published image field', async () => {
    await uploadImageAndUpdateBite({
      imageBase64: 'base64',
      biteId: 'biteId',
      biteWithoutImage: {
        id: 'biteId',
        name: 'Ramen',
        imagePath: 'https://old',
        imageStatus: 'uploaded',
        imageRefusalCategory: 'violence',
      } as Bite,
      clearBase64Image: true,
    });

    expect(uploadBase64ToFirebaseStorage).toHaveBeenCalledWith({
      base64: 'base64',
      docId: 'biteId',
    });
    expect(FirebaseFirestore.updateDocument).toHaveBeenCalledWith({
      reference: 'bites/biteId',
      data: { id: 'biteId', name: 'Ramen', image: '' },
    });
  });

  it('writes nothing to the Bite when there is nothing but the photo', async () => {
    await uploadImageAndUpdateBite({ imageBase64: 'base64', biteId: 'biteId' });

    expect(FirebaseFirestore.updateDocument).not.toHaveBeenCalled();
  });
});
