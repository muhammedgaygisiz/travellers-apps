import { inject, Injectable } from '@angular/core';
import { FinancesApiService } from 'finances/api';

@Injectable({ providedIn: 'root' })
export class BankService {
  private readonly financesFirestoreService = inject(FinancesApiService);

  saveNewBank(newBank: { name: string }) {
    this.financesFirestoreService.saveNewBank(newBank);
  }
}
