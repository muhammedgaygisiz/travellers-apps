import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
} from '@ionic/angular/standalone';

@Component({
  selector: 'bt-bite',
  templateUrl: './bite.component.html',
  styleUrls: ['./bite.component.scss'],
  imports: [
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteComponent {
  bite = input<{
    name: string;
    image: string;
  }>();
}
