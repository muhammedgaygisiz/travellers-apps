import { Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

export const EXCHANGERATES = 'meta/exchangeRates';

@Injectable({ providedIn: 'root' })
export class ExchangeRatesApiService {
  async getExchangeRates(): Promise<Record<string, number>> {
    // TODO: feature in business app to update exchange rates
    // await FirebaseFirestore.setDocument({
    //   reference: EXCHANGERATES,
    //   data: exchangeRates
    // })

    const doc = await FirebaseFirestore.getDocument({
      reference: EXCHANGERATES,
    });
    if (doc?.snapshot.data) {
      return doc.snapshot.data as Record<string, number>;
    }

    return { EUR: 1 };
  }
}
