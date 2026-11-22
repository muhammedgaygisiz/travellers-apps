import { createBite } from '../create-bite';
import { Bite } from 'model';
import { User } from '@capacitor-firebase/authentication/dist/esm/definitions';
import { geohashForLocation } from 'geofire-common';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

jest.mock('geofire-common', () => ({ geohashForLocation: jest.fn() }));
jest.mock('@capacitor-firebase/firestore');

describe('createBite', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    const mockDate = new Date('2024-03-15T12:00:00Z');
    jest.setSystemTime(mockDate);
    (geohashForLocation as jest.Mock).mockReturnValue('123');
    (FirebaseFirestore.addDocument as jest.Mock).mockReturnValue({
      reference: { id: '7' },
    });
  });

  describe('given a bite', () => {
    const bite = {
      position: { latitude: 10, longitude: 20 },
    } as Omit<Bite, 'image'>;

    describe('and a user', () => {
      const user = { uid: '789' } as User;

      it('should call addDocument including user id', () => {
        createBite(bite, user);

        expect(geohashForLocation).toHaveBeenCalledWith([10, 20]);
        expect(FirebaseFirestore.setDocument).toHaveBeenCalledWith({
          reference: expect.stringContaining('bites'),
          data: {
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
            addressStatus: 'pending',
            geohash: '123',
            position: {
              latitude: 10,
              longitude: 20,
            },
            userId: '789',
          },
        });
      });
    });

    describe('and no user', () => {
      it('should call addDocument without user id', () => {
        createBite(bite, null);

        expect(geohashForLocation).toHaveBeenCalledWith([10, 20]);
        expect(FirebaseFirestore.setDocument).toHaveBeenCalledWith({
          reference: expect.stringContaining('bites'),
          data: {
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
            addressStatus: 'pending',
            geohash: '123',
            position: {
              latitude: 10,
              longitude: 20,
            },
            userId: '',
          },
        });
      });
    });

    /** The photo is published only by the upload trigger, GitHub issue #2139. */
    it('writes no published image field, and keeps a pending upload', () => {
      createBite(
        {
          ...bite,
          imagePath: '',
          imageStatus: 'pending',
          imageRefusalCategory: 'violence',
        },
        null,
      );

      const { data } = (
        FirebaseFirestore.setDocument as jest.Mock
      ).mock.calls.at(-1)[0];

      expect(data).not.toHaveProperty('imagePath');
      expect(data).not.toHaveProperty('imageRefusalCategory');
      expect(data.imageStatus).toBe('pending');
    });

    it('drops an image status the client may not write', () => {
      createBite({ ...bite, imageStatus: 'uploaded' }, null);

      const { data } = (
        FirebaseFirestore.setDocument as jest.Mock
      ).mock.calls.at(-1)[0];

      expect(data).not.toHaveProperty('imageStatus');
    });
  });
});
