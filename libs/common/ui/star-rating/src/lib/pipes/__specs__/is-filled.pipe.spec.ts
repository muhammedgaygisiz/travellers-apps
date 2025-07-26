import { IsFilledPipe } from '../is-filled.pipe';

describe('IsFilledPipe', () => {
  let pipe: IsFilledPipe;

  beforeEach(() => {
    pipe = new IsFilledPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('transform', () => {
    describe('when hovering', () => {
      it('should return true when index is less than or equal to hoveredIndex', () => {
        expect(pipe.transform(1, 2, 0)).toBe(true);
        expect(pipe.transform(2, 2, 0)).toBe(true);
      });

      it('should return false when index is greater than hoveredIndex', () => {
        expect(pipe.transform(3, 2, 0)).toBe(false);
      });
    });

    describe('when not hovering', () => {
      const NOT_HOVERING = -1;

      it('should return true when index is less than or equal to rating', () => {
        expect(pipe.transform(1, NOT_HOVERING, 2)).toBe(true);
        expect(pipe.transform(2, NOT_HOVERING, 2)).toBe(true);
      });

      it('should return false when index is greater than rating', () => {
        expect(pipe.transform(3, NOT_HOVERING, 2)).toBe(false);
      });

      it('should handle undefined rating by using default value 0', () => {
        expect(pipe.transform(1, NOT_HOVERING)).toBe(false);
      });

      it('should handle zero rating', () => {
        expect(pipe.transform(1, NOT_HOVERING, 0)).toBe(false);
      });
    });
  });
});
