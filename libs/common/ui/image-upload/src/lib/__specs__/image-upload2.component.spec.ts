import {
  ImageUpload2Component,
  IMAGE_UPLOAD_FN,
} from '../image-upload2.component';
import { Photo } from '@capacitor/camera';
import { compressFile, compressPhoto } from 'image-compression';
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

  describe('registerOnTouched', () => {
    it('should set _onTouch callback', () => {
      const onTouch = jest.fn();
      component.registerOnTouched(onTouch);
      expect(component._onTouch).toBe(onTouch);
    });
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

    it('should call getImageFromNative when not web and not android', () => {
      component.isWeb = signal(false);
      (platformMock.is as jest.Mock).mockReturnValue(false);
      const spy = jest
        .spyOn(
          component as unknown as {
            getImageFromNative: () => Promise<void>;
          },
          'getImageFromNative',
        )
        .mockResolvedValue(undefined);
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

    it('should emit position when exif data found in file', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockCompressedFile = new File(['compressed'], 'test.jpg', {
        type: 'image/jpeg',
      });
      (compressFile as jest.Mock).mockResolvedValue(mockCompressedFile);
      (getExifDataFromFile as jest.Mock).mockResolvedValue({
        latitude: 5,
        longitude: 10,
      });

      const event = {
        target: { files: [mockFile] },
      } as unknown as Event;

      jest
        .spyOn(
          component as unknown as {
            uploadBase64: (b: string) => Promise<void>;
          },
          'uploadBase64',
        )
        .mockResolvedValue(undefined);

      await component.onFileSelected(event);

      expect(mockEmit).toHaveBeenCalledWith({ latitude: 5, longitude: 10 });
    });

    it('should handle getExifDataFromFile throwing an error', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockCompressedFile = new File(['compressed'], 'test.jpg', {
        type: 'image/jpeg',
      });
      (compressFile as jest.Mock).mockResolvedValue(mockCompressedFile);
      (getExifDataFromFile as jest.Mock).mockRejectedValue(
        new Error('EXIF error'),
      );

      const event = {
        target: { files: [mockFile] },
      } as unknown as Event;

      jest
        .spyOn(
          component as unknown as {
            uploadBase64: (b: string) => Promise<void>;
          },
          'uploadBase64',
        )
        .mockResolvedValue(undefined);

      await expect(component.onFileSelected(event)).resolves.not.toThrow();
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

    it('should warn and not throw when getExifDataFromPhoto throws', () => {
      (getExifDataFromPhoto as jest.Mock).mockImplementation(() => {
        throw new Error('EXIF parse error');
      });

      const warnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      expect(() =>
        component.readAndEmitPositionFrom({} as Photo),
      ).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        'Error reading GPS position from photo:',
        expect.any(Error),
      );
    });
  });

  describe('getImageFromNative', () => {
    it('should request permissions, get photo, and upload', async () => {
      const { Camera } = jest.requireMock('@capacitor/camera');
      const mockPhoto = { base64String: 'photodata' };
      const mockCompressedPhoto = new File(['photo'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      (Camera.requestPermissions as jest.Mock).mockResolvedValue(undefined);
      (Camera.getPhoto as jest.Mock).mockResolvedValue(mockPhoto);
      (compressPhoto as jest.Mock).mockResolvedValue(mockCompressedPhoto);
      (getExifDataFromPhoto as jest.Mock).mockReturnValue(undefined);

      const uploadBase64Spy = jest
        .spyOn(
          component as unknown as {
            uploadBase64: (b: string) => Promise<void>;
          },
          'uploadBase64',
        )
        .mockResolvedValue(undefined);

      const getImageFromNative = (
        component as unknown as { getImageFromNative: () => Promise<void> }
      ).getImageFromNative.bind(component);

      await getImageFromNative();

      expect(Camera.requestPermissions).toHaveBeenCalled();
      expect(Camera.getPhoto).toHaveBeenCalled();
      expect(uploadBase64Spy).toHaveBeenCalled();
    });

    it('should throw on camera permission error', async () => {
      const { Camera } = jest.requireMock('@capacitor/camera');
      (Camera.requestPermissions as jest.Mock).mockRejectedValue(
        new Error('Denied'),
      );

      const getImageFromNative = (
        component as unknown as { getImageFromNative: () => Promise<void> }
      ).getImageFromNative.bind(component);

      await expect(getImageFromNative()).rejects.toThrow('Denied');
    });
  });

  describe('takePhotoWithCamera', () => {
    it('should take a photo with camera and upload', async () => {
      const { Camera } = jest.requireMock('@capacitor/camera');
      const mockPhoto = { base64String: 'photodata' };
      const mockCompressedPhoto = new File(['photo'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      (Camera.requestPermissions as jest.Mock).mockResolvedValue(undefined);
      (Camera.getPhoto as jest.Mock).mockResolvedValue(mockPhoto);
      (compressPhoto as jest.Mock).mockResolvedValue(mockCompressedPhoto);
      (getExifDataFromPhoto as jest.Mock).mockReturnValue(undefined);

      const uploadBase64Spy = jest
        .spyOn(
          component as unknown as {
            uploadBase64: (b: string) => Promise<void>;
          },
          'uploadBase64',
        )
        .mockResolvedValue(undefined);

      const takePhotoWithCamera = (
        component as unknown as { takePhotoWithCamera: () => Promise<void> }
      ).takePhotoWithCamera.bind(component);

      await takePhotoWithCamera();

      expect(Camera.requestPermissions).toHaveBeenCalled();
      expect(uploadBase64Spy).toHaveBeenCalled();
    });

    it('should handle camera error without throwing', async () => {
      const { Camera } = jest.requireMock('@capacitor/camera');
      (Camera.requestPermissions as jest.Mock).mockRejectedValue(
        new Error('Camera error'),
      );

      const takePhotoWithCamera = (
        component as unknown as { takePhotoWithCamera: () => Promise<void> }
      ).takePhotoWithCamera.bind(component);

      await expect(takePhotoWithCamera()).resolves.not.toThrow();
    });
  });

  describe('pickImageFromGallery', () => {
    it('should return early when no files selected', async () => {
      (compressFile as jest.Mock).mockClear();
      const { FilePicker } = jest.requireMock(
        '@capawesome/capacitor-file-picker',
      );
      (FilePicker.requestPermissions as jest.Mock).mockResolvedValue(undefined);
      (FilePicker.pickImages as jest.Mock).mockResolvedValue({ files: [] });

      await component.pickImageFromGallery();

      expect(compressFile).not.toHaveBeenCalled();
    });

    it('should pick image and upload when file has path and data', async () => {
      const { FilePicker } = jest.requireMock(
        '@capawesome/capacitor-file-picker',
      );
      (FilePicker.requestPermissions as jest.Mock).mockResolvedValue(undefined);
      (FilePicker.pickImages as jest.Mock).mockResolvedValue({
        files: [
          {
            path: '/path/to/file',
            data: 'base64imagedata',
            name: 'photo.jpg',
            mimeType: 'image/jpeg',
          },
        ],
      });
      const mockCompressed = new File(['compressed'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      (compressFile as jest.Mock).mockResolvedValue(mockCompressed);

      global.fetch = jest.fn().mockResolvedValue({
        blob: jest
          .fn()
          .mockResolvedValue(new Blob(['blob'], { type: 'image/jpeg' })),
      } as unknown as Response);

      const uploadBase64Spy = jest
        .spyOn(
          component as unknown as {
            uploadBase64: (b: string) => Promise<void>;
          },
          'uploadBase64',
        )
        .mockResolvedValue(undefined);

      await component.pickImageFromGallery();

      expect(compressFile).toHaveBeenCalled();
      expect(uploadBase64Spy).toHaveBeenCalled();
    });

    it('should pick image with data but no path', async () => {
      const { FilePicker } = jest.requireMock(
        '@capawesome/capacitor-file-picker',
      );
      (FilePicker.requestPermissions as jest.Mock).mockResolvedValue(undefined);
      (FilePicker.pickImages as jest.Mock).mockResolvedValue({
        files: [
          {
            path: undefined,
            data: 'base64imagedata',
            name: 'photo.jpg',
            mimeType: 'image/jpeg',
          },
        ],
      });
      const mockCompressed = new File(['compressed'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      (compressFile as jest.Mock).mockResolvedValue(mockCompressed);

      global.fetch = jest.fn().mockResolvedValue({
        blob: jest
          .fn()
          .mockResolvedValue(new Blob(['blob'], { type: 'image/jpeg' })),
      } as unknown as Response);

      const uploadBase64Spy = jest
        .spyOn(
          component as unknown as {
            uploadBase64: (b: string) => Promise<void>;
          },
          'uploadBase64',
        )
        .mockResolvedValue(undefined);

      await component.pickImageFromGallery();

      expect(uploadBase64Spy).toHaveBeenCalled();
    });

    it('should pick image with path but no data', async () => {
      (compressFile as jest.Mock).mockClear();
      const { FilePicker } = jest.requireMock(
        '@capawesome/capacitor-file-picker',
      );
      (FilePicker.requestPermissions as jest.Mock).mockResolvedValue(undefined);
      (FilePicker.pickImages as jest.Mock).mockResolvedValue({
        files: [
          {
            path: '/path/to/file',
            data: undefined,
            name: 'photo.jpg',
            mimeType: 'image/jpeg',
          },
        ],
      });

      await component.pickImageFromGallery();

      expect(compressFile).not.toHaveBeenCalled();
    });

    it('should handle picker error gracefully', async () => {
      const { FilePicker } = jest.requireMock(
        '@capawesome/capacitor-file-picker',
      );
      (FilePicker.requestPermissions as jest.Mock).mockRejectedValue(
        new Error('Permission denied'),
      );

      await expect(component.pickImageFromGallery()).resolves.not.toThrow();
    });
  });

  describe('patchPositionFromFilePath', () => {
    it('should emit position when exif data found', async () => {
      const { getExifDataFromFilePath } = jest.requireMock(
        '../utils/get-exif-data-from-file-path',
      );
      (getExifDataFromFilePath as jest.Mock).mockResolvedValue({
        latitude: 1,
        longitude: 2,
      });

      const patchPositionFromFilePath = (
        component as unknown as {
          patchPositionFromFilePath: (path: string) => Promise<void>;
        }
      ).patchPositionFromFilePath.bind(component);

      await patchPositionFromFilePath('/path/to/file');

      expect(mockEmit).toHaveBeenCalledWith({ latitude: 1, longitude: 2 });
    });

    it('should return without emitting when no exif data', async () => {
      const { getExifDataFromFilePath } = jest.requireMock(
        '../utils/get-exif-data-from-file-path',
      );
      (getExifDataFromFilePath as jest.Mock).mockResolvedValue(undefined);

      const patchPositionFromFilePath = (
        component as unknown as {
          patchPositionFromFilePath: (path: string) => Promise<void>;
        }
      ).patchPositionFromFilePath.bind(component);

      await patchPositionFromFilePath('/path/to/file');

      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should handle error without throwing', async () => {
      const { getExifDataFromFilePath } = jest.requireMock(
        '../utils/get-exif-data-from-file-path',
      );
      (getExifDataFromFilePath as jest.Mock).mockRejectedValue(
        new Error('EXIF error'),
      );

      const patchPositionFromFilePath = (
        component as unknown as {
          patchPositionFromFilePath: (path: string) => Promise<void>;
        }
      ).patchPositionFromFilePath.bind(component);

      await expect(patchPositionFromFilePath('/path')).resolves.not.toThrow();
    });
  });

  describe('confirmCropping', () => {
    it('should dismiss modal and upload when croppedImage is set', async () => {
      const uploadBase64Spy = jest
        .spyOn(
          component as unknown as {
            uploadBase64: (base64: string) => Promise<void>;
          },
          'uploadBase64',
        )
        .mockResolvedValue(undefined);

      const dismissMock = jest.fn();
      Object.defineProperty(component, 'cropModal', {
        value: () => ({ dismiss: dismissMock }),
        configurable: true,
      });

      component.croppedImage.set('data:image/jpeg;base64,cropped');

      await component.confirmCropping();

      expect(dismissMock).toHaveBeenCalledWith(null, 'confirmed');
      expect(uploadBase64Spy).toHaveBeenCalledWith(
        'data:image/jpeg;base64,cropped',
      );
    });

    it('should do nothing when croppedImage is null', async () => {
      const uploadBase64Spy = jest
        .spyOn(
          component as unknown as {
            uploadBase64: (base64: string) => Promise<void>;
          },
          'uploadBase64',
        )
        .mockResolvedValue(undefined);

      component.croppedImage.set(null);

      await component.confirmCropping();

      expect(uploadBase64Spy).not.toHaveBeenCalled();
    });
  });

  describe('hasEnoughStorage', () => {
    it('should return true when sufficient storage available', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          onLine: true,
          storage: {
            estimate: jest
              .fn()
              .mockResolvedValue({ quota: 1000000000, usage: 100 }),
          },
        },
        writable: true,
      });

      const hasEnoughStorage = (
        component as unknown as {
          hasEnoughStorage: (bytes: number) => Promise<boolean>;
        }
      ).hasEnoughStorage.bind(component);

      const result = await hasEnoughStorage(100);
      expect(result).toBe(true);
    });

    it('should return false when insufficient storage', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          onLine: true,
          storage: {
            estimate: jest.fn().mockResolvedValue({ quota: 100, usage: 99 }),
          },
        },
        writable: true,
      });

      const hasEnoughStorage = (
        component as unknown as {
          hasEnoughStorage: (bytes: number) => Promise<boolean>;
        }
      ).hasEnoughStorage.bind(component);

      const result = await hasEnoughStorage(1000);
      expect(result).toBe(false);
    });

    it('should return true when storage.estimate throws', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          onLine: true,
          storage: {
            estimate: jest.fn().mockRejectedValue(new Error('storage error')),
          },
        },
        writable: true,
      });

      const hasEnoughStorage = (
        component as unknown as {
          hasEnoughStorage: (bytes: number) => Promise<boolean>;
        }
      ).hasEnoughStorage.bind(component);

      const result = await hasEnoughStorage(100);
      expect(result).toBe(true);
    });
  });

  describe('showInsufficientStorageAlert', () => {
    it('should create and present alert', async () => {
      const createSpy = jest
        .fn()
        .mockResolvedValue({ present: jest.fn().mockResolvedValue(undefined) });
      (
        component as unknown as { alertController: { create: jest.Mock } }
      ).alertController.create = createSpy;

      const showInsufficientStorageAlert = (
        component as unknown as {
          showInsufficientStorageAlert: () => Promise<void>;
        }
      ).showInsufficientStorageAlert.bind(component);

      await showInsufficientStorageAlert();

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Insufficient Storage' }),
      );
    });
  });

  describe('showUploadErrorToast', () => {
    it('should create and present toast', async () => {
      const createSpy = jest
        .fn()
        .mockResolvedValue({ present: jest.fn().mockResolvedValue(undefined) });
      (
        component as unknown as { toastController: { create: jest.Mock } }
      ).toastController.create = createSpy;

      const showUploadErrorToast = (
        component as unknown as {
          showUploadErrorToast: () => Promise<void>;
        }
      ).showUploadErrorToast.bind(component);

      await showUploadErrorToast();

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to upload image. Please try again.',
          duration: 3000,
          color: 'danger',
        }),
      );
    });
  });

  describe('uploadBase64 storage check', () => {
    it('should check storage and proceed when not on web and enough storage', async () => {
      component.isWeb = signal(false);

      Object.defineProperty(global, 'navigator', {
        value: {
          onLine: true,
          storage: {
            estimate: jest
              .fn()
              .mockResolvedValue({ quota: 1000000000, usage: 100 }),
          },
        },
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

      expect(onChange).toHaveBeenCalledWith('https://example.com/image.jpg');
    });

    it('should show storage alert when not on web and insufficient storage', async () => {
      component.isWeb = signal(false);

      Object.defineProperty(global, 'navigator', {
        value: {
          onLine: true,
          storage: {
            estimate: jest.fn().mockResolvedValue({ quota: 10, usage: 9 }),
          },
        },
        writable: true,
      });

      const showInsufficientStorageAlertSpy = jest
        .spyOn(
          component as unknown as {
            showInsufficientStorageAlert: () => Promise<void>;
          },
          'showInsufficientStorageAlert',
        )
        .mockResolvedValue(undefined);

      const uploadBase64 = (
        component as unknown as {
          uploadBase64: (base64: string) => Promise<void>;
        }
      ).uploadBase64.bind(component);

      await uploadBase64('data:image/jpeg;base64,somedata');

      expect(showInsufficientStorageAlertSpy).toHaveBeenCalled();
    });
  });
});
