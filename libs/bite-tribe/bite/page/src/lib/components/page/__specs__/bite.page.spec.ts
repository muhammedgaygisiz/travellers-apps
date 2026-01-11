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
import { Bite } from 'model';
import { FormGroup } from '@angular/forms';

jest.mock('@capacitor/camera');
jest.mock('image-compression', () => ({
  compressFile: jest.fn(),
  compressPhoto: jest.fn(),
}));
jest.mock('localization');
addNecessaryIcons();

describe('BitePage', () => {
  let component: BitePage;
  let componentRef: ComponentRef<BitePage>;
  let fixture: ComponentFixture<BitePage>;
  let platformMock: Partial<Platform>;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
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
      ],
    });

    fixture = TestBed.createComponent(BitePage);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    fixture.detectChanges();
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

      fixture.detectChanges();

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
      fixture.detectChanges();

      expect(component.biteFormGroup.controls['position'].value).toEqual(
        testPosition,
      );
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
        'No GPS position found in the image',
      );
    });

    it('should return message if no image and no position', () => {
      component.biteFormGroup.controls['image'].reset();
      componentRef.setInput('position', undefined as any);

      expect(component.getGpsErrorMessage()).toContain(
        'Please choose a GPS position',
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

  describe('nearbyRestaurants', () => {
    it('should return empty array when allBites is empty', () => {
      componentRef.setInput('allBites', []);
      componentRef.setInput('position', { latitude: 10, longitude: 20 });
      fixture.detectChanges();

      expect(component.nearbyRestaurants()).toEqual([]);
    });

    it('should return empty array when position is not set', () => {
      const mockBites: Bite[] = [
        {
          id: '1',
          name: 'Burger',
          place: 'Restaurant A',
          price: 10,
          distance: '0.5',
          position: { latitude: 10, longitude: 20 },
          image: '',
        } as Bite,
      ];
      componentRef.setInput('allBites', mockBites);
      componentRef.setInput('position', undefined);
      fixture.detectChanges();

      expect(component.nearbyRestaurants()).toEqual([]);
    });

    it('should filter restaurants within 1km and return unique sorted names', () => {
      const mockBites: Bite[] = [
        {
          id: '1',
          name: 'Burger',
          place: 'Restaurant B',
          price: 10,
          distance: '0.5',
          position: { latitude: 10, longitude: 20 },
          image: '',
        } as Bite,
        {
          id: '2',
          name: 'Pizza',
          place: 'Restaurant A',
          price: 12,
          distance: '0.8',
          position: { latitude: 10, longitude: 20 },
          image: '',
        } as Bite,
        {
          id: '3',
          name: 'Pasta',
          place: 'Restaurant C',
          price: 15,
          distance: '2.0',
          position: { latitude: 10, longitude: 20 },
          image: '',
        } as Bite,
        {
          id: '4',
          name: 'Salad',
          place: 'Restaurant A',
          price: 8,
          distance: '0.3',
          position: { latitude: 10, longitude: 20 },
          image: '',
        } as Bite,
      ];
      componentRef.setInput('allBites', mockBites);
      componentRef.setInput('position', { latitude: 10, longitude: 20 });
      fixture.detectChanges();

      const result = component.nearbyRestaurants();
      expect(result).toEqual(['Restaurant A', 'Restaurant B']);
      expect(result.length).toBe(2);
    });

    it('should exclude restaurants with empty or whitespace-only names', () => {
      const mockBites: Bite[] = [
        {
          id: '1',
          name: 'Burger',
          place: 'Restaurant A',
          price: 10,
          distance: '0.5',
          position: { latitude: 10, longitude: 20 },
          image: '',
        } as Bite,
        {
          id: '2',
          name: 'Pizza',
          place: '',
          price: 12,
          distance: '0.8',
          position: { latitude: 10, longitude: 20 },
          image: '',
        } as Bite,
        {
          id: '3',
          name: 'Pasta',
          place: '   ',
          price: 15,
          distance: '0.9',
          position: { latitude: 10, longitude: 20 },
          image: '',
        } as Bite,
      ];
      componentRef.setInput('allBites', mockBites);
      componentRef.setInput('position', { latitude: 10, longitude: 20 });
      fixture.detectChanges();

      const result = component.nearbyRestaurants();
      expect(result).toEqual(['Restaurant A']);
    });

    it('should handle bites without distance field', () => {
      const mockBites: Bite[] = [
        {
          id: '1',
          name: 'Burger',
          place: 'Restaurant A',
          price: 10,
          distance: undefined,
          position: { latitude: 10, longitude: 20 },
          image: '',
        } as Bite,
      ];
      componentRef.setInput('allBites', mockBites);
      componentRef.setInput('position', { latitude: 10, longitude: 20 });
      fixture.detectChanges();

      const result = component.nearbyRestaurants();
      expect(result).toEqual([]);
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
});
