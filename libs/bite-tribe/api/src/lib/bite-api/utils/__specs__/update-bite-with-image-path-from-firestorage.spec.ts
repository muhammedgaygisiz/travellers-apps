import { updateBiteWithImagePathFromFirestorage } from '../update-bite-with-image-path-from-firestorage';
import { Bite } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

jest.mock('utils', () => ({
  getDownloadUrlFromFirebaseStorage: jest.fn().mockResolvedValue('mocked-url'),
}));

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    updateDocument: jest.fn(),
  },
}));

describe('updateBiteWithImagePathFromFirestorage', () => {
  it('should set imagePath in bite to download url from firestore', async () => {
    const updatedBite = await updateBiteWithImagePathFromFirestorage(
      'some-image-path',
      { name: 'Bite Name', description: 'Bite Description' } as unknown as Bite,
      false,
      'biteId123',
    );

    expect(updatedBite.imagePath).toEqual('mocked-url');
  });

  it('should clear image filed', async () => {
    const updatedBite = await updateBiteWithImagePathFromFirestorage(
      'some-image-path',
      {
        name: 'Bite Name',
        description: 'Bite Description',
        image: 'some-base64-image-data',
      } as unknown as Bite,
      true,
      'biteId123',
    );

    expect(updatedBite.image).toEqual('');
  });

  it('should call update document with updated bite', async () => {
    const updatedBite = await updateBiteWithImagePathFromFirestorage(
      'some-image-path',
      {
        name: 'Bite Name',
        description: 'Bite Description',
        image: 'some-base64-image-data',
      } as unknown as Bite,
      true,
      'biteId123',
    );

    expect(FirebaseFirestore.updateDocument).toHaveBeenCalledWith({
      reference: 'bites/biteId123',
      data: updatedBite,
    });
  });
});
