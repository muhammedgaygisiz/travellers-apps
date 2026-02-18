import { GetImagePipe } from '../get-image.pipe';
import { Filesystem } from '@capacitor/filesystem';

jest.mock('@capacitor/filesystem');

describe(GetImagePipe.name, () => {
  const getImagePipe = new GetImagePipe();

  describe('given imagePath property', () => {
    it('should return the imagePath', async () => {
      const bite = { imagePath: 'test-image-path' } as any;
      const result = await getImagePipe.transform(bite, undefined);
      expect(result).toBe('test-image-path');
    });
  });

  describe('given image property', () => {
    it('should return the image', async () => {
      const bite = { image: 'test-image' } as any;
      const result = await getImagePipe.transform(bite, undefined);
      expect(result).toBe('test-image');
    });
  });

  describe('given no imagePath or image (empty string)', () => {
    describe('and no offlineImage', () => {
      it('should return an empty string', async () => {
        const bite = { imagePath: '', image: '' } as any;
        const result = await getImagePipe.transform(bite, undefined);
        expect(result).toBe('');
      });
    });

    describe('and an offlineImage', () => {
      let readFileSpy: jest.SpyInstance;

      beforeEach(() => {
        const readFileResult = { data: 'base64-image-data' };

        readFileSpy = jest
          .spyOn(Filesystem, 'readFile')
          .mockResolvedValue(readFileResult);
      });

      it('should return the offline image as base64', async () => {
        const offlineImagePath = 'offline-image-path';
        const uploadState = { progress: { offlineImagePath } } as any;

        const result = await getImagePipe.transform({} as any, uploadState);
        expect(readFileSpy).toHaveBeenCalledWith({
          path: offlineImagePath,
        });
        expect(result).toBe('data:image/jpeg;base64,base64-image-data');
      });
    });
  });
});
