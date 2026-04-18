import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { MarketPlaceDataAccessService } from '../market-place-data-access.service';
import { BiteTrail } from 'model';

jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    getCollection: jest.fn(),
  },
}));

describe(MarketPlaceDataAccessService.name, () => {
  let service: MarketPlaceDataAccessService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MarketPlaceDataAccessService],
    });

    service = TestBed.inject(MarketPlaceDataAccessService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('biteTrailsLoader', () => {
    describe('given bite trails exist in firestore', () => {
      const mockBiteTrails: BiteTrail[] = [
        {
          id: 'trail-1',
          ownerId: 'owner-1',
          name: 'Trail One',
          biteIds: ['bite-1', 'bite-2'],
        },
        {
          id: 'trail-2',
          ownerId: 'owner-2',
          name: 'Trail Two',
          biteIds: ['bite-3'],
        },
      ];

      beforeEach(() => {
        jest
          .spyOn(FirebaseFirestore, 'getCollection')
          .mockImplementation(({ reference }) => {
            if (reference === 'biteTrails') {
              return Promise.resolve({
                snapshots: mockBiteTrails.map(({ id, ...data }) => ({
                  id,
                  data,
                })),
              } as any);
            }

            if (reference === 'biteTrails/trail-1/sells') {
              return Promise.resolve({
                snapshots: [
                  { id: 'sell-1', data: {} },
                  { id: 'sell-2', data: {} },
                ],
              } as any);
            }

            if (reference === 'biteTrails/trail-2/sells') {
              return Promise.resolve({
                snapshots: [{ id: 'sell-1', data: {} }],
              } as any);
            }

            return Promise.resolve({
              snapshots: [],
            } as any);
          });
      });

      it('should call getCollection with biteTrails reference', async () => {
        await service.biteTrailsLoader({} as any);

        expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
          reference: 'biteTrails',
        });
      });

      it('should return mapped bite trails', async () => {
        const result = await service.biteTrailsLoader({} as any);

        expect(result).toEqual([
          {
            ...mockBiteTrails[0],
            soldCount: 2,
          },
          {
            ...mockBiteTrails[1],
            soldCount: 1,
          },
        ]);
      });

      it('should load sells from each bite trail and map soldCount', async () => {
        await service.biteTrailsLoader({} as any);

        expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
          reference: 'biteTrails/trail-1/sells',
        });
        expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
          reference: 'biteTrails/trail-2/sells',
        });
      });
    });

    describe('given no bite trails in firestore', () => {
      beforeEach(() => {
        jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue({
          snapshots: [],
        } as any);
      });

      it('should return empty array', async () => {
        const result = await service.biteTrailsLoader({} as any);

        expect(result).toEqual([]);
      });
    });
  });
});
