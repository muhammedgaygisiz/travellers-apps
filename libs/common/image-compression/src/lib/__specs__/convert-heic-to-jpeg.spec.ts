import { beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';

const mockHeic2any = vi.fn();
vi.mock('heic2any', () => ({
  __esModule: true,
  default: mockHeic2any,
}));

import { convertHeicToJpeg } from '../convert-heic-to-jpeg';

describe('convertHeicToJpeg', () => {
  beforeEach(() => {
    mockHeic2any.mockClear();
  });

  it('should convert HEIC file to JPEG', async () => {
    // Arrange
    const mockHeicFile = new File(['mock-heic'], 'test.heic', {
      type: 'image/heic',
    });
    const mockJpegBlob = new Blob(['mock-jpeg'], { type: 'image/jpeg' });

    mockHeic2any.mockResolvedValue(mockJpegBlob);

    // Act
    const result = await convertHeicToJpeg(mockHeicFile);

    // Assert
    expect(mockHeic2any).toHaveBeenCalledWith({
      blob: mockHeicFile,
      toType: 'image/jpeg',
      quality: 0.7,
    });
    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('test.jpg');
    expect(result.type).toBe('image/jpeg');
  });

  it('should handle HEIF extension', async () => {
    // Arrange
    const mockHeifFile = new File(['mock-heif'], 'photo.HEIF', {
      type: 'image/heif',
    });
    const mockJpegBlob = new Blob(['mock-jpeg'], { type: 'image/jpeg' });

    mockHeic2any.mockResolvedValue(mockJpegBlob);

    // Act
    const result = await convertHeicToJpeg(mockHeifFile);

    // Assert
    expect(result.name).toBe('photo.jpg');
    expect(result.type).toBe('image/jpeg');
  });
});
