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
import { LikeOptionsPopoverMenuComponent } from '../like-options-popover-menu/like-options-popover-menu.component';
import { CountLikesPipe } from './pipes/count-likes.pipe';

@Component({
  selector: 'bt-bite',
  templateUrl: './bite-page.component.html',
  styleUrls: ['./bite-page.component.scss'],
  imports: [
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonChip,
    IonBadge,
    IonLabel,
    CountLikesPipe,
  ],
  providers: [PopoverController],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class BitePage {
  popoverController = inject(PopoverController);

  bite = input.required<Bite>();
  userId = input<string>();

  biteClick = output<Bite>();

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
    });

    await popover.present();
  }
}
