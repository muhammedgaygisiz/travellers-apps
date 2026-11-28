import L from 'leaflet';
import { ElementRef } from '@angular/core';

const withNoWrapOptionToPreventWorldRepetition: L.MapOptions = {
  worldCopyJump: true, // Better behavior when panning across the date line
  maxBounds: [
    [-90, -180],
    [90, 180],
  ], // Restrict view to one world
  maxBoundsViscosity: 1.0, // How much to constrain the map to maxBounds (1.0 = fully constrained)
};

export const createMap = (mapElement: ElementRef, enableZoom = true, dragging = true): L.Map => {
  const mapOptions: L.MapOptions = {
    ...withNoWrapOptionToPreventWorldRepetition,
    zoomControl: enableZoom,
    scrollWheelZoom: enableZoom,
    doubleClickZoom: enableZoom,
    touchZoom: enableZoom,
    boxZoom: enableZoom,
    dragging,
  };

  return L.map(mapElement.nativeElement, mapOptions);
};
