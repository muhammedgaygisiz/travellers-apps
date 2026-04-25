import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addNecessaryIcons, getIonicConfig } from 'utils';
import { ComponentRef } from '@angular/core';
import { NewRestaurantPageComponent } from '../new-restaurant-page.component';
import { Bite, Geopoint, Restaurant } from 'model';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { compressFile } from 'image-compression';

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

  describe('showImage', () => {
    it('should be false when no image', () => {
      expect(component.showImage()).toBe(false);
    });

    it('should be true when image is set', () => {
      component.restaurantFormGroup.controls['image'].setValue(
        'data:image/png;base64,abc',
      );
      expect(component.showImage()).toBe(true);
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

  describe('onImageUploadClick', () => {
    it('should do nothing when image is already set', () => {
      component.restaurantFormGroup.controls['image'].setValue(
        'data:image/png;base64,abc',
      );
      expect(() => component.onImageUploadClick()).not.toThrow();
    });

    it('should click hidden file input when image is not set', () => {
      fixture.detectChanges();
      const fileInput = fixture.nativeElement.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const clickSpy = jest.spyOn(fileInput, 'click');

      component.onImageUploadClick();

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should log an error when file upload element reference is missing', () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      (component as unknown as { fileUpload: () => undefined }).fileUpload =
        (): undefined => undefined;

      component.onImageUploadClick();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'NewRestaurantPageComponent: File upload element reference not found. Ensure the #fileUploader template reference is correctly defined.',
      );
    });
  });

  describe('onFileSelected', () => {
    it('should do nothing when no file is selected', async () => {
      await component.onFileSelected({
        target: { files: [] },
      } as unknown as Event);

      expect(compressFile).not.toHaveBeenCalled();
      expect(component.restaurantFormGroup.controls['image'].value).toBe('');
    });

    it('should compress selected file and patch image as base64', async () => {
      const file = new File(['img'], 'image.png', { type: 'image/png' });
      const originalFileReader = globalThis.FileReader;

      class MockFileReader {
        result: string | ArrayBuffer | null = 'data:image/png;base64,mocked';
        onload:
          | ((this: FileReader, ev: ProgressEvent<FileReader>) => void)
          | null = null;

        readAsDataURL(): void {
          if (this.onload) {
            this.onload.call(
              this as unknown as FileReader,
              {} as ProgressEvent<FileReader>,
            );
          }
        }
      }

      (globalThis as unknown as { FileReader: typeof FileReader }).FileReader =
        MockFileReader as unknown as typeof FileReader;

      try {
        await component.onFileSelected({
          target: { files: [file] },
        } as unknown as Event);
      } finally {
        (
          globalThis as unknown as { FileReader: typeof FileReader }
        ).FileReader = originalFileReader;
      }

      expect(compressFile).toHaveBeenCalledWith(file);
      expect(component.restaurantFormGroup.controls['image'].value).toBe(
        'data:image/png;base64,mocked',
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
