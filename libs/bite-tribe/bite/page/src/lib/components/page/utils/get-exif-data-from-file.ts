import * as EXIF from 'exif-js';
import { Geopoint } from 'model';

const convertDMS2DD = (dms: number[]): number =>
  dms[0] + dms[1] / 60 + dms[2] / 3600;

const calcGpsPosition = ({
  latRef,
  longRef,
  lat,
  long,
}: {
  lat: number[];
  latRef: string;
  long: number[];
  longRef: string;
}): Geopoint => {
  const latitude = (latRef === 'N' ? 1 : -1) * convertDMS2DD(lat);
  const longitude = (longRef === 'E' ? 1 : -1) * convertDMS2DD(long);
  return { latitude, longitude };
};

export const getExifDataFromFile = (
  file: File,
  fallbackPosition: Geopoint = {
    latitude: 0,
    longitude: 0,
  }
): Promise<Geopoint> => {
  return new Promise((resolve) => {
    type EXIFThis = {
      exifData: {
        GPSLatitude?: number[];
        GPSLatitudeRef?: string;
        GPSLongitude?: number[];
        GPSLongitudeRef?: string;
      };
    };

    try {
      EXIF.getData(file as unknown as string, function (this: EXIFThis) {
        try {
          const lat = EXIF.getTag(this, 'GPSLatitude');
          const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
          const long = EXIF.getTag(this, 'GPSLongitude');
          const longRef = EXIF.getTag(this, 'GPSLongitudeRef');

          if (lat && latRef && long && longRef) {
            const gpsPosition = calcGpsPosition({ lat, latRef, long, longRef });
            resolve(gpsPosition);
          } else {
            resolve(fallbackPosition);
          }
        } catch (error) {
          console.error('Error extracting EXIF data:', error);
          resolve(fallbackPosition);
        }
      });
    } catch (error) {
      console.error('Error reading EXIF data from file:', error);
      resolve(fallbackPosition);
    }
  });
};
