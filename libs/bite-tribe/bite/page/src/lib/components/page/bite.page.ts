import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { Platform } from '@ionic/angular';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { compressFile } from 'image-compression';
import { MapComponent } from 'bite-tribe-common/map';
import { getExifDataFromFile } from './utils/get-exif-data-from-file';
import { getExifDataFromPhoto } from './utils/get-exif-data-from-photo';

@Component({
  selector: 'bt-bite',
  imports: [
    PageComponent,
    IonCard,
    IonIcon,
    IonCardContent,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    IonContent,
    ReactiveFormsModule,
    IonSelect,
    IonSelectOption,
    MapComponent,
  ],
  templateUrl: './bite.page.html',
  styleUrl: './bite.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class BitePage {
  private readonly platform = inject(Platform);
  private readonly formBuilder = inject(FormBuilder);

  currency = input<string>();
  position = input<{ latitude: number; longitude: number }>();

  positionToUse = linkedSignal(() => {
    return this.position();
  });

  submitNewBite = output<typeof this.biteFormGroup.value>();

  private readonly fileUpload =
    viewChild<ElementRef<HTMLInputElement>>('fileUploader');

  isWeb = signal(!this.platform.is('hybrid'));

  currencyInitFromInputEffect = effect(() => {
    const currency = this.currency();

    if (currency) {
      this.biteFormGroup.controls['currency'].patchValue(currency);
    }
  });

  positionInitFromInputEffect = effect(() => {
    const position = this.positionToUse();

    if (position) {
      this.biteFormGroup.controls['position'].controls['latitude'].patchValue(
        position.latitude
      );
      this.biteFormGroup.controls['position'].controls['longitude'].patchValue(
        position.longitude
      );
    }
  });

  biteFormGroup = this.formBuilder.group({
    image: ['', Validators.required],
    name: ['', Validators.required],
    place: ['', Validators.required],
    price: [null, Validators.required],
    currency: ['EUR', Validators.required],
    tags: [''],
    position: this.formBuilder.group({
      latitude: [0, Validators.required],
      longitude: [0, Validators.required],
    }),
  });

  imageBase64 = toSignal(this.biteFormGroup.controls['image'].valueChanges);

  showImage = computed(() => {
    const img = this.imageBase64();

    return !!img;
  });

  isInvalid = toSignal(
    this.biteFormGroup.valueChanges.pipe(
      map(() => {
        return !this.biteFormGroup.valid;
      })
    ),
    { initialValue: !this.biteFormGroup.valid }
  );

  onImageUploadClick() {
    if (!this.imageBase64()) {
      if (this.isWeb()) {
        this.clickOnFileUploader();
      }

      this.takePhoto();
    }
  }

  private clickOnFileUploader() {
    const fileUpload = this.fileUpload();

    if (!fileUpload) {
      console.error('File upload element not found');
      return;
    }

    fileUpload.nativeElement.click();

    return;
  }

  async takePhoto() {
    if (this.platform.is('hybrid')) {
      await this.takePictureOnNative();
      return;
    }
  }

  private async takePictureOnNative() {
    try {
      await Camera.requestPermissions();

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
      });

      // Get the gps position from the image
      this.getGpsPositionFromPhoto(photo);

      this.biteFormGroup.controls['image'].patchValue(
        `data:image/${photo.format};base64,${photo.base64String}`
      );
    } catch (e) {
      console.error('Error taking photo:', e);
      throw e;
    }
  }

  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];

    await this.getGpsPositionFromFile(file);

    if (file) {
      const compressedFile = await compressFile(file);

      const reader = new FileReader();
      reader.onload = () => {
        this.biteFormGroup.controls['image'].patchValue(
          reader.result as string
        );
      };
      reader.readAsDataURL(compressedFile);
    }
  }

  saveNewBite() {
    if (this.biteFormGroup.valid) {
      const newBite = this.biteFormGroup.value;
      this.submitNewBite.emit(newBite);
    }
  }

  clearImage() {
    this.biteFormGroup.controls['image'].reset();
    const fileUpload = this.fileUpload();
    if (fileUpload) {
      fileUpload.nativeElement.value = '';
    }
  }

  private async getGpsPositionFromFile(file: File | undefined) {
    if (file) {
      try {
        const exifData = await getExifDataFromFile(file, this.position());

        this.setPositionFromExifData(exifData);
      } catch (e) {
        console.warn('Error reading GPS position from file:', e);
      }
    }
  }

  private getGpsPositionFromPhoto(photo: Photo) {
    if (photo) {
      try {
        const exifData = getExifDataFromPhoto(photo, this.position());

        this.setPositionFromExifData(exifData);
      } catch (e) {
        console.warn('Error reading GPS position from photo:', e);
      }
    }
  }

  private setPositionFromExifData(exifData: {
    latitude: number;
    longitude: number;
  }) {
    if (exifData?.latitude && exifData?.longitude) {
      this.biteFormGroup.controls['position'].controls['latitude'].patchValue(
        exifData.latitude
      );
      this.biteFormGroup.controls['position'].controls['longitude'].patchValue(
        exifData.longitude
      );

      this.positionToUse.set({
        latitude: exifData.latitude,
        longitude: exifData.longitude,
      });
    }
  }
}
