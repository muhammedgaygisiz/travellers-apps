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
import { isFromCardControl } from 'utils';

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

  /**
   * A tap anywhere on the card opens the BiteTrail, unless it landed on the
   * owner name or View BiteTrail, which act on their own (issue #1765).
   */
  onCardClick(event: Event): void {
    if (isFromCardControl(event, event.currentTarget as Element)) {
      return;
    }

    this.viewBiteTrail.emit(this.biteTrail());
  }

  /** `Enter` opens the BiteTrail only while the card itself has focus. */
  onCardKeydown(event: Event): void {
    if (event.target !== event.currentTarget) {
      return;
    }

    this.viewBiteTrail.emit(this.biteTrail());
  }
}
