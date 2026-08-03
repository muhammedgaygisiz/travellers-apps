import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonText,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { LocationPermissionState } from 'geolocation';

@Component({
  selector: 'bt-gps-error-card',
  templateUrl: 'gps-error-card.component.html',
  imports: [IonCard, IonCardContent, IonText, IonButton, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GpsErrorCardComponent {
  /**
   * What the OS said about location access when the read failed. Undefined
   * until a failure has been classified, and on web, where there is no
   * pre-checkable grant.
   */
  readonly permissionState = input<LocationPermissionState | undefined>();

  /**
   * Asks to restore location access. Retry only re-reads the position, which
   * can never fix a missing permission — the read deliberately refuses to
   * prompt — so this is the only route back for a user whose OS grant is gone.
   */
  readonly enableLocationClick = output<void>();
  readonly retryClick = output<void>();
  readonly closeClick = output<void>();

  /**
   * A denial is only reversible in the system settings page, so the card says
   * so and labels the action as the handoff it performs. Testers on build 89
   * read the previous "enable location" wording as an in-app switch and were
   * surprised to land in iOS Settings (issue #1183).
   */
  readonly isPermissionDenied = computed(
    (): boolean => this.permissionState() === 'denied',
  );

  readonly messageKey = computed((): string =>
    this.isPermissionDenied()
      ? 'location-permission-denied'
      : 'we-could-not-access-your-location',
  );

  readonly enableLocationLabelKey = computed((): string =>
    this.isPermissionDenied() ? 'open-location-settings' : 'enable-location',
  );
}
