import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrganisationDashboard } from '../organisation-dashboard';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Bite, PublicUser } from 'model';
import { ComponentRef } from '@angular/core';

jest.mock('localization');
jest.mock('@capacitor-firebase/firestore');

describe('OrganisationDashboard', () => {
  let component: OrganisationDashboard;
  let fixture: ComponentFixture<OrganisationDashboard>;
  let compRef: ComponentRef<OrganisationDashboard>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganisationDashboard);
    compRef = fixture.componentRef;
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('selectEmployee', () => {
    it('should emit employeeSelected event with the selected employee', () => {
      const employee: PublicUser = {
        userId: 'user-1',
        displayName: 'Test User',
        email: 'test@example.com',
        photoUrl: 'photo.jpg',
      };

      const employeeSelectedSpy = jest.fn();
      component.employeeSelected.subscribe(employeeSelectedSpy);

      component['selectEmployee'](employee);

      expect(employeeSelectedSpy).toHaveBeenCalledWith(employee);
    });
  });

  describe('employees input', () => {
    it('should render employee display names', () => {
      const employees: PublicUser[] = [
        {
          userId: 'user-1',
          displayName: 'Alice',
          email: 'alice@example.com',
          photoUrl: '',
        },
        {
          userId: 'user-2',
          displayName: 'Bob',
          email: 'bob@example.com',
          photoUrl: '',
        },
      ];

      compRef.setInput('employees', employees);
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement;
      const labels = nativeElement.querySelectorAll('ion-label');

      const displayedNames = Array.from(labels).map((l) =>
        l.textContent?.trim(),
      );
      expect(displayedNames).toContain('Alice');
      expect(displayedNames).toContain('Bob');
    });
  });

  describe('bites input', () => {
    it('should render bite names', () => {
      const bites: Bite[] = [
        {
          id: 'bite-1',
          name: 'Delicious Pasta',
          image: '',
          place: 'Restaurant A',
          price: 12,
          position: { latitude: 0, longitude: 0 },
        },
      ];

      compRef.setInput('bites', bites);
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement;
      const labels = nativeElement.querySelectorAll('ion-label');

      const displayedNames = Array.from(labels).map((l) =>
        l.textContent?.trim(),
      );
      expect(displayedNames).toContain('Delicious Pasta');
    });
  });
});
