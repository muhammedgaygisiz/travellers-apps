import { Photo } from '@capacitor/camera';

type Coords = { latitude: number; longitude: number };
const normalizeGps = (
  lat: number,
  latRef: string,
  lon: number,
  lonRef: string,
): Coords => {
  const latitude = latRef === 'S' ? -lat : lat;
  const longitude = lonRef === 'W' ? -lon : lon;
  return { latitude, longitude };
};

export const getExifDataFromPhoto = (photo: Photo): Coords | undefined => {
  if (!photo || !photo.exif) {
    return undefined;
  }

  const exif: any = photo.exif;
  const exifGps = exif['GPS'];

  const isValidIosExif =
    exifGps &&
    typeof exifGps.Latitude === 'number' &&
    typeof exifGps.LatitudeRef === 'string' &&
    typeof exifGps.Longitude === 'number' &&
    typeof exifGps.LongitudeRef === 'string';
  if (isValidIosExif) {
    return normalizeGps(
      exifGps.Latitude,
      exifGps.LatitudeRef,
      exifGps.Longitude,
      exifGps.LongitudeRef,
    );
  }

  // Android-style flat GPS fields on root EXIF
  const lat = exif['GPSLatitude'] as number | undefined;
  const latRef = exif['GPSLatitudeRef'] as string | undefined;
  const lon = exif['GPSLongitude'] as number | undefined;
  const lonRef = exif['GPSLongitudeRef'] as string | undefined;

  const androidExifData =
    typeof lat === 'number' &&
    typeof latRef === 'string' &&
    typeof lon === 'number' &&
    typeof lonRef === 'string';
  if (androidExifData) {
    return normalizeGps(lat, latRef, lon, lonRef);
  }

  return undefined;
};
