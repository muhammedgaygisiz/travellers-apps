import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BitePage } from '../bite.page';
import { Platform } from '@ionic/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { provideRouter } from '@angular/router';
import { Camera } from '@capacitor/camera';
import { signal } from '@angular/core';
import * as compressFileModuleMock from 'image-compression';
import { addIcons } from 'ionicons';
import { imageOutline } from 'ionicons/icons';

jest.mock('@capacitor/camera');
jest.mock('image-compression', () => ({
  compressFile: jest.fn(),
}));

describe('BitePage', () => {
  let component: BitePage;
  let fixture: ComponentFixture<BitePage>;
  let platformMock: Partial<Platform>;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    platformMock = {
      is: jest.fn((key: string) => key === 'web'),
      backButton: {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
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
      image: 'data:image/jpeg;base64,test',
      name: 'Test Burger',
      place: 'Test Place',
      tags: 'fish healthy',
      price: 9.99,
      currency: 'EUR',
    };

    component.biteFormGroup.patchValue(validBite as any);
    expect(component.isInvalid()).toBe(false);
  });

  it('should emit form value on saveNewBite when valid', () => {
    const validBite = {
      image: 'data:image/jpeg;base64,test',
      name: 'Test Burger',
      place: 'Test Place',
      tags: 'fish healthy',
      price: 9.99,
      currency: 'EUR',
      latitude: 0,
      longitude: 0,
    };

    const emitSpy = jest.spyOn(component.submitNewBite, 'emit');
    component.biteFormGroup.patchValue(validBite as any);
    component.saveNewBite();

    expect(emitSpy).toHaveBeenCalledWith(validBite);
  });

  it('should not emit form value on saveNewBite when invalid', () => {
    const emitSpy = jest.spyOn(component.submitNewBite, 'emit');
    component.saveNewBite();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should update showImage computed value when image changes', () => {
    expect(component.showImage()).toBe(false);

    component.biteFormGroup.controls['image'].patchValue(
      'data:image/jpeg;base64,test'
    );
    expect(component.showImage()).toBe(true);
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

  describe('Image handling', () => {
    it('should handle file selection on web', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const event = { target: { files: [file] } } as unknown as Event;

      // Mock FileReader
      const result = 'data:image/jpeg;base64,test';

      const mockFileReader = {
        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-empty-function
        onload: (param: any) => {},
        // eslint-disable-next-line no-unused-vars
        readAsDataURL: function (file: Blob) {
          if (this.onload) {
            this.onload({ target: { result } });
          }
        },
        result,
      };

      global.FileReader = jest.fn(() => mockFileReader) as any;

      jest
        .spyOn(compressFileModuleMock, 'compressFile')
        .mockReturnValue(Promise.resolve(file));

      await component.onFileSelected(event);
      expect(component.biteFormGroup.controls['image'].value).toBe(
        'data:image/jpeg;base64,test'
      );
    });

    it('should handle camera capture on native', async () => {
      (platformMock.is as jest.Mock).mockReturnValue(true);
      const mockPhoto = {
        base64String: 'test',
        format: 'jpeg',
      };
      (Camera.getPhoto as jest.Mock).mockResolvedValue(mockPhoto);

      await component.takePhoto();
      expect(component.biteFormGroup.controls['image'].value).toBe(
        'data:image/jpeg;base64,test'
      );
    });

    it('should handle camera errors', async () => {
      (platformMock.is as jest.Mock).mockReturnValue(true);
      (Camera.getPhoto as jest.Mock).mockRejectedValue(
        new Error('Camera error')
      );

      await expect(component.takePhoto()).rejects.toThrow('Camera error');
    });
  });

  describe('onImageUploadClick', () => {
    it('should trigger file input click on web platform when no image', () => {
      const mockFileInput = { nativeElement: { click: jest.fn() } };
      (component as any)['fileUpload'] = signal(mockFileInput);

      component.onImageUploadClick();

      expect(mockFileInput.nativeElement.click).toHaveBeenCalled();
    });

    it('should not trigger file input click on web platform when image exists', () => {
      const mockFileInput = { nativeElement: { click: jest.fn() } };
      (component as any)['fileUpload'] = signal(mockFileInput);

      component.biteFormGroup.controls['image'].patchValue(
        'data:image/jpeg;base64,test'
      );
      component.onImageUploadClick();

      expect(mockFileInput.nativeElement.click).not.toHaveBeenCalled();
    });

    it('should trigger takePhoto on native platform when no image', async () => {
      component.isWeb = signal(false);
      const takePhotoSpy = jest.spyOn(component, 'takePhoto');

      await component.onImageUploadClick();

      expect(takePhotoSpy).toHaveBeenCalled();
    });

    it('should log error when file upload element not found on web', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      (component as any)['fileUpload'] = signal(null);

      component.onImageUploadClick();

      expect(consoleSpy).toHaveBeenCalledWith('File upload element not found');
    });
  });
});
