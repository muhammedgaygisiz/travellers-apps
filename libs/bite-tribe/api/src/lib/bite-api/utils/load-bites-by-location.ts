import { Bite } from 'model';
import { FirebaseFunctions } from '@capacitor-firebase/functions';

interface LoadBitesByLocationRequest {
  latitude: number;
  longitude: number;
}

export const loadBitesByLocation = async (
  position?: GeolocationPosition,
): Promise<Bite[]> => {
  const coords = position?.coords;

  if (!coords) {
    return [];
  }

  try {
    const result = await FirebaseFunctions.callByName<
      LoadBitesByLocationRequest,
      Bite[]
    >({
      name: 'loadBitesByLocation',
      data: {
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
    });

    return result.data;
  } catch {
    return [];
  }
};
