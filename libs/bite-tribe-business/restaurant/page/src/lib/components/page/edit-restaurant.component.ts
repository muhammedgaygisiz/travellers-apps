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
  Restaurant,
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
import { RestaurantImageComponent } from '../restaurant-image/restaurant-image.component';
import { TranslocoPipe } from '@jsverse/transloco';
import { PositionComponent } from 'bite-tribe-common/map';
import { OpeningHoursComponent } from 'opening-hours';

/** The zone this browser is in, as a starting point rather than an answer. */
const detectedTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';

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
    RestaurantImageComponent,
    TranslocoPipe,
    OpeningHoursComponent,
    PositionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditRestaurantComponent {
  private readonly formBuilder = inject(FormBuilder);

  restaurant = input<Restaurant>();

  readonly submitSocialMediaLinks = output<Partial<{ links: Link[] }>>();

  readonly submitDescription = output<string>();

  readonly submitOpeningHours = output<DaySchedule[]>();

  readonly submitAddress = output<Address>();

  readonly submitPosition = output<Geopoint>();

  readonly createMenu = output<void>();
  readonly editMenu = output<Restaurant>();

  /**
   * The way to the staff of this restaurant (issue #1537).
   *
   * A button on the restaurant rather than a dashboard section, because staff
   * belongs to one restaurant: a top-level entry would have to ask which one
   * first, and the answer is already on the screen.
   */
  readonly manageStaff = output<void>();
  readonly submitTableOrderingSettings = output<TableOrderingSettings>();
  readonly editFloorPlan = output<void>();
  readonly openTablePlan = output<void>();

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
    const supported =
      typeof Intl.supportedValuesOf === 'function'
        ? Intl.supportedValuesOf('timeZone')
        : [];

    return supported.length ? supported : [detected].filter(Boolean);
  });

  initTableOrdering = effect(() => {
    const tableOrdering = this.restaurant()?.tableOrdering;

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

  get links(): FormArray {
    return this.socialMediaForm.get('links') as FormArray;
  }

  initSocialMediaLinks = effect(() => {
    const socialMediaLinks = this.restaurant()?.socialMediaLinks;
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
    this.descriptionForm.patchValue({ description });
  });

  initAddress = effect(() => {
    const address = this.restaurant()?.address;
    this.addressForm.patchValue({
      street: address?.street ?? '',
      postcode: address?.postcode ?? '',
      city: address?.city ?? '',
      country: address?.country ?? '',
    });
  });

  initPosition = effect(() => {
    const position = this.restaurant()?.position ?? null;
    this.positionForm.patchValue({ position });
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

  protected gotoEditMenu(): void {
    const restaurant = this.restaurant();
    if (restaurant) {
      this.editMenu.emit(restaurant);
    }
  }
}
