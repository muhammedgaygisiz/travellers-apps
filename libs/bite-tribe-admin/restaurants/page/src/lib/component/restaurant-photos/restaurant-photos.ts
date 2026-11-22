import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';
import { ImageUploadComponent } from 'image-upload';
import type { Restaurant } from 'model';

/** The photo chosen for one restaurant, sent to be attached. */
export interface AttachRestaurantPhoto {
  readonly restaurantId: string;
  readonly photo: string;
}

/**
 * The restaurants with no photo, and attaching one (GitHub issue #1510).
 *
 * One field and one worklist, not an edit-restaurant surface: choose a
 * restaurant, choose its photo, attach it. A restaurant leaves the list once
 * the image check has published its photo.
 */
@Component({
  selector: 'lib-restaurant-photos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    ReactiveFormsModule,
    ImageUploadComponent,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonButton,
    IonSpinner,
    TranslocoPipe,
  ],
  templateUrl: './restaurant-photos.html',
  styles: `
    /* The measure every other operator list uses. */
    .restaurant-photos {
      margin: 0 auto;
      max-width: 40rem;
    }

    .attach {
      margin-top: 1rem;
    }
  `,
})
export class RestaurantPhotos {
  readonly restaurants = input<Restaurant[]>([]);
  readonly loading = input(false);
  readonly attachingId = input<string | undefined>();

  readonly attach = output<AttachRestaurantPhoto>();
  readonly logoutClick = output<void>();

  readonly selectedId = signal<string | undefined>(undefined);
  readonly photo = new FormControl<string | null>(null);

  readonly selected = computed(() =>
    this.restaurants().find(
      (restaurant) => restaurant.id === this.selectedId(),
    ),
  );

  /**
   * A restaurant that left the list - its photo published - is no longer
   * selected, and the chosen photo goes with it.
   */
  readonly dropAttached = effect(() => {
    if (this.selectedId() && !this.selected()) {
      this.selectedId.set(undefined);
      this.photo.reset();
    }
  });

  select(restaurant: Restaurant): void {
    if (this.selectedId() !== restaurant.id) {
      this.selectedId.set(restaurant.id);
      this.photo.reset();
    }
  }

  placeOf(restaurant: Restaurant): string {
    return [restaurant.address?.city, restaurant.address?.country]
      .filter((part) => !!part?.trim())
      .join(', ');
  }

  submit(): void {
    const restaurantId = this.selectedId();
    const photo = this.photo.value;

    if (restaurantId && photo && !this.attachingId()) {
      this.attach.emit({ restaurantId, photo });
    }
  }
}
