import { GetImagePipe } from '../get-image.pipe';
import { Bite } from 'model';

const createBite = (overrides: Partial<Bite> = {}): Bite => ({
  id: 'bite-1',
  name: 'Test Bite',
  image: '',
  place: 'Test Place',
  price: 0,
  position: { latitude: 0, longitude: 0 },
  ...overrides,
});

describe(GetImagePipe.name, () => {
  const getImagePipe = new GetImagePipe();

  describe('given imagePath property', () => {
    it('should return the imagePath', () => {
      const bite = createBite({ imagePath: 'test-image-path' });
      const result = getImagePipe.transform(bite);
      expect(result).toBe('test-image-path');
    });
  });

  describe('given image property', () => {
    it('should return the image', () => {
      const bite = createBite({ image: 'test-image' });
      const result = getImagePipe.transform(bite);
      expect(result).toBe('test-image');
    });
  });

  describe('given no imagePath or image', () => {
    it('should return an empty string', () => {
      const bite = createBite({ imagePath: '', image: '' });
      const result = getImagePipe.transform(bite);
      expect(result).toBe('');
    });
  });
});
