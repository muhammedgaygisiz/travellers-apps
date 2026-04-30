import 'leaflet';

declare module 'leaflet' {
  namespace L {
    interface UserMarkerOptions extends MarkerOptions {
      pulsing?: boolean;
      accuracy?: number;
      smallIcon?: boolean;
    }

    function userMarker(
      latlng: LatLngExpression,
      options?: UserMarkerOptions,
    ): Marker;
  }
}
