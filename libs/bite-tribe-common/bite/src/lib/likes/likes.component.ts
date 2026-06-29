import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { IonChip, IonLabel } from '@ionic/angular/standalone';
import { Bite, Like } from 'model';
import { LikeOptionsPopoverMenuComponent } from '../like-options-popover-menu/like-options-popover-menu.component';
import { PopoverController } from '@ionic/angular';
import {
  getLikeCount,
  getTotalLikeCount,
  likeTypes,
} from '../utils/like-counts';

const emojiMap: Record<string, string> = {
  thumbup: '👍',
  drooling: '🤤',
  mindblown: '🤯',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'bt-likes',
  templateUrl: './likes.component.html',
  styleUrl: './likes.component.scss',
  imports: [IonChip, IonLabel],
  providers: [PopoverController],
})
export class LikesComponent {
  popoverController = inject(PopoverController);

  bite = input.required<Bite>();
  userId = input<string>();
  inCard = input(false);

  likeButtonClick = output<Like>();

  totalLikeCount = computed(() => getTotalLikeCount(this.bite()));

  calcClass = computed(() => {
    const bite = this.bite();
    const userId = this.userId();

    if (!this.totalLikeCount()) {
      return 'unliked';
    }

    const foundLike = bite?.likes?.find((like) => like.userId === userId);

    if (foundLike) {
      return 'liked';
    }

    return '';
  });

  getLikeEmojis = computed(() => {
    const bite = this.bite();
    return likeTypes
      .filter((likeType) => getLikeCount(bite, likeType) > 0)
      .map((likeType) => emojiMap[likeType]);
  });

  async openLikeOptions($event: MouseEvent): Promise<void> {
    const popover = await this.popoverController.create({
      component: LikeOptionsPopoverMenuComponent,
      event: $event,
      dismissOnSelect: true,
      componentProps: {
        bite: this.bite,
        userId: this.userId,
        likeButtonClick: this.likeButtonClick,
      },
      cssClass: 'like-options-popover',
      alignment: 'center',
      size: 'auto',
      arrow: true,
    });

    await popover.present();
  }
}
