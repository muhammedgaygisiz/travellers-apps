import { CountPipe } from '../count.pipe';

describe('CountPipe', () => {
  let pipe: CountPipe;

  beforeEach(() => {
    pipe = new CountPipe();
  });

  it('should return the length of the array', () => {
    const array = [1, 2, 3, 4, 5];
    expect(pipe.transform(array)).toBe(5);
  });

  it('should return 0 for an empty array', () => {
    const array: unknown[] = [];
    expect(pipe.transform(array)).toBe(0);
  });

  it('should return 0 for null or undefined', () => {
    expect(pipe.transform(null)).toBe(0);
    expect(pipe.transform(undefined)).toBe(0);
  });
});
