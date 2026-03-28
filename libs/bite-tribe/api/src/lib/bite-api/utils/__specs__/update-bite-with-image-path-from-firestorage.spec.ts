import { updateBiteWithImagePathFromFirestorage } from '../update-bite-with-image-path-from-firestorage';
import { Bite } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

jest.mock('utils', () => ({
  getDownloadUrlFromFirebaseStorage: jest.fn().mockResolvedValue('mocked-url'),
}));

jest.mock('@capacitor-firebase/firestore');

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

  it('should use download url directly when imagePath is already an http url', async () => {
    const { getDownloadUrlFromFirebaseStorage } = jest.requireMock('utils');
    (getDownloadUrlFromFirebaseStorage as jest.Mock).mockClear();

    const alreadyUploadedUrl =
      'https://firebasestorage.googleapis.com/v0/b/test/o/image.jpg';

    const updatedBite = await updateBiteWithImagePathFromFirestorage(
      alreadyUploadedUrl,
      { name: 'Bite Name' } as unknown as Bite,
      true,
      'biteId123',
    );

    expect(getDownloadUrlFromFirebaseStorage).not.toHaveBeenCalled();
    expect(updatedBite.imagePath).toEqual(alreadyUploadedUrl);
  });
});
