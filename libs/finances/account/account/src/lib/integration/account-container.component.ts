import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AccountComponent } from '../component/account.component';
import { AccountService } from './account.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <finances-account
      [account]="service.account()"
      (addMenuItemClicked)="service.onAddMenuItemClicked()"
    />
  `,
  imports: [AccountComponent],
  selector: 'finances-account-integration',
})
export class AccountContainerComponent {
  service = inject(AccountService);
}
