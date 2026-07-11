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
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonModal,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { RestaurantSelectorComponent } from 'restaurant-selector';
import { Platform } from '@ionic/angular';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, filter, map, tap } from 'rxjs';
import { MapComponent, PositionComponent } from 'bite-tribe-common/map';
import { ImageUploadComponent } from 'image-upload';
import type { Bite, Geopoint, GooglePlace, NearbyRestaurant } from 'model';
import { FloatNumberDotNotationValidator } from '../../validators/float-number-dot-notation.validator';
import { StarRatingComponent } from 'common/ui/star-rating';
import { TagsInputComponent } from 'common/ui/tags';
import { normalizePriceForBackend } from './utils/normalize-price-for-backend';
import { ImageValidator } from './utils/image-validator';
import { normalizePriceForForm } from './utils/normalize-price-for-form';
import { ConnectionStatus } from '@capacitor/network';
import { TranslocoPipe } from '@jsverse/transloco';
import { PriceInputComponent } from './price-input/price-input.component';

@Component({
  selector: 'bite',
  imports: [
    PageComponent,
    IonInput,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    ReactiveFormsModule,
    IonText,
    ImageUploadComponent,
    PositionComponent,
    MapComponent,
    StarRatingComponent,
    TagsInputComponent,
    IonTextarea,
    IonModal,
    PriceInputComponent,
    RestaurantSelectorComponent,
    IonIcon,
    IonLabel,
    TranslocoPipe,
  ],
  templateUrl: 'bite.page.html',
  styleUrl: 'bite.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BitePage {
  private readonly platform = inject(Platform);
  private readonly formBuilder = inject(FormBuilder);

  bite = input<Bite>();

  image = input<string>('');

  isNew = input<boolean>(false);

  currency = input<string>();

  currencyLoading = input<boolean>(false);

  favCurrencies = input<string[]>();

  position = input<Geopoint>();

  suggestedTags = input<string[]>([]);

  networkStatus = input<ConnectionStatus | undefined>();

  fallbackPosition = linkedSignal(() => this.position());

  googlePlaces = input<GooglePlace[]>([]);

  googlePlacesLoading = input<boolean>(false);

  nearbyGooglePlaces = input<GooglePlace[]>([]);

  nearbyGooglePlacesLoading = input<boolean>(false);

  submitBite = output<typeof this.biteFormGroup.value>();

  placeChange = output<string>();

  searchGooglePlaces = output<string>();

  requestNearbyGooglePlaces = output<Geopoint>();

  positionChange = output<Geopoint>();

  isWeb = signal(!this.platform.is('hybrid'));

  nearbyRestaurants = input<NearbyRestaurant[]>([]);

  restaurantNames = computed(() =>
    this.nearbyRestaurants().map((restaurant) => restaurant.name),
  );

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
      validators: [ImageValidator],
    },
  );

  networkStatusEffect = effect(() => {
    const networkStatus = this.networkStatus();

    if (networkStatus?.connected === true) {
      this.biteFormGroup.get('image')?.enable();
    } else if (networkStatus?.connected === false) {
      this.biteFormGroup.get('image')?.disable();
    } else {
      return;
    }

    this.biteFormGroup.updateValueAndValidity();
  });

  biteInitFromInputEffect = effect(() => {
    const bite = this.bite();
    const image = this.image();

    if (!bite) {
      return;
    }

    // Price is stored as string in the backend but is a number in the model
    const price = normalizePriceForForm(`${bite.price}`);

    this.biteFormGroup.patchValue({
      id: bite.id,
      image: image || bite.image,
      imagePath: bite.imagePath,
      name: bite.name,
      place: bite.place,
      price,
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
      debounceTime(300),
      distinctUntilChanged(),
      tap((place) => {
        if (place) {
          this.placeChange.emit(place);
        }
      }),
    ),
  );

  selectedPlace = toSignal(this.biteFormGroup.controls['place'].valueChanges, {
    initialValue: this.biteFormGroup.controls['place'].value,
  });

  isRestaurantModalOpen = signal(false);

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
      return 'no-gps-position-error-message';
    }

    if (!chosenImage && !position) {
      return 'chose-gps-position-error-message';
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

  positionValueChanges = toSignal(
    this.biteFormGroup.controls['position'].valueChanges,
  );

  positionChangeEmitter = toSignal(
    this.biteFormGroup.controls['position'].valueChanges.pipe(
      filter((position): position is Geopoint => !!position),
      distinctUntilChanged(
        (a, b) => a.latitude === b.latitude && a.longitude === b.longitude,
      ),
      tap((position) => this.positionChange.emit(position)),
    ),
  );

  imagePosition: WritableSignal<Geopoint | undefined> = signal(undefined);

  manualPosition: WritableSignal<Geopoint | undefined> = signal(undefined);

  confirmedManualPosition: WritableSignal<Geopoint | undefined> =
    signal(undefined);

  googlePosition: WritableSignal<Geopoint | undefined> = signal(undefined);

  isManualPositionModalOpen = signal(false);

  shouldRenderMapInModal = signal(false);

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

  locationFromManual = computed(() => {
    const currentValue = this.positionValueChanges();
    const confirmed = this.confirmedManualPosition();
    return !!(
      confirmed &&
      currentValue?.latitude === confirmed.latitude &&
      currentValue?.longitude === confirmed.longitude
    );
  });

  locationFromGoogle = computed(() => {
    const currentValue = this.positionValueChanges();
    const google = this.googlePosition();
    return !!(
      google &&
      currentValue?.latitude === google.latitude &&
      currentValue?.longitude === google.longitude
    );
  });

  saveBite(): void {
    if (this.biteFormGroup.valid) {
      const newBite = this.biteFormGroup.value;

      newBite.price = normalizePriceForBackend(newBite.price);

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

  openManualPositionModal(): void {
    const currentPosition = this.biteFormGroup.controls['position'].value;
    this.manualPosition.set(currentPosition ?? undefined);
    this.isManualPositionModalOpen.set(true);
    this.shouldRenderMapInModal.set(false);
  }

  onModalDidPresent(): void {
    this.shouldRenderMapInModal.set(true);
  }

  onManualPositionSelected(position: Geopoint): void {
    this.manualPosition.set(position);
  }

  confirmManualPosition(modal: IonModal): void {
    const pos = this.manualPosition();
    if (pos) {
      this.biteFormGroup.controls['position'].patchValue(pos);
      this.confirmedManualPosition.set(pos);
    }
    void modal.dismiss();
    this.isManualPositionModalOpen.set(false);
    this.shouldRenderMapInModal.set(false);
  }

  cancelManualPosition(modal: IonModal): void {
    void modal.dismiss();
    this.isManualPositionModalOpen.set(false);
    this.shouldRenderMapInModal.set(false);
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

  openRestaurantSelector(): void {
    this.isRestaurantModalOpen.set(true);

    // Only fall back to Google nearby suggestions when we have no local
    // restaurants to offer, so the Google callable is hit on demand.
    const hasLocalRestaurants = this.nearbyRestaurants().length > 0;
    const position = this.biteFormGroup.controls['position'].value;

    if (!hasLocalRestaurants && position) {
      this.requestNearbyGooglePlaces.emit(position);
    }
  }

  onRestaurantSelected(restaurantName: string): void {
    const selectedRestaurant = this.nearbyRestaurants().find(
      (restaurant) => restaurant.name === restaurantName,
    );

    // Mirror the Google place selection: patch the position of the selected
    // restaurant when we know it. The custom `Use: "abc"` fallback has no match,
    // so it keeps the current form position. Only verified restaurants carry a
    // restaurantId; unverified/local and fallback picks clear it.
    this.biteFormGroup.patchValue({
      place: restaurantName,
      restaurantId: selectedRestaurant?.restaurantId ?? '',
      ...(selectedRestaurant?.position
        ? { position: selectedRestaurant.position }
        : {}),
    });
    this.isRestaurantModalOpen.set(false);
  }

  onGooglePlaceSelected(place: GooglePlace): void {
    this.biteFormGroup.patchValue({
      place: place.name,
      position: place.position,
      restaurantId: '',
    });
    this.googlePosition.set(place.position);
    this.isRestaurantModalOpen.set(false);
  }

  onPositionFromGoogle(): void {
    const position = this.googlePosition();
    if (position) {
      this.biteFormGroup.controls['position'].patchValue(position);
    }
  }
}
