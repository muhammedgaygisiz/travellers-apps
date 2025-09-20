import * as L from 'leaflet';
import { MarkerColor } from '../model/marker-color.enum';

export const getMarkerWithColor = (color: MarkerColor): L.DivIcon => {
  const markerStyle = `
  background-color: ${color || MarkerColor.RED};
  width: 3rem;
  height: 3rem;
  display: block;
  left: -1.5rem;
  top: -1.5rem;
  position: relative;
  border-radius: 3rem 3rem 0;
  transform: rotate(45deg);
  border: 1px solid #FFFFFF`;

  const dotStyle = `
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1rem;
  height: 1rem;
  background-color: white;
  border-radius: 50%`;

  return L.divIcon({
    className: 'my-custom-pin',
    iconAnchor: [0, 35],
    popupAnchor: [0, -36],
    html: `<span style="${markerStyle}"><span style="${dotStyle}"></span></span>`,
  });
};
