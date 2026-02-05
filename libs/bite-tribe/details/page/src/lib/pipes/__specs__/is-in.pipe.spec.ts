import { IsInPipe } from '../is-in.pipe';
import type { Bite, Bucketlist } from 'model';

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

  describe('given bite is in bucketlist', () => {
    it('should return "bookmark"', () => {
      expect(pipe.transform(mockBite, mockBucketlist)).toBe('bookmark');
    });
  });

  describe('given bite is not in bucketlist', () => {
    it('should return "bookmark-outline"', () => {
      const differentBite = { ...mockBite, id: 'bite3' };
      expect(pipe.transform(differentBite, mockBucketlist)).toBe(
        'bookmark-outline',
      );
    });
  });

  describe('given bite is undefined', () => {
    it('should return "bookmark-outline"', () => {
      expect(pipe.transform(undefined, mockBucketlist)).toBe(
        'bookmark-outline',
      );
    });
  });

  describe('given bucketlist is undefined', () => {
    it('should return "bookmark-outline"', () => {
      expect(pipe.transform(mockBite, undefined as unknown as Bucketlist)).toBe(
        'bookmark-outline',
      );
    });
  });

  describe('given bite and bucketlist but bite id list is undefined', () => {
    it('should return "bookmark-outline"', () => {
      const bucketlistWithoutBiteIds = {
        ...mockBucketlist,
        biteIds: undefined as any,
      };

      expect(pipe.transform(mockBite, bucketlistWithoutBiteIds)).toBe(
        'bookmark-outline',
      );
    });
  });

  describe('given bite and bucketlist are undefined', () => {
    it('should return "bookmark-outline"', () => {
      expect(
        pipe.transform(undefined, undefined as unknown as Bucketlist),
      ).toBe('bookmark-outline');
    });
  });
});
