import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonContent,
  IonInput,
  IonNote,
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
import { FloatNumberDotNotationValidator } from '../../validators/float-number-dot-notation.validator';
import { currencyCodes } from 'utils';
import { StarRatingComponent } from 'common/ui/star-rating';
import { TagsInputComponent } from '../tags-input/tags-input.component';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'bite',
  imports: [
    PageComponent,
    IonInput,
    IonButton,
    IonContent,
    ReactiveFormsModule,
    IonSelect,
    IonSelectOption,
    IonText,
    ImageUploadComponent,
    PositionComponent,
    IonNote,
    StarRatingComponent,
    TagsInputComponent,
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

  image = input<string>('');

  currency = input<string>();

  position = input<{ latitude: number; longitude: number }>();

  fallbackPosition = linkedSignal(() => {
    return this.position();
  });

  submitBite = output<typeof this.biteFormGroup.value>();

  startCropImage = output<string | null>();

  isWeb = signal(!this.platform.is('hybrid'));

  currencies = currencyCodes;

  biteFormGroup = this.formBuilder.group({
    id: [''],
    restaurantId: [''],
    image: ['', Validators.required],
    name: ['', Validators.required],
    place: ['', Validators.required],
    price: [
      null as number | null,
      [Validators.required, FloatNumberDotNotationValidator()],
    ],
    currency: ['EUR', Validators.required],
    tags: [[] as string[]],
    position: [this.position(), Validators.required],
    rating: [0, [Validators.min(0), Validators.max(5)]],
  });

  biteInitFromInputEffect = effect(() => {
    const bite = this.bite();
    const image = this.image();

    if (bite) {
      this.biteFormGroup.patchValue({
        id: bite.id,
        image: image || bite.image,
        name: bite.name,
        place: bite.place,
        price: bite.price,
        currency: bite.currency,
        tags: bite.tags || [],
        position: bite.position,
        restaurantId: bite.restaurantId || '',
      });
    }

    if (image) {
      this.biteFormGroup.patchValue({
        image: image,
      });
    }

    if (bite?.position) {
      this.fallbackPosition.set(bite.position);
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

  emitStartCropImage(a: any) {
    this.startCropImage.emit(a);
  }

  setTags(tags: string[]) {
    const tagsControl = this.biteFormGroup.get('tags');
    if (tagsControl) {
      tagsControl.setValue(tags);
    }
  }
}
