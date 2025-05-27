import * as EXIF from 'exif-js';

export const getExifData = (
  file: File
): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    type EXIFThis = {
      exifData: {
        GPSLatitude?: number[];
        GPSLatitudeRef?: string;
        GPSLongitude?: number[];
        GPSLongitudeRef?: string;
      };
    };

    try {
      // eslint-disable-next-line no-unused-vars
      EXIF.getData(file as unknown as string, function (this: EXIFThis) {
        try {
          const lat = EXIF.getTag(this, 'GPSLatitude');
          const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
          const long = EXIF.getTag(this, 'GPSLongitude');
          const longRef = EXIF.getTag(this, 'GPSLongitudeRef');

          if (lat && latRef && long && longRef) {
            const convertDMSToDD = (dms: number[]): number =>
              dms[0] + dms[1] / 60 + dms[2] / 3600;

            const latitude = (latRef === 'N' ? 1 : -1) * convertDMSToDD(lat);
            const longitude = (longRef === 'E' ? 1 : -1) * convertDMSToDD(long);
            resolve({ latitude, longitude });
          } else {
            resolve({ latitude: 0, longitude: 0 });
          }
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};
