import { compressWithCanvas } from '../compress-with-canvas';
import { vi } from 'vitest';

describe('compressWithCanvas', () => {
  let mockImage: HTMLImageElement;
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    mockImage = {
      src: '',
      width: 4000,
      height: 3000,
    } as HTMLImageElement;

    mockCtx = {
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
      toBlob: vi.fn(),
    } as unknown as HTMLCanvasElement;

    global.URL.revokeObjectURL = vi.fn();
    global.document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'canvas') return mockCanvas;
      return {} as HTMLElement;
    });
  });

  it('should resize the canvas and draw the image', () => {
    const mockResize = vi.fn(() => [800, 600]);
    vi.mock('../resize-retaining-aspect-ratio', () => ({
      resizeRetainingAspectRatio: mockResize,
    }));

    compressWithCanvas(mockImage, 'test.jpg', 800, 600, vi.fn(), 0.7);

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockImage.src);
    expect(mockCanvas.width).toBe(800);
    expect(mockCanvas.height).toBe(600);
    expect(mockCtx.drawImage).toHaveBeenCalledWith(mockImage, 0, 0, 800, 600);
  });

  it('should resolve with a new File when toBlob succeeds', (done) => {
    const mockBlob = new Blob(['mock-content'], { type: 'image/jpeg' });
    mockCanvas.toBlob = vi.fn((callback) => callback(mockBlob));

    compressWithCanvas(
      mockImage,
      'test.jpg',
      800,
      600,
      (result) => {
        expect(result).toBeInstanceOf(File);
        expect((result as any).name).toBe('test.jpg');
        expect((result as any).type).toBe('image/jpeg');
        done();
      },
      0.7,
    );
  });

  it('should resolve with an empty object when toBlob fails', (done) => {
    mockCanvas.toBlob = vi.fn((callback) => callback(null));

    compressWithCanvas(
      mockImage,
      'test.jpg',
      800,
      600,
      (result) => {
        expect(result).toEqual({});
        done();
      },
      0.7,
    );
  });
});
