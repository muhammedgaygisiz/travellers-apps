import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { AuthService } from 'ta-firestore';
import type { Trip } from 'model';
import { TripApiService } from '../trip-api.service';

jest.mock('@capacitor-firebase/firestore');

const NOW = new Date('2026-11-28T12:00:00Z');

const trip: Trip = {
  id: 'trip-1',
  userId: 'owner',
  title: 'Southeast Asia',
  startDate: '2026-12-01',
  endDate: '2026-12-03',
  createdAt: '2026-11-01T00:00:00.000Z',
  createdAtTimestamp: 1793491200000,
};

describe(TripApiService.name, () => {
  let service: TripApiService;
  let user: { uid: string } | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    jest.clearAllMocks();
    user = { uid: 'owner' };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { getUser: (): typeof user => user },
        },
      ],
    });

    service = TestBed.inject(TripApiService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('loadMyTrips', () => {
    it("queries the signed-in user's trips only", async () => {
      jest.mocked(FirebaseFirestore.getCollection).mockResolvedValue({
        snapshots: [
          { id: 'trip-1', path: 'trips/trip-1', data: { title: 'A' } },
        ],
      } as never);

      const trips = await service.loadMyTrips();

      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: 'trips',
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            { type: 'where', fieldPath: 'userId', opStr: '==', value: 'owner' },
          ],
        },
      });
      expect(trips).toEqual([{ id: 'trip-1', title: 'A' }]);
    });

    it('refuses without a signed-in user', async () => {
      user = undefined;

      await expect(service.loadMyTrips()).rejects.toThrow(
        'User not authenticated',
      );
      expect(FirebaseFirestore.getCollection).not.toHaveBeenCalled();
    });
  });

  describe('createTrip', () => {
    beforeEach(() => {
      jest.mocked(FirebaseFirestore.addDocument).mockResolvedValue({
        reference: { id: 'trip-1', path: 'trips/trip-1' },
      } as never);
      jest.mocked(FirebaseFirestore.getDocument).mockResolvedValue({
        snapshot: { id: 'trip-1', path: 'trips/trip-1', data: { title: 'A' } },
      } as never);
    });

    it('writes the trip with the signed-in user as owner', async () => {
      const created = await service.createTrip({
        title: '  Southeast Asia  ',
        startDate: '2026-12-01',
        endDate: '2026-12-03',
      });

      expect(FirebaseFirestore.addDocument).toHaveBeenCalledWith({
        reference: 'trips',
        data: {
          userId: 'owner',
          title: 'Southeast Asia',
          startDate: '2026-12-01',
          endDate: '2026-12-03',
          createdAt: NOW.toISOString(),
          createdAtTimestamp: NOW.getTime(),
        },
      });
      expect(created).toEqual({ id: 'trip-1', title: 'A' });
    });

    it('leaves the end date out of an ongoing trip', async () => {
      await service.createTrip({ title: 'Asia', startDate: '2026-12-01' });

      const { data } = jest.mocked(FirebaseFirestore.addDocument).mock
        .calls[0][0];
      expect(data).not.toHaveProperty('endDate');
    });

    it('passes a failed write on to the caller', async () => {
      jest
        .mocked(FirebaseFirestore.addDocument)
        .mockRejectedValue(new Error('permission-denied'));

      await expect(
        service.createTrip({ title: 'Asia', startDate: '2026-12-01' }),
      ).rejects.toThrow('permission-denied');
    });
  });

  describe('updateTrip', () => {
    it('replaces the document, keeping owner and creation time', async () => {
      await service.updateTrip(trip, {
        title: 'Thailand',
        startDate: '2026-12-02',
      });

      expect(FirebaseFirestore.setDocument).toHaveBeenCalledWith({
        reference: 'trips/trip-1',
        data: {
          userId: 'owner',
          title: 'Thailand',
          startDate: '2026-12-02',
          createdAt: trip.createdAt,
          createdAtTimestamp: trip.createdAtTimestamp,
          updatedAt: NOW.toISOString(),
          updatedAtTimestamp: NOW.getTime(),
        },
      });
    });
  });

  describe('deleteTrip', () => {
    it('deletes the trip document only', async () => {
      await service.deleteTrip('trip-1');

      expect(FirebaseFirestore.deleteDocument).toHaveBeenCalledTimes(1);
      expect(FirebaseFirestore.deleteDocument).toHaveBeenCalledWith({
        reference: 'trips/trip-1',
      });
    });
  });

  describe('loadTripBites', () => {
    beforeEach(() => {
      jest.mocked(FirebaseFirestore.getCollection).mockResolvedValue({
        snapshots: [
          { id: 'bite-1', path: 'bites/bite-1', data: { name: 'Pho' } },
        ],
      } as never);
    });

    it("queries the owner's Bites in the range, newest first", async () => {
      const bites = await service.loadTripBites(trip);

      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: 'bites',
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            { type: 'where', fieldPath: 'userId', opStr: '==', value: 'owner' },
            {
              type: 'where',
              fieldPath: 'createdAtTimestamp',
              opStr: '>=',
              value: new Date(2026, 11, 1).getTime(),
            },
            {
              type: 'where',
              fieldPath: 'createdAtTimestamp',
              opStr: '<=',
              value: new Date(2026, 11, 4).getTime() - 1,
            },
          ],
        },
        queryConstraints: [
          {
            type: 'orderBy',
            fieldPath: 'createdAtTimestamp',
            directionStr: 'desc',
          },
        ],
      });
      expect(bites).toEqual([{ id: 'bite-1', name: 'Pho', likes: [] }]);
    });

    it('has no upper bound for an ongoing trip', async () => {
      await service.loadTripBites({ ...trip, endDate: undefined });

      const { compositeFilter } = jest.mocked(FirebaseFirestore.getCollection)
        .mock.calls[0][0];
      expect(compositeFilter?.queryConstraints).toHaveLength(2);
    });
  });
});
