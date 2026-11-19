jest.mock('bite-tribe/api', () => ({
  BiteTribeApiService: jest.fn(),
}));

import { TestBed } from '@angular/core/testing';
import { BiteTribeApiService } from 'bite-tribe/api';
import type { CreateAndUploadImageCallbackParams, Restaurant } from 'model';
import {
  RestaurantImageUploadService,
  STALE_PENDING_RESTAURANT_IMAGE_MS,
  STALLED_RESTAURANT_IMAGE_UPLOAD_MS,
} from '../restaurant-image-upload.service';

type Progress = (p: CreateAndUploadImageCallbackParams) => void;

/** See GitHub issue #2126; the restaurant photo follows the profile photo (#1953). */
describe(RestaurantImageUploadService.name, () => {
  let service: RestaurantImageUploadService;
  let progress: Progress;
  let apiMock: {
    uploadRestaurantImage: jest.Mock;
    setRestaurantImageStatus: jest.Mock;
    setUploadedRestaurantImage: jest.Mock;
  };

  const PHOTO = 'data:image/jpeg;base64,AAAA';
  const flush = (): Promise<void> => Promise.resolve().then(() => undefined);

  beforeEach(() => {
    jest.useFakeTimers();
    apiMock = {
      uploadRestaurantImage: jest.fn(
        (_id: string, _photo: string, callback: Progress) => {
          progress = callback;
          return new Promise<void>(() => undefined);
        },
      ),
      setRestaurantImageStatus: jest.fn().mockResolvedValue(undefined),
      setUploadedRestaurantImage: jest
        .fn()
        .mockResolvedValue('https://example.test/new.jpg'),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: BiteTribeApiService, useValue: apiMock }],
    });
    service = TestBed.inject(RestaurantImageUploadService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('marks the restaurant pending and starts the transfer', () => {
    service.start('r-1', PHOTO);

    expect(apiMock.setRestaurantImageStatus).toHaveBeenCalledWith(
      'r-1',
      'pending',
      expect.any(Number),
    );
    expect(apiMock.uploadRestaurantImage).toHaveBeenCalledWith(
      'r-1',
      PHOTO,
      expect.any(Function),
    );
    expect(service.upload()).toEqual({
      restaurantId: 'r-1',
      status: 'pending',
      photo: PHOTO,
    });
  });

  it("starts a different restaurant without the previous one's photo", () => {
    service.start('r-2', PHOTO);

    expect(service.upload()?.imagePath).toBeUndefined();
  });

  it('points the restaurant at the photo once it lands', async () => {
    service.start('r-1', PHOTO);
    progress({
      imagePath: 'images/restaurants/r-1/x.jpg',
      uploadParams: { evt: { completed: true } },
    } as CreateAndUploadImageCallbackParams);
    await flush();
    await flush();

    expect(apiMock.setUploadedRestaurantImage).toHaveBeenCalledWith(
      'r-1',
      'images/restaurants/r-1/x.jpg',
    );
    expect(service.upload()).toEqual({
      restaurantId: 'r-1',
      status: 'uploaded',
      imagePath: 'https://example.test/new.jpg',
    });
  });

  it('writes off a transfer that errors, and keeps the photo for a retry', () => {
    service.start('r-1', PHOTO);
    progress({
      imagePath: '',
      uploadParams: { err: new Error('offline') },
    } as unknown as CreateAndUploadImageCallbackParams);

    expect(apiMock.setRestaurantImageStatus).toHaveBeenLastCalledWith(
      'r-1',
      'failed',
    );
    expect(service.upload()?.status).toBe('failed');
    expect(service.canRetry()).toBe(true);
  });

  it('writes off a transfer that stops reporting', () => {
    service.start('r-1', PHOTO);
    jest.advanceTimersByTime(STALLED_RESTAURANT_IMAGE_UPLOAD_MS);

    expect(service.upload()?.status).toBe('failed');
  });

  it('keeps a transfer that is still reporting progress', () => {
    service.start('r-1', PHOTO);
    jest.advanceTimersByTime(STALLED_RESTAURANT_IMAGE_UPLOAD_MS - 1);
    progress({
      imagePath: '',
      uploadParams: { evt: { completed: false } },
    } as unknown as CreateAndUploadImageCallbackParams);
    jest.advanceTimersByTime(STALLED_RESTAURANT_IMAGE_UPLOAD_MS - 1);

    expect(service.upload()?.status).toBe('pending');
  });

  it('sends the same photo again on retry', () => {
    service.start('r-1', PHOTO);
    jest.advanceTimersByTime(STALLED_RESTAURANT_IMAGE_UPLOAD_MS);

    expect(service.retry()).toBe(true);
    expect(apiMock.uploadRestaurantImage).toHaveBeenCalledTimes(2);
    expect(service.upload()?.status).toBe('pending');
  });

  it('keeps a photo that landed this session when a later upload fails', async () => {
    service.start('r-1', PHOTO);
    progress({
      imagePath: 'images/restaurants/r-1/x.jpg',
      uploadParams: { evt: { completed: true } },
    } as CreateAndUploadImageCallbackParams);
    await flush();
    await flush();

    service.start('r-1', 'data:image/jpeg;base64,BBBB');
    jest.advanceTimersByTime(STALLED_RESTAURANT_IMAGE_UPLOAD_MS);

    expect(service.upload()).toEqual(
      expect.objectContaining({
        status: 'failed',
        imagePath: 'https://example.test/new.jpg',
      }),
    );
  });

  it('answers false on retry when this session holds no photo', () => {
    expect(service.retry()).toBe(false);
  });

  describe('edge cases', () => {
    const complete = (): void =>
      progress({
        imagePath: 'images/restaurants/r-1/x.jpg',
        uploadParams: { evt: { completed: true } },
      } as CreateAndUploadImageCallbackParams);

    it('ignores a second start while a transfer is in flight', () => {
      service.start('r-1', PHOTO);
      service.start('r-1', 'data:image/jpeg;base64,BBBB');

      expect(apiMock.uploadRestaurantImage).toHaveBeenCalledTimes(1);
    });

    it('answers true on retry while a transfer is in flight, without sending again', () => {
      service.start('r-1', PHOTO);

      expect(service.retry()).toBe(true);
      expect(apiMock.uploadRestaurantImage).toHaveBeenCalledTimes(1);
    });

    it('fails a transfer whose upload call rejects', async () => {
      apiMock.uploadRestaurantImage.mockRejectedValueOnce(new Error('denied'));

      service.start('r-1', PHOTO);
      await flush();

      expect(service.upload()?.status).toBe('failed');
    });

    it('swallows a status write that is refused', async () => {
      apiMock.setRestaurantImageStatus.mockRejectedValue(new Error('denied'));

      service.start('r-1', PHOTO);
      jest.advanceTimersByTime(STALLED_RESTAURANT_IMAGE_UPLOAD_MS);
      await flush();

      expect(service.upload()?.status).toBe('failed');
    });

    it('ignores a completion that arrives after the transfer was written off', async () => {
      service.start('r-1', PHOTO);
      jest.advanceTimersByTime(STALLED_RESTAURANT_IMAGE_UPLOAD_MS);
      complete();
      await flush();

      expect(apiMock.setUploadedRestaurantImage).not.toHaveBeenCalled();
      expect(service.upload()?.status).toBe('failed');
    });

    it('ignores an error that arrives after the transfer finished', async () => {
      service.start('r-1', PHOTO);
      complete();
      await flush();
      await flush();
      progress({
        imagePath: '',
        uploadParams: { err: new Error('late') },
      } as unknown as CreateAndUploadImageCallbackParams);

      expect(service.upload()?.status).toBe('uploaded');
    });

    it('still counts the photo as landed when pointing the restaurant at it is refused', async () => {
      const warn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      apiMock.setUploadedRestaurantImage.mockRejectedValueOnce(
        new Error('denied'),
      );

      service.start('r-1', PHOTO);
      complete();
      await flush();
      await flush();

      expect(service.upload()?.status).toBe('uploaded');
      warn.mockRestore();
    });
  });

  describe('statusFor', () => {
    const NOW = 1_000_000_000;
    const stored = (over: Partial<Restaurant>): Restaurant =>
      ({ id: 'r-2', name: 'x', position: {}, ...over }) as Restaurant;

    it("prefers this session's upload for the same restaurant", () => {
      service.start('r-2', PHOTO);

      expect(service.statusFor(stored({ imageStatus: 'failed' }), NOW)).toBe(
        'pending',
      );
    });

    it('reads a stored pending that is too old to still run as failed', () => {
      expect(
        service.statusFor(
          stored({
            imageStatus: 'pending',
            imageUploadStartedAtTimestamp:
              NOW - STALE_PENDING_RESTAURANT_IMAGE_MS,
          }),
          NOW,
        ),
      ).toBe('failed');
    });

    it('keeps a recent pending, and one with no start time, pending', () => {
      expect(
        service.statusFor(
          stored({
            imageStatus: 'pending',
            imageUploadStartedAtTimestamp: NOW - 1000,
          }),
          NOW,
        ),
      ).toBe('pending');
      expect(service.statusFor(stored({ imageStatus: 'pending' }), NOW)).toBe(
        'pending',
      );
    });

    it('reads a restaurant with no status as settled', () => {
      expect(service.statusFor(stored({}), NOW)).toBeUndefined();
    });

    it('has no status without a restaurant', () => {
      expect(service.statusFor(undefined, NOW)).toBeUndefined();
    });
  });
});
