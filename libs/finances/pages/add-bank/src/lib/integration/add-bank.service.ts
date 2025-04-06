import { Injectable } from '@angular/core';
import { Bank } from '../api/bank';

@Injectable({ providedIn: 'root' })
export class AddBankService {
  saveNewBank($event: Bank) {
    console.log('saveNewBank', $event);
  }
}
