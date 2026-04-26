import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { ComponentRef } from '@angular/core';
import { NewRestaurantPageComponent } from '../new-restaurant-page.component';
import { Bite, Geopoint, Restaurant } from 'model';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

jest.mock('heic2any', () => jest.fn());
jest.mock('image-compression', () => ({
  compressFile: jest.fn((f: File) => Promise.resolve(f)),
  compressPhoto: jest.fn((p: unknown) => Promise.resolve(p)),
}));

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
      component.restaurantFormGroup.controls['description'].setValue(
        'Description',
      );

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
      component.restaurantFormGroup.controls['description'].setValue(
        'Description',
      );

      component.saveNewRestaurant();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Restaurant', position }),
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
      component.restaurantFormGroup.controls['description'].setValue(
        'Description',
      );

      component.saveNewRestaurant();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Restaurant',
          position,
          biteIds: ['b1', 'b2'],
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
});
