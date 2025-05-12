import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
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
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { compressFile } from './utils/compress-file';

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
  ],
  templateUrl: './bite.page.html',
  styleUrl: './bite.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class BitePage {
  private readonly platform = inject(Platform);
  private readonly formBuilder = inject(FormBuilder);

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
        const fileUpload = this.fileUpload();

        if (!fileUpload) {
          console.error('File upload element not found');
          return;
        }

        fileUpload.nativeElement.click();

        return;
      }

      this.takePhoto();
    }
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
      await Camera.requestPermissions();

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      this.biteFormGroup.controls['image'].patchValue(
        `data:image/${image.format};base64,${image.base64String}`
      );
    } catch (e) {
      console.error('Error taking photo:', e);
      throw e;
    }
  }

  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
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
}
