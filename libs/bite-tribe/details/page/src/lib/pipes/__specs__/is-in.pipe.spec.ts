import { beforeEach, describe, expect, it } from 'vitest';
import { IsInPipe } from '../is-in.pipe';
import { Bite, Bucketlist } from 'model';

describe('IsInPipe', () => {
  let pipe: IsInPipe;

  const mockBite: Bite = {
    id: 'bite1',
    name: 'Test Bite',
  } as Bite;

  const mockBucketlist: Bucketlist = {
    id: 'list1',
    name: 'Test List',
    biteIds: ['bite1', 'bite2'],
  } as Bucketlist;

  beforeEach(() => {
    pipe = new IsInPipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return "bookmark" when bite is in bucketlist', () => {
    expect(pipe.transform(mockBite, mockBucketlist)).toBe('bookmark');
  });

  it('should return "bookmark-outline" when bite is not in bucketlist', () => {
    const differentBite = { ...mockBite, id: 'bite3' };
    expect(pipe.transform(differentBite, mockBucketlist)).toBe(
      'bookmark-outline',
    );
  });

  it('should return "bookmark-outline" when bite is undefined', () => {
    expect(pipe.transform(undefined, mockBucketlist)).toBe('bookmark-outline');
  });

  it('should return "bookmark-outline" when bucketlist is undefined', () => {
    expect(pipe.transform(mockBite, undefined as unknown as Bucketlist)).toBe(
      'bookmark-outline',
    );
  });

  it('should return "bookmark-outline" when both bite and bucketlist are undefined', () => {
    expect(pipe.transform(undefined, undefined as unknown as Bucketlist)).toBe(
      'bookmark-outline',
    );
  });
});
