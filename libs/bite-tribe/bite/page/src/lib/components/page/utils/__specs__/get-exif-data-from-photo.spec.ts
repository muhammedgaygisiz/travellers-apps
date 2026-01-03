import { describe, expect, it } from 'vitest';
import { getExifDataFromPhoto } from '../get-exif-data-from-photo';
import { Photo } from '@capacitor/camera';

describe('getExifDataFromPhoto', () => {
  it('should extract GPS coordinates from valid EXIF data', () => {
    const mockPhoto: Photo = {
      path: 'test.jpg',
      webPath: 'test.jpg',
      format: 'jpeg',
      saved: true,
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
      path: 'test.jpg',
      webPath: 'test.jpg',
      format: 'jpeg',
      saved: true,
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
      path: 'test.jpg',
      webPath: 'test.jpg',
      format: 'jpeg',
      saved: true,
    };

    const result = getExifDataFromPhoto(mockPhoto);
    expect(result).toEqual({
      latitude: 0,
      longitude: 0,
    });
  });

  it('should return default coordinates when photo is null', () => {
    const result = getExifDataFromPhoto(null as unknown as Photo);
    expect(result).toEqual({
      latitude: 0,
      longitude: 0,
    });
  });

  it('should return default coordinates when GPS data is incomplete', () => {
    const mockPhoto: Photo = {
      path: 'test.jpg',
      webPath: 'test.jpg',
      format: 'jpeg',
      saved: true,
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
    expect(result).toEqual({
      latitude: 0,
      longitude: 0,
    });
  });

  it('should use fallback position when provided and no valid GPS data', () => {
    const mockPhoto: Photo = {
      path: 'test.jpg',
      webPath: 'test.jpg',
      format: 'jpeg',
      saved: true,
    };

    const fallbackPosition = {
      latitude: 51.5074,
      longitude: -0.1278,
    };

    const result = getExifDataFromPhoto(mockPhoto, fallbackPosition);
    expect(result).toEqual(fallbackPosition);
  });
});
