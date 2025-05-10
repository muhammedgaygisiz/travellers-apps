import { Pipe, PipeTransform } from '@angular/core';
import firebase from 'firebase/compat';
import GeoPoint = firebase.firestore.GeoPoint;

const haversineDistance = (
  lat1: any,
  lon1: any,
  lat2: any,
  lon2: any,
  unit = 'km'
) => {
  const toRad = (value: any) => (value * Math.PI) / 180;

  // Radius of the Earth depending on unit
  const radiusMap: Record<string, number> = {
    km: 6371,
    m: 6371000,
    mi: 3958.8,
  };

  const R = radiusMap[unit] || radiusMap['km']; // Default to kilometers

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

@Pipe({
  name: 'calcDistance',
})
export class CalcDistancePipe implements PipeTransform {
  transform(
    point: GeoPoint | null | undefined,
    currentPosition: any | null
  ): string {
    console.log('#mo point', point, ' currentPosition', currentPosition);
    return (
      haversineDistance(
        point?.latitude,
        point?.longitude,
        currentPosition?.coords.latitude,
        currentPosition?.coords.longitude,
        'km'
      ).toFixed(2) + ' km'
    );
  }
}
