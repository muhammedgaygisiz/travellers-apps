import { afterEach, describe, expect, it } from 'vitest';
import { getExifDataFromFile } from '../get-exif-data-from-file';
import * as EXIFR from 'exifr';
import { vi, Mock as ViMock } from 'vitest';

vi.mock('exifr', () => ({
  parse: vi.fn(),
}));

describe('getExifDataFromFile', () => {
  const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should extract GPS position from valid EXIF data', async () => {
    (EXIFR.parse as ViMock).mockImplementation(() => ({
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

  it('should return default values if EXIF data is missing', async () => {
    (EXIFR.parse as ViMock).mockImplementation(() => ({
      latitude: 0,
      longitude: 0,
    }));

    const result = await getExifDataFromFile(mockFile);
    expect(result).toEqual({ latitude: 0, longitude: 0 });
    expect(EXIFR.parse).toHaveBeenCalled();
  });

  it('should reject if an error is thrown', async () => {
    const error = new Error('EXIF error');
    (EXIFR.parse as ViMock).mockImplementation(() => {
      throw error;
    });

    const result = await getExifDataFromFile(mockFile);
    expect(result).toEqual({ latitude: 0, longitude: 0 });
    expect(EXIFR.parse).toHaveBeenCalled();
  });

  it('should return fallback position if getTag throws inside getData', async () => {
    (EXIFR.parse as ViMock).mockImplementation(() => ({
      latitude: 123,
      longitude: 456,
    }));

    const result = await getExifDataFromFile(mockFile, {
      latitude: 123,
      longitude: 456,
    });
    expect(result).toEqual({ latitude: 123, longitude: 456 });
  });
});
