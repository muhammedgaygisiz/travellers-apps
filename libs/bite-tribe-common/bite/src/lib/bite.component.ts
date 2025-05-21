import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonLabel,
} from '@ionic/angular/standalone';
import { Bite } from 'model';
import { PopoverController } from '@ionic/angular';
import { LikeOptionsPopoverMenuComponent } from './like-options-popover-menu/like-options-popover-menu.component';
import { ToMetricPipe } from 'distance-pipe';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'bt-bite',
  templateUrl: './bite.component.html',
  styleUrls: ['./bite.component.scss'],
  imports: [
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonChip,
    IonBadge,
    IonLabel,
    ToMetricPipe,
  ],
  providers: [PopoverController],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class BiteComponent {
  popoverController = inject(PopoverController);

  bite = input.required<Bite>();
  userId = input<string>();

  biteClick = output<Bite>();
  restaurantClick = output<Bite>();

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

    const emojiMap: Record<string, string> = {
      thumbup: '👍',
      drooling: '🤤',
      mindblown: '🤯',
    };

    return [...new Set(bite.likes.map((like) => emojiMap[like.likeType]))];
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
