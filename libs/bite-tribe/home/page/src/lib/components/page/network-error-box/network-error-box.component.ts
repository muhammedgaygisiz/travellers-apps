import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  IonCard,
  IonCardContent,
  IonIcon,
  IonText,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'bt-network-error-box',
  templateUrl: 'network-error-box.component.html',
  imports: [IonCard, IonCardContent, IonIcon, IonText, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetworkErrorBoxComponent {}
