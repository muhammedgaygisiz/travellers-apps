/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
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

      get onload() {
        return this._onload || (() => {});
      }

      set onerror(handler: () => void) {
        this._onerror = handler;
      }

      get onerror() {
        return this._onerror || (() => {});
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
      // eslint-disable-next-line no-unused-vars
      private _onerror?: (e: Event) => void;
      private _src = '';

      set src(value: string) {
        this._src = value;
        // Simulate error when trying to load the image
        setTimeout(() => this._onerror?.(new Event('error')), 0);
      }

      get src() {
        return this._src;
      }

      set onload(handler: () => void) {
        this._onload = handler;
      }

      // eslint-disable-next-line no-unused-vars
      set onerror(handler: (e: Event) => void) {
        this._onerror = handler;
      }
    };

    await expect(compressPhoto(mockPhoto)).rejects.toEqual(new Event('error'));
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should handle invalid base64 input', async () => {
    const invalidPhoto: Photo = {
      ...mockPhoto,
      base64String: 'invalid-base64',
    };
    await expect(compressPhoto(invalidPhoto)).rejects.toThrow();
  });
});
