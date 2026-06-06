import { GetImagePipe } from '../get-image.pipe';

describe(GetImagePipe.name, () => {
  const getImagePipe = new GetImagePipe();

  describe('given imagePath property', () => {
    it('should return the imagePath', () => {
      const bite = { imagePath: 'test-image-path' } as any;
      const result = getImagePipe.transform(bite);
      expect(result).toBe('test-image-path');
    });
  });

  describe('given image property', () => {
    it('should return the image', () => {
      const bite = { image: 'test-image' } as any;
      const result = getImagePipe.transform(bite);
      expect(result).toBe('test-image');
    });
  });

  describe('given no imagePath or image', () => {
    it('should return an empty string', () => {
      const bite = { imagePath: '', image: '' } as any;
      const result = getImagePipe.transform(bite);
      expect(result).toBe('');
    });
  });
});
