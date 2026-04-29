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
  IonTextarea,
} from '@ionic/angular/standalone';
import { Address, DaySchedule, Geopoint, Link, Restaurant } from 'model';
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
import { OpeningHoursComponent } from '../opening-hours/opening-hours.component';

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
