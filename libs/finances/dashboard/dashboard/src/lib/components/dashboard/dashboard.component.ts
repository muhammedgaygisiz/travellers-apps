import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { CardComponent } from 'common/ui/card';
import {
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  PopoverController,
} from '@ionic/angular/standalone';
import { BankComponent } from '../bank/bank.component';
import { Bank } from 'finances/dashboard/data-access';
import { AddPopoverMenuComponent } from 'add-popover-menu';
import { ChartComponent } from 'chart';
import { Account } from 'finances/store';

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
    IonCardContent,
    ChartComponent,
  ],
})
export class DashboardComponent {
  popoverController = inject(PopoverController);

  banks = input<Bank[]>([]);

  openAccountDetails = output<string>();

  addMenuItemClicked = output<string>();

  logoutClicked = output();

  totalAmount = computed<string | null>(() => {
    const banks = this.banks();
    if (!banks) {
      return '0';
    }

    const totalBalance = banks
      ?.map((bank) => bank.accounts || [])
      .reduce((a = [], b = []) => [...a, ...b], [])
      .map((account) => account.balance)
      .reduce((a, b) => a + b, 0);

    return `${totalBalance}`;
  });

  chartData = computed(() => {
    const banks = this.banks();
    return banks
      .reduce(
        (accounts, bank) => [...accounts, ...(bank.accounts || [])],
        [] as Account[]
      )
      .reduce(
        (payments, account) => [...payments, ...(account.payments || [])],
        [] as any[]
      );
  });

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

  onLogoutClick() {
    this.logoutClicked.emit();
  }
}
