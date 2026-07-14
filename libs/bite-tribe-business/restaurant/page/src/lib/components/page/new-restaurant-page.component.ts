import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  AlertController,
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonList,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTextarea,
} from '@ionic/angular/standalone';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Address,
  Bite,
  DaySchedule,
  Geopoint,
  GooglePlace,
  Link,
  PlaceDetails,
  Restaurant,
} from 'model';
import { map } from 'rxjs';
import { BiteComponent } from 'bite-tribe-common/bite';
import { PositionComponent } from 'bite-tribe-common/map';
import { ImageUploadComponent } from 'image-upload';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  GooglePlaceOption,
  RestaurantSelectorComponent,
} from 'restaurant-selector';
import { OpeningHoursComponent } from '../opening-hours/opening-hours.component';

/** Form controls that the Google Places prefill overwrites. */
const PREFILLABLE_CONTROLS = [
  'name',
  'description',
  'street',
  'postcode',
  'city',
  'country',
] as const;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'new-restaurant-page',
  templateUrl: 'new-restaurant-page.component.html',
  styleUrl: 'new-restaurant-page.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonInput,
    IonItem,
    IonList,
    IonModal,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonText,
    ReactiveFormsModule,
    IonButton,
    BiteComponent,
    PositionComponent,
    ImageUploadComponent,
    IonTextarea,
    TranslocoPipe,
    RestaurantSelectorComponent,
    OpeningHoursComponent,
  ],
})
export class NewRestaurantPageComponent {
  restaurant = input<Restaurant>();
  googlePlaces = input<GooglePlace[]>([]);
  googlePlacesLoading = input<boolean>(false);
  placeDetails = input<PlaceDetails | undefined>(undefined);
  placeDetailsLoading = input<boolean>(false);

  private readonly formBuilder = inject(FormBuilder);
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  submitNewRestaurant = output<Restaurant>();
  readonly biteClick = output<Bite>();
  readonly requestPrefillPlaces = output<{
    name: string;
    position?: Geopoint;
  }>();
  readonly searchGooglePlaces = output<string>();
  readonly googlePlaceSelected = output<string>();

  restaurantFormGroup = this.formBuilder.group({
    image: ['', Validators.required],
    name: ['', Validators.required],
    description: [''],
    position: [null as Geopoint | null, Validators.required],
    street: [''],
    postcode: [''],
    city: [''],
    country: [''],
  });

  readonly socialMediaForm = this.formBuilder.group({
    links: this.formBuilder.array([]),
  });

  /** Seeds the opening-hours editor on prefill. Live edits are read back from
   * the editor at save time via {@link openingHoursComponent}. */
  readonly openingHours = signal<DaySchedule[]>([]);

  private readonly openingHoursComponent = viewChild(OpeningHoursComponent);

  readonly isPrefillModalOpen = signal(false);

  /** Guards the apply effect so the same details object is only applied once. */
  private lastAppliedDetails?: PlaceDetails;

  get links(): FormArray {
    return this.socialMediaForm.get('links') as FormArray;
  }

  prefillEffect = effect(() => {
    const restaurant = this.restaurant();
    const firstBite = restaurant?.bites?.[0];

    if (restaurant?.name) {
      this.restaurantFormGroup.controls['name'].patchValue(restaurant.name);
    }

    if (restaurant?.description) {
      this.restaurantFormGroup.controls['description'].patchValue(
        restaurant.description,
      );
    }

    const position = restaurant?.position || firstBite?.position;
    if (position) {
      this.restaurantFormGroup.controls['position'].patchValue(position);
    }

    if (restaurant?.address) {
      const { street, postcode, city, country } = restaurant.address;
      this.restaurantFormGroup.patchValue({
        street: street ?? '',
        postcode: postcode ?? '',
        city: city ?? '',
        country: country ?? '',
      });
    }
  });

  applyPlaceDetailsEffect = effect(() => {
    const details = this.placeDetails();

    if (!details || details === this.lastAppliedDetails) {
      return;
    }

    this.lastAppliedDetails = details;
    void this.applyPlaceDetails(details);
  });

  isInvalid = toSignal(
    this.restaurantFormGroup.valueChanges.pipe(
      map(() => {
        return !this.restaurantFormGroup.valid;
      }),
    ),
    { initialValue: !this.restaurantFormGroup.valid },
  );

  addSocialMedia(): void {
    this.links.push(
      this.formBuilder.group({
        network: ['', Validators.required],
        url: ['', Validators.required],
      }),
    );
  }

  /** Opens the reused restaurant selector, seeded with the candidate name + position. */
  openPrefillSelector(): void {
    this.isPrefillModalOpen.set(true);

    const name = this.restaurantFormGroup.controls['name'].value ?? '';
    const position =
      this.restaurantFormGroup.controls['position'].value ?? undefined;

    if (name) {
      this.requestPrefillPlaces.emit({ name, position });
    }
  }

  onGooglePlaceSelected(place: GooglePlaceOption): void {
    this.isPrefillModalOpen.set(false);
    this.googlePlaceSelected.emit(place.placeId);
  }

  private async applyPlaceDetails(details: PlaceDetails): Promise<void> {
    if (this.hasDirtyPrefillableField()) {
      const confirmed = await this.confirmOverwrite();

      if (!confirmed) {
        return;
      }
    }

    this.fillFromPlaceDetails(details);
  }

  private hasDirtyPrefillableField(): boolean {
    const controlDirty = PREFILLABLE_CONTROLS.some(
      (control) => this.restaurantFormGroup.get(control)?.dirty,
    );

    // Opening hours have no dirty flag on this page; treat any entered day
    // (from a manual edit or a prior prefill) as a value worth confirming
    // before wiping.
    const hasOpeningHours = (
      this.openingHoursComponent()?.getOpeningHours() ?? []
    ).some((day) => day.isOpen);

    return controlDirty || hasOpeningHours;
  }

  private async confirmOverwrite(): Promise<boolean> {
    const alert = await this.alertController.create({
      header: this.transloco.translate('prefill-confirm-title'),
      message: this.transloco.translate('prefill-confirm-message'),
      buttons: [
        {
          text: this.transloco.translate('cancel'),
          role: 'cancel',
        },
        {
          text: this.transloco.translate('prefill-confirm-replace'),
          role: 'confirm',
        },
      ],
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();

    return role === 'confirm';
  }

  /**
   * Fills the prefillable fields from Google Places. The position and image
   * fields are never touched: the candidate's clustered position stays the
   * ground truth and images stay operator-owned.
   */
  private fillFromPlaceDetails(details: PlaceDetails): void {
    this.restaurantFormGroup.patchValue({
      name: details.name,
      // Only overwrite About when Google actually returned a summary.
      ...(details.description ? { description: details.description } : {}),
      street: details.address.street ?? '',
      postcode: details.address.postcode ?? '',
      city: details.address.city ?? '',
      country: details.address.country ?? '',
    });

    this.openingHours.set(details.openingHours ?? []);
  }

  saveNewRestaurant(): void {
    if (this.restaurantFormGroup.valid) {
      const {
        image,
        name,
        position,
        description,
        street,
        postcode,
        city,
        country,
      } = this.restaurantFormGroup.value;
      const biteIds = this.restaurant()?.biteIds || [];
      const restaurantCandidateId = this.restaurant()?.restaurantCandidateId;

      const address: Address = {
        street: street ?? '',
        postcode: postcode ?? '',
        city: city ?? '',
        country: country ?? '',
      };

      const socialMediaLinks =
        this.socialMediaForm.valid && this.links.length > 0
          ? (
              this.socialMediaForm.value.links as {
                network: string;
                url: string;
              }[]
            ).map((link): Link => ({ network: link.network, url: link.url }))
          : [];

      this.submitNewRestaurant.emit({
        image: image as string,
        name: name as string,
        description: description as string,
        position: position as Geopoint,
        address,
        restaurantCandidateId,
        biteIds,
        socialMediaLinks,
        openingHours: this.openingHoursComponent()?.getOpeningHours() ?? [],
      } as Restaurant);
    }
  }
}
