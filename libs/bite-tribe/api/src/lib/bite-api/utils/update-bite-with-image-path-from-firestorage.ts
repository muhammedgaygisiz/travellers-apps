import { Bite } from 'model';
import { getDownloadUrlFromFirebaseStorage } from 'utils';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BITE_COLLECTION } from '../../utils/constants';

export const updateBiteWithImagePathFromFirestorage = async (
  imagePath: string,
  biteWithoutImage: Omit<Bite, 'image'> | undefined,
  clearBase64Image: boolean,
  biteId: string,
): Promise<Bite> => {
  const downloadUrl = imagePath.startsWith('http')
    ? imagePath
    : await getDownloadUrlFromFirebaseStorage(imagePath);

  const data = {
    ...(biteWithoutImage || {}),
    imagePath: downloadUrl,
  } as any;

  if (clearBase64Image) {
    data.image = '';
  }

  await FirebaseFirestore.updateDocument({
    reference: `${BITE_COLLECTION}/${biteId}`,
    data,
  });

  return data as Bite;
};
