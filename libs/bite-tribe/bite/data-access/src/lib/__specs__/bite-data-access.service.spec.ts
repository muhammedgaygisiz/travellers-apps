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
import { BiteDataAccessService } from '../bite-data-access.service';

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
