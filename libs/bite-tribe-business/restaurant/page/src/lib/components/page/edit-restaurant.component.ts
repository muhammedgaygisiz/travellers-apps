import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  Signal,
  signal,
} from '@angular/core';
import tzlookup from '@photostructure/tz-lookup';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonHeader,
  IonModal,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar,
  IonToggle,
  IonTextarea,
} from '@ionic/angular/standalone';
import {
  Address,
  DaySchedule,
  Geopoint,
  Link,
  LINK_NETWORKS,
  linkNetworkName,
  linkNetworkOf,
  MAX_RESTAURANT_CATEGORIES,
  RESTAURANT_CATEGORIES,
  Restaurant,
  RestaurantCategory,
  RestaurantSection,
  restaurantCategoriesOf,
  MAX_CROSS_CONTAMINATION_NOTE_LENGTH,
  RESTAURANT_DIETARY_STATEMENTS,
  RestaurantDietaryStatement,
  restaurantDietaryStatementsOf,
  TableOrderingSettings,
} from 'model';
import {
  AbstractControl,
  FormArray,
  FormGroup,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';
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
 * The zone a restaurant's own position lies in (GitHub issue #2228), looked
 * up offline. `undefined` without a position: `0, 0` is where a restaurant
 * without one starts, not a place in the Gulf of Guinea.
 */
const positionTimeZone = (
  position: Geopoint | undefined,
): string | undefined => {
  if (!position || (!position.latitude && !position.longitude)) {
    return undefined;
  }

  try {
    return tzlookup(position.latitude, position.longitude);
  } catch {
    return undefined;
  }
};

/** A zone as typed into the search: "new york" finds America/New_York. */
const zoneMatches = (zone: string, query: string): boolean =>
  zone.toLowerCase().replace(/_/g, ' ').includes(query) ||
  zone.toLowerCase().includes(query);

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

/**
 * A form's whole value as a signal, so a `computed` can compare it with the
 * stored restaurant. Raw, so a disabled control still counts.
 */
const valueOf = <T>(form: AbstractControl<unknown, T>): Signal<T> =>
  toSignal(
    form.valueChanges.pipe(
      startWith(null),
      map(() => form.getRawValue()),
    ),
    { initialValue: form.getRawValue() },
  );

/**
 * A link row: the network and its URL, typed in by the owner. A row with
 * neither is one added by mistake and is left out of the save; a row with
 * only one of them is invalid, so it cannot be saved half-done (#2224).
 */
interface LinkRow {
  readonly network: string;
  readonly url: string;
}

const isBlankRow = (row: Partial<LinkRow>): boolean =>
  !row.network && !row.url?.trim();

const completeOrBlank = (
  control: AbstractControl,
): { incomplete: true } | null => {
  const row = control.value as Partial<LinkRow>;

  return isBlankRow(row) || (!!row.network && !!row.url?.trim())
    ? null
    : { incomplete: true };
};

/** The links a form's rows stand for: the filled ones, URLs trimmed. */
const linksOf = (rows: readonly Partial<LinkRow>[]): Link[] =>
  rows
    .filter((row) => !isBlankRow(row))
    .map((row) => ({ network: row.network ?? '', url: row.url?.trim() ?? '' }));

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((value) => b.includes(value));

@Component({
  selector: 'edit-restaurant',
  templateUrl: 'edit-restaurant.component.html',
  styleUrl: './edit-restaurant.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonButton,
    IonIcon,
    IonLabel,
    IonNote,
    IonList,
    ReactiveFormsModule,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonSearchbar,
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
  /** The image check has the photo and has not answered (GitHub issue #2141). */
  photoChecking = input(false);
  photoRefusalCategory = input<string>();
  /**
   * The device's position. The position map opens there for a restaurant
   * that has none yet (GitHub issue #2226).
   */
  gpsPosition = input<Geopoint | null | undefined>();

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
  /**
   * The restaurant's dietary statements and cross-contamination note
   * (issue #2194). Empty removes each field.
   */
  readonly submitDietaryStatements = output<{
    statements: RestaurantDietaryStatement[];
    crossContaminationNote: string;
  }>();
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
    const detected = this.suggestedTimeZone().zone;
    // Reached through a local type rather than `Intl.supportedValuesOf`: the
    // method is newer than the `lib` some of this workspace's tsconfigs target,
    // and the Storybook build is one of them. The guard is needed at runtime
    // anyway, so nothing is lost by not having the type.
    const supported =
      (
        Intl as { supportedValuesOf?: (key: string) => string[] }
      ).supportedValuesOf?.('timeZone') ?? [];

    // The suggested zone is guaranteed to be offered even when the runtime has
    // a list, because a list that somehow omits it would strand the pre-fill.
    return supported.includes(detected) ? supported : [detected, ...supported];
  });

  /**
   * The zone offered to a restaurant that has not chosen one (GitHub issue
   * #2228): its own position's, and the device's only when it has no
   * position. A chain operator setting up a Munich restaurant from Zurich is
   * offered Munich's zone.
   */
  readonly suggestedTimeZone = computed(() => {
    const fromPosition = positionTimeZone(this.restaurant()?.position);

    return fromPosition
      ? { zone: fromPosition, source: 'position' as const }
      : { zone: detectedTimeZone(), source: 'device' as const };
  });

  /** The device's zone, named when the suggestion differs from it. */
  readonly deviceTimeZone = detectedTimeZone();

  /** The searchable zone picker (#2228): open, and what is typed into it. */
  readonly timeZonePickerOpen = signal(false);
  readonly timeZoneQuery = signal('');

  readonly matchingTimeZones = computed(() => {
    const query = this.timeZoneQuery().trim().toLowerCase();

    return query
      ? this.timeZones().filter((zone) => zoneMatches(zone, query))
      : this.timeZones();
  });

  openTimeZonePicker(): void {
    this.timeZoneQuery.set('');
    this.timeZonePickerOpen.set(true);
  }

  chooseTimeZone(zone: string): void {
    const control = this.tableOrderingForm.controls.timeZone;

    control.setValue(zone);
    control.markAsDirty();
    this.timeZonePickerOpen.set(false);
  }

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
      // An unconfigured restaurant is offered its own position's zone, or the
      // one its owner is sitting in without a position (#2228); the note
      // under the picker says which.
      timeZone: tableOrdering?.timeZone || this.suggestedTimeZone().zone,
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

  /**
   * What the restaurant says about its whole kitchen (issue #2194): any of a
   * fixed list of statements, and a free note on cross-contamination that the
   * backend checks before guests read it. One Save for both.
   */
  readonly dietaryStatementOptions = RESTAURANT_DIETARY_STATEMENTS;
  readonly maxCrossContaminationNote = MAX_CROSS_CONTAMINATION_NOTE_LENGTH;

  readonly dietaryForm = this.formBuilder.nonNullable.group({
    statements: [[] as RestaurantDietaryStatement[]],
    crossContaminationNote: [
      '',
      Validators.maxLength(MAX_CROSS_CONTAMINATION_NOTE_LENGTH),
    ],
  });

  initDietary = effect(() => {
    const restaurant = this.restaurant();

    if (this.dietaryForm.dirty) {
      return;
    }

    this.dietaryForm.patchValue({
      statements: restaurantDietaryStatementsOf(restaurant?.dietaryStatements),
      crossContaminationNote: restaurant?.crossContaminationNote ?? '',
    });
  });

  saveDietary(): void {
    if (this.dietaryForm.invalid) {
      return;
    }

    const { statements, crossContaminationNote } =
      this.dietaryForm.getRawValue();

    this.submitDietaryStatements.emit({
      statements,
      crossContaminationNote: crossContaminationNote.trim(),
    });
    this.dietaryForm.markAsPristine();
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
        this.linkRow({
          // A link saved as `twitter` opens as X (#2224).
          network: linkNetworkOf(socialMediaLink.network),
          url: socialMediaLink.url ?? '',
        }),
      );
    });
  });

  /** The networks the picker offers, by name (#2224). */
  readonly linkNetworks = LINK_NETWORKS.map((network) => ({
    network,
    name: linkNetworkName(network),
  }));

  private linkRow(row: LinkRow): FormGroup {
    return this.formBuilder.nonNullable.group(
      { network: [row.network], url: [row.url] },
      { validators: completeOrBlank },
    );
  }

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
    // `0, 0` is where a restaurant without a position starts, not a place:
    // the map opens on the device position instead (#2226), as the overview
    // shows it "Not set yet".
    const stored = this.restaurant()?.position;
    const position =
      stored && (stored.latitude || stored.longitude) ? stored : null;

    if (!this.positionForm.dirty) {
      this.positionForm.patchValue({ position });
    }
  });

  /**
   * A half-filled row blocks the save. No rows at all does not: removing the
   * last link is a change the owner saves (#2224).
   */
  isInvalid = toSignal(
    this.socialMediaForm.valueChanges.pipe(
      map(() => !this.socialMediaForm.valid),
    ),
    { initialValue: !this.socialMediaForm.valid },
  );

  private readonly categoriesValue = valueOf(this.categoriesForm);
  private readonly descriptionValue = valueOf(this.descriptionForm);
  private readonly socialMediaValue = valueOf(this.socialMediaForm);
  private readonly addressValue = valueOf(this.addressForm);
  private readonly positionValue = valueOf(this.positionForm);
  private readonly facilitiesValue = valueOf(this.facilitiesForm);
  private readonly tableOrderingValue = valueOf(this.tableOrderingForm);

  /**
   * Whether each section's form still holds what is stored (GitHub issue
   * #2222). Its Save stays disabled until it does not, like the menu editor's:
   * saving what is already stored writes nothing new and would still say it
   * saved.
   */
  readonly unchanged = computed(() => {
    const restaurant = this.restaurant();
    const address = restaurant?.address;
    const position = this.positionValue().position;
    const tableOrdering = restaurant?.tableOrdering;
    const storedLinks = restaurant?.socialMediaLinks ?? [];
    const links = linksOf(
      (this.socialMediaValue().links ?? []) as Partial<LinkRow>[],
    );

    return {
      categories: sameSet(
        this.categoriesValue().categories,
        restaurantCategoriesOf(restaurant),
      ),
      about:
        (this.descriptionValue().description ?? '') ===
        (restaurant?.description ?? ''),
      links:
        links.length === storedLinks.length &&
        links.every(
          (link, index) =>
            link.network === linkNetworkOf(storedLinks[index].network) &&
            link.url === (storedLinks[index].url ?? ''),
        ),
      address: (['street', 'postcode', 'city', 'country'] as const).every(
        (field) =>
          (this.addressValue()[field] ?? '') === (address?.[field] ?? ''),
      ),
      position:
        position?.latitude === restaurant?.position?.latitude &&
        position?.longitude === restaurant?.position?.longitude,
      facilities:
        this.facilitiesValue().genderNeutralRestroom ===
        toFacilityAnswer(restaurant?.facilities?.genderNeutralRestroom),
      // Against what the form shows: an unconfigured restaurant is offered
      // the suggested zone, which is not a change the owner made.
      tableOrdering:
        !!this.tableOrderingValue().enabled ===
          (tableOrdering?.enabled ?? false) &&
        this.tableOrderingValue().timeZone ===
          (tableOrdering?.timeZone || this.suggestedTimeZone().zone),
    };
  });

  placeName = computed(() => this.restaurant()?.name);

  hasMenu = computed(() => !!this.restaurant()?.menuId);

  /**
   * Adding or removing a row is the owner's edit, so the form is marked
   * dirty: a fresh read of the restaurant must not put the rows back.
   */
  addSocialMedia(): void {
    this.links.push(this.linkRow({ network: '', url: '' }));
    this.socialMediaForm.markAsDirty();
  }

  /** Takes a link off; the save writes the list without it (#2224). */
  removeSocialMedia(index: number): void {
    this.links.removeAt(index);
    this.socialMediaForm.markAsDirty();
  }

  /** Saves the filled rows; a blank one added by mistake is left out. */
  saveSocialMediaLinks(): void {
    if (this.socialMediaForm.valid) {
      this.submitSocialMediaLinks.emit({
        links: linksOf(
          this.socialMediaForm.getRawValue().links as Partial<LinkRow>[],
        ),
      });
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
