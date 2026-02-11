import { ConvertToPreferredCurrencyPipe } from '../convert-to-preferred-currency.pipe';

describe(ConvertToPreferredCurrencyPipe.name, () => {
  const pipe = new ConvertToPreferredCurrencyPipe();

  it('should return 0 if bite is undefined', () => {
    expect(pipe.transform(undefined, {}, 'USD')).toBe(0);
  });

  it('should return bite price if exchangeRates is undefined', () => {
    const bite = { price: 100, currency: 'EUR' } as any;
    expect(pipe.transform(bite, undefined, 'USD')).toBe(100);
  });

  it('should return bite price if preferredCurrency is undefined', () => {
    const bite = { price: 100, currency: 'EUR' } as any;
    expect(pipe.transform(bite, {}, undefined)).toBe(100);
  });

  it('should convert bite price to preferred currency', () => {
    const bite = { price: 100, currency: 'EUR' } as any;
    const exchangeRates = { EUR: 1.2 };
    expect(pipe.transform(bite, exchangeRates, 'USD')).toBe(100);
  });
});
