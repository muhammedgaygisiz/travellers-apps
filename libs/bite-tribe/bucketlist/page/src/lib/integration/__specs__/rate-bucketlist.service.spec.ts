import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BucketlistsDataAccessService } from 'bite-tribe/bucketlist-data-access';
import { Bucketlist } from 'model';
import { RateBucketlistService } from '../rate-bucketlist.service';
import { NavController } from '@ionic/angular/standalone';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';

const getOwnBiteTrailRatingMock = jest.fn();
const createOwnBiteTrailRatingMock = jest.fn();
const backMock = jest.fn();
const logEventMock = jest.fn();
const selectedBucketlistSignal = signal<Bucketlist>({
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
    backMock.mockReset();
    logEventMock.mockReset();
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
        {
          provide: NavController,
          useValue: {
            back: backMock,
          },
        },
        {
          provide: AnalyticsService,
          useValue: { logEvent: logEventMock },
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
    expect(backMock).toHaveBeenCalled();
    expect(logEventMock).toHaveBeenCalledWith(AnalyticsEvent.BucketListRated, {
      rating: 5,
    });
  });

  it('should not log a rating event when submission is a no-op', async () => {
    getOwnBiteTrailRatingMock.mockResolvedValue(undefined);
    createOwnBiteTrailRatingMock.mockResolvedValue(false);
    service.existingRating.set(undefined);

    await service.submitRating({ rating: 5, review: 'Attempt' });

    expect(logEventMock).not.toHaveBeenCalled();
  });

  it('should not create a new rating when one already exists', async () => {
    getOwnBiteTrailRatingMock.mockResolvedValue(undefined);
    createOwnBiteTrailRatingMock.mockResolvedValue(true);
    service.existingRating.set({ rating: 4, review: 'Existing' });

    await service.submitRating({ rating: 5, review: 'Attempt' });

    expect(createOwnBiteTrailRatingMock).not.toHaveBeenCalled();
    expect(backMock).not.toHaveBeenCalled();
  });

  it('should not create rating when bucketlist has no biteTrailId', async () => {
    selectedBucketlistSignal.set({
      id: 'bucket-1',
      userId: 'user-1',
      name: 'No Trail',
      biteIds: [],
    });
    TestBed.flushEffects();
    createOwnBiteTrailRatingMock.mockClear();

    await service.submitRating({ rating: 5, review: 'Attempt' });

    expect(createOwnBiteTrailRatingMock).not.toHaveBeenCalled();
    expect(backMock).not.toHaveBeenCalled();
  });

  it('should load existing rating when create returns false', async () => {
    getOwnBiteTrailRatingMock.mockResolvedValue({
      rating: 2,
      review: 'Existing',
    });
    createOwnBiteTrailRatingMock.mockResolvedValue(false);
    service.existingRating.set(undefined);

    await service.submitRating({ rating: 5, review: 'Attempt' });

    expect(getOwnBiteTrailRatingMock).toHaveBeenCalledWith('trail-1');
    expect(service.existingRating()).toEqual({ rating: 2, review: 'Existing' });
    expect(backMock).not.toHaveBeenCalled();
  });

  it('should clear existing rating when selected bucketlist has no biteTrailId', async () => {
    service.existingRating.set({ rating: 5, review: 'Existing' });

    selectedBucketlistSignal.set({
      id: 'bucket-1',
      userId: 'user-1',
      name: 'No Trail',
      biteIds: [],
    });
    TestBed.flushEffects();

    expect(service.existingRating()).toBeUndefined();
  });

  it('should keep existing rating undefined when there is no biteTrailId', () => {
    selectedBucketlistSignal.set({
      id: 'bucket-1',
      userId: 'user-1',
      name: 'No Trail',
      biteIds: [],
    });
    TestBed.flushEffects();

    expect(getOwnBiteTrailRatingMock).not.toHaveBeenCalled();
    expect(service.existingRating()).toBeUndefined();
  });
});
