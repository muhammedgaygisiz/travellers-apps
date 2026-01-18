import { inject, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { BiteTribeApiService } from '../bite-tribe-api.service';
import { ReviewApiService } from '../review-api.service';
import { RestaurantApiService } from '../restaurant-api.service';
import { MenuApiService } from '../menu-api.service';
import { LikeApiService } from '../like-api.service';
import { BucketlistApiService } from '../bucketlist-api.service';
import { ProfileApiService } from '../profile-api.service';
import { BiteApiService } from '../bite-api/bite-api.service';
import { SettingsApiService } from '../settings-api.service';
import { ExchangeRatesApiService } from '../exchange-rates-api.service';
import { of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';

const assertEqual = (a: any, b: any): void => {
  expect(a).toEqual(b);
};

class Mock {
  publicProfile$ = of(null);
  settings$ = of(null);
  getExchangeRates = jest.fn();
  saveNewReview = jest.fn();
  reviewsByBiteId = jest.fn();
  saveSocialMediaLinksForRestaurant = jest.fn();
  saveNewRestaurant = jest.fn();
  loadRestaurant = jest.fn();
  saveMenu = jest.fn();
  loadMenu = jest.fn();
  removeLike = jest.fn();
  saveLike = jest.fn();
  createBucketList = jest.fn();
  removeBiteFromBucketlist = jest.fn();
  createBucketListAndSaveBiteIdToBucketList = jest.fn();
  saveBiteIdToBucketList = jest.fn();
  getUserByBiteId = jest.fn();
  saveEditedBite = jest.fn();
  saveNewBite = jest.fn();
  updateUser = jest.fn();
  saveUser = jest.fn();
  saveSettings = jest.fn();
  saveUserIfNotExisting = jest.fn();
  followUser = jest.fn();
  loadBitesByLocation = jest.fn();
  loadBitesByUser = jest.fn();
  loadBitesByBucketlist = jest.fn();
  deleteBite = jest.fn();
  startListener = jest.fn();
}

describe('BiteTribeApiService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BiteTribeApiService,
        { provide: ReviewApiService, useClass: Mock },
        { provide: RestaurantApiService, useClass: Mock },
        { provide: MenuApiService, useClass: Mock },
        { provide: LikeApiService, useClass: Mock },
        { provide: BucketlistApiService, useClass: Mock },
        { provide: ProfileApiService, useClass: Mock },
        { provide: BiteApiService, useClass: Mock },
        { provide: SettingsApiService, useClass: Mock },
        { provide: ExchangeRatesApiService, useClass: Mock },
        provideMockStore(),
      ],
    }).compileComponents();
  });

  it('should create the service', inject(
    [BiteTribeApiService],
    (service: BiteTribeApiService) => {
      expect(service).toBeTruthy();
    },
  ));

  describe('settings$', () => {
    const scheduler = new TestScheduler(assertEqual);
    const classListSpy = jest.spyOn(
      document.documentElement.classList,
      'toggle',
    );

    beforeEach(() => classListSpy.mockClear());

    describe('given a dark theme', () => {
      beforeEach(() => {
        TestBed.overrideProvider(SettingsApiService, {
          useValue: { settings$: of({ theme: 'dark' }) },
        });
      });

      it('should add dark class to document element', inject(
        [BiteTribeApiService, SettingsApiService],
        (
          service: BiteTribeApiService,
          settingsApiService: SettingsApiService,
        ) => {
          scheduler.run(({ expectObservable }) => {
            expectObservable(service.settings$).toBe('(a|)', {
              a: { theme: 'dark' },
            });
          });

          expect(classListSpy).toHaveBeenCalledWith('dark', true);
        },
      ));
    });

    describe('given a light theme', () => {
      beforeEach(() => {
        TestBed.overrideProvider(SettingsApiService, {
          useValue: { settings$: of({ theme: 'light' }) },
        });
      });

      it('should add light class to document element', inject(
        [BiteTribeApiService, SettingsApiService],
        (
          service: BiteTribeApiService,
          settingsApiService: SettingsApiService,
        ) => {
          scheduler.run(({ expectObservable }) => {
            expectObservable(service.settings$).toBe('(a|)', {
              a: { theme: 'light' },
            });
          });

          expect(classListSpy).toHaveBeenCalledWith('light', true);
        },
      ));
    });

    describe('with undefined settings', () => {
      beforeEach(() => {
        TestBed.overrideProvider(SettingsApiService, {
          useValue: { settings$: of(undefined) },
        });
      });

      it('should not modify document element classes', inject(
        [BiteTribeApiService, SettingsApiService],
        (
          service: BiteTribeApiService,
          settingsApiService: SettingsApiService,
        ) => {
          scheduler.run(({ expectObservable }) => {
            expectObservable(service.settings$).toBe('(a|)', { a: undefined });
          });

          expect(classListSpy).not.toHaveBeenCalled();
        },
      ));
    });
  });

  describe('getExchangeRates', () => {
    it('should call getExchangeRates on ExchangeRatesApiService', inject(
      [BiteTribeApiService, ExchangeRatesApiService],
      (
        service: BiteTribeApiService,
        exchangeRatesApiService: ExchangeRatesApiService,
      ) => {
        const getExchangeRatesSpy = jest
          .spyOn(exchangeRatesApiService, 'getExchangeRates')
          .mockReturnValue(Promise.resolve({ USD: 1, EUR: 0.85 }));
        service.getExchangeRates();
        expect(getExchangeRatesSpy).toHaveBeenCalledTimes(1);
      },
    ));
  });

  describe('saveNewReview', () => {
    it('should call saveNewReview on ReviewApiService', inject(
      [BiteTribeApiService, ReviewApiService],
      (service: BiteTribeApiService, reviewApiService: ReviewApiService) => {
        const saveNewReviewSpy = jest.spyOn(reviewApiService, 'saveNewReview');
        const reviewData = { biteId: 'bite-id', review: 'Great!' };
        service.saveNewReview(reviewData);
        expect(saveNewReviewSpy).toHaveBeenCalledWith(reviewData);
      },
    ));
  });

  describe('reviewsByBiteId', () => {
    it('should call reviewsByBiteId on ReviewApiService', inject(
      [BiteTribeApiService, ReviewApiService],
      (service: BiteTribeApiService, reviewApiService: ReviewApiService) => {
        const reviewsByBiteIdSpy = jest
          .spyOn(reviewApiService, 'reviewsByBiteId')
          .mockReturnValue(of([]));
        const biteId = 'bite-id';
        service.reviewsByBiteId(biteId);
        expect(reviewsByBiteIdSpy).toHaveBeenCalledWith(biteId);
      },
    ));
  });

  describe('saveSocialMediaLinksForRestaurant', () => {
    it('should call saveSocialMediaLinksForRestaurant on RestaurantApiService', inject(
      [BiteTribeApiService, RestaurantApiService],
      (
        service: BiteTribeApiService,
        restaurantApiService: RestaurantApiService,
      ) => {
        const saveSocialMediaLinksForRestaurantSpy = jest.spyOn(
          restaurantApiService,
          'saveSocialMediaLinksForRestaurant',
        );
        const restaurantId = 'restaurant-id';
        const links = [
          { network: 'facebook', url: 'https://facebook.com/restaurant' },
        ];
        service.saveSocialMediaLinksForRestaurant(restaurantId, links);
        expect(saveSocialMediaLinksForRestaurantSpy).toHaveBeenCalledWith(
          restaurantId,
          links,
        );
      },
    ));
  });

  describe('saveNewRestaurant', () => {
    it('should call saveNewRestaurant on RestaurantApiService', inject(
      [BiteTribeApiService, RestaurantApiService],
      (
        service: BiteTribeApiService,
        restaurantApiService: RestaurantApiService,
      ) => {
        const saveNewRestaurantSpy = jest.spyOn(
          restaurantApiService,
          'saveNewRestaurant',
        );
        const restaurant = {
          id: 'restaurant-id',
          name: 'Test Restaurant',
        } as any;
        service.saveNewRestaurant(restaurant);
        expect(saveNewRestaurantSpy).toHaveBeenCalledWith(restaurant);
      },
    ));
  });

  describe('loadRestaurant', () => {
    it('should call loadRestaurant on RestaurantApiService', inject(
      [BiteTribeApiService, RestaurantApiService],
      (
        service: BiteTribeApiService,
        restaurantApiService: RestaurantApiService,
      ) => {
        const loadRestaurantSpy = jest
          .spyOn(restaurantApiService, 'loadRestaurant')
          .mockReturnValue(of(undefined));
        const restaurantId = 'restaurant-id';
        service.loadRestaurant(restaurantId);
        expect(loadRestaurantSpy).toHaveBeenCalledWith(restaurantId);
      },
    ));
  });

  describe('saveMenu', () => {
    it('should call saveMenu on MenuApiService', inject(
      [BiteTribeApiService, MenuApiService],
      (service: BiteTribeApiService, menuApiService: MenuApiService) => {
        const saveMenuSpy = jest.spyOn(menuApiService, 'saveMenu');
        const menu = { id: 'menu-id', items: [] } as any;
        service.saveMenu(menu);
        expect(saveMenuSpy).toHaveBeenCalledWith(menu);
      },
    ));
  });

  describe('loadMenu', () => {
    it('should call loadMenu on MenuApiService', inject(
      [BiteTribeApiService, MenuApiService],
      (service: BiteTribeApiService, menuApiService: MenuApiService) => {
        const loadMenuSpy = jest
          .spyOn(menuApiService, 'loadMenu')
          .mockReturnValue(of(undefined));
        const menuId = 'menu-id';
        service.loadMenu(menuId);
        expect(loadMenuSpy).toHaveBeenCalledWith(menuId);
      },
    ));
  });

  describe('removeLike', () => {
    it('should call removeLike on LikeApiService', inject(
      [BiteTribeApiService, LikeApiService],
      (service: BiteTribeApiService, likeApiService: LikeApiService) => {
        const removeLikeSpy = jest.spyOn(likeApiService, 'removeLike');
        const like = { userId: 'user-id', biteId: 'bite-id', likeType: 'like' };
        service.removeLike(like);
        expect(removeLikeSpy).toHaveBeenCalledWith(like);
      },
    ));
  });

  describe('saveLike', () => {
    it('should call saveLike on LikeApiService', inject(
      [BiteTribeApiService, LikeApiService],
      (service: BiteTribeApiService, likeApiService: LikeApiService) => {
        const saveLikeSpy = jest.spyOn(likeApiService, 'saveLike');
        const like = { likeType: 'like', biteId: 'bite-id', createdAt: 'date' };
        service.saveLike(like);
        expect(saveLikeSpy).toHaveBeenCalledWith(like);
      },
    ));
  });

  describe('createBucketList', () => {
    it('should call createBucketList on BucketlistApiService', inject(
      [BiteTribeApiService, BucketlistApiService],
      (
        service: BiteTribeApiService,
        bucketlistApiService: BucketlistApiService,
      ) => {
        const createBucketListSpy = jest.spyOn(
          bucketlistApiService,
          'createBucketList',
        );
        const bucketlistName = 'My Bucketlist';
        service.createBucketList(bucketlistName);
        expect(createBucketListSpy).toHaveBeenCalledWith(bucketlistName);
      },
    ));
  });

  describe('removeBiteFromBucketlist', () => {
    it('should call removeBiteFromBucketlist on BucketlistApiService', inject(
      [BiteTribeApiService, BucketlistApiService],
      (
        service: BiteTribeApiService,
        bucketlistApiService: BucketlistApiService,
      ) => {
        const removeBiteFromBucketlistSpy = jest.spyOn(
          bucketlistApiService,
          'removeBiteFromBucketlist',
        );
        const params = { bucketlistId: 'bucketlist-id', biteId: 'bite-id' };
        service.removeBiteFromBucketlist(params);
        expect(removeBiteFromBucketlistSpy).toHaveBeenCalledWith(params);
      },
    ));
  });

  describe('createBucketListAndSaveBiteIdToBucketList', () => {
    it('should call createBucketListAndSaveBiteIdToBucketList on BucketlistApiService', inject(
      [BiteTribeApiService, BucketlistApiService],
      (
        service: BiteTribeApiService,
        bucketlistApiService: BucketlistApiService,
      ) => {
        const createBucketListAndSaveBiteIdToBucketListSpy = jest.spyOn(
          bucketlistApiService,
          'createBucketListAndSaveBiteIdToBucketList',
        );
        const params = { bucketListName: 'My Bucketlist', biteId: 'bite-id' };
        service.createBucketListAndSaveBiteIdToBucketList(params);
        expect(
          createBucketListAndSaveBiteIdToBucketListSpy,
        ).toHaveBeenCalledWith(params);
      },
    ));
  });

  describe('saveBiteIdToBucketList', () => {
    it('should call saveBiteIdToBucketList on BucketlistApiService', inject(
      [BiteTribeApiService, BucketlistApiService],
      (
        service: BiteTribeApiService,
        bucketlistApiService: BucketlistApiService,
      ) => {
        const saveBiteIdToBucketListSpy = jest.spyOn(
          bucketlistApiService,
          'saveBiteIdToBucketList',
        );
        const params = { bucketListId: 'bucketlist-id', biteId: 'bite-id' };
        service.saveBiteIdToBucketList(params);
        expect(saveBiteIdToBucketListSpy).toHaveBeenCalledWith(params);
      },
    ));
  });

  describe('getUserByBiteId', () => {
    it('should call getUserByBiteId on ProfileApiService', inject(
      [BiteTribeApiService, ProfileApiService],
      (service: BiteTribeApiService, profileApiService: ProfileApiService) => {
        const getUserByBiteIdSpy = jest
          .spyOn(profileApiService, 'getUserByBiteId')
          .mockReturnValue(of(undefined));
        const bite = { id: 'bite-id' } as any;
        service.getUserByBiteId(bite);
        expect(getUserByBiteIdSpy).toHaveBeenCalledWith(bite);
      },
    ));
  });

  describe('saveEditedBite', () => {
    it('should call saveEditedBite on BiteApiService', inject(
      [BiteTribeApiService, BiteApiService],
      (service: BiteTribeApiService, biteApiService: BiteApiService) => {
        const saveEditedBiteSpy = jest.spyOn(biteApiService, 'saveEditedBite');
        const bite = { id: 'bite-id', content: 'Updated content' } as any;
        service.saveEditedBite(bite);
        expect(saveEditedBiteSpy).toHaveBeenCalledWith(bite);
      },
    ));
  });

  describe('saveNewBite', () => {
    it('should call saveNewBite on BiteApiService', inject(
      [BiteTribeApiService, BiteApiService],
      (service: BiteTribeApiService, biteApiService: BiteApiService) => {
        const saveNewBiteSpy = jest.spyOn(biteApiService, 'saveNewBite');
        const bite = { content: 'New bite content' } as any;
        service.saveNewBite(bite);
        expect(saveNewBiteSpy).toHaveBeenCalledWith(bite);
      },
    ));
  });

  describe('updateUser', () => {
    it('should call updateUser on ProfileApiService', inject(
      [BiteTribeApiService, ProfileApiService],
      (service: BiteTribeApiService, profileApiService: ProfileApiService) => {
        const updateUserSpy = jest.spyOn(profileApiService, 'updateUser');
        const publicUser = { id: 'user-id', name: 'Updated Name' } as any;
        service.updateUser(publicUser);
        expect(updateUserSpy).toHaveBeenCalledWith(publicUser);
      },
    ));
  });

  describe('saveUser', () => {
    it('should call saveUser on ProfileApiService', inject(
      [BiteTribeApiService, ProfileApiService],
      (service: BiteTribeApiService, profileApiService: ProfileApiService) => {
        const saveUserSpy = jest.spyOn(profileApiService, 'saveUser');
        service.saveUser();
        expect(saveUserSpy).toHaveBeenCalledWith(true);
      },
    ));
  });

  describe('saveSettings', () => {
    it('should call saveSettings on SettingsApiService', inject(
      [BiteTribeApiService, SettingsApiService],
      (
        service: BiteTribeApiService,
        settingsApiService: SettingsApiService,
      ) => {
        const saveSettingsSpy = jest.spyOn(settingsApiService, 'saveSettings');
        const settings = { theme: 'dark' } as any;
        service.saveSettings(settings);
        expect(saveSettingsSpy).toHaveBeenCalledWith(settings);
      },
    ));
  });

  describe('saveUserIfNotExisting', () => {
    it('should call saveUserIfNotExisting on ProfileApiService', inject(
      [BiteTribeApiService, ProfileApiService],
      (service: BiteTribeApiService, profileApiService: ProfileApiService) => {
        const saveUserIfNotExistingSpy = jest.spyOn(
          profileApiService,
          'saveUserIfNotExisting',
        );
        service.saveUserIfNotExisting();
        expect(saveUserIfNotExistingSpy).toHaveBeenCalled();
      },
    ));
  });

  describe('followUser', () => {
    it('should call followUser on ProfileApiService', inject(
      [BiteTribeApiService, ProfileApiService],
      (service: BiteTribeApiService, profileApiService: ProfileApiService) => {
        const followUserSpy = jest.spyOn(profileApiService, 'followUser');
        const user = { id: 'user-id', name: 'Test User' } as any;
        service.followUser(user);
        expect(followUserSpy).toHaveBeenCalledWith(user);
      },
    ));
  });

  describe('bitesByPosition', () => {
    it('should call loadBitesByLocation on BiteApiService', inject(
      [BiteTribeApiService, BiteApiService],
      (service: BiteTribeApiService, biteApiService: BiteApiService) => {
        const loadBitesByLocationSpy = jest
          .spyOn(biteApiService, 'loadBitesByLocation')
          .mockReturnValue(Promise.resolve([]));
        const position = {
          coords: {
            latitude: 40.7128,
            longitude: -74.006,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition;
        service.bitesByPosition(position);
        expect(loadBitesByLocationSpy).toHaveBeenCalledWith(position);
      },
    ));
  });

  describe('bitesByUser', () => {
    it('should call loadBitesByUser on BiteApiService', inject(
      [BiteTribeApiService, BiteApiService],
      (service: BiteTribeApiService, biteApiService: BiteApiService) => {
        const loadBitesByUserSpy = jest
          .spyOn(biteApiService, 'loadBitesByUser')
          .mockReturnValue(Promise.resolve([]));
        const user = { uid: 'user-id' };
        service.bitesByUser(user);
        expect(loadBitesByUserSpy).toHaveBeenCalledWith(user);
      },
    ));
  });

  describe('bitesByBucketlist', () => {
    it('should call loadBitesByBucketlist on BiteApiService', inject(
      [BiteTribeApiService, BiteApiService],
      (service: BiteTribeApiService, biteApiService: BiteApiService) => {
        const loadBitesByBucketlistSpy = jest
          .spyOn(biteApiService, 'loadBitesByBucketlist')
          .mockReturnValue(Promise.resolve([]));
        const bucketlist = {
          id: 'bucketlist-id',
          name: 'My Bucketlist',
        } as any;
        service.bitesByBucketlist(bucketlist);
        expect(loadBitesByBucketlistSpy).toHaveBeenCalledWith(bucketlist);
      },
    ));
  });

  describe('deleteBite', () => {
    it('should call deleteBite on BiteApiService', inject(
      [BiteTribeApiService, BiteApiService],
      (service: BiteTribeApiService, biteApiService: BiteApiService) => {
        const deleteBiteSpy = jest
          .spyOn(biteApiService, 'deleteBite')
          .mockReturnValue(Promise.resolve({} as any));
        const bite = { id: 'bite-id' } as any;
        service.deleteBite(bite);
        expect(deleteBiteSpy).toHaveBeenCalledWith(bite);
      },
    ));
  });

  describe('likes$', () => {
    it('should call startListener and return likes$ from LikeApiService', inject(
      [BiteTribeApiService, LikeApiService],
      (service: BiteTribeApiService, likeApiService: LikeApiService) => {
        const startListenerSpy = jest.spyOn(likeApiService, 'startListener');
        const likesObservable = of([{ id: 'like-id' }]);
        likeApiService.likes$ = likesObservable;
        const likes$ = service.likes$();
        expect(startListenerSpy).toHaveBeenCalled();
        expect(likes$).toBe(likesObservable);
      },
    ));
  });

  describe('restaurants$', () => {
    it('should call startListener and return restaurants$ from RestaurantApiService', inject(
      [BiteTribeApiService, RestaurantApiService],
      (
        service: BiteTribeApiService,
        restaurantApiService: RestaurantApiService,
      ) => {
        const startListenerSpy = jest.spyOn(
          restaurantApiService,
          'startListener',
        );
        const restaurantsObservable = of([{ id: 'restaurant-id' }]);
        restaurantApiService.restaurants$ = restaurantsObservable;
        const restaurants$ = service.restaurants$();
        expect(startListenerSpy).toHaveBeenCalled();
        expect(restaurants$).toBe(restaurantsObservable);
      },
    ));
  });

  describe('menus$', () => {
    it('should call startListener and return menus$ from MenuApiService', inject(
      [BiteTribeApiService, MenuApiService],
      (service: BiteTribeApiService, menuApiService: MenuApiService) => {
        const startListenerSpy = jest.spyOn(menuApiService, 'startListener');
        const menusObservable = of([{ id: 'menu-id' }]);
        menuApiService.menus$ = menusObservable;
        const menus$ = service.menus$();
        expect(startListenerSpy).toHaveBeenCalled();
        expect(menus$).toBe(menusObservable);
      },
    ));
  });

  describe('bucketlists$', () => {
    it('should call startListener and return bucketlists$ from BucketlistApiService', inject(
      [BiteTribeApiService, BucketlistApiService],
      (
        service: BiteTribeApiService,
        bucketlistApiService: BucketlistApiService,
      ) => {
        const startListenerSpy = jest.spyOn(
          bucketlistApiService,
          'startListener',
        );
        const bucketlistsObservable = of([{ id: 'bucketlist-id' }]);
        bucketlistApiService.bucketlists$ = bucketlistsObservable;
        const bucketlists$ = service.bucketlists$();
        expect(startListenerSpy).toHaveBeenCalled();
        expect(bucketlists$).toBe(bucketlistsObservable);
      },
    ));
  });
});
