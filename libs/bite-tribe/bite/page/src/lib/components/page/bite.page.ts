import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  IonText,
} from '@ionic/angular/standalone';
import { Platform } from '@ionic/angular';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { PositionComponent } from 'bite-tribe-common/map';
import { BiteDirective } from './bite.directive';
import { ImageUploadComponent } from '../image-upload/image-upload.component';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'bite',
  imports: [
    PageComponent,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    IonContent,
    ReactiveFormsModule,
    IonSelect,
    IonSelectOption,
    IonText,
    ImageUploadComponent,
    PositionComponent,
  ],
  templateUrl: './bite.page.html',
  styleUrl: './bite.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [
    {
      directive: BiteDirective,
    },
  ],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class BitePage extends BiteDirective {
  private readonly platform = inject(Platform);
  private readonly formBuilder = inject(FormBuilder);

  currency = input<string>();

  position = input<{ latitude: number; longitude: number }>();

  submitNewBite = output<typeof this.biteFormGroup.value>();

  isWeb = signal(!this.platform.is('hybrid'));

  biteFormGroup = this.formBuilder.group({
    image: ['', Validators.required],
    name: ['', Validators.required],
    place: ['', Validators.required],
    price: [null, Validators.required],
    currency: ['EUR', Validators.required],
    tags: [''],
    position: [this.position(), Validators.required],
  });

  currencyInitFromInputEffect = effect(() => {
    const currency = this.currency();

    if (currency) {
      this.biteFormGroup.controls['currency'].patchValue(currency);
    }
  });

  positionInitFromInputEffect = effect(() => {
    const position = this.position();

    if (position) {
      this.biteFormGroup.controls['position'].patchValue(position);
    }
  });

  isInvalid = toSignal(
    this.biteFormGroup.valueChanges.pipe(map(() => !this.biteFormGroup.valid)),
    { initialValue: !this.biteFormGroup.valid }
  );

  imageBase64 = toSignal(this.biteFormGroup.controls['image'].valueChanges);

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

  saveNewBite() {
    if (this.biteFormGroup.valid) {
      const newBite = this.biteFormGroup.value;
      this.submitNewBite.emit(newBite);
    }
  }

  onPositionFromImage(position: { latitude: number; longitude: number }) {
    if (position) {
      this.biteFormGroup.controls['position'].patchValue(position);
    }
  }
}
