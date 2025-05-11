// Radius of the Earth depending on unit
const radiusMap: Record<string, number> = {
  km: 6371,
  m: 6371000,
  mi: 3958.8,
};

const toRad = (value: any) => (value * Math.PI) / 180;

export const haversineDistance = (
  lat1: any,
  lon1: any,
  lat2: any,
  lon2: any,
  unit = 'km'
): string => {
  const R = radiusMap[unit] || radiusMap['km']; // Default to kilometers

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2);
};
