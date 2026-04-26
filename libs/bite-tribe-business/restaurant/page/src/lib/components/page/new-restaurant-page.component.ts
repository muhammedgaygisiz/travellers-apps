import {
  ChangeDetectionStrategy,
  Component,
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
  IonTextarea,
} from '@ionic/angular/standalone';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Bite, Geopoint, Restaurant } from 'model';
import { map } from 'rxjs';
import { BiteComponent } from 'bite-tribe-common/bite';
import { PositionComponent } from 'bite-tribe-common/map';
import { ImageUploadComponent } from 'image-upload';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'new-restaurant-page',
  templateUrl: 'new-restaurant-page.component.html',
  styleUrl: 'new-restaurant-page.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonInput,
    ReactiveFormsModule,
    IonButton,
    BiteComponent,
    PositionComponent,
    ImageUploadComponent,
    IonTextarea,
    TranslocoPipe,
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
    description: ['', Validators.required],
    position: [null as Geopoint | null, Validators.required],
  });

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
  });

  isInvalid = toSignal(
    this.restaurantFormGroup.valueChanges.pipe(
      map(() => {
        return !this.restaurantFormGroup.valid;
      }),
    ),
    { initialValue: !this.restaurantFormGroup.valid },
  );

  saveNewRestaurant(): void {
    if (this.restaurantFormGroup.valid) {
      const { image, name, position, description } =
        this.restaurantFormGroup.value;
      const biteIds = this.restaurant()?.biteIds || [];

      this.submitNewRestaurant.emit({
        image: image as string,
        name: name as string,
        description: description as string,
        position: position as Geopoint,
        biteIds,
      } as Restaurant);
    }
  }
}
