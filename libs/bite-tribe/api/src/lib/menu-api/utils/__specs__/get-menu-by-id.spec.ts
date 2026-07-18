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
