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
  IonText,
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
import { compressFile, compressPhoto } from 'image-compression';
import { MapComponent } from 'bite-tribe-common/map';
import { getExifDataFromFile } from './utils/get-exif-data-from-file';
import { getExifDataFromPhoto } from './utils/get-exif-data-from-photo';

const photoOptions = {
  quality: 90,
  allowEditing: true,
  resultType: CameraResultType.Base64,
  source: CameraSource.Prompt,
};

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
    IonText,
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

  positionToUse = linkedSignal(() => this.position());

  submitNewBite = output<typeof this.biteFormGroup.value>();

  private readonly fileUpload =
    viewChild<ElementRef<HTMLInputElement>>('fileUploader');

  isWeb = signal(!this.platform.is('hybrid'));

  biteFormGroup = this.formBuilder.group({
    image: ['', Validators.required],
    name: ['', Validators.required],
    place: ['', Validators.required],
    price: [null, Validators.required],
    currency: ['EUR', Validators.required],
    tags: [''],
    position: this.formBuilder.group({
      latitude: [this.position()?.latitude, Validators.required],
      longitude: [this.position()?.longitude, Validators.required],
    }),
  });

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

  imageBase64 = toSignal(this.biteFormGroup.controls['image'].valueChanges);

  showImage = computed(() => !!this.imageBase64());

  isInvalid = toSignal(
    this.biteFormGroup.valueChanges.pipe(map(() => !this.biteFormGroup.valid)),
    { initialValue: !this.biteFormGroup.valid }
  );

  noGpsPosition = computed(() => {
    this.imageBase64();

    const imageControl = this.biteFormGroup.controls['image'];
    const positionControl = this.biteFormGroup.controls['position'];

    if (imageControl.valid && !positionControl.valid) {
      return true;
    }

    return !positionControl.valid;
  });

  getGpsErrorMessage = computed(() => {
    const position = this.position();
    const chosenImage = this.imageBase64();

    if (chosenImage && !position) {
      return 'No GPS position found in the image. Please choose a GPS position from the map or enable GPS position.';
    }

    if (!chosenImage && !position) {
      return 'Please choose a GPS position from the map or enable GPS position.';
    }

    return '';
  });

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

      const photo = await Camera.getPhoto(photoOptions);

      this.patchPositionFromPhoto(photo);

      const compressedPhoto = await compressPhoto(photo);

      this.patchImageInForm(compressedPhoto);
    } catch (e) {
      console.error('Error taking photo:', e);
      throw e;
    }
  }

  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];

    await this.patchPositionFromFile(file);

    if (file) {
      const compressedFile = await compressFile(file);

      this.patchImageInForm(compressedFile);
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
    this.biteFormGroup.controls['position'].reset();
    this.positionToUse.set(this.position());
    const fileUpload = this.fileUpload();
    if (fileUpload) {
      fileUpload.nativeElement.value = '';
    }
  }

  private async patchPositionFromFile(file: File | undefined) {
    if (file) {
      try {
        const exifData = await getExifDataFromFile(file, this.position());

        this.setPositionInForm(exifData);
      } catch (e) {
        console.warn('Error reading GPS position from file:', e);
      }
    }
  }

  private patchPositionFromPhoto(photo: Photo) {
    if (photo) {
      try {
        const exifData = getExifDataFromPhoto(photo, this.position());

        this.setPositionInForm(exifData);
      } catch (e) {
        console.warn('Error reading GPS position from photo:', e);
      }
    }
  }

  private setPositionInForm(position: { latitude: number; longitude: number }) {
    if (position?.latitude && position?.longitude) {
      this.biteFormGroup.controls['position'].controls['latitude'].patchValue(
        position.latitude
      );
      this.biteFormGroup.controls['position'].controls['longitude'].patchValue(
        position.longitude
      );

      this.positionToUse.set({
        latitude: position.latitude,
        longitude: position.longitude,
      });
    }
  }

  private patchImageInForm(compressedPhoto: File) {
    const reader = new FileReader();
    reader.onload = () => {
      this.biteFormGroup.controls['image'].patchValue(reader.result as string);
    };
    reader.readAsDataURL(compressedPhoto);
  }
}
