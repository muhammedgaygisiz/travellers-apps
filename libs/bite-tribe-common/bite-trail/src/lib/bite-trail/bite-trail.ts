import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
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
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';

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
    UpperCasePipe,
    DecimalPipe,
    TranslocoPipe,
  ],
  templateUrl: 'bite-trail.html',
  styleUrl: 'bite-trail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteTrailComponent {
  biteTrail = input.required<BiteTrail>();

  goToProfile = output<string>();
  viewBiteTrail = output<BiteTrail>();
}
