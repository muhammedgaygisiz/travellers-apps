import { Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

export const EXCHANGERATES = 'meta/exchangeRates';

@Injectable({ providedIn: 'root' })
export class ExchangeRatesApiService {
  async getExchangeRates() {
    const doc = await FirebaseFirestore.getDocument({
      reference: EXCHANGERATES,
    });
    if (doc?.snapshot.data) {
      return doc.snapshot.data as Record<string, number>;
    }

    return { EUR: 1 };
  }
}
