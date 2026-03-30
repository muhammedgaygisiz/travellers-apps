import { ElementRef, inject, Injectable, signal } from '@angular/core';
import { Platform } from '@ionic/angular';
import {
  AlertController,
  LoadingController,
  ToastController,
} from '@ionic/angular/standalone';
import { Camera, Photo } from '@capacitor/camera';
import { cameraOnlyOptions, photoOptions } from '../utils/image-options';
import { compressFile, compressPhoto } from 'image-compression';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { getExifDataFromPhoto } from '../utils/get-exif-data-from-photo';
import { getExifDataFromFilePath } from '../utils/get-exif-data-from-file-path';
import { getExifDataFromFile } from '../utils/get-exif-data-from-file';
import { uploadBase64ToFirebaseStorage } from 'bite-tribe/api';
import { v4 as uuidv4 } from 'uuid';
import { getDownloadUrlFromFirebaseStorage } from 'utils';
import { CreateAndUploadImageCallbackParams } from 'model';

const MIN_FREE_BYTES_MULTIPLIER = 3;

@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  private readonly platform = inject(Platform);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  private readonly loadingController = inject(LoadingController);

  isWeb = signal(!this.platform.is('hybrid'));

  collectionId = signal<string | undefined>(undefined);
  docId = signal<string | undefined>(undefined);

  imageFile = signal<File | undefined>(undefined);
  imageAsBase64 = signal<string | undefined>(undefined);
  imageDownloadUrl = signal<string | undefined>(undefined);
  positionFromImage = signal<
    | {
        latitude: number;
        longitude: number;
      }
    | undefined
  >(undefined);

  uploadProgress = signal<number>(0);

  loading: HTMLIonLoadingElement | undefined = undefined;

  handleImageUploadClick(fileUpload: ElementRef<HTMLInputElement>): void {
    const isWeb = this.isWeb();

    if (isWeb) {
      this.handleWebImageUploadClick(fileUpload);
      return;
    }

    if (this.platform.is('android')) {
      void this.handleAndroidImageUploadClick();
      return;
    }

    void this.handleIOSImageUploadClick();
  }

  private handleWebImageUploadClick(
    fileUpload: ElementRef<HTMLInputElement>,
  ): void {
    if (!fileUpload) {
      console.error('File upload element not found');
      return;
    }

    fileUpload.nativeElement.click();
  }

  private async handleAndroidImageUploadClick(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Choose Image Source',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Take Photo',
          handler: this.takePhotoWithCamera.bind(this),
        },
        {
          text: 'Choose from Gallery',
          handler: this.pickImageFromGallery.bind(this),
        },
      ],
    });

    await alert.present();
  }

  private async handleIOSImageUploadClick(): Promise<void> {
    try {
      await Camera.requestPermissions();

      const photo = await Camera.getPhoto(photoOptions);

      this.readAndEmitPositionFrom(photo);

      const compressedPhoto = await compressPhoto(photo);

      await this.uploadAsBase64(compressedPhoto);
    } catch (e) {
      console.error('Error taking photo:', e);
      throw e;
    }
  }

  finishCallback:
    | ((
        file: File | undefined,
        base64: string | undefined,
        downloadUrl: string | undefined,
        position: { latitude: number; longitude: number } | undefined,
      ) => void)
    | undefined = undefined;

  async handleFileSelected(
    file: File,
    collectionId: string,
    finishedCallback: (
      file: File | undefined,
      base64: string | undefined,
      downloadUrl: string | undefined,
      position: { latitude: number; longitude: number } | undefined,
    ) => void,
    docId?: string,
  ): Promise<void> {
    await this.processPositionFromImage(file);

    await this.compressFile(file);

    this.collectionId.set(collectionId);
    this.docId.set(docId);
    this.finishCallback = finishedCallback;
    await this.uploadAsBase64(file);
  }

  private processPositionFromImage = async (file: File): Promise<void> => {
    try {
      const exifData = await getExifDataFromFile(file);

      if (!exifData) {
        return;
      }

      this.positionFromImage.set(exifData);
    } catch (e) {
      console.warn('Error reading GPS position from file:', e);
    }
  };

  private async compressFile(file: File): Promise<void> {
    const compressedFile = await compressFile(file);
    this.imageFile.set(compressedFile);
  }

  async uploadAsBase64(compressed: File): Promise<void> {
    const base64 = await this.readFileAsDataUrl(compressed);
    await this.uploadBase64String(base64);
  }

  async uploadBase64String(base64: string): Promise<void> {
    if (!navigator.onLine) {
      this.imageAsBase64.set(base64);
      this.finishCallback?.(
        this.imageFile(),
        base64,
        undefined,
        this.positionFromImage(),
      );
      return;
    }

    if (!this.isWeb()) {
      const hasStorage = await this.hasEnoughStorage(base64.length);
      if (!hasStorage) {
        await this.showInsufficientStorageAlert();
        return;
      }
    }

    if (!this.collectionId()) {
      console.error('Collection ID is not set. Cannot upload image.');
      this.imageAsBase64.set(base64);
      this.finishCallback?.(
        this.imageFile(),
        base64,
        undefined,
        this.positionFromImage(),
      );
      return;
    }

    this.loading = await this.loadingController.create({
      message: 'Uploading image...',
    });
    await this.loading.present();
    this.uploadProgress.set(0);

    try {
      const uuid = this.docId() ?? uuidv4();
      const collectionId = this.collectionId();
      await uploadBase64ToFirebaseStorage({
        base64,
        docId: uuid,
        collection: collectionId,
        callbackFn: this.handleUploadProgress.bind(this),
      });
    } catch (e) {
      console.error('Error uploading image:', e);
      await this.loading.dismiss();
      await this.showUploadErrorToast();
    }
  }

  async handleUploadProgress(
    p: CreateAndUploadImageCallbackParams,
  ): Promise<void> {
    if (p.uploadParams?.err) {
      console.error('Error during upload:', p.uploadParams?.err);
    }

    if (p.uploadParams?.evt && !p.uploadParams.evt.completed) {
      const progress = p.uploadParams.evt.progress ?? 0;
      this.uploadProgress.set(progress);
    }

    if (p.uploadParams?.evt?.completed) {
      console.log('Upload completed for image:', p.imagePath);
      this.uploadProgress.set(1);

      const imagePath = p.imagePath;
      const downloadUrl = await getDownloadUrlFromFirebaseStorage(imagePath);
      this.imageDownloadUrl.set(downloadUrl);

      this.finishCallback?.(
        this.imageFile(),
        this.imageAsBase64(),
        this.imageDownloadUrl(),
        this.positionFromImage(),
      );
    }

    await this.loading?.dismiss();
  }

  private async takePhotoWithCamera(): Promise<void> {
    try {
      await Camera.requestPermissions();

      const photo = await Camera.getPhoto(cameraOnlyOptions);

      this.readAndEmitPositionFrom(photo);

      const compressedPhoto = await compressPhoto(photo);

      await this.uploadAsBase64(compressedPhoto);
    } catch (e) {
      console.error('Error taking photo:', e);
    }
  }

  private async pickImageFromGallery(): Promise<void> {
    try {
      await FilePicker.requestPermissions({
        permissions: ['accessMediaLocation'],
      });
      const result = await FilePicker.pickImages({
        readData: true,
      });

      if (result.files.length === 0) {
        return;
      }

      const pickedFile = result.files[0];

      if (pickedFile.path) {
        await this.patchPositionFromFilePath(pickedFile.path);
      }

      if (pickedFile.data) {
        const blob = await fetch(
          `data:${pickedFile.mimeType};base64,${pickedFile.data}`,
        ).then((res) => res.blob());
        const file = new File([blob], pickedFile.name, {
          type: pickedFile.mimeType,
        });

        const compressedFile = await compressFile(file);
        this.imageFile.set(compressedFile);
        await this.uploadAsBase64(compressedFile);
      }
    } catch (e) {
      console.error('Error picking image from gallery:', e);
    }
  }

  private readAndEmitPositionFrom(photo: Photo): void {
    if (photo) {
      try {
        const exifData = getExifDataFromPhoto(photo);

        if (!exifData) {
          return;
        }
        this.positionFromImage.set(exifData);
      } catch (e) {
        console.warn('Error reading GPS position from photo:', e);
      }
    }
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (): void => resolve(reader.result as string);
      reader.onerror = (event): void =>
        reject(new Error(`Failed to read file as data URL: ${event}`));
      reader.readAsDataURL(file);
    });
  }

  private async patchPositionFromFilePath(filePath: string): Promise<void> {
    try {
      const exifData = await getExifDataFromFilePath(filePath);

      if (!exifData) {
        return;
      }

      this.positionFromImage.set(exifData);
    } catch (e) {
      console.warn('Error reading GPS position from file path:', e);
    }
  }

  private async hasEnoughStorage(base64Length: number): Promise<boolean> {
    try {
      // base64 encoding adds ~33% overhead; approximate actual blob bytes
      const approximateBlobBytes = base64Length * 0.75;
      const estimate = await navigator.storage.estimate();
      const available = (estimate.quota ?? 0) - (estimate.usage ?? 0);
      return available > approximateBlobBytes * MIN_FREE_BYTES_MULTIPLIER;
    } catch {
      return true;
    }
  }

  private async showInsufficientStorageAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Insufficient Storage',
      message:
        'There is not enough storage space on your device to upload this image.',
      buttons: ['OK'],
    });
    await alert.present();
  }

  private async showUploadErrorToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Failed to upload image. Please try again.',
      duration: 3000,
      position: 'bottom',
      color: 'danger',
    });
    await toast.present();
  }
}
