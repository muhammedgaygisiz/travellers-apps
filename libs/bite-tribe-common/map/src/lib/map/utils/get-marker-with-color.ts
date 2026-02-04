import { L } from './leaflet-markercluster';
import { MarkerColor } from '../model/marker-color.enum';

const getSize = (size: 'big' | 'small' = 'small'): number =>
  size === 'big' ? 3 : 2.5;
const getAnchorX = (size: 'big' | 'small' = 'small'): number =>
  size === 'big' ? 0 : -4;
const getAnchorY = (size: 'big' | 'small' = 'small'): number =>
  size === 'big' ? 35 : 25;

export const getMarkerWithColor = (
  color: MarkerColor,
  options?: { size?: 'big' | 'small'; rating?: string },
): L.DivIcon => {
  const styleSize = getSize(options?.size);
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

  const textStyle = `
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-45deg);
  color: white;
  font-weight: bold;
  font-size: 0.8rem;
  text-align: center;
  white-space: nowrap`;

  const innerContent = options?.rating
    ? `<span style="${textStyle}">${options?.rating} <ion-icon name="star"/></span>`
    : `<span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 1rem; height: 1rem; background-color: white; border-radius: 50%"></span>`;

  return L.divIcon({
    iconAnchor: [getAnchorX(options?.size), getAnchorY(options?.size)],
    html: `<span style="${markerStyle}">${innerContent}</span>`,
  });
};
