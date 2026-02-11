import { Pipe, PipeTransform } from '@angular/core';
import { haversineDistance } from 'utils';
import { Geopoint } from 'model';
import { Position } from '@capacitor/geolocation';

@Pipe({ name: 'calcDistance' })
export class CalcDistancePipe implements PipeTransform {
  transform(
    bitePosition: Geopoint | undefined,
    currentPosition: Position,
  ): string | undefined {
    return haversineDistance(
      bitePosition?.latitude,
      bitePosition?.longitude,
      currentPosition.coords.latitude,
      currentPosition.coords.longitude,
    );
  }
}
