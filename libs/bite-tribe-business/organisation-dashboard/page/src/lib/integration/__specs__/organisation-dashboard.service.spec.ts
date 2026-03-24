import { TestBed } from '@angular/core/testing';
import { OrganisationDashboardService } from '../organisation-dashboard.service';
import { OrganisationDashboardDataAccessService } from 'bite-tribe-business/organisation-dashboard-data-access';
import { CreateBiteTrailDataAccessService } from 'bite-tribe-business/create-bite-trail-data-access';
import { NavController } from '@ionic/angular/standalone';
import { Bite, PublicUser } from 'model';
import { signal } from '@angular/core';

jest.mock('bite-tribe-business/organisation-dashboard-data-access');
jest.mock('bite-tribe-business/create-bite-trail-data-access');
jest.mock('@capacitor-firebase/firestore');

describe('OrganisationDashboardService', () => {
  let service: OrganisationDashboardService;
  let dataAccessMock: jest.Mocked<OrganisationDashboardDataAccessService>;
  let createBiteTrailDataAccessMock: jest.Mocked<CreateBiteTrailDataAccessService>;

  beforeEach(() => {
    const mockBites = { value: jest.fn().mockReturnValue([]) };
    const mockEmployees = { value: jest.fn().mockReturnValue([]) };

    dataAccessMock = {
      selectedUserIds: signal<string[]>([]),
      selectedBiteIds: signal<string[]>([]),
      loadBitesTrigger: signal<string[]>([]),
      bites: mockBites,
      employees: mockEmployees,
      organisationId: signal<string | undefined>(undefined),
    } as unknown as jest.Mocked<OrganisationDashboardDataAccessService>;

    createBiteTrailDataAccessMock = {
      selectedBites: signal<Bite[]>([]),
      employees: signal<PublicUser[]>([]),
    } as unknown as jest.Mocked<CreateBiteTrailDataAccessService>;

    TestBed.configureTestingModule({
      providers: [
        OrganisationDashboardService,
        {
          provide: OrganisationDashboardDataAccessService,
          useValue: dataAccessMock,
        },
        {
          provide: CreateBiteTrailDataAccessService,
          useValue: createBiteTrailDataAccessMock,
        },
        {
          provide: NavController,
          useValue: { navigateForward: jest.fn() },
        },
      ],
    });

    service = TestBed.inject(OrganisationDashboardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('bites', () => {
    it('should expose the bites resource from dataAccess', () => {
      expect(service.bites).toBe(dataAccessMock.bites);
    });
  });

  describe('employees', () => {
    it('should expose the employees resource from dataAccess', () => {
      expect(service.employees).toBe(dataAccessMock.employees);
    });
  });

  describe('selectedEmployeeIds', () => {
    it('should expose the selectedUserIds signal from dataAccess', () => {
      expect(service.selectedEmployeeIds).toBe(dataAccessMock.selectedUserIds);
    });
  });

  describe('selectedBiteIds', () => {
    it('should expose the selectedBiteIds signal from dataAccess', () => {
      expect(service.selectedBiteIds).toBe(dataAccessMock.selectedBiteIds);
    });
  });

  describe('toggleEmployee', () => {
    it('should add user ID to selectedUserIds when not already selected', () => {
      const user: PublicUser = {
        displayName: 'Alice',
        email: 'alice@example.com',
        photoUrl: '',
        userId: '123',
      };
      service.toggleEmployee(user);
      expect(dataAccessMock.selectedUserIds()).toContain('123');
    });

    it('should remove user ID from selectedUserIds when already selected', () => {
      dataAccessMock.selectedUserIds.set(['123']);
      const user: PublicUser = {
        displayName: 'Alice',
        email: 'alice@example.com',
        photoUrl: '',
        userId: '123',
      };
      service.toggleEmployee(user);
      expect(dataAccessMock.selectedUserIds()).not.toContain('123');
    });

    it('should support multiple selected employees', () => {
      const user1: PublicUser = {
        displayName: 'Alice',
        email: 'alice@example.com',
        photoUrl: '',
        userId: '123',
      };
      const user2: PublicUser = {
        displayName: 'Bob',
        email: 'bob@example.com',
        photoUrl: '',
        userId: '456',
      };
      service.toggleEmployee(user1);
      service.toggleEmployee(user2);
      expect(dataAccessMock.selectedUserIds()).toEqual(['123', '456']);
    });
  });

  describe('toggleBite', () => {
    it('should add bite ID to selectedBiteIds when not already selected', () => {
      const bite = { id: 'bite-1', name: 'Pasta' } as Bite;
      service.toggleBite(bite);
      expect(dataAccessMock.selectedBiteIds()).toContain('bite-1');
    });

    it('should remove bite ID from selectedBiteIds when already selected', () => {
      dataAccessMock.selectedBiteIds.set(['bite-1']);
      const bite = { id: 'bite-1', name: 'Pasta' } as Bite;
      service.toggleBite(bite);
      expect(dataAccessMock.selectedBiteIds()).not.toContain('bite-1');
    });
  });

  describe('loadBites', () => {
    it('should copy selectedUserIds to loadBitesTrigger', () => {
      dataAccessMock.selectedUserIds.set(['user-1', 'user-2']);
      service.loadBites();
      expect(dataAccessMock.loadBitesTrigger()).toEqual(['user-1', 'user-2']);
    });
  });

  describe('createBiteTrail', () => {
    it('should not navigate if organisationId is undefined', () => {
      dataAccessMock.organisationId.set(undefined);
      expect(() => service.createBiteTrail()).not.toThrow();
    });
  });
});
