import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  InjectionToken,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
  AlertController,
  LoadingController,
  ToastController,
} from '@ionic/angular/standalone';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';
import { Platform } from '@ionic/angular';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { compressFile, compressPhoto } from 'image-compression';
import { ImageCroppedEvent, ImageCropperComponent } from 'ngx-image-cropper';
import { Placeholder } from './components/placeholder';
import { getExifDataFromPhoto } from './utils/get-exif-data-from-photo';
import { getExifDataFromFile } from './utils/get-exif-data-from-file';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { getExifDataFromFilePath } from './utils/get-exif-data-from-file-path';

export type ImageUploadFn = (base64: string) => Promise<string>;

export const IMAGE_UPLOAD_FN = new InjectionToken<ImageUploadFn>(
  'IMAGE_UPLOAD_FN',
);

const photoOptions = {
  quality: 90,
  allowEditing: false,
  resultType: CameraResultType.Base64,
  source: CameraSource.Prompt,
};

const cameraOnlyOptions = {
  quality: 90,
  allowEditing: false,
  resultType: CameraResultType.Base64,
  source: CameraSource.Camera,
};

const MIN_FREE_BYTES_MULTIPLIER = 3;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'image-upload2',
  templateUrl: './image-upload2.component.html',
  styleUrl: './image-upload2.component.scss',
  imports: [
    IonCard,
    IonCardContent,
    IonButton,
    IonModal,
    ImageCropperComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonTitle,
    IonContent,
    Placeholder,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ImageUpload2Component),
      multi: true,
    },
  ],
})
export class ImageUpload2Component implements ControlValueAccessor {
  private readonly platform = inject(Platform);
  private readonly alertController = inject(AlertController);
  private readonly loadingController = inject(LoadingController);
  private readonly toastController = inject(ToastController);
  private readonly uploadFn = inject(IMAGE_UPLOAD_FN, { optional: true });

  position = input<{
    latitude: number;
    longitude: number;
  }>();

  imageUrl = input<string>();

  positionFromImage = output<{
    latitude: number;
    longitude: number;
  }>();
  clearImagePath = output();

  private readonly fileUpload =
    viewChild<ElementRef<HTMLInputElement>>('fileUploader');

  private readonly cropModal = viewChild<IonModal>('cropModal');

  isWeb = signal(!this.platform.is('hybrid'));
  value = signal<string | null>(null);
  disabled = signal<boolean | null>(null);
  croppedImage = signal<string | null | undefined>(null);

  showImage = computed(() => {
    return !!this.value() || !!this.imageUrl();
  });

  imageFile?: File;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  _onChange: (value: string | null) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  _onTouch: () => void = () => {};

  writeValue(obj: string | null): void {
    this.value.set(obj);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onImageUploadClick(): void {
    const isWeb = this.isWeb();

    if (isWeb) {
      this.clickOnFileUploader();
      return;
    }

    if (this.platform.is('android')) {
      this.showImageSourceDialog();
      return;
    }

    this.getImageFromNative();
  }

  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];

    await this.patchPositionFromFile(file);

    if (file) {
      const compressedFile = await compressFile(file);

      this.imageFile = compressedFile;
      await this.processAndUpload(compressedFile);
    }
  }

  readAndEmitPositionFrom(photo: Photo): void {
    if (photo) {
      try {
        const exifData = getExifDataFromPhoto(photo);

        if (!exifData) {
          return;
        }
        this.positionFromImage.emit(exifData);
      } catch (e) {
        console.warn('Error reading GPS position from photo:', e);
      }
    }
  }

  async showImageSourceDialog(): Promise<void> {
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

  async pickImageFromGallery(): Promise<void> {
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
        this.imageFile = compressedFile;
        await this.processAndUpload(compressedFile);
      }
    } catch (e) {
      console.error('Error picking image from gallery:', e);
    }
  }

  clearImage(): void {
    this.value.set(null);
    this._onChange(null);

    const fallbackPosition = this.position();
    if (fallbackPosition) {
      this.positionFromImage.emit(fallbackPosition);
    }
    const fileUpload = this.fileUpload();
    if (fileUpload) {
      fileUpload.nativeElement.value = '';
    }

    this.clearImagePath.emit();
  }

  // Drag & Drop prevention
  isDragging = signal(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  cancelCropping(): void {
    this.cropModal()?.dismiss(null, 'cancel');
  }

  async confirmCropping(): Promise<void> {
    const croppedImage = this.croppedImage();

    if (croppedImage) {
      this.cropModal()?.dismiss(null, 'confirmed');
      await this.uploadBase64(croppedImage);
    }
  }

  onImageCrop($event: ImageCroppedEvent): void {
    this.croppedImage.set($event.base64);
  }

  private clickOnFileUploader(): void {
    const fileUpload = this.fileUpload();

    if (!fileUpload) {
      console.error('File upload element not found');
      return;
    }

    fileUpload.nativeElement.click();
  }

  private async getImageFromNative(): Promise<void> {
    try {
      await Camera.requestPermissions();

      const photo = await Camera.getPhoto(photoOptions);

      this.readAndEmitPositionFrom(photo);

      const compressedPhoto = await compressPhoto(photo);

      await this.processAndUpload(compressedPhoto);
    } catch (e) {
      console.error('Error taking photo:', e);
      throw e;
    }
  }

  private async takePhotoWithCamera(): Promise<void> {
    try {
      await Camera.requestPermissions();

      const photo = await Camera.getPhoto(cameraOnlyOptions);

      this.readAndEmitPositionFrom(photo);

      const compressedPhoto = await compressPhoto(photo);

      await this.processAndUpload(compressedPhoto);
    } catch (e) {
      console.error('Error taking photo:', e);
    }
  }

  private async patchPositionFromFilePath(filePath: string): Promise<void> {
    try {
      const exifData = await getExifDataFromFilePath(filePath);

      if (!exifData) {
        return;
      }

      this.positionFromImage.emit(exifData);
    } catch (e) {
      console.warn('Error reading GPS position from file path:', e);
    }
  }

  private async patchPositionFromFile(file: File | undefined): Promise<void> {
    if (file) {
      try {
        const exifData = await getExifDataFromFile(file);

        if (!exifData) {
          return;
        }

        this.positionFromImage.emit(exifData);
      } catch (e) {
        console.warn('Error reading GPS position from file:', e);
      }
    }
  }

  private async processAndUpload(compressed: File): Promise<void> {
    const base64 = await this.readFileAsDataUrl(compressed);
    await this.uploadBase64(base64);
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

  private async uploadBase64(base64: string): Promise<void> {
    if (!navigator.onLine) {
      this.setValueAndNotify(base64);
      return;
    }

    if (!this.isWeb()) {
      const hasStorage = await this.hasEnoughStorage(base64.length);
      if (!hasStorage) {
        await this.showInsufficientStorageAlert();
        return;
      }
    }

    const uploadFn = this.uploadFn;
    if (!uploadFn) {
      this.setValueAndNotify(base64);
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Uploading image...',
    });
    await loading.present();

    try {
      const downloadUrl = await uploadFn(base64);
      this.setValueAndNotify(downloadUrl);
    } catch (e) {
      console.error('Error uploading image:', e);
      await this.showUploadErrorToast();
    } finally {
      await loading.dismiss();
    }
  }

  private setValueAndNotify(value: string): void {
    this.value.set(value);
    this._onChange(value);
    this._onTouch();
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
