import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonChip } from '@ionic/angular/standalone';
import { Bite } from 'model';
import { CalcClassPipe } from './pipe/calc-class.pipe';

@Component({
  template: `
    <div class="like-options-container">
      <ion-chip
        class="{{ bite() | calcClass : userId() : 'thumbup' }}"
        (click)="onLikeButtonClicked('thumbup')"
        >👍</ion-chip
      >
      <ion-chip
        class="{{ bite() | calcClass : userId() : 'drooling' }}"
        (click)="onLikeButtonClicked('drooling')"
        >🤤</ion-chip
      >
      <ion-chip
        class="{{ bite() | calcClass : userId() : 'mindblown' }}"
        (click)="onLikeButtonClicked('mindblown')"
        >🤯</ion-chip
      >
    </div>
  `,
  styles: `
    .like-options-container {
      width: 100%;

      display: flex;
      justify-content: space-evenly;

      ion-chip.liked {
        background-color: var(--ion-color-primary);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonChip, CalcClassPipe],
})
export class LikeOptionsPopoverMenuComponent {
  bite = input<Bite>();
  userId = input<string>();

  likeButtonClick = output<{
    likeType: string;
    biteId: string;
  }>();

  onLikeButtonClicked(likeType: string) {
    const biteId = this.bite()?.id;

    if (biteId) {
      this.likeButtonClick.emit({
        likeType,
        biteId,
      });
    }
  }
}
