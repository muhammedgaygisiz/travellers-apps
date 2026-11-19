import { RestaurantApiService } from '../restaurant-api.service';
import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import * as getRestaurantByIdUtils from '../utils/get-restaurant-by-id';
import * as uploadBase64Utils from '../../utils/upload-base64-to-firebase-storage';
import { getDownloadUrlFromFirebaseStorage } from 'utils';

jest.mock('../utils/get-restaurant-by-id');

// The restaurant id is chosen before anything is written (issue #2172).
jest.mock('uuid', () => ({ v4: (): string => 'resto-new' }));

/**
 * The automock, with `FieldValue` filled in: the automock leaves that class
 * export undefined, and `saveGenderNeutralRestroomForRestaurant` calls
 * `FieldValue.delete()` to remove a field. The marker is the real one the
 * plugin builds, a plain `{ __type__ }` object.
 */
jest.mock('@capacitor-firebase/firestore', () => ({
  ...jest.createMockFromModule<object>('@capacitor-firebase/firestore'),
  FieldValue: { delete: jest.fn(() => ({ __type__: 'delete' })) },
}));

jest.mock('../../utils/upload-base64-to-firebase-storage', () => ({
  uploadBase64ToFirebaseStorage: jest
    .fn()
    .mockResolvedValue('restaurants/resto-123.jpg'),
}));

jest.mock('utils', () => ({
  ...jest.requireActual('utils'),
  getDownloadUrlFromFirebaseStorage: jest
    .fn()
    .mockResolvedValue('https://storage.example.com/restaurants/resto-123.jpg'),
}));

describe(RestaurantApiService.name, () => {
  let service: RestaurantApiService;
  const mockDate = new Date('2024-03-15T12:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);

    service = TestBed.inject(RestaurantApiService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('loadRestaurantById', () => {
    describe('given logged in true', () => {
      describe('and no restaurant id', () => {
        it('should return EMPTY', async () => {
          const result = await service.loadRestaurantById('');

          expect(result).toBeUndefined();
        });
      });

      describe('and valid restaurant id', () => {
        it('should call getRestaurantById and return restaurant', async () => {
          const getRestaurantByIdSpy = jest
            .spyOn(getRestaurantByIdUtils, 'getRestaurantById')
            .mockResolvedValue({
              id: 'resto-123',
              name: 'Test Restaurant',
            } as any);

          const result = await service.loadRestaurantById('resto-123');

          expect(result).toEqual({
            id: 'resto-123',
            name: 'Test Restaurant',
          });

          expect(getRestaurantByIdSpy).toHaveBeenCalledWith('resto-123');
        });
      });
    });
  });

  describe('saveNewRestaurant', () => {
    let addDocumentSpy: jest.SpyInstance;
    let setDocumentSpy: jest.SpyInstance;
    let updateDocumentSpy: jest.SpyInstance;
    let getDocumentSpy: jest.SpyInstance;

    beforeEach(() => {
      addDocumentSpy = jest.spyOn(FirebaseFirestore, 'addDocument');
      setDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'setDocument')
        .mockResolvedValue(undefined);
      updateDocumentSpy = jest.spyOn(FirebaseFirestore, 'updateDocument');
      getDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockImplementation(
          async ({ reference }) =>
            ({
              snapshot: {
                id: reference.split('/')[1],
                path: reference,
                data: { restaurantId: '' },
              },
            }) as any,
        );
    });

    afterEach(() => {
      addDocumentSpy.mockReset();
      setDocumentSpy.mockReset();
      updateDocumentSpy.mockReset();
      getDocumentSpy.mockReset();
    });

    // Issue #1952: the web Firestore SDK rejects an undefined field, and the
    // restaurant was never written.
    it('never writes a candidate id or an undefined field', async () => {
      addDocumentSpy.mockResolvedValueOnce({
        reference: { id: 'menu-1' },
      } as any);
      updateDocumentSpy.mockResolvedValue({} as any);

      await service.saveNewRestaurant({
        name: 'Bistro',
        restaurantCandidateId: undefined,
        description: undefined,
        position: { latitude: 1, longitude: 2 },
      } as any);

      const written = setDocumentSpy.mock.calls[0][0].data;
      expect(written).not.toHaveProperty('restaurantCandidateId');
      expect(written).not.toHaveProperty('description');
      expect(Object.values(written).every((value) => value !== undefined)).toBe(
        true,
      );
      expect(written).toEqual(
        expect.objectContaining({
          name: 'Bistro',
          position: { latitude: 1, longitude: 2 },
        }),
      );
    });

    it('drops even a defined candidate id: a candidate is verified elsewhere', async () => {
      addDocumentSpy.mockResolvedValueOnce({
        reference: { id: 'menu-1' },
      } as any);
      updateDocumentSpy.mockResolvedValue({} as any);

      await service.saveNewRestaurant({
        name: 'Bistro',
        restaurantCandidateId: 'c-1',
      } as any);

      expect(setDocumentSpy.mock.calls[0][0].data).not.toHaveProperty(
        'restaurantCandidateId',
      );
    });

    it('rejects when the restaurant write is refused', async () => {
      setDocumentSpy.mockRejectedValueOnce(new Error('invalid data'));

      await expect(
        service.saveNewRestaurant({ name: 'Bistro' } as any),
      ).rejects.toThrow('invalid data');
    });

    describe('given biteIds', () => {
      it('should remove bite ids, save restaurant and add a new menu for it', async () => {
        const mockedNewRestaurant = {
          name: 'New Resto',
          biteIds: ['bite1', 'bite2'],
        } as any;

        addDocumentSpy.mockResolvedValueOnce({
          reference: { id: 'menu-456' },
        } as any);

        updateDocumentSpy
          .mockResolvedValueOnce({ reference: { id: 'menu-789' } } as any)
          .mockResolvedValueOnce({} as any)
          .mockResolvedValueOnce({} as any);

        await service.saveNewRestaurant(mockedNewRestaurant);

        expect(addDocumentSpy).toHaveBeenCalledTimes(1);
        expect(updateDocumentSpy).toHaveBeenCalledTimes(3);

        expect(setDocumentSpy).toHaveBeenCalledWith({
          reference: 'restaurants/resto-new',
          data: {
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
            name: 'New Resto',
          },
        });

        // The menu names the restaurant it belongs to, which is what the
        // ownership-scoped rules authorise a menu write from (issue #1078).
        expect(addDocumentSpy).toHaveBeenNthCalledWith(1, {
          reference: 'menus',
          data: {
            restaurantId: 'resto-new',
            categories: [],
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
          },
        });

        expect(updateDocumentSpy).toHaveBeenNthCalledWith(1, {
          reference: 'restaurants/resto-new',
          data: {
            menuId: 'menu-456',
            updatedAt: '2024-03-15T12:00:00.000Z',
            updatedAtTimestamp: 1710504000000,
          },
        });

        expect(updateDocumentSpy).toHaveBeenNthCalledWith(2, {
          reference: 'bites/bite1',
          data: {
            restaurantId: 'resto-new',
            updatedAt: '2024-03-15T12:00:00.000Z',
            updatedAtTimestamp: 1710504000000,
          },
        });

        expect(updateDocumentSpy).toHaveBeenNthCalledWith(3, {
          reference: 'bites/bite2',
          data: {
            restaurantId: 'resto-new',
            updatedAt: '2024-03-15T12:00:00.000Z',
            updatedAtTimestamp: 1710504000000,
          },
        });
      });
    });

    describe('given a Bite assigned since the list was read', () => {
      it.each([
        ['a bare restaurant id', 'resto-other'],
        ['a document path', 'restaurants/resto-other'],
      ])(
        'should leave a Bite already carrying %s untouched',
        async (_, restaurantId) => {
          getDocumentSpy.mockImplementation(
            async ({ reference }) =>
              ({
                snapshot: {
                  id: reference.split('/')[1],
                  path: reference,
                  data: reference === 'bites/bite1' ? { restaurantId } : {},
                },
              }) as any,
          );

          addDocumentSpy.mockResolvedValueOnce({
            reference: { id: 'menu-456' },
          } as any);
          updateDocumentSpy.mockResolvedValue({} as any);

          await service.saveNewRestaurant({
            name: 'New Resto',
            biteIds: ['bite1', 'bite2'],
          } as any);

          expect(getDocumentSpy).toHaveBeenCalledWith({
            reference: 'bites/bite1',
          });
          expect(updateDocumentSpy).not.toHaveBeenCalledWith(
            expect.objectContaining({ reference: 'bites/bite1' }),
          );
          expect(updateDocumentSpy).toHaveBeenCalledWith({
            reference: 'bites/bite2',
            data: {
              restaurantId: 'resto-new',
              updatedAt: '2024-03-15T12:00:00.000Z',
              updatedAtTimestamp: 1710504000000,
            },
          });
        },
      );

      it('should skip a Bite deleted since the list was read', async () => {
        getDocumentSpy.mockResolvedValue({ snapshot: null } as any);

        addDocumentSpy.mockResolvedValueOnce({
          reference: { id: 'menu-456' },
        } as any);
        updateDocumentSpy.mockResolvedValue({} as any);

        await service.saveNewRestaurant({
          name: 'New Resto',
          biteIds: ['bite1'],
        } as any);

        expect(updateDocumentSpy).toHaveBeenCalledTimes(1);
        expect(updateDocumentSpy).not.toHaveBeenCalledWith(
          expect.objectContaining({ reference: 'bites/bite1' }),
        );
      });
    });

    describe('given biteIds is empty list', () => {
      it('should save restaurant and add a new menu for it without updating bites', async () => {
        const mockedNewRestaurant = {
          name: 'New Resto',
          biteIds: [],
        } as any;

        addDocumentSpy.mockResolvedValueOnce({
          reference: { id: 'menu-456' },
        } as any);

        updateDocumentSpy.mockResolvedValueOnce({
          reference: { id: 'menu-789' },
        } as any);

        await service.saveNewRestaurant(mockedNewRestaurant);

        expect(addDocumentSpy).toHaveBeenCalledTimes(1);
        expect(updateDocumentSpy).toHaveBeenCalledTimes(1);

        expect(setDocumentSpy).toHaveBeenCalledWith({
          reference: 'restaurants/resto-new',
          data: {
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
            name: 'New Resto',
          },
        });

        // The menu names the restaurant it belongs to, which is what the
        // ownership-scoped rules authorise a menu write from (issue #1078).
        expect(addDocumentSpy).toHaveBeenNthCalledWith(1, {
          reference: 'menus',
          data: {
            restaurantId: 'resto-new',
            categories: [],
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
          },
        });

        expect(updateDocumentSpy).toHaveBeenNthCalledWith(1, {
          reference: 'restaurants/resto-new',
          data: {
            menuId: 'menu-456',
            updatedAt: '2024-03-15T12:00:00.000Z',
            updatedAtTimestamp: 1710504000000,
          },
        });
      });
    });

    // Issue #2172: uploaded before anything is written, so a stalled upload
    // cannot leave a restaurant behind without its photo.
    describe('given an image', () => {
      it('uploads first and writes imagePath with the restaurant document', async () => {
        const uploadBase64Spy = jest.spyOn(
          uploadBase64Utils,
          'uploadBase64ToFirebaseStorage',
        );
        const order: string[] = [];
        uploadBase64Spy.mockImplementationOnce(async () => {
          order.push('upload');
          return 'restaurants/new-key.jpg';
        });
        setDocumentSpy.mockImplementationOnce(async () => {
          order.push('restaurant');
        });
        addDocumentSpy.mockResolvedValueOnce({
          reference: { id: 'menu-456' },
        } as any);
        updateDocumentSpy.mockResolvedValue({} as any);

        await service.saveNewRestaurant({
          name: 'New Resto',
          image: 'data:image/png;base64,abc',
          biteIds: [],
        } as any);

        expect(order).toEqual(['upload', 'restaurant']);
        // Under the restaurant's own folder, as #1952 asks: the id is known
        // before the write.
        expect(uploadBase64Spy).toHaveBeenCalledWith(
          expect.objectContaining({
            base64: 'data:image/png;base64,abc',
            docId: 'resto-new',
            collection: 'restaurants',
          }),
        );
        expect(setDocumentSpy).toHaveBeenCalledWith({
          reference: 'restaurants/resto-new',
          data: {
            createdAt: '2024-03-15T12:00:00.000Z',
            createdAtTimestamp: 1710504000000,
            name: 'New Resto',
            imagePath: 'https://storage.example.com/restaurants/resto-123.jpg',
          },
        });
        // Only the menu id is written afterwards; no second write for the photo.
        expect(updateDocumentSpy).toHaveBeenCalledTimes(1);
      });

      it('writes nothing when the upload fails', async () => {
        jest
          .spyOn(uploadBase64Utils, 'uploadBase64ToFirebaseStorage')
          .mockRejectedValueOnce(new Error('storage offline'));

        await expect(
          service.saveNewRestaurant({
            name: 'New Resto',
            image: 'data:image/png;base64,abc',
          } as any),
        ).rejects.toThrow('storage offline');
        expect(setDocumentSpy).not.toHaveBeenCalled();
        expect(addDocumentSpy).not.toHaveBeenCalled();
      });
    });
  });

  // Issue #2172: an upload that reports no progress is a failed upload.
  describe('uploadRestaurantImageForUrl stall window', () => {
    type Progress = (p: {
      uploadParams?: { evt?: { completed: boolean } };
    }) => void;
    let progress: Progress;
    let finish: (path: string) => void;

    beforeEach(() => {
      jest.useFakeTimers();
      jest
        .spyOn(uploadBase64Utils, 'uploadBase64ToFirebaseStorage')
        .mockImplementation(
          ({ callbackFn }: { callbackFn?: Progress }) =>
            new Promise<string>((resolve) => {
              progress = callbackFn as Progress;
              finish = resolve;
            }) as never,
        );
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('rejects an upload that reports nothing within the window', async () => {
      const upload = service.uploadRestaurantImageForUrl(
        'key',
        'data:image/png;base64,abc',
        1000,
      );
      const outcome = expect(upload).rejects.toThrow('stalled');

      jest.advanceTimersByTime(1000);
      await outcome;
    });

    it('keeps an upload going while it reports progress', async () => {
      const upload = service.uploadRestaurantImageForUrl(
        'key',
        'data:image/png;base64,abc',
        1000,
      );

      jest.advanceTimersByTime(900);
      progress({ uploadParams: { evt: { completed: false } } });
      jest.advanceTimersByTime(900);
      finish('restaurants/key/photo.jpg');

      await expect(upload).resolves.toBe(
        'https://storage.example.com/restaurants/resto-123.jpg',
      );
    });

    it('ignores an upload that lands after it was written off', async () => {
      const upload = service.uploadRestaurantImageForUrl(
        'key',
        'data:image/png;base64,abc',
        1000,
      );
      const outcome = expect(upload).rejects.toThrow('stalled');
      jest.advanceTimersByTime(1000);
      await outcome;

      finish('restaurants/key/late.jpg');
      await Promise.resolve();

      expect(getDownloadUrlFromFirebaseStorage).not.toHaveBeenCalledWith(
        'restaurants/key/late.jpg',
      );
    });

    it('passes an upload error through', async () => {
      jest.useRealTimers();
      jest
        .spyOn(uploadBase64Utils, 'uploadBase64ToFirebaseStorage')
        .mockRejectedValueOnce(new Error('denied'));

      await expect(
        service.uploadRestaurantImageForUrl('key', 'data:x', 1000),
      ).rejects.toThrow('denied');
    });
  });

  describe('createMenuForRestaurant', () => {
    let addDocumentSpy: jest.SpyInstance;
    let updateDocumentSpy: jest.SpyInstance;

    beforeEach(() => {
      addDocumentSpy = jest.spyOn(FirebaseFirestore, 'addDocument');
      updateDocumentSpy = jest.spyOn(FirebaseFirestore, 'updateDocument');
    });

    afterEach(() => {
      addDocumentSpy.mockClear();
      updateDocumentSpy.mockClear();
    });

    it('should create an empty menu and update the restaurant with the menuId', async () => {
      addDocumentSpy.mockResolvedValueOnce({
        reference: { id: 'new-menu-id' },
      } as any);
      updateDocumentSpy.mockResolvedValueOnce({} as any);

      const result = await service.createMenuForRestaurant('resto-123');

      expect(result).toBe('new-menu-id');

      expect(addDocumentSpy).toHaveBeenCalledWith({
        reference: 'menus',
        data: {
          restaurantId: 'resto-123',
          categories: [],
          createdAt: '2024-03-15T12:00:00.000Z',
          createdAtTimestamp: 1710504000000,
        },
      });

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        reference: 'restaurants/resto-123',
        data: {
          menuId: 'new-menu-id',
          updatedAt: '2024-03-15T12:00:00.000Z',
          updatedAtTimestamp: 1710504000000,
        },
      });
    });
  });

  describe('saveSocialMediaLinksForRestaurant', () => {
    it('should update the restaurant with social media links', async () => {
      const updateDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'updateDocument')
        .mockResolvedValue({} as any);

      const restaurantId = 'resto-123';
      const links = [
        { platform: 'Facebook', url: 'https://facebook.com/resto' },
        { platform: 'Instagram', url: 'https://instagram.com/resto' },
      ] as any;

      await service.saveSocialMediaLinksForRestaurant(restaurantId, links);

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        reference: `restaurants/${restaurantId}`,
        data: {
          socialMediaLinks: links,
          updatedAt: '2024-03-15T12:00:00.000Z',
          updatedAtTimestamp: 1710504000000,
        },
      });
    });
  });

  describe('saveGenderNeutralRestroomForRestaurant', () => {
    it.each([true, false])(
      'writes %s through the field path, leaving other facilities alone',
      async (genderNeutralRestroom) => {
        const updateDocumentSpy = jest
          .spyOn(FirebaseFirestore, 'updateDocument')
          .mockResolvedValue({} as any);

        await service.saveGenderNeutralRestroomForRestaurant(
          'resto-123',
          genderNeutralRestroom,
        );

        expect(updateDocumentSpy).toHaveBeenCalledWith({
          reference: 'restaurants/resto-123',
          data: {
            'facilities.genderNeutralRestroom': genderNeutralRestroom,
            updatedAt: '2024-03-15T12:00:00.000Z',
            updatedAtTimestamp: 1710504000000,
          },
        });
      },
    );

    it('removes the field for "Not stated" rather than writing false', async () => {
      const updateDocumentSpy = jest
        .spyOn(FirebaseFirestore, 'updateDocument')
        .mockResolvedValue({} as any);

      await service.saveGenderNeutralRestroomForRestaurant(
        'resto-123',
        undefined,
      );

      expect(updateDocumentSpy).toHaveBeenCalledWith({
        reference: 'restaurants/resto-123',
        data: {
          'facilities.genderNeutralRestroom': { __type__: 'delete' },
          updatedAt: '2024-03-15T12:00:00.000Z',
          updatedAtTimestamp: 1710504000000,
        },
      });
    });
  });
});
