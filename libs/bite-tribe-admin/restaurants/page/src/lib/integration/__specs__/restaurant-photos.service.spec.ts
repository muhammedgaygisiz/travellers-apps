import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { RestaurantsDataAccessService } from 'bite-tribe-admin/restaurants-data-access';
import { ToastService } from 'toast';
import { RestaurantPhotosService } from '../restaurant-photos.service';

jest.mock('bite-tribe-admin/restaurants-data-access', () => ({
  RestaurantsDataAccessService: class {},
}));

/** Attaching a photo to a restaurant that has none (GitHub issue #1510). */
describe(RestaurantPhotosService.name, () => {
  let service: RestaurantPhotosService;
  let attachRestaurantPhoto: jest.Mock;
  let present: jest.Mock;

  beforeEach(() => {
    attachRestaurantPhoto = jest.fn();
    present = jest.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        RestaurantPhotosService,
        {
          provide: RestaurantsDataAccessService,
          useValue: {
            restaurantsWithoutPhoto: signal([]),
            restaurants: { isLoading: (): boolean => false },
            attachRestaurantPhoto,
            logout: jest.fn(),
          },
        },
        { provide: ToastService, useValue: { present } },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string): string => key },
        },
      ],
    });

    service = TestBed.inject(RestaurantPhotosService);
  });

  it('says a photo the check passed is attached', async () => {
    attachRestaurantPhoto.mockResolvedValue({
      imageStatus: 'uploaded',
      imagePath: 'https://p',
    });

    await service.attach('restaurant-1', 'photo');

    expect(attachRestaurantPhoto).toHaveBeenCalledWith('restaurant-1', 'photo');
    expect(present).toHaveBeenCalledWith({
      messageKey: 'restaurant-photos-attached',
      outcome: 'success',
    });
    expect(service.attachingId()).toBeUndefined();
  });

  it('says why a refused photo was refused', async () => {
    attachRestaurantPhoto.mockResolvedValue({
      imageStatus: 'refused',
      imageRefusalCategory: 'violence',
    });

    await service.attach('restaurant-1', 'photo');

    expect(present).toHaveBeenCalledWith({
      message: expect.stringContaining('restaurant-photos-refused'),
      outcome: 'failure',
    });
  });

  it('says a photo still being checked appears once checked', async () => {
    attachRestaurantPhoto.mockResolvedValue(undefined);

    await service.attach('restaurant-1', 'photo');

    expect(present).toHaveBeenCalledWith({
      messageKey: 'restaurant-photos-checking',
      outcome: 'success',
    });
  });

  it('reports a failed upload and lets it be tried again', async () => {
    attachRestaurantPhoto.mockRejectedValue(new Error('stalled'));

    await service.attach('restaurant-1', 'photo');

    expect(present).toHaveBeenCalledWith({
      messageKey: 'something-went-wrong-please-try-again',
      outcome: 'failure',
    });
    expect(service.attachingId()).toBeUndefined();
  });

  it('starts no second attach while one runs', async () => {
    let finish: () => void = () => undefined;
    attachRestaurantPhoto.mockReturnValue(
      new Promise((resolve) => (finish = (): void => resolve(undefined))),
    );

    const first = service.attach('restaurant-1', 'photo');
    expect(service.attachingId()).toBe('restaurant-1');
    await service.attach('restaurant-2', 'photo');
    finish();
    await first;

    expect(attachRestaurantPhoto).toHaveBeenCalledTimes(1);
  });
});
