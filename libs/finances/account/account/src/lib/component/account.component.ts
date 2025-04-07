import { Component, inject, input, output, signal } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { CardComponent } from 'common/ui/card';
import {
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  PopoverController,
} from '@ionic/angular/standalone';
import { Account } from 'finances/account/data-access';
import { AddPopoverMenuComponent } from 'add-popover-menu';

@Component({
  selector: 'finances-account',
  templateUrl: './account.component.html',
  imports: [
    PageComponent,
    CardComponent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
  ],
})
export class AccountComponent {
  popoverController = inject(PopoverController);

  account = input<Account | null | undefined>();

  addMenuItemClicked = output<string>();

  async showAddPopover($event: MouseEvent) {
    const popover = await this.popoverController.create({
      component: AddPopoverMenuComponent,
      event: $event,
      dismissOnSelect: true,
      componentProps: {
        menuItemClicked: this.addMenuItemClicked,
        items: signal([
          {
            value: 'add-bank',
            icon: 'assets/arrow-left-right.svg',
            text: 'Zahlung hinzufügen',
          },
        ]),
      },
    });

    await popover.present();
  }
}
