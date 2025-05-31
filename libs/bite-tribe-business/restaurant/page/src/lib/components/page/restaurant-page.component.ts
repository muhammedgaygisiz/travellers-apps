import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
} from '@ionic/angular/standalone';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Bite, Restaurant } from 'model';
import { map } from 'rxjs';
import { compressFile } from 'image-compression';
import { BiteComponent } from 'bite-tribe-common/bite';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'restaurant-page',
  templateUrl: './restaurant-page.component.html',
  imports: [
    PageComponent,
    IonContent,
    IonCard,
    IonIcon,
    IonList,
    IonInput,
    IonItem,
    ReactiveFormsModule,
    IonCardContent,
    IonButton,
    BiteComponent,
  ],
  styleUrl: '/restaurant-page.component.scss',
})
export class RestaurantPageComponent {
  restaurant = input<Restaurant>();

  private readonly formBuilder = inject(FormBuilder);

  submitNewRestaurant = output<Restaurant>();
  readonly biteClick = output<Bite>();

  restaurantFormGroup = this.formBuilder.group({
    image: ['', Validators.required],
    name: ['', Validators.required],
    latitude: [0, Validators.required],
    longitude: [0, Validators.required],
  });

  prefillEffect = effect(() => {
    const restaurant = this.restaurant();
    const firstBite = restaurant?.bites?.[0];

    if (restaurant?.name) {
      this.restaurantFormGroup.controls['name'].patchValue(restaurant.name);
    }

    if (firstBite) {
      this.restaurantFormGroup.controls['latitude'].patchValue(
        firstBite.position.latitude
      );

      this.restaurantFormGroup.controls['longitude'].patchValue(
        firstBite.position.longitude
      );
    }
  });

  private readonly fileUpload =
    viewChild<ElementRef<HTMLInputElement>>('fileUploader');

  imageBase64 = toSignal(
    this.restaurantFormGroup.controls['image'].valueChanges
  );

  showImage = computed(() => {
    const img = this.imageBase64();

    return !!img;
  });

  isInvalid = toSignal(
    this.restaurantFormGroup.valueChanges.pipe(
      map(() => {
        return !this.restaurantFormGroup.valid;
      })
    ),
    { initialValue: !this.restaurantFormGroup.valid }
  );

  onImageUploadClick() {
    if (!this.imageBase64()) {
      const fileUpload = this.fileUpload();

      if (!fileUpload) {
        console.error('File upload element not found');
        return;
      }

      fileUpload.nativeElement.click();

      return;
    }
  }

  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const compressedFile = await compressFile(file);

      const reader = new FileReader();
      reader.onload = () => {
        this.restaurantFormGroup.controls['image'].patchValue(
          reader.result as string
        );
      };
      reader.readAsDataURL(compressedFile);
    }
  }

  saveNewRestaurant() {
    if (this.restaurantFormGroup.valid) {
      const newRestaurant = this.restaurantFormGroup.value;
      const biteIds = this.restaurant()?.biteIds || [];

      const { latitude, longitude, ...rest } = newRestaurant;
      this.submitNewRestaurant.emit({
        ...rest,
        position: {
          latitude: latitude,
          longitude: longitude,
        },
        biteIds,
      } as Restaurant);
    }
  }
}
