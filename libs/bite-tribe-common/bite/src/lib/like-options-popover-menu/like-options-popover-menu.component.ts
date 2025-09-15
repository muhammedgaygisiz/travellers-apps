import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { IonBadge, IonChip } from '@ionic/angular/standalone';
import { Bite } from 'model';
import { CalcClassPipe } from './pipe/calc-class.pipe';

@Component({
  template: `
    <div class="like-options-container">
      <ion-chip
        class="{{ bite() | calcClass : userId() : 'thumbup' }}"
        (click)="onLikeButtonClicked('thumbup')"
      >
        👍 @if (thumbupCount() > 0) {
        <ion-badge>{{ thumbupCount() }}</ion-badge>
        }
      </ion-chip>
      <ion-chip
        class="{{ bite() | calcClass : userId() : 'drooling' }}"
        (click)="onLikeButtonClicked('drooling')"
      >
        🤤 @if (droolingCount() > 0) {
        <ion-badge>{{ droolingCount() }}</ion-badge>
        }
      </ion-chip>
      <ion-chip
        class="{{ bite() | calcClass : userId() : 'mindblown' }}"
        (click)="onLikeButtonClicked('mindblown')"
      >
        🤯 @if (mindblownCount() > 0) {
        <ion-badge>{{ mindblownCount() }}</ion-badge>
        }
      </ion-chip>
    </div>
  `,
  styles: `
    .like-options-container {
      width: 100%;
      padding: 8px;
      display: flex;
      justify-content: space-evenly;

      ion-chip {
        min-width: 65px;
        justify-content: center;
        margin: 0 4px;

        ion-badge {
          margin-left: 6px;
        }
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonChip, CalcClassPipe, IonBadge],
})
export class LikeOptionsPopoverMenuComponent {
  bite = input<Bite>();
  userId = input<string>();

  likeButtonClick = output<{
    likeType: string;
    biteId: string;
  }>();

  thumbupCount = computed(
    () =>
      this.bite()?.likes?.filter((like) => like.likeType === 'thumbup')
        .length || 0
  );

  droolingCount = computed(
    () =>
      this.bite()?.likes?.filter((like) => like.likeType === 'drooling')
        .length || 0
  );

  mindblownCount = computed(
    () =>
      this.bite()?.likes?.filter((like) => like.likeType === 'mindblown')
        .length || 0
  );

  onLikeButtonClicked(likeType: string): void {
    const biteId = this.bite()?.id;

    if (biteId) {
      this.likeButtonClick.emit({
        likeType,
        biteId,
      });
    }
  }
}
