import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { ComponentRef } from '@angular/core';
import { NewRestaurantPageComponent } from '../new-restaurant-page.component';
import { Address, Bite, DaySchedule, Geopoint, Link, Restaurant } from 'model';
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

  describe('onOpeningHoursChange', () => {
    it('should update the openingHours signal', () => {
      const hours: DaySchedule[] = [
        {
          day: 'monday',
          isOpen: true,
          timeRanges: [{ from: '09:00', to: '17:00' }],
        },
      ];
      component.onOpeningHoursChange(hours);
      expect(component.openingHours()).toEqual(hours);
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

    it('should emit restaurant with opening hours when set', () => {
      const emitSpy = jest.spyOn(component.submitNewRestaurant, 'emit');
      const position: Geopoint = { latitude: 10, longitude: 20 };
      component.restaurantFormGroup.controls['image'].setValue(
        'data:image/png;base64,abc',
      );
      component.restaurantFormGroup.controls['name'].setValue('My Restaurant');
      component.restaurantFormGroup.controls['position'].setValue(position);

      const hours: DaySchedule[] = [
        {
          day: 'monday',
          isOpen: true,
          timeRanges: [{ from: '09:00', to: '17:00' }],
        },
      ];
      component.onOpeningHoursChange(hours);

      component.saveNewRestaurant();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ openingHours: hours }),
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
});
