import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { IonBadge, IonChip, IonLabel } from '@ionic/angular/standalone';
import { Bite } from 'model';
import { LikeOptionsPopoverMenuComponent } from '../like-options-popover-menu/like-options-popover-menu.component';
import { PopoverController } from '@ionic/angular';

const emojiMap: Record<string, string> = {
  thumbup: '👍',
  drooling: '🤤',
  mindblown: '🤯',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'bt-likes',
  templateUrl: './likes.component.html',
  styleUrl: './likes.component.scss',
  imports: [IonBadge, IonChip, IonLabel],
})
export class LikesComponent {
  popoverController = inject(PopoverController);

  bite = input.required<Bite>();

  userId = input<string>();

  likeButtonClick = output<{ likeType: string; biteId: string }>();

  calcClass = computed(() => {
    const bite = this.bite();
    const userId = this.userId();

    const foundLike = bite?.likes?.find((like) => like.userId === userId);

    if (foundLike) {
      return 'liked';
    }

    return '';
  });

  getLikeEmojis = computed(() => {
    const bite = this.bite();
    if (!bite?.likes) return [];

    return bite.likes.map((like) => emojiMap[like.likeType]);
  });

  async openLikeOptions($event: MouseEvent) {
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
