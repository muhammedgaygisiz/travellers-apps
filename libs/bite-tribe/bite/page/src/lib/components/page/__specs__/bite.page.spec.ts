/* eslint-disable @typescript-eslint/no-empty-function */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BitePage } from '../bite.page';
import { Platform } from '@ionic/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { provideRouter } from '@angular/router';
import { Camera } from '@capacitor/camera';
import { ComponentRef } from '@angular/core';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  imageOutline,
  pricetagOutline,
} from 'ionicons/icons';

jest.mock('@capacitor/camera');
jest.mock('image-compression', () => ({
  compressFile: jest.fn(),
  compressPhoto: jest.fn(),
}));

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

  it('should emit form value on saveBite when valid', () => {
    const validBite = {
      id: '',
      image: 'data:image/jpeg;base64,test',
      name: 'Test Burger',
      place: 'Test Place',
      tags: 'fish healthy',
      price: 9.99,
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

      expect(component.biteFormGroup.getRawValue()).toEqual({
        id: '1',
        image: 'test.jpg',
        name: 'Test Bite',
        place: 'Test Place',
        price: 10,
        rating: 0,
        currency: 'USD',
        restaurantId: '',
        tags: 'test food',
        position: { latitude: 42, longitude: 24 },
      });
    });

    it('should set currency when input is provided', () => {
      const testCurrency = 'USD';

      fixture = TestBed.createComponent(BitePage);
      component = fixture.componentInstance;
      componentRef = fixture.componentRef;
      componentRef.setInput('currency', testCurrency);
      fixture.detectChanges();

      expect(component.biteFormGroup.controls['currency'].value).toBe(
        testCurrency
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
        testPosition
      );
    });
  });

  describe('noGpsPosition signal', () => {
    it('should be true if image is valid but position is invalid', () => {
      component.biteFormGroup.controls['image'].patchValue(
        'data:image/jpeg;base64,test'
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
        'data:image/jpeg;base64,test'
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
        'data:image/jpeg;base64,test'
      );
      // Simulate no position
      componentRef.setInput('position', undefined as any);

      expect(component.getGpsErrorMessage()).toContain(
        'No GPS position found in the image'
      );
    });

    it('should return message if no image and no position', () => {
      component.biteFormGroup.controls['image'].reset();
      componentRef.setInput('position', undefined as any);

      expect(component.getGpsErrorMessage()).toContain(
        'Please choose a GPS position'
      );
    });

    it('should return empty string if position exists', () => {
      componentRef.setInput('position', { latitude: 10, longitude: 20 });

      expect(component.getGpsErrorMessage()).toBe('');
    });
  });
});
