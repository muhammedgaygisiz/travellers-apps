import { compressFile } from '../compress-file';

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

  it('should create a canvas element when compressing', () => {
    // Arrange
    const mockFile = new File(['mock-image'], 'test.jpg', {
      type: 'image/jpeg',
    });

    // Act
    compressFile(mockFile);

    // Assert
    expect(global.document.createElement).toHaveBeenCalledWith('canvas');
  });

  it('should handle toBlob callback correctly', async () => {
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

    const mockCanvas = {
      getContext: jest.fn(() => ({
        drawImage: jest.fn(),
      })),
      toBlob: jest.fn((callback) => callback(new Blob(['mock-blob']))),
    };

    global.document.createElement = jest.fn((tagName) => {
      if (tagName === 'canvas') return mockCanvas as any;
      return {} as any;
    });

    // Act
    const compressionPromise = compressFile(mockFile);
    mockImage.onload();
    const result = await compressionPromise;

    // Assert
    expect(mockCanvas.toBlob).toHaveBeenCalled();
    expect(result).toBeInstanceOf(File);
  });
});
