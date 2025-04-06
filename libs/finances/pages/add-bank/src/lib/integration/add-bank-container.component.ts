import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AddBankComponent } from '../component/add-bank.component';
import { AddBankService } from './add-bank.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <finances-add-bank (submitNewBank)="service.saveNewBank($event)" />
  `,
  imports: [AddBankComponent],
  selector: 'finances-add-bank-integration',
})
export class AddBankContainerComponent {
  service = inject(AddBankService);
}
