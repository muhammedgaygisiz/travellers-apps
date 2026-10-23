import { DetailsDataAccessService } from '../details-data-access.service';
import { BiteNotFoundError } from '../bite-not-found-error';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService } from 'bite-tribe/api';
import { CrashReportingService } from 'ta-firestore';
import { of, throwError } from 'rxjs';
import {
  FirebaseFirestore,
  type DocumentData,
  type GetDocumentResult,
} from '@capacitor-firebase/firestore';
import { Geolocation } from '@capacitor/geolocation';
import { getCurrentPosition } from 'geolocation';
import { Bite, LikeClick } from 'model';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';
import {
  SaveImageDeniedError,
  ShareImageUnavailableError,
} from '../share-image-errors';

jest.mock('bite-tribe/store');
jest.mock('bite-tribe/api', () => ({
  BiteTribeApiService: class {},
  toBase64: jest.fn().mockResolvedValue('BASE64'),
}));
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

// The wrappers' local save plugin (issue #1732). The service registers it as
// it is imported, which is before this file's own declarations run, so the
// mock lives inside the factory and is read back through `jest.requireMock`.
jest.mock('@capacitor/core', () => {
  const actual = jest.requireActual('@capacitor/core');
  const saveImage = { saveToPhotos: jest.fn() };

  return {
    ...actual,
    __saveImage: saveImage,
    registerPlugin: (name: string, implementations?: unknown): unknown =>
      name === 'SaveImage'
        ? saveImage
        : actual.registerPlugin(name, implementations),
  };
});

const mockSaveImage = (
  jest.requireMock('@capacitor/core') as {
    __saveImage: { saveToPhotos: jest.Mock };
  }
).__saveImage;
jest.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: {
    writeFile: jest.fn().mockResolvedValue({ uri: 'file:///cache/image.jpg' }),
  },
}));

const getCurrentPositionMock = getCurrentPosition as jest.Mock;

const loaderParams = <T>(
  params: T,
): {
  params: T;
  abortSignal: AbortSignal;
  previous: { status: 'idle' };
} => ({
  params,
  abortSignal: new AbortController().signal,
  previous: { status: 'idle' },
});

const getDocumentResult = <T extends DocumentData>(
  data: T | null,
  id = '',
): GetDocumentResult<T> => ({
  snapshot: {
    data,
    id,
    path: '',
    metadata: { fromCache: false, hasPendingWrites: false },
  },
});

describe(DetailsDataAccessService.name, () => {
  let service: DetailsDataAccessService;
  let storeService: BiteTribeStoreService;
  let recordNonFatal: jest.Mock;
  const biteIdFromUrl = signal<string | undefined>(undefined);
  const navigationFrom = (
    url: string | undefined,
  ): { previousNavigation?: { extractedUrl: { toString(): string } } } => ({
    previousNavigation: url
      ? { extractedUrl: { toString: (): string => url } }
      : undefined,
  });
  const lastSuccessfulNavigation = signal<
    ReturnType<typeof navigationFrom> | undefined
  >(navigationFrom('/gallery'));

  beforeEach(() => {
    biteIdFromUrl.set(undefined);
    lastSuccessfulNavigation.set(navigationFrom('/gallery'));
    recordNonFatal = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        DetailsDataAccessService,
        { provide: CrashReportingService, useValue: { recordNonFatal } },
        {
          provide: Router,
          useValue: { lastSuccessfulNavigation },
        },
        {
          provide: BiteTribeApiService,
          useValue: { reportBite: jest.fn() },
        },
        {
          provide: BiteTribeStoreService,
          useValue: {
            reviews$: of(),
            reviewThreads$: of(),
            highlightedThreadIdFromUrl$: of(),
            bucketlists$: of(),
            exchangeRates$: of(),
            preferedCurrency$: of(),
            imageUploads$: of(),
            userId$: of(),
            isAuthenticated$: of(),
            saveReview: jest.fn(),
            saveReviewReply: jest.fn(),
            saveToBucketList: jest.fn(),
            createAndSaveToBucketList: jest.fn(),
            removeBiteFromBucketlist: jest.fn(),
            logout: jest.fn(),
            submitLikeClick: jest.fn(),
            biteIdFromUrl,
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

  /** Reporting goes straight to the callable, not through the store (#1608). */
  it('reports a Bite through the API and hands back its answer', async () => {
    const api = TestBed.inject(BiteTribeApiService) as unknown as {
      reportBite: jest.Mock;
    };
    api.reportBite.mockResolvedValue({ reported: true });

    await expect(service.reportBite('bite-1', 'spam')).resolves.toEqual({
      reported: true,
    });
    expect(api.reportBite).toHaveBeenCalledWith('bite-1', 'spam');
  });

  describe('biteParams', () => {
    describe('given no bite id in the url', () => {
      // Loading for a missing id resolved the resource successfully with no
      // Bite, which the page could not tell apart from still loading and
      // answered with an endless skeleton. See #1232.
      it('should ask for nothing, leaving the resource idle', () => {
        expect(service.biteParams()).toBeUndefined();
        expect(service.bite.status()).toBe('idle');
      });
    });

    describe('given a bite id in the url', () => {
      it('should ask for that bite', () => {
        biteIdFromUrl.set('bite-1');

        expect(service.biteParams()).toEqual({
          biteId: 'bite-1',
          userId: '',
        });
      });
    });
  });

  describe('biteLoader', () => {
    describe('given the bite no longer exists', () => {
      beforeEach(() => {
        jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockResolvedValue(getDocumentResult(null));
      });

      // Firestore answers a deleted document with a successful, empty snapshot,
      // which used to become a Bite carrying nothing but an id. See #1232.
      it('should report it as not found instead of an empty bite', async () => {
        await expect(
          service.biteLoader(loaderParams({ biteId: 'gone' })),
        ).rejects.toBeInstanceOf(BiteNotFoundError);
      });
    });

    describe('given a bite id and a user id', () => {
      let getDocumentSpy: jest.SpyInstance;

      beforeEach(() => {
        getDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockResolvedValue(getDocumentResult({}));
      });

      it("should load the bite and the current user's like", async () => {
        await service.biteLoader(
          loaderParams({
            biteId: 'test-bite-id',
            userId: 'user1',
          }),
        );

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
              return Promise.resolve(
                getDocumentResult({ userId: 'user1', likeType: 'thumbup' }),
              );
            }

            return Promise.resolve(
              getDocumentResult({ name: 'Test Bite' }, 'test-bite-id'),
            );
          });
      });

      it("should return the bite with the user's like", async () => {
        const result = await service.biteLoader(
          loaderParams({
            biteId: 'test-bite-id',
            userId: 'user1',
          }),
        );

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
              return Promise.resolve(getDocumentResult(null));
            }

            return Promise.resolve(
              getDocumentResult({ name: 'Test Bite' }, 'test-bite-id'),
            );
          });
      });

      it('should return the bite without any likes', async () => {
        const result = await service.biteLoader(
          loaderParams({
            biteId: 'test-bite-id',
            userId: 'user1',
          }),
        );

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

            return Promise.resolve(
              getDocumentResult({ name: 'Test Bite' }, 'test-bite-id'),
            );
          });
      });

      it('should still load the bite without likes', async () => {
        const result = await service.biteLoader(
          loaderParams({
            biteId: 'test-bite-id',
            userId: 'user1',
          }),
        );

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

              return Promise.resolve(
                getDocumentResult({ name: 'Test Bite' }, 'test-bite-id'),
              );
            }

            return Promise.resolve(getDocumentResult(null));
          });

        const result = await service.biteLoader(
          loaderParams({ biteId: 'test-bite-id' }),
        );

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
          service.biteLoader(loaderParams({ biteId: 'test-bite-id' })),
        ).rejects.toThrow('unavailable');
      }, 15000);
    });

    describe('given no user id', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockResolvedValue(
            getDocumentResult({ name: 'Test Bite' }, 'test-bite-id'),
          );
      });

      it('should return the bite without likes', async () => {
        const result = await service.biteLoader(
          loaderParams({
            biteId: 'test-bite-id',
          }),
        );

        expect(FirebaseFirestore.getDocument).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
          name: 'Test Bite',
          id: 'test-bite-id',
          likes: [],
        });
      });
    });
  });

  describe('bite load failures', () => {
    const settleBiteRead = async (): Promise<void> => {
      TestBed.flushEffects();

      for (let tick = 0; tick < 20; tick++) {
        await Promise.resolve();
      }

      TestBed.flushEffects();
    };

    describe('given the bite no longer exists', () => {
      beforeEach(async () => {
        jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockResolvedValue(getDocumentResult(null));

        biteIdFromUrl.set('gone');
        await settleBiteRead();
      });

      it('should report it as not found', () => {
        expect(service.biteLoadFailure()).toBe('not-found');
        expect(service.biteNotFound()).toBe(true);
        expect(service.biteUnavailable()).toBe(false);
      });

      it('should file a non-fatal naming the bite, the branch and the origin', () => {
        expect(recordNonFatal).toHaveBeenCalledWith(
          'Bite details load failed',
          expect.objectContaining({
            biteId: 'gone',
            branch: 'not-found',
            origin: '/gallery',
          }),
        );
      });

      it('should file it once, not on every recheck', async () => {
        await settleBiteRead();

        expect(recordNonFatal).toHaveBeenCalledTimes(1);
      });

      // Moving to a sub-route of the same Bite — the restaurant page, say —
      // changes the navigation the report reads without changing the failure,
      // and one failure is worth one non-fatal.
      it('should not file it again when only the navigation moved on', async () => {
        lastSuccessfulNavigation.set(navigationFrom('/bite/gone/restaurant'));
        await settleBiteRead();

        expect(recordNonFatal).toHaveBeenCalledTimes(1);
      });

      describe('given nothing was navigated from', () => {
        beforeEach(() => {
          recordNonFatal.mockClear();
        });

        // A cold start onto a deep link or a tapped notification has no
        // previous page, which is itself worth knowing in the report.
        it('should report the origin as direct', async () => {
          lastSuccessfulNavigation.set(navigationFrom(undefined));
          biteIdFromUrl.set('gone-too');
          await settleBiteRead();

          expect(recordNonFatal).toHaveBeenCalledWith(
            'Bite details load failed',
            expect.objectContaining({ origin: 'direct' }),
          );
        });

        it('should report the origin as direct when nothing has navigated yet', async () => {
          lastSuccessfulNavigation.set(undefined);
          biteIdFromUrl.set('gone-as-well');
          await settleBiteRead();

          expect(recordNonFatal).toHaveBeenCalledWith(
            'Bite details load failed',
            expect.objectContaining({ origin: 'direct' }),
          );
        });
      });
    });

    describe('given the read itself fails', () => {
      beforeEach(async () => {
        jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockRejectedValue(new Error('unavailable'));

        biteIdFromUrl.set('bite-1');
        await settleBiteRead();
        // Five attempts, 700ms apart, before the resource gives up.
        await new Promise((resolve) => setTimeout(resolve, 4000));
        await settleBiteRead();
      }, 15000);

      // A timeout, a rejected permission or an App Check refusal used to leave
      // the page with no terminal state at all. See #1232.
      it('should report it as unavailable rather than as a missing bite', () => {
        expect(service.biteUnavailable()).toBe(true);
        expect(service.biteNotFound()).toBe(false);
      });

      it('should file a non-fatal carrying the failing branch', () => {
        expect(recordNonFatal).toHaveBeenCalledWith(
          'Bite details load failed',
          expect.objectContaining({
            biteId: 'bite-1',
            branch: 'unavailable',
            error: 'Error: unavailable',
          }),
        );
      });
    });
  });

  describe('reloadBite', () => {
    it('should run the read again', () => {
      const reload = jest.spyOn(service.bite, 'reload');

      service.reloadBite();

      expect(reload).toHaveBeenCalled();
    });
  });

  describe('biteCreatorLoader', () => {
    describe('given no user id', () => {
      it('should return undefined', async () => {
        const result = await service.biteCreatorLoader(loaderParams({}));
        expect(result).toBeUndefined();
      });
    });

    describe('given a user id', () => {
      let getDocumentSpy: jest.SpyInstance;

      beforeEach(() => {
        getDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockResolvedValue(getDocumentResult({}));
      });

      it('should load the user document', async () => {
        await service.biteCreatorLoader(
          loaderParams({
            userId: 'test-user-id',
          }),
        );

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

      const result = await service.positionLoader(loaderParams(undefined));

      expect(getCurrentPositionMock).toHaveBeenCalled();
      expect(result).toEqual(mockPosition);
    });

    it('should never ask for the permission itself', async () => {
      // The OS ask belongs to the onboarding location step (#1023); this
      // surface only reads what an existing grant allows.
      getCurrentPositionMock.mockReturnValue(of(mockPosition));

      await service.positionLoader(loaderParams(undefined));

      expect(Geolocation.requestPermissions).not.toHaveBeenCalled();
    });

    describe('given the position cannot be read', () => {
      it('should return undefined so the page just shows no distance', async () => {
        jest.spyOn(console, 'error').mockImplementation();
        getCurrentPositionMock.mockReturnValue(
          throwError(() => new Error('Location permission is not granted')),
        );

        const result = await service.positionLoader(loaderParams(undefined));

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
        bucketlistId: 'test-bucketlist-id',
        biteId: 'test-bite-id',
      };
      service.removeBiteFromBucketlist(event);
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

    afterEach(() => jest.restoreAllMocks());

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
        text: '$ 10 · ⭐️ 4\nhttps://bitetribe.app/s/bite/test-bite-id',
        title: 'Test Bite @ Test Place',
        url: 'https://bitetribe.app/s/bite/test-bite-id',
      });
    });

    /** Android's Share plugin appends `url` to `text` itself (#1775). */
    it('should send the url once, inside the text, on android', () => {
      jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');
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
        text: '$ 10 · ⭐️ 4\nhttps://bitetribe.app/s/bite/test-bite-id',
        title: 'Test Bite @ Test Place',
      });
    });

    it('should keep the url for the link preview on ios', () => {
      jest.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');

      service.shareBite({ id: 'test-bite-id', name: 'Test Bite' } as Bite);

      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://bitetribe.app/s/bite/test-bite-id',
        }),
      );
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
          text: 'Check out this Bite on BiteTribe 👇\nhttps://bitetribe.app/s/bite/test-bite-id',
        }),
      );
    });
  });

  /** The composed share image (UC-SBS, issue #1726). */
  describe('shareBiteImage', () => {
    const bite = { id: 'bite-1', name: 'Pad thai' } as Bite;
    const image = new Blob(['jpeg'], { type: 'image/jpeg' });

    afterEach(() => jest.restoreAllMocks());

    it('writes the image to the cache and shares the file on a device', async () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({});

      await service.shareBiteImage(bite, image);

      expect(Filesystem.writeFile).toHaveBeenCalledWith({
        path: 'share-image/bitetribe-bite-1.jpg',
        data: 'BASE64',
        directory: 'CACHE',
        recursive: true,
      });
      expect(shareSpy).toHaveBeenCalledWith({
        files: ['file:///cache/image.jpg'],
      });
    });

    it('shares the file through the Web Share API in a browser', async () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
      const share = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { canShare: () => true, share });

      await service.shareBiteImage(bite, image);

      const [{ files }] = share.mock.calls[0];
      expect(files[0].name).toBe('bitetribe-bite-1.jpg');
      expect(files[0].type).toBe('image/jpeg');
    });

    it('refuses in a browser that cannot share files', async () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
      Object.assign(navigator, { canShare: () => false });

      await expect(service.shareBiteImage(bite, image)).rejects.toBeInstanceOf(
        ShareImageUnavailableError,
      );
    });

    it('refuses in a browser without the Web Share API', async () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
      Object.assign(navigator, { canShare: undefined });

      await expect(service.shareBiteImage(bite, image)).rejects.toBeInstanceOf(
        ShareImageUnavailableError,
      );
    });
  });

  /** Saving the composed share image (UC-SBS R-12, R-27, issue #1732). */
  describe('saveBiteImage', () => {
    const bite = { id: 'bite-1', name: 'Pad thai' } as Bite;
    const image = new Blob(['jpeg'], { type: 'image/jpeg' });

    afterEach(() => {
      jest.restoreAllMocks();
      mockSaveImage.saveToPhotos.mockReset();
    });

    it('writes the image to the cache and saves that file to Photos on a device', async () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      mockSaveImage.saveToPhotos.mockResolvedValue(undefined);

      await service.saveBiteImage(bite, image);

      expect(Filesystem.writeFile).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'share-image/bitetribe-bite-1.jpg' }),
      );
      expect(mockSaveImage.saveToPhotos).toHaveBeenCalledWith({
        path: 'file:///cache/image.jpg',
      });
    });

    it('says so when the user refused to let the app add photos', async () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      mockSaveImage.saveToPhotos.mockRejectedValue(
        Object.assign(new Error('denied'), { code: 'permission-denied' }),
      );

      await expect(service.saveBiteImage(bite, image)).rejects.toBeInstanceOf(
        SaveImageDeniedError,
      );
    });

    it('passes any other failure on', async () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      mockSaveImage.saveToPhotos.mockRejectedValue(new Error('disk full'));

      await expect(service.saveBiteImage(bite, image)).rejects.toThrow(
        'disk full',
      );
    });

    it('downloads the image in a browser', async () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
      const createObjectURL = jest.fn().mockReturnValue('blob:share-image');
      Object.assign(URL, { createObjectURL, revokeObjectURL: jest.fn() });
      const clicked: HTMLAnchorElement[] = [];
      jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {
          clicked.push(this);
        });

      await service.saveBiteImage(bite, image);

      expect(createObjectURL).toHaveBeenCalledWith(image);
      expect(clicked).toHaveLength(1);
      expect(clicked[0].download).toBe('bitetribe-bite-1.jpg');
      expect(clicked[0].getAttribute('href')).toBe('blob:share-image');
      expect(mockSaveImage.saveToPhotos).not.toHaveBeenCalled();
    });
  });

  describe('canShareImageFiles', () => {
    afterEach(() => jest.restoreAllMocks());

    it('is always true on a device', () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

      expect(service.canShareImageFiles()).toBe(true);
    });

    it('follows the Web Share API in a browser', () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

      Object.assign(navigator, { canShare: () => true });
      expect(service.canShareImageFiles()).toBe(true);

      Object.assign(navigator, { canShare: () => false });
      expect(service.canShareImageFiles()).toBe(false);
    });

    it('is false in a browser without the Web Share API', () => {
      jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
      Object.assign(navigator, { canShare: undefined });

      expect(service.canShareImageFiles()).toBe(false);
    });
  });

  describe('biteCreatorId', () => {
    it('should return the userId of the currently loaded bite', () => {
      jest
        .spyOn(service.bite, 'value')
        .mockReturnValue({ userId: 'test-user-id' } as Bite);

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
