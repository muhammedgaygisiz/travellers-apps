import { uploadBase64ToFirebaseStorage } from '../upload-base64-to-firebase-storage';
import { dataUrlToBlob, guessExtFromContentType } from 'utils';
import { uploadBlobToFirebasestorage } from '../upload-blob-to-firebasestorage';

jest.mock('utils', () => ({
  // Correctly mock the named exports used by the implementation
  dataUrlToBlob: jest.fn(),
  guessExtFromContentType: jest.fn(),
}));

jest.mock('../upload-blob-to-firebasestorage');

describe(uploadBase64ToFirebaseStorage.name, () => {
  describe('given a base64 image', () => {
    const base64Image = "data:image/png';base64,iVBORw0KGgoAAAANSUhEUgAAAAUA";

    beforeEach(() => {
      (dataUrlToBlob as jest.Mock).mockResolvedValue({
        blob: new Blob(),
        contentType: 'image/png',
      });

      (guessExtFromContentType as jest.Mock).mockReturnValue('image/png');
    });

    it('should get blob and content type, guess extension and call upload blob to firebase storage', async () => {
      await uploadBase64ToFirebaseStorage({
        base64: base64Image,
        docId: 'docId',
        collection: 'collection',
        callbackFn: jest.fn(),
      });

      expect(dataUrlToBlob).toHaveBeenCalledWith(base64Image);
      expect(guessExtFromContentType).toHaveBeenCalledWith('image/png');
      expect(uploadBlobToFirebasestorage).toHaveBeenCalledWith({
        blob: new Blob(),
        callbackFn: expect.any(Function),
        collection: 'collection',
        contentType: 'image/png',
        docId: 'docId',
        extension: 'image/png',
      });
    });
  });
});
