import { Pipe, PipeTransform } from '@angular/core';
import { Bite } from 'model';
import { getBitePriceInPreferredCurrency } from 'utils';

@Pipe({ name: 'convertToPreferredCurrency' })
export class ConvertToPreferredCurrencyPipe implements PipeTransform {
  transform(
    bite: Bite | undefined,
    exchangeRates: Record<string, number> | undefined,
    preferredCurrency: string | undefined,
  ): number {
    if (!bite) {
      return 0;
    }

    if (!exchangeRates) {
      return bite.price;
    }

    if (!preferredCurrency) {
      return bite.price;
    }

    return getBitePriceInPreferredCurrency(
      bite,
      exchangeRates,
      preferredCurrency,
    );
  }
}
