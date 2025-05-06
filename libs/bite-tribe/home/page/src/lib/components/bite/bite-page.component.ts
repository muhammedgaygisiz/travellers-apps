import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
} from '@ionic/angular/standalone';
import { Bite } from 'model';
import { PopoverController } from '@ionic/angular';
import { LikeOptionsPopoverMenuComponent } from '../like-options-popover-menu/like-options-popover-menu.component';

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
  ],
  providers: [PopoverController],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class BitePage {
  popoverController = inject(PopoverController);

  bite = input.required<Bite>();

  biteClick = output<Bite>();

  async openLikeOptions($event: MouseEvent) {
    const popover = await this.popoverController.create({
      component: LikeOptionsPopoverMenuComponent,
      event: $event,
      dismissOnSelect: true,
    });

    await popover.present();
  }
}
