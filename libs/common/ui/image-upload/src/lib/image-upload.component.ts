import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
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

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'image-upload',
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.scss',
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
      useExisting: forwardRef(() => ImageUploadComponent),
      multi: true,
    },
  ],
})
export class ImageUploadComponent implements ControlValueAccessor {
  private readonly platform = inject(Platform);
  private readonly alertController = inject(AlertController);
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

  writeValue(obj: any): void {
    this.value.set(obj);
  }

  registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: any): void {
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

    // On Android, show a dialog to choose between camera and gallery
    if (this.platform.is('android')) {
      this.showImageSourceDialog();
      return;
    }

    // On iOS and other platforms, use the default camera prompt
    this.getImageFromNative();
  }

  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];

    await this.patchPositionFromFile(file);

    if (file) {
      const compressedFile = await compressFile(file);

      this.setValueAndTriggerChange(compressedFile);
      this.imageFile = compressedFile;
    }
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

      this.setValueAndTriggerChange(compressedPhoto);
    } catch (e) {
      console.error('Error taking photo:', e);
      throw e;
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

  private async takePhotoWithCamera(): Promise<void> {
    try {
      await Camera.requestPermissions();

      const photo = await Camera.getPhoto(cameraOnlyOptions);

      this.readAndEmitPositionFrom(photo);

      const compressedPhoto = await compressPhoto(photo);

      this.setValueAndTriggerChange(compressedPhoto);
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

      // Extract EXIF data from the file path
      if (pickedFile.path) {
        await this.patchPositionFromFilePath(pickedFile.path);
      }

      // Convert the file data to a File object
      if (pickedFile.data) {
        const base64Data = pickedFile.data;
        const blob = await fetch(
          `data:${pickedFile.mimeType};base64,${base64Data}`,
        ).then((res) => res.blob());
        const file = new File([blob], pickedFile.name, {
          type: pickedFile.mimeType,
        });

        const compressedFile = await compressFile(file);
        this.setValueAndTriggerChange(compressedFile);
        this.imageFile = compressedFile;
      }
    } catch (e) {
      console.error('Error picking image from gallery:', e);
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

  private readAndEmitPositionFrom(photo: Photo): void {
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

  private setValueAndTriggerChange(compressedPhoto: File): void {
    const reader = new FileReader();
    reader.onload = (): void => {
      const result = reader.result as string;
      this.value.set(result);
      this._onChange(result);
      this._onTouch();
    };
    reader.readAsDataURL(compressedPhoto);
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

  // Drag&Drop prevention
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

  confirmCropping(): void {
    const croppedImage = this.croppedImage();

    if (croppedImage) {
      this.value.set(croppedImage);
      this._onChange(croppedImage);
      this._onTouch();

      this.cropModal()?.dismiss(null, 'confirmed');
    }
  }

  onImageCrop($event: ImageCroppedEvent): void {
    this.croppedImage.set($event.base64);
  }
}
