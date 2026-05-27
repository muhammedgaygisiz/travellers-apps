import { ImageErroredPipe } from '../image-errored.pipe';

describe('ImageErroredPipe', () => {
  let pipe: ImageErroredPipe;

  beforeEach(() => {
    pipe = new ImageErroredPipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return true when userId is in the errored set', () => {
    const erroredIds = new Set(['user1', 'user2']);
    expect(pipe.transform('user1', erroredIds)).toBe(true);
  });

  it('should return false when userId is not in the errored set', () => {
    const erroredIds = new Set(['user1']);
    expect(pipe.transform('unknown', erroredIds)).toBe(false);
  });

  it('should return false for an empty set', () => {
    expect(pipe.transform('user1', new Set())).toBe(false);
  });
});
