import * as exifr from 'exifr';
import type { Geopoint } from 'model';

export const getExifDataFromFile = async (
  file: File,
  fallbackPosition: Geopoint = {
    latitude: 0,
    longitude: 0,
  },
): Promise<Geopoint> => {
  try {
    const metaData = await exifr.parse(file, { gps: true });
    if (metaData?.latitude && metaData?.longitude) {
      return {
        latitude: metaData.latitude,
        longitude: metaData.longitude,
      };
    }

    return fallbackPosition;
  } catch (error) {
    console.error('Error reading EXIF data from file:', error);
  }

  return fallbackPosition;
};
