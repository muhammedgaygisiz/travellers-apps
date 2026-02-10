import { DetailsDataAccessService } from '../details-data-access.service';
import { TestBed } from '@angular/core/testing';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { of } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

jest.mock('bite-tribe/store');
jest.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCollection: jest.fn(),
    getDocument: jest.fn(),
  },
}));

describe(DetailsDataAccessService.name, () => {
  let service: DetailsDataAccessService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DetailsDataAccessService,
        {
          provide: BiteTribeStoreService,
          useValue: {
            reviews$: of(),
            bucketlists$: of(),
            exchangeRates$: of(),
            preferedCurrency$: of(),
            userId$: of(),
            isAuthenticated$: of(),
          },
        },
      ],
    });

    service = TestBed.inject(DetailsDataAccessService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('biteLoader', () => {
    describe('given no bite id', () => {
      it('should return undefined', async () => {
        const result = await service.biteLoader({ params: {} } as any);
        expect(result).toBeUndefined();
      });
    });

    describe('given a bite id', () => {
      let getCollectionSpy: jest.SpyInstance;
      let getDocumentSpy: jest.SpyInstance;

      beforeEach(() => {
        getCollectionSpy = jest
          .spyOn(FirebaseFirestore, 'getCollection')
          .mockResolvedValue({ snapshots: [] } as any);

        getDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'getDocument')
          .mockResolvedValue({
            snapshot: { data: {}, id: '' } as unknown as any,
          });
      });

      it('should load the bite with likes', async () => {
        await service.biteLoader({
          params: {
            biteId: 'test-bite-id',
          },
        } as any);

        expect(getCollectionSpy).toHaveBeenCalledWith({
          reference: 'bites/test-bite-id/likes',
        });

        expect(getDocumentSpy).toHaveBeenCalledWith({
          reference: 'bites/test-bite-id',
        });
      });
    });
  });
});
