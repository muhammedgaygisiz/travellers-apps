import { inject, Injectable } from '@angular/core';
import { FinancesFirestoreService } from 'firestore';

@Injectable({ providedIn: 'root' })
export class BankService {
  private readonly financesFirestoreService = inject(FinancesFirestoreService);

  saveNewBank(newBank: { name: string }) {
    this.financesFirestoreService.saveNewBank(newBank);
  }
}
