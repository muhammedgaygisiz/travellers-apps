import {
  ImageUpload2Component,
  IMAGE_UPLOAD_FN,
} from '../image-upload2.component';
import { Photo } from '@capacitor/camera';
import { compressFile } from 'image-compression';
import { getExifDataFromFile } from '../utils/get-exif-data-from-file';
import { getExifDataFromPhoto } from '../utils/get-exif-data-from-photo';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  NavController,
  Platform,
  AlertController,
  LoadingController,
  ToastController,
} from '@ionic/angular';
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
    requestPermissions: jest.fn(),
  },
}));

jest.mock('../utils/get-exif-data-from-file');
jest.mock('../utils/get-exif-data-from-photo');
jest.mock('../utils/get-exif-data-from-file-path', () => ({
  getExifDataFromFilePath: jest.fn(),
}));
jest.mock('../utils/upload-image-to-storage');

describe('ImageUpload2Component', () => {
  let component: ImageUpload2Component;
  let compRef: ComponentRef<ImageUpload2Component>;
  let fixture: ComponentFixture<ImageUpload2Component>;
  let platformMock: Partial<Platform>;
  let navControllerMock: Partial<NavController>;
  let alertControllerMock: Partial<AlertController>;
  let loadingControllerMock: Partial<LoadingController>;
  let toastControllerMock: Partial<ToastController>;
  let mockEmit: jest.Mock;
  let mockUploadFn: jest.Mock;
  let loadingMock: { present: jest.Mock; dismiss: jest.Mock };

  beforeEach(async () => {
    platformMock = {
      is: jest.fn((key: string) => key === 'web'),
    };
    navControllerMock = {
      navigateForward: jest.fn(),
    };

    loadingMock = {
      present: jest.fn().mockResolvedValue(undefined),
      dismiss: jest.fn().mockResolvedValue(undefined),
    };

    alertControllerMock = {
      create: jest.fn().mockResolvedValue({
        present: jest.fn().mockResolvedValue(undefined),
      }),
    };

    loadingControllerMock = {
      create: jest.fn().mockResolvedValue(loadingMock),
    };

    toastControllerMock = {
      create: jest.fn().mockResolvedValue({
        present: jest.fn().mockResolvedValue(undefined),
      }),
    };

    mockUploadFn = jest.fn().mockResolvedValue('https://example.com/image.jpg');

    jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      console.log('error was thrown in test suite', ...args);
    });

    // @ts-expect-error - Mocking FileReader
    global.FileReader = jest.fn(() => ({
      readAsDataURL: jest.fn(function (this: {
        onload: (() => void) | null;
        result: string;
      }) {
        this.result = 'data:image/jpeg;base64,abc';
        if (this.onload) this.onload();
      }),
      onload: null,
      result: 'data:image/jpeg;base64,abc',
      EMPTY: 0,
      LOADING: 1,
      DONE: 2,
    }));

    Object.defineProperty(global, 'navigator', {
      value: {
        onLine: true,
        storage: {
          estimate: jest.fn().mockResolvedValue({ quota: 1000000, usage: 100 }),
        },
      },
      writable: true,
    });

    await TestBed.configureTestingModule({
      imports: [ImageUpload2Component],
      providers: [
        { provide: Platform, useValue: platformMock },
        { provide: NavController, useValue: navControllerMock },
        { provide: AlertController, useValue: alertControllerMock },
        { provide: LoadingController, useValue: loadingControllerMock },
        { provide: ToastController, useValue: toastControllerMock },
        { provide: IMAGE_UPLOAD_FN, useValue: mockUploadFn },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageUpload2Component);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;
    mockEmit = jest.fn();

    jest
      .spyOn(component.positionFromImage, 'emit')
      .mockImplementation(mockEmit);

    Object.defineProperty(component, 'fileUpload', {
      value: () => ({
        nativeElement: { click: jest.fn(), value: '' },
      }),
    });

    component.value.set(null);
    component.disabled.set(false);
    compRef.changeDetectorRef.detectChanges();
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

    it('should show image source dialog on android', async () => {
      component.isWeb = signal(false);
      (platformMock.is as jest.Mock).mockImplementation(
        (key: string) => key === 'android',
      );
      const spy = jest
        .spyOn(component, 'showImageSourceDialog')
        .mockResolvedValue();
      component.onImageUploadClick();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('onFileSelected', () => {
    it('should compress and upload file when file is selected', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockCompressedFile = new File(['compressed'], 'test.jpg', {
        type: 'image/jpeg',
      });
      (compressFile as jest.Mock).mockResolvedValue(mockCompressedFile);
      (getExifDataFromFile as jest.Mock).mockResolvedValue(undefined);

      const event = {
        target: { files: [mockFile] },
      } as unknown as Event;

      await component.onFileSelected(event);

      expect(compressFile).toHaveBeenCalledWith(mockFile);
    });
  });

  describe('ControlValueAccessor', () => {
    it('should set value on writeValue', () => {
      component.writeValue('https://example.com/image.jpg');
      expect(component.value()).toBe('https://example.com/image.jpg');
    });

    it('should call onChange when value is set', () => {
      const onChange = jest.fn();
      component.registerOnChange(onChange);
      component.writeValue('test');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should set disabled state', () => {
      component.setDisabledState(true);
      expect(component.disabled()).toBe(true);
    });
  });

  describe('clearImage', () => {
    it('should clear the value and emit clearImagePath', () => {
      component.value.set('some-url');
      const clearEmit = jest.spyOn(component.clearImagePath, 'emit');
      const onChange = jest.fn();
      component.registerOnChange(onChange);

      component.clearImage();

      expect(component.value()).toBeNull();
      expect(onChange).toHaveBeenCalledWith(null);
      expect(clearEmit).toHaveBeenCalled();
    });

    it('should emit fallback position when position input is set', () => {
      compRef.setInput('position', { latitude: 10, longitude: 20 });
      component.clearImage();
      expect(mockEmit).toHaveBeenCalledWith({ latitude: 10, longitude: 20 });
    });
  });

  describe('drag and drop', () => {
    it('should set isDragging on dragOver', () => {
      const event = { preventDefault: jest.fn() } as unknown as DragEvent;
      component.onDragOver(event);
      expect(component.isDragging()).toBe(true);
    });

    it('should clear isDragging on dragLeave', () => {
      component.isDragging.set(true);
      const event = { preventDefault: jest.fn() } as unknown as DragEvent;
      component.onDragLeave(event);
      expect(component.isDragging()).toBe(false);
    });

    it('should clear isDragging on drop', () => {
      component.isDragging.set(true);
      const event = { preventDefault: jest.fn() } as unknown as DragEvent;
      component.onDrop(event);
      expect(component.isDragging()).toBe(false);
    });
  });

  describe('cropping', () => {
    it('should update croppedImage on onImageCrop', () => {
      const event = {
        base64: 'data:image/jpeg;base64,cropped',
      } as ImageCroppedEvent;
      component.onImageCrop(event);
      expect(component.croppedImage()).toBe('data:image/jpeg;base64,cropped');
    });

    it('should dismiss modal on cancelCropping', () => {
      const dismissMock = jest.fn();
      Object.defineProperty(component, 'cropModal', {
        value: () => ({ dismiss: dismissMock }),
      });
      component.cancelCropping();
      expect(dismissMock).toHaveBeenCalledWith(null, 'cancel');
    });
  });

  describe('showImage computed', () => {
    it('should return true when value is set', () => {
      component.value.set('url');
      expect(component.showImage()).toBe(true);
    });

    it('should return false when value and imageUrl are both empty', () => {
      component.value.set(null);
      expect(component.showImage()).toBe(false);
    });
  });

  describe('upload', () => {
    it('should use base64 as value when offline', async () => {
      Object.defineProperty(global, 'navigator', {
        value: { onLine: false },
        writable: true,
      });

      const onChange = jest.fn();
      component.registerOnChange(onChange);

      const uploadBase64 = (
        component as unknown as {
          uploadBase64: (base64: string) => Promise<void>;
        }
      ).uploadBase64.bind(component);

      await uploadBase64('data:image/jpeg;base64,offlinedata');

      expect(onChange).toHaveBeenCalledWith(
        'data:image/jpeg;base64,offlinedata',
      );
      expect(mockUploadFn).not.toHaveBeenCalled();
    });

    it('should call uploadFn and set download URL when online', async () => {
      Object.defineProperty(global, 'navigator', {
        value: { onLine: true },
        writable: true,
      });

      const onChange = jest.fn();
      component.registerOnChange(onChange);

      const uploadBase64 = (
        component as unknown as {
          uploadBase64: (base64: string) => Promise<void>;
        }
      ).uploadBase64.bind(component);

      await uploadBase64('data:image/jpeg;base64,somedata');

      expect(mockUploadFn).toHaveBeenCalledWith(
        'data:image/jpeg;base64,somedata',
      );
      expect(onChange).toHaveBeenCalledWith('https://example.com/image.jpg');
    });

    it('should call showUploadErrorToast when upload fails', async () => {
      const failingUploadFn = jest
        .fn()
        .mockRejectedValue(new Error('upload failed'));

      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [ImageUpload2Component],
        providers: [
          { provide: Platform, useValue: platformMock },
          { provide: NavController, useValue: navControllerMock },
          { provide: AlertController, useValue: alertControllerMock },
          { provide: LoadingController, useValue: loadingControllerMock },
          { provide: ToastController, useValue: toastControllerMock },
          { provide: IMAGE_UPLOAD_FN, useValue: failingUploadFn },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(ImageUpload2Component);
      component = fixture.componentInstance;
      compRef = fixture.componentRef;
      compRef.changeDetectorRef.detectChanges();

      const showErrorToastSpy = jest
        .spyOn(
          component as unknown as { showUploadErrorToast: () => Promise<void> },
          'showUploadErrorToast',
        )
        .mockResolvedValue();

      const uploadBase64 = (
        component as unknown as {
          uploadBase64: (base64: string) => Promise<void>;
        }
      ).uploadBase64.bind(component);

      await uploadBase64('data:image/jpeg;base64,somedata');

      expect(showErrorToastSpy).toHaveBeenCalled();
    });

    it('should use base64 as value when no upload function provided', async () => {
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [ImageUpload2Component],
        providers: [
          { provide: Platform, useValue: platformMock },
          { provide: NavController, useValue: navControllerMock },
          { provide: AlertController, useValue: alertControllerMock },
          { provide: LoadingController, useValue: loadingControllerMock },
          { provide: ToastController, useValue: toastControllerMock },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(ImageUpload2Component);
      component = fixture.componentInstance;
      compRef.changeDetectorRef.detectChanges();

      Object.defineProperty(global, 'navigator', {
        value: { onLine: true },
        writable: true,
      });

      const onChange = jest.fn();
      component.registerOnChange(onChange);

      const uploadBase64 = (
        component as unknown as {
          uploadBase64: (base64: string) => Promise<void>;
        }
      ).uploadBase64.bind(component);

      await uploadBase64('data:image/jpeg;base64,noUploadFn');

      expect(onChange).toHaveBeenCalledWith(
        'data:image/jpeg;base64,noUploadFn',
      );
    });
  });

  describe('readAndEmitPositionFrom', () => {
    it('should emit position from photo exif data', () => {
      (getExifDataFromPhoto as jest.Mock).mockReturnValue({
        latitude: 10,
        longitude: 20,
      });

      const photo = {} as Photo;
      component.readAndEmitPositionFrom(photo);

      expect(mockEmit).toHaveBeenCalledWith({ latitude: 10, longitude: 20 });
    });

    it('should not emit if no exif data', () => {
      (getExifDataFromPhoto as jest.Mock).mockReturnValue(undefined);

      component.readAndEmitPositionFrom({} as Photo);

      expect(mockEmit).not.toHaveBeenCalled();
    });
  });
});
