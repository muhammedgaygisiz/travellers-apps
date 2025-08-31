import { Component, inject, input, output, signal } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { CardComponent } from 'common/ui/card';
import {
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonItem,
  IonItemGroup,
  IonLabel,
  IonNote,
  PopoverController,
} from '@ionic/angular/standalone';
import { Account, Payment } from 'finances/account/data-access';
import { AddPopoverMenuComponent } from 'add-popover-menu';
import { ChartComponent } from 'chart';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'finances-account',
  templateUrl: './account.component.html',
  imports: [
    PageComponent,
    CardComponent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCardContent,
    IonItemGroup,
    IonItem,
    IonLabel,
    ChartComponent,
    IonNote,
    DatePipe,
  ],
})
export class AccountComponent {
  popoverController = inject(PopoverController);

  account = input<Account | null | undefined>();

  addMenuItemClicked = output<string>();

  paymentClicked = output<Payment>();

  async showAddPopover($event: MouseEvent): Promise<void> {
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
