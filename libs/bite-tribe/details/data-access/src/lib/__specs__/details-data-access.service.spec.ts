import { DetailsDataAccessService } from '../details-data-access.service';
import { TestBed } from '@angular/core/testing';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of, throwError } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Geolocation } from '@capacitor/geolocation';
import { getCurrentPosition } from 'geolocation';
import { Bite, LikeClick } from 'model';
import { Share } from '@capacitor/share';

jest.mock('bite-tribe/store');
jest.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCollection: jest.fn(),
    getDocument: jest.fn(),
  },
}));
jest.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCurrentPosition: jest.fn(),
    checkPermissions: jest.fn(),
    requestPermissions: jest.fn(),
  },
}));
jest.mock('geolocation', () => ({
  getCurrentPosition: jest.fn(),
}));
jest.mock('@capacitor/share');

const getCurrentPositionMock = getCurrentPosition as jest.Mock;

describe(DetailsDataAccessService.name, () => {
  let service: DetailsDataAccessService;
  let storeService: BiteTribeStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DetailsDataAccessService,
        {
          provide: BiteTribeStoreService,
          useValue: {
            reviews$: of(),
            bucketlists$: of(),
            exchangeRates$: of(),
            preferedCurrency$: of(),
            imageUploads$: of(),
            userId$: of(),
            isAuthenticated$: of(),
            saveReview: jest.fn(),
            saveToBucketList: jest.fn(),
            createAndSaveToBucketList: jest.fn(),
            removeBiteFromBucketlist: jest.fn(),
            logout: jest.fn(),
            submitLikeClick: jest.fn(),
            biteIdFromUrl: jest.fn(),
            cacheBite: jest.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(DetailsDataAccessService);
    storeService = TestBed.inject(BiteTribeStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('biteLoader', () => {
    describe('given no bite id', () => {
      it('should return undefined', async () => {
        const result = await service.biteLoader({ params: {} } as any);
        expect(result).toBeUndefined();
      });
    });

    describe('given a bite id and a user id', () => {
      let getDocumentSpy: jest.SpyInstance;

      beforeEach(() => {
        getDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockResolvedValue({
            snapshot: { data: {}, id: '' } as unknown as any,
          });
      });

      it("should load the bite and the current user's like", async () => {
        await service.biteLoader({
          params: {
            biteId: 'test-bite-id',
            userId: 'user1',
          },
        } as any);

        expect(getDocumentSpy).toHaveBeenCalledWith({
          reference: 'bites/test-bite-id/likes/user1',
        });

        expect(getDocumentSpy).toHaveBeenCalledWith({
          reference: 'bites/test-bite-id',
        });
      });
    });

    describe('given the user liked the bite', () => {
      beforeEach(() => {
        jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockImplementation((options: { reference: string }) => {
            if (options.reference === 'bites/test-bite-id/likes/user1') {
              return Promise.resolve({
                snapshot: {
                  data: { userId: 'user1', likeType: 'thumbup' },
                } as any,
              });
            }

            return Promise.resolve({
              snapshot: {
                data: { name: 'Test Bite' },
                id: 'test-bite-id',
              } as unknown as any,
            });
          });
      });

      it("should return the bite with the user's like", async () => {
        const result = await service.biteLoader({
          params: {
            biteId: 'test-bite-id',
            userId: 'user1',
          },
        } as any);

        expect(result).toEqual({
          name: 'Test Bite',
          id: 'test-bite-id',
          likes: [{ userId: 'user1', likeType: 'thumbup' }],
        });
      });
    });

    describe('given a bite id and a user id but no existing like', () => {
      beforeEach(() => {
        jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockImplementation((options: { reference: string }) => {
            if (options.reference === 'bites/test-bite-id/likes/user1') {
              return Promise.resolve({
                snapshot: { data: undefined } as any,
              });
            }

            return Promise.resolve({
              snapshot: {
                data: { name: 'Test Bite' },
                id: 'test-bite-id',
              } as unknown as any,
            });
          });
      });

      it('should return the bite without any likes', async () => {
        const result = await service.biteLoader({
          params: {
            biteId: 'test-bite-id',
            userId: 'user1',
          },
        } as any);

        expect(result).toEqual({
          name: 'Test Bite',
          id: 'test-bite-id',
          likes: [],
        });
      });
    });

    describe('given the like read fails', () => {
      let getDocumentSpy: jest.SpyInstance;

      beforeEach(() => {
        getDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockImplementation((options: { reference: string }) => {
            if (options.reference === 'bites/test-bite-id/likes/user1') {
              return Promise.reject(new Error('permission-denied'));
            }

            return Promise.resolve({
              snapshot: {
                data: { name: 'Test Bite' },
                id: 'test-bite-id',
              } as unknown as any,
            });
          });
      });

      it('should still load the bite without likes', async () => {
        const result = await service.biteLoader({
          params: {
            biteId: 'test-bite-id',
            userId: 'user1',
          },
        } as any);

        expect(getDocumentSpy).toHaveBeenCalledWith({
          reference: 'bites/test-bite-id',
        });
        expect(result).toEqual({
          name: 'Test Bite',
          id: 'test-bite-id',
          likes: [],
        });
      });
    });

    describe('given the bite read fails transiently', () => {
      it('should retry and resolve the bite without surfacing an error', async () => {
        let biteAttempts = 0;
        jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockImplementation((options: { reference: string }) => {
            if (options.reference === 'bites/test-bite-id') {
              biteAttempts++;

              if (biteAttempts < 3) {
                return Promise.reject(new Error('unavailable'));
              }

              return Promise.resolve({
                snapshot: {
                  data: { name: 'Test Bite' },
                  id: 'test-bite-id',
                } as unknown as any,
              });
            }

            return Promise.resolve({ snapshot: { data: undefined } as any });
          });

        const result = await service.biteLoader({
          params: { biteId: 'test-bite-id' },
        } as any);

        expect(biteAttempts).toBe(3);
        expect(result).toEqual({
          name: 'Test Bite',
          id: 'test-bite-id',
          likes: [],
        });
      }, 15000);
    });

    describe('given the bite read keeps failing', () => {
      it('should reject after exhausting the retries', async () => {
        jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockRejectedValue(new Error('unavailable'));

        await expect(
          service.biteLoader({ params: { biteId: 'test-bite-id' } } as any),
        ).rejects.toThrow('unavailable');
      }, 15000);
    });

    describe('given no user id', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
          snapshot: {
            data: { name: 'Test Bite' },
            id: 'test-bite-id',
          } as unknown as any,
        });
      });

      it('should return the bite without likes', async () => {
        const result = await service.biteLoader({
          params: {
            biteId: 'test-bite-id',
          },
        } as any);

        expect(FirebaseFirestore.getDocument).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
          name: 'Test Bite',
          id: 'test-bite-id',
          likes: [],
        });
      });
    });
  });

  describe('biteCreatorLoader', () => {
    describe('given no user id', () => {
      it('should return undefined', async () => {
        const result = await service.biteCreatorLoader({ params: {} } as any);
        expect(result).toBeUndefined();
      });
    });

    describe('given a user id', () => {
      let getDocumentSpy: jest.SpyInstance;

      beforeEach(() => {
        getDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockResolvedValue({
            snapshot: { data: {}, id: '' } as unknown as any,
          });
      });

      it('should load the user document', async () => {
        await service.biteCreatorLoader({
          params: {
            userId: 'test-user-id',
          },
        } as any);

        expect(getDocumentSpy).toHaveBeenCalledWith({
          reference: 'users/test-user-id',
        });
      });
    });
  });

  describe('positionLoader', () => {
    const mockPosition = {
      coords: { latitude: 48.137154, longitude: 11.576124 },
      timestamp: 1234567890,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should read the position through the shared reader', async () => {
      getCurrentPositionMock.mockReturnValue(of(mockPosition));

      const result = await service.positionLoader({} as any);

      expect(getCurrentPositionMock).toHaveBeenCalled();
      expect(result).toEqual(mockPosition);
    });

    it('should never ask for the permission itself', async () => {
      // The OS ask belongs to the onboarding location step (#1023); this
      // surface only reads what an existing grant allows.
      getCurrentPositionMock.mockReturnValue(of(mockPosition));

      await service.positionLoader({} as any);

      expect(Geolocation.requestPermissions).not.toHaveBeenCalled();
    });

    describe('given the position cannot be read', () => {
      it('should return undefined so the page just shows no distance', async () => {
        jest.spyOn(console, 'error').mockImplementation();
        getCurrentPositionMock.mockReturnValue(
          throwError(() => new Error('Location permission is not granted')),
        );

        const result = await service.positionLoader({} as any);

        expect(result).toBeUndefined();
      });
    });
  });

  describe('saveNewReview', () => {
    let saveReviewSpy: jest.SpyInstance;

    beforeEach(() => {
      saveReviewSpy = jest.spyOn(storeService, 'saveReview');
    });

    it('should call saveReview on store service', () => {
      const newReview = { review: 'Great bite!', biteId: 'test-bite-id' };
      service.saveNewReview(newReview);
      expect(saveReviewSpy).toHaveBeenCalledWith(newReview);
    });
  });

  describe('saveToBucketList', () => {
    let saveToBucketListSpy: jest.SpyInstance;

    beforeEach(() => {
      saveToBucketListSpy = jest.spyOn(storeService, 'saveToBucketList');
    });

    it('should call saveToBucketList on store service', () => {
      const event = {
        bucketListId: 'test-bucketlist-id',
        biteId: 'test-bite-id',
      };
      service.saveToBucketList(event);
      expect(saveToBucketListSpy).toHaveBeenCalledWith(event);
    });
  });

  describe('createAndSaveToBucketList', () => {
    let createAndSaveToBucketListSpy: jest.SpyInstance;

    beforeEach(() => {
      createAndSaveToBucketListSpy = jest.spyOn(
        storeService,
        'createAndSaveToBucketList',
      );
    });

    it('should call createAndSaveToBucketList on store service', () => {
      const param = {
        bucketListName: 'My Bucket List',
        biteId: 'test-bite-id',
      };
      service.createAndSaveToBucketList(param);
      expect(createAndSaveToBucketListSpy).toHaveBeenCalledWith(param);
    });
  });

  describe('removeBiteFromBucketlist', () => {
    let removeBiteFromBucketlistSpy: jest.SpyInstance;

    beforeEach(() => {
      removeBiteFromBucketlistSpy = jest.spyOn(
        storeService,
        'removeBiteFromBucketlist',
      );
    });

    it('should call removeBiteFromBucketlist on store service', () => {
      const event = {
        bucketListId: 'test-bucketlist-id',
        biteId: 'test-bite-id',
      };
      service.removeBiteFromBucketlist(event as any);
      expect(removeBiteFromBucketlistSpy).toHaveBeenCalledWith(event);
    });
  });

  describe('logout', () => {
    let logoutSpy: jest.SpyInstance;

    beforeEach(() => {
      logoutSpy = jest.spyOn(storeService, 'logout');
    });

    it('should call logout on store service', () => {
      service.logout();
      expect(logoutSpy).toHaveBeenCalled();
    });
  });

  describe('submitLikeClick', () => {
    it('should forward the like click to BiteTribeStoreService', () => {
      const submitLikeClickSpy = jest.spyOn(storeService, 'submitLikeClick');
      const likeClick: LikeClick = {
        likeType: 'thumbup',
        biteId: 'test-bite-id',
        action: 'save',
      };

      service.submitLikeClick(likeClick);

      expect(submitLikeClickSpy).toHaveBeenCalledWith(likeClick);
    });
  });

  describe('shareBite', () => {
    let shareSpy: jest.SpyInstance;

    beforeEach(() => {
      shareSpy = jest.spyOn(Share, 'share');
    });

    it('should build share options and call share', () => {
      const mockedBite = {
        id: 'test-bite-id',
        name: 'Test Bite',
        place: 'Test Place',
        price: 10,
        currency: '$',
        rating: 4,
      } as Bite;

      service.shareBite(mockedBite);

      expect(shareSpy).toHaveBeenCalledWith({
        dialogTitle: 'Share Bite',
        text: '$ 10 · ⭐️ 4\nhttps://bite-tribe.web.app/s/bite/test-bite-id',
        title: 'Test Bite @ Test Place',
        url: 'https://bite-tribe.web.app/s/bite/test-bite-id',
      });
    });

    it('should use only the bite name as title when place is missing', () => {
      const mockedBite = {
        id: 'test-bite-id',
        name: 'Test Bite',
      } as Bite;

      service.shareBite(mockedBite);

      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Test Bite' }),
      );
    });

    it('should use the default text when price and rating are missing', () => {
      const mockedBite = {
        id: 'test-bite-id',
        name: 'Test Bite',
        place: 'Test Place',
      } as Bite;

      service.shareBite(mockedBite);

      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Check out this Bite on BiteTribe 👇\nhttps://bite-tribe.web.app/s/bite/test-bite-id',
        }),
      );
    });
  });

  describe('biteCreatorId', () => {
    it('should return the userId of the currently loaded bite', () => {
      jest
        .spyOn(service.bite, 'value')
        .mockReturnValue({ userId: 'test-user-id' } as any);

      expect(service.biteCreatorId()).toBe('test-user-id');
    });
  });

  describe('cacheBite', () => {
    let cacheBiteSpy: jest.SpyInstance;

    beforeEach(() => {
      cacheBiteSpy = jest.spyOn(storeService, 'cacheBite');
    });

    it('should call cacheBite on store service', () => {
      service.cacheBite({} as Bite);
      expect(cacheBiteSpy).toHaveBeenCalled();
    });
  });
});
