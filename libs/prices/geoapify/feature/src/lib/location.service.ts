import { inject, Injectable } from '@angular/core';
import { from, map, Observable, of, switchMap } from 'rxjs';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { Coordinates } from '@awesome-cordova-plugins/geolocation';
import { fromFetch } from 'rxjs/internal/observable/dom/fetch';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private readonly geolocation = inject(Geolocation);

  getLocation$: Observable<string> = from(this.getLocation()).pipe(
    switchMap((geolocation) => this.getCityForCoordinates(geolocation.coords))
  );

  private getLocation() {
    return this.geolocation.getCurrentPosition();
  }

  private getCityForCoordinates(coords: Coordinates) {
    return fromFetch(
      `https://api.geoapify.com/v1/geocode/reverse?lat=${coords.latitude}&lon=${coords.longitude}&apiKey=${process.env['NX_APP_GEOAPIFY_API_KEY']}`
    ).pipe(
      switchMap((response) =>
        response.ok
          ? response.json()
          : of({ error: true, message: `Error ${response.status}` })
      ),
      map((response) => response.features[0].properties.city)
    );
  }
}
