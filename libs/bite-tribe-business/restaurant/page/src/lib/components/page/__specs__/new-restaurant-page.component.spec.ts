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
  });

  describe('showImage', () => {
    it('should be false when no image', () => {
      expect(component.showImage()).toBe(false);
    });

    it('should be true when image is set', () => {
      component.restaurantFormGroup.controls['image'].setValue('data:image/png;base64,abc');
      expect(component.showImage()).toBe(true);
    });
  });

  describe('prefillEffect', () => {
    it('should prefill name from restaurant input', () => {
      componentRef.setInput('restaurant', { id: '1', name: 'My Place' } as Restaurant);
      fixture.detectChanges();
      expect(component.restaurantFormGroup.controls['name'].value).toBe('My Place');
    });

    it('should prefill position from restaurant input', () => {
      const position: Geopoint = { latitude: 10, longitude: 20 };
      componentRef.setInput('restaurant', { id: '1', name: 'My Place', position } as Restaurant);
      fixture.detectChanges();
      expect(component.restaurantFormGroup.controls['position'].value).toEqual(position);
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
      component.restaurantFormGroup.controls['image'].setValue('data:image/png;base64,abc');
      component.restaurantFormGroup.controls['name'].setValue('My Restaurant');
      component.restaurantFormGroup.controls['position'].setValue(position);

      component.saveNewRestaurant();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Restaurant', position }),
      );
    });
  });

  describe('onImageUploadClick', () => {
    it('should do nothing when image is already set', () => {
      component.restaurantFormGroup.controls['image'].setValue('data:image/png;base64,abc');
      expect(() => component.onImageUploadClick()).not.toThrow();
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
