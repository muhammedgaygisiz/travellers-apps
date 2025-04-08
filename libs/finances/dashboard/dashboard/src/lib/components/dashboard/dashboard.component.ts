import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { CardComponent } from 'common/ui/card';
import {
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  PopoverController,
} from '@ionic/angular/standalone';
import { BankComponent } from '../bank/bank.component';
import { Bank } from 'finances/dashboard/data-access';
import { AddPopoverMenuComponent } from 'add-popover-menu';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'finances-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [
    PageComponent,
    CardComponent,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    BankComponent,
  ],
})
export class DashboardComponent {
  popoverController = inject(PopoverController);

  banks = input<Bank[]>();

  openAccountDetails = output<string>();

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
            icon: 'assets/bank.svg',
            text: 'Bank hinzufügen',
          },
          {
            value: 'add-account',
            icon: 'assets/cash-coin.svg',
            text: 'Konto hinzufügen',
          },
        ]),
      },
    });

    await popover.present();
  }

  onMenuItemClicked = async (menuItem: string) => {
    await this.popoverController.dismiss();

    console.log(menuItem);
  };
}
