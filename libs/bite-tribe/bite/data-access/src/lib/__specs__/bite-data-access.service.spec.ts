import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService } from 'bite-tribe/api';
import { NetworkStatusService } from 'common/networkstatus';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type {
  Bite,
  CreateAndUploadImageCallbackParams,
  Geopoint,
  UploadParams,
} from 'model';
import { of } from 'rxjs';
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
  };
  let store: {
    saveNewBite: jest.Mock;
    savedNewBite: jest.Mock;
    saveEditedBite: jest.Mock;
    setEditingBite: jest.Mock;
  };
  let analytics: { logEvent: jest.Mock };

  beforeEach(() => {
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
    };
    store = {
      saveNewBite: jest.fn(),
      savedNewBite: jest.fn(),
      saveEditedBite: jest.fn(),
      setEditingBite: jest.fn(),
    };
    analytics = { logEvent: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        BiteDataAccessService,
        { provide: BiteTribeApiService, useValue: api },
        { provide: AnalyticsService, useValue: analytics },
        {
          provide: NetworkStatusService,
          useValue: { status: (): undefined => undefined },
        },
        {
          provide: BiteTribeStoreService,
          useValue: {
            ...store,
            biteIdFromUrl: (): undefined => undefined,
            currencyFromSettings$: of(undefined),
            favCurrenciesFromSettings$: of(undefined),
            position$: of(undefined),
            cachedBite$: of(undefined),
            nearbyRestaurants$: of(undefined),
            tagSuggestionsForEditingBite$: of(undefined),
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
