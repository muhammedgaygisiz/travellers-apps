import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

export type LocalImage = {
  name: string;
  /** Filesystem URI, usable for reading the file back. */
  uri: string;
  /** Web-safe source for displaying the file. */
  src: string;
};

/**
 * Lets the user pick one of the photos this device saved locally.
 *
 * Used when a Bite's own local copy is gone — an older Bite, or one posted from
 * another device — so the photo cannot be found from the Bite id alone. Reads
 * the same directory the local gallery shows.
 *
 * Presentational: the photos are handed in and the choice is handed back, so
 * reading the filesystem and dismissing the modal stay with
 * {@link LocalImagePickerService}. See GitHub issue #1168.
 */
@Component({
  selector: 'bt-local-image-picker',
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar,
    TranslocoPipe,
  ],
  templateUrl: 'local-image-picker.component.html',
  styleUrl: 'local-image-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocalImagePickerComponent {
  readonly images = input<LocalImage[]>([]);
  readonly loading = input(false);

  readonly imageSelected = output<LocalImage>();
  readonly cancelled = output<void>();
}
