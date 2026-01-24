import * as exifr from 'exifr';

export const getExifDataFromFile = async (
  file: File,
  fallbackPosition = {
    latitude: 0,
    longitude: 0,
  },
): Promise<{
  latitude: number;
  longitude: number;
}> => {
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
