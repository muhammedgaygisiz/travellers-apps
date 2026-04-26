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
import { Link, Restaurant } from 'model';
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
import { MapComponent } from 'bite-tribe-common/map';

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
    MapComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditRestaurantComponent {
  private readonly formBuilder = inject(FormBuilder);

  restaurant = input<Restaurant>();

  readonly submitSocialMediaLinks = output<Partial<{ links: Link[] }>>();

  readonly submitDescription = output<string>();

  readonly createMenu = output<void>();
  readonly editMenu = output<Restaurant>();

  readonly socialMediaForm = this.formBuilder.group({
    links: this.formBuilder.array([]),
  });

  readonly descriptionForm = this.formBuilder.group({
    description: [''],
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

  position = computed(() => this.restaurant()?.position);

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

  protected gotoEditMenu(): void {
    const restaurant = this.restaurant();
    if (restaurant) {
      this.editMenu.emit(restaurant);
    }
  }
}
