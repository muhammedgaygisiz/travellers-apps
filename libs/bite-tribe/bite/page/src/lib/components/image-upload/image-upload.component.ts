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
  IonCard,
  IonCardContent,
  IonIcon,
} from '@ionic/angular/standalone';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';
import { NavController, Platform } from '@ionic/angular';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { compressFile, compressPhoto } from 'image-compression';
import { getExifDataFromFile } from '../page/utils/get-exif-data-from-file';
import { getExifDataFromPhoto } from '../page/utils/get-exif-data-from-photo';
import { Geopoint } from 'model';

const photoOptions = {
  quality: 90,
  allowEditing: true,
  resultType: CameraResultType.Base64,
  source: CameraSource.Prompt,
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'image-upload',
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.scss',
  imports: [IonCard, IonCardContent, IonIcon, IonButton],
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
  private readonly navController = inject(NavController);

  position = input<Geopoint>();

  positionFromImage = output<Geopoint>();

  private readonly fileUpload =
    viewChild<ElementRef<HTMLInputElement>>('fileUploader');

  isWeb = signal(!this.platform.is('hybrid'));

  value = signal<string | null>(null);

  disabled = signal<boolean | null>(null);

  showImage = computed(() => !!this.value());

  startCropImage = output<string | null>();

  imageFile?: File;

  // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-empty-function
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

  setDisabledState?(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onImageUploadClick() {
    this.isWeb() ? this.clickOnFileUploader() : this.getImageFromNative();
  }

  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];

    await this.patchPositionFromFile(file);

    if (file) {
      const compressedFile = await compressFile(file);

      this.setValueAndTriggerChange(compressedFile);
      this.imageFile = compressedFile;
    }
  }

  private clickOnFileUploader() {
    const fileUpload = this.fileUpload();

    if (!fileUpload) {
      console.error('File upload element not found');
      return;
    }

    fileUpload.nativeElement.click();
  }

  private async getImageFromNative() {
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

  private readAndEmitPositionFrom(photo: Photo) {
    if (photo) {
      try {
        const exifData = getExifDataFromPhoto(photo, this.position());

        this.positionFromImage.emit(exifData);
      } catch (e) {
        console.warn('Error reading GPS position from photo:', e);
      }
    }
  }

  private async patchPositionFromFile(file: File | undefined) {
    if (file) {
      try {
        const exifData = await getExifDataFromFile(file, this.position());

        this.positionFromImage.emit(exifData);
      } catch (e) {
        console.warn('Error reading GPS position from file:', e);
      }
    }
  }

  private setValueAndTriggerChange(compressedPhoto: File) {
    console.log('Setting value and trigger change', compressedPhoto);
    const reader = new FileReader();
    reader.onload = () => {
      this.value.set(reader.result as string);
      this._onChange(reader.result as string);
      this._onTouch();
    };
    reader.readAsDataURL(compressedPhoto);
  }

  cropImage() {
    this.startCropImage.emit(this.value());
  }

  clearImage() {
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
  }
}
