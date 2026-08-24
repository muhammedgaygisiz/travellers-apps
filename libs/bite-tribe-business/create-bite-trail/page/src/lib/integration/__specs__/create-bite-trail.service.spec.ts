import { TestBed } from '@angular/core/testing';
import { CreateBiteTrailService } from '../create-bite-trail.service';
import { CreateBiteTrailDataAccessService } from 'bite-tribe-business/create-bite-trail-data-access';
import { NavController } from '@ionic/angular/standalone';
import { BiteTrail } from 'model';
import { ToastService } from 'toast';

jest.mock('bite-tribe-business/create-bite-trail-data-access');
jest.mock('@capacitor-firebase/firestore');

describe('CreateBiteTrailService', () => {
  let service: CreateBiteTrailService;
  let dataAccessMock: jest.Mocked<CreateBiteTrailDataAccessService>;
  let navControllerMock: { navigateBack: jest.Mock };
  let toastMock: { present: jest.Mock };

  beforeEach(() => {
    const mockResource = { value: jest.fn().mockReturnValue(undefined) };

    dataAccessMock = {
      bites: mockResource,
      owner: mockResource,
      createBiteTrail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CreateBiteTrailDataAccessService>;

    navControllerMock = { navigateBack: jest.fn() };

    toastMock = { present: jest.fn().mockResolvedValue(undefined) };

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
    });
  });
});
