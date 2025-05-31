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
import { ImageUploadComponent } from '../image-upload/image-upload.component';
import { Bite } from 'model';

const toTagsString = (tags: string[] | undefined = []) => tags?.join(' ');

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
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class BitePage {
  private readonly platform = inject(Platform);
  private readonly formBuilder = inject(FormBuilder);

  title = input<string>('Create Bite');

  bite = input<Bite>();

  currency = input<string>();

  position = input<{ latitude: number; longitude: number }>();

  submitBite = output<typeof this.biteFormGroup.value>();

  isWeb = signal(!this.platform.is('hybrid'));

  biteFormGroup = this.formBuilder.group({
    id: [''],
    image: ['', Validators.required],
    name: ['', Validators.required],
    place: ['', Validators.required],
    price: [null as number | null, Validators.required],
    currency: ['EUR', Validators.required],
    tags: [''],
    position: [this.position(), Validators.required],
  });

  biteInitFromInputEffect = effect(() => {
    const bite = this.bite();

    if (bite) {
      this.biteFormGroup.patchValue({
        id: bite.id,
        image: bite.image,
        name: bite.name,
        place: bite.place,
        price: bite.price,
        currency: bite.currency,
        tags: toTagsString(bite.tags),
        position: bite.position,
      });
    }
  });

  currencyInitFromInputEffect = effect(() => {
    const currency = this.currency();

    if (currency) {
      this.biteFormGroup.controls['currency'].patchValue(currency);
    }
  });

  positionInitFromInputEffect = effect(() => {
    const bite = this.bite();
    const position = this.position();

    if (!bite && position) {
      this.biteFormGroup.controls['position'].patchValue(position);
      return;
    }

    if (bite) {
      return;
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

  saveBite() {
    if (this.biteFormGroup.valid) {
      const newBite = this.biteFormGroup.value;
      this.submitBite.emit(newBite);
    }
  }

  onPositionFromImage(position: { latitude: number; longitude: number }) {
    if (position) {
      this.biteFormGroup.controls['position'].patchValue(position);
    }
  }
}
