import { compressFile } from '../compress-file';
import { convertHeicToJpeg } from '../convert-heic-to-jpeg';

jest.mock('../convert-heic-to-jpeg', () => ({
  convertHeicToJpeg: jest.fn((file) => file),
}));
jest.mock('heic2any', () => ({
  default: jest.fn(),
  __esModule: true,
}));

describe('compress-file', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeAll(() => {
    // Mock URL methods
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = jest.fn();

    // Mock canvas
    const mockContext = {
      drawImage: jest.fn(),
    };

    const mockCanvas = {
      getContext: jest.fn(() => mockContext),
      toBlob: jest.fn((callback) => callback(new Blob(['mock-blob']))),
    };

    global.document.createElement = jest.fn((tagName) => {
      if (tagName === 'canvas') return mockCanvas as any;
      return {} as any;
    });
  });

  afterAll(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('should compress an image file', async () => {
    // Arrange
    const mockFile = new File(['mock-image'], 'test.jpg', {
      type: 'image/jpeg',
    });
    const mockImage = {
      width: 4096,
      height: 3072,
      onload: null as any,
      onerror: null as any,
    };

    global.Image = jest.fn(() => mockImage) as any;

    // Act
    const compressionPromise = compressFile(mockFile);
    mockImage.onload();
    const result = await compressionPromise;

    // Assert
    expect(result).toBeInstanceOf(File);
    expect(URL.createObjectURL).toHaveBeenCalledWith(mockFile);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should maintain aspect ratio when compressing', async () => {
    // Arrange
    const mockFile = new File(['mock-image'], 'test.jpg', {
      type: 'image/jpeg',
    });
    const mockImage = {
      width: 4096,
      height: 3072,
      onload: null as any,
      onerror: null as any,
    };

    global.Image = jest.fn(() => mockImage) as any;

    // Act
    const compressionPromise = compressFile(mockFile, 1024, 1024);
    mockImage.onload();
    await compressionPromise;

    // Assert
    const canvas = document.createElement('canvas');
    expect(canvas.width).toBe(1024);
    expect(canvas.height).toBe(768); // Maintains aspect ratio
  });

  it('should handle image load error', async () => {
    // Arrange
    const mockFile = new File(['mock-image'], 'test.jpg', {
      type: 'image/jpeg',
    });
    const mockImage = {
      width: 4096,
      height: 3072,
      onload: null as any,
      onerror: null as any,
    };

    global.Image = jest.fn(() => mockImage) as any;

    // Act
    const compressionPromise = compressFile(mockFile);
    mockImage.onerror();
    const result = await compressionPromise;

    // Assert
    expect(result).toEqual({});
  });

  it('should call jpeg conveersion for HEIC files', async () => {
    // Arrange
    const mockFile = new File(['mock-image'], 'test.heic', {
      type: 'image/heic',
    });
    const mockImage = {
      width: 4096,
      height: 3072,
      onload: null as any,
      onerror: null as any,
    };

    global.Image = jest.fn(() => mockImage) as any;

    // Act - we do not wait for the result here as we are only interested in
    // whether the conversion function was called
    compressFile(mockFile);

    // Assert
    expect(convertHeicToJpeg).toHaveBeenCalledWith(mockFile);
  });
});
