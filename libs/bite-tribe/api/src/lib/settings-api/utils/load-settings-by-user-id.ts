import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { SETTINGS_COLLECTION } from '../../utils/constants';
import { Settings } from 'model';

export const loadSettingsByUserId = async (
  userId: string,
): Promise<Settings> => {
  const data = await FirebaseFirestore.getDocument({
    reference: `${SETTINGS_COLLECTION}/${userId}`,
  });

  return data.snapshot.data as Settings;
};
