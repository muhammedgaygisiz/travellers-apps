import { getExifDataFromFile } from '../get-exif-data-from-file';
import * as EXIFR from 'exifr';

jest.mock('exifr', () => ({
  parse: jest.fn(),
}));

describe('getExifDataFromFile', () => {
  const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('given a file with gps meta data', () => {
    it('should extract GPS position from valid EXIF data', async () => {
      (EXIFR.parse as jest.Mock).mockImplementation(() => ({
        latitude: 40.5,
        longitude: 74,
      }));

      const result = await getExifDataFromFile(mockFile);
      expect(result).toEqual({
        latitude: 40.5,
        longitude: 74,
      });
      expect(EXIFR.parse).toHaveBeenCalled();
    });

    it('should return undefined if EXIF data is missing', async () => {
      (EXIFR.parse as jest.Mock).mockImplementation(() => ({
        latitude: 0,
        longitude: 0,
      }));

      const result = await getExifDataFromFile(mockFile);
      expect(result).toBeUndefined();
      expect(EXIFR.parse).toHaveBeenCalled();
    });
  });

  describe('given a file with exif data without gps fields', () => {
    it('should return undefined if GPS data is missing in EXIF', async () => {
      (EXIFR.parse as jest.Mock).mockImplementation(() => ({}));

      const result = await getExifDataFromFile(mockFile);
      expect(result).toBeUndefined();
      expect(EXIFR.parse).toHaveBeenCalled();
    });
  });

  describe('given an error', () => {
    it('should reject if an error is thrown', async () => {
      const error = new Error('EXIF error');
      (EXIFR.parse as jest.Mock).mockImplementation(() => {
        throw error;
      });

      const result = await getExifDataFromFile(mockFile);
      expect(result).toEqual(undefined);
      expect(EXIFR.parse).toHaveBeenCalled();
    });
  });
});
