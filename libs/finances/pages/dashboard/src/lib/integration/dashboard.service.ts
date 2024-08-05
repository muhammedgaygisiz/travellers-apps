import { Injectable, signal } from '@angular/core';
import { BANKS } from './banks';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  banks = signal(BANKS);

  openAccountDetails(accountNumber: string) {
    console.log(accountNumber);
  }
}
