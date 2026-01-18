import { ExchangeRatesApiService } from '../exchange-rates-api.service';
import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    getDocument: jest.fn(),
  },
}));

describe(ExchangeRatesApiService.name, () => {
  let service: ExchangeRatesApiService;

  beforeEach(() => {
    service = TestBed.inject(ExchangeRatesApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getExchangeRates', () => {
    it('should call FirebaseFirestore.getDocument', async () => {
      const getDocumentMock = jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue({
          snapshot: {
            data: { USD: 1.1, GBP: 0.9 },
          } as any,
        });

      await service.getExchangeRates();

      expect(getDocumentMock).toHaveBeenCalledWith({
        reference: 'meta/exchangeRates',
      });
    });

    describe('given no exchange rates', () => {
      it('should return default exchange rate', async () => {
        jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
          snapshot: {} as any,
        });

        const rates = await service.getExchangeRates();

        expect(rates).toEqual({ EUR: 1 });
      });
    });

    describe('given doc is undefined', () => {
      it('should return default exchange rate', async () => {
        jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockResolvedValue(undefined as any);

        const rates = await service.getExchangeRates();

        expect(rates).toEqual({ EUR: 1 });
      });
    });
  });
});
