import { TestBed } from '@angular/core/testing';
import {
  AlertController,
  LoadingController,
  ToastController,
} from '@ionic/angular/standalone';
import { Platform } from '@ionic/angular';
import { ImageUploadService } from '../service/image-upload.service';
import { getExifDataFromFile } from '../utils/get-exif-data-from-file';
import { getExifDataFromPhoto } from '../utils/get-exif-data-from-photo';
import { getExifDataFromFilePath } from '../utils/get-exif-data-from-file-path';
import { compressFile, compressPhoto } from 'image-compression';

jest.mock('@capacitor/camera', () => ({
  Camera: {
    requestPermissions: jest.fn(),
    getPhoto: jest.fn(),
  },
  CameraResultType: { Base64: 'base64' },
  CameraSource: { Prompt: 'prompt', Camera: 'camera' },
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

jest.mock('bite-tribe/api', () => ({
  uploadBase64ToFirebaseStorage: jest.fn(),
}));

jest.mock('utils', () => ({
  getDownloadUrlFromFirebaseStorage: jest.fn(),
  addNecessaryIcons: jest.fn(),
}));

describe('ImageUploadService', () => {
  let service: ImageUploadService;
  let platformMock: Partial<Platform>;
  let alertControllerMock: Partial<AlertController>;
  let loadingControllerMock: Partial<LoadingController>;
  let toastControllerMock: Partial<ToastController>;
  let loadingMock: { present: jest.Mock; dismiss: jest.Mock };

  beforeEach(() => {
    platformMock = {
      is: jest.fn((key: string) => key === 'web'),
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

    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);

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
    }));

    TestBed.configureTestingModule({
      providers: [
        ImageUploadService,
        { provide: Platform, useValue: platformMock },
        { provide: AlertController, useValue: alertControllerMock },
        { provide: LoadingController, useValue: loadingControllerMock },
        { provide: ToastController, useValue: toastControllerMock },
      ],
    });

    service = TestBed.inject(ImageUploadService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleImageUploadClick', () => {
    it('should call web upload click on web platform', () => {
      const mockFileUpload = {
        nativeElement: { click: jest.fn() },
      } as unknown as import('@angular/core').ElementRef<HTMLInputElement>;

      service.handleImageUploadClick(mockFileUpload);

      expect(mockFileUpload.nativeElement.click).toHaveBeenCalled();
    });

    it('should log error when fileUpload is null on web', () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      service.handleImageUploadClick(
        null as unknown as import('@angular/core').ElementRef<HTMLInputElement>,
      );
      expect(consoleSpy).toHaveBeenCalledWith('File upload element not found');
    });

    it('should show alert on android', async () => {
      service.isWeb.set(false);
      (platformMock.is as jest.Mock).mockImplementation(
        (key: string) => key === 'android',
      );

      const mockFileUpload = {
        nativeElement: { click: jest.fn() },
      } as unknown as import('@angular/core').ElementRef<HTMLInputElement>;

      service.handleImageUploadClick(mockFileUpload);

      await Promise.resolve();

      expect(alertControllerMock.create).toHaveBeenCalled();
    });

    it('should request camera permissions on iOS', async () => {
      service.isWeb.set(false);
      (platformMock.is as jest.Mock).mockReturnValue(false);

      const { Camera } = jest.requireMock('@capacitor/camera');
      (Camera.requestPermissions as jest.Mock).mockRejectedValue(
        new Error('Denied'),
      );

      const mockFileUpload = {
        nativeElement: { click: jest.fn() },
      } as unknown as import('@angular/core').ElementRef<HTMLInputElement>;

      service.handleImageUploadClick(mockFileUpload);

      await Promise.resolve();

      expect(Camera.requestPermissions).toHaveBeenCalled();
    });
  });

  describe('handleFileSelected', () => {
    it('should process position, compress file, and upload', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockCompressed = new File(['compressed'], 'test.jpg', {
        type: 'image/jpeg',
      });
      (compressFile as jest.Mock).mockResolvedValue(mockCompressed);
      (getExifDataFromFile as jest.Mock).mockResolvedValue(undefined);

      const uploadSpy = jest
        .spyOn(service, 'uploadAsBase64')
        .mockResolvedValue(undefined);

      const callback = jest.fn();
      await service.handleFileSelected(mockFile, 'bites', callback);

      expect(compressFile).toHaveBeenCalledWith(mockFile);
      expect(uploadSpy).toHaveBeenCalledWith(mockCompressed);
      expect(service.collectionId()).toBe('bites');
      expect(service.finishCallback).toBe(callback);
    });

    it('should set position from exif data', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockCompressed = new File(['compressed'], 'test.jpg', {
        type: 'image/jpeg',
      });
      (compressFile as jest.Mock).mockResolvedValue(mockCompressed);
      (getExifDataFromFile as jest.Mock).mockResolvedValue({
        latitude: 10,
        longitude: 20,
      });

      jest.spyOn(service, 'uploadAsBase64').mockResolvedValue(undefined);

      await service.handleFileSelected(mockFile, 'bites', jest.fn());

      expect(service.positionFromImage()).toEqual({
        latitude: 10,
        longitude: 20,
      });
    });
  });

  describe('uploadBase64String', () => {
    it('should call finishCallback with base64 when offline', async () => {
      Object.defineProperty(global, 'navigator', {
        value: { onLine: false },
        writable: true,
      });

      const callback = jest.fn();
      service.finishCallback = callback;

      await service.uploadBase64String('data:image/jpeg;base64,offlinedata');

      expect(service.imageAsBase64()).toBe(
        'data:image/jpeg;base64,offlinedata',
      );
      expect(callback).toHaveBeenCalledWith(
        undefined,
        'data:image/jpeg;base64,offlinedata',
        undefined,
        undefined,
      );
    });

    it('should call finishCallback with base64 when no collectionId', async () => {
      service.collectionId.set(undefined);

      const callback = jest.fn();
      service.finishCallback = callback;

      await service.uploadBase64String('data:image/jpeg;base64,noCollectionId');

      expect(callback).toHaveBeenCalledWith(
        undefined,
        'data:image/jpeg;base64,noCollectionId',
        undefined,
        undefined,
      );
    });

    it('should call uploadBase64ToFirebaseStorage when online with collectionId', async () => {
      const { uploadBase64ToFirebaseStorage } =
        jest.requireMock('bite-tribe/api');
      (uploadBase64ToFirebaseStorage as jest.Mock).mockResolvedValue(
        'path/to/image',
      );

      service.collectionId.set('bites');

      await service.uploadBase64String('data:image/jpeg;base64,somedata');

      expect(uploadBase64ToFirebaseStorage).toHaveBeenCalledWith(
        expect.objectContaining({
          base64: 'data:image/jpeg;base64,somedata',
          collection: 'bites',
        }),
      );
    });

    it('should show error toast when upload throws', async () => {
      const { uploadBase64ToFirebaseStorage } =
        jest.requireMock('bite-tribe/api');
      (uploadBase64ToFirebaseStorage as jest.Mock).mockRejectedValue(
        new Error('upload failed'),
      );

      service.collectionId.set('bites');

      const createSpy = jest.fn().mockResolvedValue({
        present: jest.fn().mockResolvedValue(undefined),
      });
      (
        service as unknown as { toastController: { create: jest.Mock } }
      ).toastController.create = createSpy;

      await service.uploadBase64String('data:image/jpeg;base64,somedata');

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to upload image. Please try again.',
        }),
      );
    });

    it('should show storage alert when insufficient storage on non-web', async () => {
      service.isWeb.set(false);
      Object.defineProperty(global, 'navigator', {
        value: {
          onLine: true,
          storage: {
            estimate: jest.fn().mockResolvedValue({ quota: 10, usage: 9 }),
          },
        },
        writable: true,
      });

      const createSpy = jest.fn().mockResolvedValue({
        present: jest.fn().mockResolvedValue(undefined),
      });
      (
        service as unknown as { alertController: { create: jest.Mock } }
      ).alertController.create = createSpy;

      await service.uploadBase64String('data:image/jpeg;base64,somedata');

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Insufficient Storage' }),
      );
    });
  });

  describe('uploadAsBase64', () => {
    it('should read file as data URL and delegate to uploadBase64String', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const uploadSpy = jest
        .spyOn(service, 'uploadBase64String')
        .mockResolvedValue(undefined);

      await service.uploadAsBase64(mockFile);

      expect(uploadSpy).toHaveBeenCalledWith('data:image/jpeg;base64,abc');
    });
  });

  describe('handleUploadProgress', () => {
    it('should invoke finishCallback with download URL when upload is completed', async () => {
      const { getDownloadUrlFromFirebaseStorage } = jest.requireMock('utils');
      (getDownloadUrlFromFirebaseStorage as jest.Mock).mockResolvedValue(
        'https://example.com/img.jpg',
      );

      service.loading = loadingMock as unknown as HTMLIonLoadingElement;

      const callback = jest.fn();
      service.finishCallback = callback;

      await service.handleUploadProgress({
        uploadParams: {
          evt: { completed: true },
          err: undefined,
          offlineImagePath: '',
        },
        imagePath: 'images/bites/uuid/img.jpg',
      });

      expect(service.imageDownloadUrl()).toBe('https://example.com/img.jpg');
      expect(callback).toHaveBeenCalledWith(
        undefined,
        undefined,
        'https://example.com/img.jpg',
        undefined,
      );
    });

    it('should set uploadProgress to 1 when upload is completed', async () => {
      const { getDownloadUrlFromFirebaseStorage } = jest.requireMock('utils');
      (getDownloadUrlFromFirebaseStorage as jest.Mock).mockResolvedValue(
        'https://example.com/img.jpg',
      );

      service.loading = loadingMock as unknown as HTMLIonLoadingElement;
      service.finishCallback = jest.fn();

      await service.handleUploadProgress({
        uploadParams: {
          evt: { completed: true },
          err: undefined,
          offlineImagePath: '',
        },
        imagePath: 'images/bites/uuid/img.jpg',
      });

      expect(service.uploadProgress()).toBe(1);
    });

    it('should update uploadProgress from evt.progress during upload', async () => {
      service.loading = loadingMock as unknown as HTMLIonLoadingElement;

      await service.handleUploadProgress({
        uploadParams: {
          evt: { completed: false, progress: 0.5 },
          err: undefined,
          offlineImagePath: '',
        },
        imagePath: 'images/bites/uuid/img.jpg',
      });

      expect(service.uploadProgress()).toBe(0.5);
    });

    it('should log error when upload progress has an error', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      service.loading = loadingMock as unknown as HTMLIonLoadingElement;

      await service.handleUploadProgress({
        uploadParams: {
          evt: undefined,
          err: new Error('Upload failed'),
          offlineImagePath: '',
        },
        imagePath: 'images/bites/uuid/img.jpg',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error during upload:',
        expect.any(Error),
      );
    });
  });

  describe('readAndEmitPositionFrom (via getExifDataFromPhoto)', () => {
    it('should set position from photo exif data', () => {
      (getExifDataFromPhoto as jest.Mock).mockReturnValue({
        latitude: 5,
        longitude: 15,
      });

      const { Camera } = jest.requireMock('@capacitor/camera');
      const photo = {} as import('@capacitor/camera').Photo;
      (Camera.getPhoto as jest.Mock).mockResolvedValue(photo);

      const readAndEmit = (
        service as unknown as {
          readAndEmitPositionFrom: (
            photo: import('@capacitor/camera').Photo,
          ) => void;
        }
      ).readAndEmitPositionFrom.bind(service);

      readAndEmit(photo);

      expect(service.positionFromImage()).toEqual({
        latitude: 5,
        longitude: 15,
      });
    });

    it('should not set position when no exif data', () => {
      (getExifDataFromPhoto as jest.Mock).mockReturnValue(undefined);

      const photo = {} as import('@capacitor/camera').Photo;

      const readAndEmit = (
        service as unknown as {
          readAndEmitPositionFrom: (
            photo: import('@capacitor/camera').Photo,
          ) => void;
        }
      ).readAndEmitPositionFrom.bind(service);

      readAndEmit(photo);

      expect(service.positionFromImage()).toBeUndefined();
    });
  });

  describe('patchPositionFromFilePath', () => {
    it('should set position from file path exif data', async () => {
      const { getExifDataFromFilePath } = jest.requireMock(
        '../utils/get-exif-data-from-file-path',
      );
      (getExifDataFromFilePath as jest.Mock).mockResolvedValue({
        latitude: 3,
        longitude: 7,
      });

      const patchPos = (
        service as unknown as {
          patchPositionFromFilePath: (path: string) => Promise<void>;
        }
      ).patchPositionFromFilePath.bind(service);

      await patchPos('/path/to/image');

      expect(service.positionFromImage()).toEqual({
        latitude: 3,
        longitude: 7,
      });
    });

    it('should not set position when no exif data from path', async () => {
      const { getExifDataFromFilePath } = jest.requireMock(
        '../utils/get-exif-data-from-file-path',
      );
      (getExifDataFromFilePath as jest.Mock).mockResolvedValue(undefined);

      const patchPos = (
        service as unknown as {
          patchPositionFromFilePath: (path: string) => Promise<void>;
        }
      ).patchPositionFromFilePath.bind(service);

      await patchPos('/path/to/image');

      expect(service.positionFromImage()).toBeUndefined();
    });
  });
});
