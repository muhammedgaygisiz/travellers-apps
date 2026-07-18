import { deleteFileInFirebaseStorage } from '../delete-file-in-firebasestorage';
import { uploadImageAndUpdateBite } from '../upload-image-and-update-bite';
import { replaceImageInFirestoreStorage } from '../replace-image-in-firestorestorage';
import { Bite } from 'model';

jest.mock('../delete-file-in-firebasestorage', () => ({
  deleteFileInFirebaseStorage: jest.fn(),
}));

jest.mock('../upload-image-and-update-bite', () => ({
  uploadImageAndUpdateBite: jest.fn(),
}));

describe('replaceImageInFirestoreStorage', () => {
  it('should call deleteFile and uploadImageAndUpdateBite', async () => {
    await replaceImageInFirestoreStorage(
      'imageBase64String',
      'https://firebasestorage.googleapis.com/v0/b/bucket/o/images%2Fphoto.jpg?alt=media',
      'bite123',
      { id: 'bite123', userId: 'user123' } as Bite,
    );

    expect(deleteFileInFirebaseStorage).toHaveBeenCalled();
    expect(uploadImageAndUpdateBite).toHaveBeenCalled();
  });
});
