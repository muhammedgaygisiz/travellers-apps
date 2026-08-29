import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Outcome of the media location permission request, as far as the step is
 * concerned.
 *
 * `unsupported` covers the platforms with no such permission — iOS, where the
 * photo library grant already carries the metadata, and the web build. The
 * step is filtered out of the assistant there, so this state only shows up in
 * Storybook and in a test.
 */
export type PhotoLocationPermissionState =
  'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';

/**
 * Photo location onboarding step. It explains that BiteTribe reads where a
 * photo was taken before the OS prompt appears, then reports the outcome.
 *
 * The step exists so the prompt is not attached to picking a photo. Asking
 * there meant the user met an "access photos and videos" dialog on the way to
 * their Bite, and under "Allow limited access" selected the photo twice — once
 * on the OS grant screen, once in the picker. See GitHub issue #1394.
 *
 * Denial is a valid, final answer: the step stays completable and the copy
 * acknowledges the choice instead of pushing the user back to the prompt, which
 * the OS would not show a second time anyway. Bites still get a position from
 * GPS, the restaurant, Google, or the map.
 */
@Component({
  selector: 'onboarding-photos-step',
  templateUrl: './photos-step.component.html',
  styleUrl: './photos-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonIcon, IonSpinner, TranslocoPipe],
})
export class PhotosStepComponent {
  permission = input<PhotoLocationPermissionState>('idle');

  enablePhotoLocation = output<void>();
  skipPhotoLocation = output<void>();

  protected isDecided(): boolean {
    const permission = this.permission();

    return (
      permission === 'granted' ||
      permission === 'denied' ||
      permission === 'unsupported'
    );
  }

  protected isRequesting(): boolean {
    return this.permission() === 'requesting';
  }
}
