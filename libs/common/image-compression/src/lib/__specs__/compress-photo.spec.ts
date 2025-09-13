/* eslint-disable @typescript-eslint/no-empty-function */
import { Photo } from '@capacitor/camera';
import { compressPhoto } from '../compress-photo';

describe('compressPhoto', () => {
  let mockPhoto: Photo;

  beforeEach(() => {
    // Mock canvas element
    const mockCanvas = {
      getContext: jest.fn(() => ({
        drawImage: jest.fn(),
      })),
      width: 100,
      height: 100,
      toBlob: jest.fn((callback) =>
        callback(new Blob(['mock-image-data'], { type: 'image/jpeg' }))
      ),
    } as unknown as HTMLCanvasElement;

    // Mock document.createElement for canvas
    jest
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return mockCanvas;
        }
        return document.createElement(tagName);
      });

    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();

    // Mock Image
    // @ts-expect-error - Mocking Image global
    global.Image = class {
      private _onload?: () => void;
      private _onerror?: () => void;
      src = '';
      width = 100;
      height = 100;

      set onload(handler: () => void) {
        this._onload = handler;
      }

      get onload(): () => void {
        return this._onload || ((): void => {});
      }

      set onerror(handler: () => void) {
        this._onerror = handler;
      }

      get onerror(): () => void {
        return this._onerror || ((): void => {});
      }

      constructor() {
        setTimeout(() => this._onload?.(), 0);
      }
    };

    mockPhoto = {
      // This is a minimal valid base64 for a 1x1 transparent PNG
      base64String:
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wIAAgMBApUAAAAASUVORK5CYII=',
      format: 'png',
      path: 'test/path/photo.png',
      webPath: 'test/web/path/photo.png',
      exif: {},
      saved: true,
    } as Photo;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should compress photo to a File with size <= MAX_SIZE_BYTES', async () => {
    const compressedFile = await compressPhoto(mockPhoto);
    expect(compressedFile).toBeInstanceOf(File);
    expect(compressedFile.size).toBeLessThanOrEqual(800 * 1024);
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should reduce quality and dimensions iteratively until conditions are met', async () => {
    const compressedFile = await compressPhoto(mockPhoto, 1024, 768);
    expect(compressedFile).toBeInstanceOf(File);
    expect(compressedFile.size).toBeLessThanOrEqual(800 * 1024);
    expect(compressedFile.type).toBe('image/jpeg');
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should handle edge cases with small images', async () => {
    const smallPhoto: Photo = {
      base64String:
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wIAAgMBApUAAAAASUVORK5CYII=',
      format: 'jpeg',
      path: 'test/path/photo.jpg',
      webPath: 'test/web/path/photo.jpg',
      exif: {},
      saved: true,
    } as Photo;
    const compressedFile = await compressPhoto(smallPhoto, 512, 512);
    expect(compressedFile).toBeInstanceOf(File);
    expect(compressedFile.size).toBeLessThanOrEqual(800 * 1024);
    expect(compressedFile.name).toMatch(/\.jpg$/);
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should handle image load errors', async () => {
    // Override Image mock to simulate error
    // @ts-expect-error - Mocking Image global
    global.Image = class {
      private _onload?: () => void;
      private _onerror?: (e: Event) => void;
      private _src = '';

      set src(value: string) {
        this._src = value;
        // Simulate error when trying to load the image
        setTimeout(() => this._onerror?.(new Event('error')), 0);
      }

      get src(): string {
        return this._src;
      }

      set onload(handler: () => void) {
        this._onload = handler;
      }

      set onerror(handler: (e: Event) => void) {
        this._onerror = handler;
      }
    };

    await expect(compressPhoto(mockPhoto)).rejects.toEqual(new Event('error'));
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should handle multiple compression iterations for large images', async () => {
    // Track blob sizes to simulate gradual compression
    const blobSizes = [1000 * 1024, 900 * 1024, 700 * 1024];
    let blobCallCount = 0;

    // Mock a large file that needs multiple compression iterations
    const mockCanvas = {
      getContext: jest.fn(() => ({
        drawImage: jest.fn(),
      })),
      width: 100,
      height: 100,
      toBlob: jest.fn((callback) => {
        const size = blobSizes[blobCallCount] || 400 * 1024; // Use 400KB for any additional calls
        callback(new Blob(['x'.repeat(size)], { type: 'image/jpeg' }));
        blobCallCount++;
      }),
    } as unknown as HTMLCanvasElement;

    // Override createElement to use our custom canvas
    jest
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return mockCanvas;
        }
        return document.createElement(tagName);
      });

    const largePhoto: Photo = {
      base64String:
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wIAAgMBApUAAAAASUVORK5CYII=',
      format: 'jpeg',
      path: 'test/path/large.jpg',
      webPath: 'test/web/path/large.jpg',
      exif: {},
      saved: true,
    } as Photo;

    const compressedFile = await compressPhoto(largePhoto, 1024, 768);
    expect(compressedFile).toBeInstanceOf(File);
    expect(compressedFile.size).toBeLessThanOrEqual(800 * 1024);
    expect(compressedFile.type).toBe('image/jpeg');
    expect(blobCallCount).toBe(3); // Verify we went through exactly 3 compression iterations
    // URL.revokeObjectURL is called twice per iteration: once for image load, once for canvas
    expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(6);
  });

  it('should handle minimum size reached with still large file', async () => {
    // Track blob sizes to simulate a file that stays large even at minimum settings
    const blobSizes = Array(10).fill(1000 * 1024); // Always return 1MB
    let blobCallCount = 0;

    const mockCanvas = {
      getContext: jest.fn(() => ({
        drawImage: jest.fn(),
      })),
      width: 100,
      height: 100,
      toBlob: jest.fn((callback) => {
        const size = blobSizes[blobCallCount] || 1000 * 1024;
        callback(new Blob(['x'.repeat(size)], { type: 'image/jpeg' }));
        blobCallCount++;
      }),
    } as unknown as HTMLCanvasElement;

    // Override createElement to use our custom canvas
    jest
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return mockCanvas;
        }
        return document.createElement(tagName);
      });

    const largePhoto: Photo = {
      base64String:
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wIAAgMBApUAAAAASUVORK5CYII=',
      format: 'jpeg',
      path: 'test/path/large.jpg',
      webPath: 'test/web/path/large.jpg',
      exif: {},
      saved: true,
    } as Photo;

    const compressedFile = await compressPhoto(largePhoto, 1024, 768);
    expect(compressedFile).toBeInstanceOf(File);
    expect(compressedFile.size).toBeGreaterThan(800 * 1024); // File remains large
    expect(compressedFile.type).toBe('image/jpeg');
    // Should stop after width < 512 and height < 512 and quality <= 0.5
    expect(blobCallCount).toBeGreaterThan(5); // Multiple iterations until minimum size reached
  });

  it('should respect maximum iteration limit of 10', async () => {
    // Track blob sizes to simulate a file that never gets small enough
    const blobSizes = Array(15).fill(1000 * 1024); // Always return 1MB, array bigger than max iterations
    let blobCallCount = 0;

    const mockCanvas = {
      getContext: jest.fn(() => ({
        drawImage: jest.fn(),
      })),
      width: 100,
      height: 100,
      toBlob: jest.fn((callback) => {
        const size = blobSizes[blobCallCount] || 1000 * 1024;
        callback(new Blob(['x'.repeat(size)], { type: 'image/jpeg' }));
        blobCallCount++;
      }),
    } as unknown as HTMLCanvasElement;

    // Override createElement to use our custom canvas
    jest
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return mockCanvas;
        }
        return document.createElement(tagName);
      });

    const largePhoto: Photo = {
      ...mockPhoto,
      format: 'jpeg',
      path: 'test/path/large.jpg',
      webPath: 'test/web/path/large.jpg',
    };

    const compressedFile = await compressPhoto(largePhoto, 2048, 2048);
    expect(compressedFile).toBeInstanceOf(File);
    expect(compressedFile.size).toBeGreaterThan(800 * 1024); // File remains large
    expect(compressedFile.type).toBe('image/jpeg');
    expect(blobCallCount).toBe(10); // Should stop after exactly 10 iterations
    expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(20); // 2 calls per iteration (load + compress)

    // Verify final dimensions and quality
    const finalWidth = Math.floor(2048 * Math.pow(0.9, 10)); // Initial width after 10 iterations
    const finalHeight = Math.floor(2048 * Math.pow(0.9, 10)); // Initial height after 10 iterations
    const finalQuality = Math.max(0.1, 0.7 - 0.1 * 10); // Initial quality (0.7) minus 0.1 per iteration, but not below 0.1

    // The dimensions should be reduced but still positive
    expect(finalWidth).toBeGreaterThan(0);
    expect(finalHeight).toBeGreaterThan(0);
    expect(finalWidth).toBeLessThan(2048);
    expect(finalHeight).toBeLessThan(2048);

    // Quality should never go below 0.1
    expect(finalQuality).toBe(0.1);
  });
});
