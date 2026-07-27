import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService } from 'bite-tribe/api';
import { NetworkStatusService } from 'common/networkstatus';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import type {
  Bite,
  CreateAndUploadImageCallbackParams,
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
  };
  let store: { saveNewBite: jest.Mock; savedNewBite: jest.Mock };
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
    };
    store = { saveNewBite: jest.fn(), savedNewBite: jest.fn() };
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
});
