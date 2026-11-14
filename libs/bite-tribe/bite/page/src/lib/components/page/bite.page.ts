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
  untracked,
  viewChild,
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
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
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
import {
  MapComponent,
  MarkerColor,
  PositionComponent,
} from 'bite-tribe-common/map';
import { ImageUploadComponent } from 'image-upload';
import {
  getMediaLocationPermissionState,
  openMediaLocationSettings,
  requestMediaLocationPermission,
  type MediaLocationPermissionState,
} from 'media-location';
import type {
  Bite,
  Geopoint,
  GooglePlace,
  NearbyRestaurant,
  PositionSource,
  PublicUser,
} from 'model';
import { FloatNumberDotNotationValidator } from '../../validators/float-number-dot-notation.validator';
import { StarRatingComponent } from 'common/ui/star-rating';
import { TagsInputComponent } from 'common/ui/tags';
import { normalizePriceForBackend } from './utils/normalize-price-for-backend';
import { ImageValidator } from './utils/image-validator';
import { normalizePriceForForm } from './utils/normalize-price-for-form';
import {
  getRestaurantsNearBite,
  hasRestaurantNearBite,
} from './utils/restaurants-near-bite';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { copiedPriceDate } from './utils/copied-price-date';
import { PriceInputComponent } from './price-input/price-input.component';
import {
  AteWithPickerComponent,
  MAX_TAGGED_USERS,
} from './ate-with/ate-with-picker.component';
import {
  POSITION_SOURCE_COLORS,
  POSITION_SOURCE_LABEL_KEYS,
  PositionCandidate,
  UNKNOWN_POSITION_SOURCE_LABEL_KEY,
} from './model/position-source';

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
    AteWithPickerComponent,
    IonTextarea,
    IonModal,
    PriceInputComponent,
    RestaurantSelectorComponent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    TranslocoPipe,
  ],
  templateUrl: 'bite.page.html',
  styleUrl: 'bite.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BitePage {
  private readonly platform = inject(Platform);
  private readonly formBuilder = inject(FormBuilder);
  private readonly transloco = inject(TranslocoService);

  private readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang?.() || 'en',
  });

  bite = input<Bite>();

  image = input<string>('');

  isNew = input<boolean>(false);

  /**
   * Transloco key for the page heading. Derived from {@link isNew} rather than
   * passed in separately, so the create and the edit page cannot end up naming
   * themselves the same thing again (issue #1365).
   */
  titleKey = computed(() => (this.isNew() ? 'create-bite' : 'edit-bite'));

  /**
   * The month and year of a copied price old enough to be worth checking, in
   * the reader's language (GitHub issue #2018). Empty on an edit, on a Bite
   * typed from scratch, and on a fresh copy.
   */
  copiedPriceMonth = computed(() => {
    const date = this.isNew() ? copiedPriceDate(this.bite()) : undefined;

    if (!date) {
      return '';
    }

    return new Intl.DateTimeFormat(this.activeLang(), {
      month: 'long',
      year: 'numeric',
    }).format(date);
  });

  currency = input<string>();

  currencyLoading = input<boolean>(false);

  favCurrencies = input<string[]>();

  position = input<Geopoint>();

  suggestedTags = input<string[]>([]);

  /**
   * The accounts the creator may tag as somebody they ate with: followed,
   * public, and not blocked (GitHub issue #1917).
   */
  taggableUsers = input<PublicUser[]>([]);

  /**
   * Profiles of users the Bite already tags, so a chip keeps its name when
   * the creator has unfollowed that user since.
   */
  taggedUsers = input<PublicUser[]>([]);

  fallbackPosition = linkedSignal(() => this.position());

  googlePlaces = input<GooglePlace[]>([]);

  googlePlacesLoading = input<boolean>(false);

  nearbyGooglePlaces = input<GooglePlace[]>([]);

  nearbyGooglePlacesLoading = input<boolean>(false);

  /**
   * The photo position stored privately for the Bite being edited (GitHub
   * issue #1290). The Bite's own photo was re-encoded without its EXIF, so
   * this is what lets the position modal offer the photo source again.
   */
  storedPhotoPosition = input<Geopoint>();

  submitBite = output<BiteSubmission>();

  /**
   * Emitted when the Bite is posted but the user stays on the form to create
   * another Bite at the same place.
   */
  submitBiteAndAddAnother = output<BiteSubmission>();

  placeChange = output<string>();

  searchGooglePlaces = output<string>();

  requestNearbyGooglePlaces = output<Geopoint>();

  positionChange = output<Geopoint>();

  isWeb = signal(!this.platform.is('hybrid'));

  nearbyRestaurants = input<NearbyRestaurant[]>([]);

  readonly ionContent = viewChild(IonContent);

  private readonly tagsInput = viewChild(TagsInputComponent);

  /** Tags of the Bites already posted in this "add another Bite" session. */
  private readonly previouslyPostedTags = signal<string[]>([]);

  /**
   * Suggestions offered by the tags input: the tags of the Bites just posted at
   * this place first, then the place-based suggestions from the store.
   */
  readonly tagSuggestions = computed(() => [
    ...new Set([...this.previouslyPostedTags(), ...this.suggestedTags()]),
  ]);

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
      // A real control, because the form value is what reaches Firestore: a
      // Bite field outside the form group is silently dropped (issue #1917).
      taggedUserIds: [[] as string[], Validators.maxLength(MAX_TAGGED_USERS)],
      position: [this.position(), Validators.required],
      // Null rather than undefined: the whole form value is handed to Firestore,
      // which rejects an undefined field and takes the Bite down with it. That
      // is what lost menu-derived Bites in issue #1233.
      positionSource: [null as PositionSource | null],
      rating: [0, [Validators.min(0), Validators.max(5)]],
    },
    {
      validators: [ImageValidator],
    },
  );

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
      // A prefilled draft (menu item, or an existing Bite posted again) carries
      // no photo of its own. Patching the missing path through as `undefined`
      // put an unsupported value in the document Firestore is asked to write, so
      // the Bite was rejected while the form reported a successful post.
      imagePath: bite.imagePath || '',
      name: bite.name,
      place: bite.place,
      price,
      currency: bite.currency,
      tags: bite.tags || [],
      taggedUserIds: bite.taggedUserIds || [],
      position: bite.position,
      positionSource: bite.positionSource ?? null,
      restaurantId: bite.restaurantId || '',
      rating: bite.rating || 0,
      description: bite.description || '',
    });

    if (bite?.position) {
      this.fallbackPosition.set(bite.position);
      // Bites written before the source was recorded carry none, and the row
      // reports that as an unknown source rather than guessing one.
      this.positionSource.set(bite.positionSource ?? undefined);
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

    if (bite || !position) {
      return;
    }

    // The device fix keeps flowing in while the form is open. It may prefill and
    // then follow the device, but once the user has picked another source it
    // must not overwrite that choice: the source row reports the position's
    // origin, so a silent overwrite would read as a spontaneous switch to GPS.
    const chosenSource = untracked(() => this.positionSource());

    if (chosenSource && chosenSource !== 'gps') {
      return;
    }

    this.biteFormGroup.controls['position'].patchValue(position);
    this.positionSource.set('gps');
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

  currentPosition = toSignal(
    this.biteFormGroup.controls['position'].valueChanges,
    { initialValue: this.biteFormGroup.controls['position'].value },
  );

  /**
   * The local restaurants offered as candidates for this Bite. The input list is
   * built around the device, so it has to be measured against the Bite's own
   * position before it is shown: a Bern restaurant is never the place a Bite in
   * Ronda belongs to. See GitHub issue #1307.
   */
  restaurantsNearBite = computed(() =>
    getRestaurantsNearBite(
      this.nearbyRestaurants(),
      this.currentPosition() ?? undefined,
    ),
  );

  /**
   * True while nothing local answers "which place is this Bite" for the position
   * the Bite currently carries. That is both when the Google lookup is worth a
   * callable and when its result is worth showing.
   */
  needsGoogleFallback = computed(
    () =>
      !hasRestaurantNearBite(
        this.nearbyRestaurants(),
        this.currentPosition() ?? undefined,
      ),
  );

  /**
   * Google suggestions are a fallback for a Bite the local list cannot place, so
   * they are dropped again as soon as it can. Without this, results fetched for
   * a far-away position would still be listed after the Bite is moved back to
   * where the device is.
   */
  googleFallbackPlaces = computed(() =>
    this.needsGoogleFallback() ? this.nearbyGooglePlaces() : [],
  );

  googleFallbackLoading = computed(
    () => this.needsGoogleFallback() && this.nearbyGooglePlacesLoading(),
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

  /**
   * Whether the photo was picked or removed in this form, rather than being the
   * one the Bite was opened with. Only then does the edit path rewrite the
   * stored photo position (GitHub issue #1290): a save before the stored one
   * has loaded must not delete it.
   */
  private readonly photoChanged = signal(false);

  /**
   * Whether the photo being picked reported a position. Every picker reports
   * the position before it reports the pick, so the pick can tell a photo
   * without one from a photo that has one.
   */
  private positionCameWithPick = false;

  storedPhotoPositionEffect = effect(() => {
    const stored = this.storedPhotoPosition();

    if (stored && !untracked(() => this.photoChanged())) {
      this.imagePosition.set(stored);
    }
  });

  /**
   * The photo position handed on with the Bite, to be stored where only its
   * author can read it. On the edit path `undefined` means the photo did not
   * change and the stored position stays as it is; `null` means the photo now
   * has none.
   */
  private photoPositionToSubmit(): Geopoint | null | undefined {
    if (!this.isNew() && !this.photoChanged()) {
      return undefined;
    }

    const position = this.imagePosition();

    return position
      ? { latitude: position.latitude, longitude: position.longitude }
      : null;
  }

  private readonly imageUpload = viewChild(ImageUploadComponent);

  /** Where the photo in the form came from; only a gallery pick can be redacted. */
  private readonly imagePickedFrom = signal<
    'camera' | 'gallery' | 'web' | undefined
  >(undefined);

  /**
   * OS media location permission, read once when the form opens and again after
   * the user acts on it here. Resting on `unsupported` keeps every non-Android
   * surface - including Storybook - out of the recovery row entirely.
   */
  private readonly mediaLocationPermission =
    signal<MediaLocationPermissionState>('unsupported');

  private readonly photoLocationRequestRunning = signal(false);

  /**
   * Whether a gallery photo lost its position to Android's redaction rather
   * than simply never having had one.
   *
   * All three conditions matter. A camera capture is the app's own file and is
   * never stripped, a photo that did resolve a position proves the grant is
   * working, and on a granted or unsupported permission there is nothing to
   * offer. Getting this wrong means telling a user to change a setting that
   * would not have helped. See GitHub issue #1394.
   */
  readonly photoPositionBlockedByPermission = computed(
    () =>
      this.imagePickedFrom() === 'gallery' &&
      !this.imagePosition() &&
      (this.mediaLocationPermission() === 'prompt' ||
        this.mediaLocationPermission() === 'denied'),
  );

  /** Whether the OS prompt is still worth spending, rather than the settings page. */
  readonly canRequestPhotoLocation = computed(
    () => this.mediaLocationPermission() === 'prompt',
  );

  readonly isRequestingPhotoLocation =
    this.photoLocationRequestRunning.asReadonly();

  /** Position picked on the map inside the edit modal, before confirming. */
  manualPosition: WritableSignal<Geopoint | undefined> = signal(undefined);

  confirmedManualPosition: WritableSignal<Geopoint | undefined> =
    signal(undefined);

  googlePosition: WritableSignal<Geopoint | undefined> = signal(undefined);

  restaurantPosition: WritableSignal<Geopoint | undefined> = signal(undefined);

  /** Where the position currently in the form came from. */
  positionSource: WritableSignal<PositionSource | undefined> =
    signal(undefined);

  /**
   * Mirrors the source into the form group, which is what reaches the backend.
   * Storing it means a Bite reopened for editing can still name its source
   * instead of falling back to the unknown label.
   */
  positionSourcePersistEffect = effect(() => {
    const source = this.positionSource();

    this.biteFormGroup.controls['positionSource'].setValue(source ?? null, {
      emitEvent: false,
    });
  });

  isPositionSourceModalOpen = signal(false);

  /** Source highlighted in the modal, applied to the form only on confirm. */
  draftSource: WritableSignal<PositionSource | undefined> = signal(undefined);

  shouldRenderMapInModal = signal(false);

  /** Transloco key for the row that states where the position came from. */
  currentSourceLabelKey = computed(() => {
    const source = this.positionSource();

    return source
      ? POSITION_SOURCE_LABEL_KEYS[source]
      : UNKNOWN_POSITION_SOURCE_LABEL_KEY;
  });

  /**
   * Colour of the marker on the form, taken from the same table the modal
   * colours its candidates with. Without it the form drew every position red -
   * the colour of the photo source - while naming a different source next to it
   * (issue #1325). An unknown source keeps the map's default.
   */
  currentSourceColor = computed(() => {
    const source = this.positionSource();

    return source ? POSITION_SOURCE_COLORS[source] : undefined;
  });

  positionCandidates = computed<PositionCandidate[]>(() => {
    const lookedUp = (
      source: Exclude<PositionSource, 'manual'>,
      position: Geopoint | undefined,
      unavailableReasonKey: string,
    ): PositionCandidate => ({
      source,
      labelKey: POSITION_SOURCE_LABEL_KEYS[source],
      color: POSITION_SOURCE_COLORS[source],
      position,
      disabled: !position,
      ...(position ? {} : { unavailableReasonKey }),
    });

    return [
      lookedUp(
        'photo',
        this.imagePosition(),
        // Naming the permission only where it is actually the cause; otherwise
        // the honest answer stays "no GPS in photo".
        this.photoPositionBlockedByPermission()
          ? 'photo-position-permission-off'
          : 'no-photo-position',
      ),
      lookedUp('gps', this.position(), 'no-device-position'),
      lookedUp(
        'restaurant',
        this.restaurantPosition(),
        'no-restaurant-position',
      ),
      lookedUp('google', this.googlePosition(), 'no-google-position'),
      // Manual is never unavailable: it is a pick on the map, not a lookup that
      // can come back empty.
      {
        source: 'manual',
        labelKey: POSITION_SOURCE_LABEL_KEYS.manual,
        color: POSITION_SOURCE_COLORS.manual,
        position: this.confirmedManualPosition(),
        disabled: false,
      },
    ];
  });

  /**
   * True only while the user is actively picking on the map. Reopening the
   * modal on a manual position starts in the comparison view instead, so the
   * manual point can be weighed against the other sources before editing it.
   */
  isManualDraftMode = signal(false);

  /** Position the modal would apply, used to gate the confirm button. */
  draftPosition = computed(() => {
    const source = this.draftSource();

    if (!source) {
      return undefined;
    }

    if (source === 'manual') {
      return this.manualPosition();
    }

    return this.positionCandidates().find(
      (candidate) => candidate.source === source,
    )?.position;
  });

  /**
   * Candidates as map markers. The source is carried in `id` so a marker click
   * resolves back to its source without comparing coordinates.
   */
  candidateGeopoints = computed<Geopoint[]>(() =>
    this.positionCandidates().flatMap((candidate) =>
      candidate.position
        ? [
            {
              id: candidate.source,
              latitude: candidate.position.latitude,
              longitude: candidate.position.longitude,
            },
          ]
        : [],
    ),
  );

  candidateMarkerColors = computed<Record<string, MarkerColor>>(() =>
    Object.fromEntries(
      this.positionCandidates().map((candidate) => [
        candidate.source,
        candidate.color,
      ]),
    ),
  );

  /**
   * The modal map compares the candidates, and switches to a single draggable
   * marker while the manual source is selected.
   */
  modalGeopoints = computed<Geopoint[]>(() => {
    if (!this.isManualDraftMode()) {
      return this.candidateGeopoints();
    }

    const manualPosition = this.manualPosition();

    // Tagged with the source so the draft marker takes the manual colour the
    // swatch in the list promises, instead of falling back to the default red.
    return manualPosition
      ? [
          {
            id: 'manual',
            latitude: manualPosition.latitude,
            longitude: manualPosition.longitude,
          },
        ]
      : [];
  });

  saveBite(): void {
    const newBite = this.toSubmittableBite();

    if (newBite) {
      this.submitBite.emit(newBite);
    }
  }

  /**
   * Posts the Bite and keeps the user on the form so the next Bite at the same
   * place can be entered right away. Restaurant, currency, and position stay,
   * everything Bite-specific is cleared.
   */
  saveBiteAndAddAnother(): void {
    const newBite = this.toSubmittableBite();

    if (!newBite) {
      return;
    }

    this.submitBiteAndAddAnother.emit(newBite);
    this.resetForNextBite(newBite.tags || []);
  }

  private toSubmittableBite(): BiteSubmission | undefined {
    // A tag that was typed but never separated with a space is still sitting in
    // the tag field, and was posted as nothing at all (issue #1391). Committing
    // it here means the Bite carries the tags the user can see on the form.
    this.tagsInput()?.commitPendingTag();

    if (!this.biteFormGroup.valid) {
      return undefined;
    }

    // Raw value, not `value`: Angular leaves disabled controls out of `value`,
    // so a control disabled between picking and saving takes its value with it.
    // The form used to disable the image control while the device was offline,
    // which silently posted the Bite without the photo the user had picked: no
    // `image` reached the data access layer, so no upload started, no
    // `imageStatus: 'pending'` was written, and the failed/retry recovery was
    // never armed for it (issue #1229).
    const newBite = this.biteFormGroup.getRawValue();

    newBite.price = normalizePriceForBackend(newBite.price);

    return { ...newBite, photoPosition: this.photoPositionToSubmit() };
  }

  private resetForNextBite(postedTags: string[]): void {
    this.previouslyPostedTags.update((tags) => [
      ...new Set([...postedTags, ...tags]),
    ]);

    this.biteFormGroup.patchValue({
      id: '',
      image: '',
      imagePath: '',
      name: '',
      description: '',
      price: null,
      rating: 0,
      tags: [],
    });
    this.biteFormGroup.markAsPristine();
    this.biteFormGroup.markAsUntouched();

    this.imagePosition.set(undefined);
    this.photoChanged.set(false);

    // The position carries over to the next Bite, but the photo it came from is
    // gone, so the row stops attributing it to a source it can no longer offer.
    if (this.positionSource() === 'photo') {
      this.positionSource.set(undefined);
    }

    const ionContent = this.ionContent();

    if (ionContent) {
      ionContent.scrollToTop(300);
    }
  }

  onPositionFromImage(position?: Geopoint): void {
    if (position) {
      this.positionCameWithPick = true;
      this.imagePosition.set(position);
      this.biteFormGroup.controls['position'].patchValue(position);
      this.positionSource.set('photo');
    }
  }

  /**
   * Records which surface the photo came from, and reads the media location
   * permission the first time a gallery pick makes it relevant.
   *
   * The read is deferred to here rather than done when the form opens: it is
   * only ever used to explain a gallery photo with no position, and a form the
   * user never attaches a gallery photo to should not ask the OS anything.
   */
  async onImagePickedFrom(source: 'camera' | 'gallery' | 'web'): Promise<void> {
    this.imagePickedFrom.set(source);
    this.photoChanged.set(true);

    // A photo without a position must not inherit the previous photo's, or the
    // stored one the edited Bite was opened with: that position would then be
    // stored as this photo's (GitHub issue #1290).
    if (!this.positionCameWithPick) {
      this.imagePosition.set(undefined);

      if (this.positionSource() === 'photo') {
        this.positionSource.set(undefined);
      }
    }

    this.positionCameWithPick = false;

    if (source === 'gallery') {
      this.mediaLocationPermission.set(await getMediaLocationPermissionState());
    }
  }

  /**
   * The recovery action on the disabled photo row: spend the OS prompt while
   * one is left, otherwise open the app's page in the system settings.
   *
   * This is an explicit user action on a surface that has just explained why
   * the position is missing, which is what the Contextual Permission Rule
   * allows - unlike the picker, which asked before the user had any reason to
   * care. Opening the OS page keeps the app's activity alive, so the half-filled
   * Bite draft survives; navigating to the app's own Settings page would end the
   * creation session and drop it.
   */
  async recoverPhotoLocation(): Promise<void> {
    if (this.photoLocationRequestRunning()) {
      return;
    }

    if (!this.canRequestPhotoLocation()) {
      await openMediaLocationSettings();
      return;
    }

    this.photoLocationRequestRunning.set(true);

    try {
      const result = await requestMediaLocationPermission();

      this.mediaLocationPermission.set(
        result === 'granted' ? 'granted' : 'denied',
      );

      // The photo was already read once, with its location stripped, and
      // nothing else would look at it again.
      if (result === 'granted') {
        await this.imageUpload()?.rereadPositionFromLastPick();

        // The reread reports after the pick, so the flag it raised belongs to
        // no pick and must not vouch for the next one.
        this.positionCameWithPick = false;
      }
    } finally {
      this.photoLocationRequestRunning.set(false);
    }
  }

  onPositionFromNavigator(): void {
    const position = this.position();
    if (position) {
      this.biteFormGroup.controls['position'].patchValue(position);
      this.positionSource.set('gps');
    }
  }

  openPositionSourceModal(): void {
    const currentPosition = this.biteFormGroup.controls['position'].value;

    this.draftSource.set(this.positionSource());
    this.manualPosition.set(
      this.confirmedManualPosition() ?? currentPosition ?? undefined,
    );
    this.isManualDraftMode.set(false);
    this.isPositionSourceModalOpen.set(true);
    this.shouldRenderMapInModal.set(false);
  }

  onModalDidPresent(): void {
    this.shouldRenderMapInModal.set(true);
  }

  selectDraftSource(source: PositionSource): void {
    // Entering manual mode starts from whatever was highlighted, so the map
    // keeps a marker to drag instead of dropping the user on a blank world map.
    if (source === 'manual' && !this.manualPosition()) {
      this.manualPosition.set(
        this.draftPosition() ??
          this.biteFormGroup.controls['position'].value ??
          undefined,
      );
    }

    this.draftSource.set(source);
    this.isManualDraftMode.set(source === 'manual');
  }

  /** A background tap on the map emits `undefined`, which must not deselect. */
  onCandidateMarkerClick(geopoint: Geopoint | undefined): void {
    const source = geopoint?.id as PositionSource | undefined;

    if (source) {
      this.selectDraftSource(source);
    }
  }

  onManualPositionSelected(position: Geopoint): void {
    this.manualPosition.set(position);
  }

  confirmPositionSource(modal: IonModal): void {
    const source = this.draftSource();
    const position = this.draftPosition();

    if (source && position) {
      this.biteFormGroup.controls['position'].patchValue(position);
      this.positionSource.set(source);

      if (source === 'manual') {
        this.confirmedManualPosition.set(position);
      }
    }

    void modal.dismiss();
    this.closePositionSourceModal();
  }

  closePositionSourceModal(): void {
    this.isPositionSourceModalOpen.set(false);
    this.shouldRenderMapInModal.set(false);
    this.isManualDraftMode.set(false);
  }

  setTags(tags: string[]): void {
    const tagsControl = this.biteFormGroup.get('tags');
    if (tagsControl) {
      tagsControl.setValue(tags);
    }
  }

  setTaggedUserIds(taggedUserIds: string[]): void {
    this.biteFormGroup.controls['taggedUserIds'].setValue(taggedUserIds);
  }

  resetImagePath(): void {
    this.biteFormGroup.get('imagePath')?.reset();
    this.imagePosition.set(undefined);
    this.photoChanged.set(true);
    this.positionCameWithPick = false;

    // Clearing the photo makes `image-upload` patch the device position back
    // in, so the row must stop claiming the position came from the photo.
    if (this.positionSource() === 'photo') {
      this.positionSource.set(this.position() ? 'gps' : undefined);
    }
  }

  openRestaurantSelector(): void {
    this.isRestaurantModalOpen.set(true);

    // Only fall back to Google nearby suggestions when no local restaurant sits
    // near the Bite, so the Google callable is hit on demand. Asking whether the
    // local list is non-empty instead let a list of restaurants around the
    // device suppress the lookup for a Bite posted 1535 km away.
    const position = this.biteFormGroup.controls['position'].value;

    if (this.needsGoogleFallback() && position) {
      this.requestNearbyGooglePlaces.emit(position);
    }
  }

  onRestaurantSelected(restaurantName: string): void {
    // Resolved against the offered candidates, not the full device-sourced list,
    // so a far-away restaurant that happens to share the name cannot patch its
    // position into a Bite it has nothing to do with.
    const selectedRestaurant = this.restaurantsNearBite().find(
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

    if (selectedRestaurant?.position) {
      this.restaurantPosition.set(selectedRestaurant.position);
      this.positionSource.set('restaurant');
    }

    this.isRestaurantModalOpen.set(false);
  }

  onGooglePlaceSelected(place: GooglePlace): void {
    this.biteFormGroup.patchValue({
      place: place.name,
      position: place.position,
      restaurantId: '',
    });
    this.googlePosition.set(place.position);
    this.positionSource.set('google');
    this.isRestaurantModalOpen.set(false);
  }
}

/** Raw value emitted by {@link BitePage.submitBite} (reactive form value). */
export type BiteFormValue = BitePage['biteFormGroup']['value'];

/**
 * What the form hands on when the Bite is saved: the Bite, and next to it the
 * photo's position, which the integration layer stores apart from the Bite
 * where only its author can read it (GitHub issue #1290). It is deliberately
 * not a form control, because the form value is what reaches the Bite
 * document.
 */
export type BiteSubmission = BiteFormValue & {
  photoPosition?: Geopoint | null;
};
