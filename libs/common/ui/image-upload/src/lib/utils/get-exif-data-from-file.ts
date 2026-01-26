import * as exifr from 'exifr';

type Position = {
  latitude: number;
  longitude: number;
};
export const getExifDataFromFile = async (
  file: File,
): Promise<Position | undefined> => {
  try {
    const metaData = await exifr.parse(file, { gps: true });
    if (metaData?.latitude && metaData?.longitude) {
      return {
        latitude: metaData.latitude,
        longitude: metaData.longitude,
      };
    }

    console.log('No GPS data found in EXIF metadata.');
    return undefined;
  } catch (error) {
    console.error('Error reading EXIF data from file:', error);
  }

  return undefined;
};
