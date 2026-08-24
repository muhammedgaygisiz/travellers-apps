import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateBiteTrailComponent } from '../create-bite-trail.component';
import { IonModal, provideIonicAngular } from '@ionic/angular/standalone';
import { Bite, PublicUser } from 'model';
import { ComponentRef } from '@angular/core';
import { addNecessaryIcons } from 'utils';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

jest.mock('@capacitor-firebase/firestore');

jest.mock('@capacitor/camera');
jest.mock('image-compression', () => ({
  compressFile: jest.fn(),
  compressPhoto: jest.fn(),
}));

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  getActiveLang: jest.fn(() => 'en'),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('CreateBiteTrailComponent', () => {
  let component: CreateBiteTrailComponent;
  let compRef: ComponentRef<CreateBiteTrailComponent>;
  let fixture: ComponentFixture<CreateBiteTrailComponent>;

  beforeEach(() => {
    MockTranslocoService.getActiveLang.mockReturnValue('en');
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
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

  describe('bites input', () => {
    it('should display the bites it is given without preselecting any', () => {
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

      compRef.setInput('bites', bites);
      fixture.detectChanges();

      expect(component.displayedBites()).toEqual(bites);
      expect(component.localSelectedBiteIds()).toEqual([]);
    });
  });

  describe('isInvalid', () => {
    it('should stay invalid while no Bite is selected', () => {
      component.biteTrailFormGroup.patchValue({ name: 'My Trail' });

      expect(component.isInvalid()).toBe(true);
    });

    it('should become valid once the form is filled and a Bite is selected', () => {
      component.biteTrailFormGroup.patchValue({ name: 'My Trail' });
      component.localSelectedBiteIds.set(['bite-1']);

      expect(component.isInvalid()).toBe(false);
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

  describe('selectedCurrencyName', () => {
    it('should return the localized selected currency name', () => {
      MockTranslocoService.getActiveLang.mockReturnValue('de');
      fixture = TestBed.createComponent(CreateBiteTrailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      component.biteTrailFormGroup.controls['currency'].patchValue('USD');

      expect(component.selectedCurrencyName()).toBe('US-Dollar');
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
      const owner: PublicUser = {
        userId: 'user-1',
        displayName: 'Mo',
        email: 'mo@example.com',
        photoUrl: 'photo.jpg',
      };

      compRef.setInput('owner', owner);
      fixture.detectChanges();

      component.biteTrailFormGroup.patchValue({ name: 'My Trail' });
      component.localSelectedBiteIds.set(['bite-1']);

      const submitTrailSpy = jest.fn();
      component.submitTrail.subscribe(submitTrailSpy);

      component.saveTrail();

      expect(submitTrailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: 'user-1',
          ownerName: 'Mo',
          ownerImagePath: 'photo.jpg',
          name: 'My Trail',
          biteIds: ['bite-1'],
        }),
      );
    });

    it('should emit empty owner fields while the owner has not loaded', () => {
      component.biteTrailFormGroup.patchValue({ name: 'My Trail' });
      component.localSelectedBiteIds.set(['bite-1']);

      const submitTrailSpy = jest.fn();
      component.submitTrail.subscribe(submitTrailSpy);

      component.saveTrail();

      expect(submitTrailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: '',
          ownerName: '',
          ownerImagePath: '',
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
