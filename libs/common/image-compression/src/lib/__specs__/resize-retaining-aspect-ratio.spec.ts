import { describe, expect, it } from 'vitest';
import { resizeRetainingAspectRatio } from '../resize-retaining-aspect-ratio';

describe('resizeRetainingAspectRatio', () => {
  it('should return the original dimensions if within maxWidth and maxHeight', () => {
    const img = { width: 800, height: 600 } as HTMLImageElement;
    const [newWidth, newHeight] = resizeRetainingAspectRatio(img, 1000, 1000);

    expect(newWidth).toBe(800);
    expect(newHeight).toBe(600);
  });

  it('should resize the width to fit within maxWidth while maintaining aspect ratio', () => {
    const img = { width: 1600, height: 1200 } as HTMLImageElement;
    const [newWidth, newHeight] = resizeRetainingAspectRatio(img, 800, 1000);

    expect(newWidth).toBe(800);
    expect(newHeight).toBe(600);
  });

  it('should resize the height to fit within maxHeight while maintaining aspect ratio', () => {
    const img = { width: 800, height: 1200 } as HTMLImageElement;
    const [newWidth, newHeight] = resizeRetainingAspectRatio(img, 1000, 600);

    expect(newWidth).toBe(400);
    expect(newHeight).toBe(600);
  });

  it('should resize both dimensions to fit within maxWidth and maxHeight while maintaining aspect ratio', () => {
    const img = { width: 1600, height: 1200 } as HTMLImageElement;
    const [newWidth, newHeight] = resizeRetainingAspectRatio(img, 800, 600);

    expect(newWidth).toBe(800);
    expect(newHeight).toBe(600);
  });

  it('should handle edge cases where width or height is zero', () => {
    const img = { width: 0, height: 1200 } as HTMLImageElement;
    const [newWidth, newHeight] = resizeRetainingAspectRatio(img, 800, 600);

    expect(newWidth).toBe(0);
    expect(newHeight).toBe(600);
  });
});
