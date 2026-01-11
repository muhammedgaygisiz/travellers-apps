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
  WritableSignal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonLabel,
  IonModal,
  IonText,
  IonTextarea,
} from '@ionic/angular/standalone';
import { CurrencySelectorComponent } from 'currency-selector';
import { RestaurantSelectorComponent } from 'restaurant-selector';
import { Platform } from '@ionic/angular';
import {
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, tap } from 'rxjs';
import { PositionComponent } from 'bite-tribe-common/map';
import { ImageUploadComponent } from '../image-upload/image-upload.component';
import { Bite, Geopoint } from 'model';
import { FloatNumberDotNotationValidator } from '../../validators/float-number-dot-notation.validator';
import { currencyCodes } from 'utils';
import { StarRatingComponent } from 'common/ui/star-rating';
import { TagsInputComponent } from 'common/ui/tags';
import { getNormalizedPrice } from './utils/get-normalized-price';

@Component({
  selector: 'bite',
  imports: [
    PageComponent,
    IonInput,
    IonButton,
    IonContent,
    ReactiveFormsModule,
    IonText,
    ImageUploadComponent,
    PositionComponent,
    StarRatingComponent,
    TagsInputComponent,
    IonTextarea,
    IonModal,
    CurrencySelectorComponent,
    RestaurantSelectorComponent,
    IonIcon,
    IonLabel,
  ],
  templateUrl: './bite.page.html',
  styleUrl: './bite.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BitePage {
  private readonly platform = inject(Platform);
  private readonly formBuilder = inject(FormBuilder);

  bite = input<Bite>();

  image = input<string>('');

  isNew = input<boolean>(false);

  currency = input<string>();

  position = input<Geopoint>();

  suggestedTags = input<string[]>([]);

  fallbackPosition = linkedSignal(() => {
    return this.position();
  });

  submitBite = output<typeof this.biteFormGroup.value>();

  placeChange = output<string>();

  isWeb = signal(!this.platform.is('hybrid'));

  currencies = currencyCodes;

  nearbyRestaurants = input<string[]>([]);

  biteFormGroup = this.formBuilder.group(
    {
      id: [''],
      restaurantId: [''],
      image: [''],
      imagePath: [''],
      name: ['', Validators.required],
      place: ['', Validators.required],
      description: [''],
      price: [
        null as string | null,
        [Validators.required, FloatNumberDotNotationValidator()],
      ],
      currency: ['EUR', Validators.required],
      tags: [[] as string[]],
      position: [this.position(), Validators.required],
      rating: [0, [Validators.min(0), Validators.max(5)]],
    },
    {
      validators: [
        (fg): ValidationErrors | null => {
          const imageValue = fg.get('image')?.value;
          const imagePathValue = fg.get('imagePath')?.value;

          if (!imageValue && !imagePathValue) {
            return { imageRequired: true };
          }

          return null;
        },
      ],
    },
  );

  biteInitFromInputEffect = effect(() => {
    const bite = this.bite();
    const image = this.image();

    if (!bite) {
      return;
    }

    this.biteFormGroup.patchValue({
      id: bite.id,
      image: image || bite.image,
      imagePath: bite.imagePath,
      name: bite.name,
      place: bite.place,
      price: `${bite.price}`,
      currency: bite.currency,
      tags: bite.tags || [],
      position: bite.position,
      restaurantId: bite.restaurantId || '',
      rating: bite.rating || 0,
      description: bite.description || '',
    });

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

  placeValueChange = toSignal(
    this.biteFormGroup.controls['place'].valueChanges.pipe(
      tap((place) => {
        if (place) {
          this.placeChange.emit(place);
        }
      }),
    ),
  );

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
    { initialValue: !this.biteFormGroup.valid },
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

  imagePathValue = toSignal(
    this.biteFormGroup.valueChanges.pipe(
      map((formValue) => formValue.imagePath),
    ),
  );

  imageUrl = computed(() => {
    const imagePathValue = this.imagePathValue();

    return imagePathValue || undefined;
  });

  currencyValueChanges = toSignal(
    this.biteFormGroup.controls['currency'].valueChanges,
  );

  positionValueChanges = toSignal(
    this.biteFormGroup.controls['position'].valueChanges,
  );

  imagePosition: WritableSignal<Geopoint | undefined> = signal(undefined);

  selectedCurrencyName = computed(() => {
    this.currencyValueChanges();
    const currencyCode = this.biteFormGroup.controls['currency'].value;
    return this.currencies.find((c) => c.code === currencyCode)?.name;
  });

  locationFromImage = computed(() => {
    const currentValue = this.positionValueChanges();
    const position = this.imagePosition();
    return (
      currentValue?.latitude === position?.latitude &&
      currentValue?.longitude === position?.longitude
    );
  });

  locationFromGps = computed(() => {
    const currentValue = this.positionValueChanges();
    const position = this.position();
    return (
      currentValue?.latitude === position?.latitude &&
      currentValue?.longitude === position?.longitude
    );
  });

  saveBite(): void {
    if (this.biteFormGroup.valid) {
      const newBite = this.biteFormGroup.value;

      newBite.price = getNormalizedPrice(newBite.price);

      this.submitBite.emit(newBite);
    }
  }

  onPositionFromImage(position?: Geopoint): void {
    if (position) {
      this.imagePosition.set(position);
      this.biteFormGroup.controls['position'].patchValue(position);
    }
  }

  onPositionFromNavigator(): void {
    const position = this.position();
    if (position) {
      this.biteFormGroup.controls['position'].patchValue(position);
    }
  }

  setTags(tags: string[]): void {
    const tagsControl = this.biteFormGroup.get('tags');
    if (tagsControl) {
      tagsControl.setValue(tags);
    }
  }

  resetImagePath(): void {
    this.biteFormGroup.get('imagePath')?.reset();
    this.imagePosition.set(undefined);
  }

  onCurrencySelected(currencyCode: string, modal: IonModal): void {
    this.biteFormGroup.patchValue({ currency: currencyCode });
    modal.dismiss();
  }

  onRestaurantSelected(restaurantName: string, modal: IonModal): void {
    this.biteFormGroup.patchValue({ place: restaurantName });
    modal.dismiss();
  }
}
