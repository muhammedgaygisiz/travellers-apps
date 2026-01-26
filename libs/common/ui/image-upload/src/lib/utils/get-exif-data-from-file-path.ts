import * as exifr from 'exifr';
import { Filesystem } from '@capacitor/filesystem';

export const getExifDataFromFilePath = async (
  filePath: string,
  fallbackPosition = {
    latitude: 0,
    longitude: 0,
  },
): Promise<{
  latitude: number;
  longitude: number;
}> => {
  try {
    // Read the file as base64
    const fileContent = await Filesystem.readFile({
      path: filePath,
    });

    // Convert base64 to blob for exifr
    const base64Data = fileContent.data as string;
    // Use a generic image mime type since we don't know the exact format
    const response = await fetch(`data:image/*;base64,${base64Data}`);
    const blob = await response.blob();

    // Parse EXIF data
    const metaData = await exifr.parse(blob, { gps: true });
    if (metaData?.latitude && metaData?.longitude) {
      return {
        latitude: metaData.latitude,
        longitude: metaData.longitude,
      };
    }

    return fallbackPosition;
  } catch (error) {
    console.error('Error reading EXIF data from file path:', error);
    return fallbackPosition;
  }
};
