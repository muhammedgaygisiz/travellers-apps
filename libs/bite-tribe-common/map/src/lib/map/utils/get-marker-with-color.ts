import * as L from 'leaflet';
import { MarkerColor } from '../model/marker-color.enum';

const getSize = (size: 'big' | 'small'): number => (size === 'big' ? 3 : 2.5);
const getAnchorX = (size: 'big' | 'small'): number => (size === 'big' ? 0 : -4);
const getAnchorY = (size: 'big' | 'small'): number =>
  size === 'big' ? 35 : 25;

export const getMarkerWithColor = (
  color: MarkerColor,
  size: 'big' | 'small' = 'small'
): L.DivIcon => {
  const styleSize = getSize(size);
  const markerStyle = `
  background-color: ${color || MarkerColor.RED};
  width: ${styleSize}rem;
  height: ${styleSize}rem;
  display: block;
  left: -1.5rem;
  top: -1.5rem;
  position: relative;
  border-radius: ${styleSize}rem ${styleSize}rem 0;
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
    iconAnchor: [getAnchorX(size), getAnchorY(size)],
    html: `<span style="${markerStyle}"><span style="${dotStyle}"></span></span>`,
  });
};
