import { getExifDataFromPhoto } from '../get-exif-data-from-photo';
import { Photo } from '@capacitor/camera';

const BASE_PHOTO = {
  path: 'test.jpg',
  webPath: 'test.jpg',
  format: 'jpeg',
  saved: true,
};

describe('getExifDataFromPhoto', () => {
  describe('given ios exif data', () => {
    it('should extract GPS coordinates from valid EXIF data', () => {
      const mockPhoto: Photo = {
        ...BASE_PHOTO,
        exif: {
          GPS: {
            Latitude: 40.7128,
            LatitudeRef: 'N',
            Longitude: -74.006,
            LongitudeRef: 'W',
          },
        },
      };

      const result = getExifDataFromPhoto(mockPhoto);
      expect(result).toEqual({
        latitude: 40.7128,
        longitude: 74.006,
      });
    });

    it('should extract GPS coordinates with southern and eastern hemispheres', () => {
      const mockPhoto: Photo = {
        ...BASE_PHOTO,
        exif: {
          GPS: {
            Latitude: 34.0522,
            LatitudeRef: 'S',
            Longitude: 118.2437,
            LongitudeRef: 'E',
          },
        },
      };

      const result = getExifDataFromPhoto(mockPhoto);
      expect(result).toEqual({
        latitude: -34.0522,
        longitude: 118.2437,
      });
    });

    it('should return default coordinates when photo has no EXIF data', () => {
      const mockPhoto: Photo = {
        ...BASE_PHOTO,
      };

      const result = getExifDataFromPhoto(mockPhoto);
      expect(result).toBeUndefined();
    });

    it('should return default coordinates when photo is null', () => {
      const result = getExifDataFromPhoto(null as unknown as Photo);
      expect(result).toBeUndefined();
    });

    it('should return default coordinates when GPS data is incomplete', () => {
      const mockPhoto: Photo = {
        ...BASE_PHOTO,
        exif: {
          GPS: {
            Latitude: 40.7128,
            // Missing LatitudeRef
            Longitude: -74.006,
            LongitudeRef: 'W',
          },
        },
      };

      const result = getExifDataFromPhoto(mockPhoto);
      expect(result).toBeUndefined();
    });
  });

  describe('given android exif data', () => {
    it('should extract GPS coordinates from valid EXIF data', () => {
      const mockPhoto: Photo = {
        ...BASE_PHOTO,
        exif: {
          GPSLatitude: 34.0522,
          GPSLatitudeRef: 'N',
          GPSLongitude: 118.2437,
          GPSLongitudeRef: 'W',
        },
      };

      const result = getExifDataFromPhoto(mockPhoto);
      expect(result).toEqual({
        latitude: 34.0522,
        longitude: -118.2437,
      });
    });

    it('should extract GPS coordinates with southern and eastern hemispheres', () => {
      const mockPhoto: Photo = {
        ...BASE_PHOTO,
        exif: {
          GPSLatitude: 33.8688,
          GPSLatitudeRef: 'S',
          GPSLongitude: 151.2093,
          GPSLongitudeRef: 'E',
        },
      };

      const result = getExifDataFromPhoto(mockPhoto);
      expect(result).toEqual({
        latitude: -33.8688,
        longitude: 151.2093,
      });
    });

    it('should return default coordinates when GPS data is incomplete', () => {
      const mockPhoto: Photo = {
        ...BASE_PHOTO,
        exif: {
          GPSLatitude: 34.0522,
          // Missing GPSLatitudeRef
          GPSLongitude: 118.2437,
          GPSLongitudeRef: 'W',
        },
      };

      const result = getExifDataFromPhoto(mockPhoto);
      expect(result).toBeUndefined();
    });
  });
});
