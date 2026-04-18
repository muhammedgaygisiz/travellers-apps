import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BucketlistsDataAccessService } from 'bite-tribe/bucketlist-data-access';
import { RateBucketlistService } from '../rate-bucketlist.service';

const getOwnBiteTrailRatingMock = jest.fn();
const createOwnBiteTrailRatingMock = jest.fn();
const selectedBucketlistSignal = signal({
  id: 'bucket-1',
  userId: 'user-1',
  name: 'Paid Trail',
  biteIds: [],
  biteTrailId: 'trail-1',
});

describe('RateBucketlistService', () => {
  let service: RateBucketlistService;

  beforeEach(() => {
    getOwnBiteTrailRatingMock.mockReset();
    createOwnBiteTrailRatingMock.mockReset();
    getOwnBiteTrailRatingMock.mockResolvedValue(undefined);
    selectedBucketlistSignal.set({
      id: 'bucket-1',
      userId: 'user-1',
      name: 'Paid Trail',
      biteIds: [],
      biteTrailId: 'trail-1',
    });

    TestBed.configureTestingModule({
      providers: [
        {
          provide: BucketlistsDataAccessService,
          useValue: {
            selectedBucketlist: selectedBucketlistSignal,
            getOwnBiteTrailRating: getOwnBiteTrailRatingMock,
            createOwnBiteTrailRating: createOwnBiteTrailRatingMock,
          },
        },
      ],
    });

    service = TestBed.inject(RateBucketlistService);
  });

  it('should create rating and cache it when submission succeeds', async () => {
    getOwnBiteTrailRatingMock.mockResolvedValue(undefined);
    createOwnBiteTrailRatingMock.mockResolvedValue(true);

    await service.submitRating({ rating: 5, review: 'Great!' });

    expect(createOwnBiteTrailRatingMock).toHaveBeenCalledWith({
      biteTrailId: 'trail-1',
      rating: 5,
      review: 'Great!',
    });
    expect(service.existingRating()).toEqual({ rating: 5, review: 'Great!' });
  });

  it('should not create a new rating when one already exists', async () => {
    getOwnBiteTrailRatingMock.mockResolvedValue(undefined);
    createOwnBiteTrailRatingMock.mockResolvedValue(true);
    service.existingRating.set({ rating: 4, review: 'Existing' });

    await service.submitRating({ rating: 5, review: 'Attempt' });

    expect(createOwnBiteTrailRatingMock).not.toHaveBeenCalled();
  });
});
