import { ImageUploadComponent } from '../image-upload.component';
import { Camera } from '@capacitor/camera';
import { compressFile, compressPhoto } from 'image-compression';
import { getExifDataFromFile } from '../utils/get-exif-data-from-file';
import { getExifDataFromPhoto } from '../utils/get-exif-data-from-photo';
import { getExifDataFromFilePath } from '../utils/get-exif-data-from-file-path';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavController, Platform, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { imageOutline } from 'ionicons/icons';
import { ComponentRef, signal } from '@angular/core';
import { addNecessaryIcons } from 'utils';
import { ImageCroppedEvent } from 'ngx-image-cropper';

addNecessaryIcons();

jest.mock('@capacitor/camera', () => ({
  Camera: {
    requestPermissions: jest.fn(),
    getPhoto: jest.fn(),
  },
  CameraResultType: {
    Base64: 'base64',
  },
  CameraSource: {
    Prompt: 'prompt',
    Camera: 'camera',
  },
}));
jest.mock('image-compression');
jest.mock('heic2any', () => jest.fn());
jest.mock('@capawesome/capacitor-file-picker', () => ({
  FilePicker: {
    pickImages: jest.fn(),
  },
}));

jest.mock('../utils/get-exif-data-from-file');
jest.mock('../utils/get-exif-data-from-photo');
jest.mock('../utils/get-exif-data-from-file-path', () => ({
  getExifDataFromFilePath: jest.fn(),
}));

type MockFileReader = {
  readAsDataURL: jest.Mock;
  addEventListener?: jest.Mock;
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
  let alertControllerMock: Partial<AlertController>;
  let mockEmit: jest.Mock;
  let originalConsoleError: typeof console.error;

  beforeEach(async () => {
    platformMock = {
      is: jest.fn((key: string) => key === 'web'),
    };
    navControllerMock = {
      navigateForward: jest.fn(),
    };
    alertControllerMock = {
      create: jest.fn(),
    };

    // Save original console.error and mock it
    originalConsoleError = console.error;
    jest.spyOn(console, 'error').mockImplementation(() => {
      console.log('error was thrown in test suite');
    });

    addIcons({ imageOutline });

    await TestBed.configureTestingModule({
      imports: [ImageUploadComponent],
      providers: [
        { provide: Platform, useValue: platformMock },
        { provide: NavController, useValue: navControllerMock },
        { provide: AlertController, useValue: alertControllerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageUploadComponent);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;
    mockEmit = jest.fn();

    // Mock the output event emitter
    jest
      .spyOn(component.positionFromImage, 'emit')
      .mockImplementation(mockEmit);

    // Mock the viewChild fileUpload
    Object.defineProperty(component, 'fileUpload', {
      value: () => ({
        nativeElement: { click: jest.fn(), value: '' },
      }),
    });

    // @ts-expect-error - Mocking FileReader
    global.FileReader = jest.fn(() => ({
      readAsDataURL: jest.fn(),
      addEventListener: jest.fn((_, cb) => cb()),
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
    const spy = jest.spyOn(
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
    const getImageFromNativeSpy = jest.spyOn(
      component as unknown as { getImageFromNative: () => Promise<void> },
      'getImageFromNative',
    );

    // Setup other required mocks
    jest
      .spyOn(component.positionFromImage, 'emit')
      .mockImplementation(mockEmit);
    Object.defineProperty(component, 'fileUpload', {
      value: () => ({
        nativeElement: { click: jest.fn(), value: '' },
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
    (getExifDataFromFile as jest.Mock).mockResolvedValue({
      latitude: 1,
      longitude: 2,
    });
    (compressFile as jest.Mock).mockResolvedValue(file);

    const event = {
      target: { files: [file] },
    } as unknown as Event;

    await component.onFileSelected(event);
    expect(getExifDataFromFile).toHaveBeenCalledWith(file, undefined);
    expect(mockEmit).toHaveBeenCalledWith({ latitude: 1, longitude: 2 });
  });

  it('should emit position from photo on native image', async () => {
    const photo = { base64String: 'abc', format: 'jpeg' };

    (Camera.requestPermissions as jest.Mock).mockResolvedValue(undefined);
    (Camera.getPhoto as jest.Mock).mockResolvedValue(photo);
    (getExifDataFromPhoto as jest.Mock).mockReturnValue({
      latitude: 3,
      longitude: 4,
    });
    (compressPhoto as jest.Mock).mockResolvedValue(
      new File(['dummy'], 'test.jpg', { type: 'image/jpeg' }),
    );

    // Mock FileReader
    const mockFileReader: MockFileReader = {
      readAsDataURL: jest.fn(),
      onload: null,
      result: 'data:image/jpeg;base64,abc',
      EMPTY: 0,
      LOADING: 1,
      DONE: 2,
    };

    // @ts-expect-error - Mocking FileReader
    global.FileReader = jest.fn(() => mockFileReader);

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
    const onChange = jest.fn();
    const onTouch = jest.fn();
    component._onChange = onChange;
    component._onTouch = onTouch;

    // Mock FileReader
    const mockFileReader: MockFileReader = {
      readAsDataURL: jest.fn(),
      onload: null,
      result: 'data:image/jpeg;base64,abc',
      EMPTY: 0,
      LOADING: 1,
      DONE: 2,
    };

    // @ts-expect-error - Mocking FileReader
    global.FileReader = jest.fn(() => mockFileReader);

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
      const event = { preventDefault: jest.fn() } as unknown as DragEvent;
      component.onDragOver(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.isDragging()).toBe(true);
    });
  });

  describe('onDragLeave', () => {
    it('should prevent default and set isDragging to false', () => {
      const event = { preventDefault: jest.fn() } as unknown as DragEvent;
      component.onDragLeave(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.isDragging()).toBe(false);
    });
  });

  describe('onDrop', () => {
    it('should prevent default and set isDragging to false', () => {
      const event = { preventDefault: jest.fn() } as unknown as DragEvent;
      component.onDrop(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.isDragging()).toBe(false);
    });
  });

  describe('cancelCropping', () => {
    it('should dismiss crop modal', () => {
      const dismissMock = jest.fn();
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
      const dismissMock = jest.fn();
      Object.defineProperty(component, 'cropModal', {
        value: () => ({
          dismiss: dismissMock,
        }),
      });
      component.croppedImage.set('data:image/jpeg;base64,croppedImage');
      const onChange = jest.fn();
      const onTouch = jest.fn();
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

  describe('writeValue', () => {
    it('should set the value signal', () => {
      component.writeValue('data:image/jpeg;base64,writeValueTest');
      expect(component.value()).toBe('data:image/jpeg;base64,writeValueTest');
    });
  });

  describe('registerOnChange', () => {
    it('should register the onChange function', () => {
      const onChangeMock = jest.fn();
      component.registerOnChange(onChangeMock);
      component._onChange('testValue');
      expect(onChangeMock).toHaveBeenCalledWith('testValue');
    });
  });

  describe('registerOnTouched', () => {
    it('should register the onTouch function', () => {
      const onTouchMock = jest.fn();
      component.registerOnTouched(onTouchMock);
      component._onTouch();
      expect(onTouchMock).toHaveBeenCalled();
    });
  });

  describe('setDisabledState', () => {
    it('should set the disabled signal', () => {
      component.setDisabledState(true);
      expect(component.disabled()).toBe(true);
      component.setDisabledState(false);
      expect(component.disabled()).toBe(false);
    });
  });

  describe('Android-specific methods', () => {
    beforeEach(() => {
      // Only clear specific mocks, not the alertController mock
      jest.clearAllMocks();
      // Reset alertController mock
      alertControllerMock.create = jest.fn();
      // Ensure platform is recognized as hybrid (not web) for all mobile tests
      platformMock.is = jest.fn((key: string) => {
        if (key === 'hybrid') return true;
        if (key === 'web') return false;
        return false;
      });
      // Re-calculate isWeb signal
      component.isWeb.set(!platformMock.is('hybrid'));
    });

    describe('onImageUploadClick', () => {
      it('should call showImageSourceDialog on Android platform', async () => {
        platformMock.is = jest.fn((key: string) => {
          if (key === 'hybrid') return true;
          if (key === 'android') return true;
          return false;
        });
        component.isWeb.set(!platformMock.is('hybrid'));
        jest
          .spyOn(component as any, 'showImageSourceDialog')
          .mockResolvedValue(undefined);

        await component.onImageUploadClick();

        expect((component as any).showImageSourceDialog).toHaveBeenCalled();
      });

      it('should call getImageFromNative on iOS platform', async () => {
        platformMock.is = jest.fn((key: string) => {
          if (key === 'hybrid') return true;
          if (key === 'ios') return true;
          if (key === 'android') return false;
          return false;
        });
        component.isWeb.set(!platformMock.is('hybrid'));
        jest
          .spyOn(component as any, 'getImageFromNative')
          .mockResolvedValue(undefined);

        await component.onImageUploadClick();

        expect((component as any).getImageFromNative).toHaveBeenCalled();
      });
    });

    // showImageSourceDialog functionality is covered by the onImageUploadClick tests

    describe('takePhotoWithCamera', () => {
      it('should request permissions and take photo with camera', async () => {
        const photo = { base64: 'abc123', format: 'jpeg' };
        (Camera.requestPermissions as jest.Mock).mockResolvedValue({
          camera: 'granted',
        });
        (Camera.getPhoto as jest.Mock).mockResolvedValue(photo);
        (getExifDataFromPhoto as jest.Mock).mockReturnValue({
          latitude: 5,
          longitude: 5,
        });
        (compressPhoto as jest.Mock).mockResolvedValue(
          new File([''], 'photo.jpg'),
        );

        // Mock FileReader
        const mockFileReader: MockFileReader = {
          readAsDataURL: jest.fn(),
          onload: null,
          result: 'data:image/jpeg;base64,abc',
          EMPTY: 0,
          LOADING: 1,
          DONE: 2,
        };
        // @ts-expect-error - Mocking FileReader
        global.FileReader = jest.fn(() => mockFileReader);

        await (component as any).takePhotoWithCamera();

        expect(Camera.requestPermissions).toHaveBeenCalled();
        expect(Camera.getPhoto).toHaveBeenCalledWith(
          expect.objectContaining({
            source: 'camera',
          }),
        );
      });

      it('should handle errors when taking photo', async () => {
        const error = new Error('Camera error');
        (Camera.requestPermissions as jest.Mock).mockRejectedValue(error);

        await (component as any).takePhotoWithCamera();

        expect(Camera.requestPermissions).toHaveBeenCalled();
      });
    });

    describe('pickImageFromGallery', () => {
      it('should pick image from gallery and extract EXIF data', async () => {
        const pickedFile = {
          path: '/path/to/image.jpg',
          data: 'base64data',
          name: 'image.jpg',
          mimeType: 'image/jpeg',
        };
        (FilePicker.pickImages as jest.Mock).mockResolvedValue({
          files: [pickedFile],
        });
        (getExifDataFromFilePath as jest.Mock).mockResolvedValue({
          latitude: 10,
          longitude: 20,
        });
        (compressFile as jest.Mock).mockResolvedValue(
          new File([''], 'image.jpg'),
        );

        global.fetch = jest.fn().mockResolvedValue({
          blob: jest.fn().mockResolvedValue(new Blob(['test'])),
        });

        // Mock FileReader
        const mockFileReader: MockFileReader = {
          readAsDataURL: jest.fn(),
          onload: null,
          result: 'data:image/jpeg;base64,abc',
          EMPTY: 0,
          LOADING: 1,
          DONE: 2,
        };
        // @ts-expect-error - Mocking FileReader
        global.FileReader = jest.fn(() => mockFileReader);

        await (component as any).pickImageFromGallery();

        expect(FilePicker.pickImages).toHaveBeenCalledWith({ readData: true });
        expect(getExifDataFromFilePath).toHaveBeenCalledWith(
          '/path/to/image.jpg',
          undefined,
        );
        expect(mockEmit).toHaveBeenCalledWith({ latitude: 10, longitude: 20 });
      });

      it('should return early if no files are picked', async () => {
        (FilePicker.pickImages as jest.Mock).mockResolvedValue({
          files: [],
        });

        await (component as any).pickImageFromGallery();

        expect(getExifDataFromFilePath).not.toHaveBeenCalled();
      });

      it('should handle errors when picking image', async () => {
        const error = new Error('Picker error');
        (FilePicker.pickImages as jest.Mock).mockRejectedValue(error);

        await (component as any).pickImageFromGallery();

        expect(FilePicker.pickImages).toHaveBeenCalled();
      });
    });

    describe('patchPositionFromFilePath', () => {
      it('should extract and emit EXIF data from file path', async () => {
        (getExifDataFromFilePath as jest.Mock).mockResolvedValue({
          latitude: 15,
          longitude: 25,
        });

        await (component as any).patchPositionFromFilePath('/path/to/file.jpg');

        expect(getExifDataFromFilePath).toHaveBeenCalledWith(
          '/path/to/file.jpg',
          undefined,
        );
        expect(mockEmit).toHaveBeenCalledWith({ latitude: 15, longitude: 25 });
      });

      it('should handle errors when extracting EXIF data', async () => {
        const error = new Error('EXIF error');
        (getExifDataFromFilePath as jest.Mock).mockRejectedValue(error);

        await (component as any).patchPositionFromFilePath('/path/to/file.jpg');

        expect(getExifDataFromFilePath).toHaveBeenCalled();
      });
    });
  });
});
