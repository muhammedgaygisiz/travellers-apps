import { Photo } from '@capacitor/camera';
import { Geopoint } from 'model';

const normalizeGps = (
  lat: number,
  latRef: string,
  lon: number,
  lonRef: string
): { latitude: number; longitude: number } => {
  const latitude = latRef === 'S' ? -lat : lat;
  const longitude = lonRef === 'W' ? -lon : lon;
  return { latitude, longitude };
};

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
    return normalizeGps(
      exifGps.Latitude,
      exifGps.LatitudeRef,
      exifGps.Longitude,
      exifGps.LongitudeRef
    );
  }

  return fallbackPosition;
};
