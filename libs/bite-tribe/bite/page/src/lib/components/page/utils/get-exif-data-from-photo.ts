import { Photo } from '@capacitor/camera';

export const getExifDataFromPhoto = (
  photo: Photo,
  fallbackPosition: { latitude: number; longitude: number } = {
    latitude: 0,
    longitude: 0,
  }
): { latitude: number; longitude: number } => {
  if (!photo || !photo.exif) {
    return { latitude: 0, longitude: 0 };
  }

  const exif: any = photo.exif;
  const exifGps = exif['GPS'];

  if (
    exifGps &&
    typeof exifGps.Latitude === 'number' &&
    typeof exifGps.LatitudeRef === 'string' &&
    typeof exifGps.Longitude === 'number' &&
    typeof exifGps.LongitudeRef === 'string'
  ) {
    return {
      latitude: exifGps.Latitude,
      longitude: exifGps.Longitude,
    };
  }

  return fallbackPosition;
};
