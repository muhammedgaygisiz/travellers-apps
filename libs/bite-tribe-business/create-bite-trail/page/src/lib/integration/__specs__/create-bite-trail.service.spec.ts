import { TestBed } from '@angular/core/testing';
import { CreateBiteTrailService } from '../create-bite-trail.service';
import { CreateBiteTrailDataAccessService } from 'bite-tribe-business/create-bite-trail-data-access';
import { NavController } from '@ionic/angular/standalone';
import { Bite, BiteTrail, PublicUser } from 'model';
import { signal } from '@angular/core';

jest.mock('bite-tribe-business/create-bite-trail-data-access');
jest.mock('@capacitor-firebase/firestore');

describe('CreateBiteTrailService', () => {
  let service: CreateBiteTrailService;
  let dataAccessMock: jest.Mocked<CreateBiteTrailDataAccessService>;
  let navControllerMock: { navigateBack: jest.Mock };

  beforeEach(() => {
    const mockOrganisation = { value: jest.fn().mockReturnValue(undefined) };

    dataAccessMock = {
      selectedBites: signal<Bite[]>([]),
      employees: signal<PublicUser[]>([]),
      organisation: mockOrganisation,
      createBiteTrail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CreateBiteTrailDataAccessService>;

    navControllerMock = { navigateBack: jest.fn() };

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
    it('should call dataAccess.createBiteTrail with the trail data', async () => {
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

      await service.submitBiteTrail(trailData);

      expect(dataAccessMock.createBiteTrail).toHaveBeenCalledWith(trailData);
    });

    it('should navigate back after creating bite trail', async () => {
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
        ownerImagePath: '',
        name: 'Trail',
        biteIds: [],
        imagePath: '',
        location: '',
        description: '',
        price: 0,
        currency: 'EUR',
      };

      await service.submitBiteTrail(trailData);

      expect(navControllerMock.navigateBack).toHaveBeenCalled();
    });
  });
});
