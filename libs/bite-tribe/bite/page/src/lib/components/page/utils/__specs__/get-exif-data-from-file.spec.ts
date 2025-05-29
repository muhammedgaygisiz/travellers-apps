/* eslint-disable no-unused-vars */
import { getExifDataFromFile } from '../get-exif-data-from-file';
import * as EXIF from 'exif-js';

jest.mock('exif-js', () => ({
  getData: jest.fn(),
  getTag: jest.fn(),
}));

describe('getExifDataFromFile', () => {
  const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should extract GPS position from valid EXIF data', async () => {
    type ExifMockData = {
      GPSLatitude?: number[];
      GPSLatitudeRef?: string;
      GPSLongitude?: number[];
      GPSLongitudeRef?: string;
    };

    const exifDataMock: ExifMockData = {
      GPSLatitude: [40, 30, 0],
      GPSLatitudeRef: 'N',
      GPSLongitude: [74, 0, 0],
      GPSLongitudeRef: 'E',
    };

    (EXIF.getTag as jest.Mock).mockImplementation(
      (ctx: { exifData: ExifMockData }, tag: keyof ExifMockData) => {
        return exifDataMock[tag];
      }
    );

    (EXIF.getData as jest.Mock).mockImplementation(
      (_file: File, cb: (this: { exifData: ExifMockData }) => void) => {
        cb.call({ exifData: exifDataMock });
      }
    );

    const result = await getExifDataFromFile(mockFile);
    expect(result).toEqual({
      latitude: 40.5,
      longitude: 74,
    });
    expect(EXIF.getData).toHaveBeenCalled();
    expect(EXIF.getTag).toHaveBeenCalledTimes(4);
  });

  it('should return default values if EXIF data is missing', async () => {
    const exifDataMock = {} as { [key: string]: undefined };

    (EXIF.getTag as jest.Mock).mockImplementation(
      (ctx: { exifData: typeof exifDataMock }, tag: string) => {
        return exifDataMock[tag];
      }
    );

    (EXIF.getData as jest.Mock).mockImplementation(
      (_file: File, cb: (this: { exifData: typeof exifDataMock }) => void) => {
        cb.call({ exifData: exifDataMock });
      }
    );

    const result = await getExifDataFromFile(mockFile);
    expect(result).toEqual({ latitude: 0, longitude: 0 });
    expect(EXIF.getData).toHaveBeenCalled();
  });

  it('should reject if an error is thrown', async () => {
    const error = new Error('EXIF error');
    (EXIF.getData as jest.Mock).mockImplementation(() => {
      throw error;
    });

    await expect(getExifDataFromFile(mockFile)).rejects.toThrow('EXIF error');
    expect(EXIF.getData).toHaveBeenCalled();
  });

  it('should return fallback position if getTag throws inside getData', async () => {
    const exifDataMock = {
      GPSLatitude: [40, 30, 0],
      GPSLatitudeRef: 'N',
      GPSLongitude: [74, 0, 0],
      GPSLongitudeRef: 'E',
    };

    (EXIF.getTag as jest.Mock).mockImplementation(() => {
      throw new Error('getTag error');
    });

    (EXIF.getData as jest.Mock).mockImplementation(
      (_file: File, cb: (this: { exifData: typeof exifDataMock }) => void) => {
        cb.call({ exifData: exifDataMock });
      }
    );

    const result = await getExifDataFromFile(mockFile, {
      latitude: 123,
      longitude: 456,
    });
    expect(result).toEqual({ latitude: 123, longitude: 456 });
  });
});
