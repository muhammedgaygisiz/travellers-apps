import { Bite, Like } from 'model';
import {
  bitesByBucketlist,
  bitesByBucketlistWithMetadata,
} from '../bites-by-bucketlist.selector';

const mockBite1 = {
  id: '1',
  name: 'Test Bite 1',
  place: 'Test Place',
  price: 10,
  userId: 'user1',
} as Bite;

const mockBite2 = {
  id: '2',
  name: 'Test Bite 2',
  place: 'Test Place 2',
  price: 15,
  userId: 'user2',
} as Bite;

describe('Bites by Bucketlist', () => {
  describe('bitesByBucketlistWithMetadata', () => {
    it('should enrich bites with likes and distance metadata', () => {
      const bites = [mockBite1, mockBite2];
      const likes: Like[] = [];
      const gpsPosition = { latitude: 0, longitude: 0 };

      const result = bitesByBucketlistWithMetadata.projector(
        bites,
        likes,
        gpsPosition,
      );

      expect(result).toEqual([
        {
          ...mockBite1,
          likes: [],
        },
        {
          ...mockBite2,
          likes: [],
        },
      ]);
    });
  });

  describe('bitesByBucketlist', () => {
    it('should filter bites by selected bucketlist', () => {
      const bites = [
        {
          ...mockBite1,
          likes: [],
        },
        {
          ...mockBite2,
          likes: [],
        },
      ];
      const selectedBucketlist = {
        id: 'bucketlist1',
        name: 'Test Bucketlist',
        biteIds: ['1'],
        userId: 'user1',
      };

      const result = bitesByBucketlist.projector(bites, selectedBucketlist);

      expect(result).toEqual([
        {
          ...mockBite1,
          likes: [],
        },
      ]);
    });
  });
});
