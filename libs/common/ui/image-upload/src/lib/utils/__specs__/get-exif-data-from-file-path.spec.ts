import { getExifDataFromFilePath } from '../get-exif-data-from-file-path';
import * as EXIFR from 'exifr';
import { Filesystem } from '@capacitor/filesystem';

jest.mock('exifr', () => ({
  parse: jest.fn(),
}));

jest.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    readFile: jest.fn(),
  },
}));

describe('getExifDataFromFilePath', () => {
  const mockFilePath = '/path/to/image.jpg';

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should extract GPS position from valid EXIF data', async () => {
    const mockBase64 = 'base64data';
    (Filesystem.readFile as jest.Mock).mockResolvedValue({
      data: mockBase64,
    });

    const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
    (global.fetch as jest.Mock).mockResolvedValue({
      blob: jest.fn().mockResolvedValue(mockBlob),
    });

    (EXIFR.parse as jest.Mock).mockResolvedValue({
      latitude: 40.5,
      longitude: 74,
    });

    const result = await getExifDataFromFilePath(mockFilePath);
    expect(result).toEqual({
      latitude: 40.5,
      longitude: 74,
    });
    expect(Filesystem.readFile).toHaveBeenCalledWith({
      path: mockFilePath,
    });
    expect(EXIFR.parse).toHaveBeenCalled();
  });

  it('should return fallback position if EXIF data is missing', async () => {
    const mockBase64 = 'base64data';
    (Filesystem.readFile as jest.Mock).mockResolvedValue({
      data: mockBase64,
    });

    const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
    (global.fetch as jest.Mock).mockResolvedValue({
      blob: jest.fn().mockResolvedValue(mockBlob),
    });

    (EXIFR.parse as jest.Mock).mockResolvedValue({});

    const result = await getExifDataFromFilePath(mockFilePath);
    expect(result).toEqual({ latitude: 0, longitude: 0 });
  });

  it('should return fallback position if an error is thrown', async () => {
    const error = new Error('File read error');
    (Filesystem.readFile as jest.Mock).mockRejectedValue(error);

    const result = await getExifDataFromFilePath(mockFilePath);
    expect(result).toEqual({ latitude: 0, longitude: 0 });
  });

  it('should use custom fallback position', async () => {
    const error = new Error('File read error');
    (Filesystem.readFile as jest.Mock).mockRejectedValue(error);

    const customFallback = { latitude: 123, longitude: 456 };
    const result = await getExifDataFromFilePath(mockFilePath, customFallback);
    expect(result).toEqual(customFallback);
  });
});
