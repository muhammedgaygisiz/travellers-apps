import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { IonChip, IonLabel } from '@ionic/angular/standalone';
import { LikeClick, LikeType } from 'model';
import { LikeOptionsPopoverMenuComponent } from '../like-options-popover-menu/like-options-popover-menu.component';
import { PopoverController } from '@ionic/angular/standalone';
import { LikeCounts, likeTypes } from '../utils/like-counts';

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

  biteId = input.required<string>();
  likeCounts = input.required<LikeCounts>();
  userLikeType = input<LikeType | undefined>();
  inCard = input(false);

  /**
   * Renders the chip as a plain label instead of a control. Used on a Bite the
   * viewer created themselves: they may see how it was received, but liking
   * your own Bite is not an available action. See GitHub issue #1401.
   */
  readonly = input(false, { transform: booleanAttribute });

  likeButtonClick = output<LikeClick>();

  totalLikeCount = computed(() => {
    const likeCounts = this.likeCounts();
    return likeTypes.reduce(
      (total, likeType) => total + likeCounts[likeType],
      0,
    );
  });

  /**
   * A read-only chip with nothing to report would show a lone thumbs-up that
   * cannot be tapped, so the zero-like case drops the chip entirely.
   */
  showChip = computed(() => !this.readonly() || this.totalLikeCount() > 0);

  calcClass = computed(() => {
    if (this.readonly()) {
      return 'readonly';
    }

    if (this.userLikeType()) {
      return 'liked';
    }

    if (!this.totalLikeCount()) {
      return 'unliked';
    }

    return '';
  });

  getLikeEmojis = computed(() => {
    const likeCounts = this.likeCounts();
    return likeTypes
      .filter((likeType) => likeCounts[likeType] > 0)
      .map((likeType) => emojiMap[likeType]);
  });

  async openLikeOptions($event: MouseEvent): Promise<void> {
    if (this.readonly()) {
      return;
    }

    const popover = await this.popoverController.create({
      component: LikeOptionsPopoverMenuComponent,
      event: $event,
      dismissOnSelect: true,
      componentProps: {
        likeCounts: this.likeCounts(),
        userLikeType: this.userLikeType(),
        onSelect: (likeType: LikeType) => this.onLikeSelected(likeType),
      },
      cssClass: 'like-options-popover',
      alignment: 'center',
      size: 'auto',
      arrow: true,
    });

    await popover.present();
  }

  onLikeSelected(likeType: LikeType): void {
    const userLikeType = this.userLikeType();

    if (likeType === userLikeType) {
      this.likeButtonClick.emit({
        biteId: this.biteId(),
        likeType,
        action: 'remove',
      });
      return;
    }

    this.likeButtonClick.emit({
      biteId: this.biteId(),
      likeType,
      action: 'save',
      previousLikeType: userLikeType,
    });
  }
}
