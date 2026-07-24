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
  templateUrl: './like-options-popover-menu.component.html',
  styleUrl: './like-options-popover-menu.component.scss',
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
