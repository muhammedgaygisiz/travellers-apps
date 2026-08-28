/* eslint-disable @typescript-eslint/no-empty-function */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BitePage } from '../bite.page';
import { Platform } from '@ionic/angular';
import { IonModal, provideIonicAngular } from '@ionic/angular/standalone';
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
import { FormGroup } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { TagsInputComponent } from 'common/ui/tags';
import { Observable, of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { TranslocoService } from '@jsverse/transloco';
import { POSITION_SOURCE_COLORS } from '../model/position-source';

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

type BiteFormValue = ReturnType<BitePage['biteFormGroup']['getRawValue']>;

const assertDeepEqual = (actual: unknown, expected: unknown): void => {
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
      } as unknown as Platform['backButton'],
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

  describe('titleKey', () => {
    it('should name the create page when the Bite is new', () => {
      componentRef.setInput('isNew', true);

      expect(component.titleKey()).toBe('create-bite');
    });

    it('should name the edit page when the Bite already exists', () => {
      componentRef.setInput('isNew', false);

      expect(component.titleKey()).toBe('edit-bite');
    });
  });

  describe('biteFormGroup', () => {
    it('should validate required fields', () => {
      const validBite = {
        id: '',
        image: 'data:image/jpeg;base64,test',
        name: 'Test Burger',
        place: 'Test Place',
        tags: ['fish', 'healthy'],
        price: '9.99',
        currency: 'EUR',
        position: {
          latitude: 10,
          longitude: 20,
        },
      };

      component.biteFormGroup.patchValue(validBite);
      expect(component.isInvalid()).toBe(false);
    });
  });

  describe('currentSourceLabelKey', () => {
    it('should name the source the position came from', () => {
      component.onPositionFromImage({ latitude: 10, longitude: 20 });

      expect(component.currentSourceLabelKey()).toBe('from-photo');
    });

    it('should fall back to the unknown label when no source is recorded', () => {
      component.positionSource.set(undefined);

      expect(component.currentSourceLabelKey()).toBe('position-source-unknown');
    });

    it('should report the source even when two sources share coordinates', () => {
      const position = { latitude: 10, longitude: 20 };
      componentRef.setInput('position', position);

      component.onPositionFromImage(position);

      expect(component.currentSourceLabelKey()).toBe('from-photo');
    });
  });

  // The form drew every position in the photo colour while naming a different
  // source next to it, so the two views of the same fact disagreed. See GitHub
  // issue #1325.
  describe('currentSourceColor', () => {
    it('should use the colour the modal gives the selected source', () => {
      component.onPositionFromImage({ latitude: 10, longitude: 20 });

      expect(component.currentSourceColor()).toBe(POSITION_SOURCE_COLORS.photo);
    });

    it('should follow the source when it changes', () => {
      component.positionSource.set('google');

      expect(component.currentSourceColor()).toBe(
        POSITION_SOURCE_COLORS.google,
      );
    });

    it('should leave the marker on the map default when no source is recorded', () => {
      component.positionSource.set(undefined);

      expect(component.currentSourceColor()).toBeUndefined();
    });
  });

  describe('positionCandidates', () => {
    it('should disable a source that has no position and say why', () => {
      component.imagePosition.set(undefined);

      const photo = component
        .positionCandidates()
        .find((candidate) => candidate.source === 'photo');

      expect(photo?.disabled).toBe(true);
      expect(photo?.unavailableReasonKey).toBe('no-photo-position');
    });

    it('should enable a source once it has a position', () => {
      component.imagePosition.set({ latitude: 10, longitude: 20 });

      const photo = component
        .positionCandidates()
        .find((candidate) => candidate.source === 'photo');

      expect(photo?.disabled).toBe(false);
      expect(photo?.unavailableReasonKey).toBeUndefined();
    });

    it('should keep the manual source selectable without a position', () => {
      component.confirmedManualPosition.set(undefined);

      const manual = component
        .positionCandidates()
        .find((candidate) => candidate.source === 'manual');

      expect(manual?.disabled).toBe(false);
    });

    it('should offer every source as a row', () => {
      expect(
        component.positionCandidates().map((candidate) => candidate.source),
      ).toEqual(['photo', 'gps', 'restaurant', 'google', 'manual']);
    });
  });

  describe('candidateGeopoints', () => {
    it('should carry the source in the marker id and skip empty sources', () => {
      component.imagePosition.set({ latitude: 10, longitude: 20 });
      component.googlePosition.set({ latitude: 30, longitude: 40 });
      component.restaurantPosition.set(undefined);
      component.confirmedManualPosition.set(undefined);
      componentRef.setInput('position', undefined);

      expect(component.candidateGeopoints()).toEqual([
        { id: 'photo', latitude: 10, longitude: 20 },
        { id: 'google', latitude: 30, longitude: 40 },
      ]);
    });
  });

  describe('saveBite', () => {
    it('should emit form value on saveBite when valid', () => {
      const validBite: BiteFormValue = {
        id: '',
        image: 'data:image/jpeg;base64,test',
        imagePath: '',
        description: '',
        name: 'Test Burger',
        place: 'Test Place',
        tags: ['fish healthy'],
        price: '9.99',
        rating: 0,
        currency: 'EUR',
        restaurantId: '',
        position: {
          latitude: 0,
          longitude: 0,
        },
        positionSource: null,
      };

      const emitSpy = jest.spyOn(component.submitBite, 'emit');
      component.biteFormGroup.patchValue(validBite);
      component.saveBite();

      expect(emitSpy).toHaveBeenCalledWith(validBite);
    });

    // The source has to reach the backend, not just the screen: without it a
    // Bite reopened for editing cannot say where its position came from, and
    // the photo position is gone for good once the upload strips the EXIF.
    it('should emit the source the position came from', () => {
      component.biteFormGroup.patchValue({
        id: '',
        image: 'data:image/jpeg;base64,test',
        imagePath: '',
        description: '',
        name: 'Test Burger',
        place: 'Test Place',
        tags: ['fish healthy'],
        price: '9.99',
        rating: 0,
        currency: 'EUR',
        restaurantId: '',
      });
      component.onPositionFromImage({ latitude: 10, longitude: 20 });
      componentRef.changeDetectorRef.detectChanges();

      const emitSpy = jest.spyOn(component.submitBite, 'emit');
      component.saveBite();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ positionSource: 'photo' }),
      );
    });

    // Issue #1391: a tag typed but never separated with a space stayed in the
    // field, and tapping the submit button posted the Bite without it.
    it('should emit a tag still pending in the tag field', () => {
      component.biteFormGroup.patchValue({
        id: '',
        image: 'data:image/jpeg;base64,test',
        imagePath: '',
        description: '',
        name: 'Test Burger',
        place: 'Test Place',
        tags: [],
        price: '9.99',
        rating: 0,
        currency: 'EUR',
        restaurantId: '',
        position: {
          latitude: 0,
          longitude: 0,
        },
        positionSource: null,
      });
      componentRef.changeDetectorRef.detectChanges();

      const tagsInput = fixture.debugElement.query(
        By.directive(TagsInputComponent),
      ).componentInstance as TagsInputComponent;
      tagsInput.formGroup.get('tagInput')?.setValue('run9test');

      const emitSpy = jest.spyOn(component.submitBite, 'emit');
      component.saveBite();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['run9test'] }),
      );
    });

    it('should not emit form value on saveBite when invalid', () => {
      const emitSpy = jest.spyOn(component.submitBite, 'emit');
      component.saveBite();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    // Issue #1229: the picked photo has to reach the data access layer, since
    // that is what starts the upload and puts the Bite on `imageStatus:
    // 'pending'` — without it neither the failed state nor the retry can ever
    // appear. Angular leaves disabled controls out of `FormGroup.value`, so a
    // control disabled between picking and saving must not take the photo with
    // it.
    it('should emit an image whose control was disabled after it was picked', () => {
      const validBite: BiteFormValue = {
        id: '',
        image: 'data:image/jpeg;base64,test',
        imagePath: '',
        description: '',
        name: 'Test Burger',
        place: 'Test Place',
        tags: ['fish healthy'],
        price: '9.99',
        rating: 0,
        currency: 'EUR',
        restaurantId: '',
        position: {
          latitude: 0,
          longitude: 0,
        },
        positionSource: null,
      };

      component.biteFormGroup.patchValue(validBite);
      component.biteFormGroup.controls['image'].disable();

      const emitSpy = jest.spyOn(component.submitBite, 'emit');
      component.saveBite();

      expect(emitSpy).toHaveBeenCalledWith(validBite);
    });
  });

  describe('saveBiteAndAddAnother', () => {
    let scrollToTopSpy: jest.SpyInstance;

    const validBite: BiteFormValue = {
      id: '',
      image: 'data:image/jpeg;base64,test',
      imagePath: '',
      description: 'Very tasty',
      name: 'Test Burger',
      place: 'Test Place',
      tags: ['fish', 'healthy'],
      price: '9.99',
      rating: 4,
      currency: 'CHF',
      restaurantId: 'restaurant-1',
      position: {
        latitude: 10,
        longitude: 20,
      },
      positionSource: null,
    };

    beforeEach(() => {
      const ionContent = component.ionContent();

      if (!ionContent) {
        throw new Error('ion-content not found');
      }

      scrollToTopSpy = jest
        .spyOn(ionContent, 'scrollToTop')
        .mockResolvedValue(undefined);
    });

    it('should emit the form value when valid', () => {
      const emitSpy = jest.spyOn(component.submitBiteAndAddAnother, 'emit');
      component.biteFormGroup.patchValue(validBite);

      component.saveBiteAndAddAnother();

      expect(emitSpy).toHaveBeenCalledWith(validBite);
    });

    it('should not emit when the form is invalid', () => {
      const emitSpy = jest.spyOn(component.submitBiteAndAddAnother, 'emit');

      component.saveBiteAndAddAnother();

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should reset the bite specific fields', () => {
      component.biteFormGroup.patchValue(validBite);

      component.saveBiteAndAddAnother();

      expect(component.biteFormGroup.getRawValue()).toEqual(
        expect.objectContaining({
          image: '',
          imagePath: '',
          name: '',
          description: '',
          price: null,
          rating: 0,
          tags: [],
        }),
      );
    });

    it('should keep restaurant, currency and position', () => {
      component.biteFormGroup.patchValue(validBite);

      component.saveBiteAndAddAnother();

      expect(component.biteFormGroup.getRawValue()).toEqual(
        expect.objectContaining({
          place: 'Test Place',
          restaurantId: 'restaurant-1',
          currency: 'CHF',
          position: { latitude: 10, longitude: 20 },
        }),
      );
    });

    it('should offer the tags of the posted bite as suggestions', () => {
      componentRef.setInput('suggestedTags', ['vegan']);
      component.biteFormGroup.patchValue(validBite);

      component.saveBiteAndAddAnother();

      expect(component.tagSuggestions()).toEqual(['fish', 'healthy', 'vegan']);
    });

    it('should forget the position taken from the previous image', () => {
      component.imagePosition.set({ latitude: 10, longitude: 20 });
      component.biteFormGroup.patchValue(validBite);

      component.saveBiteAndAddAnother();

      expect(component.imagePosition()).toBeUndefined();
    });

    it('should scroll the form back to the top', () => {
      component.biteFormGroup.patchValue(validBite);

      component.saveBiteAndAddAnother();

      expect(scrollToTopSpy).toHaveBeenCalledWith(300);
    });
  });

  describe('tagSuggestions', () => {
    it('should return the suggestions from the input when nothing was posted yet', () => {
      componentRef.setInput('suggestedTags', ['vegan', 'spicy']);

      expect(component.tagSuggestions()).toEqual(['vegan', 'spicy']);
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

      const expected: BiteFormValue = {
        id: '1',
        image: 'test.jpg',
        imagePath: '',
        name: 'Test Bite',
        place: 'Test Place',
        price: '10',
        rating: 0,
        currency: 'USD',
        restaurantId: '',
        description: '',
        tags: ['test', 'food'],
        position: { latitude: 42, longitude: 24 },
        // A Bite stored before the source was recorded carries none.
        positionSource: null,
      };

      expect(component.biteFormGroup.getRawValue()).toEqual(expected);
    });

    it('should restore the stored source of a Bite opened for editing', () => {
      fixture = TestBed.createComponent(BitePage);
      component = fixture.componentInstance;
      componentRef = fixture.componentRef;
      componentRef.setInput('bite', {
        id: '1',
        image: 'test.jpg',
        name: 'Test Bite',
        place: 'Test Place',
        price: 10,
        currency: 'USD',
        position: { latitude: 42, longitude: 24 },
        positionSource: 'photo',
      });

      componentRef.changeDetectorRef.detectChanges();

      expect(component.positionSource()).toBe('photo');
      expect(component.currentSourceLabelKey()).toBe('from-photo');
    });

    it('should keep imagePath a string for a prefilled draft without a photo', () => {
      fixture = TestBed.createComponent(BitePage);
      component = fixture.componentInstance;
      componentRef = fixture.componentRef;
      // The shape a menu item or a re-posted Bite seeds the form with: no photo
      // of its own. `undefined` here reaches Firestore as an unsupported value
      // and the Bite is rejected while the form reports a successful post.
      componentRef.setInput('bite', {
        name: 'Amok Trey',
        place: 'Khmer Kitchen',
        price: 8.5,
        currency: 'EUR',
        restaurantId: 'restaurant-1',
        position: { latitude: 42, longitude: 24 },
      });

      componentRef.changeDetectorRef.detectChanges();

      expect(component.biteFormGroup.controls['imagePath'].value).toBe('');
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
      componentRef.setInput('position', undefined);

      expect(component.getGpsErrorMessage()).toContain(
        'no-gps-position-error-message',
      );
    });

    it('should return message if no image and no position', () => {
      component.biteFormGroup.controls['image'].reset();
      componentRef.setInput('position', undefined);

      expect(component.getGpsErrorMessage()).toContain(
        'chose-gps-position-error-message',
      );
    });

    it('should return empty string if position exists', () => {
      componentRef.setInput('position', { latitude: 10, longitude: 20 });

      expect(component.getGpsErrorMessage()).toBe('');
    });
  });

  describe('price validation error message', () => {
    const getPriceError = (): HTMLElement | null =>
      fixture.nativeElement.querySelector(
        '.price-container > ion-text[color="danger"]',
      );

    it('should not show error message initially when untouched', () => {
      expect(getPriceError()).toBeNull();
    });

    it('should show error message when price is invalid and touched', () => {
      const priceControl = component.biteFormGroup.controls['price'];
      priceControl.setValue('Char');
      priceControl.markAsTouched();
      fixture.detectChanges();

      expect(getPriceError()).not.toBeNull();
    });

    it('should not show error message when price is valid', () => {
      const priceControl = component.biteFormGroup.controls['price'];
      priceControl.setValue('9.99');
      priceControl.markAsTouched();
      fixture.detectChanges();

      expect(getPriceError()).toBeNull();
    });
  });

  describe('setTags', () => {
    it('should set tags in the form group', () => {
      const tags = ['tag1', 'tag2'];
      component.setTags(tags);
      expect(component.biteFormGroup.controls['tags'].value).toEqual(tags);
    });

    it('should not set tags if control is missing', () => {
      component.biteFormGroup = new FormGroup(
        {},
      ) as unknown as typeof component.biteFormGroup;
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
      component.onPositionFromImage(undefined);
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
      componentRef.setInput('position', undefined);
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
      component.biteFormGroup = new FormGroup(
        {},
      ) as unknown as typeof component.biteFormGroup;
      component.resetImagePath();
      expect(component.biteFormGroup.get('imagePath')).toBeNull();
    });

    it('should stop crediting the photo once it is cleared', () => {
      componentRef.setInput('position', { latitude: 1, longitude: 2 });
      component.onPositionFromImage({ latitude: 10, longitude: 20 });

      component.resetImagePath();

      expect(component.positionSource()).toBe('gps');
    });

    it('should drop the source when there is no device position to fall back to', () => {
      componentRef.setInput('position', undefined);
      component.onPositionFromImage({ latitude: 10, longitude: 20 });

      component.resetImagePath();

      expect(component.positionSource()).toBeUndefined();
    });
  });

  describe('position source tracking', () => {
    it('should record the photo as the source when a photo position arrives', () => {
      component.onPositionFromImage({ latitude: 10, longitude: 20 });

      expect(component.positionSource()).toBe('photo');
    });

    it('should record GPS as the source when the device position is applied', () => {
      componentRef.setInput('position', { latitude: 10, longitude: 20 });

      component.onPositionFromNavigator();

      expect(component.positionSource()).toBe('gps');
    });

    it('should record the restaurant as the source and offer it as a candidate', () => {
      const position = { latitude: 12, longitude: 34 };
      componentRef.setInput('nearbyRestaurants', [
        { name: 'Test Restaurant', position },
      ]);

      component.onRestaurantSelected('Test Restaurant');

      expect(component.positionSource()).toBe('restaurant');
      expect(component.restaurantPosition()).toEqual(position);
    });

    it('should leave the source alone for a restaurant without a position', () => {
      component.onPositionFromImage({ latitude: 10, longitude: 20 });
      componentRef.setInput('nearbyRestaurants', [{ name: 'No Position' }]);

      component.onRestaurantSelected('No Position');

      expect(component.positionSource()).toBe('photo');
      expect(component.restaurantPosition()).toBeUndefined();
    });

    it('should prefill from the device fix and keep following it', () => {
      componentRef.setInput('position', { latitude: 1, longitude: 2 });
      componentRef.changeDetectorRef.detectChanges();

      componentRef.setInput('position', { latitude: 3, longitude: 4 });
      componentRef.changeDetectorRef.detectChanges();

      expect(component.biteFormGroup.controls['position'].value).toEqual({
        latitude: 3,
        longitude: 4,
      });
      expect(component.positionSource()).toBe('gps');
    });

    it('should not let a later device fix overwrite a chosen source', () => {
      const imagePosition = { latitude: 10, longitude: 20 };
      componentRef.setInput('position', { latitude: 1, longitude: 2 });
      componentRef.changeDetectorRef.detectChanges();

      component.onPositionFromImage(imagePosition);
      componentRef.setInput('position', { latitude: 3, longitude: 4 });
      componentRef.changeDetectorRef.detectChanges();

      expect(component.biteFormGroup.controls['position'].value).toEqual(
        imagePosition,
      );
      expect(component.positionSource()).toBe('photo');
    });

    it('should record Google as the source when a Google place is picked', () => {
      const position = { latitude: 12, longitude: 34 };

      component.onGooglePlaceSelected({
        placeId: 'place-1',
        name: 'Google Place',
        address: 'Main Street 1',
        position,
      });

      expect(component.positionSource()).toBe('google');
    });
  });

  describe('restaurantsNearBite', () => {
    const bern = { latitude: 46.948, longitude: 7.4474 };
    const ronda = { latitude: 36.7429, longitude: -5.1663 };

    it('should offer the local restaurants for a Bite posted where the device is', () => {
      const restaurants = [{ name: 'Tuktuk Bistro', position: bern }];
      fixture.componentRef.setInput('nearbyRestaurants', restaurants);
      component.biteFormGroup.controls['position'].patchValue(bern);

      expect(component.restaurantsNearBite()).toEqual(restaurants);
    });

    it('should offer none of them for a Bite positioned far away', () => {
      fixture.componentRef.setInput('nearbyRestaurants', [
        { name: 'Tuktuk Bistro', position: bern },
      ]);
      component.biteFormGroup.controls['position'].patchValue(ronda);

      expect(component.restaurantsNearBite()).toEqual([]);
    });

    it('should show the Google fallback only while nothing local places the Bite', () => {
      const places = [
        {
          placeId: 'place-1',
          name: 'Ronda Bistro',
          address: 'Calle Mayor 1',
          position: ronda,
        },
      ];
      fixture.componentRef.setInput('nearbyGooglePlaces', places);
      fixture.componentRef.setInput('nearbyGooglePlacesLoading', true);
      fixture.componentRef.setInput('nearbyRestaurants', [
        { name: 'Tuktuk Bistro', position: bern },
      ]);
      component.biteFormGroup.controls['position'].patchValue(ronda);

      expect(component.googleFallbackPlaces()).toEqual(places);
      expect(component.googleFallbackLoading()).toBe(true);

      // Moving the Bite back to the device makes the local list answer again,
      // so results fetched for Ronda must stop being listed.
      component.biteFormGroup.controls['position'].patchValue(bern);

      expect(component.googleFallbackPlaces()).toEqual([]);
      expect(component.googleFallbackLoading()).toBe(false);
    });
  });

  describe('onRestaurantSelected', () => {
    it('should set place in the form group and close the selector modal', () => {
      component.isRestaurantModalOpen.set(true);

      component.onRestaurantSelected('Test Restaurant');

      expect(component.biteFormGroup.controls['place'].value).toBe(
        'Test Restaurant',
      );
      expect(component.isRestaurantModalOpen()).toBe(false);
    });

    it('should patch the position of the selected restaurant', () => {
      const position = { latitude: 12, longitude: 34 };
      fixture.componentRef.setInput('nearbyRestaurants', [
        { name: 'Test Restaurant', position },
      ]);

      component.onRestaurantSelected('Test Restaurant');

      expect(component.biteFormGroup.controls['place'].value).toBe(
        'Test Restaurant',
      );
      expect(component.biteFormGroup.controls['position'].value).toEqual(
        position,
      );
    });

    it('should patch the restaurantId when a verified restaurant is selected', () => {
      fixture.componentRef.setInput('nearbyRestaurants', [
        {
          name: 'Verified Restaurant',
          position: { latitude: 12, longitude: 34 },
          restaurantId: 'restaurant-123',
        },
      ]);

      component.onRestaurantSelected('Verified Restaurant');

      expect(component.biteFormGroup.controls['restaurantId'].value).toBe(
        'restaurant-123',
      );
    });

    it('should clear the restaurantId when an unverified restaurant is selected', () => {
      component.biteFormGroup.controls['restaurantId'].patchValue('stale-id');
      fixture.componentRef.setInput('nearbyRestaurants', [
        {
          name: 'Unverified Restaurant',
          position: { latitude: 12, longitude: 34 },
        },
      ]);

      component.onRestaurantSelected('Unverified Restaurant');

      expect(component.biteFormGroup.controls['restaurantId'].value).toBe('');
    });

    it('should clear the restaurantId for a custom fallback selection', () => {
      component.biteFormGroup.controls['restaurantId'].patchValue('stale-id');

      component.onRestaurantSelected('Some Custom Place');

      expect(component.biteFormGroup.controls['restaurantId'].value).toBe('');
    });

    it('should keep the current position for a custom fallback with no match', () => {
      const currentPosition = { latitude: 1, longitude: 2 };
      component.biteFormGroup.controls['position'].patchValue(currentPosition);
      fixture.componentRef.setInput('nearbyRestaurants', [
        { name: 'Known Place', position: { latitude: 9, longitude: 9 } },
      ]);

      component.onRestaurantSelected('Some Custom Place');

      expect(component.biteFormGroup.controls['place'].value).toBe(
        'Some Custom Place',
      );
      expect(component.biteFormGroup.controls['position'].value).toEqual(
        currentPosition,
      );
    });

    it('should not patch the position of a restaurant far from the Bite', () => {
      const ronda = { latitude: 36.7429, longitude: -5.1663 };
      component.biteFormGroup.controls['position'].patchValue(ronda);
      fixture.componentRef.setInput('nearbyRestaurants', [
        {
          name: 'Tuktuk Bistro',
          position: { latitude: 46.948, longitude: 7.4474 },
          restaurantId: 'restaurant-123',
        },
      ]);

      component.onRestaurantSelected('Tuktuk Bistro');

      expect(component.biteFormGroup.controls['position'].value).toEqual(ronda);
      expect(component.biteFormGroup.controls['restaurantId'].value).toBe('');
    });
  });

  describe('onGooglePlaceSelected', () => {
    it('should patch place and position and clear the restaurantId', () => {
      component.biteFormGroup.controls['restaurantId'].patchValue('stale-id');
      const place = {
        placeId: 'place-1',
        name: 'Google Bistro',
        address: 'Main Street 1',
        position: { latitude: 5, longitude: 6 },
      };

      component.onGooglePlaceSelected(place);

      expect(component.biteFormGroup.controls['place'].value).toBe(
        'Google Bistro',
      );
      expect(component.biteFormGroup.controls['position'].value).toEqual(
        place.position,
      );
      expect(component.biteFormGroup.controls['restaurantId'].value).toBe('');
      expect(component.isRestaurantModalOpen()).toBe(false);
    });
  });

  describe('openRestaurantSelector', () => {
    it('should open the selector modal', () => {
      component.isRestaurantModalOpen.set(false);

      component.openRestaurantSelector();

      expect(component.isRestaurantModalOpen()).toBe(true);
    });

    it('should request nearby Google places when there are no local restaurants and a position exists', () => {
      const emitSpy = jest.spyOn(component.requestNearbyGooglePlaces, 'emit');
      const position = { latitude: 10, longitude: 20 };
      fixture.componentRef.setInput('nearbyRestaurants', []);
      component.biteFormGroup.controls['position'].patchValue(position);

      component.openRestaurantSelector();

      expect(emitSpy).toHaveBeenCalledWith(position);
    });

    it('should not request nearby Google places when local restaurants exist', () => {
      const emitSpy = jest.spyOn(component.requestNearbyGooglePlaces, 'emit');
      fixture.componentRef.setInput('nearbyRestaurants', [
        { name: 'Local Place', position: { latitude: 10, longitude: 20 } },
      ]);
      component.biteFormGroup.controls['position'].patchValue({
        latitude: 10,
        longitude: 20,
      });

      component.openRestaurantSelector();

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should request nearby Google places when every local restaurant is far from the Bite', () => {
      const emitSpy = jest.spyOn(component.requestNearbyGooglePlaces, 'emit');
      fixture.componentRef.setInput('nearbyRestaurants', [
        {
          name: 'Bütschelegg',
          position: { latitude: 46.948, longitude: 7.44 },
        },
        {
          name: 'Tuktuk Bistro',
          position: { latitude: 46.95, longitude: 7.45 },
        },
      ]);
      const ronda = { latitude: 36.7429, longitude: -5.1663 };
      component.biteFormGroup.controls['position'].patchValue(ronda);

      component.openRestaurantSelector();

      expect(emitSpy).toHaveBeenCalledWith(ronda);
    });

    it('should not request nearby Google places when no position is available', () => {
      const emitSpy = jest.spyOn(component.requestNearbyGooglePlaces, 'emit');
      fixture.componentRef.setInput('nearbyRestaurants', []);
      component.biteFormGroup.controls['position'].patchValue(null);

      component.openRestaurantSelector();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('openPositionSourceModal', () => {
    it('should open the modal on the source the form currently uses', () => {
      component.positionSource.set('google');

      component.openPositionSourceModal();

      expect(component.isPositionSourceModalOpen()).toBe(true);
      expect(component.draftSource()).toBe('google');
    });

    it('should open on the comparison map even when the source is manual', () => {
      component.positionSource.set('manual');
      component.confirmedManualPosition.set({ latitude: 10, longitude: 20 });

      component.openPositionSourceModal();

      expect(component.draftSource()).toBe('manual');
      expect(component.isManualDraftMode()).toBe(false);
      expect(component.draftPosition()).toEqual({
        latitude: 10,
        longitude: 20,
      });
    });

    it('should seed the manual pick with the current form position', () => {
      const position = { latitude: 10, longitude: 20 };
      component.confirmedManualPosition.set(undefined);
      component.biteFormGroup.controls['position'].patchValue(position);

      component.openPositionSourceModal();

      expect(component.manualPosition()).toEqual(position);
    });

    it('should prefer the last confirmed manual pick when seeding', () => {
      const manual = { latitude: 30, longitude: 40 };
      component.confirmedManualPosition.set(manual);
      component.biteFormGroup.controls['position'].patchValue({
        latitude: 10,
        longitude: 20,
      });

      component.openPositionSourceModal();

      expect(component.manualPosition()).toEqual(manual);
    });
  });

  describe('selectDraftSource', () => {
    it('should highlight a source without touching the form', () => {
      const position = { latitude: 10, longitude: 20 };
      component.biteFormGroup.controls['position'].patchValue(position);
      component.imagePosition.set({ latitude: 30, longitude: 40 });

      component.selectDraftSource('photo');

      expect(component.draftSource()).toBe('photo');
      expect(component.biteFormGroup.controls['position'].value).toEqual(
        position,
      );
    });

    it('should leave manual pick mode when another source is selected', () => {
      component.selectDraftSource('manual');

      component.selectDraftSource('gps');

      expect(component.isManualDraftMode()).toBe(false);
    });

    it('should start manual mode from the highlighted position', () => {
      const imagePosition = { latitude: 30, longitude: 40 };
      component.confirmedManualPosition.set(undefined);
      component.manualPosition.set(undefined);
      component.imagePosition.set(imagePosition);
      component.selectDraftSource('photo');

      component.selectDraftSource('manual');

      expect(component.isManualDraftMode()).toBe(true);
      expect(component.manualPosition()).toEqual(imagePosition);
    });
  });

  describe('onCandidateMarkerClick', () => {
    it('should select the source the marker belongs to', () => {
      component.googlePosition.set({ latitude: 10, longitude: 20 });

      component.onCandidateMarkerClick({
        id: 'google',
        latitude: 10,
        longitude: 20,
      });

      expect(component.draftSource()).toBe('google');
    });

    it('should keep the selection when the map background is tapped', () => {
      component.selectDraftSource('gps');

      component.onCandidateMarkerClick(undefined);

      expect(component.draftSource()).toBe('gps');
    });
  });

  describe('onManualPositionSelected', () => {
    it('should set manualPosition to the selected position', () => {
      const position = { latitude: 10, longitude: 20 };
      component.onManualPositionSelected(position);
      expect(component.manualPosition()).toEqual(position);
    });
  });

  describe('draftPosition', () => {
    it('should resolve the highlighted source to its position', () => {
      const googlePosition = { latitude: 10, longitude: 20 };
      component.googlePosition.set(googlePosition);
      component.selectDraftSource('google');

      expect(component.draftPosition()).toEqual(googlePosition);
    });

    it('should be empty while manual mode has no pick yet', () => {
      component.confirmedManualPosition.set(undefined);
      component.biteFormGroup.controls['position'].reset();
      component.manualPosition.set(undefined);
      component.draftSource.set('manual');

      expect(component.draftPosition()).toBeUndefined();
    });
  });

  describe('confirmPositionSource', () => {
    it('should apply the highlighted source to the form and record it', () => {
      const googlePosition = { latitude: 10, longitude: 20 };
      const dismissSpy = jest.fn();
      component.googlePosition.set(googlePosition);
      component.selectDraftSource('google');

      component.confirmPositionSource({
        dismiss: dismissSpy,
      } as unknown as IonModal);

      expect(component.biteFormGroup.controls['position'].value).toEqual(
        googlePosition,
      );
      expect(component.positionSource()).toBe('google');
      expect(dismissSpy).toHaveBeenCalled();
      expect(component.isPositionSourceModalOpen()).toBe(false);
    });

    it('should remember a manual pick so it stays offered as a candidate', () => {
      const position = { latitude: 10, longitude: 20 };
      component.manualPosition.set(position);
      component.draftSource.set('manual');

      component.confirmPositionSource({
        dismiss: jest.fn(),
      } as unknown as IonModal);

      expect(component.confirmedManualPosition()).toEqual(position);
      expect(component.positionSource()).toBe('manual');
    });

    it('should leave the form untouched when nothing is highlighted', () => {
      const dismissSpy = jest.fn();
      component.biteFormGroup.controls['position'].reset();
      component.draftSource.set(undefined);

      component.confirmPositionSource({
        dismiss: dismissSpy,
      } as unknown as IonModal);

      expect(component.biteFormGroup.controls['position'].value).toBeNull();
      expect(dismissSpy).toHaveBeenCalled();
    });
  });

  describe('closePositionSourceModal', () => {
    it('should close without changing the form position', () => {
      const position = { latitude: 10, longitude: 20 };
      component.biteFormGroup.controls['position'].patchValue(position);
      component.isPositionSourceModalOpen.set(true);

      component.closePositionSourceModal();

      expect(component.biteFormGroup.controls['position'].value).toEqual(
        position,
      );
      expect(component.isPositionSourceModalOpen()).toBe(false);
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
            component.biteFormGroup.controls['place'].setValue(
              val as unknown as string,
            );
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
