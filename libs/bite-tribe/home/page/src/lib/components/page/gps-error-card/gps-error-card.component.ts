import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonText,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'bt-gps-error-card',
  templateUrl: 'gps-error-card.component.html',
  imports: [IonCard, IonCardContent, IonText, IonButton, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GpsErrorCardComponent {
  /**
   * Asks to restore location access. Retry only re-reads the position, which
   * can never fix a missing permission — the read deliberately refuses to
   * prompt — so this is the only route back for a user whose OS grant is gone.
   */
  readonly enableLocationClick = output<void>();
  readonly retryClick = output<void>();
  readonly closeClick = output<void>();
}
