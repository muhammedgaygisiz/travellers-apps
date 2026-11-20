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
import { toSignal } from '@angular/core/rxjs-interop';
import { IonButton, IonSpinner, IonText } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { ImageUploadComponent } from 'image-upload';
import {
  photoRefusalReasonKey,
  RetryUploadButtonComponent,
} from 'bite-tribe-common/bite';
import type { Restaurant } from 'model';

export type RestaurantPhotoStatus =
  'pending' | 'uploaded' | 'failed' | 'refused';

/**
 * The restaurant's photo, and the way to change it (GitHub issue #2126).
 *
 * The business app had no way to set the photo: it came from candidate
 * verification or not at all. It is one box, the way Create Bite's is: the
 * shared image-upload shows the current photo with its edit and delete
 * overlay, and the upload box only once the photo is deleted. Save then
 * uploads the way a Bite or profile photo does (#1953): in the background,
 * with the new photo blurred under a spinner while it is sent and the shared
 * retry button if it fails.
 *
 * The image check decides whether the photo is published (GitHub issue
 * #2141). Once the transfer is done the box says the photo is being checked;
 * a refused photo leaves the previous one in place, says why below the box,
 * and a different photo can be chosen at once.
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
  /** The transfer is done and the image check has not answered yet. */
  checking = input(false);
  /** Why the image check refused the photo, while `status` is `refused`. */
  refusalCategory = input<string>();

  readonly refusalReasonKey = computed(() =>
    photoRefusalReasonKey(this.refusalCategory()),
  );

  readonly savePhoto = output<string>();
  readonly retry = output<void>();

  readonly photoControl = new FormControl<string | null>(null);
  private readonly chosenPhoto = toSignal(this.photoControl.valueChanges, {
    initialValue: null,
  });
  readonly hasChosenPhoto = computed(() => !!this.chosenPhoto());

  /**
   * The owner deleted the shown photo in the box to choose another. Nothing is
   * stored until Save: Cancel brings the photo back.
   */
  readonly cleared = signal(false);

  /** Whether there is a change for Save or Cancel to act on. */
  readonly isEditing = computed(() => this.hasChosenPhoto() || this.cleared());

  /**
   * The photo the box shows when nothing new is chosen: the one being sent,
   * else one that landed this session, else the stored one.
   */
  readonly currentImageUrl = computed(() => {
    const restaurant = this.restaurant();

    if (this.cleared()) {
      return undefined;
    }

    return (
      (this.status() === 'pending' ? this.pendingPhoto() : undefined) ??
      this.uploadedImagePath() ??
      (restaurant?.imagePath || restaurant?.image || undefined)
    );
  });

  constructor() {
    // A second photo cannot be chosen while one is being sent.
    effect(() => {
      if (this.status() === 'pending') {
        this.photoControl.disable({ emitEvent: false });
      } else {
        this.photoControl.enable({ emitEvent: false });
      }
    });
  }

  save(): void {
    const photo = this.photoControl.value;

    if (!photo) {
      return;
    }

    this.savePhoto.emit(photo);
    this.photoControl.reset(null);
    this.cleared.set(false);
  }

  cancel(): void {
    this.photoControl.reset(null);
    this.cleared.set(false);
  }
}
