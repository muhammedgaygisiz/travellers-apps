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
  readonly retryClick = output<void>();
  readonly closeClick = output<void>();
}
