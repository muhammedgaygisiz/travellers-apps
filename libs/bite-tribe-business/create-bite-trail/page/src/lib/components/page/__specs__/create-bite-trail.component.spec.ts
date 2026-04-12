import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateBiteTrailComponent } from '../create-bite-trail.component';
import { IonModal, provideIonicAngular } from '@ionic/angular/standalone';
import { Bite, PublicUser } from 'model';
import { ComponentRef } from '@angular/core';
import { addNecessaryIcons } from 'utils';

jest.mock('@capacitor-firebase/firestore');

jest.mock('@capacitor/camera');
jest.mock('image-compression', () => ({
  compressFile: jest.fn(),
  compressPhoto: jest.fn(),
}));

addNecessaryIcons();

describe('CreateBiteTrailComponent', () => {
  let component: CreateBiteTrailComponent;
  let compRef: ComponentRef<CreateBiteTrailComponent>;
  let fixture: ComponentFixture<CreateBiteTrailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular()],
    });

    fixture = TestBed.createComponent(CreateBiteTrailComponent);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isBiteSelected', () => {
    it('should return true when bite id is in localSelectedBiteIds', () => {
      const bite: Bite = {
        id: 'bite-1',
        name: 'Pasta',
        image: '',
        place: 'Restaurant A',
        price: 12,
        position: { latitude: 0, longitude: 0 },
      };

      component.localSelectedBiteIds.set(['bite-1']);

      expect(component.isBiteSelected(bite)).toBe(true);
    });

    it('should return false when bite id is not in localSelectedBiteIds', () => {
      const bite: Bite = {
        id: 'bite-2',
        name: 'Pizza',
        image: '',
        place: 'Restaurant B',
        price: 10,
        position: { latitude: 0, longitude: 0 },
      };

      component.localSelectedBiteIds.set(['bite-1']);

      expect(component.isBiteSelected(bite)).toBe(false);
    });
  });

  describe('toggleBite', () => {
    it('should add bite id when not already selected', () => {
      const bite: Bite = {
        id: 'bite-1',
        name: 'Pasta',
        image: '',
        place: 'Restaurant A',
        price: 12,
        position: { latitude: 0, longitude: 0 },
      };

      component.localSelectedBiteIds.set([]);
      component.toggleBite(bite);

      expect(component.localSelectedBiteIds()).toContain('bite-1');
    });

    it('should remove bite id when already selected', () => {
      const bite: Bite = {
        id: 'bite-1',
        name: 'Pasta',
        image: '',
        place: 'Restaurant A',
        price: 12,
        position: { latitude: 0, longitude: 0 },
      };

      component.localSelectedBiteIds.set(['bite-1']);
      component.toggleBite(bite);

      expect(component.localSelectedBiteIds()).not.toContain('bite-1');
    });
  });

  describe('getEmployeeName', () => {
    beforeEach(() => {
      const employees: PublicUser[] = [
        {
          userId: 'user-1',
          displayName: 'Alice',
          email: 'alice@example.com',
          photoUrl: '',
        },
      ];
      compRef.setInput('employees', employees);
      fixture.detectChanges();
    });

    it('should return the display name for a known userId', () => {
      expect(component.getEmployeeName('user-1')).toBe('Alice');
    });

    it('should return empty string for an unknown userId', () => {
      expect(component.getEmployeeName('unknown')).toBe('');
    });

    it('should return empty string when userId is undefined', () => {
      expect(component.getEmployeeName(undefined)).toBe('');
    });
  });

  describe('selectedBites input', () => {
    it('should initialize localSelectedBiteIds from selectedBites', () => {
      const bites: Bite[] = [
        {
          id: 'bite-1',
          name: 'Pasta',
          image: '',
          place: 'Restaurant A',
          price: 12,
          position: { latitude: 0, longitude: 0 },
        },
        {
          id: 'bite-2',
          name: 'Pizza',
          image: '',
          place: 'Restaurant B',
          price: 10,
          position: { latitude: 0, longitude: 0 },
        },
      ];

      compRef.setInput('selectedBites', bites);
      fixture.detectChanges();

      expect(component.localSelectedBiteIds()).toEqual(['bite-1', 'bite-2']);
    });
  });

  describe('onCurrencySelected', () => {
    it('should update the currency form control and dismiss the modal', () => {
      const modal = {
        dismiss: jest.fn(),
      } as unknown as IonModal;

      component.onCurrencySelected('USD', modal);

      expect(component.biteTrailFormGroup.get('currency')?.value).toBe('USD');
      expect(modal.dismiss).toHaveBeenCalled();
    });
  });

  describe('saveTrail', () => {
    it('should not emit submitTrail if the form is invalid', () => {
      const submitTrailSpy = jest.fn();
      component.submitTrail.subscribe(submitTrailSpy);

      component.saveTrail();

      expect(submitTrailSpy).not.toHaveBeenCalled();
    });

    it('should emit submitTrail with correct owner data when form is valid', () => {
      const org: PublicUser = {
        userId: 'org-1',
        displayName: 'My Org',
        email: 'org@example.com',
        photoUrl: 'photo.jpg',
      };

      compRef.setInput('organisation', org);
      fixture.detectChanges();

      component.biteTrailFormGroup.patchValue({ name: 'My Trail' });
      component.localSelectedBiteIds.set(['bite-1']);

      const submitTrailSpy = jest.fn();
      component.submitTrail.subscribe(submitTrailSpy);

      component.saveTrail();

      expect(submitTrailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: 'org-1',
          ownerName: 'My Org',
          ownerImagePath: 'photo.jpg',
          name: 'My Trail',
          biteIds: ['bite-1'],
        }),
      );
    });
  });

  describe('resetImagePath', () => {
    it('should reset the imagePath form control', () => {
      component.biteTrailFormGroup
        .get('imagePath')
        ?.setValue('path/to/image.jpg');
      component.resetImagePath();
      expect(component.biteTrailFormGroup.get('imagePath')?.value).toEqual('');
    });
  });
});
