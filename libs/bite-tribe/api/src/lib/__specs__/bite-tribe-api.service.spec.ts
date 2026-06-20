import { inject, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { BiteTribeApiService } from '../bite-tribe-api.service';
import { ReviewApiService } from '../review-api/review-api.service';
import { RestaurantApiService } from '../restaurant-api/restaurant-api.service';
import { MenuApiService } from '../menu-api/menu-api.service';
import { LikeApiService } from '../like-api/like-api.service';
import { BucketlistApiService } from '../bucketlist-api/bucketlist-api.service';
import { ProfileApiService } from '../profile-api.service';
import { BiteApiService } from '../bite-api/bite-api.service';
import { SettingsApiService } from '../settings-api/settings-api.service';
import { ExchangeRatesApiService } from '../exchange-rates-api.service';
import { BiteTrailApiService } from '../bite-trail-api/bite-trail-api.service';
import { of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { BiteTrail, Like } from 'model';

const assertEqual = (a: any, b: any): void => {
  expect(a).toEqual(b);
};

class ReviewApiMock {
  reviewsByBiteId = jest.fn();
  saveNewReview = jest.fn();
}

class RestaurantApiMock {
  loadRestaurantById = jest.fn();
  saveNewRestaurant = jest.fn();
  saveSocialMediaLinksForRestaurant = jest.fn();
}

class MenuApiMock {
  loadMenu = jest.fn();
  saveMenu = jest.fn();
}

class LikeApiMock {
  saveLike = jest.fn();
  removeLike = jest.fn();
  loadLikesForBites = jest.fn();
}

class BucketlistApiMock {
  saveBiteIdToBucketList = jest.fn();
  createBucketListAndSaveBiteIdToBucketList = jest.fn();
  removeBiteFromBucketlist = jest.fn();
  createBucketList = jest.fn();
  loadBucketlistsByUserId = jest.fn();
  deleteBucketlist = jest.fn();
  updateBucketlistName = jest.fn();
}

class ProfileApiMock {
  publicProfile$ = of(null);
  saveUser = jest.fn();
  updateUser = jest.fn();
  getUserByBiteId = jest.fn();
  getUserById = jest.fn();
  followUser = jest.fn();
  unfollowUser = jest.fn();
  getTotalNumberOfUsers = jest.fn();
  fetchFollowers = jest.fn();
  fetchFollowing = jest.fn();
  isCurrentUserFollowing = jest.fn();
  fetchFollowersWithDetails = jest.fn();
  fetchFollowingWithDetails = jest.fn();
}

class BiteApiMock {
  loadBitesByLocation = jest.fn();
  loadBitesByUser = jest.fn();
  loadBiteById = jest.fn();
  saveNewBite = jest.fn();
  saveEditedBite = jest.fn();
  deleteBite = jest.fn();
  loadBitesByBucketlist = jest.fn();
  startlatestBitesListener = jest.fn();
  getTotalNumberOfBites = jest.fn();
  uploadImage = jest.fn();
  updateImagePathInBite = jest.fn();
}

class SettingsApiMock {
  loadSettingsByUserId = jest.fn();
  saveSettings = jest.fn();
}

class ExchangeRatesApiMock {
  getExchangeRates = jest.fn();
}

class BiteTrailApiMock {
  createBiteTrail = jest.fn().mockResolvedValue(undefined);
}

describe(BiteTribeApiService.name, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BiteTribeApiService,
        { provide: ReviewApiService, useClass: ReviewApiMock },
        { provide: RestaurantApiService, useClass: RestaurantApiMock },
        { provide: MenuApiService, useClass: MenuApiMock },
        { provide: LikeApiService, useClass: LikeApiMock },
        { provide: BucketlistApiService, useClass: BucketlistApiMock },
        { provide: ProfileApiService, useClass: ProfileApiMock },
        { provide: BiteApiService, useClass: BiteApiMock },
        { provide: SettingsApiService, useClass: SettingsApiMock },
        { provide: ExchangeRatesApiService, useClass: ExchangeRatesApiMock },
        { provide: BiteTrailApiService, useClass: BiteTrailApiMock },
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

    it('should call loadSettingsByUserId', inject(
      [BiteTribeApiService, SettingsApiService],
      async (
        service: BiteTribeApiService,
        settingsApiService: SettingsApiService,
      ) => {
        const loadSettingsByUserIdSpy = jest
          .spyOn(settingsApiService, 'loadSettingsByUserId')
          .mockReturnValue(Promise.resolve({ theme: 'dark' } as any));

        const settings = await service.loadSettings();

        expect(loadSettingsByUserIdSpy).toHaveBeenCalledTimes(1);
        expect(settings).toEqual({ theme: 'dark' });
      },
    ));
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
          .mockResolvedValue([]);
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
          .spyOn(restaurantApiService, 'loadRestaurantById')
          .mockResolvedValue(undefined);
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
          .mockResolvedValue(undefined);
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
        const like = {
          likeType: 'like',
          biteId: 'bite-id',
          createdAt: 'date',
        } as unknown as Like;
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
          .mockReturnValue(of(undefined) as any);
        const bite = { id: 'bite-id' } as any;
        service.getUserByBiteId(bite);
        expect(getUserByBiteIdSpy).toHaveBeenCalledWith(bite);
      },
    ));
  });

  describe('getUserById', () => {
    it('should call getUserById on ProfileApiService', inject(
      [BiteTribeApiService, ProfileApiService],
      (service: BiteTribeApiService, profileApiService: ProfileApiService) => {
        const getUserByIdSpy = jest
          .spyOn(profileApiService, 'getUserById')
          .mockReturnValue(Promise.resolve(undefined));
        const biteCreatorId = 'user-id';
        service.getUserById(biteCreatorId);
        expect(getUserByIdSpy).toHaveBeenCalledWith(biteCreatorId);
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

  describe('uploadImage', () => {
    it('should call uploadImage on BiteApiService', inject(
      [BiteTribeApiService, BiteApiService],
      (service: BiteTribeApiService, biteApiService: BiteApiService) => {
        const uploadImageSpy = jest.spyOn(biteApiService, 'uploadImage');
        const bite = { id: 'bite-id', content: 'Bite with image' } as any;
        const callbackFn = jest.fn();
        service.uploadImage(bite, callbackFn);
        expect(uploadImageSpy).toHaveBeenCalledWith(bite, callbackFn);
      },
    ));
  });

  describe('updateImagePathInBite', () => {
    it('should call updateImagePathInBite on BiteApiService', inject(
      [BiteTribeApiService, BiteApiService],
      (service: BiteTribeApiService, biteApiService: BiteApiService) => {
        const updateImagePathInBiteSpy = jest.spyOn(
          biteApiService,
          'updateImagePathInBite',
        );
        const bite = { id: 'bite-id', content: 'Bite with image' } as any;
        const imagePath = 'path/to/image.jpg';
        service.updateImagePathInBite(bite, imagePath);
        expect(updateImagePathInBiteSpy).toHaveBeenCalledWith(bite, imagePath);
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

  describe('unfollowUser', () => {
    it('should call unfollowUser on ProfileApiService', inject(
      [BiteTribeApiService, ProfileApiService],
      (service: BiteTribeApiService, profileApiService: ProfileApiService) => {
        const unfollowUserSpy = jest.spyOn(profileApiService, 'unfollowUser');
        const user = { id: 'user-id', name: 'Test User' } as any;
        service.unfollowUser(user);
        expect(unfollowUserSpy).toHaveBeenCalledWith(user);
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
        const user = 'user-id';
        service.bitesByUser(user);
        expect(loadBitesByUserSpy).toHaveBeenCalledWith(user);
      },
    ));
  });

  describe('biteById', () => {
    it('should call loadBiteById on BiteApiService', inject(
      [BiteTribeApiService, BiteApiService],
      (service: BiteTribeApiService, biteApiService: BiteApiService) => {
        const loadBiteByIdSpy = jest
          .spyOn(biteApiService, 'loadBiteById')
          .mockReturnValue(Promise.resolve({ id: 'bite-1' } as any));

        service.biteById('bite-1');
        expect(loadBiteByIdSpy).toHaveBeenCalledWith('bite-1');
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

  describe('loadLikesForBites', () => {
    it('should call loadLikesForBites on LikeApiService', inject(
      [BiteTribeApiService, LikeApiService],
      (service: BiteTribeApiService, likeApiService: LikeApiService) => {
        const loadLikesForBitesSpy = jest
          .spyOn(likeApiService, 'loadLikesForBites')
          .mockReturnValue(Promise.resolve([]));
        const bites = [{ id: 'bite-id-1' }, { id: 'bite-id-2' }] as any;
        service.loadLikesForBites(bites);
        expect(loadLikesForBitesSpy).toHaveBeenCalledWith(bites);
      },
    ));
  });

  describe('restaurants', () => {
    it('should call loadRestaurantById on RestaurantApiService', inject(
      [BiteTribeApiService, RestaurantApiService],
      (
        service: BiteTribeApiService,
        restaurantApiService: RestaurantApiService,
      ) => {
        const loadRestaurantByIdSpy = jest
          .spyOn(restaurantApiService, 'loadRestaurantById')
          .mockReturnValue(Promise.resolve(undefined));
        const restaurantId = 'restaurant-id';
        service.restaurants(restaurantId);
        expect(loadRestaurantByIdSpy).toHaveBeenCalledWith(restaurantId);
      },
    ));
  });

  describe('menus', () => {
    it('should call loadMenu on MenuApiService', inject(
      [BiteTribeApiService, MenuApiService],
      (service: BiteTribeApiService, menuApiService: MenuApiService) => {
        const loadMenuSpy = jest
          .spyOn(menuApiService, 'loadMenu')
          .mockReturnValue(Promise.resolve(undefined));
        const menuId = 'menu-id';
        service.menus(menuId);
        expect(loadMenuSpy).toHaveBeenCalledWith(menuId);
      },
    ));
  });

  describe('loadBucketlistsByUserId', () => {
    it('should call loadBucketlistsByUserId on BucketlistApiService', inject(
      [BiteTribeApiService, BucketlistApiService],
      (
        service: BiteTribeApiService,
        bucketlistApiService: BucketlistApiService,
      ) => {
        const loadBucketlistsByUserIdSpy = jest
          .spyOn(bucketlistApiService, 'loadBucketlistsByUserId')
          .mockReturnValue(Promise.resolve([]));
        const uid = 'user-id';
        service.loadBucketlistsByUserId(uid);
        expect(loadBucketlistsByUserIdSpy).toHaveBeenCalledWith(uid);
      },
    ));
  });

  describe('deleteBucketlist', () => {
    it('should call deleteBucketlist on BucketlistApiService', inject(
      [BiteTribeApiService, BucketlistApiService],
      (
        service: BiteTribeApiService,
        bucketlistApiService: BucketlistApiService,
      ) => {
        const deleteBucketlistSpy = jest
          .spyOn(bucketlistApiService, 'deleteBucketlist')
          .mockReturnValue(Promise.resolve());
        const bucketlistId = 'bucketlist-id';
        service.deleteBucketlist(bucketlistId);
        expect(deleteBucketlistSpy).toHaveBeenCalledWith(bucketlistId);
      },
    ));
  });

  describe('updateBucketlistName', () => {
    it('should call updateBucketlistName on BucketlistApiService', inject(
      [BiteTribeApiService, BucketlistApiService],
      (
        service: BiteTribeApiService,
        bucketlistApiService: BucketlistApiService,
      ) => {
        const updateBucketlistNameSpy = jest
          .spyOn(bucketlistApiService, 'updateBucketlistName')
          .mockReturnValue(Promise.resolve());
        const bucketlistId = 'bucketlist-id';
        const name = 'Updated Bucketlist Name';
        service.updateBucketlistName(bucketlistId, name);
        expect(updateBucketlistNameSpy).toHaveBeenCalledWith(
          bucketlistId,
          name,
        );
      },
    ));
  });

  describe('latestBites$', () => {
    it('should call startlatestBitesListener and return latestBites$ from BiteApiService', inject(
      [BiteTribeApiService, BiteApiService],
      (service: BiteTribeApiService, biteApiService: BiteApiService) => {
        const startlatestBitesListenerSpy = jest.spyOn(
          biteApiService,
          'startlatestBitesListener',
        );
        const latestBitesObservable = of([{ id: 'bite-id' }] as any);
        biteApiService.latestBites$ = latestBitesObservable;
        const numberOfBites = 5;
        const latestBites$ = service.latestBites$(numberOfBites);
        expect(startlatestBitesListenerSpy).toHaveBeenCalledWith(numberOfBites);
        expect(latestBites$).toBe(latestBitesObservable);
      },
    ));
  });

  describe('fetchFollowMetadata', () => {
    it('should call fetchFollowers, fetchFollowing and isCurrentUserFollowing on ProfileApiService and return the metadata', inject(
      [BiteTribeApiService, ProfileApiService],
      async (
        service: BiteTribeApiService,
        profileApiService: ProfileApiService,
      ) => {
        const fetchFollowersSpy = jest
          .spyOn(profileApiService, 'fetchFollowers')
          .mockResolvedValue(['follower1', 'follower2'] as any);
        const fetchFollowingSpy = jest
          .spyOn(profileApiService, 'fetchFollowing')
          .mockResolvedValue(['following1'] as any);
        const isCurrentUserFollowingSpy = jest
          .spyOn(profileApiService, 'isCurrentUserFollowing')
          .mockReturnValue(Promise.resolve(true));

        const userId = 'user-id';
        const metadata = await service.fetchFollowMetadata(userId);

        expect(metadata).toEqual({
          followers: 2,
          following: 1,
          isFollowedByMe: true,
        });
        expect(fetchFollowersSpy).toHaveBeenCalledWith(userId);
        expect(fetchFollowingSpy).toHaveBeenCalledWith(userId);
        expect(isCurrentUserFollowingSpy).toHaveBeenCalledWith([
          'follower1',
          'follower2',
        ]);
      },
    ));
  });

  describe('fetchFollowersWithDetails', () => {
    it('should call fetchFollowersWithDetails on ProfileApiService', inject(
      [BiteTribeApiService, ProfileApiService],
      async (
        service: BiteTribeApiService,
        profileApiService: ProfileApiService,
      ) => {
        const fetchFollowersWithDetailsSpy = jest
          .spyOn(profileApiService, 'fetchFollowersWithDetails')
          .mockResolvedValue([] as any);

        const userId = 'user-id';
        await service.fetchFollowersWithDetails(userId);

        expect(fetchFollowersWithDetailsSpy).toHaveBeenCalledWith(userId);
      },
    ));
  });

  describe('fetchFollowingWithDetails', () => {
    it('should call fetchFollowingWithDetails on ProfileApiService', inject(
      [BiteTribeApiService, ProfileApiService],
      async (
        service: BiteTribeApiService,
        profileApiService: ProfileApiService,
      ) => {
        const fetchFollowingWithDetailsSpy = jest
          .spyOn(profileApiService, 'fetchFollowingWithDetails')
          .mockResolvedValue([] as any);

        const userId = 'user-id';
        await service.fetchFollowingWithDetails(userId);

        expect(fetchFollowingWithDetailsSpy).toHaveBeenCalledWith(userId);
      },
    ));
  });

  describe('createBiteTrail', () => {
    it('should delegate to BiteTrailApiService.createBiteTrail', inject(
      [BiteTribeApiService, BiteTrailApiService],
      async (
        service: BiteTribeApiService,
        biteTrailApiService: BiteTrailApiService,
      ) => {
        const trailData: Omit<
          BiteTrail,
          | 'id'
          | 'createdAt'
          | 'createdAtTimestamp'
          | 'updatedAt'
          | 'updatedAtTimestamp'
        > = {
          ownerId: 'org-1',
          ownerName: 'My Org',
          ownerImagePath: 'photo.jpg',
          name: 'My Trail',
          biteIds: [],
          imagePath: '',
          location: 'Berlin',
          description: 'A trail',
          price: 0,
          currency: 'EUR',
        };

        const createBiteTrailSpy = jest.spyOn(
          biteTrailApiService,
          'createBiteTrail',
        );

        await service.createBiteTrail(trailData);

        expect(createBiteTrailSpy).toHaveBeenCalledWith(trailData);
      },
    ));
  });
});
