import { beforeEach, describe, expect, it } from 'vitest';
import { CalcClassPipe } from '../calc-class.pipe';
import { Bite } from 'model';

describe('CalcClassPipe', () => {
  let pipe: CalcClassPipe;

  beforeEach(() => {
    pipe = new CalcClassPipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return "liked" when user liked bite with matching likeType', () => {
    const mockBite: Bite = {
      likes: [{ userId: 'user123', likeType: 'thumbup' }],
    } as Bite;

    const result = pipe.transform(mockBite, 'user123', 'thumbup');
    expect(result).toBe('liked');
  });

  it('should return empty string when user liked bite with different likeType', () => {
    const mockBite: Bite = {
      likes: [{ userId: 'user123', likeType: 'thumbup' }],
    } as Bite;

    const result = pipe.transform(mockBite, 'user123', 'mindblown');
    expect(result).toBe('');
  });

  it('should return empty string when user has not liked the bite', () => {
    const mockBite: Bite = {
      likes: [{ userId: 'otherUser', likeType: 'thumbup' }],
    } as Bite;

    const result = pipe.transform(mockBite, 'user123', 'thumbup');
    expect(result).toBe('');
  });

  it('should return empty string when bite has no likes', () => {
    const mockBite: Bite = {
      likes: [],
    } as unknown as Bite;

    const result = pipe.transform(mockBite, 'user123', 'thumbup');
    expect(result).toBe('');
  });

  it('should return empty string when bite is undefined', () => {
    const result = pipe.transform(undefined, 'user123', 'thumbup');
    expect(result).toBe('');
  });
});
