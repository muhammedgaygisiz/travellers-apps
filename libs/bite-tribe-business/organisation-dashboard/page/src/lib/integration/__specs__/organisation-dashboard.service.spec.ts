import { TestBed } from '@angular/core/testing';
import { OrganisationDashboardService } from '../organisation-dashboard.service';
import { OrganisationDashboardDataAccessService } from 'bite-tribe-business/organisation-dashboard-data-access';
import { PublicUser } from 'model';

jest.mock('bite-tribe-business/organisation-dashboard-data-access');
jest.mock('@capacitor-firebase/firestore');

describe('OrganisationDashboardService', () => {
  let service: OrganisationDashboardService;
  let dataAccessMock: jest.Mocked<OrganisationDashboardDataAccessService>;

  beforeEach(() => {
    const mockBites = { value: jest.fn().mockReturnValue([]) };
    const mockEmployees = { value: jest.fn().mockReturnValue([]) };

    dataAccessMock = {
      bites: mockBites,
      employees: mockEmployees,
      setSelectedUserId: jest.fn(),
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

  describe('selectEmployee', () => {
    it('should call setSelectedUserId with the user userId', () => {
      const employee: PublicUser = {
        userId: 'user-123',
        displayName: 'Test User',
        email: 'test@example.com',
        photoUrl: '',
      };

      service.selectEmployee(employee);

      expect(dataAccessMock.setSelectedUserId).toHaveBeenCalledWith('user-123');
    });
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
});
