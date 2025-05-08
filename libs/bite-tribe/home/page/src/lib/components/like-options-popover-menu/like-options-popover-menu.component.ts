import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonChip } from '@ionic/angular/standalone';
import { Bite } from 'model';

@Component({
  template: `
    <div class="like-options-container">
      <ion-chip (click)="onLikeButtonClicked('thumbup')">👍</ion-chip>
      <ion-chip (click)="onLikeButtonClicked('drooling')">🤤</ion-chip>
      <ion-chip (click)="onLikeButtonClicked('mindblown')">🤯</ion-chip>
    </div>
  `,
  styles: `
    .like-options-container {
      width: 100%;

      display: flex;
      justify-content: space-evenly;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonChip],
})
export class LikeOptionsPopoverMenuComponent {
  bite = input<Bite>();

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
