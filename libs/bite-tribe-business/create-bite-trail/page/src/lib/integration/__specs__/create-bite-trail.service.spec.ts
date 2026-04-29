import { TestBed } from '@angular/core/testing';
import { CreateBiteTrailService } from '../create-bite-trail.service';
import { CreateBiteTrailDataAccessService } from 'bite-tribe-business/create-bite-trail-data-access';
import { NavController, ToastController } from '@ionic/angular/standalone';
import { Bite, BiteTrail, PublicUser } from 'model';
import { signal } from '@angular/core';

jest.mock('bite-tribe-business/create-bite-trail-data-access');
jest.mock('@capacitor-firebase/firestore');

describe('CreateBiteTrailService', () => {
  let service: CreateBiteTrailService;
  let dataAccessMock: jest.Mocked<CreateBiteTrailDataAccessService>;
  let navControllerMock: { navigateBack: jest.Mock };
  let toastControllerMock: {
    create: jest.Mock;
  };
  let toastMock: { present: jest.Mock };

  beforeEach(() => {
    const mockOrganisation = { value: jest.fn().mockReturnValue(undefined) };

    dataAccessMock = {
      selectedBites: signal<Bite[]>([]),
      employees: signal<PublicUser[]>([]),
      organisation: mockOrganisation,
      createBiteTrail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CreateBiteTrailDataAccessService>;

    navControllerMock = { navigateBack: jest.fn() };

    toastMock = { present: jest.fn().mockResolvedValue(undefined) };
    toastControllerMock = {
      create: jest.fn().mockResolvedValue(toastMock),
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
          provide: ToastController,
          useValue: toastControllerMock,
        },
      ],
    });

    service = TestBed.inject(CreateBiteTrailService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('selectedBites', () => {
    it('should expose selectedBites from dataAccess', () => {
      expect(service.selectedBites).toBe(dataAccessMock.selectedBites);
    });
  });

  describe('employees', () => {
    it('should expose employees from dataAccess', () => {
      expect(service.employees).toBe(dataAccessMock.employees);
    });
  });

  describe('organisation', () => {
    it('should expose organisation from dataAccess', () => {
      expect(service.organisation).toBe(dataAccessMock.organisation);
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

      expect(toastControllerMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'success',
        }),
      );
      expect(toastMock.present).toHaveBeenCalled();
    });

    it('should show error toast and not navigate when createBiteTrail fails', async () => {
      dataAccessMock.createBiteTrail = jest
        .fn()
        .mockRejectedValue(new Error('Firebase error'));

      await service.submitBiteTrail(trailData);

      expect(toastControllerMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'danger',
        }),
      );
      expect(toastMock.present).toHaveBeenCalled();
      expect(navControllerMock.navigateBack).not.toHaveBeenCalled();
    });
  });
});
