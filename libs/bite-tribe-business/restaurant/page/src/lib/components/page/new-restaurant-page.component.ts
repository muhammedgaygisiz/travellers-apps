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
} from '@ionic/angular/standalone';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Bite, Geopoint, Restaurant } from 'model';
import { map } from 'rxjs';
import { compressFile } from 'image-compression';
import { BiteComponent } from 'bite-tribe-common/bite';
import { PositionComponent } from 'bite-tribe-common/map';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'new-restaurant-page',
  templateUrl: 'new-restaurant-page.component.html',
  styleUrl: 'new-restaurant-page.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonCard,
    IonIcon,
    IonInput,
    ReactiveFormsModule,
    IonCardContent,
    IonButton,
    BiteComponent,
    PositionComponent,
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
    position: [null as Geopoint | null, Validators.required],
  });

  prefillEffect = effect(() => {
    const restaurant = this.restaurant();
    const firstBite = restaurant?.bites?.[0];

    if (restaurant?.name) {
      this.restaurantFormGroup.controls['name'].patchValue(restaurant.name);
    }

    const position = restaurant?.position || firstBite?.position;
    if (position) {
      this.restaurantFormGroup.controls['position'].patchValue(position);
    }
  });

  private readonly fileUpload =
    viewChild<ElementRef<HTMLInputElement>>('fileUploader');

  imageBase64 = toSignal(
    this.restaurantFormGroup.controls['image'].valueChanges,
  );

  showImage = computed(() => {
    const img = this.imageBase64();

    return !!img;
  });

  isInvalid = toSignal(
    this.restaurantFormGroup.valueChanges.pipe(
      map(() => {
        return !this.restaurantFormGroup.valid;
      }),
    ),
    { initialValue: !this.restaurantFormGroup.valid },
  );

  onImageUploadClick(): void {
    if (!this.imageBase64()) {
      const fileUpload = this.fileUpload();

      if (!fileUpload) {
        console.error('NewRestaurantPageComponent: File upload element reference not found. Ensure the #fileUploader template reference is correctly defined.');
        return;
      }

      fileUpload.nativeElement.click();

      return;
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const compressedFile = await compressFile(file);

      const reader = new FileReader();
      reader.onload = (): void => {
        this.restaurantFormGroup.controls['image'].patchValue(
          reader.result as string,
        );
      };
      reader.readAsDataURL(compressedFile);
    }
  }

  saveNewRestaurant(): void {
    if (this.restaurantFormGroup.valid) {
      const { image, name, position } = this.restaurantFormGroup.value;
      const biteIds = this.restaurant()?.biteIds || [];

      this.submitNewRestaurant.emit({
        image: image as string,
        name: name as string,
        position: position as Geopoint,
        biteIds,
      } as Restaurant);
    }
  }
}
