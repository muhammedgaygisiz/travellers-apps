import { TestBed } from '@angular/core/testing';
import { CreateBiteTrailService } from '../create-bite-trail.service';
import { CreateBiteTrailDataAccessService } from 'bite-tribe-business/create-bite-trail-data-access';
import { LoadingController, NavController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { BiteTrail } from 'model';
import { ToastService } from 'toast';

jest.mock('bite-tribe-business/create-bite-trail-data-access');
jest.mock('@capacitor-firebase/firestore');

describe('CreateBiteTrailService', () => {
  let service: CreateBiteTrailService;
  let dataAccessMock: jest.Mocked<CreateBiteTrailDataAccessService>;
  let navControllerMock: { navigateBack: jest.Mock };
  let toastMock: { present: jest.Mock };
  let loading: { present: jest.Mock; dismiss: jest.Mock };

  beforeEach(() => {
    const mockResource = { value: jest.fn().mockReturnValue(undefined) };

    dataAccessMock = {
      bites: mockResource,
      owner: mockResource,
      createBiteTrail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CreateBiteTrailDataAccessService>;

    navControllerMock = { navigateBack: jest.fn() };

    toastMock = { present: jest.fn().mockResolvedValue(undefined) };
    loading = {
      present: jest.fn().mockResolvedValue(undefined),
      dismiss: jest.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        CreateBiteTrailService,
        {
          provide: CreateBiteTrailDataAccessService,
          useValue: dataAccessMock,
        },
        {
          provide: NavController,
          useValue: navControllerMock,
        },
        {
          provide: ToastService,
          useValue: toastMock,
        },
        {
          provide: LoadingController,
          useValue: { create: jest.fn().mockResolvedValue(loading) },
        },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string): string => `[${key}]` },
        },
      ],
    });

    service = TestBed.inject(CreateBiteTrailService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('bites', () => {
    it('should expose bites from dataAccess', () => {
      expect(service.bites).toBe(dataAccessMock.bites);
    });
  });

  describe('owner', () => {
    it('should expose owner from dataAccess', () => {
      expect(service.owner).toBe(dataAccessMock.owner);
    });
  });

  describe('submitBiteTrail', () => {
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
      biteIds: ['bite-1'],
      imagePath: '',
      location: 'Berlin',
      description: 'A trail',
      price: 0,
      currency: 'EUR',
    };

    it('should call dataAccess.createBiteTrail with the trail data', async () => {
      await service.submitBiteTrail(trailData);

      expect(dataAccessMock.createBiteTrail).toHaveBeenCalledWith(trailData);
    });

    it('should navigate back after creating bite trail', async () => {
      await service.submitBiteTrail(trailData);

      expect(navControllerMock.navigateBack).toHaveBeenCalled();
    });

    it('should show success toast after creating bite trail', async () => {
      await service.submitBiteTrail(trailData);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'bite-trail-created',
        outcome: 'success',
      });
    });

    it('holds a modal while it saves, and lets go of it afterwards', async () => {
      await service.submitBiteTrail(trailData);

      expect(loading.present).toHaveBeenCalled();
      expect(loading.dismiss).toHaveBeenCalled();
    });

    it('ignores a second submit while the first is saving', async () => {
      let finish: (value: undefined) => void = () => undefined;
      dataAccessMock.createBiteTrail.mockImplementation(
        () => new Promise((resolve) => (finish = resolve)),
      );

      const first = service.submitBiteTrail(trailData);
      await service.submitBiteTrail(trailData);
      await Promise.resolve();
      await Promise.resolve();
      finish(undefined);
      await first;

      expect(dataAccessMock.createBiteTrail).toHaveBeenCalledTimes(1);
    });

    // GitHub issue #2141: only the image check publishes the photo.
    describe('with a photo', () => {
      const withPhoto = { ...trailData, image: 'data:image/png;base64,abc' };

      it('says the photo is still being checked when the check has not answered', async () => {
        dataAccessMock.createBiteTrail = jest.fn().mockResolvedValue(undefined);

        await service.submitBiteTrail(withPhoto);

        expect(toastMock.present).toHaveBeenCalledWith({
          messageKey: 'bite-trail-created-photo-checking',
          outcome: 'success',
        });
      });

      it('says the trail was created when the check passed its photo', async () => {
        dataAccessMock.createBiteTrail = jest.fn().mockResolvedValue({
          imageStatus: 'uploaded',
          imagePath: 'https://example.test/trail.jpg',
        });

        await service.submitBiteTrail(withPhoto);

        expect(toastMock.present).toHaveBeenCalledWith({
          messageKey: 'bite-trail-created',
          outcome: 'success',
        });
      });

      it('says why the check refused the photo', async () => {
        dataAccessMock.createBiteTrail = jest.fn().mockResolvedValue({
          imageStatus: 'refused',
          imageRefusalCategory: 'violence',
        });

        await service.submitBiteTrail(withPhoto);

        expect(toastMock.present).toHaveBeenCalledWith({
          message:
            '[bite-trail-created-photo-refused] [photo-refused-reason-violence]',
          outcome: 'failure',
        });
        expect(navControllerMock.navigateBack).toHaveBeenCalled();
      });
    });

    it('should show error toast and not navigate when createBiteTrail fails', async () => {
      dataAccessMock.createBiteTrail = jest
        .fn()
        .mockRejectedValue(new Error('Firebase error'));

      await service.submitBiteTrail(trailData);

      expect(toastMock.present).toHaveBeenCalledWith({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });
      expect(navControllerMock.navigateBack).not.toHaveBeenCalled();
      expect(loading.dismiss).toHaveBeenCalled();
    });
  });
});
