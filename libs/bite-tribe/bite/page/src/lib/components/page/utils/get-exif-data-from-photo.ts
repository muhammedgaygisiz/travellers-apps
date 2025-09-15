import { Photo } from '@capacitor/camera';
import { Geopoint } from 'model';

export const getExifDataFromPhoto = (
  photo: Photo,
  fallbackPosition: Geopoint = {
    latitude: 0,
    longitude: 0,
  }
): Geopoint => {
  if (!photo || !photo.exif) {
    return fallbackPosition;
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
