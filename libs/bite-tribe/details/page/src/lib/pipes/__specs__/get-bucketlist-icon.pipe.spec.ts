import { GetBucketlistIconPipe } from '../get-bucketlist-icon.pipe';
import type { Bite, Bucketlist } from 'model';

describe('GetBucketlistIconPipe', () => {
  let pipe: GetBucketlistIconPipe;

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
    pipe = new GetBucketlistIconPipe();
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
      expect(pipe.transform(mockBite, undefined)).toBe('bookmark-outline');
    });
  });

  describe('given bite and bucketlist but bite id list is undefined', () => {
    it('should return "bookmark-outline"', () => {
      const bucketlistWithoutBiteIds = {
        ...mockBucketlist,
        biteIds: undefined,
      };

      expect(pipe.transform(mockBite, bucketlistWithoutBiteIds)).toBe(
        'bookmark-outline',
      );
    });
  });

  describe('given bite and bucketlist are undefined', () => {
    it('should return "bookmark-outline"', () => {
      expect(pipe.transform(undefined, undefined)).toBe('bookmark-outline');
    });
  });
});
