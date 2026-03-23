import { TestBed } from '@angular/core/testing';
import { OrganisationDashboardService } from '../organisation-dashboard.service';
import { OrganisationDashboardDataAccessService } from 'bite-tribe-business/organisation-dashboard-data-access';
import { PublicUser } from 'model';
import { signal } from '@angular/core';

jest.mock('bite-tribe-business/organisation-dashboard-data-access');
jest.mock('@capacitor-firebase/firestore');

describe('OrganisationDashboardService', () => {
  let service: OrganisationDashboardService;
  let dataAccessMock: jest.Mocked<OrganisationDashboardDataAccessService>;

  beforeEach(() => {
    const mockBites = { value: jest.fn().mockReturnValue([]) };
    const mockEmployees = { value: jest.fn().mockReturnValue([]) };

    dataAccessMock = {
      selectedUserId: signal(''),
      bites: mockBites,
      employees: mockEmployees,
    } as unknown as jest.Mocked<OrganisationDashboardDataAccessService>;

    TestBed.configureTestingModule({
      providers: [
        OrganisationDashboardService,
        {
          provide: OrganisationDashboardDataAccessService,
          useValue: dataAccessMock,
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

  describe('selectEmployee', () => {
    it('should set the selected user ID in dataAccess', () => {
      const user: PublicUser = {
        displayName: '',
        email: '',
        photoUrl: '',
        userId: '123',
      };
      service.selectEmployee(user);
      expect(dataAccessMock.selectedUserId()).toEqual('123');
    });
  });
});
