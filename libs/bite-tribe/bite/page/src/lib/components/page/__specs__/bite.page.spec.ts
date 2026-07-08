/* eslint-disable @typescript-eslint/no-empty-function */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BitePage } from '../bite.page';
import { Platform } from '@ionic/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { provideRouter } from '@angular/router';
import { Camera } from '@capacitor/camera';
import { ComponentRef } from '@angular/core';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  imageOutline,
  pricetagOutline,
} from 'ionicons/icons';
import type { Bite } from 'model';
import { FormGroup } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { TranslocoService } from '@jsverse/transloco';

jest.mock('leaflet');

jest.mock('@capacitor/camera');
jest.mock('image-compression', () => ({
  compressFile: jest.fn(),
  compressPhoto: jest.fn(),
}));

addNecessaryIcons();

jest.spyOn(console, 'warn').mockImplementation(() => {
  // Mock implementation
});

const assertDeepEqual = (actual: any, expected: any): void => {
  expect(actual).toEqual(expected);
};

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  getActiveLang: jest.fn(() => 'en'),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe('BitePage', () => {
  let component: BitePage;
  let componentRef: ComponentRef<BitePage>;
  let fixture: ComponentFixture<BitePage>;
  let platformMock: Partial<Platform>;
  let originalConsoleError: typeof console.error;
  let scheduler: TestScheduler;

  beforeEach(() => {
    MockTranslocoService.getActiveLang.mockReturnValue('en');
    scheduler = new TestScheduler(assertDeepEqual);
    platformMock = {
      is: jest.fn((key: string) => key === 'web'),
      backButton: {
        subscribeWithPriority: () => {},
      } as any,
    };

    // Save original console.error and mock it
    originalConsoleError = console.error;
    jest.spyOn(console, 'error').mockImplementation(() => {
      console.log('error was thrown in test suite');
    });

    addIcons({
      imageOutline,
      pricetagOutline,
      arrowBackOutline,
    });

    Camera.getPhoto = jest.fn();
    Camera.requestPermissions = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        provideRouter([]),
        { provide: Platform, useValue: platformMock },
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(BitePage);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('networkStatus', { connected: true });
    componentRef.changeDetectorRef.detectChanges();
  });

  afterEach(() => {
    console.error = originalConsoleError; // Restore original console.error
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with invalid form', () => {
    expect(component.isInvalid()).toBe(true);
  });

  describe('biteFormGroup', () => {
    it('should validate required fields', () => {
      const validBite = {
        id: '',
        image: 'data:image/jpeg;base64,test',
        name: 'Test Burger',
        place: 'Test Place',
        tags: 'fish healthy',
        price: 9.99,
        currency: 'EUR',
        position: {
          latitude: 10,
          longitude: 20,
        },
      };

      component.biteFormGroup.patchValue(validBite as any);
      expect(component.isInvalid()).toBe(false);
    });
  });

  describe('locationFromImage', () => {
    it('should return true if position in form is same as image', () => {
      const position = { latitude: 10, longitude: 20 };
      component.biteFormGroup.controls['position'].patchValue(position);
      component.imagePosition.set(position);

      expect(component.locationFromImage()).toBe(true);
    });

    it('should return false if position in form is different from image', () => {
      component.biteFormGroup.controls['position'].patchValue({
        latitude: 10,
        longitude: 20,
      });
      component.imagePosition.set({ latitude: 30, longitude: 40 });

      expect(component.locationFromImage()).toBe(false);
    });

    it('should return false if imagePosition is undefined', () => {
      component.biteFormGroup.controls['position'].patchValue({
        latitude: 10,
        longitude: 20,
      });
      component.imagePosition.set(undefined);

      expect(component.locationFromImage()).toBe(false);
    });
  });

  describe('locationFromGps', () => {
    it('should return true if position in form is same as gps position', () => {
      const position = { latitude: 10, longitude: 20 };
      component.biteFormGroup.controls['position'].patchValue(position);
      componentRef.setInput('position', position);

      expect(component.locationFromGps()).toBe(true);
    });

    it('should return false if position in form is different from gps position', () => {
      component.biteFormGroup.controls['position'].patchValue({
        latitude: 10,
        longitude: 20,
      });
      component.fallbackPosition.set({ latitude: 30, longitude: 40 });

      expect(component.locationFromGps()).toBe(false);
    });

    it('should return false if fallbackPosition is undefined', () => {
      component.biteFormGroup.controls['position'].patchValue({
        latitude: 10,
        longitude: 20,
      });
      component.fallbackPosition.set(undefined);

      expect(component.locationFromGps()).toBe(false);
    });
  });

  describe('saveBite', () => {
    it('should emit form value on saveBite when valid', () => {
      const validBite: Bite = {
        id: '',
        image: 'data:image/jpeg;base64,test',
        imagePath: '',
        description: '',
        name: 'Test Burger',
        place: 'Test Place',
        tags: ['fish healthy'],
        price: '9.99' as any,
        rating: 0,
        currency: 'EUR',
        restaurantId: '',
        position: {
          latitude: 0,
          longitude: 0,
        },
      };

      const emitSpy = jest.spyOn(component.submitBite, 'emit');
      component.biteFormGroup.patchValue(validBite as any);
      component.saveBite();

      expect(emitSpy).toHaveBeenCalledWith(validBite);
    });

    it('should not emit form value on saveBite when invalid', () => {
      const emitSpy = jest.spyOn(component.submitBite, 'emit');
      component.saveBite();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should emit form value on saveBite without image required when offline', () => {
      componentRef.setInput('networkStatus', { connected: false });
      componentRef.changeDetectorRef.detectChanges();

      const validBite: Bite = {
        id: '',
        image: '',
        imagePath: '',
        description: '',
        name: 'Test Burger',
        place: 'Test Place',
        tags: ['fish healthy'],
        price: '9.99' as any,
        rating: 0,
        currency: 'EUR',
        restaurantId: '',
        position: {
          latitude: 0,
          longitude: 0,
        },
      };

      const emitSpy = jest.spyOn(component.submitBite, 'emit');
      component.biteFormGroup.patchValue(validBite as any);
      component.saveBite();

      const { image, ...expectedBite } = validBite;
      expect(emitSpy).toHaveBeenCalledWith(expectedBite);
    });
  });

  describe('positionChange output', () => {
    it('should emit when the form position changes', () => {
      const emitSpy = jest.spyOn(component.positionChange, 'emit');
      const position = { latitude: 11.55, longitude: 104.91 };

      component.biteFormGroup.controls['position'].patchValue(position);

      expect(emitSpy).toHaveBeenCalledWith(position);
    });

    it('should not emit again for the same position', () => {
      const emitSpy = jest.spyOn(component.positionChange, 'emit');
      const position = { latitude: 1, longitude: 2 };

      component.biteFormGroup.controls['position'].patchValue(position);
      component.biteFormGroup.controls['position'].patchValue({ ...position });

      expect(emitSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Platform specific behavior', () => {
    it('should be web platform by default', () => {
      expect(component.isWeb()).toBe(true);
    });

    it('should handle native platform', () => {
      (platformMock.is as jest.Mock).mockReturnValue(true);
      fixture = TestBed.createComponent(BitePage);
      component = fixture.componentInstance;

      expect(component.isWeb()).toBe(false);
    });
  });

  describe('Initialization effects', () => {
    it('should set bite when input is provided', () => {
      const testBite = {
        id: '1',
        image: 'test.jpg',
        name: 'Test Bite',
        place: 'Test Place',
        price: 10,
        currency: 'USD',
        tags: ['test', 'food'],
        position: { latitude: 42, longitude: 24 },
      };

      fixture = TestBed.createComponent(BitePage);
      component = fixture.componentInstance;
      componentRef = fixture.componentRef;
      componentRef.setInput('bite', testBite);

      componentRef.changeDetectorRef.detectChanges();

      const expected: Bite = {
        id: '1',
        image: 'test.jpg',
        name: 'Test Bite',
        place: 'Test Place',
        price: '10' as any,
        rating: 0,
        currency: 'USD',
        restaurantId: '',
        description: '',
        tags: ['test', 'food'],
        position: { latitude: 42, longitude: 24 },
      };

      expect(component.biteFormGroup.getRawValue()).toEqual(expected);
    });

    it('should set currency when input is provided', () => {
      const testCurrency = 'USD';

      fixture = TestBed.createComponent(BitePage);
      component = fixture.componentInstance;
      componentRef = fixture.componentRef;
      componentRef.setInput('currency', testCurrency);
      fixture.detectChanges();

      expect(component.biteFormGroup.controls['currency'].value).toBe(
        testCurrency,
      );
    });

    it('should set position when input is provided', () => {
      const testPosition = { latitude: 42, longitude: 24 };

      fixture = TestBed.createComponent(BitePage);
      component = fixture.componentInstance;
      componentRef = fixture.componentRef;
      componentRef.setInput('position', testPosition);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.biteFormGroup.controls['position'].value).toEqual(
        testPosition,
      );
    });

    it('should set fallback position if position in bite is provided', () => {
      const testPosition = { latitude: 42, longitude: 24 };
      const testBite = {
        id: '1',
        image: 'test.jpg',
        name: 'Test Bite',
        place: 'Test Place',
        price: 10,
        currency: 'USD',
        tags: ['test', 'food'],
        position: testPosition,
      };

      fixture = TestBed.createComponent(BitePage);
      component = fixture.componentInstance;
      componentRef = fixture.componentRef;
      componentRef.setInput('bite', testBite);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.fallbackPosition()).toEqual(testPosition);
    });

    it('should not set fallback position if position in bite is not provided', () => {
      const testBite = {
        id: '1',
        image: 'test.jpg',
        name: 'Test Bite',
        place: 'Test Place',
        price: 10,
        currency: 'USD',
        tags: ['test', 'food'],
      };

      fixture = TestBed.createComponent(BitePage);
      component = fixture.componentInstance;
      componentRef = fixture.componentRef;
      componentRef.setInput('bite', testBite);
      fixture.detectChanges();

      expect(component.fallbackPosition()).toBeUndefined();
    });
  });

  describe('noGpsPosition signal', () => {
    it('should be true if image is valid but position is invalid', () => {
      component.biteFormGroup.controls['image'].patchValue(
        'data:image/jpeg;base64,test',
      );
      component.biteFormGroup.controls['position'].reset();

      expect(component.noGpsPosition()).toBe(true);
    });

    it('should be true if position is invalid', () => {
      component.biteFormGroup.controls['position'].reset();

      expect(component.noGpsPosition()).toBe(true);
    });

    it('should be false if position is valid', () => {
      component.biteFormGroup.controls['image'].patchValue(
        'data:image/jpeg;base64,test',
      );
      component.biteFormGroup.controls['position'].patchValue({
        latitude: 10,
        longitude: 20,
      });

      expect(component.noGpsPosition()).toBe(false);
    });
  });

  describe('getGpsErrorMessage signal', () => {
    it('should return message if image is chosen but no position', () => {
      component.biteFormGroup.controls['image'].patchValue(
        'data:image/jpeg;base64,test',
      );
      // Simulate no position
      componentRef.setInput('position', undefined as any);

      expect(component.getGpsErrorMessage()).toContain(
        'no-gps-position-error-message',
      );
    });

    it('should return message if no image and no position', () => {
      component.biteFormGroup.controls['image'].reset();
      componentRef.setInput('position', undefined as any);

      expect(component.getGpsErrorMessage()).toContain(
        'chose-gps-position-error-message',
      );
    });

    it('should return empty string if position exists', () => {
      componentRef.setInput('position', { latitude: 10, longitude: 20 });

      expect(component.getGpsErrorMessage()).toBe('');
    });
  });

  describe('setTags', () => {
    it('should set tags in the form group', () => {
      const tags = ['tag1', 'tag2'];
      component.setTags(tags);
      expect(component.biteFormGroup.controls['tags'].value).toEqual(tags);
    });

    it('should not set tags if control is missing', () => {
      component.biteFormGroup = new FormGroup({}) as any;
      const tags = ['tag1', 'tag2'];
      expect(() => component.setTags(tags)).not.toThrow();
    });
  });

  describe('onPositionFromImage', () => {
    it('should set position in the form group', () => {
      const position = { latitude: 10, longitude: 20 };
      component.onPositionFromImage(position);
      expect(component.biteFormGroup.controls['position'].value).toEqual(
        position,
      );
    });

    it('should set position in imagePosition', () => {
      const position = { latitude: 10, longitude: 20 };
      component.onPositionFromImage(position);
      expect(component.imagePosition()).toEqual(position);
    });

    it('should do nothing if no position provided', () => {
      component.biteFormGroup.controls['position'].reset();
      component.imagePosition.set({ latitude: 10, longitude: 20 });
      component.onPositionFromImage(undefined as any);
      expect(component.biteFormGroup.controls['position'].value).toBeNull();
      expect(component.imagePosition()).toEqual({
        latitude: 10,
        longitude: 20,
      });
    });
  });

  describe('onPositionFromNavigator', () => {
    it('should set position in the form group from input', () => {
      const position = { latitude: 30, longitude: 40 };
      componentRef.setInput('position', position);
      component.onPositionFromNavigator();
      expect(component.biteFormGroup.controls['position'].value).toEqual(
        position,
      );
    });

    it('should do nothing if no position input value', () => {
      componentRef.setInput('position', undefined as any);
      component.biteFormGroup.controls['position'].reset();
      component.onPositionFromNavigator();
      expect(component.biteFormGroup.controls['position'].value).toBeNull();
    });
  });

  describe('resetImagePath', () => {
    it('should reset imagePath control', () => {
      component.biteFormGroup.controls['imagePath'].patchValue('test/path');
      component.resetImagePath();
      expect(component.biteFormGroup.controls['imagePath'].value).toBeNull();
    });

    it('should reset imagePosition', () => {
      component.imagePosition.set({ latitude: 10, longitude: 20 });
      component.biteFormGroup.controls['imagePath'].patchValue('test/path');
      component.resetImagePath();
      expect(component.imagePosition()).toBeUndefined();
    });

    it('should do nothing if imagePath formControl is not initialized', () => {
      component.imagePosition.set({ latitude: 10, longitude: 20 });
      component.biteFormGroup = new FormGroup({}) as any;
      component.resetImagePath();
      expect(component.biteFormGroup.get('imagePath')).toBeNull();
    });
  });

  describe('onCurrencySelected', () => {
    it('should set currency in the form group and should call dismiss on modal', () => {
      const dismissSpy = jest.fn();
      component.onCurrencySelected('USD', { dismiss: dismissSpy } as any);
      expect(component.biteFormGroup.controls['currency'].value).toBe('USD');
      expect(dismissSpy).toHaveBeenCalled();
    });
  });

  describe('selectedCurrencyName', () => {
    it('should return the localized selected currency name', () => {
      MockTranslocoService.getActiveLang.mockReturnValue('de');
      fixture = TestBed.createComponent(BitePage);
      component = fixture.componentInstance;
      componentRef = fixture.componentRef;
      componentRef.setInput('networkStatus', { connected: true });
      componentRef.changeDetectorRef.detectChanges();

      component.biteFormGroup.controls['currency'].patchValue('USD');

      expect(component.selectedCurrencyName()).toBe('US-Dollar');
    });
  });

  describe('onRestaurantSelected', () => {
    it('should set place in the form group and should call dismiss on modal', () => {
      const dismissSpy = jest.fn();
      component.onRestaurantSelected('Test Restaurant', {
        dismiss: dismissSpy,
      } as any);
      expect(component.biteFormGroup.controls['place'].value).toBe(
        'Test Restaurant',
      );
      expect(dismissSpy).toHaveBeenCalled();
    });
  });

  describe('locationFromManual', () => {
    it('should return true if position in form matches confirmed manual position', () => {
      const position = { latitude: 10, longitude: 20 };
      component.biteFormGroup.controls['position'].patchValue(position);
      component.confirmedManualPosition.set(position);

      expect(component.locationFromManual()).toBe(true);
    });

    it('should return false if position in form differs from confirmed manual position', () => {
      component.biteFormGroup.controls['position'].patchValue({
        latitude: 10,
        longitude: 20,
      });
      component.confirmedManualPosition.set({ latitude: 30, longitude: 40 });

      expect(component.locationFromManual()).toBe(false);
    });

    it('should return false if confirmedManualPosition is undefined', () => {
      component.biteFormGroup.controls['position'].patchValue({
        latitude: 10,
        longitude: 20,
      });
      component.confirmedManualPosition.set(undefined);

      expect(component.locationFromManual()).toBe(false);
    });
  });

  describe('openManualPositionModal', () => {
    it('should open the manual position modal', () => {
      component.openManualPositionModal();
      expect(component.isManualPositionModalOpen()).toBe(true);
    });

    it('should initialize manualPosition with current form position', () => {
      const position = { latitude: 10, longitude: 20 };
      component.biteFormGroup.controls['position'].patchValue(position);
      component.openManualPositionModal();
      expect(component.manualPosition()).toEqual(position);
    });

    it('should set manualPosition to undefined if form has no position', () => {
      component.biteFormGroup.controls['position'].reset();
      component.openManualPositionModal();
      expect(component.manualPosition()).toBeUndefined();
    });
  });

  describe('onManualPositionSelected', () => {
    it('should set manualPosition to the selected position', () => {
      const position = { latitude: 10, longitude: 20 };
      component.onManualPositionSelected(position);
      expect(component.manualPosition()).toEqual(position);
    });
  });

  describe('confirmManualPosition', () => {
    it('should set position in the form group and confirmedManualPosition, then dismiss modal', () => {
      const position = { latitude: 10, longitude: 20 };
      const dismissSpy = jest.fn();
      component.manualPosition.set(position);
      component.confirmManualPosition({ dismiss: dismissSpy } as any);
      expect(component.biteFormGroup.controls['position'].value).toEqual(
        position,
      );
      expect(component.confirmedManualPosition()).toEqual(position);
      expect(dismissSpy).toHaveBeenCalled();
      expect(component.isManualPositionModalOpen()).toBe(false);
    });

    it('should not update form if manualPosition is undefined', () => {
      const dismissSpy = jest.fn();
      component.manualPosition.set(undefined);
      component.biteFormGroup.controls['position'].reset();
      component.confirmManualPosition({ dismiss: dismissSpy } as any);
      expect(component.biteFormGroup.controls['position'].value).toBeNull();
      expect(dismissSpy).toHaveBeenCalled();
    });
  });

  describe('cancelManualPosition', () => {
    it('should dismiss modal and close it without changing form position', () => {
      const position = { latitude: 10, longitude: 20 };
      const dismissSpy = jest.fn();
      component.biteFormGroup.controls['position'].patchValue(position);
      component.isManualPositionModalOpen.set(true);
      component.cancelManualPosition({ dismiss: dismissSpy } as any);
      expect(component.biteFormGroup.controls['position'].value).toEqual(
        position,
      );
      expect(dismissSpy).toHaveBeenCalled();
      expect(component.isManualPositionModalOpen()).toBe(false);
    });
  });

  describe('placeValueChange', () => {
    describe('given a value change on the place form control', () => {
      let valueChangeEvents$: Observable<string | null>;

      it('should emit placeChange', () => {
        scheduler.run(({ cold, expectObservable }) => {
          valueChangeEvents$ =
            component.biteFormGroup.controls['place'].valueChanges;

          const placeChangeSpy = jest.spyOn(component.placeChange, 'emit');

          // Simulate value changes
          const values = {
            a: 'Place 3',
          };

          const source$ = cold('--a--', values);
          const subscription = source$.subscribe((val) => {
            component.biteFormGroup.controls['place'].setValue(val);
          });

          expectObservable(valueChangeEvents$).toBe('--a', values);

          // Assert that placeChange was emitted with correct values
          scheduler.flush();
          expect(placeChangeSpy).toHaveBeenCalledTimes(1);
          expect(placeChangeSpy).toHaveBeenNthCalledWith(1, 'Place 3');

          subscription.unsubscribe();
        });
      });
    });

    describe('given a value change on the place form control with value undefined', () => {
      it('should not emit placeChange', () => {
        scheduler.run(({ cold, expectObservable }) => {
          const valueChangeEvents$ =
            component.biteFormGroup.controls['place'].valueChanges;

          const placeChangeSpy = jest.spyOn(component.placeChange, 'emit');

          // Simulate value changes
          const values = {
            a: undefined,
          };

          const source$ = cold('--a--', values);
          const subscription = source$.subscribe((val) => {
            component.biteFormGroup.controls['place'].setValue(val as any);
          });

          expectObservable(valueChangeEvents$).toBe('--a', values);

          // Assert that placeChange was not emitted
          scheduler.flush();
          expect(placeChangeSpy).not.toHaveBeenCalled();

          subscription.unsubscribe();
        });
      });
    });
  });
});
