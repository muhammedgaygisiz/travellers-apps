import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
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
  IonToggle,
  IonTextarea,
} from '@ionic/angular/standalone';
import {
  Address,
  DaySchedule,
  Geopoint,
  Link,
  MAX_RESTAURANT_CATEGORIES,
  RESTAURANT_CATEGORIES,
  Restaurant,
  RestaurantCategory,
  RestaurantSection,
  restaurantCategoriesOf,
  TableOrderingSettings,
} from 'model';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  RestaurantPhotoEditorComponent,
  RestaurantPhotoStatus,
} from '../restaurant-photo-editor/restaurant-photo-editor.component';
import { TranslocoPipe } from '@jsverse/transloco';
import { PositionComponent } from 'bite-tribe-common/map';
import { OpeningHoursComponent } from 'opening-hours';
import { MenuQrComponent } from '../menu-qr/menu-qr.component';

/**
 * The zone this browser is in, as a starting point rather than an answer.
 *
 * Falls back to `UTC` rather than to nothing. A runtime that reports no zone
 * would otherwise leave the owner with an empty select on a required field -
 * a form they cannot satisfy and no way to see why. `UTC` is visibly a
 * placeholder rather than a plausible wrong answer, which is what a restaurant
 * needs in order to notice and change it.
 */
const detectedTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/**
 * The three answers a restaurant can give about a facility (issue #1830).
 *
 * A string rather than the `boolean | undefined` the model holds, because a
 * select cannot tell `undefined` apart from no selection, and "Not stated" is
 * a choice the owner makes rather than a field they forgot.
 */
type FacilityAnswer = 'yes' | 'no' | 'not-stated';

const toFacilityAnswer = (value: boolean | undefined): FacilityAnswer =>
  value === undefined ? 'not-stated' : value ? 'yes' : 'no';

const fromFacilityAnswer = (answer: FacilityAnswer): boolean | undefined =>
  answer === 'not-stated' ? undefined : answer === 'yes';

@Component({
  selector: 'edit-restaurant',
  templateUrl: 'edit-restaurant.component.html',
  styleUrl: './edit-restaurant.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonButton,
    IonList,
    ReactiveFormsModule,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonInput,
    IonText,
    IonTextarea,
    RestaurantPhotoEditorComponent,
    TranslocoPipe,
    OpeningHoursComponent,
    PositionComponent,
    MenuQrComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditRestaurantComponent {
  private readonly formBuilder = inject(FormBuilder);

  restaurant = input<Restaurant>();
  /** The one part of the restaurant this page edits (GitHub issue #2183). */
  section = input<RestaurantSection>('about');
  /** The photo upload's status for this restaurant (GitHub issue #2126). */
  photoStatus = input<RestaurantPhotoStatus>();
  pendingPhoto = input<string>();
  uploadedImagePath = input<string>();
  canRetryPhoto = input(false);

  readonly savePhoto = output<string>();
  readonly retryPhoto = output<void>();

  readonly submitSocialMediaLinks = output<Partial<{ links: Link[] }>>();

  readonly submitDescription = output<string>();

  readonly submitOpeningHours = output<DaySchedule[]>();

  readonly submitAddress = output<Address>();

  readonly submitPosition = output<Geopoint>();

  readonly submitTableOrderingSettings = output<TableOrderingSettings>();
  /** An empty list is "not stated", which removes the field (issue #2131). */
  readonly submitCategories = output<RestaurantCategory[]>();
  /** `undefined` is "Not stated", which removes the field (issue #1830). */
  readonly submitGenderNeutralRestroom = output<boolean | undefined>();

  readonly socialMediaForm = this.formBuilder.group({
    links: this.formBuilder.array([]),
  });

  readonly descriptionForm = this.formBuilder.group({
    description: [''],
  });

  readonly addressForm = this.formBuilder.group({
    street: [''],
    postcode: [''],
    city: [''],
    country: [''],
  });

  readonly positionForm = this.formBuilder.group({
    position: [null as Geopoint | null],
  });

  /**
   * How this restaurant uses its QR codes (GitHub issue #1102).
   *
   * **Two modes and not three.** `Restaurant.tableOrdering.enabled` is one
   * boolean, and a scan at a restaurant with it off shows the menu either way -
   * so "no table QR" is not a third setting but the absence of a floor plan,
   * and offering it here would be inventing a state the data cannot hold.
   *
   * This is the only writer of the flag. Until it existed, the field #1100
   * added was one nothing set, so every scan in production refused with
   * `tableOrderingDisabled` - the gap recorded in
   * [[Current State - Open Questions]].
   */
  readonly tableOrderingForm = this.formBuilder.group({
    enabled: [false],
    timeZone: ['', Validators.required],
  });

  /**
   * The zones an owner can choose from, newest-browser list first.
   *
   * `Intl.supportedValuesOf` is the real IANA set and is what a chain operator
   * abroad needs, because the zone is not theirs but their restaurant's. Where
   * the runtime has no such list, the detected zone is still offered on its own
   * rather than leaving an empty select.
   */
  readonly timeZones = computed(() => {
    const detected = detectedTimeZone();
    // Reached through a local type rather than `Intl.supportedValuesOf`: the
    // method is newer than the `lib` some of this workspace's tsconfigs target,
    // and the Storybook build is one of them. The guard is needed at runtime
    // anyway, so nothing is lost by not having the type.
    const supported =
      (
        Intl as { supportedValuesOf?: (key: string) => string[] }
      ).supportedValuesOf?.('timeZone') ?? [];

    // The detected zone is guaranteed to be offered even when the runtime has a
    // list, because a list that somehow omits it would strand the pre-fill.
    return supported.includes(detected) ? supported : [detected, ...supported];
  });

  /**
   * Each form is filled from the stored restaurant until the owner edits it,
   * and not after (GitHub issue #2183). Opening a section is a navigation, and
   * every navigation reads the restaurant again; an owner who starts typing
   * before that read lands would otherwise see their edit replaced by the
   * stored value, and save that instead.
   */
  initTableOrdering = effect(() => {
    const tableOrdering = this.restaurant()?.tableOrdering;

    if (this.tableOrderingForm.dirty) {
      return;
    }

    this.tableOrderingForm.patchValue({
      enabled: tableOrdering?.enabled ?? false,
      // An unconfigured restaurant is offered the zone its owner is sitting in,
      // which is right far more often than it is wrong - and wrong is visible,
      // because the opening hours below are read in it.
      timeZone: tableOrdering?.timeZone || detectedTimeZone(),
    });
  });

  submitTableOrdering(): void {
    const { enabled, timeZone } = this.tableOrderingForm.getRawValue();

    if (!timeZone) {
      return;
    }

    // The whole settings object, with the staff-side pause carried through.
    // `updateDocument` replaces a map rather than merging into it, so writing
    // only what this form owns would clear a pause somebody set during service.
    const paused = this.restaurant()?.tableOrdering?.pausedUntilTimestamp;

    this.submitTableOrderingSettings.emit({
      enabled: !!enabled,
      timeZone,
      ...(paused ? { pausedUntilTimestamp: paused } : {}),
    });
  }

  /**
   * What kind of venue the restaurant is (issue #2131): up to
   * `MAX_RESTAURANT_CATEGORIES` of a fixed list. Its own Save, like every
   * other field group on the page.
   */
  readonly categoryOptions = RESTAURANT_CATEGORIES;
  readonly maxCategories = MAX_RESTAURANT_CATEGORIES;

  readonly categoriesForm = this.formBuilder.nonNullable.group({
    categories: [
      [] as RestaurantCategory[],
      Validators.maxLength(MAX_RESTAURANT_CATEGORIES),
    ],
  });

  initCategories = effect(() => {
    const categories = restaurantCategoriesOf(this.restaurant());

    if (!this.categoriesForm.dirty) {
      this.categoriesForm.patchValue({ categories });
    }
  });

  saveCategories(): void {
    if (this.categoriesForm.invalid) {
      return;
    }

    this.submitCategories.emit(this.categoriesForm.getRawValue().categories);
  }

  /**
   * What the restaurant says about its facilities (issue #1830). A field group
   * of its own, with its own Save, so the next facility joins it rather than
   * becoming another section.
   */
  readonly facilitiesForm = this.formBuilder.nonNullable.group({
    genderNeutralRestroom: ['not-stated' as FacilityAnswer],
  });

  initFacilities = effect(() => {
    const facilities = this.restaurant()?.facilities;

    if (this.facilitiesForm.dirty) {
      return;
    }

    this.facilitiesForm.patchValue({
      genderNeutralRestroom: toFacilityAnswer(
        facilities?.genderNeutralRestroom,
      ),
    });
  });

  saveFacilities(): void {
    const { genderNeutralRestroom } = this.facilitiesForm.getRawValue();

    this.submitGenderNeutralRestroom.emit(
      fromFacilityAnswer(genderNeutralRestroom),
    );
  }

  get links(): FormArray {
    return this.socialMediaForm.get('links') as FormArray;
  }

  initSocialMediaLinks = effect(() => {
    const socialMediaLinks = this.restaurant()?.socialMediaLinks;

    if (this.socialMediaForm.dirty) {
      return;
    }

    this.links.clear();

    if (!socialMediaLinks?.length) {
      return;
    }

    socialMediaLinks.forEach((socialMediaLink) => {
      this.links.push(
        this.formBuilder.group({
          network: [socialMediaLink.network, Validators.required],
          url: [socialMediaLink.url, Validators.required],
        }),
      );
    });
  });

  initDescription = effect(() => {
    const description = this.restaurant()?.description ?? '';

    if (!this.descriptionForm.dirty) {
      this.descriptionForm.patchValue({ description });
    }
  });

  initAddress = effect(() => {
    const address = this.restaurant()?.address;

    if (this.addressForm.dirty) {
      return;
    }

    this.addressForm.patchValue({
      street: address?.street ?? '',
      postcode: address?.postcode ?? '',
      city: address?.city ?? '',
      country: address?.country ?? '',
    });
  });

  initPosition = effect(() => {
    const position = this.restaurant()?.position ?? null;

    if (!this.positionForm.dirty) {
      this.positionForm.patchValue({ position });
    }
  });

  isInvalid = toSignal(
    this.socialMediaForm.valueChanges.pipe(
      map(() => {
        if (this.socialMediaForm.controls.links.length === 0) {
          return true;
        }

        return !this.socialMediaForm.valid;
      }),
    ),
    { initialValue: !this.socialMediaForm.valid },
  );

  placeName = computed(() => this.restaurant()?.name);

  hasMenu = computed(() => !!this.restaurant()?.menuId);

  addSocialMedia(): void {
    this.links.push(
      this.formBuilder.group({
        network: ['', Validators.required],
        url: ['', Validators.required],
      }),
    );
  }

  saveSocialMediaLinks(): void {
    if (this.socialMediaForm.valid) {
      const socialMediaLinks = this.socialMediaForm.value;
      this.submitSocialMediaLinks.emit(socialMediaLinks as { links: Link[] });
    }
  }

  saveDescription(): void {
    const description = this.descriptionForm.value.description ?? '';
    this.submitDescription.emit(description);
  }

  saveAddress(): void {
    const { street, postcode, city, country } = this.addressForm.value;
    this.submitAddress.emit({
      street: street ?? '',
      postcode: postcode ?? '',
      city: city ?? '',
      country: country ?? '',
    });
  }

  savePosition(): void {
    const position = this.positionForm.value.position;
    if (position) {
      this.submitPosition.emit(position);
    }
  }
}
