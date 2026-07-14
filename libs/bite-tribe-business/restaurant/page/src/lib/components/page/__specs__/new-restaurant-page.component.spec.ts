import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { ComponentRef } from '@angular/core';
import { NewRestaurantPageComponent } from '../new-restaurant-page.component';
import {
  Address,
  Bite,
  DaySchedule,
  Geopoint,
  PlaceDetails,
  Restaurant,
} from 'model';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

jest.mock('heic2any', () => jest.fn());
jest.mock('image-compression', () => ({
  compressFile: jest.fn((f: File) => Promise.resolve(f)),
  compressPhoto: jest.fn((p: unknown) => Promise.resolve(p)),
}));
jest.mock('leaflet');

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

describe('NewRestaurantPageComponent', () => {
  let component: NewRestaurantPageComponent;
  let fixture: ComponentFixture<NewRestaurantPageComponent>;
  let componentRef: ComponentRef<NewRestaurantPageComponent>;

  beforeEach(() => {
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(NewRestaurantPageComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isInvalid', () => {
    it('should be true when form is empty', () => {
      expect(component.isInvalid()).toBe(true);
    });

    it('should be false when form is valid', () => {
      const position: Geopoint = { latitude: 10, longitude: 20 };
      component.restaurantFormGroup.controls['image'].setValue(
        'data:image/png;base64,abc',
      );
      component.restaurantFormGroup.controls['name'].setValue('My Restaurant');
      component.restaurantFormGroup.controls['position'].setValue(position);

      expect(component.isInvalid()).toBe(false);
    });
  });

  describe('prefillEffect', () => {
    it('should prefill name from restaurant input', () => {
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'My Place',
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.restaurantFormGroup.controls['name'].value).toBe(
        'My Place',
      );
    });

    it('should prefill position from restaurant input', () => {
      const position: Geopoint = { latitude: 10, longitude: 20 };
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'My Place',
        position,
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();
      expect(component.restaurantFormGroup.controls['position'].value).toEqual(
        position,
      );
    });

    it('should prefill position from first bite when restaurant position is missing', () => {
      const bitePosition: Geopoint = { latitude: 5, longitude: 6 };
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'My Place',
        bites: [{ id: 'b1', position: bitePosition } as Bite],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.restaurantFormGroup.controls['position'].value).toEqual(
        bitePosition,
      );
    });

    it('should prefill address fields from restaurant input', () => {
      const address: Address = {
        street: 'Main Street 1',
        postcode: '10115',
        city: 'Berlin',
        country: 'Germany',
      };
      componentRef.setInput('restaurant', {
        id: '1',
        name: 'My Place',
        address,
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();

      expect(component.restaurantFormGroup.controls['street'].value).toBe(
        'Main Street 1',
      );
      expect(component.restaurantFormGroup.controls['postcode'].value).toBe(
        '10115',
      );
      expect(component.restaurantFormGroup.controls['city'].value).toBe(
        'Berlin',
      );
      expect(component.restaurantFormGroup.controls['country'].value).toBe(
        'Germany',
      );
    });
  });

  describe('addSocialMedia', () => {
    it('should add a social media link group to the links array', () => {
      expect(component.links.length).toBe(0);
      component.addSocialMedia();
      expect(component.links.length).toBe(1);
    });

    it('should add multiple social media link groups', () => {
      component.addSocialMedia();
      component.addSocialMedia();
      expect(component.links.length).toBe(2);
    });
  });

  describe('saveNewRestaurant', () => {
    it('should not emit when form is invalid', () => {
      const emitSpy = jest.spyOn(component.submitNewRestaurant, 'emit');
      component.saveNewRestaurant();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should emit restaurant when form is valid', () => {
      const emitSpy = jest.spyOn(component.submitNewRestaurant, 'emit');
      const position: Geopoint = { latitude: 10, longitude: 20 };
      component.restaurantFormGroup.controls['image'].setValue(
        'data:image/png;base64,abc',
      );
      component.restaurantFormGroup.controls['name'].setValue('My Restaurant');
      component.restaurantFormGroup.controls['position'].setValue(position);

      component.saveNewRestaurant();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Restaurant', position }),
      );
    });

    it('should emit restaurant with address when address fields are filled', () => {
      const emitSpy = jest.spyOn(component.submitNewRestaurant, 'emit');
      const position: Geopoint = { latitude: 10, longitude: 20 };
      component.restaurantFormGroup.controls['image'].setValue(
        'data:image/png;base64,abc',
      );
      component.restaurantFormGroup.controls['name'].setValue('My Restaurant');
      component.restaurantFormGroup.controls['position'].setValue(position);
      component.restaurantFormGroup.controls['street'].setValue('Main St 1');
      component.restaurantFormGroup.controls['postcode'].setValue('10115');
      component.restaurantFormGroup.controls['city'].setValue('Berlin');
      component.restaurantFormGroup.controls['country'].setValue('Germany');

      component.saveNewRestaurant();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Restaurant',
          position,
          address: {
            street: 'Main St 1',
            postcode: '10115',
            city: 'Berlin',
            country: 'Germany',
          },
        }),
      );
    });

    it('should emit restaurant with biteIds from input restaurant', () => {
      const emitSpy = jest.spyOn(component.submitNewRestaurant, 'emit');
      const position: Geopoint = { latitude: 10, longitude: 20 };

      componentRef.setInput('restaurant', {
        id: '1',
        biteIds: ['b1', 'b2'],
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();

      component.restaurantFormGroup.controls['image'].setValue(
        'data:image/png;base64,abc',
      );
      component.restaurantFormGroup.controls['name'].setValue('My Restaurant');
      component.restaurantFormGroup.controls['position'].setValue(position);

      component.saveNewRestaurant();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Restaurant',
          position,
          biteIds: ['b1', 'b2'],
        }),
      );
    });

    it('should emit restaurantCandidateId from input restaurant', () => {
      const emitSpy = jest.spyOn(component.submitNewRestaurant, 'emit');
      const position: Geopoint = { latitude: 10, longitude: 20 };

      componentRef.setInput('restaurant', {
        id: '',
        restaurantCandidateId: 'candidate-1',
      } as Restaurant);
      componentRef.changeDetectorRef.detectChanges();

      component.restaurantFormGroup.controls['image'].setValue(
        'data:image/png;base64,abc',
      );
      component.restaurantFormGroup.controls['name'].setValue('My Restaurant');
      component.restaurantFormGroup.controls['position'].setValue(position);

      component.saveNewRestaurant();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          restaurantCandidateId: 'candidate-1',
        }),
      );
    });

    it('should emit restaurant with social media links when valid links are added', () => {
      const emitSpy = jest.spyOn(component.submitNewRestaurant, 'emit');
      const position: Geopoint = { latitude: 10, longitude: 20 };
      component.restaurantFormGroup.controls['image'].setValue(
        'data:image/png;base64,abc',
      );
      component.restaurantFormGroup.controls['name'].setValue('My Restaurant');
      component.restaurantFormGroup.controls['position'].setValue(position);

      component.addSocialMedia();
      component.links.at(0).patchValue({
        network: 'instagram',
        url: 'https://instagram.com/test',
      });

      component.saveNewRestaurant();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          socialMediaLinks: [
            { network: 'instagram', url: 'https://instagram.com/test' },
          ],
        }),
      );
    });

    it('should emit empty socialMediaLinks when no links added', () => {
      const emitSpy = jest.spyOn(component.submitNewRestaurant, 'emit');
      const position: Geopoint = { latitude: 10, longitude: 20 };
      component.restaurantFormGroup.controls['image'].setValue(
        'data:image/png;base64,abc',
      );
      component.restaurantFormGroup.controls['name'].setValue('My Restaurant');
      component.restaurantFormGroup.controls['position'].setValue(position);

      component.saveNewRestaurant();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ socialMediaLinks: [] }),
      );
    });

    it('should emit restaurant with the opening hours from the editor', () => {
      const emitSpy = jest.spyOn(component.submitNewRestaurant, 'emit');
      const position: Geopoint = { latitude: 10, longitude: 20 };
      component.restaurantFormGroup.controls['image'].setValue(
        'data:image/png;base64,abc',
      );
      component.restaurantFormGroup.controls['name'].setValue('My Restaurant');
      component.restaurantFormGroup.controls['position'].setValue(position);

      // Seed the opening-hours editor through its input, then render so the
      // editor's form is populated. saveNewRestaurant reads it back directly —
      // no intermediate "Save opening hours" click is required.
      const hours: DaySchedule[] = [
        {
          day: 'monday',
          isOpen: true,
          timeRanges: [{ from: '09:00', to: '17:00' }],
        },
      ];
      component.openingHours.set(hours);
      componentRef.changeDetectorRef.detectChanges();

      component.saveNewRestaurant();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          openingHours: expect.arrayContaining([
            expect.objectContaining({
              day: 'monday',
              isOpen: true,
              timeRanges: [{ from: '09:00', to: '17:00' }],
            }),
          ]),
        }),
      );
    });
  });

  describe('biteClick output', () => {
    it('should emit bite when biteClick is triggered', () => {
      const emitSpy = jest.spyOn(component.biteClick, 'emit');
      const bite = { id: 'b1' } as Bite;
      component.biteClick.emit(bite);
      expect(emitSpy).toHaveBeenCalledWith(bite);
    });
  });

  // Flush pending microtasks (the confirm-dialog promise chain) without
  // advancing timers, so the leaflet map redraw timer is not triggered.
  const flushMicrotasks = async (): Promise<void> => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  };

  const placeDetailsFixture = (
    overrides: Partial<PlaceDetails> = {},
  ): PlaceDetails => ({
    placeId: 'place-1',
    name: 'Google Name',
    description: 'Google About',
    address: {
      street: 'Google Street 5',
      postcode: '99999',
      city: 'Munich',
      country: 'Germany',
    },
    openingHours: [
      {
        day: 'monday',
        isOpen: true,
        timeRanges: [{ from: '09:00', to: '17:00' }],
      },
    ],
    ...overrides,
  });

  describe('openPrefillSelector', () => {
    it('opens the selector and requests places seeded with name and position', () => {
      const emitSpy = jest.spyOn(component.requestPrefillPlaces, 'emit');
      const position: Geopoint = { latitude: 10, longitude: 20 };
      component.restaurantFormGroup.controls['name'].setValue('My Place');
      component.restaurantFormGroup.controls['position'].setValue(position);

      component.openPrefillSelector();

      expect(component.isPrefillModalOpen()).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith({ name: 'My Place', position });
    });

    it('does not request places when the name is empty', () => {
      const emitSpy = jest.spyOn(component.requestPrefillPlaces, 'emit');

      component.openPrefillSelector();

      expect(component.isPrefillModalOpen()).toBe(true);
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('onGooglePlaceSelected', () => {
    it('emits the placeId and closes the modal', () => {
      const emitSpy = jest.spyOn(component.googlePlaceSelected, 'emit');
      component.isPrefillModalOpen.set(true);

      component.onGooglePlaceSelected({
        placeId: 'place-42',
        name: 'X',
        address: 'addr',
        position: { latitude: 1, longitude: 2 },
      });

      expect(emitSpy).toHaveBeenCalledWith('place-42');
      expect(component.isPrefillModalOpen()).toBe(false);
    });
  });

  describe('applying place details', () => {
    it('fills the prefillable fields on a clean form without a confirm dialog', () => {
      const alertSpy = jest.spyOn(component['alertController'], 'create');
      const details = placeDetailsFixture();

      componentRef.setInput('placeDetails', details);
      componentRef.changeDetectorRef.detectChanges();

      expect(alertSpy).not.toHaveBeenCalled();
      expect(component.restaurantFormGroup.controls['name'].value).toBe(
        'Google Name',
      );
      expect(component.restaurantFormGroup.controls['description'].value).toBe(
        'Google About',
      );
      expect(component.restaurantFormGroup.controls['street'].value).toBe(
        'Google Street 5',
      );
      expect(component.restaurantFormGroup.controls['postcode'].value).toBe(
        '99999',
      );
      expect(component.restaurantFormGroup.controls['city'].value).toBe(
        'Munich',
      );
      expect(component.restaurantFormGroup.controls['country'].value).toBe(
        'Germany',
      );
      expect(component.openingHours()).toEqual(details.openingHours);
    });

    it('never touches the position or image fields', () => {
      const position: Geopoint = { latitude: 10, longitude: 20 };
      component.restaurantFormGroup.controls['position'].setValue(position);
      component.restaurantFormGroup.controls['image'].setValue('img');

      componentRef.setInput('placeDetails', placeDetailsFixture());
      componentRef.changeDetectorRef.detectChanges();

      expect(component.restaurantFormGroup.controls['position'].value).toEqual(
        position,
      );
      expect(component.restaurantFormGroup.controls['image'].value).toBe('img');
    });

    it('leaves the About field untouched when Google returns no description', () => {
      component.restaurantFormGroup.controls['description'].patchValue(
        'Existing about',
      );

      componentRef.setInput(
        'placeDetails',
        placeDetailsFixture({ description: undefined }),
      );
      componentRef.changeDetectorRef.detectChanges();

      expect(component.restaurantFormGroup.controls['description'].value).toBe(
        'Existing about',
      );
    });

    it('shows a confirm dialog before overwriting a dirty field', async () => {
      const createSpy = jest
        .spyOn(component['alertController'], 'create')
        .mockResolvedValue({
          present: jest.fn().mockResolvedValue(undefined),
          onDidDismiss: jest.fn().mockResolvedValue({ role: 'cancel' }),
        } as never);

      component.restaurantFormGroup.controls['name'].setValue('Edited Name');
      component.restaurantFormGroup.controls['name'].markAsDirty();

      componentRef.setInput('placeDetails', placeDetailsFixture());
      componentRef.changeDetectorRef.detectChanges();
      await flushMicrotasks();

      expect(createSpy).toHaveBeenCalled();
      // Cancel role keeps the edited value.
      expect(component.restaurantFormGroup.controls['name'].value).toBe(
        'Edited Name',
      );
    });

    it('applies the details when the confirm dialog is accepted', async () => {
      jest.spyOn(component['alertController'], 'create').mockResolvedValue({
        present: jest.fn().mockResolvedValue(undefined),
        onDidDismiss: jest.fn().mockResolvedValue({ role: 'confirm' }),
      } as never);

      component.restaurantFormGroup.controls['name'].setValue('Edited Name');
      component.restaurantFormGroup.controls['name'].markAsDirty();

      componentRef.setInput('placeDetails', placeDetailsFixture());
      componentRef.changeDetectorRef.detectChanges();
      await flushMicrotasks();

      expect(component.restaurantFormGroup.controls['name'].value).toBe(
        'Google Name',
      );
    });
  });
});
