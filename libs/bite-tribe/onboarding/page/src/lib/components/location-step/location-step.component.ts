import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Outcome of the location permission request, as far as the step is concerned.
 *
 * `unsupported` covers surfaces with no OS prompt of their own (the web build,
 * where the browser asks on the first read), where the step still has to be
 * acknowledged but nothing can be granted here.
 */
export type LocationPermissionState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unsupported';

/**
 * Location onboarding step. It explains what the device position is used for —
 * the nearby feed, the map, distance to a Bite, and tagging new Bites — before
 * the OS prompt appears, then reports the outcome.
 *
 * Denial is a valid, final answer: the step stays completable and the copy
 * acknowledges the choice instead of pushing the user back to the prompt, which
 * the OS would not show a second time anyway (epic #850, issue #1023).
 */
@Component({
  selector: 'onboarding-location-step',
  templateUrl: './location-step.component.html',
  styleUrl: './location-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonIcon, IonSpinner, TranslocoPipe],
})
export class LocationStepComponent {
  permission = input<LocationPermissionState>('idle');

  enableLocation = output<void>();
  skipLocation = output<void>();

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
