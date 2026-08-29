import { ImageUploadComponent } from '../image-upload.component';
import { Camera, Photo } from '@capacitor/camera';
import { compressFile, compressPhoto } from 'image-compression';
import { getExifDataFromFile } from '../utils/get-exif-data-from-file';
import { getExifDataFromPhoto } from '../utils/get-exif-data-from-photo';
import { getExifDataFromFilePath } from '../utils/get-exif-data-from-file-path';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AlertController,
  NavController,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { imageOutline } from 'ionicons/icons';
import { ComponentRef, signal } from '@angular/core';
import { addNecessaryIcons } from 'utils';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

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
    pickFiles: jest.fn(),
    requestPermissions: jest.fn(),
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

type ImageUploadInternals = {
  alertController: Partial<AlertController>;
  fileUpload: () =>
    { nativeElement: Pick<HTMLInputElement, 'click' | 'value'> } | undefined;
  cropModal: () => { dismiss: jest.Mock } | undefined;
  getImageFromNative: () => Promise<void>;
  takePhotoWithCamera: () => Promise<void>;
  patchPositionFromFilePath: (filePath: string) => Promise<void>;
  setValueAndTriggerChange: (file: File) => Promise<void>;
};

const getInternals = (component: ImageUploadComponent): ImageUploadInternals =>
  component as unknown as ImageUploadInternals;

const createMockFileReader = (autoLoad = true): MockFileReader => {
  const reader: MockFileReader = {
    readAsDataURL: jest.fn(),
    onload: null,
    result: 'data:image/jpeg;base64,abc',
    EMPTY: 0,
    LOADING: 1,
    DONE: 2,
  };

  if (autoLoad) {
    reader.readAsDataURL.mockImplementation(() => {
      queueMicrotask(() => reader.onload?.());
    });
  }

  return reader;
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
        { provide: TranslocoService, useValue: MockTranslocoService },
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
    global.FileReader = jest.fn(() => createMockFileReader());

    component.value.set(null);
    component.disabled.set(false);
    compRef.changeDetectorRef.detectChanges();
  });

  afterEach(() => {
    console.error = originalConsoleError; // Restore original console.error
  });

  describe('onImageUploadClick', () => {
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
  });

  describe('onFileSelected', () => {
    describe('given an event with a file', () => {
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
        expect(getExifDataFromFile).toHaveBeenCalledWith(file);
        expect(mockEmit).toHaveBeenCalledWith({ latitude: 1, longitude: 2 });
      });
    });

    describe('given an event without a file', () => {
      it('should not emit position on file select', async () => {
        const event = {
          target: { files: [] },
        } as unknown as Event;

        await component.onFileSelected(event);
        expect(mockEmit).not.toHaveBeenCalled();
      });
    });
  });

  describe('clickOnFileUploader', () => {
    describe('given a fileUpload element', () => {
      it('should trigger click on file upload element', () => {
        const clickMock = jest.fn();
        getInternals(component).fileUpload = (): ReturnType<
          ImageUploadInternals['fileUpload']
        > => ({ nativeElement: { click: clickMock, value: '' } });

        component['clickOnFileUploader']();
        expect(clickMock).toHaveBeenCalled();
      });
    });

    describe('given no fileUpload element', () => {
      it('should log an error', () => {
        getInternals(component).fileUpload = (): ReturnType<
          ImageUploadInternals['fileUpload']
        > => undefined;

        component['clickOnFileUploader']();
        expect(console.error).toHaveBeenCalledWith(
          'File upload element not found',
        );
      });
    });
  });

  describe('getImageFromNative', () => {
    describe('when executed', () => {
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
        const mockFileReader = createMockFileReader();

        // @ts-expect-error - Mocking FileReader
        global.FileReader = jest.fn(() => mockFileReader);

        const privateComponent = component as unknown as {
          getImageFromNative: () => Promise<void>;
        };
        await privateComponent.getImageFromNative();

        expect(Camera.requestPermissions).toHaveBeenCalled();
        expect(Camera.getPhoto).toHaveBeenCalled();
        expect(getExifDataFromPhoto).toHaveBeenCalledWith(photo);
        expect(mockEmit).toHaveBeenCalledWith({ latitude: 3, longitude: 4 });
      });
    });

    describe('given an error accured', () => {
      it('should log the error', async () => {
        const error = new Error('Camera error');
        (Camera.requestPermissions as jest.Mock).mockRejectedValue(error);

        const privateComponent = component as unknown as {
          getImageFromNative: () => Promise<void>;
        };
        await expect(privateComponent.getImageFromNative()).rejects.toThrow(
          'Camera error',
        );
        expect(console.error).toHaveBeenCalledWith(
          'Error taking photo:',
          error,
        );
      });
    });
  });

  describe('showImageSourceDialog', () => {
    it('should create and present alert dialog', async () => {
      const alertMock = {
        present: jest.fn(),
        onDidDismiss: jest.fn().mockResolvedValue({ role: 'cancel' }),
      };
      alertControllerMock.create = jest.fn().mockResolvedValue(alertMock);

      getInternals(component).alertController = alertControllerMock;
      await component.showImageSourceDialog();

      expect(alertControllerMock.create).toHaveBeenCalledWith({
        header: 'choose-image-source',
        buttons: [
          {
            role: 'camera',
            text: 'take-photo',
          },
          {
            role: 'gallery',
            text: 'choose-from-gallery',
          },
          {
            role: 'cancel',
            text: 'cancel',
          },
        ],
      });
      expect(alertMock.present).toHaveBeenCalled();
      expect(alertMock.onDidDismiss).toHaveBeenCalled();
    });

    it('should start gallery processing after the dialog is dismissed', async () => {
      let resolveDismiss!: (value: { role: string }) => void;
      const alertMock = {
        present: jest.fn(),
        onDidDismiss: jest.fn(
          () =>
            new Promise<{ role: string }>((resolve) => {
              resolveDismiss = resolve;
            }),
        ),
      };
      alertControllerMock.create = jest.fn().mockResolvedValue(alertMock);
      Object.defineProperty(component, 'alertController', {
        value: alertControllerMock,
      });
      jest
        .spyOn(component, 'pickImageFromGallery')
        .mockReturnValue(new Promise(() => undefined));

      const dialog = component.showImageSourceDialog();
      await Promise.resolve();
      await Promise.resolve();

      expect(alertMock.onDidDismiss).toHaveBeenCalled();
      expect(component.pickImageFromGallery).not.toHaveBeenCalled();

      resolveDismiss({ role: 'gallery' });
      await dialog;

      expect(component.pickImageFromGallery).toHaveBeenCalled();
    });

    it('should start camera processing after the dialog is dismissed', async () => {
      const alertMock = {
        present: jest.fn(),
        onDidDismiss: jest.fn().mockResolvedValue({ role: 'camera' }),
      };
      alertControllerMock.create = jest.fn().mockResolvedValue(alertMock);
      Object.defineProperty(component, 'alertController', {
        value: alertControllerMock,
      });
      const takePhotoWithCamera = jest
        .spyOn(
          component as unknown as {
            takePhotoWithCamera: () => Promise<void>;
          },
          'takePhotoWithCamera',
        )
        .mockReturnValue(new Promise(() => undefined));

      await component.showImageSourceDialog();

      expect(alertMock.onDidDismiss).toHaveBeenCalled();
      expect(takePhotoWithCamera).toHaveBeenCalled();
    });
  });

  // Either busy state: processing the picked file, or waiting for the chosen
  // image to paint. Both render the same spinner, so the box never goes blank.
  const spinner = (): HTMLElement | null =>
    fixture.nativeElement.querySelector(
      '[data-testid="image-processing"], [data-testid="image-pending"]',
    );

  describe('loading state', () => {
    it('should spin from selecting a file until the image has painted', async () => {
      const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
      let resolveCompression!: (file: File) => void;
      (compressFile as jest.Mock).mockReturnValue(
        new Promise<File>((resolve) => {
          resolveCompression = resolve;
        }),
      );

      const processing = component.onFileSelected({
        target: { files: [file] },
      } as unknown as Event);
      fixture.detectChanges();

      expect(component.isLoading()).toBe(true);
      expect(spinner()).not.toBeNull();

      resolveCompression(file);
      await processing;
      fixture.detectChanges();

      // Processing is done, but the img has not painted yet, so the spinner
      // hands over to the pending overlay rather than exposing an empty box.
      expect(component.isLoading()).toBe(false);
      expect(component.isImagePending()).toBe(true);
      expect(spinner()).not.toBeNull();

      component.onImageLoad();
      fixture.detectChanges();

      expect(spinner()).toBeNull();
    });

    it('should show the loading state while the native picker is still resolving', async () => {
      component.isWeb.set(false);
      (Camera.requestPermissions as jest.Mock).mockResolvedValue(undefined);
      (Camera.getPhoto as jest.Mock).mockReturnValue(
        new Promise(() => undefined),
      );

      void getInternals(component).getImageFromNative();
      await Promise.resolve();
      fixture.detectChanges();

      // getPhoto only resolves once the full-resolution photo has been
      // base64-encoded and moved across the bridge, and the web view is already
      // visible by then. The box has to show progress for that whole wait.
      expect(component.isLoading()).toBe(true);
      expect(spinner()).not.toBeNull();
    });

    it('should clear the loading state when the native picker is cancelled', async () => {
      (Camera.requestPermissions as jest.Mock).mockResolvedValue(undefined);
      (Camera.getPhoto as jest.Mock).mockRejectedValue(new Error('cancelled'));

      await expect(
        getInternals(component).getImageFromNative(),
      ).rejects.toThrow('cancelled');

      expect(component.isLoading()).toBe(false);
    });

    it('should clear the loading state when processing fails', async () => {
      const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
      (compressFile as jest.Mock).mockRejectedValue(
        new Error('Compression failed'),
      );

      await expect(
        component.onFileSelected({
          target: { files: [file] },
        } as unknown as Event),
      ).rejects.toThrow('Compression failed');

      expect(component.isLoading()).toBe(false);
    });
  });

  describe('pending image state', () => {
    it('should keep the pending overlay until the image reports it has loaded', () => {
      compRef.setInput('imageUrl', 'https://example.com/profile.jpg');
      fixture.detectChanges();

      expect(component.isImagePending()).toBe(true);

      component.onImageLoad();
      fixture.detectChanges();

      expect(component.isImagePending()).toBe(false);
      expect(
        fixture.nativeElement.querySelector('[data-testid="image-pending"]'),
      ).toBeNull();
    });

    it('should not go pending again when the same image is chosen twice', () => {
      component.writeValue('data:image/jpeg;base64,abc');
      fixture.detectChanges();
      component.onImageLoad();

      // Re-picking the same photo leaves src untouched, so the img never fires
      // load again. Tracking the loaded source rather than a flag is what keeps
      // this from sticking on the skeleton forever.
      component.writeValue('data:image/jpeg;base64,abc');
      fixture.detectChanges();

      expect(component.isImagePending()).toBe(false);
    });

    it('should leave no pending state behind when the image fails', () => {
      compRef.setInput('imageUrl', 'https://example.com/missing.jpg');
      fixture.detectChanges();

      component.onImageError();
      fixture.detectChanges();

      expect(component.isImagePending()).toBe(false);
      expect(fixture.nativeElement.querySelector('ion-card')).not.toBeNull();
    });

    it('should go pending again for a newly cropped image', () => {
      component.writeValue('data:image/jpeg;base64,abc');
      component.onImageLoad();
      getInternals(component).cropModal = (): ReturnType<
        ImageUploadInternals['cropModal']
      > => ({ dismiss: jest.fn() });
      component.croppedImage.set('data:image/jpeg;base64,cropped');

      component.confirmCropping();
      fixture.detectChanges();

      expect(component.isImagePending()).toBe(true);
    });
  });

  describe('image preview errors', () => {
    it('should hide the preview when the current image source fails to load', () => {
      compRef.setInput('imageUrl', 'https://example.com/missing-profile.jpg');
      fixture.detectChanges();

      expect(component.showImage()).toBe(true);

      component.onImageError();
      fixture.detectChanges();

      expect(component.failedImageSource()).toBe(
        'https://example.com/missing-profile.jpg',
      );
      expect(component.showImage()).toBe(false);
      expect(fixture.nativeElement.querySelector('ion-card')).not.toBeNull();
    });

    it('should show the preview again when a new image value is selected', () => {
      compRef.setInput('imageUrl', 'https://example.com/missing-profile.jpg');
      fixture.detectChanges();

      component.onImageError();
      component.writeValue('data:image/jpeg;base64,new');
      fixture.detectChanges();

      expect(component.showImage()).toBe(true);
      expect(component.imageSource()).toBe('data:image/jpeg;base64,new');
    });

    it('should clear the failed source after an image loads', () => {
      compRef.setInput('imageUrl', 'https://example.com/profile.jpg');
      component.failedImageSource.set('https://example.com/profile.jpg');

      component.onImageLoad();

      expect(component.failedImageSource()).toBeNull();
      expect(component.showImage()).toBe(true);
    });
  });

  describe('readAndEmitPositionFrom', () => {
    describe('given a photo', () => {
      it('should emit position from photo', () => {
        const photo = { base64String: 'abc', format: 'jpeg' } as Photo;
        (getExifDataFromPhoto as jest.Mock).mockReturnValue({
          latitude: 7,
          longitude: 8,
        });

        component.readAndEmitPositionFrom(photo);

        expect(getExifDataFromPhoto).toHaveBeenCalledWith(photo);
        expect(mockEmit).toHaveBeenCalledWith({ latitude: 7, longitude: 8 });
      });
    });

    describe('given no exif data returned', () => {
      it('should not emit position from photo', () => {
        const photo = { base64String: 'abc', format: 'jpeg' } as Photo;
        (getExifDataFromPhoto as jest.Mock).mockReturnValue(undefined);

        component.readAndEmitPositionFrom(photo);

        expect(getExifDataFromPhoto).toHaveBeenCalledWith(photo);
        expect(mockEmit).not.toHaveBeenCalled();
      });
    });

    describe('given an error accured', () => {
      it('should handle errors when emitting position from photo', () => {
        const photo = { base64String: 'abc', format: 'jpeg' } as Photo;
        const error = new Error('EXIF error');
        (getExifDataFromPhoto as jest.Mock).mockImplementation(() => {
          throw error;
        });
        const warnSpy = jest
          .spyOn(console, 'warn')
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          .mockImplementation(() => {});

        component.readAndEmitPositionFrom(photo);

        expect(getExifDataFromPhoto).toHaveBeenCalledWith(photo);
        expect(warnSpy).toHaveBeenCalledWith(
          'Error reading GPS position from photo:',
          error,
        );
      });
    });
  });

  describe('patchPositionFromFile', () => {
    describe('given a file', () => {
      it('should emit position from file', async () => {
        const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
        (getExifDataFromFile as jest.Mock).mockResolvedValue({
          latitude: 9,
          longitude: 10,
        });

        const privateComponent = component as unknown as {
          patchPositionFromFile: (file: File | undefined) => Promise<void>;
        };
        await privateComponent.patchPositionFromFile(file);

        expect(getExifDataFromFile).toHaveBeenCalledWith(file);
        expect(mockEmit).toHaveBeenCalledWith({ latitude: 9, longitude: 10 });
      });

      it('should not emit if no EXIF data found in file', async () => {
        const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
        (getExifDataFromFile as jest.Mock).mockResolvedValue(undefined);

        const privateComponent = component as unknown as {
          patchPositionFromFile: (file: File | undefined) => Promise<void>;
        };
        await privateComponent.patchPositionFromFile(file);

        expect(getExifDataFromFile).toHaveBeenCalledWith(file);
        expect(mockEmit).not.toHaveBeenCalled();
      });

      it('should handle errors when emitting position from file', async () => {
        const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
        const error = new Error('EXIF error');
        (getExifDataFromFile as jest.Mock).mockRejectedValue(error);
        const warnSpy = jest
          .spyOn(console, 'warn')
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          .mockImplementation(() => {});

        const privateComponent = component as unknown as {
          patchPositionFromFile: (file: File | undefined) => Promise<void>;
        };
        await privateComponent.patchPositionFromFile(file);

        expect(getExifDataFromFile).toHaveBeenCalledWith(file);
        expect(warnSpy).toHaveBeenCalledWith(
          'Error reading GPS position from file:',
          error,
        );
      });
    });

    describe('given no file', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should do nothing', async () => {
        const privateComponent = component as unknown as {
          patchPositionFromFile: (file: File | undefined) => Promise<void>;
        };
        await privateComponent.patchPositionFromFile(undefined);

        expect(getExifDataFromFile).not.toHaveBeenCalled();
        expect(mockEmit).not.toHaveBeenCalled();
      });
    });
  });

  describe('readAndEmitPositionFrom', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('given a file', () => {
      it('should emit position from photo', () => {
        const photo = { base64String: 'abc', format: 'jpeg' } as Photo;
        (getExifDataFromPhoto as jest.Mock).mockReturnValue({
          latitude: 7,
          longitude: 8,
        });

        component.readAndEmitPositionFrom(photo);
        expect(getExifDataFromPhoto).toHaveBeenCalledWith(photo);
        expect(mockEmit).toHaveBeenCalledWith({ latitude: 7, longitude: 8 });
      });
    });

    describe('given file is not defined', () => {
      it('should do nothing if photo is not defined', () => {
        component.readAndEmitPositionFrom(null as unknown as Photo);
        expect(getExifDataFromPhoto).not.toHaveBeenCalled();
        expect(mockEmit).not.toHaveBeenCalled();
      });
    });

    describe('given an error', () => {
      it('should handle errors when emitting position from photo', () => {
        const photo = { base64String: 'abc', format: 'jpeg' } as Photo;
        const error = new Error('EXIF error');
        (getExifDataFromPhoto as jest.Mock).mockImplementation(() => {
          throw error;
        });

        const warnSpy = jest
          .spyOn(console, 'warn')
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          .mockImplementation(() => {});

        component.readAndEmitPositionFrom(photo);

        expect(getExifDataFromPhoto).toHaveBeenCalledWith(photo);
        expect(warnSpy).toHaveBeenCalledWith(
          'Error reading GPS position from photo:',
          error,
        );
      });
    });
  });

  describe('setValueAndTriggerChange', () => {
    it('should set value and trigger change on setValueAndTriggerChange', () => {
      const testFile = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
      const onChange = jest.fn();
      const onTouch = jest.fn();
      component._onChange = onChange;
      component._onTouch = onTouch;

      // Mock FileReader
      const mockFileReader = createMockFileReader(false);

      // @ts-expect-error - Mocking FileReader
      global.FileReader = jest.fn(() => mockFileReader);

      void getInternals(component).setValueAndTriggerChange(testFile);

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload();
      }

      expect(component.value()).toBe('data:image/jpeg;base64,abc');
      expect(onChange).toHaveBeenCalledWith('data:image/jpeg;base64,abc');
      expect(onTouch).toHaveBeenCalled();
    });
  });

  describe('clearImage', () => {
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
    describe('given crop modal is defined', () => {
      it('should dismiss crop modal', () => {
        const dismissMock = jest.fn();
        getInternals(component).cropModal = (): ReturnType<
          ImageUploadInternals['cropModal']
        > => ({ dismiss: dismissMock });

        component.cancelCropping();
        expect(dismissMock).toHaveBeenCalledWith(null, 'cancel');
      });
    });

    describe('given no crop modal is undefined', () => {
      it('should do nothing', () => {
        getInternals(component).cropModal = (): ReturnType<
          ImageUploadInternals['cropModal']
        > => undefined;

        expect(() => component.cancelCropping()).not.toThrow();
      });
    });
  });

  describe('confirmCropping', () => {
    describe('given croppedImage is defined', () => {
      it('should set value, trigger change, and dismiss modal on confirmCropping', () => {
        const dismissMock = jest.fn();
        getInternals(component).cropModal = (): ReturnType<
          ImageUploadInternals['cropModal']
        > => ({ dismiss: dismissMock });
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

    describe('given croppedImage is undefined', () => {
      it('should do nothing', () => {
        getInternals(component).cropModal = (): ReturnType<
          ImageUploadInternals['cropModal']
        > => undefined;
        component.croppedImage.set(null);

        expect(() => component.confirmCropping()).not.toThrow();
      });
    });
  });

  describe('rotateImage', () => {
    it('should rotate image by updating canvasRotation', () => {
      component.canvasRotation.set(0);
      component.rotateImage();
      expect(component.canvasRotation()).toBe(3);
      component.rotateImage();
      expect(component.canvasRotation()).toBe(2);
      component.rotateImage();
      expect(component.canvasRotation()).toBe(1);
      component.rotateImage();
      expect(component.canvasRotation()).toBe(0);
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
        const showImageSourceDialogSpy = jest
          .spyOn(component, 'showImageSourceDialog')
          .mockResolvedValue(undefined);

        await component.onImageUploadClick();

        expect(showImageSourceDialogSpy).toHaveBeenCalled();
      });

      it('should call getImageFromNative on iOS platform', async () => {
        platformMock.is = jest.fn((key: string) => {
          if (key === 'hybrid') return true;
          if (key === 'ios') return true;
          if (key === 'android') return false;
          return false;
        });
        component.isWeb.set(!platformMock.is('hybrid'));
        const getImageFromNativeSpy = jest
          .spyOn(getInternals(component), 'getImageFromNative')
          .mockResolvedValue(undefined);

        await component.onImageUploadClick();

        expect(getImageFromNativeSpy).toHaveBeenCalled();
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
        const mockFileReader = createMockFileReader();
        // @ts-expect-error - Mocking FileReader
        global.FileReader = jest.fn(() => mockFileReader);

        await getInternals(component).takePhotoWithCamera();

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

        await getInternals(component).takePhotoWithCamera();

        expect(Camera.requestPermissions).toHaveBeenCalled();
      });
    });

    describe('pickImageFromGallery', () => {
      describe('given a file was picked', () => {
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
          const mockFileReader = createMockFileReader();
          // @ts-expect-error - Mocking FileReader
          global.FileReader = jest.fn(() => mockFileReader);

          await component.pickImageFromGallery();

          expect(FilePicker.pickImages).toHaveBeenCalledWith({
            limit: 1,
            readData: true,
          });
          expect(getExifDataFromFilePath).toHaveBeenCalledWith(
            '/path/to/image.jpg',
          );
          expect(mockEmit).toHaveBeenCalledWith({
            latitude: 10,
            longitude: 20,
          });
        });
      });

      describe('given the picker is opened', () => {
        it('should not request a media permission first', async () => {
          (FilePicker.pickImages as jest.Mock).mockResolvedValue({
            files: [],
          });

          await component.pickImageFromGallery();

          // The onboarding photos step owns that request. Asking here put an OS
          // prompt between the user and their photo, and under limited access a
          // second selection step. See GitHub issue #1394.
          expect(FilePicker.requestPermissions).not.toHaveBeenCalled();
        });
      });

      describe('given picked file has no path', () => {
        it('should skip EXIF extraction if no path', async () => {
          const pickedFile = {
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

          const patchPositionFromFilePathSpy = jest.spyOn(
            getInternals(component),
            'patchPositionFromFilePath',
          );
          await component.pickImageFromGallery();

          expect(patchPositionFromFilePathSpy).not.toHaveBeenCalled();
        });
      });

      describe('given no file was picked', () => {
        it('should return early if no files are picked', async () => {
          (FilePicker.pickImages as jest.Mock).mockResolvedValue({
            files: [],
          });

          await component.pickImageFromGallery();

          expect(getExifDataFromFilePath).not.toHaveBeenCalled();
        });
      });

      describe('given an error occured', () => {
        it('should handle errors when picking image', async () => {
          const error = new Error('Picker error');
          (FilePicker.pickImages as jest.Mock).mockRejectedValue(error);

          await component.pickImageFromGallery();

          expect(FilePicker.pickImages).toHaveBeenCalled();
        });
      });

      // The pinned picker fires `ACTION_PICK`, which opens the OEM gallery app.
      // An old one answers with a `file://` URI the app cannot read, and the
      // plugin reports that as empty data rather than an error. See GitHub
      // issue #1414.
      describe('given the gallery returns an unreadable file', () => {
        const readableFile = {
          path: 'content://media/external/images/media/42',
          data: 'base64data',
          name: 'fallback.jpg',
          mimeType: 'image/jpeg',
        };

        beforeEach(() => {
          (compressFile as jest.Mock).mockResolvedValue(
            new File([''], 'image.jpg'),
          );
          global.fetch = jest.fn().mockResolvedValue({
            blob: jest.fn().mockResolvedValue(new Blob(['test'])),
          });
          const mockFileReader = createMockFileReader();
          // @ts-expect-error - Mocking FileReader
          global.FileReader = jest.fn(() => mockFileReader);
        });

        it('should retry through the document picker for a file:// path', async () => {
          (FilePicker.pickImages as jest.Mock).mockResolvedValue({
            files: [
              {
                path: 'file:///storage/emulated/0/DCIM/image.jpg',
                data: 'base64data',
                name: 'image.jpg',
                mimeType: 'image/jpeg',
              },
            ],
          });
          (FilePicker.pickFiles as jest.Mock).mockResolvedValue({
            files: [readableFile],
          });

          await component.pickImageFromGallery();

          expect(FilePicker.pickFiles).toHaveBeenCalledWith({
            types: ['image/*'],
            limit: 1,
            readData: true,
          });
          expect(getExifDataFromFilePath).toHaveBeenCalledWith(
            readableFile.path,
          );
        });

        it('should retry through the document picker when the data is empty', async () => {
          (FilePicker.pickImages as jest.Mock).mockResolvedValue({
            files: [
              {
                path: 'content://media/external/images/media/7',
                data: '',
                name: 'image.jpg',
                mimeType: 'image/jpeg',
              },
            ],
          });
          (FilePicker.pickFiles as jest.Mock).mockResolvedValue({
            files: [readableFile],
          });

          await component.pickImageFromGallery();

          expect(FilePicker.pickFiles).toHaveBeenCalled();
        });

        it('should not retry when the picked file is readable', async () => {
          (FilePicker.pickImages as jest.Mock).mockResolvedValue({
            files: [readableFile],
          });

          await component.pickImageFromGallery();

          expect(FilePicker.pickFiles).not.toHaveBeenCalled();
        });

        it('should not retry when the user cancelled the first pick', async () => {
          (FilePicker.pickImages as jest.Mock).mockResolvedValue({ files: [] });

          await component.pickImageFromGallery();

          // Cancelling is not a failed read. Reopening a picker the user just
          // dismissed would trap them in it.
          expect(FilePicker.pickFiles).not.toHaveBeenCalled();
        });
      });
    });

    describe('patchPositionFromFilePath', () => {
      it('should extract and emit EXIF data from file path', async () => {
        (getExifDataFromFilePath as jest.Mock).mockResolvedValue({
          latitude: 15,
          longitude: 25,
        });

        await getInternals(component).patchPositionFromFilePath(
          '/path/to/file.jpg',
        );

        expect(getExifDataFromFilePath).toHaveBeenCalledWith(
          '/path/to/file.jpg',
        );
        expect(mockEmit).toHaveBeenCalledWith({ latitude: 15, longitude: 25 });
      });

      it('should do nothing if exifData is undefined', async () => {
        (getExifDataFromFilePath as jest.Mock).mockResolvedValue(undefined);

        await getInternals(component).patchPositionFromFilePath(
          '/path/to/file.jpg',
        );

        expect(getExifDataFromFilePath).toHaveBeenCalledWith(
          '/path/to/file.jpg',
        );
        expect(mockEmit).not.toHaveBeenCalled();
      });

      it('should handle errors when extracting EXIF data', async () => {
        const error = new Error('EXIF error');
        (getExifDataFromFilePath as jest.Mock).mockRejectedValue(error);

        await getInternals(component).patchPositionFromFilePath(
          '/path/to/file.jpg',
        );

        expect(getExifDataFromFilePath).toHaveBeenCalled();
      });
    });
  });
});
