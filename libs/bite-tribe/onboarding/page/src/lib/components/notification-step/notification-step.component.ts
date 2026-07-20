import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Outcome of the notification permission request, as far as the step is
 * concerned.
 *
 * `unsupported` covers surfaces with no OS prompt (the web build), where the
 * step still has to be acknowledged but nothing can be granted.
 */
export type NotificationPermissionState =
  'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';

/**
 * Notification onboarding step. It explains what notifications are used for
 * before the OS prompt appears, then reports the outcome.
 *
 * Denial is a valid, final answer: the step stays completable and the copy
 * acknowledges the choice instead of pushing the user back to the prompt, which
 * the OS would not show a second time anyway (epic #850, issue #1015).
 */
@Component({
  selector: 'onboarding-notification-step',
  templateUrl: './notification-step.component.html',
  styleUrl: './notification-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonIcon, IonSpinner, TranslocoPipe],
})
export class NotificationStepComponent {
  permission = input<NotificationPermissionState>('idle');

  enableNotifications = output<void>();
  skipNotifications = output<void>();

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
