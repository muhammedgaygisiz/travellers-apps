import type { Menu } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { MENU_COLLECTION } from '../menu-api.service';

export const getMenuById = async (
  menuId: string,
): Promise<Menu | undefined> => {
  try {
    const doc = await FirebaseFirestore.getDocument({
      reference: `${MENU_COLLECTION}/${menuId}`,
    });

    const data = doc.snapshot.data;
    if (data) {
      return {
        id: data['id'] ?? menuId,
        ...data,
      } as Menu;
    }

    return undefined;
  } catch (error) {
    console.error('Error fetching menu:', error);
    return undefined;
  }
};
