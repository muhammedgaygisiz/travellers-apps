import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { getMenuById } from '../get-menu-by-id';

jest.mock('@capacitor-firebase/firestore');

describe('getMenuById', () => {
  it('should process response and call FirebaseFirestore.getDocument', async () => {
    const getDocumentSpy = jest
      .spyOn(FirebaseFirestore, 'getDocument')
      .mockResolvedValue({
        snapshot: {
          data: {
            id: 'menuId',
            name: 'Test Menu',
          },
        },
      } as any);

    const result = await getMenuById('menuId');

    expect(result).toEqual({
      id: 'menuId',
      name: 'Test Menu',
    });
    expect(getDocumentSpy).toHaveBeenCalledTimes(1);
  });

  /** The labels come from the menu's `dietary` map (issue #2198). */
  describe('given a dietary map', () => {
    it('takes the labels from the map and ignores the item fields', async () => {
      jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
        snapshot: {
          data: {
            categories: [
              {
                id: 'c1',
                title: 'Mains',
                items: [
                  { id: 'm1', name: 'Pad Thai', dietaryLabels: ['vegan'] },
                ],
              },
            ],
            dietary: { m1: { labels: ['halal'] } },
          },
        },
      } as any);

      const result = await getMenuById('menuId');

      expect(result?.categories[0].items[0].dietaryLabels).toEqual(['halal']);
    });
  });

  describe('given no data returned', () => {
    it('should return undefined', async () => {
      jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
        snapshot: {
          data: null,
        },
      } as any);

      const result = await getMenuById('menuId');

      expect(result).toBeUndefined();
    });
  });

  describe('given an error', () => {
    it('should return undefined', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockRejectedValue(new Error('Test error'));

      const result = await getMenuById('menuId');
      return expect(result).toBeUndefined();
    });
  });

  describe('given no id field in data', () => {
    it('should use menuId as id', async () => {
      jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
        snapshot: {
          data: {
            name: 'Test Menu',
          },
        },
      } as any);

      const result = await getMenuById('menuId');

      expect(result).toEqual({
        id: 'menuId',
        name: 'Test Menu',
      });
    });
  });
});
