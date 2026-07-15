import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonBadge, IonChip } from '@ionic/angular/standalone';
import { LikeType } from 'model';
import { likeTypes } from '../utils/like-counts';
import type { LikeCounts } from '../utils/like-counts';

const emojiMap: Record<LikeType, string> = {
  thumbup: '👍',
  drooling: '🤤',
  mindblown: '🤯',
};

@Component({
  template: `
    <div class="like-options-container">
      @for (likeType of likeTypes; track likeType) {
        <ion-chip
          [attr.data-testid]="'like-option-' + likeType"
          class="{{ likeType === userLikeType ? 'liked' : '' }}"
          (click)="onSelect(likeType)"
        >
          {{ emojiMap[likeType] }}
          @if (likeCounts[likeType] > 0) {
            <ion-badge>{{ likeCounts[likeType] }}</ion-badge>
          }
        </ion-chip>
      }
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
  imports: [IonChip, IonBadge],
})
export class LikeOptionsPopoverMenuComponent {
  readonly likeTypes = likeTypes;
  readonly emojiMap = emojiMap;

  likeCounts: LikeCounts = { thumbup: 0, drooling: 0, mindblown: 0 };
  userLikeType?: LikeType;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onSelect: (likeType: LikeType) => void = () => {};
}
