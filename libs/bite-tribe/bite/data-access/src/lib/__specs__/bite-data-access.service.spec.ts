import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService, ProfileApiService } from 'bite-tribe/api';
import { NetworkStatusService } from 'common/networkstatus';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type {
  Bite,
  Bucketlist,
  CreateAndUploadImageCallbackParams,
  Geopoint,
  PublicUser,
  UploadParams,
} from 'model';
import { BehaviorSubject, of } from 'rxjs';
import {
  BiteDataAccessService,
  STALLED_UPLOAD_TIMEOUT_MS,
} from '../bite-data-access.service';

const SAVED_BITE_ID = 'saved-bite-id';

const biteWithImage = (): Bite =>
  ({
    id: '',
    name: 'Pizza',
    place: 'Trattoria',
    price: 12,
    image: 'data:image/jpeg;base64,local-copy',
  }) as Bite;

/**
 * Runs `submitNewBite` and hands back the callback the upload was started with,
 * so a test can drive the progress/error/completion branches itself.
 */
const captureUploadCallback = async (
  service: BiteDataAccessService,
  api: { uploadImage: jest.Mock },
): Promise<(p: CreateAndUploadImageCallbackParams) => void> => {
  await service.submitNewBite(biteWithImage());

  expect(api.uploadImage).toHaveBeenCalledTimes(1);

  return api.uploadImage.mock.calls[0][1];
};

describe(BiteDataAccessService.name, () => {
  let service: BiteDataAccessService;
  let api: {
    saveNewBite: jest.Mock;
    uploadImage: jest.Mock;
    setBiteImageStatus: jest.Mock;
    findLocalBiteImage: jest.Mock;
    uploadBiteImageFromLocalFile: jest.Mock;
    searchPlaces: jest.Mock;
    searchNearbyPlaces: jest.Mock;
    getCurrencyByPosition: jest.Mock;
    hasBitesByUser: jest.Mock;
    saveBitePhotoPosition: jest.Mock;
    loadBitePhotoPosition: jest.Mock;
  };
  let store: {
    saveNewBite: jest.Mock;
    savedNewBite: jest.Mock;
    createdNewBite: jest.Mock;
    saveEditedBite: jest.Mock;
    setEditingBite: jest.Mock;
    clearCachedBite: jest.Mock;
    setBiteTriedOutStatus: jest.Mock;
  };
  let bucketlists$: BehaviorSubject<Bucketlist[]>;
  let analytics: { logEvent: jest.Mock };
  let profileApi: { fetchFollowingWithDetails: jest.Mock };
  let blockedUserIds$: BehaviorSubject<string[]>;
  const biteIdFromUrl = signal<string | undefined>(undefined);
  let publicUser$: BehaviorSubject<Partial<PublicUser> | undefined>;
  const user = signal<{ uid: string } | undefined>(undefined);

  beforeEach(() => {
    biteIdFromUrl.set(undefined);
    publicUser$ = new BehaviorSubject<Partial<PublicUser> | undefined>(
      undefined,
    );
    user.set({ uid: 'leela' });
    // The stall watchdog is a timer, and every upload started in this file arms
    // one, so the clock is controlled for the whole suite.
    jest.useFakeTimers();

    api = {
      saveNewBite: jest
        .fn()
        .mockImplementation(async (bite: Omit<Bite, 'image'>) => ({
          ...bite,
          id: SAVED_BITE_ID,
        })),
      uploadImage: jest.fn().mockResolvedValue(undefined),
      setBiteImageStatus: jest.fn().mockResolvedValue(undefined),
      findLocalBiteImage: jest.fn().mockResolvedValue(undefined),
      uploadBiteImageFromLocalFile: jest.fn().mockResolvedValue(undefined),
      searchPlaces: jest.fn().mockResolvedValue([]),
      searchNearbyPlaces: jest.fn().mockResolvedValue([]),
      getCurrencyByPosition: jest.fn().mockResolvedValue(undefined),
      hasBitesByUser: jest.fn().mockResolvedValue(false),
      saveBitePhotoPosition: jest.fn().mockResolvedValue(undefined),
      loadBitePhotoPosition: jest.fn().mockResolvedValue(undefined),
    };
    store = {
      saveNewBite: jest.fn(),
      savedNewBite: jest.fn(),
      createdNewBite: jest.fn(),
      saveEditedBite: jest.fn(),
      setEditingBite: jest.fn(),
      clearCachedBite: jest.fn(),
      setBiteTriedOutStatus: jest.fn(),
    };
    bucketlists$ = new BehaviorSubject<Bucketlist[]>([]);
    analytics = { logEvent: jest.fn() };
    profileApi = { fetchFollowingWithDetails: jest.fn().mockResolvedValue([]) };
    blockedUserIds$ = new BehaviorSubject<string[]>([]);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        BiteDataAccessService,
        { provide: BiteTribeApiService, useValue: api },
        { provide: AnalyticsService, useValue: analytics },
        { provide: ProfileApiService, useValue: profileApi },
        {
          provide: NetworkStatusService,
          useValue: { status: (): undefined => undefined },
        },
        {
          provide: BiteTribeStoreService,
          useValue: {
            ...store,
            biteIdFromUrl,
            currencyFromSettings$: of(undefined),
            favCurrenciesFromSettings$: of(undefined),
            position$: of(undefined),
            cachedBite$: of(undefined),
            bucketlists$,
            nearbyRestaurants$: of(undefined),
            tagSuggestionsForEditingBite$: of(undefined),
            publicUser$,
            blockedUserIds$,
            user,
          },
        },
      ],
    });

    service = TestBed.inject(BiteDataAccessService);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // Issue #2018: posting a copy ticks its source off in the poster's lists.
  describe('markTriedOutInBucketlists', () => {
    const list = (
      id: string,
      biteIds: string[],
      triedOut: string[] = [],
    ): Bucketlist => ({
      id,
      userId: 'me',
      name: id,
      biteIds,
      triedOutBites: triedOut.map((biteId) => ({
        biteId,
        date: '2026-01-01T00:00:00.000Z',
        timestamp: 0,
      })),
    });

    it('ticks the Bite off in every list that holds it', () => {
      bucketlists$.next([
        list('lisbon', ['sams-bite', 'other']),
        list('drinks', ['sams-bite']),
        list('unrelated', ['other']),
      ]);

      service.markTriedOutInBucketlists('sams-bite');

      expect(store.setBiteTriedOutStatus.mock.calls).toEqual([
        [{ bucketlistId: 'lisbon', biteId: 'sams-bite', checked: true }],
        [{ bucketlistId: 'drinks', biteId: 'sams-bite', checked: true }],
      ]);
    });

    it('leaves a list where the Bite is already ticked off alone', () => {
      bucketlists$.next([list('lisbon', ['sams-bite'], ['sams-bite'])]);

      service.markTriedOutInBucketlists('sams-bite');

      expect(store.setBiteTriedOutStatus).not.toHaveBeenCalled();
    });

    it('does nothing when no list holds the Bite', () => {
      bucketlists$.next([list('lisbon', ['other'])]);

      service.markTriedOutInBucketlists('sams-bite');

      expect(store.setBiteTriedOutStatus).not.toHaveBeenCalled();
    });
  });

  // Issue #1917: who the "Ate with" picker may offer.
  describe('taggableUsers', () => {
    const profile = (
      userId: string,
      overrides: Partial<PublicUser> = {},
    ): PublicUser => ({
      userId,
      displayName: userId,
      email: '',
      photoUrl: '',
      public: true,
      ...overrides,
    });

    it('offers followed public accounts and leaves out private and blocked ones', async () => {
      profileApi.fetchFollowingWithDetails.mockResolvedValue([
        profile('anna'),
        profile('private-1', { public: false, displayName: '' }),
        profile('blocked-1'),
      ]);
      blockedUserIds$.next(['blocked-1']);

      TestBed.tick();
      await jest.advanceTimersByTimeAsync(0);
      TestBed.tick();

      expect(profileApi.fetchFollowingWithDetails).toHaveBeenCalledWith(
        'leela',
      );
      expect(service.taggableUsers().map((user) => user.userId)).toEqual([
        'anna',
      ]);
    });

    // The store's profile is a login-time snapshot that can be missing; the
    // signed-in account is what the list belongs to.
    it('loads the following list without waiting for the profile', async () => {
      profileApi.fetchFollowingWithDetails.mockResolvedValue([profile('anna')]);

      TestBed.tick();
      await jest.advanceTimersByTimeAsync(0);
      TestBed.tick();

      expect(service.taggableUsers().map((user) => user.userId)).toEqual([
        'anna',
      ]);
    });

    it('offers nobody while nobody is signed in', () => {
      user.set(undefined);
      TestBed.tick();

      expect(service.taggableUsers()).toEqual([]);
      expect(profileApi.fetchFollowingWithDetails).not.toHaveBeenCalled();
    });
  });

  describe('hasOwnBites', () => {
    it('answers from the aggregate when it counts a Bite', async () => {
      publicUser$.next({ userId: 'leela', biteCount: 4 });

      await expect(service.hasOwnBites()).resolves.toBe(true);
      expect(api.hasBitesByUser).not.toHaveBeenCalled();
    });

    it.each([
      ['no aggregate', undefined],
      ['an aggregate of zero', 0],
    ])('asks Firestore for a profile with %s', async (_, biteCount) => {
      publicUser$.next({ userId: 'leela', biteCount });
      api.hasBitesByUser.mockResolvedValue(true);

      await expect(service.hasOwnBites()).resolves.toBe(true);
      expect(api.hasBitesByUser).toHaveBeenCalledWith('leela');
    });

    it('asks Firestore before the profile has loaded', async () => {
      await expect(service.hasOwnBites()).resolves.toBe(false);
      expect(api.hasBitesByUser).toHaveBeenCalledWith('leela');
    });

    it('cannot tell while signed out', async () => {
      user.set(undefined);

      await expect(service.hasOwnBites()).resolves.toBeUndefined();
      expect(api.hasBitesByUser).not.toHaveBeenCalled();
    });

    it('cannot tell when the read fails', async () => {
      api.hasBitesByUser.mockRejectedValue(new Error('offline'));

      await expect(service.hasOwnBites()).resolves.toBeUndefined();
    });
  });

  describe('biteLoader', () => {
    it('loads a bite document and preserves its id', async () => {
      jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
        snapshot: {
          id: 'bite-123',
          data: { name: 'Pizza' },
        },
      } as Awaited<ReturnType<typeof FirebaseFirestore.getDocument>>);

      await expect(
        service.biteLoader({
          params: { biteId: 'bite-123' },
          abortSignal: new AbortController().signal,
          previous: { status: 'idle' },
        }),
      ).resolves.toEqual({ id: 'bite-123', name: 'Pizza' });
      expect(FirebaseFirestore.getDocument).toHaveBeenCalledWith({
        reference: 'bites/bite-123',
      });
    });

    it('does not read Firestore without a bite id', async () => {
      const getDocument = jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockClear();

      await expect(
        service.biteLoader({
          params: { biteId: undefined },
          abortSignal: new AbortController().signal,
          previous: { status: 'idle' },
        }),
      ).resolves.toBeUndefined();
      expect(getDocument).not.toHaveBeenCalled();
    });
  });

  describe('given the bite read fails', () => {
    const settle = async (): Promise<void> => {
      TestBed.flushEffects();

      for (let tick = 0; tick < 20; tick++) {
        await Promise.resolve();
      }

      TestBed.flushEffects();
    };

    // Reading `bite.value()` on a failed resource throws, and the edit page
    // bound it as its first input, so the whole page froze rather than saying
    // the Bite could not be loaded. See GitHub issue #1232.
    it('answers with no bite and reports the failure', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockRejectedValue(new Error('permission-denied'));
      biteIdFromUrl.set('bite-123');

      await settle();

      expect(() => service.bite.value()).toThrow();
      expect(service.biteValue()).toBeUndefined();
      expect(service.biteLoadFailed()).toBe(true);
    });
  });

  describe('given a Places lookup fails', () => {
    it('falls back to no suggestions instead of throwing', async () => {
      api.searchPlaces.mockRejectedValue(new Error('app-check-refused'));
      service.googlePlaceSearchText.set('pizzeria');

      TestBed.flushEffects();

      for (let tick = 0; tick < 20; tick++) {
        await Promise.resolve();
      }

      TestBed.flushEffects();

      expect(service.googlePlaces()).toEqual([]);
    });
  });

  describe('retryImageUpload', () => {
    const failedBite = (): Bite =>
      ({
        ...biteWithImage(),
        id: SAVED_BITE_ID,
        imageStatus: 'failed',
      }) as Bite;

    it('should put the bite back to pending before re-sending', async () => {
      await service.retryImageUpload(failedBite(), 'file:///local.jpg');

      expect(api.setBiteImageStatus).toHaveBeenCalledWith(
        SAVED_BITE_ID,
        'pending',
      );
      expect(store.savedNewBite).toHaveBeenLastCalledWith(
        expect.objectContaining({ imageStatus: 'pending' }),
      );
    });

    it('should not report a retried bite as created', async () => {
      await service.retryImageUpload(failedBite(), 'file:///local.jpg');

      expect(store.createdNewBite).not.toHaveBeenCalled();
    });

    it('should upload the chosen file', async () => {
      await service.retryImageUpload(failedBite(), 'file:///local.jpg');

      expect(api.uploadBiteImageFromLocalFile).toHaveBeenCalledWith(
        SAVED_BITE_ID,
        'file:///local.jpg',
        expect.any(Function),
      );
    });

    it('should record the retry for analytics', async () => {
      await service.retryImageUpload(failedBite(), 'file:///local.jpg');

      expect(analytics.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.BiteImageUploadRetried,
      );
    });

    it('should mark the bite failed again when the retry errors', async () => {
      await service.retryImageUpload(failedBite(), 'file:///local.jpg');
      const callback = api.uploadBiteImageFromLocalFile.mock.calls[0][2];

      callback({
        uploadParams: { err: new Error('still offline') } as UploadParams,
      } as CreateAndUploadImageCallbackParams);

      expect(api.setBiteImageStatus).toHaveBeenLastCalledWith(
        SAVED_BITE_ID,
        'failed',
      );
    });

    it('should mark the bite failed when the retry stalls', async () => {
      await service.retryImageUpload(failedBite(), 'file:///local.jpg');

      jest.advanceTimersByTime(STALLED_UPLOAD_TIMEOUT_MS);

      expect(api.setBiteImageStatus).toHaveBeenLastCalledWith(
        SAVED_BITE_ID,
        'failed',
      );
    });

    describe('while the pending write is not acknowledged yet', () => {
      // Offline a Firestore write reaches the local cache immediately but is
      // only acknowledged once the device is back on the network, so its
      // promise stays open for as long as the user is disconnected.
      const unacknowledgedWrite = (): void => {
        api.setBiteImageStatus.mockReturnValue(new Promise<void>(() => void 0));
      };

      it('should still send the photo', async () => {
        unacknowledgedWrite();

        await service.retryImageUpload(failedBite(), 'file:///local.jpg');

        expect(api.uploadBiteImageFromLocalFile).toHaveBeenCalledWith(
          SAVED_BITE_ID,
          'file:///local.jpg',
          expect.any(Function),
        );
      });

      it('should mark the bite failed when the retry stalls', async () => {
        unacknowledgedWrite();

        await service.retryImageUpload(failedBite(), 'file:///local.jpg');
        jest.advanceTimersByTime(STALLED_UPLOAD_TIMEOUT_MS);

        expect(api.setBiteImageStatus).toHaveBeenLastCalledWith(
          SAVED_BITE_ID,
          'failed',
        );
        expect(store.savedNewBite).toHaveBeenLastCalledWith(
          expect.objectContaining({ imageStatus: 'failed' }),
        );
      });

      it('should allow another retry after that failure', async () => {
        unacknowledgedWrite();

        await service.retryImageUpload(failedBite(), 'file:///local.jpg');
        jest.advanceTimersByTime(STALLED_UPLOAD_TIMEOUT_MS);
        await service.retryImageUpload(failedBite(), 'file:///local.jpg');

        expect(api.uploadBiteImageFromLocalFile).toHaveBeenCalledTimes(2);
      });
    });

    it('should mark the bite failed when the chosen file cannot be read', async () => {
      api.uploadBiteImageFromLocalFile.mockRejectedValue(
        new Error('file not found'),
      );

      await service.retryImageUpload(failedBite(), 'file:///gone.jpg');

      expect(api.setBiteImageStatus).toHaveBeenLastCalledWith(
        SAVED_BITE_ID,
        'failed',
      );
    });

    it('should ignore a second retry while the first one is still running', async () => {
      await service.retryImageUpload(failedBite(), 'file:///local.jpg');
      await service.retryImageUpload(failedBite(), 'file:///local.jpg');

      expect(api.uploadBiteImageFromLocalFile).toHaveBeenCalledTimes(1);
      expect(analytics.logEvent).toHaveBeenCalledTimes(1);
    });

    it('should ignore a retry while the first upload of the bite is still running', async () => {
      await service.submitNewBite(biteWithImage());

      await service.retryImageUpload(failedBite(), 'file:///local.jpg');

      expect(api.uploadBiteImageFromLocalFile).not.toHaveBeenCalled();
    });

    it('should allow another retry once the previous attempt failed', async () => {
      await service.retryImageUpload(failedBite(), 'file:///local.jpg');
      const callback = api.uploadBiteImageFromLocalFile.mock.calls[0][2];
      callback({
        uploadParams: { err: new Error('still offline') } as UploadParams,
      } as CreateAndUploadImageCallbackParams);

      await service.retryImageUpload(failedBite(), 'file:///local.jpg');

      expect(api.uploadBiteImageFromLocalFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('stalled uploads', () => {
    it('should mark a bite whose upload never reports back as failed', async () => {
      await service.submitNewBite(biteWithImage());

      jest.advanceTimersByTime(STALLED_UPLOAD_TIMEOUT_MS);

      expect(api.setBiteImageStatus).toHaveBeenCalledWith(
        SAVED_BITE_ID,
        'failed',
      );
      expect(store.savedNewBite).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: SAVED_BITE_ID, imageStatus: 'failed' }),
      );
      expect(analytics.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.BiteImageUploadFailed,
        { code: 'stalled' },
      );
      expect(service.uploadProgress()).toBeNull();
    });

    it('should hold the pending state until the bound is reached', async () => {
      await service.submitNewBite(biteWithImage());

      jest.advanceTimersByTime(STALLED_UPLOAD_TIMEOUT_MS - 1);

      expect(api.setBiteImageStatus).not.toHaveBeenCalled();
    });

    it('should keep waiting while the upload is still making progress', async () => {
      const callback = await captureUploadCallback(service, api);

      jest.advanceTimersByTime(STALLED_UPLOAD_TIMEOUT_MS - 1);
      callback({
        uploadParams: { evt: { completed: false } } as UploadParams,
      } as CreateAndUploadImageCallbackParams);
      jest.advanceTimersByTime(STALLED_UPLOAD_TIMEOUT_MS - 1);

      expect(api.setBiteImageStatus).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);

      expect(api.setBiteImageStatus).toHaveBeenCalledWith(
        SAVED_BITE_ID,
        'failed',
      );
    });

    it('should not fail an upload that finished', async () => {
      const callback = await captureUploadCallback(service, api);

      callback({
        uploadParams: { evt: { completed: true } } as UploadParams,
      } as CreateAndUploadImageCallbackParams);
      jest.advanceTimersByTime(STALLED_UPLOAD_TIMEOUT_MS);

      expect(api.setBiteImageStatus).not.toHaveBeenCalled();
    });

    it('should record an errored upload once instead of failing it twice', async () => {
      const callback = await captureUploadCallback(service, api);

      callback({
        uploadParams: { err: new Error('network down') } as UploadParams,
      } as CreateAndUploadImageCallbackParams);
      jest.advanceTimersByTime(STALLED_UPLOAD_TIMEOUT_MS);

      expect(api.setBiteImageStatus).toHaveBeenCalledTimes(1);
    });

    it('should not watch a bite that has no image to upload', async () => {
      const { image, ...biteWithoutImage } = biteWithImage();
      void image;

      await service.submitNewBite(biteWithoutImage as Bite);
      jest.advanceTimersByTime(STALLED_UPLOAD_TIMEOUT_MS);

      expect(api.setBiteImageStatus).not.toHaveBeenCalled();
    });
  });

  describe('findLocalImageForBite', () => {
    it('should report the local copy this device kept', async () => {
      api.findLocalBiteImage.mockResolvedValue({
        uri: 'file:///bites_x.jpg',
        name: 'bites_x.jpg',
      });

      await expect(service.findLocalImageForBite('x')).resolves.toEqual({
        uri: 'file:///bites_x.jpg',
        name: 'bites_x.jpg',
      });
    });

    it('should report nothing when the copy is gone', async () => {
      api.findLocalBiteImage.mockResolvedValue(undefined);

      await expect(service.findLocalImageForBite('x')).resolves.toBeUndefined();
    });
  });

  describe('submitNewBite', () => {
    it('should report the bite as created, so the profile count moves', async () => {
      await service.submitNewBite(biteWithImage());

      expect(store.createdNewBite).toHaveBeenCalledWith(
        expect.objectContaining({ id: SAVED_BITE_ID }),
      );
    });

    it('should mark the image as pending while it uploads', async () => {
      await service.submitNewBite(biteWithImage());

      expect(api.saveNewBite).toHaveBeenCalledWith(
        expect.objectContaining({ imageStatus: 'pending' }),
      );
    });

    it('should record a failed upload on the bite instead of leaving it pending', async () => {
      const callback = await captureUploadCallback(service, api);

      callback({
        uploadParams: { err: new Error('network down') } as UploadParams,
      } as CreateAndUploadImageCallbackParams);

      expect(api.setBiteImageStatus).toHaveBeenCalledWith(
        SAVED_BITE_ID,
        'failed',
      );
    });

    it('should reflect the failure locally so the card stops saying "uploading"', async () => {
      const callback = await captureUploadCallback(service, api);

      callback({
        uploadParams: { err: new Error('network down') } as UploadParams,
      } as CreateAndUploadImageCallbackParams);

      expect(store.savedNewBite).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: SAVED_BITE_ID, imageStatus: 'failed' }),
      );
    });

    it('should report the failure to analytics and clear the progress', async () => {
      const callback = await captureUploadCallback(service, api);

      callback({
        uploadParams: { err: new Error('network down') } as UploadParams,
      } as CreateAndUploadImageCallbackParams);

      expect(analytics.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.BiteImageUploadFailed,
        expect.objectContaining({ code: expect.any(String) }),
      );
      expect(service.uploadProgress()).toBeNull();
    });

    it('should leave the status alone while the upload is still running', async () => {
      const callback = await captureUploadCallback(service, api);

      callback({
        uploadParams: { evt: { completed: false } } as UploadParams,
      } as CreateAndUploadImageCallbackParams);

      expect(api.setBiteImageStatus).not.toHaveBeenCalled();
      expect(service.uploadProgress()?.biteId).toBe(SAVED_BITE_ID);
    });

    it('should leave the finished upload to the storage trigger', async () => {
      const callback = await captureUploadCallback(service, api);

      callback({
        uploadParams: { evt: { completed: true } } as UploadParams,
      } as CreateAndUploadImageCallbackParams);

      expect(api.setBiteImageStatus).not.toHaveBeenCalled();
      expect(analytics.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.BiteImageUploaded,
      );
      expect(service.uploadProgress()).toBeNull();
    });

    it('should not touch the image status for a bite without an image', async () => {
      const { image, ...biteWithoutImage } = biteWithImage();
      void image;

      await service.submitNewBite(biteWithoutImage as Bite);

      expect(api.saveNewBite).toHaveBeenCalledWith(
        expect.not.objectContaining({ imageStatus: expect.anything() }),
      );
      expect(api.uploadImage).not.toHaveBeenCalled();
    });
  });

  /** Stored apart from the Bite, for its author alone (GitHub issue #1290). */
  describe('the photo position', () => {
    const photoPosition = { latitude: 36.74, longitude: -5.16 };

    it('is stored under the saved Bite, and never on it', async () => {
      await service.submitNewBite(biteWithImage(), photoPosition);

      expect(api.saveBitePhotoPosition).toHaveBeenCalledWith(
        SAVED_BITE_ID,
        photoPosition,
      );
      expect(api.saveNewBite).toHaveBeenCalledWith(
        expect.not.objectContaining({ photoPosition: expect.anything() }),
      );
    });

    it('writes nothing for a new Bite whose photo had none', async () => {
      await service.submitNewBite(biteWithImage());

      expect(api.saveBitePhotoPosition).not.toHaveBeenCalled();
    });

    it('is rewritten with an edit that changed the photo', async () => {
      await service.submitEditedBite(
        { ...biteWithImage(), id: 'bite-1' },
        null,
      );

      expect(api.saveBitePhotoPosition).toHaveBeenCalledWith('bite-1', null);
    });

    it('is left alone by an edit that kept the photo', async () => {
      await service.submitEditedBite({ ...biteWithImage(), id: 'bite-1' });

      expect(api.saveBitePhotoPosition).not.toHaveBeenCalled();
    });

    it('is loaded for the Bite being edited', async () => {
      api.loadBitePhotoPosition.mockResolvedValue(photoPosition);
      biteIdFromUrl.set('bite-1');

      TestBed.tick();
      await jest.advanceTimersByTimeAsync(0);
      TestBed.tick();

      expect(api.loadBitePhotoPosition).toHaveBeenCalledWith('bite-1');
      expect(service.storedPhotoPosition()).toEqual(photoPosition);
    });
  });

  describe('editing and lookup commands', () => {
    it('delegates an edited bite to the store', async () => {
      const bite = biteWithImage();

      await service.submitEditedBite(bite);

      expect(store.saveEditedBite).toHaveBeenCalledWith(bite);
    });

    it('sets the bite being edited', () => {
      const bite = { id: 'bite-123', name: 'Pizza' };

      service.setEditingBite(bite);

      expect(store.setEditingBite).toHaveBeenCalledWith(bite);
    });

    it('clears the cached bite in the store', () => {
      service.clearCachedBite();

      expect(store.clearCachedBite).toHaveBeenCalled();
    });

    it('updates the Google place search text', () => {
      service.searchGooglePlaces('pizza');

      expect(service.googlePlaceSearchText()).toBe('pizza');
    });

    it('updates the nearby Google places position', () => {
      const position = { latitude: 41.39, longitude: 2.17 } as Geopoint;

      service.loadNearbyGooglePlaces(position);

      expect(service.nearbyGooglePlacesPosition()).toBe(position);
    });

    it('delegates currency lookup to the API', async () => {
      const position = { latitude: 41.39, longitude: 2.17 } as Geopoint;
      api.getCurrencyByPosition.mockResolvedValue('EUR');

      await expect(service.getCurrencyByPosition(position)).resolves.toBe(
        'EUR',
      );
      expect(api.getCurrencyByPosition).toHaveBeenCalledWith(position);
    });
  });
});
