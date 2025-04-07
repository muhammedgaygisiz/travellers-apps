import { inject, Injectable } from '@angular/core';
import { Bank } from '../api/bank';
import { BankService } from 'finances/bank/data-access';
import { NavController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class AddBankService {
  private readonly bankService = inject(BankService);
  private readonly navController = inject(NavController);

  saveNewBank(newBank: Bank) {
    this.bankService.saveNewBank(newBank);

    this.navController.back();
  }
}
