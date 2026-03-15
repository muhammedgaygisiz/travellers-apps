import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BiteTrail } from 'model';
import {
  IonAvatar,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonText,
} from '@ionic/angular/standalone';

@Component({
  selector: 'bite-trail',
  imports: [
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonText,
    IonAvatar,
    IonCardContent,
    IonIcon,
    IonBadge,
    IonButton,
  ],
  templateUrl: 'bite-trail.html',
  styleUrl: 'bite-trail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteTrailComponent {
  biteTrail = input.required<BiteTrail>();
}
