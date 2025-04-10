import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { AccountComponent } from '../component/account.component';
import { AccountService } from './account.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <finances-account
      [account]="service.store.account()"
      (addMenuItemClicked)="service.onAddMenuItemClicked()"
      (paymentClicked)="service.onPaymentClicked($event)"
    />
  `,
  imports: [AccountComponent],
  selector: 'finances-account-integration',
})
export class AccountContainerComponent implements OnInit {
  service = inject(AccountService);

  ngOnInit() {
    this.service.store.loadByQuery();
  }
}
