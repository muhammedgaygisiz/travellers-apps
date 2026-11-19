import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { IonButton, IonSpinner, IonText } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { ImageUploadComponent } from 'image-upload';
import { RetryUploadButtonComponent } from 'bite-tribe-common/bite';
import type { Restaurant } from 'model';
import { RestaurantImageComponent } from '../restaurant-image/restaurant-image.component';

export type RestaurantPhotoStatus = 'pending' | 'uploaded' | 'failed';

/**
 * The restaurant's photo, and the way to change it (GitHub issue #2126).
 *
 * The business app had no way to set the photo: it came from candidate
 * verification or not at all. The upload follows a Bite photo and a profile
 * photo (#1953): Save starts a background upload and the current photo stays
 * on show, with the new one blurred under a spinner while it is sent, and the
 * shared retry button if it fails.
 */
@Component({
  selector: 'bt-restaurant-photo-editor',
  templateUrl: './restaurant-photo-editor.component.html',
  styleUrl: './restaurant-photo-editor.component.scss',
  imports: [
    ReactiveFormsModule,
    IonButton,
    IonSpinner,
    IonText,
    TranslocoPipe,
    ImageUploadComponent,
    RetryUploadButtonComponent,
    RestaurantImageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantPhotoEditorComponent {
  restaurant = input<Restaurant>();
  /** This session's upload status, or the stored one. */
  status = input<RestaurantPhotoStatus>();
  /** The photo being sent, shown blurred while it uploads. */
  pendingPhoto = input<string>();
  /** A photo that landed this session, shown before the restaurant is read again. */
  uploadedImagePath = input<string>();
  /** Whether a failed upload can be sent again without choosing the photo again. */
  canRetry = input(false);

  readonly savePhoto = output<string>();
  readonly retry = output<void>();

  readonly photoControl = new FormControl<string | null>(null);
  private readonly chosenPhoto = toSignal(this.photoControl.valueChanges, {
    initialValue: null,
  });
  readonly hasChosenPhoto = computed(() => !!this.chosenPhoto());

  /** The restaurant as it should look right now, with the newest photo on it. */
  readonly shownRestaurant = computed(() => {
    const restaurant = this.restaurant();

    if (!restaurant) {
      return restaurant;
    }

    const imagePath =
      (this.status() === 'pending' ? this.pendingPhoto() : undefined) ??
      this.uploadedImagePath() ??
      restaurant.imagePath;

    return { ...restaurant, imagePath };
  });

  save(): void {
    const photo = this.photoControl.value;

    if (!photo) {
      return;
    }

    this.savePhoto.emit(photo);
    this.photoControl.reset(null);
  }

  cancel(): void {
    this.photoControl.reset(null);
  }
}
