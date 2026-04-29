import {
  ChangeDetectionStrategy,
  Component,
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
  IonTextarea,
} from '@ionic/angular/standalone';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Address, Bite, DaySchedule, Geopoint, Link, Restaurant } from 'model';
import { map } from 'rxjs';
import { BiteComponent } from 'bite-tribe-common/bite';
import { PositionComponent } from 'bite-tribe-common/map';
import { ImageUploadComponent } from 'image-upload';
import { TranslocoPipe } from '@jsverse/transloco';
import { OpeningHoursComponent } from '../opening-hours/opening-hours.component';

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
    IonSelect,
    IonSelectOption,
    IonText,
    ReactiveFormsModule,
    IonButton,
    BiteComponent,
    PositionComponent,
    ImageUploadComponent,
    IonTextarea,
    TranslocoPipe,
    OpeningHoursComponent,
  ],
})
export class NewRestaurantPageComponent {
  restaurant = input<Restaurant>();

  private readonly formBuilder = inject(FormBuilder);

  submitNewRestaurant = output<Restaurant>();
  readonly biteClick = output<Bite>();

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

  readonly openingHours = signal<DaySchedule[]>([]);

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

  onOpeningHoursChange(hours: DaySchedule[]): void {
    this.openingHours.set(hours);
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

      const address: Address = {
        street: street ?? '',
        postcode: postcode ?? '',
        city: city ?? '',
        country: country ?? '',
      };

      const socialMediaLinks = this.socialMediaForm.valid && this.links.length > 0
        ? (this.socialMediaForm.value.links as Link[])
        : [];

      this.submitNewRestaurant.emit({
        image: image as string,
        name: name as string,
        description: description as string,
        position: position as Geopoint,
        address,
        biteIds,
        socialMediaLinks,
        openingHours: this.openingHours(),
      } as Restaurant);
    }
  }
}
