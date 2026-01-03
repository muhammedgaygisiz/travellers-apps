import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ImageUploadComponent } from '../image-upload.component';
import { Camera } from '@capacitor/camera';
import { compressFile, compressPhoto } from 'image-compression';
import { getExifDataFromFile } from '../../page/utils/get-exif-data-from-file';
import { getExifDataFromPhoto } from '../../page/utils/get-exif-data-from-photo';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavController, Platform } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { imageOutline } from 'ionicons/icons';
import { ComponentRef, signal } from '@angular/core';
import { addNecessaryIcons } from 'utils';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { vi, Mock } from 'vitest';

addNecessaryIcons();

vi.mock('@capacitor/camera', () => ({
  Camera: {
    requestPermissions: vi.fn(),
    getPhoto: vi.fn(),
  },
  CameraResultType: {
    Base64: 'base64',
  },
  CameraSource: {
    Prompt: 'prompt',
  },
}));
vi.mock('image-compression');
vi.mock('heic2any', () => vi.fn());

vi.mock('../../page/utils/get-exif-data-from-file');
vi.mock('../../page/utils/get-exif-data-from-photo');

type MockFileReader = {
  readAsDataURL: Mock;
  addEventListener?: Mock;
  onload: null | (() => void);
  result: string;
  EMPTY: 0;
  LOADING: 1;
  DONE: 2;
};

describe('ImageUploadComponent', () => {
  let component: ImageUploadComponent;
  let compRef: ComponentRef<ImageUploadComponent>;
  let fixture: ComponentFixture<ImageUploadComponent>;
  let platformMock: Partial<Platform>;
  let navControllerMock: Partial<NavController>;
  let mockEmit: Mock;
  let originalConsoleError: typeof console.error;

  beforeEach(async () => {
    platformMock = {
      is: vi.fn((key: string) => key === 'web'),
    };
    navControllerMock = {
      navigateForward: vi.fn(),
    };

    // Save original console.error and mock it
    originalConsoleError = console.error;
    vi.spyOn(console, 'error').mockImplementation(() => {
      console.log('error was thrown in test suite');
    });

    addIcons({ imageOutline });

    await TestBed.configureTestingModule({
      imports: [ImageUploadComponent],
      providers: [
        { provide: Platform, useValue: platformMock },
        { provide: NavController, useValue: navControllerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageUploadComponent);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;
    mockEmit = vi.fn();

    // Mock the output event emitter
    vi.spyOn(component.positionFromImage, 'emit').mockImplementation(mockEmit);

    // Mock the viewChild fileUpload
    Object.defineProperty(component, 'fileUpload', {
      value: () => ({
        nativeElement: { click: vi.fn(), value: '' },
      }),
    });

    // @ts-expect-error - Mocking FileReader
    global.FileReader = vi.fn(() => ({
      readAsDataURL: vi.fn(),
      addEventListener: vi.fn((_, cb) => cb()),
      onload: null,
      result: 'data:image/jpeg;base64,abc',
      EMPTY: 0,
      LOADING: 1,
      DONE: 2,
    }));

    component.value.set(null);
    component.disabled.set(false);
    compRef.changeDetectorRef.detectChanges();
  });

  afterEach(() => {
    console.error = originalConsoleError; // Restore original console.error
  });

  it('should call clickOnFileUploader on web', () => {
    const spy = vi.spyOn(
      component as unknown as { clickOnFileUploader: () => void },
      'clickOnFileUploader',
    );
    component.onImageUploadClick();
    expect(spy).toHaveBeenCalled();
  });

  it('should call getImageFromNative on native', async () => {
    // First create new component
    fixture = TestBed.createComponent(ImageUploadComponent);
    component = fixture.componentInstance;

    // Mock isWeb signal directly
    component.isWeb = signal(false);

    // Set up spy on the private method
    const getImageFromNativeSpy = vi.spyOn(
      component as unknown as { getImageFromNative: () => Promise<void> },
      'getImageFromNative',
    );

    // Setup other required mocks
    vi.spyOn(component.positionFromImage, 'emit').mockImplementation(mockEmit);
    Object.defineProperty(component, 'fileUpload', {
      value: () => ({
        nativeElement: { click: vi.fn(), value: '' },
      }),
    });

    compRef.changeDetectorRef.detectChanges();

    // Act
    await component.onImageUploadClick();

    // Assert
    expect(getImageFromNativeSpy).toHaveBeenCalled();
  });

  it('should emit position from file on file select', async () => {
    const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
    (getExifDataFromFile as Mock).mockResolvedValue({
      latitude: 1,
      longitude: 2,
    });
    (compressFile as Mock).mockResolvedValue(file);

    const event = {
      target: { files: [file] },
    } as unknown as Event;

    await component.onFileSelected(event);
    expect(getExifDataFromFile).toHaveBeenCalledWith(file, undefined);
    expect(mockEmit).toHaveBeenCalledWith({ latitude: 1, longitude: 2 });
  });

  it('should emit position from photo on native image', async () => {
    const photo = { base64String: 'abc', format: 'jpeg' };

    (Camera.requestPermissions as Mock).mockResolvedValue(undefined);
    (Camera.getPhoto as Mock).mockResolvedValue(photo);
    (getExifDataFromPhoto as Mock).mockReturnValue({
      latitude: 3,
      longitude: 4,
    });
    (compressPhoto as Mock).mockResolvedValue(
      new File(['dummy'], 'test.jpg', { type: 'image/jpeg' }),
    );

    // Mock FileReader
    const mockFileReader: MockFileReader = {
      readAsDataURL: vi.fn(),
      onload: null,
      result: 'data:image/jpeg;base64,abc',
      EMPTY: 0,
      LOADING: 1,
      DONE: 2,
    };

    // @ts-expect-error - Mocking FileReader
    global.FileReader = vi.fn(() => mockFileReader);

    const privateComponent = component as unknown as {
      getImageFromNative: () => Promise<void>;
    };
    await privateComponent.getImageFromNative();

    expect(Camera.requestPermissions).toHaveBeenCalled();
    expect(Camera.getPhoto).toHaveBeenCalled();
    expect(getExifDataFromPhoto).toHaveBeenCalledWith(photo, undefined);
    expect(mockEmit).toHaveBeenCalledWith({ latitude: 3, longitude: 4 });
  });

  it('should set value and trigger change on setValueAndTriggerChange', () => {
    const testFile = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
    const onChange = vi.fn();
    const onTouch = vi.fn();
    component._onChange = onChange;
    component._onTouch = onTouch;

    // Mock FileReader
    const mockFileReader: MockFileReader = {
      readAsDataURL: vi.fn(),
      onload: null,
      result: 'data:image/jpeg;base64,abc',
      EMPTY: 0,
      LOADING: 1,
      DONE: 2,
    };

    // @ts-expect-error - Mocking FileReader
    global.FileReader = vi.fn(() => mockFileReader);

    const privateComponent = component as any;
    privateComponent.setValueAndTriggerChange(testFile);

    // Simulate FileReader onload
    if (mockFileReader.onload) {
      mockFileReader.onload();
    }

    expect(component.value()).toBe('data:image/jpeg;base64,abc');
    expect(onChange).toHaveBeenCalledWith('data:image/jpeg;base64,abc');
    expect(onTouch).toHaveBeenCalled();
  });

  it('should clear image and emit fallback position', () => {
    component.value.set('data:image/jpeg;base64,abc');
    fixture.componentRef.setInput('position', { latitude: 5, longitude: 6 });
    component.clearImage();
    expect(component.value()).toBe(null);
    expect(mockEmit).toHaveBeenCalledWith({ latitude: 5, longitude: 6 });
  });

  it('should clear file input value on clearImage', () => {
    const fileUpload = { nativeElement: { value: 'something' } };
    Object.defineProperty(component, 'fileUpload', {
      value: () => fileUpload,
    });
    component.clearImage();
    expect(fileUpload.nativeElement.value).toBe('');
  });

  describe('onDragOver', () => {
    it('should prevent default and set isDragging to true', () => {
      const event = { preventDefault: vi.fn() } as unknown as DragEvent;
      component.onDragOver(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.isDragging()).toBe(true);
    });
  });

  describe('onDragLeave', () => {
    it('should prevent default and set isDragging to false', () => {
      const event = { preventDefault: vi.fn() } as unknown as DragEvent;
      component.onDragLeave(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.isDragging()).toBe(false);
    });
  });

  describe('onDrop', () => {
    it('should prevent default and set isDragging to false', () => {
      const event = { preventDefault: vi.fn() } as unknown as DragEvent;
      component.onDrop(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.isDragging()).toBe(false);
    });
  });

  describe('cancelCropping', () => {
    it('should dismiss crop modal', () => {
      const dismissMock = vi.fn();
      Object.defineProperty(component, 'cropModal', {
        value: () => ({
          dismiss: dismissMock,
        }),
      });

      component.cancelCropping();
      expect(dismissMock).toHaveBeenCalledWith(null, 'cancel');
    });
  });

  describe('confirmCropping', () => {
    it('should set value, trigger change, and dismiss modal on confirmCropping', () => {
      const dismissMock = vi.fn();
      Object.defineProperty(component, 'cropModal', {
        value: () => ({
          dismiss: dismissMock,
        }),
      });
      component.croppedImage.set('data:image/jpeg;base64,croppedImage');
      const onChange = vi.fn();
      const onTouch = vi.fn();
      component._onChange = onChange;
      component._onTouch = onTouch;

      component.confirmCropping();

      expect(component.value()).toBe('data:image/jpeg;base64,croppedImage');
      expect(onChange).toHaveBeenCalledWith(
        'data:image/jpeg;base64,croppedImage',
      );
      expect(onTouch).toHaveBeenCalled();
      expect(dismissMock).toHaveBeenCalledWith(null, 'confirmed');
    });
  });

  describe('onImageCrop', () => {
    it('should set croppedImage on onImageCrop', () => {
      const event = {
        base64: 'data:image/jpeg;base64,cropped',
        width: 100,
        height: 100,
      } as ImageCroppedEvent;
      component.onImageCrop(event);
      expect(component.croppedImage()).toBe('data:image/jpeg;base64,cropped');
    });
  });
});
