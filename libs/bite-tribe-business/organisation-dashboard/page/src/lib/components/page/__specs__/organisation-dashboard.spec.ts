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

  describe('toggleEmployee', () => {
    it('should emit employeeToggled event with the toggled employee', () => {
      const employee: PublicUser = {
        userId: 'user-1',
        displayName: 'Test User',
        email: 'test@example.com',
        photoUrl: 'photo.jpg',
      };

      const employeeToggledSpy = jest.fn();
      component.employeeToggled.subscribe(employeeToggledSpy);

      component['toggleEmployee'](employee);

      expect(employeeToggledSpy).toHaveBeenCalledWith(employee);
    });
  });

  describe('isEmployeeSelected', () => {
    it('should return true when employee is in selectedEmployeeIds', () => {
      const employee: PublicUser = {
        userId: 'user-1',
        displayName: 'Alice',
        email: 'alice@example.com',
        photoUrl: '',
      };

      compRef.setInput('selectedEmployeeIds', ['user-1']);
      fixture.detectChanges();

      expect(component['isEmployeeSelected'](employee)).toBe(true);
    });

    it('should return false when employee is not in selectedEmployeeIds', () => {
      const employee: PublicUser = {
        userId: 'user-2',
        displayName: 'Bob',
        email: 'bob@example.com',
        photoUrl: '',
      };

      compRef.setInput('selectedEmployeeIds', ['user-1']);
      fixture.detectChanges();

      expect(component['isEmployeeSelected'](employee)).toBe(false);
    });
  });

  describe('loadBitesClicked output', () => {
    it('should emit loadBitesClicked event when Load Bites button is clicked', () => {
      const loadBitesClickedSpy = jest.fn();
      component.loadBitesClicked.subscribe(loadBitesClickedSpy);

      component['onLoadBitesClicked']();

      expect(loadBitesClickedSpy).toHaveBeenCalled();
    });
  });

  describe('createBiteTrailClicked output', () => {
    it('should emit createBiteTrailClicked event when Create Bite Trail button is clicked', () => {
      const createBiteTrailClickedSpy = jest.fn();
      component.createBiteTrailClicked.subscribe(createBiteTrailClickedSpy);

      component['onCreateBiteTrailClicked']();

      expect(createBiteTrailClickedSpy).toHaveBeenCalled();
    });
  });

  describe('biteToggled output', () => {
    it('should emit biteToggled event with the toggled bite', () => {
      const bite: Bite = {
        id: 'bite-1',
        name: 'Pasta',
        image: '',
        place: 'Restaurant A',
        price: 12,
        position: { latitude: 0, longitude: 0 },
      };

      const biteToggledSpy = jest.fn();
      component.biteToggled.subscribe(biteToggledSpy);

      component['toggleBite'](bite);

      expect(biteToggledSpy).toHaveBeenCalledWith(bite);
    });
  });

  describe('isBiteSelected', () => {
    it('should return true when bite is in selectedBiteIds', () => {
      const bite: Bite = {
        id: 'bite-1',
        name: 'Pasta',
        image: '',
        place: 'Restaurant A',
        price: 12,
        position: { latitude: 0, longitude: 0 },
      };

      compRef.setInput('selectedBiteIds', ['bite-1']);
      fixture.detectChanges();

      expect(component['isBiteSelected'](bite)).toBe(true);
    });

    it('should return false when bite is not in selectedBiteIds', () => {
      const bite: Bite = {
        id: 'bite-2',
        name: 'Pizza',
        image: '',
        place: 'Restaurant B',
        price: 10,
        position: { latitude: 0, longitude: 0 },
      };

      compRef.setInput('selectedBiteIds', ['bite-1']);
      fixture.detectChanges();

      expect(component['isBiteSelected'](bite)).toBe(false);
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

    it('should show employee name in ion-note for a bite', () => {
      const employees: PublicUser[] = [
        {
          userId: 'user-1',
          displayName: 'Alice',
          email: 'alice@example.com',
          photoUrl: '',
        },
      ];
      const bites: Bite[] = [
        {
          id: 'bite-1',
          name: 'Delicious Pasta',
          image: '',
          place: 'Restaurant A',
          price: 12,
          userId: 'user-1',
          position: { latitude: 0, longitude: 0 },
        },
      ];

      compRef.setInput('employees', employees);
      compRef.setInput('bites', bites);
      fixture.detectChanges();

      const nativeElement: HTMLElement = fixture.nativeElement;
      const notes = nativeElement.querySelectorAll('ion-note');

      const noteTexts = Array.from(notes).map((n) => n.textContent?.trim());
      expect(noteTexts).toContain('Alice');
    });
  });
});
